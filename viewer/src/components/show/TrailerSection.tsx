import React from 'react';
import { ArtworkImage } from '../common/ArtworkImage';
import { getEpisodeThumbnail } from '../../utils/artwork';
import type { CatalogueEpisode } from '../../types';

interface TrailerSectionProps {
  trailers: CatalogueEpisode[];
  onPlayTrailer: (trailer: CatalogueEpisode) => void;
}

export const TrailerSection: React.FC<TrailerSectionProps> = ({
  trailers,
  onPlayTrailer,
}) => {
  if (!trailers || trailers.length === 0) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
    }
    return `${secs}s`;
  };

  return (
    <div
      style={{
        marginTop: '3.5rem',
        paddingTop: '2.5rem',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {/* Header with OTT Spec Explanation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.4rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎥</span> Trailers & Teasers
          </h3>
          <span
            className="badge badge-amber"
            style={{ fontSize: '0.75rem', fontWeight: 700 }}
          >
            SEASON 0 • EXTRAS
          </span>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Official teasers, sneak peeks, and trailers — separated from numbered episodic storyline per OTT standards.
        </p>
      </div>

      {/* Trailers Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {trailers.map((trailer) => (
          <div
            key={trailer.content_group}
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer',
            }}
            onClick={() => onPlayTrailer(trailer)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.45)';
              e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0, 0, 0, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* 16:9 Preview Thumbnail */}
            <div style={{ position: 'relative' }}>
              <ArtworkImage
                src={getEpisodeThumbnail(trailer.content_group, trailer.artwork.thumbnail)}
                alt={trailer.title}
                aspectRatio="16/9"
                fallbackIcon="🎥"
              />

              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  backdropFilter: 'blur(4px)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#fff',
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                ⏱️ {formatDuration(trailer.duration_seconds)}
              </div>

              {/* Play Badge Icon */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  background: 'rgba(245, 158, 11, 0.9)',
                  color: '#000',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                PREVIEW
              </div>
            </div>

            {/* Info */}
            <div
              style={{
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                flex: 1,
              }}
            >
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                {trailer.title}
              </h4>

              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Clip length: {trailer.duration_seconds}s
                </span>

                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayTrailer(trailer);
                  }}
                >
                  ▶ Watch Trailer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
