"""
FastAPI dependencies for DB sessions, authentication, and role-based authorization.
"""

from typing import AsyncGenerator, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.models.enums import UserRole
from app.models.user import User

# OAuth2 scheme configured with the token URL
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/token",
    auto_error=True,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an async database session.
    Rolls back on exception, always closes session on exit.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate the Bearer access token and return the current user.
    Raises 401 Unauthorized if invalid or user does not exist.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency verifying the user is active."""
    return current_user


def require_role(*allowed_roles: UserRole) -> Callable:
    """
    Role-based authorization dependency factory.
    Enforces that the current authenticated user possesses one of the allowed roles.
    Raises 403 Forbidden if the role is unauthorized.
    """
    async def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.role not in allowed_roles:
            role_names = ", ".join([r.value for r in allowed_roles])
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {role_names}",
            )
        return current_user

    return role_checker


# Role shortcut dependencies:
# Admin-only operations (e.g. publish catalogue, manage users)
require_admin = require_role(UserRole.ADMIN)

# Editor operations (admin is also allowed to perform editor operations)
require_editor = require_role(UserRole.EDITOR, UserRole.ADMIN)
