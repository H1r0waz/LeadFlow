import csv
import io

import pytest
from conftest import ORIGIN
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select
from sqlalchemy.orm import Session
from test_leads import create_lead, headers

from app.csv_transfer import MAX_BYTES
from app.models import Activity, Lead

PATH = "/api/v1/csv"


def transfer(
    client,
    auth,
    action="preview",
    text="Name,Email\nFictional,lead@fictional.example.org\n",
    **kwargs,
):
    body = {"csv_text": text}
    if action != "inspect":
        body["mapping"] = kwargs.pop("mapping", {"name": "Name", "email": "Email"})
    if action == "import":
        body["confirm"] = True
    return client.post(
        f"{PATH}/{action}", json={**body, **kwargs}, headers=headers(auth)
    )


def test_inspect_bom_quoted_multiline_and_logical_row_numbers(client, registered):
    text = '\ufeff Name ,Email,Notes\r\n"Fictional, Inc",lead@fictional.example.org,"First\nSecond"\r\n'
    result = transfer(client, registered, "inspect", text).json()
    assert result == {
        "headers": ["Name", "Email", "Notes"],
        "sample_rows": [
            ["Fictional, Inc", "lead@fictional.example.org", "First\nSecond"]
        ],
        "total_rows": 1,
    }
    result = transfer(
        client, registered, text=text, mapping={"name": "Name", "notes": "Notes"}
    ).json()
    assert result["rows"][0]["row_number"] == 2
    assert result["rows"][0]["data"]["notes"] == "First\nSecond"
    assert client.get("/api/v1/leads").json()["total"] == 0


@pytest.mark.parametrize(
    "text",
    [
        "",
        "\n",
        " ,Email\nA,b",
        "Name, Name\nA,B",
        'Name,Email\n"unterminated',
        "Name\nBad\x00text",
        "Name\n\ufffd",
        "Name\n" + "x" * MAX_BYTES,
        "Name\n" + "é" * (MAX_BYTES // 2),
        "Name\n" + "A\n" * 5001,
        ",".join(f"Col{i}" for i in range(33)),
    ],
    ids=[
        "empty",
        "blank",
        "blank-header",
        "duplicate-header",
        "unclosed-quote",
        "nul",
        "replacement",
        "ascii-size",
        "utf8-size",
        "row-limit",
        "column-limit",
    ],
)
def test_reject_invalid_csv(client, registered, text):
    result = transfer(client, registered, "inspect", text)
    assert result.status_code == 422, result.text


@pytest.mark.parametrize(
    "mapping",
    [
        {},
        {"company": "Name"},
        {"name": "missing"},
        {"name": "Name", "user_id": "Email"},
        {"name": "Name", "company": "Name"},
    ],
)
def test_reject_invalid_mapping(client, registered, mapping):
    result = transfer(client, registered, mapping=mapping)
    assert result.status_code == 422


def test_header_only_and_inspect_sample_limit(client, registered):
    assert transfer(client, registered, text="Name,Email\n").json()["total_rows"] == 0
    result = transfer(
        client, registered, "inspect", text="Name\n" + "Fictional\n" * 8
    ).json()
    assert result["total_rows"] == 8 and len(result["sample_rows"]) == 5


def test_defaults_validation_decimal_and_bad_width(client, registered):
    text = "Name,Email,Value,Status\nFictional,,,\nOther,,123456789012.34,won\nBad,not-email,-1,new\nWidth\nExtra,,,,field\n"
    result = transfer(
        client,
        registered,
        text=text,
        mapping={
            "name": "Name",
            "email": "Email",
            "estimated_value": "Value",
            "status": "Status",
        },
    ).json()
    assert (result["valid_rows"], result["invalid_rows"]) == (2, 3)
    assert result["rows"][0]["data"]["email"] is None
    assert result["rows"][0]["data"]["status"] == "new"
    assert result["rows"][1]["data"]["estimated_value"] == "123456789012.34"
    assert result["rows"][3]["errors"] == ["Column count does not match the header"]


def test_atomic_partial_reimport_and_activities(client, registered, application):
    text = "Name,Email\nFictional,lead@fictional.example.org\nInvalid,broken\nDuplicate,LEAD@FICTIONAL.EXAMPLE.ORG\nNo email,\n"
    rejected = transfer(client, registered, "import", text)
    assert rejected.status_code == 409
    assert client.get("/api/v1/leads").json()["total"] == 0
    result = transfer(client, registered, "import", text, allow_partial=True).json()
    assert (
        result["imported"],
        result["skipped"],
        result["rejected"],
        result["total_rows"],
    ) == (2, 1, 1, 4)
    result = transfer(client, registered, "import", text, allow_partial=True).json()
    assert (result["imported"], result["skipped"], result["rejected"]) == (1, 2, 1)
    with Session(application.state.engine) as db:
        assert db.scalar(select(func.count()).select_from(Activity)) == 3
        assert db.scalar(select(func.count()).select_from(Lead)) == 3


def test_invalid_email_row_does_not_reserve_email(client, registered):
    text = "Name,Email\n,lead@fictional.example.org\nValid,lead@fictional.example.org\n"
    result = transfer(client, registered, text=text).json()
    assert [row["status"] for row in result["rows"]] == ["invalid", "valid"]


@pytest.mark.parametrize(
    "kwargs",
    [
        {"confirm": False},
        {"confirm": "true"},
        {"allow_partial": "true"},
        {"confirm": 1},
    ],
)
def test_explicit_boolean_confirmation(client, registered, kwargs):
    assert transfer(client, registered, "import", **kwargs).status_code == 422


def test_missing_confirmation(client, registered):
    result = client.post(
        f"{PATH}/import",
        json={"csv_text": "Name\nFictional", "mapping": {"name": "Name"}},
        headers=headers(registered),
    )
    assert result.status_code == 422


def test_owner_isolation_and_current_database_recheck(
    client, registered, application, registration
):
    with TestClient(application) as other:
        auth = other.post(
            "/api/v1/auth/register",
            json={**registration, "email": "other@fictional.example.org"},
            headers={"Origin": ORIGIN},
        ).json()
        create_lead(
            other, auth, email="lead@fictional.example.org", name="Foreign lead"
        )
        assert transfer(client, registered).json()["valid_rows"] == 1
        assert "Foreign lead" not in client.get(f"{PATH}/export").text
        create_lead(
            client, registered, email="lead@fictional.example.org", name="Owned lead"
        )
        result = transfer(client, registered, "import").json()
        assert result["skipped"] == 1 and result["imported"] == 0
        assert "Owned lead" not in other.get(f"{PATH}/export").text
        assert transfer(other, auth).json()["duplicate_rows"] == 1


@pytest.mark.parametrize("action", ["inspect", "preview", "import"])
def test_auth_origin_csrf(client, registered, application, action):
    body = {"csv_text": "Name\nFictional", "mapping": {"name": "Name"}, "confirm": True}
    assert client.post(f"{PATH}/{action}", json=body).status_code == 403
    assert (
        client.post(
            f"{PATH}/{action}", json=body, headers={"Origin": ORIGIN}
        ).status_code
        == 403
    )
    with TestClient(application) as anonymous:
        assert (
            anonymous.post(
                f"{PATH}/{action}", json=body, headers={"Origin": ORIGIN}
            ).status_code
            == 401
        )
        assert anonymous.get(f"{PATH}/export").status_code == 401


def test_export_bom_formula_neutralization_and_plain_roundtrip(client, registered):
    create_lead(
        client,
        registered,
        name="=HYPERLINK(1)",
        company="  @SUM(1)",
        phone="+123456",
        notes="\t=1\nsecond",
    )
    response = client.get(f"{PATH}/export")
    assert response.content.startswith(b"\xef\xbb\xbf")
    assert "attachment" in response.headers["content-disposition"]
    rows = list(csv.DictReader(io.StringIO(response.content.decode("utf-8-sig"))))
    assert "user_id" not in rows[0] and "id" not in rows[0]
    assert rows[0]["name"] == "'=HYPERLINK(1)"
    assert rows[0]["company"] == "'@SUM(1)"
    assert rows[0]["phone"] == "'+123456"
    assert rows[0]["notes"] == "'\t=1\nsecond"
    create_lead(
        client,
        registered,
        name="Plain, Fictional",
        notes="first\nsecond",
        estimated_value="19.25",
    )
    exported = client.get(f"{PATH}/export").content.decode("utf-8-sig")
    result = transfer(
        client, registered, text=exported, mapping={field: field for field in rows[0]}
    ).json()
    plain = next(
        row["data"]
        for row in result["rows"]
        if row["data"].get("name") == "Plain, Fictional"
    )
    assert plain["notes"] == "first\nsecond" and plain["estimated_value"] == "19.25"


def test_activity_failure_rolls_back_entire_import(client, registered, application):
    def fail_activity(mapper, connection, target):
        raise RuntimeError("Injected activity failure")

    event.listen(Activity, "before_insert", fail_activity)
    try:
        with pytest.raises(RuntimeError, match="Injected activity failure"):
            transfer(client, registered, "import")
    finally:
        event.remove(Activity, "before_insert", fail_activity)
    with Session(application.state.engine) as db:
        assert db.scalar(select(func.count()).select_from(Lead)) == 0
        assert db.scalar(select(func.count()).select_from(Activity)) == 0


def test_json_request_size_bounded(client, registered):
    response = client.post(
        f"{PATH}/inspect",
        content=b" " * (14 * 1024 * 1024 + 1),
        headers={**headers(registered), "Content-Type": "application/json"},
    )
    assert response.status_code == 413
