from fastapi import APIRouter

from app.api.v1.endpoints import auth, health

api_router = APIRouter()

# ── Ops / Infrastructure ─────────────────────────────────────────────────────
api_router.include_router(health.router, prefix="")

# ── Auth & Identity ──────────────────────────────────────────────────────────
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
# api_router.include_router(shows.router,    prefix="/shows",   tags=["shows"])
# api_router.include_router(seasons.router,  prefix="/seasons", tags=["seasons"])
# api_router.include_router(episodes.router, prefix="/episodes",tags=["episodes"])
# api_router.include_router(artwork.router,  prefix="/artwork", tags=["artwork"])
# api_router.include_router(catalog.router,  prefix="/catalog", tags=["catalog"])
# api_router.include_router(admin.router,    prefix="/admin",   tags=["admin"])
