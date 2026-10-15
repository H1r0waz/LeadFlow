from pathlib import Path
from urllib.parse import urlsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        extra="ignore",
        hide_input_in_errors=True,
        populate_by_name=True,
    )

    database_url: str
    frontend_origin: str = "http://localhost:5173"
    cookie_secure: bool = False
    session_hours: int = Field(
        default=24, ge=1, le=168, validation_alias="SESSION_TTL_HOURS"
    )
    auth_rate_limit: int = Field(default=10, ge=1, le=1000)
    auth_rate_window_seconds: int = Field(default=60, ge=1, le=3600)
    auth_rate_max_clients: int = Field(default=10000, ge=1, le=100000)

    @field_validator("database_url")
    @classmethod
    def postgres_only(cls, value: str) -> str:
        if make_url(value).drivername != "postgresql+psycopg":
            raise ValueError("DATABASE_URL must use postgresql+psycopg")
        return value

    @field_validator("frontend_origin")
    @classmethod
    def exact_origin(cls, value: str) -> str:
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.path
            or parsed.query
            or parsed.fragment
            or parsed.username
        ):
            raise ValueError(
                "FRONTEND_ORIGIN must be an exact HTTP(S) origin without a trailing slash"
            )
        return value
