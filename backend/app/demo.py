from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import authenticated_write
from app.db import get_db
from app.lead_schemas import LeadCreate
from app.models import Activity, Lead, Task, User
from app.task_schemas import TaskCreate

router = APIRouter(prefix="/api/v1/demo", tags=["demo"])

LEADS = (
    ("Mara Vale", "Fictional Meadow Studio", "new", "1200"),
    ("Theo Arden", "Fictional Lantern Works", "new", "850"),
    ("Nina Sol", "Fictional Paper Harbor", "contacted", "800"),
    ("Luca Reed", "Fictional Cloud Atelier", "contacted", "2200"),
    ("Iris Finch", "Fictional Fern Collective", "interested", "1800"),
    ("Soren Wren", "Fictional Amber Workshop", "interested", "950"),
    ("Ava Rowan", "Fictional Moon Orchard", "proposal_sent", "3200"),
    ("Emil Stone", "Fictional Copper Canvas", "proposal_sent", "1400"),
    ("Remy Atlas", "Fictional Willow Press", "won", "2800"),
    ("Elena Grove", "Fictional Kite Foundry", "won", "1600"),
    ("Noah Cedar", "Fictional Mist Studio", "lost", "900"),
    ("Mira Lark", "Fictional Maple House", "lost", "700"),
)
TASKS = (
    (0, "Send an introductory note", 1),
    (1, "Prepare discovery questions", 3),
    (2, "Follow up on the introduction", -2),
    (3, "Confirm the discovery call", 0),
    (4, "Share a sample project outline", 2),
    (5, "Review the fictional brief", 7),
    (8, "Record the completed handover", -1),
    (9, "Schedule a project check-in", 4),
)


@router.post("/seed", status_code=201)
def seed_demo(auth=Depends(authenticated_write), db: Session = Depends(get_db)):
    owner = auth[0].id
    # Serialize seed attempts for this owner; never replace existing workspace data.
    db.scalar(select(User).where(User.id == owner).with_for_update())
    if db.scalar(select(Lead.id).where(Lead.user_id == owner).limit(1)) is not None:
        raise HTTPException(
            409,
            "Demo data requires an empty workspace. Existing leads have been preserved.",
        )

    today = datetime.now(timezone.utc).date()
    leads = []
    for name, company, status, value in LEADS:
        data = LeadCreate(
            name=name,
            company=company,
            email=f"{name.lower().replace(' ', '.')}@example.org",
            source="Fictional demo",
            status=status,
            estimated_value=value,
            notes="Fictional demo contact. No real person, company or client work.",
        )
        lead = Lead(user_id=owner, **data.model_dump())
        db.add(lead)
        leads.append(lead)
    db.flush()
    for lead in leads:
        db.add(
            Activity(
                lead_id=lead.id,
                user_id=owner,
                type="lead_created",
                description="Fictional demo lead created in its initial stage",
            )
        )
    for index, title, offset in TASKS:
        data = TaskCreate(
            title=title,
            description="Fictional demo follow-up for exploring LeadFlow.",
            due_date=today + timedelta(days=offset),
        )
        completed = index == 8
        db.add(
            Task(
                lead_id=leads[index].id,
                user_id=owner,
                completed=completed,
                **data.model_dump(),
            )
        )
        db.add(
            Activity(
                lead_id=leads[index].id,
                user_id=owner,
                type="task_created",
                description=f"Fictional demo task created{' as completed' if completed else ''}: {title}",
            )
        )
    db.commit()
    return {"leads_created": len(leads), "tasks_created": len(TASKS)}
