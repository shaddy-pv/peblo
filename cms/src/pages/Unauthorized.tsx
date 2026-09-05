import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

export const Unauthorized: React.FC = () => {
  const { user, quickLogin } = useAuth();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 1.5rem',
      }}
    >
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔒</div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#fff' }}>
        Access Restricted
      </h1>
      <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', maxWidth: '480px', marginBottom: '1.5rem' }}>
        Your account (<code>{user?.username}</code>, role: <strong>{user?.role}</strong>) does not have the required
        privileges to perform this administrative operation.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Link to="/shows">
          <Button variant="secondary">Return to Shows</Button>
        </Link>
        <Button variant="primary" onClick={() => quickLogin('admin')}>
          Elevate to Admin (Demo)
        </Button>
      </div>
    </div>
  );
};
