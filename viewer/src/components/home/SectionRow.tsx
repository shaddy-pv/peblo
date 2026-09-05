import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PosterCard } from './PosterCard';
import type { CatalogueShow } from '../../types';

interface SectionRowProps {
  title: string;
  icon?: string;
  sectionKey: string;
  shows: CatalogueShow[];
}

export const SectionRow: React.FC<SectionRowProps> = ({
  title,
  icon = '🎬',
  sectionKey,
  shows,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  if (!shows || shows.length === 0) return null;

  const handleScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const scrollAmount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="section-row-wrapper" style={{ marginBottom: '2.75rem', position: 'relative' }}>
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '0.9rem',
          padding: '0 0.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.25rem' }}>{icon}</span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>{title}</h2>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {shows.length}
          </span>
        </div>

        <Link
          to={`/search?section=${sectionKey}`}
          style={{
            fontSize: '0.825rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            transition: 'color 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
          className="hover-underline"
        >
          <span>Explore All</span>
          <span>→</span>
        </Link>
      </div>

      {/* Row Carousel Area */}
      <div style={{ position: 'relative' }} className="carousel-container">
        {/* Left Scroll Arrow */}
        {canScrollLeft && (
          <button
            type="button"
            className="carousel-arrow carousel-arrow-left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            ◀
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={rowRef}
          onScroll={handleScroll}
          className="scroll-row"
          style={{
            display: 'flex',
            gap: '1.25rem',
            overflowX: 'auto',
            padding: '0.5rem 0.25rem 1.25rem 0.25rem',
            scrollSnapType: 'x mandatory',
          }}
        >
          {shows.map((show) => (
            <div key={show.id} style={{ scrollSnapAlign: 'start' }}>
              <PosterCard show={show} />
            </div>
          ))}
        </div>

        {/* Right Scroll Arrow */}
        {canScrollRight && shows.length > 4 && (
          <button
            type="button"
            className="carousel-arrow carousel-arrow-right"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            ▶
          </button>
        )}
      </div>
    </div>
  );
};
