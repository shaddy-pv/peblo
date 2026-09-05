import React from 'react';
import { Link } from 'react-router-dom';

const ALL_CATEGORIES = [
  'adventure',
  'folk',
  'friendship',
  'india',
  'language',
  'learning',
  'maths',
  'music',
  'nature',
  'reading',
  'science',
  'singalong',
  'stories',
  'travel',
  'values',
];

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="content-container">
        {/* Categories Cloud */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-secondary)',
              marginBottom: '0.75rem',
            }}
          >
            Explore by Category
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {ALL_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={`/search?category=${cat}`}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  transition: 'all 0.15s ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                #{cat}
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Meta Row */}
        <div className="footer-content">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '1.25rem' }}>📺</span>
              <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>Peblo TV Mini</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: '440px' }}>
              A delightful, safe streaming experience for curious young minds. Binge adventures, learn languages, and explore singalongs.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Strict Architecture: Viewer reads strictly from <code>/catalog</code>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              © {new Date().getFullYear()} Peblo TV Mini. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
