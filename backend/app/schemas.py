import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LoginInput(StrictInput):
    email: EmailStr = Field(max_length=254)
    password: SecretStr = Field(min_length=12, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class RegisterInput(LoginInput):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        if "\x00" in value:
            raise ValueError("Text cannot contain null characters")
        if not value.strip():
            raise ValueError("Name cannot be blank")
        return value.strip()


class ProfileInput(StrictInput):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        if "\x00" in value:
            raise ValueError("Text cannot contain null characters")
        if not value.strip():
            raise ValueError("Name cannot be blank")
        return value.strip()


class UserOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    name: str
    created_at: datetime


class AuthOutput(BaseModel):
    user: UserOutput
    csrf_token: str
