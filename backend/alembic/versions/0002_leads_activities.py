"""Create owner-scoped leads and atomic activity history."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0002_leads_activities"
down_revision = "0001_users_sessions"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("company", sa.String(200), nullable=False),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("phone", sa.String(50), nullable=False),
        sa.Column("source", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("estimated_value", sa.Numeric(14, 2), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "email", name="uq_leads_user_email"),
        sa.UniqueConstraint("id", "user_id", name="uq_leads_id_user"),
        sa.CheckConstraint(
            "status IN ('new', 'contacted', 'interested', 'proposal_sent', 'won', 'lost')",
            name="ck_leads_status",
        ),
        sa.CheckConstraint("estimated_value >= 0", name="ck_leads_value"),
    )
    op.create_index("ix_leads_user_status", "leads", ["user_id", "status"])
    op.create_index("ix_leads_user_created", "leads", ["user_id", "created_at"])
    op.create_table(
        "activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
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
    )
    op.create_index("ix_activities_user_lead", "activities", ["user_id", "lead_id"])


def downgrade():
    op.drop_table("activities")
    op.drop_table("leads")
