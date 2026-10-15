import pytest
from conftest import ORIGIN
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User


@pytest.mark.parametrize("operation", ["register", "profile"])
def test_null_name_is_validation_error_without_database_changes(
    client, registration, application, operation
):
    if operation == "register":
        response = client.post(
            "/api/v1/auth/register",
            json={**registration, "name": "Fictional\x00Name"},
            headers={"Origin": ORIGIN},
        )
        with Session(application.state.engine) as db:
            assert db.scalar(select(func.count()).select_from(User)) == 0
    else:
        created = client.post(
            "/api/v1/auth/register", json=registration, headers={"Origin": ORIGIN}
        ).json()
        response = client.patch(
            "/api/v1/auth/me",
            json={"name": "Fictional\x00Name"},
            headers={"Origin": ORIGIN, "X-CSRF-Token": created["csrf_token"]},
        )
        assert client.get("/api/v1/auth/me").json()["name"] == registration["name"]
    assert response.status_code == 422
    assert "Fictional" not in response.text


@pytest.mark.parametrize(
    "method,path", [("POST", "/api/v1/auth/register"), ("PATCH", "/api/v1/auth/me")]
)
def test_regular_json_body_is_bounded_before_parsing(client, method, path):
    response = client.request(
        method,
        path,
        content=b" " * (256 * 1024 + 1),
        headers={"Origin": ORIGIN, "Content-Type": "application/json"},
    )
    assert response.status_code == 413
    assert response.headers["Cache-Control"] == "no-store"


def test_streamed_body_cannot_bypass_limit(client):
    def chunks():
        for _ in range(5):
            yield b" " * (64 * 1024)

    response = client.post(
        "/api/v1/auth/register",
        content=chunks(),
        headers={"Origin": ORIGIN, "Content-Type": "application/json"},
    )
    assert response.status_code == 413


def test_escaped_maximum_notes_fit_regular_request_limit(client, registered):
    headers = {"Origin": ORIGIN, "X-CSRF-Token": registered["csrf_token"]}
    response = client.post(
        "/api/v1/leads",
        json={"name": "Fictional Contact", "notes": "\n" * 10000},
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["notes"] == "\n" * 10000
