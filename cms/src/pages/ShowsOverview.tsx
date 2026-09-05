import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { showsApi } from '../api/client';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

export const ShowsOverview: React.FC = () => {
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['shows', { search, section: sectionFilter, status: statusFilter }],
    queryFn: () =>
      showsApi.getShows({
        search: search || undefined,
        section: sectionFilter || undefined,
        status: statusFilter || undefined,
        page_size: 50,
      }),
  });

  const shows = data?.items || [];
  const publishedCount = shows.filter((s) => s.status === 'published').length;
  const draftCount = shows.filter((s) => s.status === 'draft').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Metric Summary Cards ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            TOTAL SHOWS
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginTop: '0.25rem' }}>
            {isLoading ? '...' : data?.total ?? 0}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            PUBLISHED SHOWS
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem' }}>
            {isLoading ? '...' : publishedCount}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            DRAFT / IN-PROGRESS
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.25rem' }}>
            {isLoading ? '...' : draftCount}
          </div>
        </Card>
      </div>

      {/* ── Content Table & Controls ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Catalog Content Library</CardTitle>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
              Filter by section, status, or search titles across the catalogue.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/publish">
              <Button variant="secondary" size="sm">
                🚀 Publish Center
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters Bar */}
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
              placeholder="Search shows by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="form-input"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
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
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ flex: '0 1 160px' }}
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>

            {(search || sectionFilter || statusFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSectionFilter('');
                  setStatusFilter('');
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Loading, Error, or Table */}
          {isLoading && <LoadingSpinner label="Loading catalogue shows..." />}

          {isError && (
            <Alert type="danger" title="Failed to load shows">
              {error instanceof Error ? error.message : 'Could not connect to API server.'}
              <div style={{ marginTop: '0.5rem' }}>
                <Button variant="secondary" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            </Alert>
          )}

          {!isLoading && !isError && shows.length === 0 && (
            <EmptyState
              icon="📺"
              title="No Shows Found"
              description="No shows matched your current filter criteria or the database is unseeded."
            />
          )}

          {!isLoading && !isError && shows.length > 0 && (
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
                  </tr>
                </thead>
                <tbody>
                  {shows.map((show) => (
                    <tr key={show.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{show.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>/{show.slug}</div>
                      </td>
                      <td>
                        {show.section ? (
                          <span className="badge badge-neutral">{show.section}</span>
                        ) : (
                          <span className="badge badge-danger" title="Deliberate flaw P1: Missing section">
                            ⚠️ None
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {show.categories?.map((cat) => (
                            <span key={cat} style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
