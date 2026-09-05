import React from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoPlayerCore } from './VideoPlayerCore';
import type { CatalogueEpisode } from '../../types';

export interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  showTitle: string;
  showSlug?: string;
  item: CatalogueEpisode;
  seasonNumber?: number;
  allSeasonEpisodes?: CatalogueEpisode[];
  trailers?: CatalogueEpisode[];
  initialLanguage?: string;
  onSelectEpisode?: (episode: CatalogueEpisode, language: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  showTitle,
  showSlug,
  item,
  seasonNumber = 1,
  allSeasonEpisodes = [],
  trailers = [],
  initialLanguage = 'en',
  onSelectEpisode,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleOpenCinemaMode = () => {
    onClose();
    const query = new URLSearchParams({
      show: showSlug || '',
      lang: initialLanguage,
    }).toString();
    navigate(`/watch/${item.content_group}?${query}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.9)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
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
          maxWidth: '920px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.9), 0 0 30px rgba(99, 102, 241, 0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <VideoPlayerCore
          showTitle={showTitle}
          showSlug={showSlug}
          currentEpisode={item}
          seasonNumber={seasonNumber}
          allSeasonEpisodes={allSeasonEpisodes}
          trailers={trailers}
          initialLanguage={initialLanguage}
          onSelectEpisode={onSelectEpisode}
          onClose={onClose}
          onToggleCinemaMode={showSlug ? handleOpenCinemaMode : undefined}
        />
      </div>
    </div>
  );
};
