import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { catalogApi, extractErrorMessage } from '../api/client';
import { ArtworkImage } from '../components/common/ArtworkImage';
import { EmptyState } from '../components/common/EmptyState';



const SECTIONS = ['featured', 'series', 'minisodes', 'songs'];
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
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
];

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') || '';
  const sectionParam = searchParams.get('section') || '';
  const categoryParam = searchParams.get('category') || '';
  const languageParam = searchParams.get('language') || '';

  const [searchTerm, setSearchTerm] = useState(queryParam);

  const {
    data: searchResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['catalog-search', { q: queryParam, section: sectionParam, category: categoryParam, language: languageParam }],
    queryFn: () =>
      catalogApi.search({
        q: queryParam,
        section: sectionParam,
        category: categoryParam,
        language: languageParam,
      }),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchTerm.trim()) {
      newParams.set('q', searchTerm.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const setFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSearchParams({});
  };

  const results = searchResponse?.results || [];
  const hasActiveFilters = !!(queryParam || sectionParam || categoryParam || languageParam);

  return (
    <div className="content-container" style={{ paddingTop: '100px', paddingBottom: '4rem' }}>
      {/* Header & Search Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.4rem' }}>Search Catalogue</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Explore shows, songs, stories, and language variants across all sections.
        </p>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', maxWidth: '600px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by show title, synopsis, or episode..."
            style={{
              flex: 1,
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem 1rem',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          <button type="submit" className="btn btn-primary">
            🔍 Search
          </button>
        </form>
      </div>

      {/* Composable Filter Pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
        {/* Sections */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Section:
          </span>
          <button
            type="button"
            className={`badge ${!sectionParam ? 'badge-primary' : 'badge-glass'}`}
            onClick={() => setFilter('section', '')}
            style={{ cursor: 'pointer' }}
          >
            All
          </button>
          {SECTIONS.map((sec) => (
            <button
              key={sec}
              type="button"
              className={`badge ${sectionParam === sec ? 'badge-primary' : 'badge-glass'}`}
              onClick={() => setFilter('section', sec)}
              style={{ cursor: 'pointer', textTransform: 'capitalize' }}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Languages */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Language:
          </span>
          <button
            type="button"
            className={`badge ${!languageParam ? 'badge-primary' : 'badge-glass'}`}
            onClick={() => setFilter('language', '')}
            style={{ cursor: 'pointer' }}
          >
            All Tracks
          </button>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={`badge ${languageParam === lang.code ? 'badge-primary' : 'badge-glass'}`}
              onClick={() => setFilter('language', lang.code)}
              style={{ cursor: 'pointer' }}
            >
              {lang.label} ({lang.code})
            </button>
          ))}
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Category:
          </span>
          <button
            type="button"
            className={`badge ${!categoryParam ? 'badge-primary' : 'badge-glass'}`}
            onClick={() => setFilter('category', '')}
            style={{ cursor: 'pointer' }}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`badge ${categoryParam === cat ? 'badge-primary' : 'badge-glass'}`}
              onClick={() => setFilter('category', cat)}
              style={{ cursor: 'pointer' }}
            >
              #{cat}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <div>
            <button
              type="button"
              onClick={clearAllFilters}
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-rose)',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              ✕ Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div style={{ marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
        {isLoading ? 'Searching catalogue...' : `Found ${results.length} result(s)`}
      </div>

      {/* Loading or Error */}
      {isLoading && (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="skeleton" style={{ width: '100%', height: '300px' }} />
        </div>
      )}

      {isError && (
        <EmptyState
          icon="⚠️"
          title="Search Failed"
          description={extractErrorMessage(error)}
          actionText="Try Again"
          onAction={() => clearAllFilters()}
        />
      )}

      {/* Empty State */}
      {!isLoading && !isError && results.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No Matching Shows"
          description="We couldn't find any shows matching your search filters. Try adjusting your keywords or clearing category and language filters."
          actionText="Clear Filters"
          onAction={() => clearAllFilters()}
        />
      )}

      {/* Results Grid */}
      {!isLoading && !isError && results.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {results.map((show) => (
            <Link
              key={show.id}
              to={`/show/${show.slug}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
            >
              <ArtworkImage
                src={show.artwork.poster}
                alt={show.title}
                aspectRatio="2/3"
                fallbackIcon="🎬"
                style={{
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-card)',
                }}
              />
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{show.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <span>{show.section}</span>
                <span>•</span>
                <span>{show.categories?.[0] ? `#${show.categories[0]}` : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
