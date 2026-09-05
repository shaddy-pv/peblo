import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';

export interface PermissionGateProps {
  requires: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  requires,
  children,
  fallback,
}) => {
  const { user } = useAuth();

  if (!user) {
    return fallback ? <>{fallback}</> : null;
  }

  // Admin has access to everything; Editor only has access if requires === 'editor'
  const isAuthorized = user.role === 'admin' || (requires === 'editor' && user.role === 'editor');

  if (!isAuthorized) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          padding: '0.2rem 0.5rem',
          background: 'rgba(100, 116, 139, 0.1)',
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--color-border)',
        }}
        title="Admin permissions required for this action"
      >
        🔒 Admin only
      </span>
    );
  }

  return <>{children}</>;
};
