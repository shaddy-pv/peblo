import React from 'react';
import type { UserRole, ShowStatus, PublishOutcome, ValidationSeverity } from '../../types';

export type BadgeVariant =
  | 'admin'
  | 'editor'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  role?: UserRole;
  status?: ShowStatus | PublishOutcome;
  severity?: ValidationSeverity;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  role,
  status,
  severity,
  className = '',
  ...props
}) => {
  let computedVariant: BadgeVariant = variant || 'neutral';

  if (role) {
    computedVariant = role === 'admin' ? 'admin' : 'editor';
  } else if (status) {
    if (status === 'published' || status === 'success') computedVariant = 'success';
    else if (status === 'draft' || status === 'running') computedVariant = 'neutral';
    else if (status === 'failed') computedVariant = 'danger';
  } else if (severity) {
    if (severity === 'blocker') computedVariant = 'danger';
    else if (severity === 'warning') computedVariant = 'warning';
    else computedVariant = 'neutral';
  }

  const displayText = children || role || status || severity;

  return (
    <span className={`badge badge-${computedVariant} ${className}`} {...props}>
      {displayText}
    </span>
  );
};
