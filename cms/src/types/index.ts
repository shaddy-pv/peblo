/**
 * Shared TypeScript definitions for Peblo TV CMS.
 */

export type UserRole = 'admin' | 'editor';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  username: string;
  role: UserRole;
}

export type ShowStatus = 'draft' | 'published';
export type EpisodeStatus = 'draft' | 'published';
export type ArtworkType = 'poster' | 'banner' | 'thumbnail';
export type ArtworkEntityType = 'show' | 'episode';

export interface Artwork {
  id: string;
  entity_type: ArtworkEntityType;
  entity_id: string;
  artwork_type: ArtworkType;
  storage_key: string;
  url: string;
  width: number;
  height: number;
  file_size_bytes: number;
  mime_type: string;
  created_at: string;
}

export interface EpisodeLanguageVariant {
  language: string;
  episode_id: string;
  title: string;
  duration_seconds: number | null;
  external_id?: string | null;
}

export interface EpisodeCreate {
  season_id: string;
  episode_number: number;
  title: string;
  content_group: string;
  language: string;
  duration_seconds?: number | null;
  status?: EpisodeStatus;
  external_id?: string | null;
}

export interface EpisodeUpdate {
  title?: string;
  episode_number?: number;
  duration_seconds?: number | null;
  status?: EpisodeStatus;
  language?: string;
  content_group?: string;
  external_id?: string | null;
}

export interface Episode {
  id: string;
  season_id: string;
  episode_number: number;
  title: string;
  content_group: string;
  language: string;
  duration_seconds: number | null;
  status: EpisodeStatus;
  artwork_available?: string[];
  artwork?: {
    thumbnail?: string | null;
  };
  has_artwork?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeasonCreate {
  show_id: string;
  season_number: number;
  title?: string | null;
}

export interface Season {
  id: string;
  show_id: string;
  season_number: number;
  title: string;
  is_trailers: boolean;
  episodes: Episode[];
  created_at: string;
}

export interface ShowCreate {
  title: string;
  slug?: string | null;
  synopsis?: string | null;
  section?: string | null;
  categories?: string[];
  status?: ShowStatus;
  language_default?: string;
}

export interface ShowUpdate {
  title?: string;
  slug?: string;
  synopsis?: string | null;
  section?: string | null;
  categories?: string[];
  status?: ShowStatus;
  language_default?: string;
}

export interface ShowDetail extends Show {
  seasons: Season[];
}

export interface Show {
  id: string;
  title: string;
  slug: string;
  synopsis: string | null;
  section: string | null;
  categories: string[];
  status: ShowStatus;
  language_default: string;
  artwork?: {
    poster?: string | null;
    banner?: string | null;
  };
  seasons_count?: number;
  episodes_count?: number;
  created_at: string;
  updated_at: string;
}

export type ValidationSeverity = 'blocker' | 'warning' | 'info';

export type IssueCategory =
  | 'missing_section'
  | 'missing_artwork'
  | 'missing_duration'
  | 'incomplete_localization'
  | 'title_casing'
  | 'duplicate_variant'
  | 'no_episodes';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: IssueCategory;
  entity_type: 'show' | 'season' | 'episode';
  entity_id: string;
  show_id?: string | null;
  show_title?: string | null;
  season_number?: number | null;
  episode_id?: string | null;
  episode_title?: string | null;
  message: string;
  action_needed: string;
}

export interface ValidationSummary {
  total_shows: number;
  published_shows: number;
  draft_shows: number;
  total_episodes: number;
  published_episodes: number;
  draft_episodes: number;
  blockers_count: number;
  warnings_count: number;
}

export interface ValidationReport {
  generated_at: string;
  can_publish: boolean;
  summary: ValidationSummary;
  blockers: ValidationIssue[];
  warnings: ValidationIssue[];
  grouped_by_show: Record<string, ValidationIssue[]>;
}

export type PublishOutcome = 'running' | 'success' | 'failed';

export interface PublishRun {
  id: string;
  started_at: string;
  completed_at?: string | null;
  actor_id?: string | null;
  actor_username?: string | null;
  outcome: PublishOutcome;
  shows_count: number;
  episodes_count: number;
  language_variants_count: number;
  catalogue_path?: string | null;
  error_message?: string | null;
}

export interface PublishResponse {
  run_id: string;
  outcome: PublishOutcome;
  started_at: string;
  completed_at?: string | null;
  shows_count: number;
  episodes_count: number;
  language_variants_count: number;
  catalogue_path?: string | null;
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  total_pages?: number;
}

