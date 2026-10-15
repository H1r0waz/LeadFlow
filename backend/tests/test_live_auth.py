import os
import socket
import subprocess
import sys
import time

import httpx
from conftest import ORIGIN, ROOT


def test_real_http_auth_and_owner_scoped_lead_crud(database_url, registration):
    # A real Uvicorn process exercises serialization, cookies and TCP against PostgreSQL.
    with socket.socket() as available:
        available.bind(("127.0.0.1", 0))
        port = available.getsockname()[1]
    environment = os.environ | {"DATABASE_URL": database_url}
    (ROOT / ".local").mkdir(exist_ok=True)
    with (ROOT / ".local" / "live-auth.log").open("w", encoding="utf-8") as log:
        process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:create_app",
                "--factory",
                "--app-dir",
                "backend",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--no-access-log",
            ],
            cwd=ROOT,
            env=environment,
            stdout=log,
            stderr=log,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        try:
            with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=3) as client:
                deadline = time.monotonic() + 20
                while True:
                    assert process.poll() is None, (
                        "Uvicorn exited; inspect .local/live-auth.log"
                    )
                    try:
                        health = client.get("/api/v1/health")
                        if health.status_code == 200:
                            break
                    except httpx.ConnectError:
                        pass
                    if time.monotonic() >= deadline:
                        raise AssertionError("Uvicorn readiness timed out")
                    time.sleep(0.1)
                response = client.post(
                    "/api/v1/auth/register",
                    json=registration,
                    headers={"Origin": ORIGIN},
                )
                assert response.status_code == 201
                csrf = response.json()["csrf_token"]
                raw_session = client.cookies.get("leadflow_session")
                assert (
                    client.get("/api/v1/auth/me").json()["email"]
                    == registration["email"]
                )
                headers = {"Origin": ORIGIN, "X-CSRF-Token": csrf}
                created = client.post(
                    "/api/v1/leads",
                    json={
                        "name": "Live Fictional Lead",
                        "company": "Live Fictional Studio",
                        "email": "live-lead@fictional.example.org",
                        "estimated_value": "1200.50",
                    },
                    headers=headers,
                )
                assert created.status_code == 201
                lead = created.json()
                detail_path = f"/api/v1/leads/{lead['id']}"
                assert (
                    client.get(detail_path).json()["company"] == "Live Fictional Studio"
                )
                assert (
                    client.patch(
                        detail_path, json={"status": "proposal_sent"}, headers=headers
                    ).status_code
                    == 200
                )
                assert client.get(detail_path).json()["status"] == "proposal_sent"
                listing = client.get(
                    "/api/v1/leads",
                    params={"q": "FICTIONAL STUDIO", "status": "proposal_sent"},
                ).json()
                assert listing["total"] == 1 and listing["items"][0]["id"] == lead["id"]
                with httpx.Client(
                    base_url=f"http://127.0.0.1:{port}", timeout=3
                ) as other:
                    second = other.post(
                        "/api/v1/auth/register",
                        json={
                            **registration,
                            "email": "live-other@fictional.example.org",
                        },
                        headers={"Origin": ORIGIN},
                    )
                    assert second.status_code == 201
                    second_headers = {
                        "Origin": ORIGIN,
                        "X-CSRF-Token": second.json()["csrf_token"],
                    }
                    assert other.get("/api/v1/leads").json()["total"] == 0
                    assert other.get(detail_path).status_code == 404
                    assert (
                        other.patch(
                            detail_path, json={"status": "won"}, headers=second_headers
                        ).status_code
                        == 404
                    )
                    assert (
                        other.delete(detail_path, headers=second_headers).status_code
                        == 404
                    )
                assert client.get(detail_path).json()["status"] == "proposal_sent"
                assert client.delete(detail_path, headers=headers).status_code == 204
                assert client.get(detail_path).status_code == 404
                assert (
                    client.patch(
                        "/api/v1/auth/me",
                        json={"name": "Live Fictional Person"},
                        headers=headers,
                    ).status_code
                    == 200
                )
                assert (
                    client.get("/api/v1/auth/me").json()["name"]
                    == "Live Fictional Person"
                )
                assert (
                    client.post("/api/v1/auth/logout", headers=headers).status_code
                    == 204
                )
                assert (
                    client.get(
                        "/api/v1/auth/me",
                        headers={"Cookie": f"leadflow_session={raw_session}"},
                    ).status_code
                    == 401
                )
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
