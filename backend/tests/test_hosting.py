import os

import pytest
from fastapi.testclient import TestClient

import serve
from app.config import Settings
from app.hosting import create_hosted_app


def test_hosted_routes_assets_and_secure_session(database_url, tmp_path, registration):
    (tmp_path / "index.html").write_text(
        "<html>LeadFlow shell</html>", encoding="utf-8"
    )
    (tmp_path / "app.js").write_text("/* built asset */", encoding="utf-8")
    app = create_hosted_app(
        Settings(
            database_url=database_url,
            frontend_origin="https://leadflow.example.org",
            cookie_secure=True,
        ),
        tmp_path,
    )
    with TestClient(app, base_url="https://leadflow.example.org") as client:
        for path in ("/", "/login", "/leads/fictional/edit"):
            assert "LeadFlow shell" in client.get(path).text
        assert client.get("/app.js").status_code == 200
        for path in ("/missing.js", "/api/missing", "/api/v1/missing"):
            assert client.get(path).status_code == 404
        assert client.get("/api/v1/health").json() == {"status": "ok"}
        response = client.post(
            "/api/v1/auth/register",
            json=registration,
            headers={"Origin": "https://leadflow.example.org"},
        )
        assert response.status_code == 201
        assert all(
            "Secure" in cookie for cookie in response.headers.get_list("set-cookie")
        )
        assert client.get("/api/v1/auth/me").status_code == 200


@pytest.mark.parametrize(
    "origin,secure",
    [("http://leadflow.example.org", True), ("https://leadflow.example.org", False)],
)
def test_hosted_app_rejects_insecure_settings(database_url, tmp_path, origin, secure):
    with pytest.raises(ValueError, match="requires an HTTPS origin and Secure cookies"):
        create_hosted_app(
            Settings(
                database_url=database_url, frontend_origin=origin, cookie_secure=secure
            ),
            tmp_path,
        )


def test_startup_separates_migration_and_runtime_credentials(database_url, monkeypatch):
    owner_url = "postgresql+psycopg://migration_owner@localhost/leadflow"
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("MIGRATION_DATABASE_URL", owner_url)
    monkeypatch.setenv("FRONTEND_ORIGIN", "https://leadflow.example.org")
    monkeypatch.setenv("PORT", "10000")
    calls = []

    def migrate(config, revision):
        assert os.environ["DATABASE_URL"] == owner_url
        assert revision == "head"
        calls.append("migration")

    def run(app, **options):
        assert os.environ["DATABASE_URL"] == database_url
        assert "MIGRATION_DATABASE_URL" not in os.environ
        assert options == {"host": "0.0.0.0", "port": 10000, "workers": 1}
        calls.append("server")

    monkeypatch.setattr(serve.command, "upgrade", migrate)
    monkeypatch.setattr(serve.uvicorn, "run", run)
    serve.main()
    assert calls == ["migration", "server"]
