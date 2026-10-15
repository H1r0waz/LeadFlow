from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.auth import AuthThrottle
from app.auth import router as auth_router
from app.config import Settings
from app.csv_transfer import router as csv_router
from app.dashboard import router as dashboard_router
from app.db import build_engine
from app.demo import router as demo_router
from app.leads import router as leads_router
from app.tasks import router as tasks_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    engine = build_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        engine.dispose()

    app = FastAPI(title="LeadFlow API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.engine = engine
    app.state.auth_throttle = AuthThrottle(
        settings.auth_rate_limit,
        settings.auth_rate_window_seconds,
        settings.auth_rate_max_clients,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )

    @app.middleware("http")
    async def request_guards(request: Request, call_next):
        api_write = request.url.path.startswith("/api/v1/") and request.method not in {
            "GET",
            "HEAD",
            "OPTIONS",
        }
        if api_write:
            if request.headers.get("origin") != settings.frontend_origin:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Invalid request origin"},
                    headers={"Cache-Control": "no-store"},
                )
        if api_write:
            csv_request = request.method == "POST" and request.url.path.startswith(
                "/api/v1/csv/"
            )
            limit = 14 * 1024 * 1024 if csv_request else 256 * 1024
            chunks = []
            size = 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > limit:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "detail": "CSV request exceeds the 14 MiB JSON limit"
                            if csv_request
                            else "Request exceeds the 256 KiB JSON limit"
                        },
                        headers={"Cache-Control": "no-store"},
                    )
                chunks.append(chunk)
            # Starlette's cached request replays this bounded body downstream.
            request._body = b"".join(chunks)
        response = await call_next(request)
        if request.url.path.startswith("/api/v1/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Validation errors must never echo submitted credentials or arbitrary extra fields.
        if request.url.path.startswith("/api/v1/csv/"):
            return JSONResponse(
                status_code=422,
                content={
                    "detail": "Invalid CSV request; check text, mapping and confirmation"
                },
            )
        errors = [
            {"type": error["type"], "loc": error["loc"], "msg": error["msg"]}
            for error in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": errors})

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request: Request, exc: SQLAlchemyError):
        return JSONResponse(
            status_code=503,
            content={"detail": "Database unavailable"},
            headers={"Cache-Control": "no-store"},
        )

    @app.get("/health")
    def liveness():
        return {"status": "ok"}

    @app.get("/api/v1/health")
    def readiness():
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
        except SQLAlchemyError:
            return JSONResponse(status_code=503, content={"status": "unavailable"})
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(leads_router)
    app.include_router(tasks_router)
    app.include_router(dashboard_router)
    app.include_router(csv_router)
    app.include_router(demo_router)
    return app
