"""
Catalogue Reader & Search Service.
Serves the pre-published live catalogue from storage/disk to the Viewer application
and provides fast, composable search (title, synopsis, category, episode title, language, section).
"""

import json
import uuid
from pathlib import Path

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.catalogue import (
    CatalogueData,
    CatalogueSearchResponse,
    CatalogueShow,
)


class CatalogueService:
    _cached_catalogue: CatalogueData | None = None
    _cached_raw_json: str | None = None
    _cached_mtime: float = 0.0

    @classmethod
    def get_catalogue_file_path(cls) -> Path:
        """Resolve absolute path to live catalogue.json file."""
        return Path(settings.CATALOGUE_DIR).resolve() / "catalogue.json"

    @classmethod
    def is_catalogue_published(cls) -> bool:
        """Check if live catalogue.json file currently exists on disk."""
        return cls.get_catalogue_file_path().is_file()

    @classmethod
    def clear_cache(cls) -> None:
        """Invalidate the in-memory cached catalogue (useful after new publish or in tests)."""
        cls._cached_catalogue = None
        cls._cached_raw_json = None
        cls._cached_mtime = 0.0

    @classmethod
    def load_catalogue(cls, force_reload: bool = False) -> CatalogueData:
        """
        Load and return the live CatalogueData.
        Uses mtime-based in-memory caching to achieve sub-millisecond response
        times without re-parsing JSON on every reader request.
        Raises 404 HTTPException if the catalogue has not been published yet.
        """
        catalogue_path = cls.get_catalogue_file_path()
        if not catalogue_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Catalogue has not been published yet. Please run publish from CMS first.",
            )

        try:
            mtime = catalogue_path.stat().st_mtime
            if not force_reload and cls._cached_catalogue is not None and mtime == cls._cached_mtime:
                return cls._cached_catalogue

            with open(catalogue_path, "r", encoding="utf-8") as f:
                raw_json = f.read()

            data = json.loads(raw_json)
            catalogue = CatalogueData.model_validate(data)

            # Update cache
            cls._cached_catalogue = catalogue
            cls._cached_raw_json = raw_json
            cls._cached_mtime = mtime

            return catalogue

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to read published catalogue: {str(e)}",
            )

    @classmethod
    def get_raw_catalogue_json(cls) -> str:
        """
        Return the raw JSON string of the published catalogue for high-throughput streaming.
        Reloads automatically if file mtime changed.
        """
        # Ensure cache is fresh
        cls.load_catalogue()
        assert cls._cached_raw_json is not None
        return cls._cached_raw_json

    @classmethod
    def search_catalogue(
        cls,
        q: str | None = None,
        category: str | None = None,
        language: str | None = None,
        section: str | None = None,
    ) -> CatalogueSearchResponse:
        """
        Execute composable multi-criteria search over published catalogue:
        - q: matches show title, synopsis, category, episode title, trailer title, or content_group.
        - category: matches show.categories (case-insensitive).
        - language: matches language variants in any episode/trailer (e.g. 'en', 'hi').
        - section: matches show.section (e.g. 'featured', 'series', 'minisodes', 'songs').
        All active filters compose using logical AND.
        """
        if not cls.is_catalogue_published():
            return CatalogueSearchResponse(
                query=q,
                category=category,
                language=language,
                section=section,
                total_results=0,
                results=[],
            )

        catalogue = cls.load_catalogue()

        # Gather all unique published shows across sections
        seen_show_ids: set[uuid.UUID] = set()
        all_shows: list[CatalogueShow] = []
        for sec_name, shows in catalogue.sections.items():
            for s in shows:
                if s.id not in seen_show_ids:
                    seen_show_ids.add(s.id)
                    all_shows.append(s)

        # Normalize query terms
        q_norm = q.strip().lower() if q and q.strip() else None
        cat_norm = category.strip().lower() if category and category.strip() else None
        lang_norm = language.strip().lower() if language and language.strip() else None
        sec_norm = section.strip().lower() if section and section.strip() else None

        filtered_shows: list[CatalogueShow] = []

        for show in all_shows:
            # 1. Section filter
            if sec_norm and show.section.lower() != sec_norm:
                continue

            # 2. Category filter
            if cat_norm:
                show_categories_lower = [c.lower() for c in show.categories]
                if cat_norm not in show_categories_lower:
                    continue

            # 3. Language filter (matches if any episode or trailer provides this audio variant)
            if lang_norm:
                has_language = False
                for season in show.seasons:
                    for ep in season.episodes:
                        for var in ep.languages:
                            if var.language.lower() == lang_norm:
                                has_language = True
                                break
                        if has_language:
                            break
                    if has_language:
                        break

                if not has_language:
                    for trailer in show.trailers:
                        for var in trailer.languages:
                            if var.language.lower() == lang_norm:
                                has_language = True
                                break
                        if has_language:
                            break

                if not has_language:
                    continue

            # 4. Search query 'q' (matches show title, synopsis, category, episode title, trailer title)
            if q_norm:
                # 4a. Show title
                title_match = q_norm in show.title.lower()

                # 4b. Show synopsis
                synopsis_match = bool(show.synopsis and q_norm in show.synopsis.lower())

                # 4c. Categories
                category_match = any(q_norm in c.lower() for c in show.categories)

                # 4d. Episode titles & content_groups
                episode_match = False
                for season in show.seasons:
                    for ep in season.episodes:
                        if q_norm in ep.title.lower():
                            episode_match = True
                            break
                        if any(q_norm in var.title.lower() for var in ep.languages):
                            episode_match = True
                            break
                        if ep.content_group and q_norm in ep.content_group.lower():
                            episode_match = True
                            break
                    if episode_match:
                        break

                # 4e. Trailer titles & content_groups
                trailer_match = False
                if not episode_match:
                    for tr in show.trailers:
                        if q_norm in tr.title.lower():
                            trailer_match = True
                            break
                        if any(q_norm in var.title.lower() for var in tr.languages):
                            trailer_match = True
                            break
                        if tr.content_group and q_norm in tr.content_group.lower():
                            trailer_match = True
                            break

                if not (title_match or synopsis_match or category_match or episode_match or trailer_match):
                    continue

            filtered_shows.append(show)

        return CatalogueSearchResponse(
            query=q,
            category=category,
            language=language,
            section=section,
            total_results=len(filtered_shows),
            results=filtered_shows,
        )

    @classmethod
    def get_show_by_slug_or_id(cls, slug_or_id: str) -> CatalogueShow:
        """
        Fetch a single published show by its UUID or unique slug.
        Returns directly from the published catalogue without touching the primary database.
        """
        catalogue = cls.load_catalogue()
        lookup = slug_or_id.strip().lower()

        for shows in catalogue.sections.values():
            for show in shows:
                if str(show.id).lower() == lookup or show.slug.lower() == lookup:
                    return show

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Show '{slug_or_id}' was not found in the published catalogue.",
        )

    @classmethod
    def get_sections_summary(cls) -> dict[str, int]:
        """Return published section names with their show counts."""
        if not cls.is_catalogue_published():
            return {}
        catalogue = cls.load_catalogue()
        return {sec: len(shows) for sec, shows in catalogue.sections.items()}
