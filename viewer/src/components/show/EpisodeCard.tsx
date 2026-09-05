import React, { useState } from 'react';
import { ArtworkImage } from '../common/ArtworkImage';
import type { CatalogueEpisode } from '../../types';

interface EpisodeCardProps {
  episode: CatalogueEpisode;
  globalLanguagePreference: string;
  onPlay: (episode: CatalogueEpisode, language: string) => void;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  globalLanguagePreference,
  onPlay,
}) => {
  const languages = episode.languages || [];

  const [localLangOverride, setLocalLangOverride] = useState<string | null>(null);
  const [prevGlobalPref, setPrevGlobalPref] = useState<string>(globalLanguagePreference);

  // Sync if global language preference changes
  if (prevGlobalPref !== globalLanguagePreference) {
    setPrevGlobalPref(globalLanguagePreference);
    setLocalLangOverride(null);
  }

  // Determine active language
  const selectedLang = (() => {
    if (localLangOverride) return localLangOverride;
    if (globalLanguagePreference !== 'all') {
      const match = languages.find(
        (l) => l.language.toLowerCase() === globalLanguagePreference.toLowerCase()
      );
      if (match) return match.language;
    }
    return languages[0]?.language || 'en';
  })();

  // Active language variant details
  const activeVariant =
    languages.find((l) => l.language.toLowerCase() === selectedLang.toLowerCase()) ||
    languages[0];

  const currentTitle = activeVariant?.title || episode.title;
  const currentDuration = activeVariant?.duration_seconds ?? episode.duration_seconds;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
  };

  return (
    <div
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.45)';
        e.currentTarget.style.boxShadow = '0 12px 24px -6px rgba(0, 0, 0, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* 16:9 Thumbnail Container */}
      <div
        style={{
          position: 'relative',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
        onClick={() => onPlay(episode, selectedLang)}
      >
        <ArtworkImage
          src={episode.artwork.thumbnail}
          alt={currentTitle}
          aspectRatio="16/9"
          fallbackIcon="🎬"
        />

        {/* Duration Overlay Badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {formatDuration(currentDuration)}
        </div>

        {/* Hover Play Button Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.3)',
            opacity: 0,
            transition: 'opacity 0.2s ease',
          }}
          className="episode-play-overlay"
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.6)',
            }}
          >
            ▶
          </div>
        </div>
      </div>

      {/* Episode Content Info */}
      <div
        style={{
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          flex: 1,
        }}
      >
        {/* Header Row: Episode Number + Group ID */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: 'var(--color-primary)',
              letterSpacing: '0.05em',
            }}
          >
            EPISODE {episode.episode_number.toString().padStart(2, '0')}
          </span>

          <span
            style={{
              fontSize: '0.68rem',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
            title={`Content Group ID: ${episode.content_group}`}
          >
            grp:{episode.content_group.slice(0, 8)}
          </span>
        </div>

        {/* Localized Episode Title */}
        <h4
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.35,
            minHeight: '2.7rem',
          }}
          title={currentTitle}
        >
          {currentTitle}
        </h4>

        {/* Language Options Switcher for Grouped Episode */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              AUDIO TRACK:
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-cyan)', fontWeight: 700 }}>
              {selectedLang.toUpperCase() === 'EN' ? 'English' : selectedLang.toUpperCase() === 'HI' ? 'हिन्दी (Hindi)' : selectedLang.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {languages.map((variant) => {
              const isSelected = variant.language.toLowerCase() === selectedLang.toLowerCase();
              return (
                <button
                  key={variant.language}
                  type="button"
                  onClick={() => setLocalLangOverride(variant.language)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: isSelected
                      ? 'var(--color-primary)'
                      : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: isSelected
                      ? 'rgba(99, 102, 241, 0.25)'
                      : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#c7d2fe' : 'var(--color-text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                  title={`Switch to ${variant.language.toUpperCase()}: ${variant.title}`}
                >
                  {variant.language.toUpperCase() === 'EN'
                    ? '🇬🇧 EN'
                    : variant.language.toUpperCase() === 'HI'
                    ? '🇮🇳 HI'
                    : variant.language.toUpperCase()}
                </button>
              );
            })}

            {/* Direct Play Button */}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onPlay(episode, selectedLang)}
              style={{
                marginLeft: 'auto',
                padding: '0.3rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              ▶ Play
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
