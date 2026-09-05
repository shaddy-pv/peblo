import React, { useState, useRef } from 'react';
import { artworkApi, extractErrorMessage } from '../../api/client';
import type { Artwork, ArtworkEntityType, ArtworkType } from '../../types';
import { Button } from '../ui/Button';

import { ARTWORK_CONFIGS, type ArtworkSlotConfig } from './artworkConfig';
export type { ArtworkSlotConfig };


interface ArtworkUploadSlotProps {
  entityType: ArtworkEntityType;
  entityId: string;
  artworkType: ArtworkType;
  currentArtwork?: Artwork | null;
  onSuccess?: (artwork: Artwork) => void;
  onDelete?: () => void;
}

export const ArtworkUploadSlot: React.FC<ArtworkUploadSlotProps> = ({
  entityType,
  entityId,
  artworkType,
  currentArtwork,
  onSuccess,
  onDelete,
}) => {
  const config = ARTWORK_CONFIGS[artworkType];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(currentArtwork?.url || null);
  const [fileDetails, setFileDetails] = useState<{
    width: number;
    height: number;
    sizeKb: number;
  } | null>(
    currentArtwork
      ? {
          width: currentArtwork.width,
          height: currentArtwork.height,
          sizeKb: Math.round(currentArtwork.file_size_bytes / 1024),
        }
      : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // 1. Client-Side Size Ceiling Check (200 KB)
    const sizeKb = Math.round(file.size / 1024);
    if (file.size > config.maxSizeBytes) {
      setErrorMessage(
        `File is too large (${sizeKb} KB). The maximum allowed size for ${config.label} is 200 KB. Please compress your image.`
      );
      return;
    }

    // 2. Client-Side Image Dimensions & Aspect Ratio Pre-Check
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const actualRatio = width / height;
      const expectedRatio = config.targetRatio;
      const ratioDiff = Math.abs(actualRatio - expectedRatio);

      setFileDetails({ width, height, sizeKb });

      if (ratioDiff > config.ratioTolerance) {
        setErrorMessage(
          `Incorrect aspect ratio (${actualRatio.toFixed(2)}:1). Required ratio is ${
            config.ratioText
          } (approx ${expectedRatio.toFixed(2)}:1). Please crop your image.`
        );
        URL.revokeObjectURL(objectUrl);
        return;
      }

      // 3. Upload to Server
      setIsUploading(true);
      try {
        const uploaded = await artworkApi.upload(entityType, entityId, artworkType, file);
        setPreviewUrl(uploaded.url);
        setErrorMessage(null);
        onSuccess?.(uploaded);
      } catch (err: unknown) {
        setErrorMessage(extractErrorMessage(err));
      } finally {
        setIsUploading(false);
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      setErrorMessage('Could not read image file. Please upload a valid JPEG, PNG, or WebP image.');
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove the ${config.label}?`)) return;
    setIsUploading(true);
    try {
      await artworkApi.delete(entityType, entityId, artworkType);
      setPreviewUrl(null);
      setFileDetails(null);
      setErrorMessage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onDelete?.();
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* ── Slot Header & Requirements ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>{config.label}</div>
          <div style={{ fontSize: '0.725rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
            {config.ratioText} · {config.dimensionsText} · Max 200 KB
          </div>
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            padding: '0.15rem 0.45rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: previewUrl ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: previewUrl ? 'var(--color-success)' : 'var(--color-danger)',
            fontWeight: 600,
            border: `1px solid ${previewUrl ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}
        >
          {previewUrl ? '✓ Uploaded' : 'Missing'}
        </span>
      </div>

      {/* ── Preview Frame ──────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          height: artworkType === 'poster' ? '180px' : '120px',
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--color-border)',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={config.label}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000',
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🖼️</div>
            <div style={{ fontSize: '0.75rem' }}>No image uploaded</div>
          </div>
        )}

        {isUploading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <span className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
            <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>Validating...</span>
          </div>
        )}
      </div>

      {/* ── Metadata Pill ──────────────────────────────────────────────── */}
      {fileDetails && (
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0.35rem 0.5rem',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>
            {fileDetails.width} × {fileDetails.height} px
          </span>
          <span>{fileDetails.sizeKb} KB / 200 KB</span>
        </div>
      )}

      {/* ── Actionable Error Display ──────────────────────────────────── */}
      {errorMessage && (
        <div
          style={{
            fontSize: '0.775rem',
            color: '#fca5a5',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 0.65rem',
            lineHeight: 1.35,
          }}
        >
          <strong>Validation Error:</strong> {errorMessage}
        </div>
      )}

      {/* ── Controls ──────────────────────────────────────────────────── */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          style={{ flex: 1 }}
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? 'Replace Image' : 'Select Image'}
        </Button>

        {previewUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={handleDelete}
            style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)' }}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
};
