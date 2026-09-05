import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArtworkImage } from '../common/ArtworkImage';
import type { CatalogueEpisode, CatalogueLanguageVariant } from '../../types';

// ── Official Peblo TV YouTube Playlists & Video ID Mappings ───────────────────
// 1. Full Episodes: https://www.youtube.com/playlist?list=PLUG63jhqdZpg_9xv8Xovh5qRU9da-vYu_
// 2. Songs of Peblo: https://www.youtube.com/playlist?list=PLUG63jhqdZpjiQ8W-MmqU9BkhHq1umI6T
// 3. Moti's Many Lives: https://www.youtube.com/watch?v=4Nqx6mKTGr4&list=PLUG63jhqdZpgrfh6X7izxSth2sBvNwZS0
const YOUTUBE_VIDEO_MAP: Record<string, string> = {
  // Moti's Many Lives
  'motis-many-lives-s00e01': 'uLLJ9vYAeWw', // Trailer: Moti in Rajasthan
  'motis-many-lives-s01e01': '1p7HEhdzVf4', // Episode 1: Moti in Rajasthan
  'motis-many-lives-s01e02': 'xzZXcwVwz3s', // Episode 2: Moti in Himachal
  'motis-many-lives-s01e03': 'LnldPitDTwU', // Episode 3: Moti in Haryana
  // Tiny Tales By Banyan Dadi
  'tiny-tales-banyan-dadi-s00e01': '2Fg4uuMtKj4',
  'tiny-tales-banyan-dadi-s01e01': '2Fg4uuMtKj4', // Episode 1: Fox And Swan
  'tiny-tales-banyan-dadi-s01e02': 'qk4ne7yJbh0', // Episode 2: Sparrow Cousins
  'tiny-tales-banyan-dadi-s01e03': 'wBOYwcYs87g', // Episode 3: Otter and The River
  // Songs of Peblo (Rhyme Rangers)
  'rhyme-rangers-s01e01': '4Nqx6mKTGr4', // Intro Song
  'rhyme-rangers-s01e02': 'ZDlcI80eAp0', // Run Hero Run
  'rhyme-rangers-s01e03': '9JfeF9ZDZtI', // Basera Song
  'rhyme-rangers-s01e04': 'qAxH_87WvGk', // Wherever the water goes
  'rhyme-rangers-s01e05': 'hUK37R55IQY', // Birds of a Feather
};

const PLAYLIST_POOL = [
  '1p7HEhdzVf4', 'xzZXcwVwz3s', 'LnldPitDTwU', '2Fg4uuMtKj4',
  'qk4ne7yJbh0', 'wBOYwcYs87g', '4Nqx6mKTGr4', 'ZDlcI80eAp0',
  '9JfeF9ZDZtI', 'qAxH_87WvGk', 'hUK37R55IQY', 'uLLJ9vYAeWw'
];

function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export interface VideoPlayerCoreProps {
  showTitle: string;
  showSlug?: string;
  currentEpisode: CatalogueEpisode;
  seasonNumber?: number;
  allSeasonEpisodes?: CatalogueEpisode[];
  trailers?: CatalogueEpisode[];
  initialLanguage?: string;
  onSelectEpisode?: (episode: CatalogueEpisode, language: string) => void;
  onClose?: () => void;
  isCinemaMode?: boolean;
  onToggleCinemaMode?: () => void;
}

export const VideoPlayerCore: React.FC<VideoPlayerCoreProps> = ({
  showTitle,
  currentEpisode,
  seasonNumber = 1,
  allSeasonEpisodes = [],
  initialLanguage = 'en',
  onSelectEpisode,
  onClose,
  isCinemaMode = false,
  onToggleCinemaMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const languages: CatalogueLanguageVariant[] = currentEpisode.languages || [];

  // YouTube streaming states
  const [useYouTubePlayer, setUseYouTubePlayer] = useState<boolean>(true);
  const [customVideoId, setCustomVideoId] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);

  // Clear custom override when active episode changes
  const [prevContentGroup, setPrevContentGroup] = useState<string>(currentEpisode.content_group);
  if (prevContentGroup !== currentEpisode.content_group) {
    setPrevContentGroup(currentEpisode.content_group);
    setCustomVideoId(null);
  }

  const resolvedYouTubeId = (() => {
    if (customVideoId) return customVideoId;
    if (YOUTUBE_VIDEO_MAP[currentEpisode.content_group]) {
      return YOUTUBE_VIDEO_MAP[currentEpisode.content_group];
    }
    const hash = currentEpisode.content_group
      .split('')
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return PLAYLIST_POOL[hash % PLAYLIST_POOL.length];
  })();

  // Active language state
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialLanguage);
  const [prevInitialLanguage, setPrevInitialLanguage] = useState<string>(initialLanguage);

  if (prevInitialLanguage !== initialLanguage) {
    setPrevInitialLanguage(initialLanguage);
    setSelectedLanguage(initialLanguage);
  }

  // Active variant details
  const activeVariant =
    languages.find((l) => l.language.toLowerCase() === selectedLanguage.toLowerCase()) ||
    languages[0];

  const displayTitle = activeVariant?.title || currentEpisode.title;
  const totalDuration = (activeVariant?.duration_seconds ?? currentEpisode.duration_seconds) || 240;

  // Player playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(false);
  const [showArchitectureInfo, setShowArchitectureInfo] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Next episode autoplay countdown state
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);

  // Hide controls after inactivity when playing
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, [isPlaying]);

  // Find next episode in the season
  const currentIndex = allSeasonEpisodes.findIndex(
    (ep) => ep.content_group === currentEpisode.content_group
  );
  const nextEpisode =
    currentIndex >= 0 && currentIndex < allSeasonEpisodes.length - 1
      ? allSeasonEpisodes[currentIndex + 1]
      : null;

  // Real simulated playback ticker
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 1 * playbackRate;
        if (next >= totalDuration) {
          setIsPlaying(false);
          // Trigger next countdown if next episode exists
          if (nextEpisode) {
            setNextCountdown(5);
          }
          return totalDuration;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, playbackRate, totalDuration, nextEpisode]);

  // Autoplay countdown timer (asynchronously advances inside setTimeout)
  useEffect(() => {
    if (nextCountdown === null) return;

    const timer = setTimeout(() => {
      if (nextCountdown <= 1) {
        if (nextEpisode && onSelectEpisode) {
          onSelectEpisode(nextEpisode, selectedLanguage);
        }
        setCurrentTime(0);
        setIsPlaying(true);
        setNextCountdown(null);
      } else {
        setNextCountdown((prev) => (prev !== null ? prev - 1 : null));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [nextCountdown, nextEpisode, onSelectEpisode, selectedLanguage]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard Shortcuts (Space, M, F, Left, Right, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          resetControlsTimeout();
          break;
        case 'KeyM':
          e.preventDefault();
          setIsMuted((prev) => !prev);
          resetControlsTimeout();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentTime((prev) => Math.max(0, prev - 5));
          resetControlsTimeout();
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentTime((prev) => Math.min(totalDuration, prev + 5));
          resetControlsTimeout();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else if (onClose) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalDuration, isFullscreen, onClose, resetControlsTimeout, toggleFullscreen]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    setCurrentTime(Math.round(percent * totalDuration));
    if (nextCountdown !== null) setNextCountdown(null);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Subtitle captions text based on time
  const getSimulatedCaption = () => {
    if (!subtitlesEnabled) return null;
    if (currentTime < 10) return '♪ [Playful cheerful theme song playing] ♪';
    if (currentTime < 25) return `Hello friends! Welcome to ${showTitle}!`;
    if (currentTime < 50) return 'Today we are going on an exciting adventure!';
    if (currentTime < 80) return 'Can you see what is hidden behind the colorful trees?';
    if (currentTime < 120) return 'Look, over there! Let us work together to solve this puzzle.';
    return '♪ [Whimsical melody continues] ♪';
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#000000',
        borderRadius: isFullscreen || isCinemaMode ? 0 : 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.9)',
        userSelect: 'none',
      }}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
    >
      {/* ── 1. Video Canvas Container (16:9) ──────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: isFullscreen ? undefined : '16/9',
          height: isFullscreen ? '100vh' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: showControls ? 'default' : 'none',
        }}
        onClick={() => !useYouTubePlayer && setIsPlaying(!isPlaying)}
      >
        {/* Real YouTube Video Stream Embed */}
        {useYouTubePlayer ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              backgroundColor: '#000',
            }}
          >
            <iframe
              key={resolvedYouTubeId}
              src={`https://www.youtube-nocookie.com/embed/${resolvedYouTubeId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
              title={displayTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        ) : (
          <>
            {/* Backdrop Artwork Image with Animated Breathing Zoom when playing */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: isPlaying ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 8s ease, opacity 0.4s ease',
                opacity: isPlaying ? 0.38 : 0.65,
              }}
            >
              <ArtworkImage
                src={currentEpisode.artwork.thumbnail}
                alt={displayTitle}
                aspectRatio="16/9"
                fallbackIcon="🎬"
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {/* Atmospheric Radial Gradient Light */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at center, rgba(99, 102, 241, 0.18) 0%, rgba(11, 15, 25, 0.7) 65%, rgba(0, 0, 0, 0.95) 100%)',
              }}
            />

            {/* Center Play/Pause Graphic Indicator */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                opacity: showControls || !isPlaying ? 1 : 0,
                transition: 'opacity 0.3s ease',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: 'var(--radius-full)',
                  background: isPlaying
                    ? 'linear-gradient(135deg, var(--color-primary), #4f46e5)'
                    : 'rgba(255, 255, 255, 0.22)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  color: '#fff',
                  boxShadow: isPlaying ? '0 0 35px rgba(99, 102, 241, 0.7)' : '0 8px 24px rgba(0,0,0,0.5)',
                  transform: isPlaying ? 'scale(1)' : 'scale(0.95)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isPlaying ? '▶' : '⏸'}
              </div>

              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  background: 'rgba(11, 15, 25, 0.75)',
                  backdropFilter: 'blur(8px)',
                  padding: '0.25rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  letterSpacing: '0.04em',
                }}
              >
                {isPlaying ? `STREAMING • ${playbackRate}x` : 'PAUSED'}
              </div>
            </div>

            {/* Simulated On-Screen Closed Captions (Subtitles) */}
            {subtitlesEnabled && getSimulatedCaption() && (
              <div
                style={{
                  position: 'absolute',
                  bottom: showControls ? '85px' : '40px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 4,
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  padding: '0.4rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fef08a',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  maxWidth: '85%',
                  border: '1px solid rgba(254, 240, 138, 0.25)',
                }}
              >
                {getSimulatedCaption()}
              </div>
            )}
          </>
        )}

        {/* Autoplay Up-Next Modal Overlay */}
        {nextCountdown !== null && nextEpisode && (
          <div
            style={{
              position: 'absolute',
              bottom: '90px',
              right: '25px',
              zIndex: 10,
              background: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1.1rem 1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px var(--color-primary-glow)',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                UP NEXT IN {nextCountdown}s
              </span>
              <button
                type="button"
                onClick={() => setNextCountdown(null)}
                style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#fff' }}>
              Ep {nextEpisode.episode_number}: {nextEpisode.title}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (onSelectEpisode) {
                    onSelectEpisode(nextEpisode, selectedLanguage);
                    setCurrentTime(0);
                    setIsPlaying(true);
                    setNextCountdown(null);
                  }
                }}
              >
                ▶ Watch Now
              </button>
              <button
                type="button"
                className="btn btn-glass btn-sm"
                onClick={() => setNextCountdown(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Top Header Overlay (Title & Quick Actions) ──────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 5,
            padding: '1.25rem 1.75rem',
            background:
              'linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: showControls || !isPlaying ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                S{seasonNumber} : E{currentEpisode.episode_number}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>
                {showTitle}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-emerald)',
                  background: 'var(--color-emerald-subtle)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                }}
              >
                🛡️ Safe Kids Stream
              </span>
            </div>
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: 800 }}>
              {displayTitle}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* YouTube Stream Mode Toggle */}
            <button
              type="button"
              onClick={() => setUseYouTubePlayer(!useYouTubePlayer)}
              style={{
                background: useYouTubePlayer
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#fff',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: useYouTubePlayer ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none',
              }}
              title="Toggle between real YouTube video stream and simulated OTT canvas"
            >
              <span>▶</span> {useYouTubePlayer ? 'YouTube: ON' : 'YouTube: OFF'}
            </button>

            {/* Custom YouTube Link Input Trigger */}
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              style={{
                background: showUrlInput ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#fff',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              title="Paste any YouTube video or playlist link to play in this player"
            >
              <span>🔗</span> Custom YT URL
            </button>

            {/* Streaming Architecture Info Toggle */}
            <button
              type="button"
              onClick={() => setShowArchitectureInfo(!showArchitectureInfo)}
              style={{
                background: showArchitectureInfo ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#fff',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              title="View Media Streaming Architecture & Protocol Specs"
            >
              <span>📡</span> Architecture Specs
            </button>

            {/* Cinema Mode Toggle (if callback provided) */}
            {onToggleCinemaMode && (
              <button
                type="button"
                onClick={onToggleCinemaMode}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  color: '#fff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isCinemaMode ? '🗗 Standard View' : '🗖 Cinema Mode'}
              </button>
            )}

            {/* Close Button (if in modal) */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close video player"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Floating Custom YouTube URL Dialog Banner */}
        {showUrlInput && (
          <div
            style={{
              position: 'absolute',
              top: '75px',
              left: '1.5rem',
              right: '1.5rem',
              zIndex: 20,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: '1.1rem' }}>📺</span>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste any YouTube video or playlist URL (e.g. https://www.youtube.com/watch?v=...)"
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.45rem 0.85rem',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const id = extractYouTubeId(inputUrl);
                  if (id) {
                    setCustomVideoId(id);
                    setUseYouTubePlayer(true);
                    setShowUrlInput(false);
                  }
                }
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                const id = extractYouTubeId(inputUrl);
                if (id) {
                  setCustomVideoId(id);
                  setUseYouTubePlayer(true);
                  setShowUrlInput(false);
                }
              }}
            >
              Play Video
            </button>
            <button
              type="button"
              className="btn btn-glass btn-sm"
              onClick={() => setShowUrlInput(false)}
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Bottom Controls Bar ─────────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 5,
            padding: '1.5rem 1.75rem 1rem 1.75rem',
            background:
              'linear-gradient(0deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.75) 50%, transparent 100%)',
            display: useYouTubePlayer ? 'none' : 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            opacity: showControls || !isPlaying ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Interactive Timeline Scrubber Bar */}
          <div
            style={{
              position: 'relative',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'height 0.15s ease',
            }}
            onClick={handleSeek}
            onMouseEnter={(e) => {
              e.currentTarget.style.height = '12px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.height = '8px';
            }}
          >
            {/* Elapsed Fill Bar */}
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #6366f1, #38bdf8)',
                borderRadius: '4px',
                position: 'relative',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.8)',
              }}
            >
              {/* Scrubber Thumb Knob */}
              <div
                style={{
                  position: 'absolute',
                  right: '-6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 0 8px rgba(0, 0, 0, 0.7)',
                }}
              />
            </div>
          </div>

          {/* Lower Control Bar Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            {/* Left Controls: Play, Back 10s, Fwd 10s, Volume, Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                style={{ color: '#fff', fontSize: '1.25rem', cursor: 'pointer' }}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              <button
                type="button"
                onClick={() => setCurrentTime((p) => Math.max(0, p - 5))}
                style={{ color: '#cbd5e1', fontSize: '1rem', cursor: 'pointer' }}
                title="Rewind 5s (Left Arrow)"
              >
                ↺ 5s
              </button>

              <button
                type="button"
                onClick={() => setCurrentTime((p) => Math.min(totalDuration, p + 5))}
                style={{ color: '#cbd5e1', fontSize: '1rem', cursor: 'pointer' }}
                title="Forward 5s (Right Arrow)"
              >
                5s ↻
              </button>

              {/* Volume Slider & Mute */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  style={{ color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                >
                  {isMuted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(Number(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  style={{
                    width: '70px',
                    height: '4px',
                    accentColor: 'var(--color-primary)',
                    cursor: 'pointer',
                  }}
                  title={`Volume: ${isMuted ? 0 : volume}%`}
                />
              </div>

              {/* Formatted Elapsed / Duration */}
              <span
                style={{
                  fontSize: '0.825rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#e2e8f0',
                  fontWeight: 600,
                }}
              >
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>

            {/* Right Controls: Audio Tracks, Subtitles, Speed, Fullscreen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Speed Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                {[1, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    style={{
                      padding: '0.2rem 0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: playbackRate === rate ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Subtitles CC Button */}
              <button
                type="button"
                onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                style={{
                  padding: '0.25rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: subtitlesEnabled ? '#fef08a' : 'rgba(255, 255, 255, 0.1)',
                  color: subtitlesEnabled ? '#000000' : '#cbd5e1',
                  border: '1px solid',
                  borderColor: subtitlesEnabled ? '#fef08a' : 'rgba(255, 255, 255, 0.2)',
                }}
                title="Toggle Subtitles / Closed Captions"
              >
                CC
              </button>

              {/* Audio Track Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {languages.map((variant) => {
                  const isSelected = variant.language.toLowerCase() === selectedLanguage.toLowerCase();
                  return (
                    <button
                      key={variant.language}
                      type="button"
                      onClick={() => setSelectedLanguage(variant.language)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: isSelected
                          ? 'var(--color-primary)'
                          : 'rgba(255, 255, 255, 0.15)',
                        background: isSelected
                          ? 'rgba(99, 102, 241, 0.4)'
                          : 'rgba(255, 255, 255, 0.06)',
                        color: isSelected ? '#ffffff' : 'var(--color-text-secondary)',
                      }}
                    >
                      {variant.language.toUpperCase() === 'EN'
                        ? '🇬🇧 EN'
                        : variant.language.toUpperCase() === 'HI'
                        ? '🇮🇳 HI'
                        : variant.language.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                style={{ color: '#fff', fontSize: '1.15rem', cursor: 'pointer' }}
                title="Fullscreen (F)"
              >
                {isFullscreen ? '🗗' : '⛶'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Clearly Documented Media Streaming Architecture Specs Callout ── */}
      {showArchitectureInfo && (
        <div
          style={{
            background: 'linear-gradient(180deg, #0f172a 0%, #0b0f19 100%)',
            borderTop: '1px solid var(--color-border)',
            padding: '1.5rem 2rem',
            color: '#cbd5e1',
            fontSize: '0.85rem',
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>📡</span>
              <h4 style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 800 }}>
                OTT Media Streaming Architecture & Specification Stub
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowArchitectureInfo(false)}
              style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              ✕ Close
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
              marginTop: '1rem',
            }}
          >
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <strong style={{ color: 'var(--color-primary)' }}>1. Adaptive Bitrate Streaming (ABR):</strong>
              <p style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                In production, videos are ingested via FFmpeg into master HLS (<code style={{ color: '#38bdf8' }}>.m3u8</code>) and MPEG-DASH (<code style={{ color: '#38bdf8' }}>.mpd</code>) multi-variant playlists spanning 1080p, 720p, 480p, and 360p renditions.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <strong style={{ color: 'var(--color-cyan)' }}>2. Demuxed Multi-Track Audio:</strong>
              <p style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                Grouped episodes share video elementary streams while dynamically selecting alternate audio track manifests (<code style={{ color: '#38bdf8' }}>#EXT-X-MEDIA:TYPE=AUDIO,LANGUAGE="en"</code> vs <code style={{ color: '#38bdf8' }}>"hi"</code>) without re-buffering video.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <strong style={{ color: 'var(--color-amber)' }}>3. CDN Edge Protection & Token Auth:</strong>
              <p style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                Media segments served from Cloudflare R2 / S3 via Cloudflare CDN Workers with signed URL tokens (<code style={{ color: '#38bdf8' }}>?token=exp</code>) preventing hotlinking and ensuring kid-safe perimeter isolation.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <strong style={{ color: 'var(--color-emerald)' }}>4. Production Player Integration:</strong>
              <p style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                This UI stub maps 1:1 to Shaka Player, Hls.js, or Video.js instances, binding HTML5 Media Events (<code style={{ color: '#38bdf8' }}>timeupdate</code>, <code style={{ color: '#38bdf8' }}>ended</code>, <code style={{ color: '#38bdf8' }}>seeked</code>) directly to the reactive state machine.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
