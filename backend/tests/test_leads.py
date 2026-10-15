from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from conftest import ORIGIN
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import Settings
from app.main import create_app
from app.models import Activity, Lead

PATH = "/api/v1/leads"
STAGES = ["new", "contacted", "interested", "proposal_sent", "won", "lost"]


def headers(auth):
    return {"Origin": ORIGIN, "X-CSRF-Token": auth["csrf_token"]}


def create_lead(client, auth, **changes):
    response = client.post(
        PATH, json={"name": "Fictional Lead", **changes}, headers=headers(auth)
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def lead(client, registered):
    return create_lead(
        client,
        registered,
        company="Fictional North Studio",
        email="lead@fictional.example.org",
        estimated_value="1200.50",
    )


def test_crud_persistence_defaults_and_partial_update(client, registered):
    created = create_lead(client, registered, name="  Fictional Lead  ")
    assert created["name"] == "Fictional Lead"
    assert created["status"] == "new"
    assert Decimal(created["estimated_value"]) == Decimal("0.00")
    assert created["email"] is None
    assert all(
        created[field] == "" for field in ("company", "phone", "source", "notes")
    )
    assert datetime.fromisoformat(created["created_at"]).tzinfo is not None
    assert client.get(f"{PATH}/{created['id']}").json() == created
    response = client.patch(
        f"{PATH}/{created['id']}",
        json={
            "company": " Fictional South Studio ",
            "estimated_value": "850.75",
            "notes": "Follow up next week.",
        },
        headers=headers(registered),
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["company"] == "Fictional South Studio"
    assert updated["name"] == created["name"]
    assert updated["created_at"] == created["created_at"]
    assert Decimal(updated["estimated_value"]) == Decimal("850.75")
    assert updated["notes"] == "Follow up next week."
    assert datetime.fromisoformat(updated["updated_at"]) >= datetime.fromisoformat(
        created["updated_at"]
    )
    assert client.get(f"{PATH}/{created['id']}").json() == updated
    removed = client.delete(f"{PATH}/{created['id']}", headers=headers(registered))
    assert removed.status_code == 204 and not removed.content
    assert client.get(f"{PATH}/{created['id']}").status_code == 404
    assert client.get(PATH).json()["total"] == 0


@pytest.mark.parametrize(
    "field,value",
    [
        ("name", ""),
        ("name", "   "),
        ("name", "x" * 151),
        ("company", "x" * 201),
        ("email", "invalid"),
        ("phone", "x" * 51),
        ("source", "x" * 101),
        ("notes", "x" * 10001),
        ("status", "not_a_stage"),
        ("estimated_value", "-0.01"),
        ("estimated_value", "1.001"),
        ("estimated_value", "1000000000000.00"),
        ("estimated_value", "NaN"),
        ("estimated_value", "Infinity"),
        ("estimated_value", True),
        ("name", "Fictional\u0000Lead"),
        ("notes", "Fictional\u0000Note"),
    ],
)
def test_create_validation(client, registered, field, value):
    response = client.post(
        PATH, json={"name": "Fictional Lead", field: value}, headers=headers(registered)
    )
    assert response.status_code == 422
    assert client.get(PATH).json()["total"] == 0


@pytest.mark.parametrize(
    "field",
    ["name", "company", "phone", "source", "status", "estimated_value", "notes"],
)
def test_patch_null_rejected_without_data_loss(client, registered, lead, field):
    response = client.patch(
        f"{PATH}/{lead['id']}", json={field: None}, headers=headers(registered)
    )
    assert response.status_code == 422
    assert client.get(f"{PATH}/{lead['id']}").json() == lead


def test_email_normalization_unique_per_owner_and_clear(client, registered, lead):
    duplicate = client.post(
        PATH,
        json={
            "name": "Another Fictional Lead",
            "email": "  LEAD@FICTIONAL.EXAMPLE.ORG  ",
        },
        headers=headers(registered),
    )
    assert duplicate.status_code == 409
    assert client.get(PATH).json()["total"] == 1
    another = create_lead(client, registered, email="second@fictional.example.org")
    conflict = client.patch(
        f"{PATH}/{another['id']}",
        json={"email": lead["email"], "name": "Must Roll Back"},
        headers=headers(registered),
    )
    assert conflict.status_code == 409
    assert client.get(f"{PATH}/{another['id']}").json() == another
    normalized = client.patch(
        f"{PATH}/{another['id']}",
        json={"email": "  UPPER@FICTIONAL.EXAMPLE.ORG  "},
        headers=headers(registered),
    )
    assert normalized.status_code == 200
    assert normalized.json()["email"] == "upper@fictional.example.org"
    for value in (None, "", "  "):
        clear = client.patch(
            f"{PATH}/{another['id']}",
            json={"email": value},
            headers=headers(registered),
        )
        assert clear.status_code == 200
        assert clear.json()["email"] is None
    assert create_lead(client, registered)["email"] is None


@pytest.mark.parametrize(
    "field", ["id", "user_id", "created_at", "updated_at", "unexpected"]
)
def test_server_fields_cannot_be_assigned(client, registered, lead, field):
    for operation, path, data in [
        ("post", PATH, {"name": "Bad", field: str(uuid4())}),
        ("patch", f"{PATH}/{lead['id']}", {field: str(uuid4())}),
    ]:
        response = getattr(client, operation)(
            path, json=data, headers=headers(registered)
        )
        assert response.status_code == 422
    assert client.get(f"{PATH}/{lead['id']}").json() == lead


def test_empty_patch_rejected(client, registered, lead):
    assert (
        client.patch(
            f"{PATH}/{lead['id']}", json={}, headers=headers(registered)
        ).status_code
        == 422
    )


def test_all_status_changes_are_persisted_with_atomic_history(
    client, application, registered, lead
):
    for stage in STAGES[1:] + ["new"]:
        response = client.patch(
            f"{PATH}/{lead['id']}", json={"status": stage}, headers=headers(registered)
        )
        assert response.status_code == 200
        assert client.get(f"{PATH}/{lead['id']}").json()["status"] == stage
    with Session(application.state.engine) as db:
        history = db.scalars(
            select(Activity).where(Activity.lead_id == UUID(lead["id"]))
        ).all()
        assert len(history) == 7
        assert sum(item.type == "status_changed" for item in history) == 6
        assert all(str(item.user_id) == registered["user"]["id"] for item in history)


def test_noop_patch_does_not_fabricate_history(client, application, registered, lead):
    with Session(application.state.engine) as db:
        count = db.scalar(select(func.count()).select_from(Activity))
    response = client.patch(
        f"{PATH}/{lead['id']}",
        json={"status": "new", "company": lead["company"]},
        headers=headers(registered),
    )
    assert response.status_code == 200
    assert response.json()["updated_at"] == lead["updated_at"]
    with Session(application.state.engine) as db:
        assert db.scalar(select(func.count()).select_from(Activity)) == count


def test_activity_failure_rolls_back_stage_and_fields(
    client, application, registered, lead
):
    def reject_activity(*_):
        raise IntegrityError(
            "simulated activity failure", None, RuntimeError("test-only failure")
        )

    event.listen(Activity, "before_insert", reject_activity)
    try:
        response = client.patch(
            f"{PATH}/{lead['id']}",
            json={"status": "won", "name": "Must Roll Back"},
            headers=headers(registered),
        )
        assert response.status_code == 503
    finally:
        event.remove(Activity, "before_insert", reject_activity)
    assert client.get(f"{PATH}/{lead['id']}").json() == lead


def test_delete_cascades_only_its_activities(client, application, registered, lead):
    other = create_lead(client, registered)
    assert (
        client.delete(f"{PATH}/{lead['id']}", headers=headers(registered)).status_code
        == 204
    )
    with Session(application.state.engine) as db:
        assert db.get(Lead, UUID(lead["id"])) is None
        assert (
            db.scalar(
                select(func.count())
                .select_from(Activity)
                .where(Activity.lead_id == UUID(lead["id"]))
            )
            == 0
        )
        assert (
            db.scalar(
                select(func.count())
                .select_from(Activity)
                .where(Activity.lead_id == UUID(other["id"]))
            )
            == 1
        )


def test_search_filters_sort_and_pagination(client, registered):
    entries = [
        {
            "name": "Zeta Fictional",
            "company": "Fictional North",
            "email": "zeta@fictional.example.org",
            "source": "Referral",
            "status": "contacted",
            "estimated_value": "200.50",
            "phone": "000-111",
        },
        {
            "name": "alpha Fictional",
            "company": "Fictional South",
            "source": "Website",
            "status": "won",
            "estimated_value": "10.00",
        },
        {
            "name": "Beta Fictional",
            "company": "Fictional North",
            "source": "referral",
            "status": "contacted",
            "estimated_value": "100.00",
        },
    ]
    for body in entries:
        create_lead(client, registered, **body)
    page = client.get(
        PATH, params={"sort_by": "name", "sort_order": "asc", "page_size": 2}
    ).json()
    assert page["total"] == 3 and page["page"] == 1 and page["page_size"] == 2
    assert [item["name"] for item in page["items"]] == [
        "alpha Fictional",
        "Beta Fictional",
    ]
    assert (
        client.get(
            PATH,
            params={"page": 2, "page_size": 2, "sort_by": "name", "sort_order": "asc"},
        ).json()["items"][0]["name"]
        == "Zeta Fictional"
    )
    beyond = client.get(PATH, params={"page": 9}).json()
    assert beyond["total"] == 3 and beyond["items"] == []
    filtered = client.get(
        PATH,
        params={
            "q": " NORTH ",
            "status": "contacted",
            "source": " referral ",
            "sort_by": "estimated_value",
            "sort_order": "desc",
        },
    ).json()
    assert filtered["total"] == 2
    assert [item["name"] for item in filtered["items"]] == [
        "Zeta Fictional",
        "Beta Fictional",
    ]
    for query in ("ZETA@FICTIONAL", "000-111", "zEtA"):
        assert client.get(PATH, params={"q": query}).json()["total"] == 1
    empty = client.get(PATH, params={"q": "no-match"}).json()
    assert empty["total"] == 0 and empty["items"] == []


@pytest.mark.parametrize("literal", ["%", "_", "\\"])
def test_search_wildcards_are_literal(client, registered, literal):
    created = create_lead(client, registered, name=f"Contains {literal} literally")
    create_lead(client, registered, name="Another Fictional Lead")
    result = client.get(PATH, params={"q": literal}).json()
    assert result["total"] == 1
    assert result["items"][0]["id"] == created["id"]


def test_sort_ties_have_stable_pages(client, registered):
    ids = [create_lead(client, registered)["id"] for _ in range(3)]
    seen = [
        client.get(
            PATH,
            params={
                "sort_by": "name",
                "sort_order": "asc",
                "page": page,
                "page_size": 1,
            },
        ).json()["items"][0]["id"]
        for page in (1, 2, 3)
    ]
    assert seen == sorted(ids)
    assert len(set(seen)) == 3


@pytest.mark.parametrize(
    "parameters",
    [
        {"page": 0},
        {"page": -1},
        {"page": 9223372036854775809},
        {"page_size": 0},
        {"page_size": 101},
        {"sort_by": "password_hash"},
        {"sort_by": "name;DROP TABLE leads"},
        {"sort_order": "invalid"},
        {"status": "unknown"},
        {"q": "x" * 201},
        {"source": "x" * 101},
        {"q": "Fictional\u0000"},
        {"source": "Fictional\u0000"},
    ],
)
def test_invalid_list_parameters(client, registered, parameters):
    assert client.get(PATH, params=parameters).status_code == 422


def test_anonymous_crud_rejected(client):
    unknown = str(uuid4())
    for method, path, body in [
        ("get", PATH, None),
        ("get", f"{PATH}/{unknown}", None),
        ("post", PATH, {"name": "Fictional"}),
        ("patch", f"{PATH}/{unknown}", {"name": "Fictional"}),
        ("delete", f"{PATH}/{unknown}", None),
    ]:
        response = client.request(method, path, json=body, headers={"Origin": ORIGIN})
        assert response.status_code == 401


def test_foreign_ids_hidden_and_email_uniqueness_scoped(
    client, database_url, registration, registered, lead
):
    other_app = create_app(Settings(database_url=database_url, auth_rate_limit=1000))
    with TestClient(other_app) as other:
        auth = other.post(
            "/api/v1/auth/register",
            json={**registration, "email": "other@fictional.example.org"},
            headers={"Origin": ORIGIN},
        ).json()
        for params in (
            {},
            {"q": lead["company"]},
            {"status": "new"},
            {"source": "Referral"},
        ):
            listing = other.get(PATH, params=params).json()
            assert listing["items"] == [] and listing["total"] == 0
        for resource in (lead["id"], str(uuid4())):
            assert other.get(f"{PATH}/{resource}").status_code == 404
            assert (
                other.patch(
                    f"{PATH}/{resource}", json={"status": "won"}, headers=headers(auth)
                ).status_code
                == 404
            )
            assert (
                other.delete(f"{PATH}/{resource}", headers=headers(auth)).status_code
                == 404
            )
        own_lead = create_lead(other, auth, email=lead["email"])
        assert own_lead["user_id"] == auth["user"]["id"]
        assert (
            other.patch(
                f"{PATH}/{own_lead['id']}",
                json={"user_id": registered["user"]["id"]},
                headers=headers(auth),
            ).status_code
            == 422
        )
        assert client.get(PATH).json()["total"] == 1
        assert client.get(f"{PATH}/{lead['id']}").json() == lead
        assert (
            other.delete(f"{PATH}/{own_lead['id']}", headers=headers(auth)).status_code
            == 204
        )
    assert client.get(f"{PATH}/{lead['id']}").status_code == 200


def test_writes_require_origin_and_session_csrf(client, registered, lead):
    operations = [
        ("post", PATH, {"name": "Fictional"}),
        ("patch", f"{PATH}/{lead['id']}", {"status": "won"}),
        ("delete", f"{PATH}/{lead['id']}", None),
    ]
    for method, path, body in operations:
        for supplied in (
            {"Origin": ORIGIN},
            {"Origin": ORIGIN, "X-CSRF-Token": "bad"},
            {"X-CSRF-Token": registered["csrf_token"]},
            {
                "Origin": "https://untrusted.example.org",
                "X-CSRF-Token": registered["csrf_token"],
            },
        ):
            response = client.request(method, path, json=body, headers=supplied)
            assert response.status_code == 403
    assert client.get(f"{PATH}/{lead['id']}").json() == lead


def test_private_lead_responses_are_not_cacheable(client, registered, lead):
    for path in (PATH, f"{PATH}/{lead['id']}", f"{PATH}/{uuid4()}"):
        assert client.get(path).headers["cache-control"] == "no-store"


@pytest.mark.parametrize(
    "changes", [{"status": "invalid"}, {"estimated_value": Decimal("-1.00")}]
)
def test_database_constraints_reject_invalid_direct_inserts(
    application, registered, changes
):
    with Session(application.state.engine) as db:
        db.add(
            Lead(user_id=UUID(registered["user"]["id"]), name="Fictional", **changes)
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


def test_activity_relationship_cannot_cross_owners(
    client, application, database_url, registration, registered, lead
):
    other_app = create_app(Settings(database_url=database_url))
    with TestClient(other_app) as other:
        auth = other.post(
            "/api/v1/auth/register",
            json={**registration, "email": "other@fictional.example.org"},
            headers={"Origin": ORIGIN},
        ).json()
    with Session(application.state.engine) as db:
        db.add(
            Activity(
                lead_id=UUID(lead["id"]),
                user_id=UUID(auth["user"]["id"]),
                type="lead_created",
                description="Must not cross owners",
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
