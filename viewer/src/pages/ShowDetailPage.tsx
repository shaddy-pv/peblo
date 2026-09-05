import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';
import { catalogApi, extractErrorMessage } from '../api/client';
import { ArtworkImage } from '../components/common/ArtworkImage';
import { EmptyState } from '../components/common/EmptyState';
import type { CatalogueEpisode } from '../types';

export const ShowDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // State for active season tab
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | null>(null);

  // Video player modal state
  const [activePlayEpisode, setActivePlayEpisode] = useState<{
    episode: CatalogueEpisode;
    language: string;
  } | null>(null);

  const {
    data: show,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['catalog-show', slug],
    queryFn: () => (slug ? catalogApi.getShow(slug) : Promise.reject('No slug provided')),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '80vh' }} className="content-container">
        <div className="skeleton" style={{ width: '100%', height: '400px', borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (isError || !show) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '80vh' }} className="content-container">
        <EmptyState
          icon="📺"
          title="Show Not Found"
          description={extractErrorMessage(error)}
          actionText="Back to Home"
          actionHref="/"
        />
      </div>
    );
  }

  const seasons = show.seasons || [];
  const currentSeason =
    seasons.find((s) => s.season_number === selectedSeasonNumber) || seasons[0];
  const trailers = show.trailers || [];

  return (
    <div>
      {/* ── Hero Banner Header ──────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '6rem 2.5rem 3rem 2.5rem',
          overflow: 'hidden',
        }}
      >
        {/* Banner Artwork */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <ArtworkImage
            src={show.artwork.banner}
            alt={show.title}
            aspectRatio="16/9"
            fallbackIcon="🎬"
            style={{ width: '100%', height: '100%', borderRadius: 0 }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(11, 15, 25, 0.4) 0%, rgba(11, 15, 25, 0.85) 70%, #0b0f19 100%), linear-gradient(90deg, #0b0f19 0%, rgba(11, 15, 25, 0.7) 50%, transparent 100%)',
            }}
          />
        </div>

        {/* Content Details */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '720px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-primary">{show.section.toUpperCase()}</span>
            {show.categories.map((c) => (
              <span key={c} className="badge badge-cyan">
                #{c}
              </span>
            ))}
          </div>

          <h1 style={{ textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)' }}>{show.title}</h1>

          {show.synopsis && (
            <p style={{ fontSize: '1rem', color: '#e2e8f0', lineHeight: 1.6, textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>
              {show.synopsis}
            </p>
          )}

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <span>📁 {seasons.length} Season(s)</span>
            <span>🎬 {seasons.reduce((acc, s) => acc + s.episodes.length, 0)} Episodes</span>
            {trailers.length > 0 && <span>🎥 {trailers.length} Trailer(s)</span>}
          </div>
        </div>
      </div>

      {/* ── Main Content: Seasons, Episodes & Trailers ──────────────────── */}
      <div className="content-container" style={{ marginTop: '1.5rem', paddingBottom: '4rem' }}>
        {/* Season Selector Tabs */}
        {seasons.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '0.75rem',
              marginBottom: '1.5rem',
              overflowX: 'auto',
            }}
          >
            {seasons.map((s) => {
              const active = (currentSeason?.season_number ?? 1) === s.season_number;
              return (
                <button
                  key={s.season_number}
                  type="button"
                  onClick={() => setSelectedSeasonNumber(s.season_number)}
                  style={{
                    padding: '0.5rem 1.1rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    background: active ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: active ? '#fff' : 'var(--color-text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Season {s.season_number} {s.title ? `— ${s.title}` : ''}
                </button>
              );
            })}
          </div>
        )}

        {/* Episodes List in Current Season */}
        {currentSeason && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#fff' }}>
              Episodes ({currentSeason.episodes.length})
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {currentSeason.episodes.map((ep) => (
                <div
                  key={ep.content_group}
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  {/* Thumbnail Artwork (16:9) */}
                  <div style={{ position: 'relative' }}>
                    <ArtworkImage
                      src={ep.artwork.thumbnail}
                      alt={ep.title}
                      aspectRatio="16/9"
                      fallbackIcon="🎬"
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#fff',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {Math.floor(ep.duration_seconds / 60)}m {ep.duration_seconds % 60}s
                    </div>
                  </div>

                  {/* Episode Info & Language Variant Selector */}
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        EPISODE {ep.episode_number}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', lineHeight: 1.3 }}>
                      {ep.title}
                    </div>

                    {/* Language Variant Buttons (Bilingual Support: English/Hindi) */}
                    <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                        PLAY IN LANGUAGE:
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {ep.languages.map((variant) => (
                          <button
                            key={variant.language}
                            type="button"
                            onClick={() =>
                              setActivePlayEpisode({
                                episode: ep,
                                language: variant.language,
                              })
                            }
                            className={`badge ${variant.language === 'en' ? 'badge-lang-en' : 'badge-lang-hi'}`}
                            style={{ cursor: 'pointer', padding: '0.3rem 0.6rem' }}
                          >
                            ▶ {variant.language.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Season 0 Trailers & Teasers (Separated per convention) ──── */}
        {trailers.length > 0 && (
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.35rem' }}>🎥</span>
              <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>Trailers & Teasers (Season 0)</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Preview clips and introductory trailers separated from numbered episodic seasons.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1.25rem',
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
                  }}
                >
                  <ArtworkImage
                    src={trailer.artwork.thumbnail}
                    alt={trailer.title}
                    aspectRatio="16/9"
                    fallbackIcon="🎥"
                  />
                  <div style={{ padding: '0.85rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{trailer.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                      ⏱️ {trailer.duration_seconds}s
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Video Player Modal Stub ─────────────────────────────────────── */}
      {activePlayEpisode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 999,
          }}
          onClick={() => setActivePlayEpisode(null)}
        >
          <div
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '680px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-hero)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#fff' }}>Now Playing (Stream Stub)</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  {show.title} • Ep #{activePlayEpisode.episode.episode_number}: {activePlayEpisode.episode.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePlayEpisode(null)}
                style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Video Player Display Screen */}
            <div
              style={{
                aspectRatio: '16/9',
                background: '#000',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '3.5rem', marginBottom: '0.75rem', animation: 'pulse 2s infinite' }}>
                ▶️
              </span>
              <div style={{ color: '#fff', fontWeight: 700 }}>
                Streaming Track: [{activePlayEpisode.language.toUpperCase()}]
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                Duration: {activePlayEpisode.episode.duration_seconds}s • Content Group: {activePlayEpisode.episode.content_group}
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Child Mode active: Safe media player stub
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActivePlayEpisode(null)}
              >
                Close Player
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
