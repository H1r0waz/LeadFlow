import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.schemas import StrictInput


class LeadStatus(StrEnum):
    new = "new"
    contacted = "contacted"
    interested = "interested"
    proposal_sent = "proposal_sent"
    won = "won"
    lost = "lost"


class LeadFields(StrictInput):
    @field_validator("*", mode="before")
    @classmethod
    def reject_null_character(cls, value):
        # PostgreSQL text fields cannot store the NUL character.
        if isinstance(value, str) and "\x00" in value:
            raise ValueError("Text cannot contain null characters")
        return value

    @field_validator(
        "name", "company", "phone", "source", mode="before", check_fields=False
    )
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before", check_fields=False)
    @classmethod
    def clean_email(cls, value):
        return value.strip().lower() or None if isinstance(value, str) else value


class LeadCreate(LeadFields):
    name: str = Field(min_length=1, max_length=150)
    company: str = Field(default="", max_length=200)
    email: EmailStr | None = Field(default=None, max_length=254)
    phone: str = Field(default="", max_length=50)
    source: str = Field(default="", max_length=100)
    status: LeadStatus = LeadStatus.new
    estimated_value: Decimal = Field(
        default=Decimal("0"), ge=0, max_digits=14, decimal_places=2
    )
    notes: str = Field(default="", max_length=10000)


class LeadPatch(LeadFields):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    company: str | None = Field(default=None, max_length=200)
    email: EmailStr | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=50)
    source: str | None = Field(default=None, max_length=100)
    status: LeadStatus | None = None
    estimated_value: Decimal | None = Field(
        default=None, ge=0, max_digits=14, decimal_places=2
    )
    notes: str | None = Field(default=None, max_length=10000)

    @model_validator(mode="before")
    @classmethod
    def require_changes(cls, value):
        if isinstance(value, dict):
            if not value:
                raise ValueError("Provide at least one field")
            if any(item is None for key, item in value.items() if key != "email"):
                raise ValueError("Only email can be null")
        return value


class LeadOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    company: str
    email: EmailStr | None
    phone: str
    source: str
    status: LeadStatus
    estimated_value: Decimal
    notes: str
    created_at: datetime
    updated_at: datetime


class LeadList(BaseModel):
    items: list[LeadOutput]
    total: int
    page: int
    page_size: int
