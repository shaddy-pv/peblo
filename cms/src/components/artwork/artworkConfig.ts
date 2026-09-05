import type { ArtworkType } from '../../types';

export interface ArtworkSlotConfig {
  label: string;
  type: ArtworkType;
  ratioText: string;
  targetRatio: number; // width / height
  ratioTolerance: number; // e.g. 0.08 (±8%)
  dimensionsText: string;
  maxSizeBytes: number;
}

export const ARTWORK_CONFIGS: Record<ArtworkType, ArtworkSlotConfig> = {
  poster: {
    label: 'Poster Artwork',
    type: 'poster',
    ratioText: '2:3 (Portrait)',
    targetRatio: 2 / 3, // ~0.667
    ratioTolerance: 0.08,
    dimensionsText: '~600 × 900 px',
    maxSizeBytes: 200 * 1024, // 200 KB
  },
  banner: {
    label: 'Hero Banner Artwork',
    type: 'banner',
    ratioText: '16:9 (Landscape)',
    targetRatio: 16 / 9, // ~1.778
    ratioTolerance: 0.08,
    dimensionsText: '~1280 × 720 px',
    maxSizeBytes: 200 * 1024, // 200 KB
  },
  thumbnail: {
    label: 'Episode Thumbnail',
    type: 'thumbnail',
    ratioText: '16:9 (Landscape)',
    targetRatio: 16 / 9, // ~1.778
    ratioTolerance: 0.08,
    dimensionsText: '~640 × 360 px',
    maxSizeBytes: 200 * 1024, // 200 KB
  },
};
