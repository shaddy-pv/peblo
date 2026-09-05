import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const Sidebar: React.FC = () => {
  const { user, isAdmin, logout, quickLogin } = useAuth();

  const navItems = [
    { label: 'Shows & Episodes', path: '/shows', icon: '🎬' },
    { label: 'Publish Center', path: '/publish', icon: '🚀' },
    { label: 'Validation Report', path: '/validation', icon: '🛡️' },
  ];

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--color-bg-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* ── Brand Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
        }}
      >
        <div
          style={{
            width: '2.2rem',
            height: '2.2rem',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
          }}
        >
          📺
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#fff' }}>
            Peblo TV
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            INTERNAL CMS
          </div>
        </div>
      </div>

      {/* ── Navigation Links ─────────────────────────────────────────────── */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div
          style={{
            fontSize: '0.685rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            padding: '0.5rem 0.75rem 0.25rem',
            letterSpacing: '0.05em',
          }}
        >
          Platform Operations
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
              border: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            })}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── User & Quick Switcher Footer ─────────────────────────────────── */}
      <div
        style={{
          padding: '1rem',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
        }}
      >
        {/* User Card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                backgroundColor: 'var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: 'var(--color-primary)',
              }}
            >
              {user?.username?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{user?.username}</div>
              <Badge role={user?.role} style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem' }} />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout} title="Sign out" style={{ padding: '0.3rem 0.5rem' }}>
            ↩
          </Button>
        </div>

        {/* Demo Role Switcher (Assessment Ease) */}
        <div
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem',
            fontSize: '0.725rem',
          }}
        >
          <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
            TEST ROLE TOGGLE:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
            <button
              onClick={() => quickLogin('editor')}
              disabled={user?.role === 'editor'}
              style={{
                background: user?.role === 'editor' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                border: user?.role === 'editor' ? '1px solid #3b82f6' : '1px solid var(--color-border)',
                color: user?.role === 'editor' ? '#60a5fa' : 'var(--color-text-secondary)',
                borderRadius: '4px',
                padding: '0.25rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            >
              Staff Editor
            </button>
            <button
              onClick={() => quickLogin('admin')}
              disabled={isAdmin}
              style={{
                background: isAdmin ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                border: isAdmin ? '1px solid #a855f7' : '1px solid var(--color-border)',
                color: isAdmin ? '#c084fc' : 'var(--color-text-secondary)',
                borderRadius: '4px',
                padding: '0.25rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            >
              Lead Admin
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
