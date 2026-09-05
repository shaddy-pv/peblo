import React, { useState, useEffect } from 'react';
import { ArtworkImage } from '../common/ArtworkImage';

export interface VideoPlayerLanguageOption {
  language: string;
  title: string;
  duration_seconds?: number | null;
}

export interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  showTitle: string;
  itemTitle: string;
  itemType: 'episode' | 'trailer';
  episodeNumber?: number;
  seasonNumber?: number;
  durationSeconds: number;
  contentGroup: string;
  availableLanguages: VideoPlayerLanguageOption[];
  initialLanguage: string;
  thumbnailUrl?: string | null;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  showTitle,
  itemTitle,
  itemType,
  episodeNumber,
  seasonNumber,
  durationSeconds,
  contentGroup,
  availableLanguages,
  initialLanguage,
  thumbnailUrl,
}) => {
  const [currentLang, setCurrentLang] = useState<string>(initialLanguage);
  const [prevInitialLanguage, setPrevInitialLanguage] = useState<string>(initialLanguage);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progressPercent, setProgressPercent] = useState<number>(25);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Sync initial language if changed
  if (prevInitialLanguage !== initialLanguage) {
    setPrevInitialLanguage(initialLanguage);
    setCurrentLang(initialLanguage);
  }

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Active language option
  const activeOption =
    availableLanguages.find((l) => l.language.toLowerCase() === currentLang.toLowerCase()) ||
    availableLanguages[0];

  const displayTitle = activeOption ? activeOption.title : itemTitle;
  const activeDuration = (activeOption?.duration_seconds ?? durationSeconds) || 180;
  const elapsedSeconds = Math.round((activeDuration * progressPercent) / 100);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '780px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, transparent 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                {itemType === 'trailer'
                  ? 'TRAILER (SEASON 0)'
                  : `S${seasonNumber ?? 1} : E${episodeNumber ?? 1}`}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                • {showTitle}
              </span>
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
              {displayTitle}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Player"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.color = '#f87171';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            ✕
          </button>
        </div>

        {/* 16:9 Video Canvas Screen */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: '#000000',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {/* Backdrop Thumbnail Art */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: isPlaying ? 0.35 : 0.6,
              transition: 'opacity 0.3s ease',
            }}
          >
            <ArtworkImage
              src={thumbnailUrl}
              alt={displayTitle}
              aspectRatio="16/9"
              fallbackIcon="🎬"
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          {/* Ambient Video Glow */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0.7) 100%)',
            }}
          />

          {/* Play/Pause Center Indicator */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isPlaying
                  ? 'rgba(99, 102, 241, 0.9)'
                  : 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                color: '#fff',
                boxShadow: isPlaying ? '0 0 30px rgba(99, 102, 241, 0.6)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {isPlaying ? '▶' : '⏸'}
            </div>

            <div
              style={{
                fontSize: '0.825rem',
                fontWeight: 700,
                color: '#e2e8f0',
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                letterSpacing: '0.04em',
              }}
            >
              {isPlaying ? 'PLAYING • SIMULATED STREAM' : 'PAUSED'}
            </div>
          </div>

          {/* Bottom Player Overlay Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 3,
              padding: '0.85rem 1.25rem',
              background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.6) 70%, transparent 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Interactive Progress Bar */}
            <div
              style={{
                position: 'relative',
                height: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newPercent = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
                setProgressPercent(newPercent);
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: 'var(--color-primary)',
                  borderRadius: '3px',
                  boxShadow: '0 0 10px rgba(99, 102, 241, 0.8)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    right: '-4px',
                    top: '-3px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                  }}
                />
              </div>
            </div>

            {/* Controls Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{ color: '#fff', fontSize: '1rem', cursor: 'pointer' }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  style={{ color: '#fff', fontSize: '0.95rem', cursor: 'pointer' }}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>

                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                  {formatTime(elapsedSeconds)} / {formatTime(activeDuration)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  TRACK:
                </span>
                <span className={`badge ${currentLang.toLowerCase() === 'en' ? 'badge-lang-en' : 'badge-lang-hi'}`} style={{ fontSize: '0.7rem' }}>
                  {currentLang.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Controls & Audio Track Switcher */}
        <div
          style={{
            padding: '1.1rem 1.5rem',
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {/* Audio Language Variant Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              🎧 Audio Track:
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {availableLanguages.map((variant) => {
                const isSelected = variant.language.toLowerCase() === currentLang.toLowerCase();
                return (
                  <button
                    key={variant.language}
                    type="button"
                    onClick={() => setCurrentLang(variant.language)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
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
                  >
                    {variant.language.toUpperCase() === 'EN'
                      ? '🇬🇧 English'
                      : variant.language.toUpperCase() === 'HI'
                      ? '🇮🇳 हिन्दी (Hindi)'
                      : variant.language.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Child Safe & Group Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              🛡️ Child-Safe Stream
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Group: {contentGroup}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
