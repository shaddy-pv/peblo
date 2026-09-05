import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className="navbar"
      style={{
        backgroundColor: scrolled ? 'rgba(11, 15, 25, 0.95)' : 'transparent',
        boxShadow: scrolled ? '0 4px 20px rgba(0, 0, 0, 0.6)' : 'none',
      }}
    >
      {/* Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/" className="nav-brand">
          <span style={{ fontSize: '1.6rem' }}>📺</span>
          <span>
            Peblo<span style={{ color: 'var(--color-primary)' }}>TV</span>
          </span>
          <span className="nav-brand-badge">Kids</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="nav-links" style={{ display: 'flex' }}>
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link
            to="/search"
            className={`nav-link ${location.pathname === '/search' ? 'active' : ''}`}
          >
            Search & Filter
          </Link>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Quick Search Shortcut */}
        <Link
          to="/search"
          className="btn btn-glass btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          title="Search shows and episodes"
        >
          <span>🔍</span>
          <span style={{ display: 'inline' }}>Search</span>
        </Link>

        {/* CMS Link for easy pair-testing */}
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-glass btn-sm"
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
          title="Switch to Internal CMS"
        >
          CMS ↗
        </a>
      </div>
    </nav>
  );
};
