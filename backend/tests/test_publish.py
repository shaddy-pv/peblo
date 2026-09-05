"""
Unit and API integration tests for Phase 8: Atomic Publishing Pipeline.
Verifies:
1. Validation gate enforcement (publish blocked if any blockers exist, records FAILED run).
2. Atomic write-then-rename temp file pattern (reader never sees partial file).
3. No orphaned temp files on success or failure.
4. Complete audit log with PublishRun tracking (actor, timestamps, counts, outcome).
5. Strict role enforcement:
   - POST /admin/catalog/publish -> Admin only (403 for Editor, 401 for anonymous).
   - GET /admin/catalog/publish/runs -> Editor & Admin permitted.
"""

import json
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from app.api.deps import get_db
from app.core.security import create_access_token
from app.main import app
from app.models.enums import PublishOutcome, UserRole
from app.models.publish_run import PublishRun
from app.models.user import User
from app.schemas.catalogue import CatalogueData, CatalogueStats
from app.schemas.validation import (
    IssueCategory,
    ValidationIssue,
    ValidationReport,
    ValidationSeverity,
    ValidationSummary,
)
from app.services.publish_service import PublishService


@pytest.fixture
def admin_user():
    return User(
        id=uuid.uuid4(),
        username="lead_admin",
        hashed_password="...",
        role=UserRole.ADMIN,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def editor_user():
    return User(
        id=uuid.uuid4(),
        username="staff_editor",
        hashed_password="...",
        role=UserRole.EDITOR,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def admin_token(admin_user):
    return create_access_token(subject=admin_user.username)


@pytest.fixture
def editor_token(editor_user):
    return create_access_token(subject=editor_user.username)


@pytest.fixture
def sample_catalogue_data():
    return CatalogueData(
        version="1.0",
        generated_at=datetime.now(timezone.utc),
        published_by="lead_admin",
        sections={"featured": []},
        stats=CatalogueStats(
            shows_count=3,
            episodes_count=12,
            language_variants_count=24,
        ),
    )


class TestPublishServiceUnit:
    @pytest.mark.asyncio
    async def test_publish_blocked_when_validation_fails(self, admin_user):
        """If validation engine finds blockers, publish aborts immediately with 400 and records failed run."""
        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        blocker_issue = ValidationIssue(
            id="test-blocker-1",
            severity=ValidationSeverity.BLOCKER,
            category=IssueCategory.MISSING_SECTION,
            entity_type="show",
            entity_id=uuid.uuid4(),
            entity_title="Rhyme Rangers",
            message="Published show must have a section assigned.",
            action_needed="Assign section to Rhyme Rangers.",
        )
        failing_report = ValidationReport(
            generated_at=datetime.now(timezone.utc),
            can_publish=False,
            summary=ValidationSummary(blockers_count=1),
            blockers=[blocker_issue],
            warnings=[],
        )

        with patch("app.services.validation_engine.ValidationEngine.generate_report", return_value=failing_report):
            with pytest.raises(HTTPException) as exc_info:
                await PublishService.publish_catalogue(mock_db, actor=admin_user)

            assert exc_info.value.status_code == 400
            assert "Cannot publish catalogue" in exc_info.value.detail["message"]
            assert exc_info.value.detail["blockers_count"] == 1

            # Verify audit run recorded as FAILED
            mock_db.add.assert_called_once()
            added_run = mock_db.add.call_args[0][0]
            assert isinstance(added_run, PublishRun)
            assert added_run.outcome == PublishOutcome.FAILED
            assert added_run.actor_id == admin_user.id
            assert "Publish blocked by 1 validation error" in added_run.error_message

    @pytest.mark.asyncio
    async def test_publish_success_atomic_write_and_cleanup(
        self, admin_user, sample_catalogue_data, tmp_path
    ):
        """
        On successful validation:
        1. Atomic rename produces live catalogue.json.
        2. No leftover catalogue_tmp_*.json files remain.
        3. Catalogue content is valid JSON.
        4. Audit record updated to SUCCESS.
        """
        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        clean_report = ValidationReport(
            generated_at=datetime.now(timezone.utc),
            can_publish=True,
            summary=ValidationSummary(blockers_count=0),
            blockers=[],
            warnings=[],
        )

        temp_catalogue_dir = tmp_path / "catalogue_out"
        temp_catalogue_dir.mkdir(parents=True, exist_ok=True)

        with patch("app.services.validation_engine.ValidationEngine.generate_report", return_value=clean_report), \
             patch("app.services.catalogue_builder.CatalogueBuilder.build_catalogue", return_value=sample_catalogue_data), \
             patch("app.core.config.settings.CATALOGUE_DIR", str(temp_catalogue_dir)):

            run = await PublishService.publish_catalogue(mock_db, actor=admin_user)

            assert run.outcome == PublishOutcome.SUCCESS
            assert run.shows_count == 3
            assert run.episodes_count == 12
            assert run.language_variants_count == 24
            assert run.completed_at is not None

            # Verify live file exists
            live_file = temp_catalogue_dir / "catalogue.json"
            assert live_file.exists()

            # Verify content integrity
            with open(live_file, "r", encoding="utf-8") as f:
                saved_json = json.load(f)
            assert saved_json["version"] == "1.0"
            assert saved_json["stats"]["shows_count"] == 3
            assert saved_json["published_by"] == "lead_admin"

            # Verify NO temporary files left in directory
            tmp_files = list(temp_catalogue_dir.glob("catalogue_tmp_*.json"))
            assert len(tmp_files) == 0

    @pytest.mark.asyncio
    async def test_publish_cleans_up_temp_file_on_failure(
        self, admin_user, sample_catalogue_data, tmp_path
    ):
        """If storage upload throws an exception, temporary file is cleaned up and run recorded as FAILED."""
        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        clean_report = ValidationReport(
            generated_at=datetime.now(timezone.utc),
            can_publish=True,
            summary=ValidationSummary(blockers_count=0),
            blockers=[],
            warnings=[],
        )
        temp_catalogue_dir = tmp_path / "catalogue_fail"
        temp_catalogue_dir.mkdir(parents=True, exist_ok=True)

        mock_storage = AsyncMock()
        mock_storage.upload.side_effect = IOError("Simulated disk/network error")

        with patch("app.services.validation_engine.ValidationEngine.generate_report", return_value=clean_report), \
             patch("app.services.catalogue_builder.CatalogueBuilder.build_catalogue", return_value=sample_catalogue_data), \
             patch("app.core.config.settings.CATALOGUE_DIR", str(temp_catalogue_dir)), \
             patch("app.services.publish_service.get_storage", return_value=mock_storage):

            with pytest.raises(HTTPException) as exc_info:
                await PublishService.publish_catalogue(mock_db, actor=admin_user)

            assert exc_info.value.status_code == 500
            assert "Failed to publish catalogue atomically" in exc_info.value.detail

            # Ensure no temporary file left behind
            tmp_files = list(temp_catalogue_dir.glob("catalogue_tmp_*.json"))
            assert len(tmp_files) == 0

    @pytest.mark.asyncio
    async def test_list_publish_runs(self):
        """Verify list_publish_runs executes select ordered by started_at desc."""
        mock_db = AsyncMock()
        r1 = PublishRun(
            id=uuid.uuid4(),
            started_at=datetime.now(timezone.utc),
            outcome=PublishOutcome.SUCCESS,
            shows_count=5,
        )
        r2 = PublishRun(
            id=uuid.uuid4(),
            started_at=datetime.now(timezone.utc),
            outcome=PublishOutcome.FAILED,
            error_message="Validation error",
        )
        exec_res = MagicMock()
        exec_res.scalars.return_value.all.return_value = [r1, r2]
        mock_db.execute.return_value = exec_res

        runs = await PublishService.list_publish_runs(mock_db, limit=10)
        assert len(runs) == 2
        assert runs[0].outcome == PublishOutcome.SUCCESS
        assert runs[1].outcome == PublishOutcome.FAILED


class TestPublishEndpoints:
    @pytest.mark.asyncio
    async def test_publish_unauthenticated_returns_401(self, client: AsyncClient):
        resp = await client.post("/api/v1/admin/catalog/publish")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_publish_forbidden_for_editor(
        self, client: AsyncClient, editor_user: User, editor_token: str
    ):
        """CRITICAL: Editor attempting to publish MUST receive 403 Forbidden."""
        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = editor_user
            mock_db.execute.return_value = mock_result
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db
        try:
            resp = await client.post(
                "/api/v1/admin/catalog/publish",
                headers={"Authorization": f"Bearer {editor_token}"},
            )
            assert resp.status_code == 403
            assert "admin" in resp.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_publish_allowed_for_admin_success(
        self, client: AsyncClient, admin_user: User, admin_token: str, tmp_path
    ):
        """Admin can trigger publication and gets 200 with PublishResponse."""
        run_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        fake_run = PublishRun(
            id=run_id,
            started_at=now,
            completed_at=now,
            actor_id=admin_user.id,
            actor_username=admin_user.username,
            outcome=PublishOutcome.SUCCESS,
            shows_count=4,
            episodes_count=20,
            language_variants_count=35,
            catalogue_path=str(tmp_path / "catalogue.json"),
        )

        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = admin_user
            mock_db.execute.return_value = mock_result
            yield mock_db

        with patch("app.services.publish_service.PublishService.publish_catalogue", return_value=fake_run):
            app.dependency_overrides[get_db] = override_get_db
            try:
                resp = await client.post(
                    "/api/v1/admin/catalog/publish",
                    headers={"Authorization": f"Bearer {admin_token}"},
                )
                assert resp.status_code == 200
                data = resp.json()
                assert data["run_id"] == str(run_id)
                assert data["outcome"] == PublishOutcome.SUCCESS.value
                assert data["shows_count"] == 4
                assert data["episodes_count"] == 20
                assert data["message"] == "Catalogue published successfully."
            finally:
                app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_publish_runs_history_unauthenticated_returns_401(self, client: AsyncClient):
        resp = await client.get("/api/v1/admin/catalog/publish/runs")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_publish_runs_history_accessible_to_editor(
        self, client: AsyncClient, editor_user: User, editor_token: str
    ):
        """Editor CAN view publish run history (read-only audit)."""
        run_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        fake_run = PublishRun(
            id=run_id,
            started_at=now,
            completed_at=now,
            actor_id=editor_user.id,
            actor_username=editor_user.username,
            outcome=PublishOutcome.SUCCESS,
            shows_count=2,
            episodes_count=8,
            language_variants_count=16,
            catalogue_path="/path/to/catalogue.json",
        )

        async def override_get_db():
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = editor_user
            mock_db.execute.return_value = mock_result
            yield mock_db

        with patch("app.services.publish_service.PublishService.list_publish_runs", return_value=[fake_run]):
            app.dependency_overrides[get_db] = override_get_db
            try:
                resp = await client.get(
                    "/api/v1/admin/catalog/publish/runs",
                    headers={"Authorization": f"Bearer {editor_token}"},
                )
                assert resp.status_code == 200
                data = resp.json()
                assert isinstance(data, list)
                assert len(data) == 1
                assert data[0]["id"] == str(run_id)
                assert data[0]["outcome"] == PublishOutcome.SUCCESS.value
                assert data[0]["shows_count"] == 2
            finally:
                app.dependency_overrides.clear()
