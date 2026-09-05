/**
/**
 * TypeScript definitions for Peblo TV Viewer application.
 * Matches published catalogue schema with zero administrative properties.
 */

export interface CatalogueArtwork {
  poster?: string | null;
  banner?: string | null;
  thumbnail?: string | null;
}

export interface CatalogueLanguageVariant {
  language: string; // 'en' | 'hi'
  episode_id: string;
  title: string;
  duration_seconds?: number | null;
  external_id?: string | null;
}

export interface CatalogueEpisode {
  content_group: string;
  episode_number: number;
  title: string;
  duration_seconds: number;
  artwork: CatalogueArtwork;
  languages: CatalogueLanguageVariant[];
}

export interface CatalogueSeason {
  season_number: number;
  title: string;
  episodes: CatalogueEpisode[];
}

export interface CatalogueShow {
  id: string;
  slug: string;
  title: string;
  synopsis?: string | null;
  section: string;
  categories: string[];
  artwork: CatalogueArtwork;
  seasons: CatalogueSeason[];
  trailers: CatalogueEpisode[];
}

export interface CatalogueStats {
  shows_count: number;
  episodes_count: number;
  language_variants_count: number;
}

export interface CatalogueData {
  version: string;
  generated_at: string;
  published_by?: string | null;
  sections: Record<string, CatalogueShow[]>;
  stats: CatalogueStats;
}

export interface CatalogueSearchResponse {
  query?: string | null;
  category?: string | null;
  language?: string | null;
  section?: string | null;
  total_results: number;
  results: CatalogueShow[];
}

export interface SearchFilters {
  q?: string;
  category?: string;
  language?: string;
  section?: string;
}
