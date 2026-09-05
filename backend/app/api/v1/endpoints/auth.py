"""
Authentication endpoints.
Supports both OAuth2 password form data (for Swagger UI) and JSON body (for web clients).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserLogin, UserRead
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/token",
    response_model=Token,
    summary="OAuth2 compatible token login",
    description="Accepts username and password as form data (standard OAuth2 flow, used by Swagger UI).",
)
async def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    """OAuth2 password form login."""
    user = await AuthService.authenticate_user(
        db, form_data.username, form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AuthService.create_user_token(user)


@router.post(
    "/login",
    response_model=Token,
    summary="JSON body token login",
    description="Accepts username and password as a JSON payload (for SPA / API clients).",
)
async def login_json(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """JSON body login."""
    user = await AuthService.authenticate_user(
        db, credentials.username, credentials.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AuthService.create_user_token(user)


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current user profile",
    description="Returns the profile and role of the currently authenticated user.",
)
async def read_current_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Return currently logged-in user profile."""
    return current_user
