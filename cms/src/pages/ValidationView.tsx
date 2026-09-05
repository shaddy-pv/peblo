import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';

export const ValidationView: React.FC = () => {
  const { data: report, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['validation-report'],
    queryFn: adminApi.getValidationReport,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', color: '#fff' }}>Catalogue Validation Breakdown</h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            Identifies blocking data issues and localization warnings across all shows and episodes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="outline" size="sm" onClick={() => refetch()} isLoading={isLoading}>
            Re-run Validation
          </Button>
          <Link to="/publish">
            <Button variant="primary" size="sm">
              Back to Publish Center
            </Button>
          </Link>
        </div>
      </div>

      {isLoading && <LoadingSpinner label="Auditing catalogue issues..." />}

      {isError && (
        <Alert type="danger" title="Validation Engine Offline">
          {error instanceof Error ? error.message : 'Could not fetch validation report.'}
        </Alert>
      )}

      {!isLoading && report && (
        <>
          {/* Summary Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Card>
              <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                PUBLISH STATUS
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.35rem' }}>
                {report.can_publish ? (
                  <span style={{ color: 'var(--color-success)' }}>✅ Ready to Release</span>
                ) : (
                  <span style={{ color: 'var(--color-danger)' }}>⛔ Release Blocked</span>
                )}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                BLOCKING ISSUES
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-danger)', marginTop: '0.25rem' }}>
                {report.blockers.length}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                QUALITY WARNINGS
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.25rem' }}>
                {report.warnings.length}
              </div>
            </Card>
          </div>

          {/* Grouped By Show Breakdown */}
          {Object.entries(report.grouped_by_show).map(([showTitle, issues]) => (
            <Card key={showTitle}>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🎬</span>
                  <CardTitle>{showTitle}</CardTitle>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {issues.filter((i) => i.severity === 'blocker').length > 0 && (
                    <Badge severity="blocker">
                      {issues.filter((i) => i.severity === 'blocker').length} Blocker(s)
                    </Badge>
                  )}
                  {issues.filter((i) => i.severity === 'warning').length > 0 && (
                    <Badge severity="warning">
                      {issues.filter((i) => i.severity === 'warning').length} Warning(s)
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor:
                          issue.severity === 'blocker' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                        border: `1px solid ${
                          issue.severity === 'blocker' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'
                        }`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Badge severity={issue.severity} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                            {issue.category.replace('_', ' ')}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                          {issue.entity_type} {issue.episode_id ? `ep: ${issue.episode_title || ''}` : ''}
                        </span>
                      </div>

                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff', marginBottom: '0.35rem' }}>
                        {issue.message}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        👉 <strong>Actionable fix:</strong> {issue.action_needed}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};
