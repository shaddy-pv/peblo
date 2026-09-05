"""
Catalogue Builder service.
Transforms PostgreSQL relational models into the published denormalized JSON catalogue.
Implements content_group collapsing, Season 0 trailers extraction, and deterministic ordering.
"""

from collections import defaultdict
from datetime import datetime, timezone
from typing import Sequence

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
from app.schemas.catalogue import (
    CatalogueArtwork,
    CatalogueData,
    CatalogueEpisode,
    CatalogueLanguageVariant,
    CatalogueSeason,
    CatalogueShow,
    CatalogueStats,
)

# Deterministic ordering of standard sections
DEFAULT_SECTION_ORDER = ["featured", "series", "minisodes", "songs"]


class CatalogueBuilder:
    @staticmethod
    async def build_catalogue(
        db: AsyncSession, published_by: str | None = None
    ) -> CatalogueData:
        """
        Build the complete published catalogue data model.
        Only includes PUBLISHED shows and PUBLISHED episodes.
        Collapses content_group variants and extracts Season 0 trailers.
        """
        # 1. Query only published shows that have a section
        stmt = (
            select(Show)
            .where(Show.status == ShowStatus.PUBLISHED, Show.section.isnot(None))
            .options(
                selectinload(Show.seasons).selectinload(Season.episodes),
            )
            .order_by(Show.title.asc())
        )
        result = await db.execute(stmt)
        shows: Sequence[Show] = result.scalars().all()

        # 2. Query all artwork records for lookup
        art_stmt = select(Artwork)
        art_result = await db.execute(art_stmt)
        artworks: Sequence[Artwork] = art_result.scalars().all()

        artwork_map: dict[tuple[ArtworkEntityType, str], dict[ArtworkType, str]] = defaultdict(dict)
        for art in artworks:
            artwork_map[(art.entity_type, str(art.entity_id))][art.artwork_type] = art.storage_url

        # 3. Process shows and group by section
        sections_dict: dict[str, list[CatalogueShow]] = {
            sec: [] for sec in DEFAULT_SECTION_ORDER
        }

        total_collapsed_episodes = 0
        total_language_variants = 0
        total_published_shows = 0

        for show in shows:
            show_art_urls = artwork_map.get((ArtworkEntityType.SHOW, str(show.id)), {})
            show_artwork = CatalogueArtwork(
                poster=show_art_urls.get(ArtworkType.POSTER),
                banner=show_art_urls.get(ArtworkType.BANNER),
                thumbnail=show_art_urls.get(ArtworkType.THUMBNAIL),
            )

            catalogue_seasons: list[CatalogueSeason] = []
            catalogue_trailers: list[CatalogueEpisode] = []

            # Sort seasons deterministically by season_number
            sorted_seasons = sorted(show.seasons, key=lambda s: s.season_number)

            for season in sorted_seasons:
                # Filter only PUBLISHED episodes in this season
                pub_episodes = [
                    ep for ep in season.episodes if ep.status == EpisodeStatus.PUBLISHED
                ]
                if not pub_episodes:
                    continue

                # Collapse episodes by content_group
                cg_groups: dict[str, list[Episode]] = defaultdict(list)
                for ep in pub_episodes:
                    cg_groups[ep.content_group].append(ep)

                # Build collapsed catalogue episodes
                collapsed_episodes: list[CatalogueEpisode] = []

                for cg, variants in cg_groups.items():
                    # Sort variants deterministically by language code ('en', 'hi')
                    sorted_variants = sorted(variants, key=lambda v: v.language.lower())

                    # Select primary display variant: prefer 'en', or first available
                    primary_variant = next(
                        (v for v in sorted_variants if v.language.lower() == "en"),
                        sorted_variants[0],
                    )

                    # Build language variants list
                    lang_items: list[CatalogueLanguageVariant] = []
                    ep_artwork_url: str | None = None

                    for v in sorted_variants:
                        total_language_variants += 1
                        lang_items.append(
                            CatalogueLanguageVariant(
                                language=v.language.lower(),
                                episode_id=v.id,
                                title=v.title,
                                duration_seconds=v.duration_seconds,
                                external_id=v.external_id,
                            )
                        )
                        # Find thumbnail from any variant that has artwork
                        if not ep_artwork_url:
                            v_art = artwork_map.get((ArtworkEntityType.EPISODE, str(v.id)), {})
                            ep_artwork_url = v_art.get(ArtworkType.THUMBNAIL) or v_art.get(ArtworkType.POSTER)

                    collapsed_ep = CatalogueEpisode(
                        content_group=cg,
                        episode_number=primary_variant.episode_number,
                        title=primary_variant.title,
                        duration_seconds=primary_variant.duration_seconds or 0,
                        artwork=CatalogueArtwork(thumbnail=ep_artwork_url),
                        languages=lang_items,
                    )
                    collapsed_episodes.append(collapsed_ep)
                    total_collapsed_episodes += 1

                # Sort collapsed episodes by episode_number ascending
                collapsed_episodes.sort(key=lambda e: e.episode_number)

                # Convention: season_number == 0 is Trailers
                if season.season_number == 0:
                    catalogue_trailers.extend(collapsed_episodes)
                else:
                    season_title = season.title or f"Season {season.season_number}"
                    catalogue_seasons.append(
                        CatalogueSeason(
                            season_number=season.season_number,
                            title=season_title,
                            episodes=collapsed_episodes,
                        )
                    )

            # Only include shows that have at least one published episode or trailer
            if not catalogue_seasons and not catalogue_trailers:
                continue

            catalogue_show = CatalogueShow(
                id=show.id,
                slug=show.slug,
                title=show.title,
                synopsis=show.synopsis,
                section=show.section.lower().strip(),
                categories=show.categories or [],
                artwork=show_artwork,
                seasons=catalogue_seasons,
                trailers=catalogue_trailers,
            )

            sec_key = show.section.lower().strip()
            if sec_key not in sections_dict:
                sections_dict[sec_key] = []
            sections_dict[sec_key].append(catalogue_show)
            total_published_shows += 1

        # Sort shows alphabetically by title within each section
        for sec_key in sections_dict:
            sections_dict[sec_key].sort(key=lambda s: s.title.lower())

        # Clean empty sections if any
        final_sections = {k: v for k, v in sections_dict.items() if len(v) > 0}

        stats = CatalogueStats(
            shows_count=total_published_shows,
            episodes_count=total_collapsed_episodes,
            language_variants_count=total_language_variants,
        )

        return CatalogueData(
            version="1.0",
            generated_at=datetime.now(timezone.utc),
            published_by=published_by,
            sections=final_sections,
            stats=stats,
        )

    @staticmethod
    def to_json(catalogue: CatalogueData) -> str:
        """Serialize catalogue to deterministic, formatted JSON."""
        return catalogue.model_dump_json(indent=2)
