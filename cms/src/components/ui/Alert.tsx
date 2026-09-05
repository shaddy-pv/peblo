import React from 'react';

export type AlertType = 'danger' | 'warning' | 'success' | 'info';

export interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  icon,
  className = '',
}) => {
  const defaultIcons: Record<AlertType, string> = {
    danger: '⚠️',
    warning: '⚡',
    success: '✅',
    info: 'ℹ️',
  };

  return (
    <div className={`alert alert-${type} ${className}`}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon || defaultIcons[type]}</span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
};
