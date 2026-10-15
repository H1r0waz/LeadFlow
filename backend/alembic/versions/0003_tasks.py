"""Create owner-scoped follow-up tasks."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0003_tasks"
down_revision = "0002_leads_activities"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.String(2000), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["lead_id", "user_id"], ["leads.id", "leads.user_id"], ondelete="CASCADE"
        ),
        sa.CheckConstraint("length(trim(title)) > 0", name="ck_tasks_title"),
    )
    op.create_index("ix_tasks_user_due", "tasks", ["user_id", "due_date"])
    op.create_index("ix_tasks_user_lead", "tasks", ["user_id", "lead_id"])


def downgrade():
    op.drop_table("tasks")
