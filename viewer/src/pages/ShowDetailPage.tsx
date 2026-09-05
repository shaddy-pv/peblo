import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogApi, extractErrorMessage } from '../api/client';
import { EmptyState } from '../components/common/EmptyState';
import { ShowDetailSkeleton } from '../components/show/ShowDetailSkeleton';
import { ShowHero } from '../components/show/ShowHero';
import { EpisodeCard } from '../components/show/EpisodeCard';
import { TrailerSection } from '../components/show/TrailerSection';
import { VideoPlayerModal } from '../components/show/VideoPlayerModal';
import type { CatalogueEpisode } from '../types';

interface ActivePlayState {
  item: CatalogueEpisode;
  itemType: 'episode' | 'trailer';
  language: string;
  seasonNumber?: number;
}

export const ShowDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // Active season number state
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | null>(null);

  // Global audio language preference for episodes ('all' | 'en' | 'hi')
  const [globalLanguagePreference, setGlobalLanguagePreference] = useState<string>('en');

  // Video player modal state
  const [activePlay, setActivePlay] = useState<ActivePlayState | null>(null);

  const {
    data: show,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['catalog-show', slug],
    queryFn: () => (slug ? catalogApi.getShow(slug) : Promise.reject(new Error('No slug provided'))),
    enabled: !!slug,
  });

  if (isLoading) {
    return <ShowDetailSkeleton />;
  }

  if (isError || !show) {
    return (
      <div style={{ paddingTop: '100px', minHeight: '80vh' }} className="content-container">
        <EmptyState
          icon="📺"
          title="Show Not Found"
          description={extractErrorMessage(error)}
          actionText="Browse Shows"
          actionHref="/"
        />
      </div>
    );
  }

  const seasons = show.seasons || [];
  const trailers = show.trailers || [];

  // Determine active season: user selected or first available season
  const currentSeason =
    (selectedSeasonNumber !== null
      ? seasons.find((s) => s.season_number === selectedSeasonNumber)
      : null) || seasons[0];

  // Handler to play Episode 1 from the Hero CTA
  const handlePlayEpisode1 = () => {
    const firstSeason = seasons[0];
    const firstEpisode = firstSeason?.episodes?.[0];
    if (firstEpisode) {
      const preferredLang =
        firstEpisode.languages.find(
          (l) => l.language.toLowerCase() === globalLanguagePreference.toLowerCase()
        )?.language ||
        firstEpisode.languages[0]?.language ||
        'en';

      setActivePlay({
        item: firstEpisode,
        itemType: 'episode',
        language: preferredLang,
        seasonNumber: firstSeason.season_number,
      });
    }
  };

  // Handler to play Trailer from the Hero CTA
  const handlePlayHeroTrailer = () => {
    if (trailers.length > 0) {
      setActivePlay({
        item: trailers[0],
        itemType: 'trailer',
        language: trailers[0].languages?.[0]?.language || 'en',
        seasonNumber: 0,
      });
    }
  };

  // Handler to play a specific episode
  const handlePlayEpisode = (episode: CatalogueEpisode, language: string) => {
    setActivePlay({
      item: episode,
      itemType: 'episode',
      language,
      seasonNumber: currentSeason?.season_number ?? 1,
    });
  };

  // Handler to play a specific trailer
  const handlePlayTrailer = (trailer: CatalogueEpisode) => {
    setActivePlay({
      item: trailer,
      itemType: 'trailer',
      language: trailer.languages?.[0]?.language || 'en',
      seasonNumber: 0,
    });
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* ── 1. Hero Banner ──────────────────────────────────────────────── */}
      <ShowHero
        show={show}
        onPlayEpisode1={handlePlayEpisode1}
        onPlayTrailer={trailers.length > 0 ? handlePlayHeroTrailer : undefined}
      />

      {/* ── 2. Main Show Content (Seasons, Episodes, Language Bar) ──────── */}
      <div className="content-container" style={{ marginTop: '2.5rem' }}>
        {/* Global Language Preference Bar & Season Selector Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: '1.75rem',
          }}
        >
          {/* Season Selector Tabs */}
          {seasons.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {seasons.map((s) => {
                const active = (currentSeason?.season_number ?? 1) === s.season_number;
                return (
                  <button
                    key={s.season_number}
                    type="button"
                    onClick={() => setSelectedSeasonNumber(s.season_number)}
                    style={{
                      padding: '0.55rem 1.25rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-sm)',
                      background: active
                        ? 'linear-gradient(135deg, var(--color-primary), #4f46e5)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: active ? '#ffffff' : 'var(--color-text-secondary)',
                      border: '1px solid',
                      borderColor: active ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.08)',
                      boxShadow: active ? '0 4px 12px var(--color-primary-glow)' : 'none',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    Season {s.season_number}
                    {s.title ? ` — ${s.title}` : ''}
                  </button>
                );
              })}
            </div>
          ) : (
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Episodes
            </span>
          )}

          {/* Audio Language Preference Control */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Audio Track:
            </span>
            <button
              type="button"
              onClick={() => setGlobalLanguagePreference('en')}
              style={{
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                background:
                  globalLanguagePreference === 'en'
                    ? 'rgba(59, 130, 246, 0.25)'
                    : 'transparent',
                color: globalLanguagePreference === 'en' ? '#93c5fd' : 'var(--color-text-secondary)',
                border: '1px solid',
                borderColor:
                  globalLanguagePreference === 'en'
                    ? 'rgba(59, 130, 246, 0.5)'
                    : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              🇬🇧 English
            </button>
            <button
              type="button"
              onClick={() => setGlobalLanguagePreference('hi')}
              style={{
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                background:
                  globalLanguagePreference === 'hi'
                    ? 'rgba(249, 115, 22, 0.25)'
                    : 'transparent',
                color: globalLanguagePreference === 'hi' ? '#fdba74' : 'var(--color-text-secondary)',
                border: '1px solid',
                borderColor:
                  globalLanguagePreference === 'hi'
                    ? 'rgba(249, 115, 22, 0.5)'
                    : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              🇮🇳 हिन्दी (Hindi)
            </button>
          </div>
        </div>

        {/* ── 3. Episodes Grid ────────────────────────────────────────────── */}
        {currentSeason && currentSeason.episodes.length > 0 ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
              }}
            >
              <h3 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 700 }}>
                Season {currentSeason.season_number} Episodes ({currentSeason.episodes.length})
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Select an audio language below to customize stream
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {currentSeason.episodes.map((ep) => (
                <EpisodeCard
                  key={ep.content_group}
                  episode={ep}
                  globalLanguagePreference={globalLanguagePreference}
                  onPlay={handlePlayEpisode}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p style={{ color: 'var(--color-text-secondary)' }}>
              No episodes currently available for this season.
            </p>
          </div>
        )}

        {/* ── 4. Dedicated Trailers & Teasers Section (Season 0) ──────────── */}
        <TrailerSection trailers={trailers} onPlayTrailer={handlePlayTrailer} />

        {/* ── 5. Bottom Navigation Shortcut ──────────────────────────────── */}
        <div
          style={{
            marginTop: '4rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <Link
            to="/"
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            ← Back to Home Catalogue
          </Link>

          <Link
            to="/search"
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-primary)',
              fontWeight: 600,
            }}
          >
            🔍 Explore All Shows & Categories →
          </Link>
        </div>
      </div>

      {/* ── 6. Full-Featured Video Player Modal (Streaming Stub) ────────── */}
      {activePlay && (
        <VideoPlayerModal
          isOpen={true}
          onClose={() => setActivePlay(null)}
          showTitle={show.title}
          itemTitle={activePlay.item.title}
          itemType={activePlay.itemType}
          episodeNumber={activePlay.item.episode_number}
          seasonNumber={activePlay.seasonNumber}
          durationSeconds={activePlay.item.duration_seconds}
          contentGroup={activePlay.item.content_group}
          availableLanguages={activePlay.item.languages.map((l) => ({
            language: l.language,
            title: l.title,
            duration_seconds: l.duration_seconds,
          }))}
          initialLanguage={activePlay.language}
          thumbnailUrl={activePlay.item.artwork.thumbnail}
        />
      )}
    </div>
  );
};
