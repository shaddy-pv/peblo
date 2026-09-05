import React, { useState } from 'react';

interface ArtworkImageProps {
  src?: string | null;
  alt: string;
  aspectRatio?: '2/3' | '16/9' | '1/1';
  fallbackIcon?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  src,
  alt,
  aspectRatio = '16/9',
  fallbackIcon = '📺',
  className = '',
  style = {},
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const hasValidSrc = !!src && !hasError;

  return (
    <div
      className={`artwork-container ${className}`}
      style={{
        aspectRatio,
        borderRadius: 'var(--radius-md)',
        ...style,
      }}
    >
      {/* Shimmer Placeholder while loading */}
      {!isLoaded && hasValidSrc && (
        <div
          className="skeleton"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
          }}
        />
      )}

      {/* Actual Image */}
      {hasValidSrc ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`artwork-img ${isLoaded ? 'loaded' : ''}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
        />
      ) : (
        /* Stylized Fallback Placeholder when image is missing or failed */
        <div className="artwork-fallback">
          <span style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>{fallbackIcon}</span>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.2,
              maxInlineSize: '80%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {alt}
          </span>
        </div>
      )}
    </div>
  );
};
