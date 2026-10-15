from uuid import UUID

from alembic.config import Config
from conftest import ORIGIN, ROOT, require_test_database
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from alembic import command
from app.models import AuthSession, User


def test_upgrade_preserves_existing_user_and_session(
    client, application, database_url, registration, monkeypatch
):
    require_test_database(database_url)
    monkeypatch.setenv("DATABASE_URL", database_url)
    config = Config(str(ROOT / "backend" / "alembic.ini"))
    command.downgrade(config, "0001_users_sessions")
    try:
        auth = client.post(
            "/api/v1/auth/register", json=registration, headers={"Origin": ORIGIN}
        )
        assert auth.status_code == 201
        user_id = UUID(auth.json()["user"]["id"])
        command.upgrade(config, "head")
        command.check(config)
        assert client.get("/api/v1/auth/me").json()["id"] == str(user_id)
        with Session(application.state.engine) as db:
            assert db.get(User, user_id) is not None
            assert (
                db.scalar(select(AuthSession).where(AuthSession.user_id == user_id))
                is not None
            )
        assert {"leads", "activities"}.issubset(
            inspect(application.state.engine).get_table_names()
        )
    finally:
        command.upgrade(config, "head")
