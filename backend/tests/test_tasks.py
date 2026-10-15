from datetime import date
from uuid import UUID, uuid4

import pytest
from conftest import ORIGIN
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from test_leads import create_lead, headers

from app.config import Settings
from app.main import create_app
from app.models import Activity, Task


@pytest.fixture
def lead(client, registered):
    return create_lead(client, registered)


@pytest.fixture
def tasks_path(lead):
    return f"/api/v1/leads/{lead['id']}/tasks"


@pytest.fixture
def task(client, registered, tasks_path):
    response = client.post(
        tasks_path,
        json={
            "title": "Fictional follow-up",
            "description": "Prepare fictional proposal",
            "due_date": "2026-10-20",
        },
        headers=headers(registered),
    )
    assert response.status_code == 201, response.text
    return response.json()


def history(client, lead):
    response = client.get(f"/api/v1/leads/{lead['id']}/activities")
    assert response.status_code == 200
    return response.json()


def test_task_crud_completion_reopen_and_history(
    client, registered, lead, tasks_path, task
):
    assert task["completed"] is False
    assert task["due_date"] == "2026-10-20"
    assert task["user_id"] == registered["user"]["id"]
    path = f"{tasks_path}/{task['id']}"
    for changes in [
        {"title": " Updated follow-up ", "due_date": "2026-10-21"},
        {"completed": True},
        {"completed": False},
    ]:
        response = client.patch(path, json=changes, headers=headers(registered))
        assert response.status_code == 200, response.text
    persisted = client.get(tasks_path).json()["items"][0]
    assert persisted["title"] == "Updated follow-up"
    assert persisted["due_date"] == "2026-10-21" and not persisted["completed"]
    types = [item["type"] for item in history(client, lead)["items"]]
    assert {
        "lead_created",
        "task_created",
        "task_updated",
        "task_completed",
        "task_reopened",
    }.issubset(types)
    assert client.delete(path, headers=headers(registered)).status_code == 204
    assert client.get(tasks_path).json()["total"] == 0
    assert history(client, lead)["items"][0]["type"] == "task_deleted"


@pytest.mark.parametrize(
    "changes",
    [
        {"title": " "},
        {"title": "x" * 201},
        {"description": "x" * 2001},
        {"description": "bad\x00text"},
        {"due_date": "2026-02-30"},
        {"due_date": "2026-10-20T12:00:00Z"},
        {"due_date": 0},
        {"due_date": True},
        {"user_id": str(uuid4())},
        {"completed": True},
    ],
)
def test_create_task_validation(client, registered, tasks_path, changes):
    body = {"title": "Fictional task", "due_date": "2026-10-20", **changes}
    assert (
        client.post(tasks_path, json=body, headers=headers(registered)).status_code
        == 422
    )
    assert client.get(tasks_path).json()["total"] == 0


@pytest.mark.parametrize(
    "changes",
    [
        {},
        {"title": None},
        {"description": None},
        {"completed": None},
        {"completed": "false"},
        {"completed": 1},
        {"due_date": None},
        {"due_date": "2026-10-20T00:00:00Z"},
        {"lead_id": str(uuid4())},
    ],
)
def test_patch_rejects_invalid_fields_without_data_loss(
    client, registered, tasks_path, task, changes
):
    assert (
        client.patch(
            f"{tasks_path}/{task['id']}", json=changes, headers=headers(registered)
        ).status_code
        == 422
    )
    assert client.get(tasks_path).json()["items"][0] == task


def test_noop_does_not_add_history(client, registered, lead, tasks_path, task):
    before = history(client, lead)["total"]
    assert (
        client.patch(
            f"{tasks_path}/{task['id']}",
            json={"completed": False},
            headers=headers(registered),
        ).status_code
        == 200
    )
    assert history(client, lead)["total"] == before


def test_due_date_sort_pagination_filter_and_overdue_allowed(
    client, registered, tasks_path, task
):
    earlier = client.post(
        tasks_path,
        json={"title": "Overdue fictional task", "due_date": "2020-01-01"},
        headers=headers(registered),
    ).json()
    assert (
        client.get(tasks_path, params={"page_size": 1}).json()["items"][0]["id"]
        == earlier["id"]
    )
    assert (
        client.get(tasks_path, params={"page_size": 1, "page": 2}).json()["items"][0][
            "id"
        ]
        == task["id"]
    )
    assert (
        client.patch(
            f"{tasks_path}/{earlier['id']}",
            json={"completed": True},
            headers=headers(registered),
        ).status_code
        == 200
    )
    assert client.get(tasks_path).json()["items"][0]["id"] == task["id"]
    complete = client.get(tasks_path, params={"completed": True}).json()
    assert complete["total"] == 1 and complete["items"][0]["id"] == earlier["id"]


def test_notes_have_distinct_history_even_with_stage_change(client, registered, lead):
    path = f"/api/v1/leads/{lead['id']}"
    assert (
        client.patch(
            path,
            json={"notes": "Fictional note", "status": "won"},
            headers=headers(registered),
        ).status_code
        == 200
    )
    types = [item["type"] for item in history(client, lead)["items"]]
    assert "notes_updated" in types and "status_changed" in types
    assert (
        client.patch(
            path, json={"notes": "Another fictional note"}, headers=headers(registered)
        ).status_code
        == 200
    )
    latest = history(client, lead)["items"][0]
    assert latest["type"] == "notes_updated"


def test_activity_insertion_failure_rolls_back_task_mutations(
    client, registered, application, tasks_path, task
):
    def reject(*_):
        raise IntegrityError(
            "simulated activity failure", None, RuntimeError("test failure")
        )

    event.listen(Activity, "before_insert", reject)
    try:
        assert (
            client.patch(
                f"{tasks_path}/{task['id']}",
                json={"completed": True},
                headers=headers(registered),
            ).status_code
            == 503
        )
        assert (
            client.post(
                tasks_path,
                json={"title": "Must roll back", "due_date": "2026-10-20"},
                headers=headers(registered),
            ).status_code
            == 503
        )
        assert (
            client.delete(
                f"{tasks_path}/{task['id']}", headers=headers(registered)
            ).status_code
            == 503
        )
    finally:
        event.remove(Activity, "before_insert", reject)
    assert client.get(tasks_path).json()["items"] == [task]


def test_foreign_parent_task_and_activity_denials(
    client, registered, registration, database_url, lead, tasks_path, task
):
    with TestClient(create_app(Settings(database_url=database_url))) as other:
        auth = other.post(
            "/api/v1/auth/register",
            json={**registration, "email": "other@fictional.example.org"},
            headers={"Origin": ORIGIN},
        ).json()
        own = create_lead(other, auth)
        own_path = f"/api/v1/leads/{own['id']}/tasks"
        for parent_path in [tasks_path, f"/api/v1/leads/{uuid4()}/tasks"]:
            assert other.get(parent_path).status_code == 404
            assert (
                other.post(
                    parent_path,
                    json={"title": "Bad", "due_date": "2026-10-20"},
                    headers=headers(auth),
                ).status_code
                == 404
            )
            assert (
                other.patch(
                    f"{parent_path}/{task['id']}",
                    json={"completed": True},
                    headers=headers(auth),
                ).status_code
                == 404
            )
            assert (
                other.delete(
                    f"{parent_path}/{task['id']}", headers=headers(auth)
                ).status_code
                == 404
            )
        assert other.get(f"/api/v1/leads/{lead['id']}/activities").status_code == 404
        assert (
            other.patch(
                f"{own_path}/{task['id']}",
                json={"completed": True},
                headers=headers(auth),
            ).status_code
            == 404
        )
        assert (
            other.delete(f"{own_path}/{task['id']}", headers=headers(auth)).status_code
            == 404
        )
        with Session(other.app.state.engine) as db:
            db.add(
                Task(
                    lead_id=UUID(lead["id"]),
                    user_id=UUID(auth["user"]["id"]),
                    title="Foreign relationship",
                    due_date=date(2026, 10, 20),
                )
            )
            with pytest.raises(IntegrityError):
                db.commit()
            db.rollback()
    assert client.get(tasks_path).json()["items"] == [task]


def test_same_user_wrong_parent_rejected(client, registered, tasks_path, task):
    other = create_lead(client, registered)
    path = f"/api/v1/leads/{other['id']}/tasks/{task['id']}"
    assert (
        client.patch(
            path, json={"completed": True}, headers=headers(registered)
        ).status_code
        == 404
    )
    assert client.delete(path, headers=headers(registered)).status_code == 404


def test_task_and_activity_auth_csrf_and_pagination(
    client, registered, lead, tasks_path, task
):
    for path in [tasks_path, f"/api/v1/leads/{lead['id']}/activities"]:
        for params in [{"page": 0}, {"page_size": 101}, {"page": 9223372036854775809}]:
            assert client.get(path, params=params).status_code == 422
        assert client.get(path).headers["cache-control"] == "no-store"
        with TestClient(client.app) as anonymous:
            assert anonymous.get(path).status_code == 401
    for method, path, body in [
        ("post", tasks_path, {"title": "Bad", "due_date": "2026-10-20"}),
        ("patch", f"{tasks_path}/{task['id']}", {"completed": True}),
        ("delete", f"{tasks_path}/{task['id']}", None),
    ]:
        assert (
            client.request(
                method, path, json=body, headers={"Origin": ORIGIN}
            ).status_code
            == 403
        )
        assert (
            client.request(
                method,
                path,
                json=body,
                headers={
                    **headers(registered),
                    "Origin": "https://untrusted.example.org",
                },
            ).status_code
            == 403
        )


def test_delete_lead_cascades_tasks_and_activity(
    client, registered, application, lead, tasks_path, task
):
    assert (
        client.delete(
            f"/api/v1/leads/{lead['id']}", headers=headers(registered)
        ).status_code
        == 204
    )
    with Session(application.state.engine) as db:
        assert db.get(Task, UUID(task["id"])) is None
        assert (
            db.scalar(
                select(func.count())
                .select_from(Activity)
                .where(Activity.lead_id == UUID(lead["id"]))
            )
            == 0
        )
