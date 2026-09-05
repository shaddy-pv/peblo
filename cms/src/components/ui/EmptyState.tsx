import React from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        border: '1px dashed var(--color-border)',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(30, 41, 59, 0.4)',
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: '2.25rem',
            color: 'var(--color-text-muted)',
            marginBottom: '1rem',
          }}
        >
          {icon}
        </div>
      )}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--color-text-primary)' }}>
        {title}
      </h3>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          maxWidth: '420px',
          marginBottom: action ? '1.5rem' : 0,
        }}
      >
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
