"""
Pydantic schemas for authentication tokens.
"""

from typing import Any

from pydantic import BaseModel

from app.models.enums import UserRole


class Token(BaseModel):
    """Token response returned on successful login."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # in seconds
    role: UserRole
    username: str


class TokenPayload(BaseModel):
    """Payload decoded from JWT."""
    sub: str | None = None
    exp: int | None = None
    role: UserRole | None = None
    claims: dict[str, Any] | None = None
