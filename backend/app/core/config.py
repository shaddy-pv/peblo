from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    All values can be overridden via .env file or real env vars.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Peblo TV API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = (
        "postgresql+asyncpg://peblo:peblo_secret@localhost:5432/peblo_tv"
    )

    # ── Auth ─────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "changeme_for_development_only"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # ── Storage ──────────────────────────────────────────────────────────────
    STORAGE_BACKEND: str = "local"  # "local" | "r2"
    LOCAL_STORAGE_PATH: str = "./storage"
    LOCAL_STORAGE_BASE_URL: str = "http://localhost:8000/storage"

    # Cloudflare R2 (only needed when STORAGE_BACKEND=r2)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_PUBLIC_URL: str = ""

    # ── Catalogue ────────────────────────────────────────────────────────────
    CATALOGUE_DIR: str = "./catalogue"

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


# Module-level singleton — import this everywhere
settings = Settings()
