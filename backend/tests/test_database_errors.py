from conftest import ORIGIN
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_database_outage_returns_safe_error(database_url, registration):
    unavailable_url = database_url.replace("/leadflow_test", "/leadflow_nonexistent")
    application = create_app(Settings(database_url=unavailable_url))
    with TestClient(application) as client:
        assert client.get("/health").status_code == 200
        readiness = client.get("/api/v1/health")
        assert readiness.status_code == 503
        response = client.post(
            "/api/v1/auth/register",
            json=registration,
            headers={"Origin": ORIGIN},
        )
        assert response.status_code == 503
        assert response.json() == {"detail": "Database unavailable"}
        assert "leadflow_nonexistent" not in response.text
        assert registration["password"] not in response.text
