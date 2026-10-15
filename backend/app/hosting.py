from pathlib import Path

from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import Settings
from app.main import create_app


class SPAFiles(StaticFiles):
    async def get_response(self, path, scope):
        if Path(path).parts and Path(path).parts[0] == "api":
            raise HTTPException(status_code=404)
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            # Only browser navigation falls back; missing scripts remain real 404s.
            if exc.status_code != 404 or Path(path).suffix:
                raise
            return await super().get_response("index.html", scope)


def create_hosted_app(settings: Settings, frontend_dir: Path):
    if not settings.cookie_secure or not settings.frontend_origin.startswith(
        "https://"
    ):
        raise ValueError("Hosted LeadFlow requires an HTTPS origin and Secure cookies")
    app = create_app(settings)
    app.mount("/", SPAFiles(directory=frontend_dir, html=True), name="frontend")
    return app
