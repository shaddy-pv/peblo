import React from 'react';
import { EmptyState } from '../components/common/EmptyState';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="content-container" style={{ paddingTop: '120px', minHeight: '70vh' }}>
      <EmptyState
        icon="🛸"
        title="Page Not Found"
        description="Oops! Looks like you traveled to a galaxy where no shows exist."
        actionText="Return to Home"
        actionHref="/"
      />
    </div>
  );
};
