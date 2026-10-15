import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import authenticated_write, current_auth
from app.db import get_db
from app.leads import owned_lead
from app.models import Activity, Task
from app.task_schemas import ActivityList, TaskCreate, TaskList, TaskOutput, TaskPatch

router = APIRouter(prefix="/api/v1/leads/{lead_id}", tags=["follow-ups"])


def owned_task(db: Session, task_id: uuid.UUID, lead_id: uuid.UUID, user_id: uuid.UUID):
    task = db.scalar(
        select(Task).where(
            Task.id == task_id, Task.lead_id == lead_id, Task.user_id == user_id
        )
    )
    if task is None:
        raise HTTPException(404, "Task not found")
    return task


def record_activity(db: Session, task: Task, event: str, action: str):
    db.add(
        Activity(
            lead_id=task.lead_id,
            user_id=task.user_id,
            type=event,
            description=f"Task {action}: {task.title}",
        )
    )


@router.get("/tasks", response_model=TaskList)
def list_tasks(
    lead_id: uuid.UUID,
    page: int = Query(default=1, ge=1, le=2147483647),
    page_size: int = Query(default=20, ge=1, le=100),
    completed: bool | None = None,
    auth=Depends(current_auth),
    db: Session = Depends(get_db),
):
    owned_lead(db, lead_id, auth[0].id)
    filters = [Task.lead_id == lead_id, Task.user_id == auth[0].id]
    if completed is not None:
        filters.append(Task.completed == completed)
    total = db.scalar(select(func.count()).select_from(Task).where(*filters))
    items = db.scalars(
        select(Task)
        .where(*filters)
        .order_by(Task.completed.asc(), Task.due_date.asc(), Task.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/tasks", response_model=TaskOutput, status_code=201)
def create_task(
    lead_id: uuid.UUID,
    body: TaskCreate,
    auth=Depends(authenticated_write),
    db: Session = Depends(get_db),
):
    lead = owned_lead(db, lead_id, auth[0].id, lock=True)
    task = Task(lead_id=lead.id, user_id=lead.user_id, **body.model_dump())
    db.add(task)
    record_activity(db, task, "task_created", "created")
    db.commit()
    db.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=TaskOutput)
def update_task(
    lead_id: uuid.UUID,
    task_id: uuid.UUID,
    body: TaskPatch,
    auth=Depends(authenticated_write),
    db: Session = Depends(get_db),
):
    owned_lead(db, lead_id, auth[0].id, lock=True)
    task = owned_task(db, task_id, lead_id, auth[0].id)
    changes = {
        key: value
        for key, value in body.model_dump(exclude_unset=True).items()
        if getattr(task, key) != value
    }
    if changes:
        for key, value in changes.items():
            setattr(task, key, value)
        action = (
            ("completed" if task.completed else "reopened")
            if "completed" in changes
            else "updated"
        )
        record_activity(db, task, f"task_{action}", action)
        db.commit()
        db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    lead_id: uuid.UUID,
    task_id: uuid.UUID,
    auth=Depends(authenticated_write),
    db: Session = Depends(get_db),
):
    owned_lead(db, lead_id, auth[0].id, lock=True)
    task = owned_task(db, task_id, lead_id, auth[0].id)
    record_activity(db, task, "task_deleted", "deleted")
    db.delete(task)
    db.commit()
    return Response(status_code=204)


@router.get("/activities", response_model=ActivityList)
def list_activities(
    lead_id: uuid.UUID,
    page: int = Query(default=1, ge=1, le=2147483647),
    page_size: int = Query(default=20, ge=1, le=100),
    auth=Depends(current_auth),
    db: Session = Depends(get_db),
):
    owned_lead(db, lead_id, auth[0].id)
    filters = [Activity.lead_id == lead_id, Activity.user_id == auth[0].id]
    total = db.scalar(select(func.count()).select_from(Activity).where(*filters))
    items = db.scalars(
        select(Activity)
        .where(*filters)
        .order_by(Activity.created_at.desc(), Activity.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}
