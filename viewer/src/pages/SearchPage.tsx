import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogApi, extractErrorMessage } from '../api/client';
import { PosterCard } from '../components/home/PosterCard';
import { EmptyState } from '../components/common/EmptyState';
import { useDebounce } from '../hooks/useDebounce';

const SECTIONS = [
  { id: 'featured', label: 'Featured', icon: '🌟' },
  { id: 'series', label: 'Series', icon: '🎬' },
  { id: 'minisodes', label: 'Minisodes', icon: '⚡' },
  { id: 'songs', label: 'Songs & Rhymes', icon: '🎵' },
];

const CATEGORIES = [
  'adventure',
  'folk',
  'friendship',
  'india',
  'language',
  'learning',
  'maths',
  'music',
  'nature',
  'reading',
  'science',
  'singalong',
  'stories',
  'travel',
  'values',
];

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
];

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') || '';
  const sectionParam = searchParams.get('section') || '';
  const categoryParam = searchParams.get('category') || '';
  const languageParam = searchParams.get('language') || '';

  // Local state for instant typing responsiveness
  const [searchInput, setSearchInput] = useState(queryParam);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced input to URL search parameters
  useEffect(() => {
    const currentQ = searchParams.get('q') || '';
    if (debouncedSearch.trim() !== currentQ) {
      const newParams = new URLSearchParams(searchParams);
      if (debouncedSearch.trim()) {
        newParams.set('q', debouncedSearch.trim());
      } else {
        newParams.delete('q');
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [debouncedSearch, searchParams, setSearchParams]);

  // Keep input in sync if URL changes externally (e.g. back button / category link)
  const [prevQueryParam, setPrevQueryParam] = useState(queryParam);
  if (prevQueryParam !== queryParam) {
    setPrevQueryParam(queryParam);
    setSearchInput(queryParam);
  }


  // TanStack Query for composable search endpoint
  const {
    data: searchResponse,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'catalog-search',
      { q: queryParam, section: sectionParam, category: categoryParam, language: languageParam },
    ],
    queryFn: () =>
      catalogApi.search({
        q: queryParam || undefined,
        section: sectionParam || undefined,
        category: categoryParam || undefined,
        language: languageParam || undefined,
      }),
    staleTime: 30 * 1000, // 30s cache
  });

  const setFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams, { replace: true });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  const results = searchResponse?.results || [];
  const hasActiveFilters = !!(queryParam || sectionParam || categoryParam || languageParam);

  return (
    <div className="content-container" style={{ paddingTop: '100px', paddingBottom: '5rem' }}>
      {/* ── Search Header & Live Input Bar ──────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Explore & Search
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.925rem', marginBottom: '1.5rem' }}>
          Type a title, character, or topic to search across all shows, episodes, and songs in real time.
        </p>

        {/* Live Search Input Box with Debounce & Clear Action */}
        <div
          style={{
            position: 'relative',
            maxWidth: '680px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '1rem',
              fontSize: '1.25rem',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>

          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search shows, episodes, adventure, folk tales..."
            style={{
              width: '100%',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 3rem 0.85rem 3rem',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 500,
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.25)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          {/* Quick Clear Icon Button */}
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              style={{
                position: 'absolute',
                right: '1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'var(--color-text-secondary)',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
              title="Clear search input"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Composable Filters Section ──────────────────────────────────── */}
      <div
        style={{
          background: 'rgba(17, 24, 39, 0.5)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
        }}
      >
        {/* 1. Section Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', width: '80px' }}>
            Section:
          </span>
          <button
            type="button"
            className={`badge ${!sectionParam ? 'badge-primary' : 'badge-neutral'}`}
            onClick={() => setFilter('section', '')}
            style={{ cursor: 'pointer', padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
          >
            All Sections
          </button>
          {SECTIONS.map((sec) => {
            const active = sectionParam === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                className={`badge ${active ? 'badge-primary' : 'badge-neutral'}`}
                onClick={() => setFilter('section', active ? '' : sec.id)}
                style={{
                  cursor: 'pointer',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span>{sec.icon}</span>
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* 2. Language Variant Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', width: '80px' }}>
            Language:
          </span>
          <button
            type="button"
            className={`badge ${!languageParam ? 'badge-primary' : 'badge-neutral'}`}
            onClick={() => setFilter('language', '')}
            style={{ cursor: 'pointer', padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
          >
            All Tracks
          </button>
          {LANGUAGES.map((lang) => {
            const active = languageParam === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                className={`badge ${active ? (lang.code === 'en' ? 'badge-lang-en' : 'badge-lang-hi') : 'badge-neutral'}`}
                onClick={() => setFilter('language', active ? '' : lang.code)}
                style={{
                  cursor: 'pointer',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: active ? 700 : 500,
                }}
              >
                <span>{lang.flag}</span>
                <span>{lang.label} ({lang.code.toUpperCase()})</span>
              </button>
            );
          })}
        </div>

        {/* 3. Category Tags */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', width: '80px', paddingTop: '0.2rem' }}>
            Category:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', flex: 1 }}>
            <button
              type="button"
              className={`badge ${!categoryParam ? 'badge-primary' : 'badge-neutral'}`}
              onClick={() => setFilter('category', '')}
              style={{ cursor: 'pointer', padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => {
              const active = categoryParam === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`badge ${active ? 'badge-cyan' : 'badge-neutral'}`}
                  onClick={() => setFilter('category', active ? '' : cat)}
                  style={{
                    cursor: 'pointer',
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  #{cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Active Filters Summary Bar ──────────────────────────────── */}
        {hasActiveFilters && (
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Active filters:</span>

              {queryParam && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#c7d2fe',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  q: "{queryParam}"
                  <button type="button" onClick={() => setFilter('q', '')} style={{ color: '#fff', cursor: 'pointer' }}>
                    ✕
                  </button>
                </span>
              )}

              {sectionParam && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: '#67e8f9',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  section: {sectionParam}
                  <button type="button" onClick={() => setFilter('section', '')} style={{ color: '#fff', cursor: 'pointer' }}>
                    ✕
                  </button>
                </span>
              )}

              {categoryParam && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fde68a',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  #{categoryParam}
                  <button type="button" onClick={() => setFilter('category', '')} style={{ color: '#fff', cursor: 'pointer' }}>
                    ✕
                  </button>
                </span>
              )}

              {languageParam && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(244, 63, 94, 0.15)',
                    color: '#fda4af',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  lang: {languageParam.toUpperCase()}
                  <button type="button" onClick={() => setFilter('language', '')} style={{ color: '#fff', cursor: 'pointer' }}>
                    ✕
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={clearAllFilters}
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--color-rose)',
                cursor: 'pointer',
              }}
            >
              ✕ Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* ── Results Status Header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.925rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>
            {isLoading ? 'Searching catalogue...' : `Showing ${results.length} matching show${results.length === 1 ? '' : 's'}`}
          </span>
          {isFetching && !isLoading && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>• updating...</span>
          )}
        </div>
      </div>

      {/* ── Shimmering Loading Skeleton Grid ────────────────────────────── */}
      {isLoading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {[...Array(8)].map((_, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 'var(--radius-md)' }} />
              <div className="skeleton" style={{ height: '18px', width: '80%' }} />
              <div className="skeleton" style={{ height: '14px', width: '50%' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Error State ─────────────────────────────────────────────────── */}
      {isError && (
        <EmptyState
          icon="⚠️"
          title="Search Request Failed"
          description={extractErrorMessage(error)}
          actionText="Retry Search"
          onAction={() => refetch()}
        />
      )}

      {/* ── Sensible Empty State ────────────────────────────────────────── */}
      {!isLoading && !isError && results.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No Matching Shows Found"
          description={
            hasActiveFilters
              ? `We couldn't find any shows matching your search criteria. Try using different keywords, choosing another section, or resetting filters.`
              : 'The catalogue contains no published shows yet.'
          }
          actionText={hasActiveFilters ? 'Reset All Filters' : undefined}
          onAction={hasActiveFilters ? clearAllFilters : undefined}
        />
      )}

      {/* ── Results Responsive Poster Grid ──────────────────────────────── */}
      {!isLoading && !isError && results.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {results.map((show) => (
            <PosterCard key={show.id} show={show} />
          ))}
        </div>
      )}
    </div>
  );
};
