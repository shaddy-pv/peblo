"""
Validation Engine service.
Performs comprehensive health checks across all shows, seasons, episodes, and artwork.
Generates an actionable Publish-Readiness report distinguishing blockers from warnings.
"""

from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.artwork import Artwork
from app.models.enums import (
    ArtworkEntityType,
    ArtworkType,
    EpisodeStatus,
    ShowStatus,
)
from app.models.episode import Episode
from app.models.season import Season
from app.models.show import Show
from app.schemas.validation import (
    IssueCategory,
    ValidationIssue,
    ValidationReport,
    ValidationSeverity,
    ValidationSummary,
)


class ValidationEngine:
    @staticmethod
    async def generate_report(db: AsyncSession) -> ValidationReport:
        """
        Execute full scan of catalogue database and generate Publish-Readiness report.
        """
        # Load all shows with seasons, episodes, and artwork
        stmt = (
            select(Show)
            .options(
                selectinload(Show.seasons).selectinload(Season.episodes),
            )
            .order_by(Show.title.asc())
        )
        shows_result = await db.execute(stmt)
        shows = shows_result.scalars().all()

        # Load all artwork records indexed by (entity_type, entity_id)
        art_stmt = select(Artwork)
        art_result = await db.execute(art_stmt)
        artworks = art_result.scalars().all()

        artwork_map: dict[tuple[ArtworkEntityType, str], set[ArtworkType]] = defaultdict(set)
        for art in artworks:
            artwork_map[(art.entity_type, str(art.entity_id))].add(art.artwork_type)

        blockers: list[ValidationIssue] = []
        warnings: list[ValidationIssue] = []

        total_shows = len(shows)
        published_shows = 0
        draft_shows = 0
        total_episodes = 0
        published_episodes = 0
        draft_episodes = 0

        # Group all episodes across the DB by content_group to check localization pairings
        all_episodes_by_cg: dict[str, list[Episode]] = defaultdict(list)

        for show in shows:
            if show.status == ShowStatus.PUBLISHED:
                published_shows += 1
            else:
                draft_shows += 1

            show_art = artwork_map.get((ArtworkEntityType.SHOW, str(show.id)), set())
            show_episodes: list[Episode] = []

            # ── Check Show-Level Rules ────────────────────────────────────────

            # Rule P1: Published show MUST have a section
            if not show.section:
                severity = (
                    ValidationSeverity.BLOCKER
                    if show.status == ShowStatus.PUBLISHED
                    else ValidationSeverity.WARNING
                )
                issue = ValidationIssue(
                    id=f"show-missing-section-{show.slug}",
                    severity=severity,
                    category=IssueCategory.MISSING_SECTION,
                    entity_type="show",
                    entity_id=show.id,
                    show_id=show.id,
                    show_title=show.title,
                    message=f"Show '{show.title}' has no section assigned.",
                    action_needed="Edit this show in CMS and assign an allowed section: featured, series, minisodes, or songs.",
                )
                if severity == ValidationSeverity.BLOCKER:
                    blockers.append(issue)
                else:
                    warnings.append(issue)

            # Rule: Published show should have a poster
            if show.status == ShowStatus.PUBLISHED and ArtworkType.POSTER not in show_art:
                blockers.append(
                    ValidationIssue(
                        id=f"show-missing-poster-{show.slug}",
                        severity=ValidationSeverity.BLOCKER,
                        category=IssueCategory.MISSING_ARTWORK,
                        entity_type="show",
                        entity_id=show.id,
                        show_id=show.id,
                        show_title=show.title,
                        message=f"Published show '{show.title}' is missing a poster (2:3 ~600×900).",
                        action_needed="Upload a poster in the show's artwork slots.",
                    )
                )

            # Rule: Banner recommendation
            if show.status == ShowStatus.PUBLISHED and ArtworkType.BANNER not in show_art:
                warnings.append(
                    ValidationIssue(
                        id=f"show-missing-banner-{show.slug}",
                        severity=ValidationSeverity.WARNING,
                        category=IssueCategory.MISSING_ARTWORK,
                        entity_type="show",
                        entity_id=show.id,
                        show_title=show.title,
                        show_id=show.id,
                        message=f"Show '{show.title}' has no hero banner (16:9 ~1280×720).",
                        action_needed="Upload a banner so this show can be featured prominently in viewer UI.",
                    )
                )

            # ── Process Seasons & Episodes ────────────────────────────────────
            for season in show.seasons:
                for ep in season.episodes:
                    total_episodes += 1
                    show_episodes.append(ep)
                    all_episodes_by_cg[ep.content_group].append(ep)

                    if ep.status == EpisodeStatus.PUBLISHED:
                        published_episodes += 1
                    else:
                        draft_episodes += 1

                    ep_art = artwork_map.get((ArtworkEntityType.EPISODE, str(ep.id)), set())

                    # Check Episode Rules
                    if ep.status == EpisodeStatus.PUBLISHED:
                        # Rule P2: Episode cannot be published without artwork
                        if not ep_art:
                            blockers.append(
                                ValidationIssue(
                                    id=f"ep-missing-art-{ep.id}",
                                    severity=ValidationSeverity.BLOCKER,
                                    category=IssueCategory.MISSING_ARTWORK,
                                    entity_type="episode",
                                    entity_id=ep.id,
                                    show_id=show.id,
                                    show_title=show.title,
                                    season_number=season.season_number,
                                    episode_id=ep.id,
                                    episode_title=ep.title,
                                    message=f"Published episode '{ep.title}' (S{season.season_number}E{ep.episode_number}) has no thumbnail artwork.",
                                    action_needed="Upload a 16:9 thumbnail (~640×360, max 200KB) for this episode.",
                                )
                            )

                        # Rule: Episode cannot be published without duration
                        if not ep.duration_seconds or ep.duration_seconds <= 0:
                            blockers.append(
                                ValidationIssue(
                                    id=f"ep-missing-duration-{ep.id}",
                                    severity=ValidationSeverity.BLOCKER,
                                    category=IssueCategory.MISSING_DURATION,
                                    entity_type="episode",
                                    entity_id=ep.id,
                                    show_id=show.id,
                                    show_title=show.title,
                                    season_number=season.season_number,
                                    episode_id=ep.id,
                                    episode_title=ep.title,
                                    message=f"Published episode '{ep.title}' has no duration set.",
                                    action_needed="Edit the episode and enter the runtime in seconds.",
                                )
                            )

                    # Data Quality Check: Title Casing (P4/P5)
                    title = ep.title.strip()
                    if len(title) > 3:
                        if title.isupper():
                            warnings.append(
                                ValidationIssue(
                                    id=f"ep-casing-upper-{ep.id}",
                                    severity=ValidationSeverity.WARNING,
                                    category=IssueCategory.TITLE_CASING,
                                    entity_type="episode",
                                    entity_id=ep.id,
                                    show_id=show.id,
                                    show_title=show.title,
                                    season_number=season.season_number,
                                    episode_id=ep.id,
                                    episode_title=ep.title,
                                    message=f"Episode title '{title}' is in ALL CAPS.",
                                    action_needed=f"Change title to standard case (e.g. '{title.title()}').",
                                )
                            )
                        elif title.islower():
                            warnings.append(
                                ValidationIssue(
                                    id=f"ep-casing-lower-{ep.id}",
                                    severity=ValidationSeverity.WARNING,
                                    category=IssueCategory.TITLE_CASING,
                                    entity_type="episode",
                                    entity_id=ep.id,
                                    show_id=show.id,
                                    show_title=show.title,
                                    season_number=season.season_number,
                                    episode_id=ep.id,
                                    episode_title=ep.title,
                                    message=f"Episode title '{title}' is in all lowercase.",
                                    action_needed=f"Change title to standard case (e.g. '{title.title()}').",
                                )
                            )

            # Rule: Published show must have at least one episode
            if show.status == ShowStatus.PUBLISHED and len(show_episodes) == 0:
                blockers.append(
                    ValidationIssue(
                        id=f"show-no-episodes-{show.slug}",
                        severity=ValidationSeverity.BLOCKER,
                        category=IssueCategory.NO_EPISODES,
                        entity_type="show",
                        entity_id=show.id,
                        show_id=show.id,
                        show_title=show.title,
                        message=f"Published show '{show.title}' has no episodes.",
                        action_needed="Add at least one season and episode before publishing.",
                    )
                )

        # ── Check Content Group Localization Pairings (P6) ───────────────────
        for cg, variants in all_episodes_by_cg.items():
            langs = {v.language.lower() for v in variants}
            if len(langs) == 1 and {"en", "hi"}.issubset({"en", "hi"}):
                existing_lang = next(iter(langs))
                missing_lang = "Hindi (hi)" if existing_lang == "en" else "English (en)"
                first_ep = variants[0]
                warnings.append(
                    ValidationIssue(
                        id=f"cg-incomplete-loc-{cg}",
                        severity=ValidationSeverity.WARNING,
                        category=IssueCategory.INCOMPLETE_LOCALIZATION,
                        entity_type="episode",
                        entity_id=first_ep.id,
                        episode_id=first_ep.id,
                        episode_title=first_ep.title,
                        message=f"Content group '{cg}' only has a '{existing_lang}' variant. Missing {missing_lang} counterpart.",
                        action_needed=f"Upload the {missing_lang} version of this episode to provide bilingual streaming.",
                    )
                )

        # ── Group Issues by Show Title ────────────────────────────────────────
        grouped_by_show: dict[str, list[ValidationIssue]] = defaultdict(list)
        for issue in blockers + warnings:
            key = issue.show_title or "General System"
            grouped_by_show[key].append(issue)

        can_publish = len(blockers) == 0

        summary = ValidationSummary(
            total_shows=total_shows,
            published_shows=published_shows,
            draft_shows=draft_shows,
            total_episodes=total_episodes,
            published_episodes=published_episodes,
            draft_episodes=draft_episodes,
            blockers_count=len(blockers),
            warnings_count=len(warnings),
        )

        return ValidationReport(
            generated_at=datetime.now(timezone.utc),
            can_publish=can_publish,
            summary=summary,
            blockers=blockers,
            warnings=warnings,
            grouped_by_show=dict(grouped_by_show),
        )
