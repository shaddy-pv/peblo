import React from 'react';

export const LoadingSpinner: React.FC<{ label?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  label = 'Loading...',
  size = 'md',
}) => {
  const pixelSize = size === 'sm' ? '1rem' : size === 'lg' ? '2.5rem' : '1.75rem';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
        gap: '0.85rem',
        color: 'var(--color-text-secondary)',
      }}
    >
      <div
        className="spinner"
        style={{
          width: pixelSize,
          height: pixelSize,
          borderWidth: size === 'sm' ? '2px' : '3px',
          borderColor: 'var(--color-primary-subtle)',
          borderTopColor: 'var(--color-primary)',
        }}
      />
      {label && <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{label}</span>}
    </div>
  );
};

export const Skeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}> = ({ width = '100%', height = '1.25rem', borderRadius = 'var(--radius-sm)', style }) => {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};
