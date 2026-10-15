import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest
from argon2 import PasswordHasher
from conftest import ORIGIN, require_test_database
from fastapi.testclient import TestClient
from sqlalchemy import func, inspect, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.main import create_app
from app.models import AuthSession, User

AUTH = "/api/v1/auth"


def write_headers(data):
    return {"Origin": ORIGIN, "X-CSRF-Token": data["csrf_token"]}


def test_registration_hashes_and_never_returns_secrets(
    client, application, registration
):
    response = client.post(
        f"{AUTH}/register", json=registration, headers={"Origin": ORIGIN}
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["user"]["email"] == registration["email"]
    assert payload["user"]["name"] == registration["name"]
    assert registration["password"] not in response.text
    assert "password_hash" not in response.text
    assert response.headers["cache-control"] == "no-store"
    raw_token = client.cookies.get("leadflow_session")
    with Session(application.state.engine) as db:
        user = db.get(User, UUID(payload["user"]["id"]))
        assert user.password_hash.startswith("$argon2id$")
        assert PasswordHasher().verify(user.password_hash, registration["password"])
        session = db.scalar(select(AuthSession))
        assert session.token_digest == hashlib.sha256(raw_token.encode()).hexdigest()
        assert (
            session.csrf_digest
            == hashlib.sha256(payload["csrf_token"].encode()).hexdigest()
        )
        assert raw_token != session.token_digest
        assert session.expires_at > datetime.now(timezone.utc)
    cookies = response.headers.get_list("set-cookie")
    session_cookie = next(
        cookie for cookie in cookies if cookie.startswith("leadflow_session=")
    )
    csrf_cookie = next(
        cookie for cookie in cookies if cookie.startswith("leadflow_csrf=")
    )
    assert "HttpOnly" in session_cookie and "Path=/api/v1" in session_cookie
    assert "SameSite=lax" in session_cookie
    assert "HttpOnly" not in csrf_cookie and "Path=/;" in csrf_cookie


def test_normalized_email_duplicate(client, registration):
    first = client.post(
        f"{AUTH}/register", json=registration, headers={"Origin": ORIGIN}
    )
    assert first.status_code == 201
    registration["email"] = "  CONTACT@FICTIONAL.EXAMPLE.ORG  "
    duplicate = client.post(
        f"{AUTH}/register", json=registration, headers={"Origin": ORIGIN}
    )
    assert duplicate.status_code == 409
    assert client.get(f"{AUTH}/me").status_code == 200


@pytest.mark.parametrize(
    "field,value",
    [
        ("email", "invalid"),
        ("password", "tinyPW!"),
        ("password", "x" * 129),
        ("name", "   "),
        ("name", "x" * 101),
    ],
)
def test_registration_validation_redacts_input(client, registration, field, value):
    registration[field] = value
    response = client.post(
        f"{AUTH}/register", json=registration, headers={"Origin": ORIGIN}
    )
    assert response.status_code == 422
    assert all("input" not in error for error in response.json()["detail"])
    assert registration["password"] not in response.text


@pytest.mark.parametrize("extra", ["user_id", "id", "password_hash"])
def test_registration_forbids_owner_assignment(client, registration, extra):
    registration[extra] = "foreign-resource"
    response = client.post(
        f"{AUTH}/register", json=registration, headers={"Origin": ORIGIN}
    )
    assert response.status_code == 422
    assert "foreign-resource" not in response.text


@pytest.mark.parametrize(
    "origin", [None, "http://untrusted.example.org", ORIGIN + ".evil.example.org"]
)
def test_origin_check_on_register_and_login(client, registration, origin):
    headers = {} if origin is None else {"Origin": origin}
    for operation in ("register", "login"):
        response = client.post(
            f"{AUTH}/{operation}", json=registration, headers=headers
        )
        assert response.status_code == 403
        assert response.headers["cache-control"] == "no-store"


def test_login_rotates_session_and_logout_revokes_it(
    client, application, registration, registered
):
    old_token = client.cookies.get("leadflow_session")
    response = client.post(
        f"{AUTH}/login",
        json={"email": registration["email"], "password": registration["password"]},
        headers={"Origin": ORIGIN},
    )
    assert response.status_code == 200
    new_token = client.cookies.get("leadflow_session")
    assert new_token != old_token
    assert client.get(f"{AUTH}/me").json()["id"] == registered["user"]["id"]
    assert (
        client.get(
            f"{AUTH}/me", headers={"Cookie": f"leadflow_session={old_token}"}
        ).status_code
        == 401
    )
    logout = client.post(f"{AUTH}/logout", headers=write_headers(response.json()))
    assert logout.status_code == 204 and not logout.content
    assert client.cookies.get("leadflow_session") is None
    assert client.cookies.get("leadflow_csrf") is None
    assert (
        client.get(
            f"{AUTH}/me", headers={"Cookie": f"leadflow_session={new_token}"}
        ).status_code
        == 401
    )
    with Session(application.state.engine) as db:
        assert db.scalar(select(func.count()).select_from(AuthSession)) == 0


def test_wrong_credentials_are_generic(client, registration, registered):
    bad_password = client.post(
        f"{AUTH}/login",
        json={"email": registration["email"], "password": secrets.token_urlsafe(24)},
        headers={"Origin": ORIGIN},
    )
    unknown_user = client.post(
        f"{AUTH}/login",
        json={
            "email": "unknown@fictional.example.org",
            "password": secrets.token_urlsafe(24),
        },
        headers={"Origin": ORIGIN},
    )
    assert bad_password.status_code == unknown_user.status_code == 401
    assert (
        bad_password.json()
        == unknown_user.json()
        == {"detail": "Invalid email or password"}
    )


@pytest.mark.parametrize("token", ["", "unknown", "x" * 129])
def test_unknown_or_oversized_session_rejected(client, token):
    response = client.get(f"{AUTH}/me", headers={"Cookie": f"leadflow_session={token}"})
    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"


def test_expired_session_rejected_and_removed(client, application, registered):
    with Session(application.state.engine) as db:
        session = db.scalar(select(AuthSession))
        session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert client.get(f"{AUTH}/me").status_code == 401
    with Session(application.state.engine) as db:
        assert db.scalar(select(AuthSession)) is None


@pytest.mark.parametrize("token", [None, "incorrect", "x" * 129])
def test_csrf_required_for_profile_and_logout(client, registered, token):
    headers = {"Origin": ORIGIN}
    if token is not None:
        headers["X-CSRF-Token"] = token
    assert (
        client.patch(
            f"{AUTH}/me", json={"name": "Changed"}, headers=headers
        ).status_code
        == 403
    )
    assert client.post(f"{AUTH}/logout", headers=headers).status_code == 403
    assert client.get(f"{AUTH}/me").json()["name"] == registered["user"]["name"]


def test_foreign_origin_rejected_even_with_csrf(client, registered):
    headers = write_headers(registered) | {"Origin": "https://untrusted.example.org"}
    assert (
        client.patch(
            f"{AUTH}/me", json={"name": "Changed"}, headers=headers
        ).status_code
        == 403
    )
    assert client.post(f"{AUTH}/logout", headers=headers).status_code == 403


def test_two_users_cannot_modify_or_revoke_each_other(
    client, application, registration, registered
):
    with TestClient(application) as other:
        second = other.post(
            f"{AUTH}/register",
            json={
                **registration,
                "email": "second@fictional.example.org",
                "name": "Other Fictional Person",
            },
            headers={"Origin": ORIGIN},
        ).json()
        assert second["user"]["id"] != registered["user"]["id"]
        assert (
            other.patch(
                f"{AUTH}/me", json={"name": "Bad"}, headers=write_headers(registered)
            ).status_code
            == 403
        )
        assert (
            other.patch(
                f"{AUTH}/me",
                json={"name": "Bad", "user_id": registered["user"]["id"]},
                headers=write_headers(second),
            ).status_code
            == 422
        )
        assert (
            other.patch(
                f"{AUTH}/me",
                json={"name": "Updated Other"},
                headers=write_headers(second),
            ).status_code
            == 200
        )
        assert client.get(f"{AUTH}/me").json()["name"] == registration["name"]
        assert (
            other.post(f"{AUTH}/logout", headers=write_headers(second)).status_code
            == 204
        )
    assert client.get(f"{AUTH}/me").status_code == 200


def test_profile_update_persists(client, registered):
    response = client.patch(
        f"{AUTH}/me",
        json={"name": " Updated Fictional Name "},
        headers=write_headers(registered),
    )
    assert response.status_code == 200
    assert client.get(f"{AUTH}/me").json()["name"] == "Updated Fictional Name"


def test_throttle_and_expiry(client, application, registration, monkeypatch):
    application.state.auth_throttle.limit = 2
    clock = [100.0]
    monkeypatch.setattr("app.auth.time.monotonic", lambda: clock[0])
    for _ in range(2):
        assert (
            client.post(
                f"{AUTH}/login",
                json={
                    "email": registration["email"],
                    "password": registration["password"],
                },
                headers={"Origin": ORIGIN},
            ).status_code
            == 401
        )
    limited = client.post(
        f"{AUTH}/register", json=registration, headers={"Origin": ORIGIN}
    )
    assert limited.status_code == 429
    assert int(limited.headers["retry-after"]) > 0
    clock[0] += 61
    assert (
        client.post(
            f"{AUTH}/register", json=registration, headers={"Origin": ORIGIN}
        ).status_code
        == 201
    )


def test_cors_exact_allowlist(client):
    headers = {
        "Origin": ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,X-CSRF-Token",
    }
    response = client.options(f"{AUTH}/login", headers=headers)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGIN
    assert response.headers["access-control-allow-credentials"] == "true"
    denied = client.options(
        f"{AUTH}/login", headers=headers | {"Origin": "https://untrusted.example.org"}
    )
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers


def test_secure_cookie_configuration(database_url, registration):
    app = create_app(Settings(database_url=database_url, cookie_secure=True))
    with TestClient(app, base_url="https://testserver") as secure:
        response = secure.post(
            f"{AUTH}/register", json=registration, headers={"Origin": ORIGIN}
        )
        assert response.status_code == 201
        assert all(
            "Secure" in cookie for cookie in response.headers.get_list("set-cookie")
        )
        assert secure.get(f"{AUTH}/me").status_code == 200


def test_migrated_schema_and_health(client, application):
    inspector = inspect(application.state.engine)
    assert {"users", "sessions", "alembic_version"}.issubset(
        inspector.get_table_names()
    )
    assert inspector.get_foreign_keys("sessions")[0]["options"]["ondelete"] == "CASCADE"
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/api/v1/health").json() == {"status": "ok"}


def test_test_database_guard_rejects_development_database(database_url):
    with pytest.raises(ValueError, match="dedicated"):
        require_test_database(database_url.removesuffix("_test"))


@pytest.mark.parametrize(
    "url", ["sqlite:///local.db", "postgresql://localhost/leadflow"]
)
def test_settings_require_psycopg_postgres(url):
    with pytest.raises(ValueError):
        Settings(database_url=url)


def test_session_ttl_environment(database_url, monkeypatch):
    monkeypatch.setenv("SESSION_TTL_HOURS", "2")
    assert Settings(database_url=database_url).session_hours == 2
