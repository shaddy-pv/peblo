"""
Pytest configuration and shared fixtures.

Uses pytest-asyncio in "auto" mode so all async tests work without
per-test @pytest.mark.asyncio decorators.

Note on database availability:
  Tests that need a real database (integration tests) use the `db_session`
  fixture which connects to a test PostgreSQL instance. In local dev without
  Docker, these tests will be skipped unless INTEGRATION_TESTS=1 is set.
  CI always provides a PostgreSQL service container.
"""

import os
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app

# ── Async mode is configured via pyproject.toml ──────────────────────────────

# ── Integration test guard ────────────────────────────────────────────────────
INTEGRATION = os.getenv("INTEGRATION_TESTS", "0") == "1"

requires_db = pytest.mark.skipif(
    not INTEGRATION, reason="Requires running PostgreSQL (set INTEGRATION_TESTS=1)"
)


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """
    Session-scoped async engine pointing to the test database.
    Creates all tables before the session, drops after.
    Only used when INTEGRATION_TESTS=1.
    """
    from sqlalchemy.ext.asyncio import create_async_engine

    from app.db.session import Base

    test_db_url = settings.DATABASE_URL.replace("/peblo_tv", "/peblo_tv_test")
    engine = create_async_engine(test_db_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    """Per-test session — rolls back after each test."""
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        autoflush=False,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    AsyncClient for testing FastAPI endpoints without a database.
    DB calls inside the app will fail gracefully (health shows 'degraded').
    For DB-dependent tests, use `integration_client` with db_session override.
    """
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def integration_client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """
    AsyncClient wired to the test database session.
    Only usable with @requires_db decorator.
    """
    from app.api.deps import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
