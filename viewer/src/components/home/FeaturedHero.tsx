import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArtworkImage } from '../common/ArtworkImage';
import { getShowBanner } from '../../utils/artwork';
import type { CatalogueShow } from '../../types';

interface FeaturedHeroProps {
  featuredShows: CatalogueShow[];
}

export const FeaturedHero: React.FC<FeaturedHeroProps> = ({ featuredShows }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate featured hero spotlight every 8 seconds if multiple shows
  useEffect(() => {
    if (featuredShows.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredShows.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [featuredShows.length]);

  if (!featuredShows || featuredShows.length === 0) return null;

  const currentShow = featuredShows[currentIndex] || featuredShows[0];

  // Extract all distinct languages across the featured show's episodes
  const availableLanguages = Array.from(
    new Set(
      currentShow.seasons?.flatMap((s) =>
        s.episodes?.flatMap((ep) => ep.languages?.map((l) => l.language.toUpperCase()) || []) || []
      ) || []
    )
  ).sort();

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '7rem 2.5rem 4.5rem 2.5rem',
        overflow: 'hidden',
        background: '#0b0f19',
      }}
      className="featured-hero-container"
    >
      {/* ── 16:9 Hero Banner Artwork ────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
        }}
      >
        <ArtworkImage
          key={currentShow.id}
          src={getShowBanner(currentShow.slug, currentShow.artwork.banner)}
          alt={currentShow.title}
          aspectRatio="16/9"
          fallbackIcon="🎬"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 0,
          }}
        />

        {/* Cinematic Vignette Gradients */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(11, 15, 25, 0.4) 0%, rgba(11, 15, 25, 0.75) 60%, #0b0f19 100%), linear-gradient(90deg, #0b0f19 0%, rgba(11, 15, 25, 0.65) 45%, transparent 100%)',
          }}
        />
      </div>

      {/* ── Hero Info Presentation ───────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          animation: 'fadeIn 0.3s ease-in-out',
        }}
      >
        {/* Badges Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-primary">🌟 FEATURED SPOTLIGHT</span>
          {currentShow.section && (
            <span className="badge badge-cyan">{currentShow.section.toUpperCase()}</span>
          )}
          {availableLanguages.length > 0 && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                backdropFilter: 'blur(6px)',
              }}
            >
              🌐 {availableLanguages.join(' & ')}
            </span>
          )}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.15,
            textShadow: '0 4px 24px rgba(0, 0, 0, 0.9)',
          }}
        >
          {currentShow.title}
        </h1>

        {/* Synopsis */}
        {currentShow.synopsis && (
          <p
            style={{
              fontSize: '1rem',
              color: '#cbd5e1',
              lineHeight: 1.6,
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {currentShow.synopsis}
          </p>
        )}

        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {currentShow.categories?.map((cat) => (
            <span
              key={cat}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#94a3b8',
                background: 'rgba(255, 255, 255, 0.07)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                backdropFilter: 'blur(6px)',
              }}
            >
              #{cat}
            </span>
          ))}
        </div>

        {/* Hero Actions & Carousel Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.85rem' }}>
            <Link
              to={`/show/${currentShow.slug}`}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.6rem', fontSize: '0.95rem' }}
            >
              <span>▶ Watch Now</span>
            </Link>
            <Link
              to={`/show/${currentShow.slug}`}
              className="btn btn-glass"
              style={{ padding: '0.75rem 1.4rem', fontSize: '0.95rem' }}
            >
              <span>ℹ Show Details</span>
            </Link>
          </div>

          {/* Multiple Featured Shows Pagination Dots */}
          {featuredShows.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {featuredShows.map((show, idx) => (
                <button
                  key={show.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    width: idx === currentIndex ? '24px' : '8px',
                    height: '8px',
                    borderRadius: 'var(--radius-full)',
                    background: idx === currentIndex ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.25)',
                    transition: 'all 0.25s ease',
                    cursor: 'pointer',
                  }}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
