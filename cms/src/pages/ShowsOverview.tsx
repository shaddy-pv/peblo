import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { showsApi, episodesApi, extractErrorMessage } from '../api/client';
import type { Show, Episode } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';
import { ShowFormModal } from '../components/shows/ShowFormModal';
import { ShowEpisodesPanel } from '../components/shows/ShowEpisodesPanel';
import { EpisodeFormModal } from '../components/episodes/EpisodeFormModal';

export const ShowsOverview: React.FC = () => {
  const queryClient = useQueryClient();

  // Active Tab: 'shows' or 'episodes'
  const [activeTab, setActiveTab] = useState<'shows' | 'episodes'>('shows');

  // ── Shows Filter & Pagination State ─────────────────────────────────────────
  const [showSearch, setShowSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPage, setShowPage] = useState(1);
  const showPageSize = 20;

  // ── Episodes Filter & Pagination State ──────────────────────────────────────
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [episodeLangFilter, setEpisodeLangFilter] = useState('');
  const [episodeStatusFilter, setEpisodeStatusFilter] = useState('');
  const [episodePage, setEpisodePage] = useState(1);
  const episodePageSize = 20;

  // ── Modal & Expanded State ──────────────────────────────────────────────────
  const [isCreateShowOpen, setIsCreateShowOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null);

  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  // ── Fetch Shows Query ───────────────────────────────────────────────────────
  const {
    data: showsData,
    isLoading: loadingShows,
    isError: isShowsError,
    error: showsError,
    refetch: refetchShows,
  } = useQuery({
    queryKey: ['shows', { search: showSearch, section: sectionFilter, status: statusFilter, page: showPage }],
    queryFn: () =>
      showsApi.getShows({
        search: showSearch || undefined,
        section: sectionFilter || undefined,
        status: statusFilter || undefined,
        page: showPage,
        page_size: showPageSize,
      }),
  });

  // ── Fetch Episodes Query (for All Episodes tab) ─────────────────────────────
  const {
    data: allEpisodesData,
    isLoading: loadingAllEpisodes,
    isError: isEpisodesError,
    error: episodesQueryError,
    refetch: refetchAllEpisodes,
  } = useQuery({
    queryKey: [
      'episodes',
      { search: episodeSearch, language: episodeLangFilter, status: episodeStatusFilter, page: episodePage },
    ],
    queryFn: () =>
      episodesApi.getEpisodes({
        search: episodeSearch || undefined,
        language: episodeLangFilter || undefined,
        status: episodeStatusFilter || undefined,
        page: episodePage,
        page_size: episodePageSize,
      }),
    enabled: activeTab === 'episodes',
  });

  // Delete show mutation
  const deleteShowMutation = useMutation({
    mutationFn: (id: string) => showsApi.deleteShow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      if (expandedShowId) setExpandedShowId(null);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  const handleDeleteShow = (show: Show) => {
    if (
      confirm(
        `Are you sure you want to delete "${show.title}"? This will also delete all seasons, episodes, and artwork.`
      )
    ) {
      deleteShowMutation.mutate(show.id);
    }
  };

  const shows = showsData?.items || [];
  const totalShows = showsData?.total ?? 0;
  const totalShowPages = showsData?.pages || Math.ceil(totalShows / showPageSize) || 1;

  const episodes = allEpisodesData?.items || [];
  const totalEpisodes = allEpisodesData?.total ?? 0;
  const totalEpisodePages = allEpisodesData?.pages || Math.ceil(totalEpisodes / episodePageSize) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Metric Summary Cards ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            TOTAL SHOWS
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginTop: '0.25rem' }}>
            {loadingShows ? '...' : totalShows}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            SECTIONS COVERED
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
            4 / 4
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
            Featured, Series, Minisodes, Songs
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            QUICK ACTIONS
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="primary" size="sm" onClick={() => setIsCreateShowOpen(true)}>
              + New Show
            </Button>
            <Link to="/publish">
              <Button variant="secondary" size="sm">
                🚀 Publish Center
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {actionError && (
        <Alert type="danger" title="Operation Error">
          {actionError}
        </Alert>
      )}

      {/* ── Main Content Container with Tabs ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Catalogue Content Management</CardTitle>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
              Manage shows, seasons, language-variant episodes (English/Hindi), and validated artwork slots.
            </p>
          </div>

          {/* Primary Tab Switcher */}
          <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--color-bg-app)', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('shows')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'shows' ? 'var(--color-primary)' : 'transparent',
                color: activeTab === 'shows' ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              📺 Shows Library ({totalShows})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('episodes')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'episodes' ? 'var(--color-primary)' : 'transparent',
                color: activeTab === 'episodes' ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              🎬 All Episodes Search
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: SHOWS LIBRARY                                              */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'shows' && (
            <div>
              {/* Shows Filters Bar */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: '1 1 240px' }}
                  placeholder="Search shows by title or synopsis..."
                  value={showSearch}
                  onChange={(e) => {
                    setShowSearch(e.target.value);
                    setShowPage(1);
                  }}
                />

                <select
                  className="form-input"
                  value={sectionFilter}
                  onChange={(e) => {
                    setSectionFilter(e.target.value);
                    setShowPage(1);
                  }}
                  style={{ flex: '0 1 160px' }}
                >
                  <option value="">All Sections</option>
                  <option value="featured">Featured</option>
                  <option value="series">Series</option>
                  <option value="minisodes">Minisodes</option>
                  <option value="songs">Songs</option>
                </select>

                <select
                  className="form-input"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setShowPage(1);
                  }}
                  style={{ flex: '0 1 160px' }}
                >
                  <option value="">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>

                {(showSearch || sectionFilter || statusFilter) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowSearch('');
                      setSectionFilter('');
                      setStatusFilter('');
                      setShowPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}

                <div style={{ marginLeft: 'auto' }}>
                  <Button variant="primary" size="sm" onClick={() => setIsCreateShowOpen(true)}>
                    + Create Show
                  </Button>
                </div>
              </div>

              {/* Loading, Error, or Table */}
              {loadingShows && <LoadingSpinner label="Loading catalogue shows..." />}

              {isShowsError && (
                <Alert type="danger" title="Failed to load shows">
                  {showsError instanceof Error ? showsError.message : 'Could not connect to API server.'}
                  <div style={{ marginTop: '0.5rem' }}>
                    <Button variant="secondary" size="sm" onClick={() => refetchShows()}>
                      Retry
                    </Button>
                  </div>
                </Alert>
              )}

              {!loadingShows && !isShowsError && shows.length === 0 && (
                <EmptyState
                  icon="📺"
                  title="No Shows Found"
                  description="No shows matched your filter criteria."
                  action={
                    <Button variant="primary" size="sm" onClick={() => setIsCreateShowOpen(true)}>
                      + Create First Show
                    </Button>
                  }
                />
              )}

              {!loadingShows && !isShowsError && shows.length > 0 && (
                <div>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Title & Slug</th>
                          <th>Section</th>
                          <th>Categories</th>
                          <th>Status</th>
                          <th>Seasons</th>
                          <th>Episodes</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shows.map((show) => {
                          const isExpanded = expandedShowId === show.id;
                          return (
                            <React.Fragment key={show.id}>
                              <tr style={{ background: isExpanded ? 'rgba(99, 102, 241, 0.08)' : undefined }}>
                                <td>
                                  <div style={{ fontWeight: 600, color: '#fff' }}>{show.title}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    /{show.slug}
                                  </div>
                                </td>
                                <td>
                                  {show.section ? (
                                    <span className="badge badge-neutral">{show.section}</span>
                                  ) : (
                                    <span className="badge badge-danger" title="P1 Flaw: Missing section prevents publishing">
                                      ⚠️ Missing Section
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    {show.categories?.map((cat) => (
                                      <span
                                        key={cat}
                                        style={{
                                          fontSize: '0.7rem',
                                          color: 'var(--color-text-secondary)',
                                          background: 'rgba(255, 255, 255, 0.04)',
                                          padding: '0.1rem 0.35rem',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        #{cat}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td>
                                  <Badge status={show.status} />
                                </td>
                                <td>{show.seasons_count ?? '—'}</td>
                                <td>{show.episodes_count ?? '—'}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                    <Button
                                      variant={isExpanded ? 'primary' : 'secondary'}
                                      size="sm"
                                      onClick={() => setExpandedShowId(isExpanded ? null : show.id)}
                                      title="Manage seasons and episodes"
                                    >
                                      🎬 Episodes {isExpanded ? '▲' : '▼'}
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => setEditingShow(show)}
                                      title="Edit show details and upload poster/banner artwork"
                                    >
                                      ✏️ Edit & Art
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteShow(show)}
                                      title="Delete show"
                                    >
                                      🗑️
                                    </Button>
                                  </div>
                                </td>
                              </tr>

                              {/* Inline Expanded Season & Episode Manager */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={7} style={{ padding: '0.5rem 1rem 1rem 1rem', background: 'rgba(15, 23, 42, 0.4)' }}>
                                    <ShowEpisodesPanel
                                      show={show}
                                      onClose={() => setExpandedShowId(null)}
                                    />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Shows Pagination */}
                  <div className="pagination">
                    <div>
                      Showing {(showPage - 1) * showPageSize + 1} –{' '}
                      {Math.min(showPage * showPageSize, totalShows)} of {totalShows} shows
                    </div>
                    <div className="pagination-controls">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={showPage <= 1}
                        onClick={() => setShowPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <span style={{ padding: '0 0.5rem', fontWeight: 600 }}>
                        Page {showPage} of {totalShowPages}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={showPage >= totalShowPages}
                        onClick={() => setShowPage((p) => Math.min(totalShowPages, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: ALL EPISODES DIRECT SEARCH                                */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'episodes' && (
            <div>
              {/* Episode Filters Bar */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: '1 1 240px' }}
                  placeholder="Search episodes by title or content_group..."
                  value={episodeSearch}
                  onChange={(e) => {
                    setEpisodeSearch(e.target.value);
                    setEpisodePage(1);
                  }}
                />

                <select
                  className="form-input"
                  value={episodeLangFilter}
                  onChange={(e) => {
                    setEpisodeLangFilter(e.target.value);
                    setEpisodePage(1);
                  }}
                  style={{ flex: '0 1 150px' }}
                >
                  <option value="">All Languages</option>
                  <option value="en">English (en)</option>
                  <option value="hi">Hindi (hi)</option>
                </select>

                <select
                  className="form-input"
                  value={episodeStatusFilter}
                  onChange={(e) => {
                    setEpisodeStatusFilter(e.target.value);
                    setEpisodePage(1);
                  }}
                  style={{ flex: '0 1 150px' }}
                >
                  <option value="">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>

                {(episodeSearch || episodeLangFilter || episodeStatusFilter) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEpisodeSearch('');
                      setEpisodeLangFilter('');
                      setEpisodeStatusFilter('');
                      setEpisodePage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {loadingAllEpisodes && <LoadingSpinner label="Searching episodes..." />}

              {isEpisodesError && (
                <Alert type="danger" title="Failed to search episodes">
                  {episodesQueryError instanceof Error ? episodesQueryError.message : 'Could not query episodes.'}
                  <div style={{ marginTop: '0.5rem' }}>
                    <Button variant="secondary" size="sm" onClick={() => refetchAllEpisodes()}>
                      Retry
                    </Button>
                  </div>
                </Alert>
              )}

              {!loadingAllEpisodes && !isEpisodesError && episodes.length === 0 && (
                <EmptyState
                  icon="🎬"
                  title="No Episodes Found"
                  description="No episodes match your search or filter parameters."
                />
              )}

              {!loadingAllEpisodes && !isEpisodesError && episodes.length > 0 && (
                <div>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Ep #</th>
                          <th>Title & Content Group</th>
                          <th>Language</th>
                          <th>Duration</th>
                          <th>Thumbnail Slot</th>
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
                                    title="P3 Flaw: Missing duration prevents publishing"
                                  >
                                    ⚠️ Missing
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
                                    ⚠️ No Artwork
                                  </span>
                                )}
                              </td>
                              <td>
                                <Badge status={ep.status} />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setEditingEpisode(ep);
                                    setIsEpisodeModalOpen(true);
                                  }}
                                >
                                  ✏️ Edit & Thumbnail
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Episodes Pagination */}
                  <div className="pagination">
                    <div>
                      Showing {(episodePage - 1) * episodePageSize + 1} –{' '}
                      {Math.min(episodePage * episodePageSize, totalEpisodes)} of {totalEpisodes} episodes
                    </div>
                    <div className="pagination-controls">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={episodePage <= 1}
                        onClick={() => setEpisodePage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <span style={{ padding: '0 0.5rem', fontWeight: 600 }}>
                        Page {episodePage} of {totalEpisodePages}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={episodePage >= totalEpisodePages}
                        onClick={() => setEpisodePage((p) => Math.min(totalEpisodePages, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Show Create & Edit Modal ──────────────────────────────────────── */}
      {(isCreateShowOpen || editingShow) && (
        <ShowFormModal
          isOpen={isCreateShowOpen || !!editingShow}
          onClose={() => {
            setIsCreateShowOpen(false);
            setEditingShow(null);
          }}
          showToEdit={editingShow}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['shows'] });
          }}
        />
      )}

      {/* ── Episode Edit Modal (when editing directly from All Episodes tab) ── */}
      {isEpisodeModalOpen && editingEpisode && (
        <EpisodeFormModal
          isOpen={isEpisodeModalOpen}
          onClose={() => {
            setIsEpisodeModalOpen(false);
            setEditingEpisode(null);
          }}
          showId=""
          seasons={[]}
          episodeToEdit={editingEpisode}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['episodes'] });
          }}
        />
      )}
    </div>
  );
};
