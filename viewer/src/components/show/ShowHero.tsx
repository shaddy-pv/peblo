import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArtworkImage } from '../common/ArtworkImage';
import { getShowBanner } from '../../utils/artwork';
import type { CatalogueShow } from '../../types';

interface ShowHeroProps {
  show: CatalogueShow;
  onPlayEpisode1: () => void;
  onPlayTrailer?: () => void;
}

export const ShowHero: React.FC<ShowHeroProps> = ({
  show,
  onPlayEpisode1,
  onPlayTrailer,
}) => {
  const navigate = useNavigate();

  const seasons = show.seasons || [];
  const trailers = show.trailers || [];
  const totalEpisodes = seasons.reduce((acc, s) => acc + (s.episodes?.length || 0), 0);

  // Extract distinct language variants across all episodes
  const availableLanguages = Array.from(
    new Set(
      seasons.flatMap((s) =>
        s.episodes?.flatMap((ep) => ep.languages?.map((l) => l.language.toUpperCase()) || []) || []
      ) || []
    )
  ).sort();

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '62vh',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '5.5rem 2.5rem 3.5rem 2.5rem',
        overflow: 'hidden',
      }}
    >
      {/* 16:9 Banner Artwork Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <ArtworkImage
          src={getShowBanner(show.slug, show.artwork.banner)}
          alt={show.title}
          aspectRatio="16/9"
          fallbackIcon="🎬"
          style={{ width: '100%', height: '100%', borderRadius: 0 }}
        />
        {/* Cinematic Gradient Scrim Overlays */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(11, 15, 25, 0.45) 0%, rgba(11, 15, 25, 0.8) 60%, #0b0f19 100%), linear-gradient(90deg, #0b0f19 0%, rgba(11, 15, 25, 0.85) 55%, transparent 100%)',
          }}
        />
      </div>

      {/* Show Details & Actions */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '780px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Navigation Breadcrumb Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              color: '#cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            ← Back
          </button>

          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Home / {show.section.charAt(0).toUpperCase() + show.section.slice(1)} /{' '}
            <span style={{ color: '#e2e8f0' }}>{show.title}</span>
          </span>
        </div>

        {/* Section & Category Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontWeight: 800 }}>
            {show.section}
          </span>
          {show.categories?.map((category) => (
            <span key={category} className="badge badge-cyan">
              #{category}
            </span>
          ))}

          {/* Languages Available Badges */}
          {availableLanguages.map((lang) => (
            <span
              key={lang}
              className={`badge ${lang === 'EN' ? 'badge-lang-en' : 'badge-lang-hi'}`}
              style={{ fontWeight: 800 }}
            >
              {lang === 'EN' ? '🇬🇧 EN' : lang === 'HI' ? '🇮🇳 HI' : lang}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.15,
            textShadow: '0 4px 24px rgba(0, 0, 0, 0.9)',
          }}
        >
          {show.title}
        </h1>

        {/* Synopsis */}
        {show.synopsis && (
          <p
            style={{
              fontSize: '1rem',
              color: '#cbd5e1',
              lineHeight: 1.6,
              maxWidth: '680px',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
            }}
          >
            {show.synopsis}
          </p>
        )}

        {/* Metric Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            fontWeight: 600,
            flexWrap: 'wrap',
          }}
        >
          <span>📁 {seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}</span>
          <span>🎬 {totalEpisodes} {totalEpisodes === 1 ? 'Episode' : 'Episodes'}</span>
          {trailers.length > 0 && <span>🎥 {trailers.length} {trailers.length === 1 ? 'Trailer' : 'Trailers'}</span>}
          <span>🛡️ Child Safe Content</span>
        </div>

        {/* Call to Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {totalEpisodes > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onPlayEpisode1}
              style={{ padding: '0.75rem 1.6rem', fontSize: '0.95rem' }}
            >
              <span>▶</span> Watch Episode 1
            </button>
          )}

          {trailers.length > 0 && onPlayTrailer && (
            <button
              type="button"
              className="btn btn-glass"
              onClick={onPlayTrailer}
              style={{ padding: '0.75rem 1.4rem', fontSize: '0.95rem' }}
            >
              <span>🎥</span> Watch Trailer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
