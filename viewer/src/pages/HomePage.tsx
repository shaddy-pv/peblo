import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { catalogApi, extractErrorMessage } from '../api/client';
import { ArtworkImage } from '../components/common/ArtworkImage';
import { HeroSkeleton, RowSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import type { CatalogueShow } from '../types';

export const HomePage: React.FC = () => {
  const {
    data: catalogue,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['catalogue'],
    queryFn: catalogApi.getCatalogue,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  if (isLoading) {
    return (
      <div>
        <HeroSkeleton />
        <div className="content-container" style={{ marginTop: '2rem' }}>
          <RowSkeleton />
          <RowSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="content-container" style={{ paddingTop: '100px', minHeight: '70vh' }}>
        <EmptyState
          icon="📦"
          title="Catalogue Not Yet Published"
          description={extractErrorMessage(error)}
          actionText="Retry Connection"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  const sections = catalogue?.sections || {};
  const sectionKeys = Object.keys(sections);

  // Find featured show (first from featured section or first overall)
  const featuredShow: CatalogueShow | null =
    (sections['featured'] && sections['featured'].length > 0)
      ? sections['featured'][0]
      : sectionKeys.length > 0 && sections[sectionKeys[0]].length > 0
      ? sections[sectionKeys[0]][0]
      : null;

  return (
    <div>
      {/* ── Featured Hero Banner ────────────────────────────────────────── */}
      {featuredShow && (
        <div
          style={{
            position: 'relative',
            minHeight: '70vh',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '6rem 2.5rem 4rem 2.5rem',
            overflow: 'hidden',
          }}
        >
          {/* Hero Banner Artwork */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
            }}
          >
            <ArtworkImage
              src={featuredShow.artwork.banner}
              alt={featuredShow.title}
              aspectRatio="16/9"
              fallbackIcon="🎬"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 0,
              }}
            />
            {/* Vignette Gradient Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(11, 15, 25, 0.3) 0%, rgba(11, 15, 25, 0.7) 60%, #0b0f19 100%), linear-gradient(90deg, #0b0f19 0%, rgba(11, 15, 25, 0.6) 45%, transparent 100%)',
              }}
            />
          </div>

          {/* Hero Info */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              maxWidth: '640px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-primary">✨ FEATURED SPECIAL</span>
              {featuredShow.section && (
                <span className="badge badge-cyan">{featuredShow.section.toUpperCase()}</span>
              )}
            </div>

            <h1 style={{ textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)' }}>
              {featuredShow.title}
            </h1>

            {featuredShow.synopsis && (
              <p
                style={{
                  fontSize: '0.95rem',
                  color: '#e2e8f0',
                  lineHeight: 1.5,
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {featuredShow.synopsis}
              </p>
            )}

            {/* Category Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {featuredShow.categories.map((cat) => (
                <span
                  key={cat}
                  style={{
                    fontSize: '0.725rem',
                    color: 'var(--color-text-secondary)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  #{cat}
                </span>
              ))}
            </div>

            {/* Hero CTAs */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Link to={`/show/${featuredShow.slug}`} className="btn btn-primary">
                <span>▶ Watch Now</span>
              </Link>
              <Link to={`/show/${featuredShow.slug}`} className="btn btn-glass">
                <span>ℹ Episodes & Details</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Section Content Rows ────────────────────────────────────────── */}
      <div className="content-container" style={{ marginTop: '1rem', paddingBottom: '3rem' }}>
        {sectionKeys.length === 0 ? (
          <EmptyState
            icon="🎬"
            title="Catalogue is Empty"
            description="No published shows were found in the current catalogue."
          />
        ) : (
          sectionKeys.map((sectionKey) => {
            const shows = sections[sectionKey] || [];
            if (shows.length === 0) return null;

            return (
              <div key={sectionKey} style={{ marginBottom: '2.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: '0.85rem',
                  }}
                >
                  <h2 style={{ textTransform: 'capitalize', color: '#fff' }}>
                    {sectionKey === 'featured' ? '🌟 Featured' : sectionKey}
                  </h2>
                  <Link
                    to={`/search?section=${sectionKey}`}
                    style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}
                  >
                    View All ({shows.length}) →
                  </Link>
                </div>

                {/* Horizontal Scrolling Row */}
                <div className="scroll-row">
                  {shows.map((show) => (
                    <Link
                      key={show.id}
                      to={`/show/${show.slug}`}
                      style={{
                        flex: '0 0 180px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        transition: 'transform 0.2s ease-in-out',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      {/* Poster Artwork (2:3 aspect ratio) */}
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
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {show.title}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.72rem',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <span>
                          {show.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0} eps
                        </span>
                        <span>•</span>
                        <span style={{ textTransform: 'uppercase' }}>
                          {show.categories?.[0] ? `#${show.categories[0]}` : show.section}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
