"""
Admin & CMS operations endpoints.
Provides validation reports and administrative publishing tools.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin, require_editor
from app.models.user import User
from app.schemas.publish import PublishResponse, PublishRunRead
from app.schemas.validation import ValidationReport
from app.services.publish_service import PublishService
from app.services.validation_engine import ValidationEngine

router = APIRouter()


@router.get(
    "/validation-report",
    response_model=ValidationReport,
    summary="Publish-Readiness Validation Report",
    description=(
        "Returns everything currently blocking or warning against catalogue publication. "
        "Categorized by severity (blockers vs warnings) and grouped by show with actionable "
        "steps so an editor can fix issues directly without asking an engineer."
    ),
)
async def get_validation_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> ValidationReport:
    """Generate and return the current catalogue publish readiness report."""
    return await ValidationEngine.generate_report(db)


@router.post(
    "/catalog/publish",
    response_model=PublishResponse,
    summary="Atomically Publish Catalogue",
    description=(
        "Executes the atomic publishing pipeline: validates entire DB for blockers, "
        "builds denormalized catalogue JSON, writes to temp file with integrity validation, "
        "replaces live catalogue atomically at the OS level, uploads to storage, and records "
        "an audit run. Restricted to ADMIN role only."
    ),
)
async def publish_catalog(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> PublishResponse:
    """Atomically publish catalogue to live storage (Admin only)."""
    run = await PublishService.publish_catalogue(db, actor=current_user)
    return PublishResponse(
        run_id=run.id,
        outcome=run.outcome,
        started_at=run.started_at,
        completed_at=run.completed_at,
        shows_count=run.shows_count,
        episodes_count=run.episodes_count,
        language_variants_count=run.language_variants_count,
        catalogue_path=run.catalogue_path,
        message="Catalogue published successfully.",
    )


@router.get(
    "/catalog/publish/runs",
    response_model=list[PublishRunRead],
    summary="List Publish Runs History",
    description=(
        "Returns chronological audit history of past catalogue publication attempts, "
        "including actor, timestamp, outcome, show/episode counts, and failure errors."
    ),
)
async def list_publish_runs(
    limit: int = Query(default=20, ge=1, le=100, description="Max runs to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
) -> list[PublishRunRead]:
    """Retrieve publish run audit logs."""
    runs = await PublishService.list_publish_runs(db, limit=limit)
    return [PublishRunRead.model_validate(r) for r in runs]
