"""
Atomic Publishing Service.
Implements pre-publish validation gates, write-then-atomic-rename temp file pattern,
audit logging with PublishRun, and Cloudflare R2 / local storage synchronization.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import PublishOutcome
from app.models.publish_run import PublishRun
from app.models.user import User
from app.services.catalogue_builder import CatalogueBuilder
from app.services.validation_engine import ValidationEngine
from app.storage import get_storage


class PublishService:
    @staticmethod
    async def publish_catalogue(db: AsyncSession, actor: User) -> PublishRun:
        """
        Execute atomic catalogue publication.
        1. Validates entire database (rejects if any blockers exist).
        2. Builds denormalized catalogue data structure.
        3. Writes to unique temp file and validates JSON integrity.
        4. Performs atomic OS-level replace (reader never sees partial file).
        5. Synchronizes to storage provider.
        6. Records complete audit log with run outcome and counts.
        """
        now = datetime.now(timezone.utc)

        # ── Step 1: Pre-publish Validation Gate ───────────────────────────────
        report = await ValidationEngine.generate_report(db)
        if not report.can_publish:
            error_summary = (
                f"Publish blocked by {len(report.blockers)} validation error(s): "
                + "; ".join(b.message for b in report.blockers[:3])
            )
            # Record failed run in audit log for accountability
            failed_run = PublishRun(
                started_at=now,
                completed_at=datetime.now(timezone.utc),
                actor_id=actor.id,
                actor_username=actor.username,
                outcome=PublishOutcome.FAILED,
                error_message=error_summary,
            )
            db.add(failed_run)
            await db.commit()
            await db.refresh(failed_run)

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Cannot publish catalogue: blocking validation errors exist.",
                    "blockers_count": len(report.blockers),
                    "blockers": [b.model_dump(mode="json") for b in report.blockers],
                },
            )

        # ── Step 2: Build Catalogue Model ─────────────────────────────────────
        catalogue = await CatalogueBuilder.build_catalogue(
            db, published_by=actor.username
        )
        json_content = CatalogueBuilder.to_json(catalogue)
        json_bytes = json_content.encode("utf-8")

        # ── Step 3: Record RUNNING Audit State ─────────────────────────────────
        run = PublishRun(
            started_at=now,
            actor_id=actor.id,
            actor_username=actor.username,
            outcome=PublishOutcome.RUNNING,
            shows_count=catalogue.stats.shows_count,
            episodes_count=catalogue.stats.episodes_count,
            language_variants_count=catalogue.stats.language_variants_count,
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)

        # ── Step 4: Atomic Write Pattern ──────────────────────────────────────
        catalogue_dir = Path(settings.CATALOGUE_DIR).resolve()
        catalogue_dir.mkdir(parents=True, exist_ok=True)

        temp_filename = f"catalogue_tmp_{uuid.uuid4().hex}.json"
        temp_path = catalogue_dir / temp_filename
        live_path = catalogue_dir / "catalogue.json"

        try:
            # 4a. Write to temporary file
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(json_content)
                f.flush()
                os.fsync(f.fileno())

            # 4b. Integrity check: ensure temp file is completely written and parseable
            with open(temp_path, "r", encoding="utf-8") as f:
                json.load(f)

            # 4c. Atomic rename/replace (atomic on both Windows and POSIX filesystems)
            temp_path.replace(live_path)

            # 4d. Synchronize to storage provider
            storage = get_storage()
            await storage.upload(
                key="catalogue.json",
                data=json_bytes,
                content_type="application/json",
            )

            # ── Step 5: Mark PublishRun as SUCCESS ────────────────────────────
            run.outcome = PublishOutcome.SUCCESS
            run.completed_at = datetime.now(timezone.utc)
            run.catalogue_path = str(live_path)
            await db.commit()
            await db.refresh(run)
            return run

        except Exception as e:
            # Clean up orphaned temporary file on failure
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass

            # Mark audit record as FAILED
            run.outcome = PublishOutcome.FAILED
            run.error_message = f"File publish failed: {str(e)}"
            run.completed_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(run)

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to publish catalogue atomically: {str(e)}",
            )

    @staticmethod
    async def list_publish_runs(
        db: AsyncSession, limit: int = 20
    ) -> list[PublishRun]:
        """Fetch audit log of recent publish runs ordered by started_at desc."""
        stmt = (
            select(PublishRun)
            .order_by(PublishRun.started_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
