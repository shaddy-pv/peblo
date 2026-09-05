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

export const PublishCenter: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [publishMessage, setPublishMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // 1. Fetch live validation report
  const {
    data: report,
    isLoading: reportLoading,
    isError: reportError,
    error: reportErr,
    refetch: refetchReport,
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
  } = useQuery({
    queryKey: ['publish-runs'],
    queryFn: () => adminApi.getPublishRuns(10),
  });

  // 3. Publish Mutation
  const publishMutation = useMutation({
    mutationFn: adminApi.publishCatalog,
    onSuccess: (res) => {
      setPublishMessage({
        type: 'success',
        text: `Published successfully! ${res.shows_count} shows, ${res.episodes_count} episodes.`,
      });
      queryClient.invalidateQueries({ queryKey: ['publish-runs'] });
      queryClient.invalidateQueries({ queryKey: ['validation-report'] });
    },
    onError: (err) => {
      setPublishMessage({
        type: 'danger',
        text: `Publication failed: ${extractErrorMessage(err)}`,
      });
    },
  });

  const blockersCount = report?.blockers.length ?? 0;
  const warningsCount = report?.warnings.length ?? 0;
  const canPublish = report?.can_publish ?? false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ── Publish Readiness Banner ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Catalogue Publish Readiness</CardTitle>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              Validates entire database integrity before writing the public viewer catalogue atomically.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchReport()} isLoading={reportLoading}>
            🔄 Refresh Audit
          </Button>
        </CardHeader>

        <CardContent>
          {reportLoading && <LoadingSpinner label="Auditing database publish integrity..." />}

          {reportError && (
            <Alert type="danger" title="Validation Engine Unreachable">
              {reportErr instanceof Error ? reportErr.message : 'Could not fetch publish report.'}
            </Alert>
          )}

          {publishMessage && (
            <Alert type={publishMessage.type} title={publishMessage.type === 'success' ? 'Published' : 'Publish Error'}>
              {publishMessage.text}
            </Alert>
          )}

          {!reportLoading && report && (
            <div>
              {/* Readiness Status Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: canPublish ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
                  border: `1px solid ${canPublish ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{canPublish ? '🟢' : '🔴'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>
                        {canPublish ? 'Catalogue Ready to Publish' : 'Publication Blocked by Validation Errors'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        {canPublish
                          ? 'Zero blocking errors detected. Live catalogue can be atomically promoted.'
                          : `${blockersCount} blocker(s) and ${warningsCount} warning(s) preventing release.`}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Link to="/validation">
                    <Button variant="outline" size="sm">
                      Inspect Details ({blockersCount + warningsCount})
                    </Button>
                  </Link>

                  {/* Publish Trigger (strictly role & blocker gated) */}
                  <Button
                    variant="primary"
                    disabled={!isAdmin || !canPublish || publishMutation.isPending}
                    isLoading={publishMutation.isPending}
                    onClick={() => publishMutation.mutate()}
                  >
                    🚀 Publish Live Catalogue
                  </Button>
                </div>
              </div>

              {/* Role explanation if not admin */}
              {!isAdmin && (
                <Alert type="warning" title="Editor Permission Scope">
                  You are logged in as <strong>{user?.username}</strong> (role: <code>{user?.role}</code>).
                  Editors can manage content and view reports, but only <strong>Admin</strong> users are
                  authorized to execute <code>POST /admin/catalog/publish</code>.
                </Alert>
              )}
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
              Chronological log of all publication attempts, outcomes, and metrics.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchRuns()} isLoading={runsLoading}>
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {runsLoading && <LoadingSpinner label="Loading run logs..." />}

          {!runsLoading && runs && runs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              No publish runs have been executed yet.
            </div>
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
                    <th>Details</th>
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
                        <span style={{ fontWeight: 600 }}>{run.actor_username || 'system'}</span>
                      </td>
                      <td>{run.shows_count}</td>
                      <td>{run.episodes_count}</td>
                      <td>{run.language_variants_count}</td>
                      <td style={{ fontSize: '0.775rem', color: 'var(--color-text-secondary)' }}>
                        {run.error_message || (run.catalogue_path ? 'Atomic replace OK' : '—')}
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
