"""Single-instance hosted demo: migrate, then serve the API and built SPA."""

import os
from pathlib import Path

import uvicorn
from alembic.config import Config

from alembic import command
from app.config import Settings
from app.hosting import create_hosted_app

ROOT = Path(__file__).resolve().parents[1]


def main():
    origin = os.environ.get("FRONTEND_ORIGIN") or os.environ["RENDER_EXTERNAL_URL"]
    settings = Settings(frontend_origin=origin, cookie_secure=True)
    migration_url = os.environ.pop("MIGRATION_DATABASE_URL")
    # Use the database owner only while running migrations.
    os.environ["DATABASE_URL"] = migration_url
    try:
        command.upgrade(Config(str(ROOT / "backend/alembic.ini")), "head")
    finally:
        os.environ["DATABASE_URL"] = settings.database_url
    app = create_hosted_app(settings, ROOT / "frontend/dist")
    uvicorn.run(
        app, host="0.0.0.0", port=int(os.environ.get("PORT", "10000")), workers=1
    )


if __name__ == "__main__":
    main()
