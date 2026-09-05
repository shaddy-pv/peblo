/**
 * Pure Catalogue API Client for Peblo TV Viewer UI.
 * Strictly decoupled: ZERO administrative endpoints, ZERO auth tokens.
 */

import axios from 'axios';

import type {
  CatalogueData,
  CatalogueSearchResponse,
  CatalogueShow,
  SearchFilters,
} from '../types';

export const catalogClient = axios.create({
  baseURL: '/catalog',
  headers: {
    'Accept': 'application/json',
  },
  timeout: 10000,
});

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) {
      return 'The catalogue has not been published yet. Please ask a content administrator to publish via CMS.';
    }
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'detail' in data) {
      return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    }
    return error.message || 'Failed to connect to catalogue server.';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred while loading content.';
}

export const catalogApi = {
  /**
   * Loads the live published catalogue.
   */
  getCatalogue: async (): Promise<CatalogueData> => {
    const res = await catalogClient.get<CatalogueData>('');
    return res.data;
  },

  /**
   * Composable search across titles, categories, language tracks, and sections.
   */
  search: async (filters: SearchFilters): Promise<CatalogueSearchResponse> => {
    const res = await catalogClient.get<CatalogueSearchResponse>('/search', {
      params: {
        q: filters.q || undefined,
        category: filters.category || undefined,
        language: filters.language || undefined,
        section: filters.section || undefined,
      },
    });
    return res.data;
  },

  /**
   * Retrieves single published show with seasons, trailers, and language variants.
   */
  getShow: async (slugOrId: string): Promise<CatalogueShow> => {
    const res = await catalogClient.get<CatalogueShow>(`/shows/${slugOrId}`);
    return res.data;
  },
};
