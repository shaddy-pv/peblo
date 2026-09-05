"""
Unit and API integration tests for Authentication & Authorization (Phase 3).
Covers password hashing, JWT generation/validation, auth endpoints, and role enforcement.
"""

import uuid
from datetime import timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import APIRouter, Depends, status
from httpx import AsyncClient
from jose import JWTError, jwt

from app.api.deps import (
    get_db,
    require_admin,
    require_editor,
)
from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.main import app
from app.models.enums import UserRole
from app.models.user import User
from app.services.auth_service import AuthService

# ── Security Unit Tests ───────────────────────────────────────────────────────

class TestSecurityUtilities:
    def test_password_hashing_and_verification(self):
        plain = "SuperSecretPassword123!"
        hashed = get_password_hash(plain)

        assert hashed != plain
        assert verify_password(plain, hashed) is True
        assert verify_password("WrongPassword", hashed) is False

    def test_password_unique_salts(self):
        plain = "SamePassword"
        hash1 = get_password_hash(plain)
        hash2 = get_password_hash(plain)
        assert hash1 != hash2
        assert verify_password(plain, hash1) is True
        assert verify_password(plain, hash2) is True

    def test_create_and_decode_token(self):
        subject = "testuser"
        claims = {"role": "admin", "user_id": str(uuid.uuid4())}
        token = create_access_token(subject=subject, claims=claims)

        payload = decode_token(token)
        assert payload["sub"] == subject
        assert payload["role"] == "admin"
        assert payload["user_id"] == claims["user_id"]
        assert "exp" in payload
        assert "iat" in payload

    def test_expired_token_raises_jwt_error(self):
        # Create token that expired 10 minutes ago
        expired_delta = timedelta(minutes=-10)
        token = create_access_token(subject="expired_user", expires_delta=expired_delta)

        with pytest.raises(JWTError):
            decode_token(token)

    def test_tampered_token_raises_jwt_error(self):
        token = create_access_token(subject="valid_user")
        tampered = token[:-5] + "XXXXX"

        with pytest.raises(JWTError):
            decode_token(tampered)

    def test_invalid_secret_key_fails(self):
        token = create_access_token(subject="user1")
        with pytest.raises(JWTError):
            jwt.decode(token, "wrong_secret_key", algorithms=[settings.ALGORITHM])


# ── AuthService Unit Tests ───────────────────────────────────────────────────

class TestAuthService:
    @pytest.mark.asyncio
    async def test_authenticate_user_success(self):
        password = "secretpassword"
        hashed = get_password_hash(password)
        mock_user = User(
            id=uuid.uuid4(),
            username="john_doe",
            hashed_password=hashed,
            role=UserRole.EDITOR,
            is_active=True,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        user = await AuthService.authenticate_user(mock_db, "john_doe", password)
        assert user is not None
        assert user.username == "john_doe"

    @pytest.mark.asyncio
    async def test_authenticate_user_wrong_password(self):
        hashed = get_password_hash("correct_password")
        mock_user = User(
            id=uuid.uuid4(),
            username="john_doe",
            hashed_password=hashed,
            role=UserRole.EDITOR,
            is_active=True,
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        user = await AuthService.authenticate_user(mock_db, "john_doe", "wrong_password")
        assert user is None

    @pytest.mark.asyncio
    async def test_authenticate_user_inactive(self):
        password = "secretpassword"
        hashed = get_password_hash(password)
        mock_user = User(
            id=uuid.uuid4(),
            username="inactive_user",
            hashed_password=hashed,
            role=UserRole.EDITOR,
            is_active=False,  # Inactive
        )

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        user = await AuthService.authenticate_user(mock_db, "inactive_user", password)
        assert user is None

    @pytest.mark.asyncio
    async def test_authenticate_user_not_found(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        user = await AuthService.authenticate_user(mock_db, "nonexistent", "any_password")
        assert user is None

    def test_create_user_token(self):
        user = User(
            id=uuid.uuid4(),
            username="alice",
            hashed_password="...",
            role=UserRole.ADMIN,
            is_active=True,
        )
        token_obj = AuthService.create_user_token(user)
        assert token_obj.token_type == "bearer"
        assert token_obj.username == "alice"
        assert token_obj.role == UserRole.ADMIN
        assert isinstance(token_obj.access_token, str)
        assert token_obj.expires_in > 0


# ── Auth Endpoints Tests ─────────────────────────────────────────────────────

@pytest.fixture
def mock_admin_user():
    from datetime import datetime, timezone
    return User(
        id=uuid.uuid4(),
        username="admin_user",
        hashed_password=get_password_hash("adminpass123"),
        role=UserRole.ADMIN,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def mock_editor_user():
    from datetime import datetime, timezone
    return User(
        id=uuid.uuid4(),
        username="editor_user",
        hashed_password=get_password_hash("editorpass123"),
        role=UserRole.EDITOR,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


class TestAuthEndpoints:
    @pytest.mark.asyncio
    async def test_json_login_success(self, client: AsyncClient, mock_admin_user: User):
        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_admin_user
            mock_db.execute.return_value = mock_result
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"username": "admin_user", "password": "adminpass123"},
            )
            assert resp.status_code == status.HTTP_200_OK
            data = resp.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"
            assert data["username"] == "admin_user"
            assert data["role"] == "admin"
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_json_login_failure(self, client: AsyncClient, mock_admin_user: User):
        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_admin_user
            mock_db.execute.return_value = mock_result
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"username": "admin_user", "password": "wrongpassword"},
            )
            assert resp.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Incorrect username or password" in resp.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_oauth2_form_token_login(self, client: AsyncClient, mock_editor_user: User):
        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_editor_user
            mock_db.execute.return_value = mock_result
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = await client.post(
                "/api/v1/auth/token",
                data={"username": "editor_user", "password": "editorpass123"},
            )
            assert resp.status_code == status.HTTP_200_OK
            data = resp.json()
            assert "access_token" in data
            assert data["role"] == "editor"
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_current_user_me(self, client: AsyncClient, mock_admin_user: User):
        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_admin_user
            mock_db.execute.return_value = mock_result
            yield mock_db

        token = create_access_token(subject=mock_admin_user.username)
        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == status.HTTP_200_OK
            data = resp.json()
            assert data["username"] == mock_admin_user.username
            assert data["role"] == "admin"
            assert data["is_active"] is True
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        # No Authorization header
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

        # Invalid token
        resp2 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer not_a_valid_jwt"},
        )
        assert resp2.status_code == status.HTTP_401_UNAUTHORIZED


# ── Role Enforcement Tests ────────────────────────────────────────────────────

# Create temporary test router to verify role dependency guards
role_test_router = APIRouter(prefix="/test-roles")


@role_test_router.get("/admin-only")
async def admin_only_endpoint(user: User = Depends(require_admin)):
    return {"message": f"Welcome Admin {user.username}"}


@role_test_router.get("/editor-allowed")
async def editor_allowed_endpoint(user: User = Depends(require_editor)):
    return {"message": f"Welcome {user.role.value} {user.username}"}


app.include_router(role_test_router)


class TestRoleEnforcement:
    @pytest.mark.asyncio
    async def test_admin_can_access_admin_endpoint(
        self, client: AsyncClient, mock_admin_user: User
    ):
        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_admin_user
            mock_db.execute.return_value = mock_result
            yield mock_db

        token = create_access_token(subject=mock_admin_user.username)
        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = await client.get(
                "/test-roles/admin-only",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == status.HTTP_200_OK
            assert "Welcome Admin admin_user" in resp.json()["message"]
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_editor_forbidden_from_admin_endpoint(
        self, client: AsyncClient, mock_editor_user: User
    ):
        """CRITICAL: Editor attempting admin action returns 403 Forbidden."""
        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_editor_user
            mock_db.execute.return_value = mock_result
            yield mock_db

        token = create_access_token(subject=mock_editor_user.username)
        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = await client.get(
                "/test-roles/admin-only",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == status.HTTP_403_FORBIDDEN
            assert "Operation not permitted" in resp.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_editor_can_access_editor_endpoint(
        self, client: AsyncClient, mock_editor_user: User
    ):
        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_editor_user
            mock_db.execute.return_value = mock_result
            yield mock_db

        token = create_access_token(subject=mock_editor_user.username)
        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = await client.get(
                "/test-roles/editor-allowed",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == status.HTTP_200_OK
            assert "Welcome editor editor_user" in resp.json()["message"]
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_admin_can_access_editor_endpoint(
        self, client: AsyncClient, mock_admin_user: User
    ):
        """Admin has superset of editor capabilities."""
        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_admin_user
            mock_db.execute.return_value = mock_result
            yield mock_db

        token = create_access_token(subject=mock_admin_user.username)
        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = await client.get(
                "/test-roles/editor-allowed",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == status.HTTP_200_OK
            assert "Welcome admin admin_user" in resp.json()["message"]
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_unauthenticated_blocked_with_401(self, client: AsyncClient):
        """Unauthenticated requests must receive 401."""
        resp = await client.get("/test-roles/admin-only")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
        resp2 = await client.get("/test-roles/editor-allowed")
        assert resp2.status_code == status.HTTP_401_UNAUTHORIZED
