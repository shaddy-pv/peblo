import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi, extractErrorMessage } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';
import type { ValidationIssue } from '../types';

export const PublishCenter: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [publishMessage, setPublishMessage] = useState<{
    type: 'success' | 'danger';
    title: string;
    text: string;
    metrics?: { shows: number; episodes: number; variants: number; runId: string };
  } | null>(null);

  const [activeIssueFilter, setActiveIssueFilter] = useState<'all' | 'blockers' | 'warnings'>('blockers');
  const [issueSearch, setIssueSearch] = useState('');

  // 1. Fetch live validation report
  const {
    data: report,
    isLoading: reportLoading,
    isError: reportError,
    error: reportErr,
    refetch: refetchReport,
    isFetching: reportFetching,
  } = useQuery({
    queryKey: ['validation-report'],
    queryFn: adminApi.getValidationReport,
    refetchInterval: 30000,
  });

  // 2. Fetch publish runs audit history
  const {
    data: runs,
    isLoading: runsLoading,
    refetch: refetchRuns,
    isFetching: runsFetching,
  } = useQuery({
    queryKey: ['publish-runs'],
    queryFn: () => adminApi.getPublishRuns(15),
  });

  // 3. Publish Mutation (POST /admin/catalog/publish)
  const publishMutation = useMutation({
    mutationFn: adminApi.publishCatalog,
    onSuccess: (res) => {
      setPublishMessage({
        type: 'success',
        title: 'Live Catalogue Published Successfully!',
        text: `Atomic publication completed. Published catalogue now live for viewer service.`,
        metrics: {
          shows: res.shows_count,
          episodes: res.episodes_count,
          variants: res.language_variants_count,
          runId: res.run_id,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['publish-runs'] });
      queryClient.invalidateQueries({ queryKey: ['validation-report'] });
    },
    onError: (err) => {
      setPublishMessage({
        type: 'danger',
        title: 'Publication Failed',
        text: extractErrorMessage(err),
      });
    },
  });

  const blockers = report?.blockers ?? [];
  const warnings = report?.warnings ?? [];
  const blockersCount = blockers.length;
  const warningsCount = warnings.length;
  const canPublish = report?.can_publish ?? false;
  const summary = report?.summary;

  // Extract distinct blocker reasons/categories for explicit reason badges
  const distinctBlockerCategories = Array.from(new Set(blockers.map((b) => b.category)));

  // Filter issues for display
  const displayedIssues: ValidationIssue[] = (
    activeIssueFilter === 'blockers'
      ? blockers
      : activeIssueFilter === 'warnings'
      ? warnings
      : [...blockers, ...warnings]
  ).filter((issue) => {
    if (!issueSearch) return true;
    const query = issueSearch.toLowerCase();
    return (
      issue.message.toLowerCase().includes(query) ||
      issue.category.toLowerCase().includes(query) ||
      (issue.show_title && issue.show_title.toLowerCase().includes(query)) ||
      (issue.episode_title && issue.episode_title.toLowerCase().includes(query)) ||
      issue.action_needed.toLowerCase().includes(query)
    );
  });

  const formatCategoryName = (cat: string) =>
    cat
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ── Summary KPI Cards ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            PUBLISH STATUS
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem' }}>
            {reportLoading ? (
              'Auditing...'
            ) : canPublish ? (
              <span style={{ color: 'var(--color-success)' }}>✅ Ready to Publish</span>
            ) : (
              <span style={{ color: 'var(--color-danger)' }}>⛔ Publish Blocked</span>
            )}
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            {canPublish ? 'Zero release blockers' : `${blockersCount} blocking flaw(s)`}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            SHOWS BREAKDOWN
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginTop: '0.35rem' }}>
            {reportLoading ? '...' : `${summary?.published_shows ?? 0} / ${summary?.total_shows ?? 0}`}
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Published vs Total ({summary?.draft_shows ?? 0} draft)
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            EPISODES BREAKDOWN
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginTop: '0.35rem' }}>
            {reportLoading ? '...' : `${summary?.published_episodes ?? 0} / ${summary?.total_episodes ?? 0}`}
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Published vs Total ({summary?.draft_episodes ?? 0} draft)
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            QUALITY AUDIT
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.35rem' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: blockersCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {blockersCount} Blockers
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-warning)' }}>
              {warningsCount} Warnings
            </span>
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Automated P1–P8 validation engine
          </div>
        </Card>
      </div>

      {/* ── Publish Action Panel with Explicit Reason Badges ────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Catalogue Release Control</CardTitle>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              Promotes approved shows and language-collapsed episodes to the live <code>catalogue.json</code> via atomic rename.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchReport()}
              isLoading={reportFetching}
            >
              🔄 Refresh Audit
            </Button>
            <Link to="/shows">
              <Button variant="secondary" size="sm">
                📺 Content Library
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          {reportLoading && <LoadingSpinner label="Auditing database integrity across shows and episodes..." />}

          {reportError && (
            <Alert type="danger" title="Validation Engine Unreachable">
              {reportErr instanceof Error ? reportErr.message : 'Could not fetch publish readiness report.'}
            </Alert>
          )}

          {publishMessage && (
            <Alert
              type={publishMessage.type}
              title={publishMessage.title}
            >
              <p>{publishMessage.text}</p>
              {publishMessage.metrics && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginTop: '0.5rem',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span>📺 Shows: <strong>{publishMessage.metrics.shows}</strong></span>
                  <span>🎬 Episodes: <strong>{publishMessage.metrics.episodes}</strong></span>
                  <span>🌐 Language Variants: <strong>{publishMessage.metrics.variants}</strong></span>
                  <span>🆔 Run ID: <strong>{publishMessage.metrics.runId.slice(0, 8)}...</strong></span>
                </div>
              )}
            </Alert>
          )}

          {!reportLoading && report && (
            <div>
              {/* Release Gate Box */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: canPublish ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${canPublish ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{canPublish ? '🟢' : '⛔'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff' }}>
                        {canPublish
                          ? 'All Clear: Catalogue Ready for Atomic Publication'
                          : 'Publication Disabled: Release Blockers Detected'}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                        {canPublish
                          ? 'Zero blocking flaws detected. You can safely build and atomically swap the live catalogue.'
                          : `${blockersCount} blocker(s) must be resolved in the CMS before live catalogue can be published.`}
                      </p>
                    </div>
                  </div>

                  {/* Primary Publish Action Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                    <Button
                      variant={canPublish && isAdmin ? 'primary' : 'secondary'}
                      disabled={!isAdmin || !canPublish || publishMutation.isPending}
                      isLoading={publishMutation.isPending}
                      onClick={() => publishMutation.mutate()}
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        cursor: !isAdmin || !canPublish ? 'not-allowed' : 'pointer',
                        opacity: !isAdmin || !canPublish ? 0.6 : 1,
                      }}
                    >
                      🚀 Publish Live Catalogue
                    </Button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      Audit generated: {new Date(report.generated_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* ── EXPLICIT REASON BADGES (when blocked or unauthorized) ── */}
                {(!canPublish || !isAdmin) && (
                  <div
                    style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingTop: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                      Publish Gate Block Reasons:
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                      {/* 1. Role Block Reason */}
                      {!isAdmin && (
                        <span
                          className="badge badge-warning"
                          style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                          title="Only users with role 'admin' can execute live catalogue publish"
                        >
                          🔒 Role Restriction: Editor ({user?.username}) cannot publish — Admin role required
                        </span>
                      )}

                      {/* 2. Validation Blocker Count Badge */}
                      {blockersCount > 0 && (
                        <span
                          className="badge badge-danger"
                          style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                        >
                          ⛔ {blockersCount} Validation Blocker{blockersCount > 1 ? 's' : ''} Active
                        </span>
                      )}

                      {/* 3. Distinct Categorical Blocker Reason Badges */}
                      {distinctBlockerCategories.map((cat) => (
                        <span
                          key={cat}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#fca5a5',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          ⚠️ {formatCategoryName(cat)}
                        </span>
                      ))}
                    </div>

                    {/* Non-Admin Role Helper Banner */}
                    {!isAdmin && (
                      <div style={{ fontSize: '0.8rem', color: '#fde68a', background: 'rgba(245, 158, 11, 0.1)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', marginTop: '0.25rem' }}>
                        💡 <strong>Role Boundary:</strong> You are signed in with the <code>editor</code> role. Content editing (shows, seasons, episodes, artwork) is fully available, but publishing live to production is restricted to <code>admin</code> accounts (e.g. username: <code>admin</code> / password: <code>admin123</code>).
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Real-Time Validation Report Details Panel ────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Publish-Readiness Flaw Inspector</CardTitle>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
              Actionable flaws detected by the validation engine across seed and edited catalogue records.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link to="/validation">
              <Button variant="outline" size="sm">
                🔍 Full Report View
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          {/* Issue Filters & Search */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1rem',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--color-bg-app)', padding: '0.2rem', borderRadius: 'var(--radius-sm)' }}>
              <button
                type="button"
                onClick={() => setActiveIssueFilter('blockers')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeIssueFilter === 'blockers' ? 'var(--color-danger)' : 'transparent',
                  color: activeIssueFilter === 'blockers' ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                ⛔ Blockers ({blockersCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveIssueFilter('warnings')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeIssueFilter === 'warnings' ? 'var(--color-warning)' : 'transparent',
                  color: activeIssueFilter === 'warnings' ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                ⚠️ Warnings ({warningsCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveIssueFilter('all')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeIssueFilter === 'all' ? 'var(--color-primary)' : 'transparent',
                  color: activeIssueFilter === 'all' ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                All Issues ({blockersCount + warningsCount})
              </button>
            </div>

            <input
              type="text"
              className="form-input"
              style={{ flex: '1 1 200px', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              placeholder="Search issues by title, message, or category..."
              value={issueSearch}
              onChange={(e) => setIssueSearch(e.target.value)}
            />

            {issueSearch && (
              <Button variant="outline" size="sm" onClick={() => setIssueSearch('')}>
                Clear
              </Button>
            )}
          </div>

          {/* Issues List */}
          {displayedIssues.length === 0 ? (
            <EmptyState
              icon={activeIssueFilter === 'blockers' ? '🎉' : '✓'}
              title={activeIssueFilter === 'blockers' ? 'No Release Blockers!' : 'No Issues Found'}
              description={
                activeIssueFilter === 'blockers'
                  ? 'All publish validation rules are satisfied. The catalogue can be published.'
                  : 'No issues match your current filter and search query.'
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {displayedIssues.map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    padding: '0.85rem 1.1rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor:
                      issue.severity === 'blocker' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    border: `1px solid ${
                      issue.severity === 'blocker' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'
                    }`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Badge severity={issue.severity} />
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          color: 'var(--color-text-secondary)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {formatCategoryName(issue.category)}
                      </span>
                      {issue.show_title && (
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                          • {issue.show_title}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                        {issue.entity_type} {issue.episode_title ? `"${issue.episode_title}"` : ''}
                      </span>
                      <Link to="/shows">
                        <Button variant="secondary" size="sm">
                          Fix in CMS →
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>
                    {issue.message}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    👉 <strong>Actionable fix:</strong> {issue.action_needed}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Publish Run Audit History ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Historical Publish Runs</CardTitle>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
              Immutable audit log of all publication attempts, outcomes, actors, and catalogue counts.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchRuns()} isLoading={runsFetching}>
            🔄 Refresh History
          </Button>
        </CardHeader>

        <CardContent>
          {runsLoading && <LoadingSpinner label="Loading historical run audit logs..." />}

          {!runsLoading && runs && runs.length === 0 && (
            <EmptyState
              icon="📜"
              title="No Historical Runs Yet"
              description="No catalogue publication runs have been triggered yet. Click 'Publish Live Catalogue' above once all blockers are cleared."
            />
          )}

          {!runsLoading && runs && runs.length > 0 && (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Outcome</th>
                    <th>Actor</th>
                    <th>Shows</th>
                    <th>Episodes</th>
                    <th>Variants</th>
                    <th>Catalogue Storage Path</th>
                    <th>Details / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                        {new Date(run.started_at).toLocaleString()}
                      </td>
                      <td>
                        <Badge status={run.outcome} />
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            fontSize: '0.78rem',
                          }}
                        >
                          👤 {run.actor_username || 'system'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{run.shows_count}</td>
                      <td style={{ fontWeight: 600 }}>{run.episodes_count}</td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)' }}>
                          {run.language_variants_count}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {run.catalogue_path || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.775rem' }}>
                        {run.error_message ? (
                          <span style={{ color: 'var(--color-danger)' }}>❌ {run.error_message}</span>
                        ) : run.outcome === 'success' ? (
                          <span style={{ color: 'var(--color-success)' }}>✓ Atomic write & swap OK</span>
                        ) : (
                          '—'
                        )}
                      </td>
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
