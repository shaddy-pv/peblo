"""
Security utilities: password hashing (bcrypt) and JWT token creation/decoding.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        # Bcrypt has a 72-byte max length limitation
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate bcrypt hash for a plaintext password."""
    # Bcrypt has a 72-byte max length limitation
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
    claims: dict[str, Any] | None = None,
) -> str:
    """
    Generate a signed JWT access token.

    :param subject: User identifier (usually username or user id string).
    :param expires_delta: Optional custom expiry duration.
    :param claims: Optional additional claims (e.g. role).
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }

    if claims:
        to_encode.update(claims)

    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a signed JWT token.
    Raises JWTError if token is invalid or expired.
    """
    payload = jwt.decode(
        token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
    )
    return payload
