import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';

export const ValidationView: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'blocker' | 'warning'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: report, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['validation-report'],
    queryFn: adminApi.getValidationReport,
  });

  const blockers = report?.blockers ?? [];
  const warnings = report?.warnings ?? [];
  const groupedByShow = report?.grouped_by_show ?? {};

  // Filter shows & issues based on severity and search query
  const filteredGrouped = Object.entries(groupedByShow)
    .map(([showTitle, issues]) => {
      const filteredIssues = issues.filter((issue) => {
        if (severityFilter !== 'all' && issue.severity !== severityFilter) {
          return false;
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            showTitle.toLowerCase().includes(q) ||
            issue.message.toLowerCase().includes(q) ||
            issue.category.toLowerCase().includes(q) ||
            (issue.episode_title && issue.episode_title.toLowerCase().includes(q)) ||
            issue.action_needed.toLowerCase().includes(q)
          );
        }
        return true;
      });
      return [showTitle, filteredIssues] as const;
    })
    .filter(([, issues]) => issues.length > 0);

  const formatCategoryName = (cat: string) =>
    cat
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', color: '#fff' }}>Catalogue Validation Breakdown</h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            Identifies blocking publish issues and localization quality warnings across all shows and episodes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="outline" size="sm" onClick={() => refetch()} isLoading={isFetching}>
            🔄 Re-run Audit
          </Button>
          <Link to="/publish">
            <Button variant="primary" size="sm">
              🚀 Go to Publish Center
            </Button>
          </Link>
        </div>
      </div>

      {isLoading && <LoadingSpinner label="Auditing catalogue issues across database..." />}

      {isError && (
        <Alert type="danger" title="Validation Engine Offline">
          {error instanceof Error ? error.message : 'Could not fetch validation report.'}
        </Alert>
      )}

      {!isLoading && report && (
        <>
          {/* Summary Metric Cards */}
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
              <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                {report.can_publish ? 'No blockers' : `${blockers.length} blockers preventing release`}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                BLOCKING ISSUES
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-danger)', marginTop: '0.25rem' }}>
                {blockers.length}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                P1 (section), P2 (artwork), P3 (duration)
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                QUALITY WARNINGS
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.25rem' }}>
                {warnings.length}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                P4–P5 (casing), P6 (localization)
              </div>
            </Card>
          </div>

          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'center',
              background: 'var(--color-bg-surface)',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--color-bg-app)', padding: '0.2rem', borderRadius: 'var(--radius-sm)' }}>
              <button
                type="button"
                onClick={() => setSeverityFilter('all')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: severityFilter === 'all' ? 'var(--color-primary)' : 'transparent',
                  color: severityFilter === 'all' ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                All Issues ({blockers.length + warnings.length})
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('blocker')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: severityFilter === 'blocker' ? 'var(--color-danger)' : 'transparent',
                  color: severityFilter === 'blocker' ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                ⛔ Blockers Only ({blockers.length})
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('warning')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: severityFilter === 'warning' ? 'var(--color-warning)' : 'transparent',
                  color: severityFilter === 'warning' ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                ⚠️ Warnings Only ({warnings.length})
              </button>
            </div>

            <input
              type="text"
              className="form-input"
              style={{ flex: '1 1 240px', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              placeholder="Search by show title, issue category, or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear
              </Button>
            )}
          </div>

          {/* Grouped Issues by Show */}
          {filteredGrouped.length === 0 ? (
            <EmptyState
              icon={severityFilter === 'blocker' ? '🎉' : '✓'}
              title={severityFilter === 'blocker' ? 'Zero Blockers!' : 'No Issues Found'}
              description={
                severityFilter === 'blocker'
                  ? 'All release validation checks have passed. You are ready to publish.'
                  : 'No issues match your current filter and search query.'
              }
            />
          ) : (
            filteredGrouped.map(([showTitle, issues]) => (
              <Card key={showTitle}>
                <CardHeader>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🎬</span>
                    <CardTitle>{showTitle}</CardTitle>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                    <Link to="/shows">
                      <Button variant="secondary" size="sm">
                        Fix in CMS →
                      </Button>
                    </Link>
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Badge severity={issue.severity} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                              {formatCategoryName(issue.category)}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.725rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                            {issue.entity_type} {issue.episode_title ? `• "${issue.episode_title}"` : ''}
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
            ))
          )}
        </>
      )}
    </div>
  );
};
