import uuid
from datetime import date, datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import current_auth
from app.db import get_db
from app.lead_schemas import LeadStatus
from app.models import Lead, Task

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])
Money = Annotated[str, Field(pattern=r"^\d+\.\d{2}$")]
Count = Annotated[int, Field(ge=0)]


class DashboardOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class StageSummary(DashboardOutput):
    status: LeadStatus
    count: Count
    value: Money


class UpcomingTask(DashboardOutput):
    id: uuid.UUID
    lead_id: uuid.UUID
    lead_name: str
    title: str
    due_date: date


class Dashboard(DashboardOutput):
    total: Count
    open: Count
    won: Count
    lost: Count
    open_value: Money
    won_value: Money
    conversion_rate: Money
    stages: list[StageSummary]
    upcoming_tasks: list[UpcomingTask]
    incomplete_tasks: Count
    overdue_tasks: Count
    due_today: Count
    as_of: date


def money(value: Decimal) -> str:
    return format(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), ".2f")


@router.get("", response_model=Dashboard)
def dashboard(
    today: str | None = Query(
        default=None,
        pattern=r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
        description="Calendar date for task deadlines; defaults to the current UTC date.",
    ),
    auth=Depends(current_auth),
    db: Session = Depends(get_db),
):
    """Owner totals; open excludes won/lost. Conversion is won / closed × 100.

    Values are unweighted estimated amounts, serialized with two decimal places.
    Next tasks include overdue items and all future dates, earliest first (up to 5).
    Completed tasks are excluded from all deadline counts and the next-task list.
    """
    try:
        as_of = (
            date.fromisoformat(today) if today else datetime.now(timezone.utc).date()
        )
    except ValueError:
        raise HTTPException(
            422, "today must be a valid YYYY-MM-DD calendar date"
        ) from None

    owner = auth[0].id
    grouped = db.execute(
        select(Lead.status, func.count(), func.sum(Lead.estimated_value))
        .where(Lead.user_id == owner)
        .group_by(Lead.status)
    ).all()
    totals = {status: (count, value) for status, count, value in grouped}
    stages = [
        StageSummary(
            status=status,
            count=totals.get(status, (0, Decimal(0)))[0],
            value=money(totals.get(status, (0, Decimal(0)))[1]),
        )
        for status in LeadStatus
    ]
    won, won_value = totals.get("won", (0, Decimal(0)))
    lost = totals.get("lost", (0, Decimal(0)))[0]
    open_stages = [stage for stage in stages if stage.status not in {"won", "lost"}]
    task_filters = [
        Task.user_id == owner,
        Lead.user_id == owner,
        Task.completed.is_(False),
    ]
    incomplete, overdue, due_today = db.execute(
        select(
            func.count(),
            func.count().filter(Task.due_date < as_of),
            func.count().filter(Task.due_date == as_of),
        )
        .select_from(Task)
        .join(Lead, Task.lead_id == Lead.id)
        .where(*task_filters)
    ).one()
    tasks = db.execute(
        select(Task, Lead.name)
        .join(Lead, Task.lead_id == Lead.id)
        .where(*task_filters)
        .order_by(Task.due_date, Task.id)
        .limit(5)
    ).all()
    return Dashboard(
        total=sum(stage.count for stage in stages),
        open=sum(stage.count for stage in open_stages),
        won=won,
        lost=lost,
        open_value=money(sum((Decimal(s.value) for s in open_stages), Decimal(0))),
        won_value=money(won_value),
        conversion_rate=money(Decimal(won) / Decimal(won + lost) * 100)
        if won + lost
        else "0.00",
        stages=stages,
        upcoming_tasks=[
            UpcomingTask(
                id=task.id,
                lead_id=task.lead_id,
                lead_name=name,
                title=task.title,
                due_date=task.due_date,
            )
            for task, name in tasks
        ],
        incomplete_tasks=incomplete,
        overdue_tasks=overdue,
        due_today=due_today,
        as_of=as_of,
    )
