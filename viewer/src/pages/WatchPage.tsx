import React from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogApi, extractErrorMessage } from '../api/client';
import { VideoPlayerCore } from '../components/player/VideoPlayerCore';
import { ArtworkImage } from '../components/common/ArtworkImage';
import { getEpisodeThumbnail } from '../utils/artwork';
import { EmptyState } from '../components/common/EmptyState';
import type { CatalogueEpisode, CatalogueShow } from '../types';

export const WatchPage: React.FC = () => {
  const { contentGroup } = useParams<{ contentGroup: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const showSlug = searchParams.get('show') || '';
  const initialLang = searchParams.get('lang') || 'en';

  // Fetch show details
  const {
    data: show,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['catalog-show-watch', showSlug],
    queryFn: () => (showSlug ? catalogApi.getShow(showSlug) : Promise.reject(new Error('No show slug provided'))),
    enabled: !!showSlug,
  });

  // Also fallback query whole catalogue if showSlug is missing
  const {
    data: catalogue,
    isLoading: isCatalogueLoading,
  } = useQuery({
    queryKey: ['catalogue-watch-fallback'],
    queryFn: () => catalogApi.getCatalogue(),
    enabled: !showSlug,
  });

  // Locate the show if showSlug was omitted
  const activeShow: CatalogueShow | undefined =
    show ||
    (catalogue
      ? Object.values(catalogue.sections)
          .flat()
          .find((s) =>
            s.seasons?.some((season) =>
              season.episodes?.some((ep) => ep.content_group === contentGroup)
            ) ||
            s.trailers?.some((tr) => tr.content_group === contentGroup)
          )
      : undefined);

  // Find the episode and its season
  let currentEpisode: CatalogueEpisode | undefined;
  let currentSeasonNumber = 1;
  let allSeasonEpisodes: CatalogueEpisode[] = [];

  if (activeShow) {
    // Check regular seasons
    for (const season of activeShow.seasons || []) {
      const found = season.episodes?.find((ep) => ep.content_group === contentGroup);
      if (found) {
        currentEpisode = found;
        currentSeasonNumber = season.season_number;
        allSeasonEpisodes = season.episodes || [];
        break;
      }
    }

    // Check trailers (Season 0)
    if (!currentEpisode && activeShow.trailers) {
      const foundTrailer = activeShow.trailers.find((tr) => tr.content_group === contentGroup);
      if (foundTrailer) {
        currentEpisode = foundTrailer;
        currentSeasonNumber = 0;
        allSeasonEpisodes = activeShow.trailers;
      }
    }
  }

  // Handle switching episode directly from sidebar
  const handleSelectEpisode = (ep: CatalogueEpisode, lang: string) => {
    setSearchParams({
      show: activeShow?.slug || '',
      lang,
    });
    navigate(`/watch/${ep.content_group}?show=${activeShow?.slug || ''}&lang=${lang}`);
  };

  if (isLoading || isCatalogueLoading) {
    return (
      <div style={{ minHeight: '85vh', paddingTop: '80px' }} className="content-container">
        <div className="skeleton" style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (isError || !activeShow || !currentEpisode) {
    return (
      <div style={{ minHeight: '85vh', paddingTop: '100px' }} className="content-container">
        <EmptyState
          icon="📺"
          title="Video Stream Unavailable"
          description={
            !activeShow
              ? 'Could not locate the associated show in the published catalogue.'
              : extractErrorMessage(error) || 'The requested episode content group could not be found.'
          }
          actionText="Back to Shows"
          actionHref="/"
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#070a12', paddingBottom: '5rem' }}>
      {/* ── Top Navigation Bar ───────────────────────────────────────────── */}
      <div
        style={{
          padding: '1rem 2rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(11, 15, 25, 0.85)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to={`/show/${activeShow.slug}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.15s ease',
            }}
          >
            ← Exit Cinema Mode
          </Link>

          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {activeShow.title} •{' '}
            <span style={{ color: '#fff', fontWeight: 700 }}>
              {currentSeasonNumber === 0
                ? `Trailer: ${currentEpisode.title}`
                : `S${currentSeasonNumber} : E${currentEpisode.episode_number} — ${currentEpisode.title}`}
            </span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
            {activeShow.section.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-emerald)',
              background: 'var(--color-emerald-subtle)',
              padding: '0.2rem 0.55rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
            }}
          >
            🛡️ Safe Kids Stream
          </span>
        </div>
      </div>

      {/* ── Cinema Video Player Screen ──────────────────────────────────── */}
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 1.5rem 0 1.5rem' }}>
        <VideoPlayerCore
          showTitle={activeShow.title}
          showSlug={activeShow.slug}
          currentEpisode={currentEpisode}
          seasonNumber={currentSeasonNumber}
          allSeasonEpisodes={allSeasonEpisodes}
          trailers={activeShow.trailers}
          initialLanguage={initialLang}
          onSelectEpisode={handleSelectEpisode}
          isCinemaMode={true}
        />
      </div>

      {/* ── Main Layout: Details & Season Binge Drawer ──────────────────── */}
      <div
        className="content-container"
        style={{
          marginTop: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
        }}
      >
        {/* Left Column: Show Metadata & Synopsis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-primary">
                {currentSeasonNumber === 0 ? 'TRAILER' : `SEASON ${currentSeasonNumber}`}
              </span>
              {activeShow.categories?.map((c) => (
                <span key={c} className="badge badge-cyan">
                  #{c}
                </span>
              ))}
            </div>

            <h2 style={{ fontSize: '1.6rem', color: '#fff', fontWeight: 800 }}>
              {activeShow.title}
            </h2>

            <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginTop: '0.25rem', fontWeight: 700 }}>
              {currentSeasonNumber === 0
                ? currentEpisode.title
                : `Episode ${currentEpisode.episode_number}: ${currentEpisode.title}`}
            </h3>
          </div>

          {activeShow.synopsis && (
            <p style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              {activeShow.synopsis}
            </p>
          )}

          {/* Episode Audio Variants Breakdown */}
          <div
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <h4 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '0.75rem', fontWeight: 700 }}>
              Available Audio Tracks ({currentEpisode.languages?.length || 1})
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {currentEpisode.languages?.map((lang) => (
                <div
                  key={lang.language}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      className={`badge ${lang.language === 'en' ? 'badge-lang-en' : 'badge-lang-hi'}`}
                      style={{ fontWeight: 800 }}
                    >
                      {lang.language.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                      {lang.title}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {lang.duration_seconds}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Season Binge Drawer */}
        <div
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: '680px',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
              {currentSeasonNumber === 0
                ? 'All Trailers & Teasers'
                : `Season ${currentSeasonNumber} Episodes (${allSeasonEpisodes.length})`}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Click to switch stream
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {allSeasonEpisodes.map((ep) => {
              const isCurrent = ep.content_group === currentEpisode?.content_group;
              return (
                <div
                  key={ep.content_group}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-md)',
                    background: isCurrent
                      ? 'rgba(99, 102, 241, 0.15)'
                      : 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid',
                    borderColor: isCurrent
                      ? 'var(--color-primary)'
                      : 'rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => handleSelectEpisode(ep, initialLang)}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: '100px',
                      flexShrink: 0,
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <ArtworkImage
                      src={getEpisodeThumbnail(ep.content_group, ep.artwork.thumbnail)}
                      alt={ep.title}
                      aspectRatio="16/9"
                      fallbackIcon="🎬"
                    />
                    {isCurrent && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(99, 102, 241, 0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                        }}
                      >
                        PLAYING
                      </div>
                    )}
                  </div>

                  {/* Title & Duration */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: isCurrent ? 'var(--color-cyan)' : 'var(--color-primary)',
                        }}
                      >
                        EP {ep.episode_number}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: isCurrent ? 800 : 600,
                        color: isCurrent ? '#ffffff' : '#cbd5e1',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={ep.title}
                    >
                      {ep.title}
                    </span>

                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      ⏱️ {Math.floor(ep.duration_seconds / 60)}m {ep.duration_seconds % 60}s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
