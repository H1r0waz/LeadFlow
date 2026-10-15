from collections import Counter
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from conftest import ORIGIN
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select
from sqlalchemy.orm import Session

from app.models import Activity, Lead, Task

PATH = "/api/v1/demo/seed"


def headers(auth):
    return {"Origin": ORIGIN, "X-CSRF-Token": auth["csrf_token"]}


def counts(application):
    with Session(application.state.engine) as db:
        return tuple(
            db.scalar(select(func.count()).select_from(model))
            for model in (Lead, Task, Activity)
        )


def test_seed_counts_values_tasks_and_truthful_history(client, registered, application):
    before = datetime.now(timezone.utc).date()
    response = client.post(PATH, headers=headers(registered))
    after = datetime.now(timezone.utc).date()
    assert response.status_code == 201, response.text
    assert response.json() == {"leads_created": 12, "tasks_created": 8}
    assert response.headers["cache-control"] == "no-store"
    assert counts(application) == (12, 8, 20)
    with Session(application.state.engine) as db:
        leads = db.scalars(select(Lead)).all()
        assert Counter(lead.status for lead in leads) == {
            status: 2
            for status in (
                "new",
                "contacted",
                "interested",
                "proposal_sent",
                "won",
                "lost",
            )
        }
        assert all(lead.email.endswith("@example.org") for lead in leads)
        assert all(
            "Fictional" in lead.notes and "Fictional" in lead.company for lead in leads
        )
        assert sum(lead.estimated_value for lead in leads) == Decimal("18400.00")
        expected_offsets = {
            "Mara Vale": 1,
            "Theo Arden": 3,
            "Nina Sol": -2,
            "Luca Reed": 0,
            "Iris Finch": 2,
            "Soren Wren": 7,
            "Remy Atlas": -1,
            "Elena Grove": 4,
        }
        tasks = db.execute(
            select(Task, Lead.name).join(Lead, Task.lead_id == Lead.id)
        ).all()
        for task, name in tasks:
            assert task.due_date in {
                day + timedelta(days=expected_offsets[name]) for day in (before, after)
            }
            assert task.completed == (name == "Remy Atlas")
        activities = db.scalars(select(Activity)).all()
        assert Counter(activity.type for activity in activities) == {
            "lead_created": 12,
            "task_created": 8,
        }
        assert all(
            activity.created_at.date() in {before, after} for activity in activities
        )
        assert any(
            "created as completed" in activity.description for activity in activities
        )
    data = client.get("/api/v1/dashboard", params={"today": after.isoformat()}).json()
    assert (data["total"], data["open"], data["won"], data["lost"]) == (12, 8, 2, 2)
    assert (data["open_value"], data["won_value"], data["conversion_rate"]) == (
        "12400.00",
        "4400.00",
        "50.00",
    )
    if before == after:
        assert (data["incomplete_tasks"], data["overdue_tasks"], data["due_today"]) == (
            7,
            1,
            1,
        )


def test_rerun_refuses_and_preserves_user_edits(client, registered, application):
    assert client.post(PATH, headers=headers(registered)).status_code == 201
    lead = client.get("/api/v1/leads").json()["items"][0]
    assert (
        client.patch(
            f"/api/v1/leads/{lead['id']}",
            json={"name": "Edited fictional lead", "notes": "User edit"},
            headers=headers(registered),
        ).status_code
        == 200
    )
    previous = counts(application)
    response = client.post(PATH, headers=headers(registered))
    assert response.status_code == 409
    assert "empty workspace" in response.json()["detail"]
    assert counts(application) == previous
    saved = client.get(f"/api/v1/leads/{lead['id']}").json()
    assert (saved["name"], saved["notes"]) == ("Edited fictional lead", "User edit")


def test_any_existing_lead_prevents_seed(client, registered, application):
    assert (
        client.post(
            "/api/v1/leads",
            json={"name": "Existing fictional contact"},
            headers=headers(registered),
        ).status_code
        == 201
    )
    previous = counts(application)
    assert client.post(PATH, headers=headers(registered)).status_code == 409
    assert counts(application) == previous


def test_seed_is_scoped_to_owner(client, registered, application, registration):
    assert client.post(PATH, headers=headers(registered)).status_code == 201
    with TestClient(application) as other:
        auth = other.post(
            "/api/v1/auth/register",
            json={**registration, "email": "other@example.org"},
            headers={"Origin": ORIGIN},
        ).json()
        assert other.get("/api/v1/leads").json()["total"] == 0
        assert other.post(PATH, headers=headers(auth)).status_code == 201
        assert other.get("/api/v1/leads").json()["total"] == 12
    assert client.get("/api/v1/leads").json()["total"] == 12
    assert counts(application) == (24, 16, 40)


def test_seed_requires_session_origin_and_csrf(client, registered, application):
    assert client.post(PATH).status_code == 403
    assert client.post(PATH, headers={"Origin": ORIGIN}).status_code == 403
    assert (
        client.post(
            PATH,
            headers={**headers(registered), "Origin": "https://invalid.example.org"},
        ).status_code
        == 403
    )
    assert counts(application) == (0, 0, 0)
    with TestClient(application) as anonymous:
        assert anonymous.post(PATH, headers={"Origin": ORIGIN}).status_code == 401


def test_activity_failure_rolls_back_entire_seed(client, registered, application):
    def fail_activity(mapper, connection, target):
        raise RuntimeError("Injected demo activity failure")

    event.listen(Activity, "before_insert", fail_activity)
    try:
        with pytest.raises(RuntimeError, match="Injected demo activity failure"):
            client.post(PATH, headers=headers(registered))
    finally:
        event.remove(Activity, "before_insert", fail_activity)
    assert counts(application) == (0, 0, 0)
    assert client.post(PATH, headers=headers(registered)).status_code == 201
