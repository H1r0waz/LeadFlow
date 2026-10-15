import hashlib
import hmac
import math
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuthSession, User
from app.schemas import AuthOutput, LoginInput, ProfileInput, RegisterInput, UserOutput

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
SESSION_COOKIE = "leadflow_session"
CSRF_COOKIE = "leadflow_csrf"
COOKIE_PATH = "/api/v1"
password_hasher = PasswordHasher()
dummy_hash = password_hasher.hash(secrets.token_urlsafe(32))


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


class AuthThrottle:
    # shortcut: process-local limits; replace with shared storage before multiple workers.
    def __init__(self, limit: int, window: int, max_clients: int):
        self.limit = limit
        self.window = window
        self.max_clients = max_clients
        self.clients: dict[str, tuple[int, float]] = {}
        self.lock = threading.Lock()

    def check(self, client: str) -> None:
        now = time.monotonic()
        with self.lock:
            self.clients = {
                key: entry for key, entry in self.clients.items() if entry[1] > now
            }
            count, expiry = self.clients.get(client, (0, now + self.window))
            if count >= self.limit or (
                client not in self.clients and len(self.clients) >= self.max_clients
            ):
                raise HTTPException(
                    429,
                    "Too many authentication attempts",
                    headers={"Retry-After": str(max(1, math.ceil(expiry - now)))},
                )
            self.clients[client] = (count + 1, expiry)


def throttle(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    request.app.state.auth_throttle.check(client)


def current_auth(
    request: Request, db: Session = Depends(get_db)
) -> tuple[User, AuthSession]:
    token = request.cookies.get(SESSION_COOKIE, "")
    if not token or len(token) > 128:
        raise HTTPException(401, "Authentication required")
    session = db.get(AuthSession, digest(token))
    if session is None:
        raise HTTPException(401, "Authentication required")
    if session.expires_at <= datetime.now(timezone.utc):
        db.delete(session)
        db.commit()
        raise HTTPException(401, "Authentication required")
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(401, "Authentication required")
    return user, session


def authenticated_write(
    request: Request, auth=Depends(current_auth)
) -> tuple[User, AuthSession]:
    token = request.headers.get("X-CSRF-Token", "")
    if (
        not token
        or len(token) > 128
        or not hmac.compare_digest(digest(token), auth[1].csrf_digest)
    ):
        raise HTTPException(403, "Invalid CSRF token")
    return auth


def issue_session(
    request: Request, response: Response, db: Session, user: User
) -> AuthOutput:
    now = datetime.now(timezone.utc)
    presented = request.cookies.get(SESSION_COOKIE, "")
    if presented and len(presented) <= 128:
        db.execute(
            delete(AuthSession).where(AuthSession.token_digest == digest(presented))
        )
    db.execute(delete(AuthSession).where(AuthSession.expires_at <= now))
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    settings = request.app.state.settings
    max_age = settings.session_hours * 3600
    db.add(
        AuthSession(
            token_digest=digest(token),
            user_id=user.id,
            csrf_digest=digest(csrf),
            expires_at=now + timedelta(seconds=max_age),
        )
    )
    db.commit()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=COOKIE_PATH,
    )
    response.set_cookie(
        CSRF_COOKIE,
        csrf,
        max_age=max_age,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return AuthOutput(user=UserOutput.model_validate(user), csrf_token=csrf)


@router.post(
    "/register",
    response_model=AuthOutput,
    status_code=201,
    dependencies=[Depends(throttle)],
)
def register(
    body: RegisterInput,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    user = User(
        email=str(body.email),
        name=body.name,
        password_hash=password_hasher.hash(body.password.get_secret_value()),
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists") from None
    return issue_session(request, response, db, user)


@router.post("/login", response_model=AuthOutput, dependencies=[Depends(throttle)])
def login(
    body: LoginInput,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.scalar(select(User).where(User.email == str(body.email)))
    try:
        password_hasher.verify(
            user.password_hash if user else dummy_hash, body.password.get_secret_value()
        )
    except (VerificationError, InvalidHashError):
        raise HTTPException(401, "Invalid email or password") from None
    if user is None:
        raise HTTPException(401, "Invalid email or password")
    if password_hasher.check_needs_rehash(user.password_hash):
        user.password_hash = password_hasher.hash(body.password.get_secret_value())
    return issue_session(request, response, db, user)


@router.get("/me", response_model=UserOutput)
def me(auth=Depends(current_auth)):
    return auth[0]


@router.patch("/me", response_model=UserOutput)
def update_profile(
    body: ProfileInput, auth=Depends(authenticated_write), db: Session = Depends(get_db)
):
    user, _ = auth
    user.name = body.name
    db.commit()
    db.refresh(user)
    return user


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    auth=Depends(authenticated_write),
    db: Session = Depends(get_db),
):
    db.delete(auth[1])
    db.commit()
    for name in (SESSION_COOKIE, CSRF_COOKIE):
        response.delete_cookie(
            name,
            path=COOKIE_PATH if name == SESSION_COOKIE else "/",
            secure=request.app.state.settings.cookie_secure,
            httponly=name == SESSION_COOKIE,
            samesite="lax",
        )
