import os
import secrets
from pathlib import Path

import pytest
from alembic.config import Config
from dotenv import dotenv_values
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from alembic import command
from app.config import Settings
from app.main import create_app

ROOT = Path(__file__).resolve().parents[2]
ORIGIN = "http://localhost:5173"


def require_test_database(url: str) -> str:
    parsed = make_url(url)
    if (
        parsed.drivername != "postgresql+psycopg"
        or parsed.host not in {"127.0.0.1", "localhost"}
        or parsed.port != 55433
        or parsed.database != "leadflow_test"
    ):
        raise ValueError(
            "Tests require the dedicated loopback leadflow_test database on 55433"
        )
    return url


@pytest.fixture(scope="session")
def database_url():
    values = dotenv_values(ROOT / ".env", encoding="utf-8-sig")
    url = require_test_database(
        os.environ.get("TEST_DATABASE_URL") or values.get("TEST_DATABASE_URL") or ""
    )
    config = Config(str(ROOT / "backend" / "alembic.ini"))
    with pytest.MonkeyPatch.context() as patch:
        patch.setenv("DATABASE_URL", url)
        command.upgrade(config, "head")
        command.downgrade(config, "base")
        command.upgrade(config, "head")
        command.check(config)
    yield url


@pytest.fixture(autouse=True)
def clean_database(database_url):
    engine = create_engine(require_test_database(database_url))
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE users CASCADE"))
    yield
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE users CASCADE"))
    engine.dispose()


@pytest.fixture
def application(database_url):
    return create_app(Settings(database_url=database_url, auth_rate_limit=1000))


@pytest.fixture
def client(application):
    with TestClient(application) as test_client:
        yield test_client


@pytest.fixture
def registration():
    return {
        "email": "contact@fictional.example.org",
        "name": "Fictional Person",
        "password": secrets.token_urlsafe(24),
    }


@pytest.fixture
def registered(client, registration):
    response = client.post(
        "/api/v1/auth/register", json=registration, headers={"Origin": ORIGIN}
    )
    assert response.status_code == 201, response.text
    return response.json()
