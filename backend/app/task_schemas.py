import re
import uuid
from datetime import date, datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    field_validator,
    model_validator,
)

from app.schemas import StrictInput


class TaskFields(StrictInput):
    @field_validator("title", "description", mode="before", check_fields=False)
    @classmethod
    def clean_text(cls, value):
        if isinstance(value, str):
            if "\x00" in value:
                raise ValueError("Text cannot contain null characters")
            return value.strip()
        return value

    @field_validator("due_date", mode="before", check_fields=False)
    @classmethod
    def calendar_date(cls, value):
        if type(value) is date:
            return value
        if isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return date.fromisoformat(value)
        raise ValueError("Use a calendar date in YYYY-MM-DD format")


class TaskCreate(TaskFields):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    due_date: date


class TaskPatch(TaskFields):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    due_date: date | None = None
    completed: StrictBool | None = None

    @model_validator(mode="before")
    @classmethod
    def require_changes(cls, value):
        if isinstance(value, dict):
            if not value:
                raise ValueError("Provide at least one field")
            if any(item is None for item in value.values()):
                raise ValueError("Task fields cannot be null")
        return value


class TaskOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str
    due_date: date
    completed: bool
    created_at: datetime


class TaskList(BaseModel):
    items: list[TaskOutput]
    total: int
    page: int
    page_size: int


class ActivityOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: uuid.UUID
    user_id: uuid.UUID
    type: str
    description: str
    created_at: datetime


class ActivityList(BaseModel):
    items: list[ActivityOutput]
    total: int
    page: int
    page_size: int
