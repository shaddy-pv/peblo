import time

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine

router = APIRouter()


@router.get("/health", tags=["ops"])
async def health_check():
    """
    Health endpoint for load balancers, Docker healthchecks, and monitoring.

    Returns:
      - service name and version
      - database connectivity status
      - uptime-style check

    This is the primary alert surface: if this endpoint fails, the API is down.
    Alert recommendation: alert if /health returns non-200 for > 30s.
    """
    db_status = "ok"
    db_latency_ms: float | None = None

    try:
        t0 = time.monotonic()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_latency_ms = round((time.monotonic() - t0) * 1000, 2)
    except Exception as exc:
        db_status = f"error: {type(exc).__name__}"

    overall = "ok" if db_status == "ok" else "degraded"

    return {
        "status": overall,
        "service": "peblo-api",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "checks": {
            "database": {
                "status": db_status,
                "latency_ms": db_latency_ms,
            }
        },
    }
