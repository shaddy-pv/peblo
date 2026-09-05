import React from 'react';
import { Link } from 'react-router-dom';
import { ArtworkImage } from '../common/ArtworkImage';
import type { CatalogueShow } from '../../types';

interface PosterCardProps {
  show: CatalogueShow;
}

export const PosterCard: React.FC<PosterCardProps> = ({ show }) => {
  // Compute total episodes across seasons
  const totalEpisodes =
    show.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;

  // Extract distinct language variants across all episodes
  const availableLanguages = Array.from(
    new Set(
      show.seasons?.flatMap((s) =>
        s.episodes?.flatMap((ep) => ep.languages?.map((l) => l.language.toUpperCase()) || []) || []
      ) || []
    )
  ).sort();

  return (
    <Link
      to={`/show/${show.slug}`}
      className="poster-card"
      style={{
        flex: '0 0 190px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        textDecoration: 'none',
        position: 'relative',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease',
        cursor: 'pointer',
      }}
    >
      {/* Poster Artwork Container (2:3 aspect ratio) */}
      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
          transition: 'box-shadow 0.25s ease',
        }}
      >
        <ArtworkImage
          src={show.artwork.poster}
          alt={show.title}
          aspectRatio="2/3"
          fallbackIcon="🎬"
        />

        {/* Section Pill in Top-Right corner */}
        {show.section && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(11, 15, 25, 0.8)',
              backdropFilter: 'blur(8px)',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#e2e8f0',
              letterSpacing: '0.04em',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            {show.section}
          </div>
        )}
      </div>

      {/* Show Metadata */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '0 0.15rem' }}>
        <h4
          style={{
            fontSize: '0.925rem',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={show.title}
        >
          {show.title}
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>
          <span>{totalEpisodes} eps</span>

          {/* Languages Available */}
          {availableLanguages.length > 0 && (
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {availableLanguages.map((lang) => (
                <span
                  key={lang}
                  style={{
                    padding: '0.05rem 0.35rem',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    background:
                      lang === 'EN' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(249, 115, 22, 0.18)',
                    color: lang === 'EN' ? '#93c5fd' : '#fdba74',
                  }}
                >
                  {lang}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
