from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

import pytest
from conftest import ORIGIN
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.lead_schemas import LeadStatus
from app.models import Lead, Task

PATH = "/api/v1/dashboard"


def seed(application, auth, entries, tasks=()):
    with Session(application.state.engine) as db:
        owner = UUID(auth["user"]["id"])
        leads = [
            Lead(
                user_id=owner,
                name=f"Fictional Lead {index}",
                status=status,
                estimated_value=Decimal(value),
            )
            for index, (status, value) in enumerate(entries)
        ]
        db.add_all(leads)
        db.flush()
        for index, (due, completed) in enumerate(tasks):
            db.add(
                Task(
                    id=UUID(int=index + 1),
                    user_id=owner,
                    lead_id=leads[0].id,
                    title=f"Fictional task {index}",
                    due_date=date.fromisoformat(due),
                    completed=completed,
                )
            )
        db.commit()


def test_empty_dashboard(client, registered):
    response = client.get(PATH, params={"today": "2026-10-15"})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {
        "total": 0,
        "open": 0,
        "won": 0,
        "lost": 0,
        "open_value": "0.00",
        "won_value": "0.00",
        "conversion_rate": "0.00",
        "stages": [
            {"status": status.value, "count": 0, "value": "0.00"}
            for status in LeadStatus
        ],
        "upcoming_tasks": [],
        "incomplete_tasks": 0,
        "overdue_tasks": 0,
        "due_today": 0,
        "as_of": "2026-10-15",
    }


def test_aggregates_all_stages_without_task_multiplication(
    client, registered, application
):
    entries = [
        ("new", "0.10"),
        ("new", "0.20"),
        ("contacted", "100"),
        ("interested", "200"),
        ("proposal_sent", "300"),
        ("won", "400.25"),
        ("won", "500.75"),
        ("lost", "600"),
    ]
    seed(application, registered, entries, [("2026-10-15", False)] * 3)
    data = client.get(PATH, params={"today": "2026-10-15"}).json()
    assert (data["total"], data["open"], data["won"], data["lost"]) == (8, 5, 2, 1)
    assert data["open_value"] == "600.30"
    assert data["won_value"] == "901.00"
    assert data["conversion_rate"] == "66.67"
    assert [s["status"] for s in data["stages"]] == [s.value for s in LeadStatus]
    assert [s["count"] for s in data["stages"]] == [2, 1, 1, 1, 2, 1]
    assert [s["value"] for s in data["stages"]] == [
        "0.30",
        "100.00",
        "200.00",
        "300.00",
        "901.00",
        "600.00",
    ]


def test_task_deadlines_totals_and_five_earliest(client, registered, application):
    seed(
        application,
        registered,
        [("new", "1")],
        [
            ("2030-01-01", False),
            ("2026-10-15", False),
            ("2026-10-14", False),
            ("2026-10-14", False),
            ("2026-10-16", False),
            ("2026-10-17", False),
            ("2026-10-18", False),
            ("2026-10-01", True),
            ("2026-10-15", True),
        ],
    )
    data = client.get(PATH, params={"today": "2026-10-15"}).json()
    assert (data["incomplete_tasks"], data["overdue_tasks"], data["due_today"]) == (
        7,
        2,
        1,
    )
    assert [task["id"] for task in data["upcoming_tasks"]] == [
        str(UUID(int=i)) for i in [3, 4, 2, 5, 6]
    ]
    assert all(t["lead_name"] == "Fictional Lead 0" for t in data["upcoming_tasks"])
    later = client.get(PATH, params={"today": "2030-01-01"}).json()
    assert later["overdue_tasks"] == 6
    assert later["due_today"] == 1


def test_owner_isolation(client, registered, application, registration):
    seed(application, registered, [("won", "800"), ("new", "100")])
    with TestClient(application) as other:
        response = other.post(
            "/api/v1/auth/register",
            json={**registration, "email": "other@fictional.example.org"},
            headers={"Origin": ORIGIN},
        )
        assert response.status_code == 201
        seed(
            application,
            response.json(),
            [("lost", "999999"), ("won", "999999")],
            [("2026-10-14", False)],
        )
        other_data = other.get(PATH, params={"today": "2026-10-15"}).json()
        assert other_data["total"] == 2
        assert other_data["open"] == 0
        assert other_data["won_value"] == "999999.00"
        assert other_data["incomplete_tasks"] == 1
    data = client.get(PATH, params={"today": "2026-10-15"}).json()
    assert data["total"] == 2
    assert data["open_value"] == "100.00"
    assert data["won_value"] == "800.00"
    assert data["conversion_rate"] == "100.00"
    assert data["lost"] == 0
    assert data["incomplete_tasks"] == data["overdue_tasks"] == data["due_today"] == 0
    assert data["upcoming_tasks"] == []


@pytest.mark.parametrize(
    "today",
    [
        "",
        "2026-02-30",
        "2026-1-01",
        "2026-10-15T00:00:00Z",
        "0",
        "20261015",
        "0000-01-01",
    ],
)
def test_invalid_calendar_date(client, registered, today):
    assert client.get(PATH, params={"today": today}).status_code == 422


def test_default_utc_date(client, registered):
    before = datetime.now(timezone.utc).date().isoformat()
    data = client.get(PATH).json()
    after = datetime.now(timezone.utc).date().isoformat()
    assert data["as_of"] in {before, after}


def test_requires_session(client):
    response = client.get(PATH)
    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"
