import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { extractErrorMessage } from '../api/client';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/shows';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setLoginError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (user: 'admin' | 'editor') => {
    if (user === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('editor');
      setPassword('editor123');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-app)',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '3.2rem',
              height: '3.2rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              marginBottom: '0.85rem',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.45)',
            }}
          >
            📺
          </div>
          <h1 style={{ fontSize: '1.45rem', marginBottom: '0.25rem' }}>Sign in to Peblo CMS</h1>
          <p style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)' }}>
            OTT Streaming Content Management & Catalogue Pipeline
          </p>
        </div>

        {loginError && (
          <Alert type="danger" title="Authentication Failed">
            {loginError}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="e.g. admin or editor"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '0.5rem' }} isLoading={isSubmitting}>
            Sign In to Dashboard
          </Button>
        </form>

        {/* Demo Credentials Quick Click */}
        <div
          style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--color-border)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
            DEMO SEED ACCOUNTS:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('admin')}
              style={{ fontSize: '0.775rem' }}
            >
              👑 Admin (admin123)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('editor')}
              style={{ fontSize: '0.775rem' }}
            >
              ✏️ Editor (editor123)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
