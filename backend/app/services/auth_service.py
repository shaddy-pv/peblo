"""
Authentication service layer.
Handles user authentication and token creation.
"""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.token import Token


class AuthService:
    @staticmethod
    async def authenticate_user(
        db: AsyncSession, username: str, password: str
    ) -> User | None:
        """
        Authenticate a user by username and password.
        Returns User if valid and active, else None.
        """
        stmt = select(User).where(User.username == username)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user

    @staticmethod
    def create_user_token(user: User) -> Token:
        """Generate access token for an authenticated user."""
        expires_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        access_token = create_access_token(
            subject=user.username,
            expires_delta=timedelta(minutes=expires_minutes),
            claims={"role": user.role.value, "user_id": str(user.id)},
        )
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=expires_minutes * 60,
            role=user.role,
            username=user.username,
        )
