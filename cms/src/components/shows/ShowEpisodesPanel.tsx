import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonsApi, episodesApi, extractErrorMessage } from '../../api/client';
import type { Show, Season, Episode } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { LoadingSpinner } from '../ui/Loading';
import { EmptyState } from '../ui/EmptyState';
import { SeasonFormModal } from './SeasonFormModal';
import { EpisodeFormModal } from '../episodes/EpisodeFormModal';

interface ShowEpisodesPanelProps {
  show: Show;
  onClose: () => void;
}

export const ShowEpisodesPanel: React.FC<ShowEpisodesPanelProps> = ({ show, onClose }) => {
  const queryClient = useQueryClient();

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [isAddSeasonOpen, setIsAddSeasonOpen] = useState(false);
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch seasons for this show
  const {
    data: seasons = [],
    isLoading: loadingSeasons,
    error: seasonsError,
    refetch: refetchSeasons,
  } = useQuery({
    queryKey: ['seasons', show.id],
    queryFn: async () => {
      const list = await seasonsApi.getSeasonsForShow(show.id);
      return list.sort((a, b) => a.season_number - b.season_number);
    },
  });

  // Set default active season once loaded
  const currentSeasonId =
    activeSeasonId || (seasons.length > 0 ? seasons[0].id : null);

  // 2. Fetch episodes for this show (optionally filtered by season)
  const {
    data: episodesData,
    isLoading: loadingEpisodes,
    error: episodesError,
    refetch: refetchEpisodes,
  } = useQuery({
    queryKey: ['episodes', { show_id: show.id, season_id: currentSeasonId }],
    queryFn: () =>
      episodesApi.getEpisodes({
        show_id: show.id,
        season_id: currentSeasonId || undefined,
        page_size: 100,
      }),
    enabled: !!show.id,
  });

  const episodes = episodesData?.items || [];

  // Delete episode mutation
  const deleteEpisodeMutation = useMutation({
    mutationFn: (id: string) => episodesApi.deleteEpisode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      setActionError(null);
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  // Delete season mutation
  const deleteSeasonMutation = useMutation({
    mutationFn: (id: string) => seasonsApi.deleteSeason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons', show.id] });
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      setActiveSeasonId(null);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  const handleDeleteEpisode = (ep: Episode) => {
    if (confirm(`Are you sure you want to delete episode "${ep.title}" (${ep.language.toUpperCase()})?`)) {
      deleteEpisodeMutation.mutate(ep.id);
    }
  };

  const handleDeleteSeason = (season: Season) => {
    if (
      confirm(
        `Are you sure you want to delete Season ${season.season_number}? All episodes in this season will be deleted.`
      )
    ) {
      deleteSeasonMutation.mutate(season.id);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem 1.5rem',
        marginTop: '0.75rem',
        marginBottom: '1rem',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>
              🎬 Episode Management: <span style={{ color: 'var(--color-primary)' }}>{show.title}</span>
            </h3>
            <Badge status={show.status} />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            Manage seasons, trailers (Season 0), language variants (English/Hindi), durations, and thumbnails.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddSeasonOpen(true)}
          >
            + Add Season
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingEpisode(null);
              setIsEpisodeModalOpen(true);
            }}
            disabled={seasons.length === 0}
          >
            + Add Episode
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            ✕ Close
          </Button>
        </div>
      </div>

      {actionError && (
        <Alert type="danger" title="Operation Failed">
          {actionError}
        </Alert>
      )}

      {/* Seasons Tab Bar */}
      {loadingSeasons ? (
        <LoadingSpinner label="Loading seasons..." />
      ) : seasonsError ? (
        <Alert type="danger" title="Could not load seasons">
          {extractErrorMessage(seasonsError)}
          <Button variant="secondary" size="sm" onClick={() => refetchSeasons()} style={{ marginLeft: '0.5rem' }}>
            Retry
          </Button>
        </Alert>
      ) : seasons.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No Seasons Yet"
          description="This show doesn't have any seasons configured. Create Season 0 for Trailers or Season 1 to start adding episodes."
          action={
            <Button variant="primary" size="sm" onClick={() => setIsAddSeasonOpen(true)}>
              + Create First Season
            </Button>
          }
        />
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              overflowX: 'auto',
              paddingBottom: '0.6rem',
              marginBottom: '1rem',
              borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
            }}
          >
            {seasons.map((s) => {
              const isActive = s.id === currentSeasonId;
              const isTrailers = s.season_number === 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSeasonId(s.id)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: isActive ? 'var(--color-primary-subtle)' : 'var(--color-bg-surface)',
                    color: isActive ? '#fff' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>{isTrailers ? '🎥 Season 0 (Trailers)' : `Season ${s.season_number}`}</span>
                  {s.title && !isTrailers && (
                    <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>({s.title})</span>
                  )}
                </button>
              );
            })}

            {/* Delete current season action */}
            {currentSeasonId && (
              <button
                type="button"
                onClick={() => {
                  const s = seasons.find((x) => x.id === currentSeasonId);
                  if (s) handleDeleteSeason(s);
                }}
                title="Delete this season"
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                }}
              >
                🗑️ Delete Season
              </button>
            )}
          </div>

          {/* Episode Listing Table for Selected Season */}
          {loadingEpisodes ? (
            <LoadingSpinner label="Loading episodes..." />
          ) : episodesError ? (
            <Alert type="danger" title="Could not load episodes">
              {extractErrorMessage(episodesError)}
              <Button variant="secondary" size="sm" onClick={() => refetchEpisodes()} style={{ marginLeft: '0.5rem' }}>
                Retry
              </Button>
            </Alert>
          ) : episodes.length === 0 ? (
            <EmptyState
              icon="🎬"
              title="No Episodes in This Season"
              description="Click '+ Add Episode' above to add the first episode and upload its 16:9 thumbnail artwork."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingEpisode(null);
                    setIsEpisodeModalOpen(true);
                  }}
                >
                  + Add Episode Now
                </Button>
              }
            />
          ) : (
            <div className="table-container" style={{ background: 'var(--color-bg-app)' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Ep #</th>
                    <th>Title & Content Group</th>
                    <th>Lang</th>
                    <th>Duration</th>
                    <th>Thumbnail Artwork</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {episodes.map((ep) => {
                    const hasThumb =
                      ep.has_artwork ||
                      (ep.artwork_available && ep.artwork_available.includes('thumbnail')) ||
                      !!ep.artwork?.thumbnail;

                    const formattedDuration = ep.duration_seconds
                      ? `${Math.floor(ep.duration_seconds / 60)}m ${ep.duration_seconds % 60}s`
                      : null;

                    return (
                      <tr key={ep.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)', width: '60px' }}>
                          #{ep.episode_number}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{ep.title}</div>
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--color-text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              marginTop: '0.15rem',
                            }}
                          >
                            <span style={{ color: 'var(--color-text-muted)' }}>group:</span>
                            <span
                              style={{
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: '#a5b4fc',
                                padding: '0.05rem 0.35rem',
                                borderRadius: '4px',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {ep.content_group}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background:
                                ep.language === 'en'
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : 'rgba(249, 115, 22, 0.15)',
                              color: ep.language === 'en' ? '#60a5fa' : '#fb923c',
                              border: `1px solid ${
                                ep.language === 'en' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(249, 115, 22, 0.3)'
                              }`,
                            }}
                          >
                            {ep.language}
                          </span>
                        </td>
                        <td>
                          {formattedDuration ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>
                              ⏱️ {formattedDuration}
                            </span>
                          ) : (
                            <span
                              className="badge badge-warning"
                              title="P3 Flaw: Episode missing duration prevents publishing"
                            >
                              ⚠️ None
                            </span>
                          )}
                        </td>
                        <td>
                          {hasThumb ? (
                            <span className="badge badge-success">✓ 16:9 Thumbnail</span>
                          ) : (
                            <span
                              className="badge badge-danger"
                              title="P2 Flaw: Missing thumbnail prevents publishing"
                            >
                              ⚠️ Missing Thumbnail
                            </span>
                          )}
                        </td>
                        <td>
                          <Badge status={ep.status} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingEpisode(ep);
                                setIsEpisodeModalOpen(true);
                              }}
                            >
                              ✏️ Edit & Art
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteEpisode(ep)}
                            >
                              🗑️
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Season Form Modal */}
      <SeasonFormModal
        isOpen={isAddSeasonOpen}
        onClose={() => setIsAddSeasonOpen(false)}
        showId={show.id}
        existingSeasonNumbers={seasons.map((s) => s.season_number)}
        onCreated={(newSeason) => {
          refetchSeasons();
          setActiveSeasonId(newSeason.id);
        }}
      />

      {/* Episode Form Modal */}
      {isEpisodeModalOpen && (
        <EpisodeFormModal
          isOpen={isEpisodeModalOpen}
          onClose={() => setIsEpisodeModalOpen(false)}
          showId={show.id}
          seasons={seasons}
          episodeToEdit={editingEpisode}
          defaultSeasonId={currentSeasonId || undefined}
          onSaved={() => {
            refetchEpisodes();
            queryClient.invalidateQueries({ queryKey: ['shows'] });
          }}
        />
      )}
    </div>
  );
};
