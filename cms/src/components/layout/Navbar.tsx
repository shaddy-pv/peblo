import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../ui/Badge';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const getPageTitle = (path: string): { title: string; subtitle: string } => {
    if (path.startsWith('/shows')) {
      return { title: 'Shows & Episodes', subtitle: 'Manage series, seasons, episodes, and upload required artwork' };
    }
    if (path.startsWith('/publish')) {
      return { title: 'Publish Center', subtitle: 'Audit database blockers, trigger publication, and view historical runs' };
    }
    if (path.startsWith('/validation')) {
      return { title: 'Publish-Readiness Validation Report', subtitle: 'Actionable breakdown of blockers and quality warnings' };
    }
    return { title: 'Peblo Content Operations', subtitle: 'Internal Media Streaming Pipeline' };
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div>
        <h2 style={{ fontSize: '1.15rem', color: '#fff' }}>{title}</h2>
        <p style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)' }}>{subtitle}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <a
          href="http://localhost:3001"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            fontWeight: 600,
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#a5b4fc',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            transition: 'all 0.15s ease',
          }}
          title="Open Public Viewer OTT App"
        >
          <span>📺</span>
          <span>Live OTT App ↗</span>
        </a>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span>Role Scope:</span>
          <Badge role={user?.role} />
        </div>
      </div>
    </header>
  );
};
