import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogApi, extractErrorMessage } from '../api/client';
import { FeaturedHero } from '../components/home/FeaturedHero';
import { SectionRow } from '../components/home/SectionRow';
import { HeroSkeleton, RowSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import type { CatalogueShow } from '../types';

const SECTION_METADATA: Record<string, { title: string; icon: string; order: number }> = {
  featured: { title: 'Featured For You', icon: '🌟', order: 1 },
  series: { title: 'Popular Series', icon: '🎬', order: 2 },
  minisodes: { title: 'Quick Minisodes', icon: '⚡', order: 3 },
  songs: { title: 'Singalongs & Rhymes', icon: '🎵', order: 4 },
};

export const HomePage: React.FC = () => {
  const {
    data: catalogue,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['catalogue'],
    queryFn: catalogApi.getCatalogue,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  if (isLoading) {
    return (
      <div>
        <HeroSkeleton />
        <div className="content-container" style={{ marginTop: '2.5rem' }}>
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="content-container" style={{ paddingTop: '100px', minHeight: '70vh' }}>
        <EmptyState
          icon="📦"
          title="Catalogue Not Published Yet"
          description={extractErrorMessage(error)}
          actionText="Retry Connection"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  const sections = catalogue?.sections || {};

  // Find all shows marked for featured spotlight
  const featuredShows: CatalogueShow[] =
    (sections['featured'] && sections['featured'].length > 0)
      ? sections['featured']
      : Object.values(sections).flat().slice(0, 3);

  // Sort section keys according to curated order
  const sortedSectionKeys = Object.keys(sections).sort((a, b) => {
    const orderA = SECTION_METADATA[a]?.order ?? 99;
    const orderB = SECTION_METADATA[b]?.order ?? 99;
    return orderA - orderB;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)' }}>
      {/* ── Netflix-Style Featured Hero Banner ──────────────────────────── */}
      {featuredShows.length > 0 && <FeaturedHero featuredShows={featuredShows} />}

      {/* ── Horizontal Scrolling Content Rows Grouped by Section ────────── */}
      <div
        className="content-container"
        style={{
          marginTop: featuredShows.length > 0 ? '1rem' : '6rem',
          paddingBottom: '3.5rem',
        }}
      >
        {sortedSectionKeys.length === 0 ? (
          <EmptyState
            icon="🎬"
            title="Catalogue is Empty"
            description="No shows are currently published in the catalogue."
          />
        ) : (
          sortedSectionKeys.map((sectionKey) => {
            const shows = sections[sectionKey] || [];
            if (shows.length === 0) return null;

            const meta = SECTION_METADATA[sectionKey] || {
              title: sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
              icon: '🎬',
            };

            return (
              <SectionRow
                key={sectionKey}
                title={meta.title}
                icon={meta.icon}
                sectionKey={sectionKey}
                shows={shows}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
