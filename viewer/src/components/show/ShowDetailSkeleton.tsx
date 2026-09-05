import React from 'react';

export const ShowDetailSkeleton: React.FC = () => {
  return (
    <div style={{ minHeight: '80vh', paddingBottom: '4rem' }}>
      {/* Hero Banner Skeleton */}
      <div
        style={{
          position: 'relative',
          minHeight: '52vh',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '6rem 2.5rem 3rem 2.5rem',
          backgroundColor: '#0c111e',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '720px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Breadcrumb & Badges */}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <div className="skeleton" style={{ width: '90px', height: '26px', borderRadius: 'var(--radius-full)' }} />
            <div className="skeleton" style={{ width: '80px', height: '26px', borderRadius: 'var(--radius-full)' }} />
            <div className="skeleton" style={{ width: '70px', height: '26px', borderRadius: 'var(--radius-full)' }} />
          </div>

          {/* Title */}
          <div className="skeleton" style={{ width: '75%', height: '44px', borderRadius: 'var(--radius-md)' }} />

          {/* Synopsis */}
          <div className="skeleton" style={{ width: '100%', height: '18px' }} />
          <div className="skeleton" style={{ width: '90%', height: '18px' }} />
          <div className="skeleton" style={{ width: '60%', height: '18px' }} />

          {/* Stats & CTA */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <div className="skeleton" style={{ width: '140px', height: '42px', borderRadius: 'var(--radius-sm)' }} />
            <div className="skeleton" style={{ width: '130px', height: '42px', borderRadius: 'var(--radius-sm)' }} />
          </div>
        </div>
      </div>

      {/* Content Container Skeleton */}
      <div className="content-container" style={{ marginTop: '2.5rem' }}>
        {/* Season Tabs Skeleton */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          <div className="skeleton" style={{ width: '120px', height: '38px', borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton" style={{ width: '120px', height: '38px', borderRadius: 'var(--radius-sm)' }} />
        </div>

        {/* Episode Grid Skeleton (4 cards) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{
                background: 'var(--color-bg-surface)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="skeleton" style={{ width: '100%', aspectRatio: '16/9' }} />
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div className="skeleton" style={{ width: '80px', height: '16px' }} />
                <div className="skeleton" style={{ width: '90%', height: '20px' }} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: 'var(--radius-full)' }} />
                  <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: 'var(--radius-full)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
