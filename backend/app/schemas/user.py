"""
Pydantic schemas for User entity.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import UserRole


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    role: UserRole = UserRole.EDITOR


class UserLogin(BaseModel):
    """JSON login request payload."""
    username: str
    password: str


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)


class UserRead(UserBase):
    """User response schema."""
    id: uuid.UUID
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
