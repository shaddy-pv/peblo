"""
Peblo TV API — FastAPI application entry point.

Architecture:
  app/
    api/v1/       — route handlers (thin controllers, no business logic)
    core/         — configuration, security utilities
    db/           — SQLAlchemy engine, session, Base
    models/       — SQLAlchemy ORM models        (Phase 2+)
    schemas/      — Pydantic request/response     (Phase 4+)
    services/     — Business logic layer          (Phase 4+)
    storage/      — Storage abstraction + providers (Phase 5+)
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Sets up required directories on startup.
    """
    # Ensure local storage directory exists
    Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    # Ensure catalogue directory exists
    Path(settings.CATALOGUE_DIR).mkdir(parents=True, exist_ok=True)

    logger.info(
        "Peblo TV API starting",
        extra={
            "environment": settings.ENVIRONMENT,
            "storage_backend": settings.STORAGE_BACKEND,
        },
    )
    yield
    logger.info("Peblo TV API shutting down")


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── API routes ───────────────────────────────────────────────────────────
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # ── Local storage static files ────────────────────────────────────────────
    # In production, artwork is served from Cloudflare R2 directly.
    # In local dev, FastAPI serves uploaded files from the ./storage directory.
    if settings.STORAGE_BACKEND == "local":
        storage_path = Path(settings.LOCAL_STORAGE_PATH)
        storage_path.mkdir(parents=True, exist_ok=True)
        app.mount(
            "/storage",
            StaticFiles(directory=str(storage_path)),
            name="storage",
        )

    return app


app = create_application()
