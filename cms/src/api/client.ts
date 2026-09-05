/**
 * Typed API Client configured with Axios interceptors for Peblo CMS.
 * Handles JWT token injection and automatic 401 handling.
 */

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type {
  Artwork,
  ArtworkEntityType,
  ArtworkType,
  AuthToken,
  Episode,
  EpisodeCreate,
  EpisodeUpdate,
  PaginatedResponse,
  PublishResponse,
  PublishRun,
  Season,
  SeasonCreate,
  Show,
  ShowCreate,
  ShowDetail,
  ShowUpdate,
  User,
  ValidationReport,
} from '../types';

export const TOKEN_STORAGE_KEY = 'peblo_cms_token';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ── Request Interceptor: Attach Bearer Token ─────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Handle 401 Unauthorized ────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and notify subscribers
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event('peblo:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/**
 * Extracts a friendly human-readable error message from FastAPI error responses.
 */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      if ('detail' in data) {
        if (typeof data.detail === 'string') return data.detail;
        if (typeof data.detail === 'object' && data.detail && 'message' in data.detail) {
          return String(data.detail.message);
        }
        if (Array.isArray(data.detail)) {
          // Pydantic validation error array
          return data.detail.map((err: { msg?: string; loc?: string[] }) => err.msg || 'Validation error').join('; ');
        }
      }
      if ('message' in data) return String(data.message);
    }
    return error.message || 'An unexpected network error occurred';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

// ── Auth Endpoints ───────────────────────────────────────────────────────────
export const authApi = {
  login: async (formData: { username: string; password: string }): Promise<AuthToken> => {
    const res = await apiClient.post<AuthToken>('/auth/login', formData);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },
};

// ── Content Endpoints: Shows ────────────────────────────────────────────────
export const showsApi = {
  getShows: async (params?: {
    page?: number;
    page_size?: number;
    section?: string;
    status?: string;
    search?: string;
    category?: string;
  }): Promise<PaginatedResponse<Show>> => {
    const res = await apiClient.get<PaginatedResponse<Show>>('/shows', { params });
    return res.data;
  },
  getShow: async (id: string): Promise<Show> => {
    const res = await apiClient.get<Show>(`/shows/${id}`);
    return res.data;
  },
  getShowDetail: async (id: string): Promise<ShowDetail> => {
    const res = await apiClient.get<ShowDetail>(`/shows/${id}`);
    return res.data;
  },
  createShow: async (data: ShowCreate): Promise<Show> => {
    const res = await apiClient.post<Show>('/shows', data);
    return res.data;
  },
  updateShow: async (id: string, data: ShowUpdate): Promise<Show> => {
    const res = await apiClient.patch<Show>(`/shows/${id}`, data);
    return res.data;
  },
  deleteShow: async (id: string): Promise<void> => {
    await apiClient.delete(`/shows/${id}`);
  },
};

// ── Content Endpoints: Seasons ──────────────────────────────────────────────
export const seasonsApi = {
  getSeasonsForShow: async (showId: string): Promise<Season[]> => {
    const res = await apiClient.get<Season[]>('/seasons', { params: { show_id: showId } });
    return res.data;
  },
  createSeason: async (data: SeasonCreate): Promise<Season> => {
    const res = await apiClient.post<Season>('/seasons', data);
    return res.data;
  },
  deleteSeason: async (id: string): Promise<void> => {
    await apiClient.delete(`/seasons/${id}`);
  },
};


// ── Content Endpoints: Episodes ─────────────────────────────────────────────
export const episodesApi = {
  getEpisodes: async (params?: {
    page?: number;
    page_size?: number;
    show_id?: string;
    season_id?: string;
    search?: string;
    status?: string;
    language?: string;
    content_group?: string;
  }): Promise<PaginatedResponse<Episode>> => {
    const res = await apiClient.get<PaginatedResponse<Episode>>('/episodes', { params });
    return res.data;
  },
  createEpisode: async (data: EpisodeCreate): Promise<Episode> => {
    const res = await apiClient.post<Episode>('/episodes', data);
    return res.data;
  },
  updateEpisode: async (id: string, data: EpisodeUpdate): Promise<Episode> => {
    const res = await apiClient.patch<Episode>(`/episodes/${id}`, data);
    return res.data;
  },
  deleteEpisode: async (id: string): Promise<void> => {
    await apiClient.delete(`/episodes/${id}`);
  },
};

// ── Artwork Upload & Management Endpoints ────────────────────────────────────
export const artworkApi = {
  upload: async (
    entityType: ArtworkEntityType,
    entityId: string,
    artworkType: ArtworkType,
    file: File
  ): Promise<Artwork> => {
    const formData = new FormData();
    formData.append('entity_type', entityType);
    formData.append('entity_id', entityId);
    formData.append('artwork_type', artworkType);
    formData.append('file', file);

    const res = await apiClient.post<Artwork>('/artwork/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getForEntity: async (
    entityType: ArtworkEntityType,
    entityId: string
  ): Promise<Artwork[]> => {
    const res = await apiClient.get<Artwork[]>(`/artwork/${entityType}/${entityId}`);
    return res.data;
  },
  delete: async (
    entityType: ArtworkEntityType,
    entityId: string,
    artworkType: ArtworkType
  ): Promise<void> => {
    await apiClient.delete(`/artwork/${entityType}/${entityId}/${artworkType}`);
  },
};

// ── Publishing & Validation Endpoints (Admin & CMS) ──────────────────────────
export const adminApi = {
  getValidationReport: async (): Promise<ValidationReport> => {
    const res = await apiClient.get<ValidationReport>('/admin/validation-report');
    return res.data;
  },
  publishCatalog: async (): Promise<PublishResponse> => {
    const res = await apiClient.post<PublishResponse>('/admin/catalog/publish');
    return res.data;
  },
  getPublishRuns: async (limit = 15): Promise<PublishRun[]> => {
    const res = await apiClient.get<PublishRun[]>('/admin/catalog/publish/runs', {
      params: { limit },
    });
    return res.data;
  },
};
