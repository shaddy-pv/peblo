import React from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📺',
  title,
  description,
  actionText,
  actionHref,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(17, 24, 39, 0.4)',
        border: '1px solid var(--color-border)',
        margin: '2rem 0',
      }}
    >
      <div
        style={{
          fontSize: '3.5rem',
          marginBottom: '1rem',
          lineHeight: 1,
          animation: 'bounce 2s infinite',
        }}
      >
        {icon}
      </div>

      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.95rem',
          color: 'var(--color-text-secondary)',
          maxWidth: '480px',
          marginBottom: actionText ? '1.5rem' : 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {actionText && actionHref && (
        <Link to={actionHref} className="btn btn-primary">
          {actionText}
        </Link>
      )}

      {actionText && onAction && !actionHref && (
        <button type="button" onClick={onAction} className="btn btn-primary">
          {actionText}
        </button>
      )}
    </div>
  );
};
