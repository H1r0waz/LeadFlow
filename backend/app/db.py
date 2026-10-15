from collections.abc import Generator

from fastapi import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


def build_engine(database_url: str):
    return create_engine(
        database_url,
        pool_pre_ping=True,
        hide_parameters=True,
        connect_args={"connect_timeout": 5},
    )


def get_db(request: Request) -> Generator[Session, None, None]:
    with Session(request.app.state.engine) as session:
        yield session
