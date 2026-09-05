"""
Admin & CMS operations endpoints.
Provides validation reports and administrative publishing tools.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_editor
from app.models.user import User
from app.schemas.validation import ValidationReport
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
