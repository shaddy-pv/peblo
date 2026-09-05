import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const NotFound: React.FC = () => {
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
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔍</div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#fff' }}>
        Page Not Found
      </h1>
      <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', maxWidth: '420px', marginBottom: '1.5rem' }}>
        The CMS route you requested does not exist or has been moved.
      </p>
      <Link to="/shows">
        <Button variant="primary">Return to Shows Dashboard</Button>
      </Link>
    </div>
  );
};
