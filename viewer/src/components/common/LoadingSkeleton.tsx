import React from 'react';

export const HeroSkeleton: React.FC = () => (
  <div
    style={{
      position: 'relative',
      width: '100%',
      minHeight: '65vh',
      display: 'flex',
      alignItems: 'flex-end',
      padding: '4rem 2.5rem',
      backgroundColor: '#0e1422',
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        maxWidth: '600px',
        width: '100%',
        zIndex: 2,
      }}
    >
      <div className="skeleton" style={{ width: '120px', height: '24px' }} />
      <div className="skeleton" style={{ width: '80%', height: '48px', borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ width: '100%', height: '20px' }} />
      <div className="skeleton" style={{ width: '70%', height: '20px' }} />
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <div className="skeleton" style={{ width: '140px', height: '44px', borderRadius: 'var(--radius-sm)' }} />
        <div className="skeleton" style={{ width: '140px', height: '44px', borderRadius: 'var(--radius-sm)' }} />
      </div>
    </div>
  </div>
);

export const RowSkeleton: React.FC = () => (
  <div style={{ marginBottom: '2.5rem' }}>
    <div className="skeleton" style={{ width: '220px', height: '28px', marginBottom: '1rem' }} />
    <div style={{ display: 'flex', gap: '1.25rem', overflow: 'hidden' }}>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            flex: '0 0 200px',
            aspectRatio: '2/3',
            borderRadius: 'var(--radius-md)',
          }}
        />
      ))}
    </div>
  </div>
);
