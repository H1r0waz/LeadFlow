import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import authenticated_write, current_auth
from app.db import get_db
from app.lead_schemas import LeadCreate, LeadList, LeadOutput, LeadPatch, LeadStatus
from app.models import Activity, Lead

router = APIRouter(prefix="/api/v1/leads", tags=["leads"])


def commit_lead(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if (
            getattr(exc.orig, "sqlstate", None) == "23505"
            and getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
            == "uq_leads_user_email"
        ):
            raise HTTPException(409, "A lead with this email already exists") from None
        raise


def owned_lead(
    db: Session, lead_id: uuid.UUID, user_id: uuid.UUID, *, lock=False
) -> Lead:
    statement = select(Lead).where(Lead.id == lead_id, Lead.user_id == user_id)
    if lock:
        statement = statement.with_for_update()
    lead = db.scalar(statement)
    if lead is None:
        raise HTTPException(404, "Lead not found")
    return lead


@router.post("", response_model=LeadOutput, status_code=201)
def create_lead(
    body: LeadCreate, auth=Depends(authenticated_write), db: Session = Depends(get_db)
):
    lead = Lead(user_id=auth[0].id, **body.model_dump())
    db.add(lead)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        if (
            getattr(exc.orig, "sqlstate", None) == "23505"
            and getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
            == "uq_leads_user_email"
        ):
            raise HTTPException(409, "A lead with this email already exists") from None
        raise
    db.add(
        Activity(
            lead_id=lead.id,
            user_id=lead.user_id,
            type="lead_created",
            description="Lead created",
        )
    )
    commit_lead(db)
    db.refresh(lead)
    return lead


@router.get("", response_model=LeadList)
def list_leads(
    page: int = Query(default=1, ge=1, le=2147483647),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, max_length=200, pattern=r"^[^\x00]*$"),
    status: LeadStatus | None = None,
    source: str | None = Query(default=None, max_length=100, pattern=r"^[^\x00]*$"),
    sort_by: Literal[
        "created_at", "updated_at", "name", "company", "estimated_value", "status"
    ] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    auth=Depends(current_auth),
    db: Session = Depends(get_db),
):
    filters = [Lead.user_id == auth[0].id]
    if q and q.strip():
        escaped = (
            q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        )
        filters.append(
            or_(
                *(
                    column.ilike(f"%{escaped}%", escape="\\")
                    for column in (Lead.name, Lead.company, Lead.email, Lead.phone)
                )
            )
        )
    if status is not None:
        filters.append(Lead.status == status)
    if source is not None:
        filters.append(func.lower(Lead.source) == source.strip().lower())
    total = db.scalar(select(func.count()).select_from(Lead).where(*filters))
    column = getattr(Lead, sort_by)
    if sort_by in {"name", "company"}:
        column = func.lower(column)
    ordering = column.asc() if sort_order == "asc" else column.desc()
    items = db.scalars(
        select(Lead)
        .where(*filters)
        .order_by(ordering, Lead.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{lead_id}", response_model=LeadOutput)
def get_lead(
    lead_id: uuid.UUID, auth=Depends(current_auth), db: Session = Depends(get_db)
):
    return owned_lead(db, lead_id, auth[0].id)


@router.patch("/{lead_id}", response_model=LeadOutput)
def update_lead(
    lead_id: uuid.UUID,
    body: LeadPatch,
    auth=Depends(authenticated_write),
    db: Session = Depends(get_db),
):
    lead = owned_lead(db, lead_id, auth[0].id, lock=True)
    changes = {
        key: value
        for key, value in body.model_dump(exclude_unset=True).items()
        if getattr(lead, key) != value
    }
    if changes:
        old_status = lead.status
        for key, value in changes.items():
            setattr(lead, key, value)
        lead.updated_at = datetime.now(timezone.utc)
        status_changed = "status" in changes
        if set(changes) - {"notes"}:
            db.add(
                Activity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    type="status_changed" if status_changed else "lead_updated",
                    description=f"Status changed from {old_status} to {lead.status}"
                    if status_changed
                    else "Lead updated",
                )
            )
        if "notes" in changes:
            db.add(
                Activity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    type="notes_updated",
                    description="Notes updated",
                )
            )
        commit_lead(db)
        db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=204)
def delete_lead(
    lead_id: uuid.UUID, auth=Depends(authenticated_write), db: Session = Depends(get_db)
):
    lead = owned_lead(db, lead_id, auth[0].id, lock=True)
    db.delete(lead)
    commit_lead(db)
    return Response(status_code=204)
