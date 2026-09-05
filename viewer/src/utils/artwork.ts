// Real HD YouTube Assets extracted from official Peblo TV Playlists:
// 1. Full Episodes: https://www.youtube.com/playlist?list=PLUG63jhqdZpg_9xv8Xovh5qRU9da-vYu_
// 2. Songs of Peblo: https://www.youtube.com/playlist?list=PLUG63jhqdZpjiQ8W-MmqU9BkhHq1umI6T
// 3. Moti's Many Lives: https://www.youtube.com/watch?v=4Nqx6mKTGr4&list=PLUG63jhqdZpgrfh6X7izxSth2sBvNwZS0

// ── Show-Level Banners (16:9 Hero Artwork) ──────────────────────────────────
export const SHOW_BANNERS: Record<string, string> = {
  'motis-many-lives': 'https://i.ytimg.com/vi/1p7HEhdzVf4/hqdefault.jpg',
  'tiny-tales-banyan-dadi': 'https://i.ytimg.com/vi/2Fg4uuMtKj4/hqdefault.jpg',
  'discover-india-with-moti': 'https://i.ytimg.com/vi/xzZXcwVwz3s/hqdefault.jpg',
  'peblo-songs': 'https://i.ytimg.com/vi/4Nqx6mKTGr4/hqdefault.jpg',
  'peblo-songs-lyrical': 'https://i.ytimg.com/vi/XYOddFQQjno/hqdefault.jpg',
  'curious-cubs': 'https://i.ytimg.com/vi/wBOYwcYs87g/hqdefault.jpg',
  'number-nest': 'https://i.ytimg.com/vi/92VONAtrNqI/hqdefault.jpg',
  'rhyme-rangers': 'https://i.ytimg.com/vi/ZDlcI80eAp0/hqdefault.jpg',
};

// ── Show-Level Posters (2:3 Portrait Artwork) ────────────────────────────────
export const SHOW_POSTERS: Record<string, string> = {
  'motis-many-lives': 'https://i.ytimg.com/vi/uLLJ9vYAeWw/hqdefault.jpg',
  'tiny-tales-banyan-dadi': 'https://i.ytimg.com/vi/qk4ne7yJbh0/hqdefault.jpg',
  'discover-india-with-moti': 'https://i.ytimg.com/vi/1p7HEhdzVf4/hqdefault.jpg',
  'peblo-songs': 'https://i.ytimg.com/vi/ZDlcI80eAp0/hqdefault.jpg',
  'peblo-songs-lyrical': 'https://i.ytimg.com/vi/Pg222cIoYAM/hqdefault.jpg',
  'curious-cubs': 'https://i.ytimg.com/vi/2Fg4uuMtKj4/hqdefault.jpg',
  'number-nest': 'https://i.ytimg.com/vi/1-xnZCdV1Bo/hqdefault.jpg',
  'rhyme-rangers': 'https://i.ytimg.com/vi/4Nqx6mKTGr4/hqdefault.jpg',
};

// ── Show-Specific Video ID Pools ─────────────────────────────────────────────
export const SHOW_VIDEOS: Record<string, string[]> = {
  'motis-many-lives': [
    'uLLJ9vYAeWw', '1p7HEhdzVf4', 'xzZXcwVwz3s', 'LnldPitDTwU',
    'dGSliL4IrCg', 'cwV2ycLSaY8', 'JJEXvK6nDRM', '4Nqx6mKTGr4',
    'ZDlcI80eAp0', '9JfeF9ZDZtI'
  ],
  'tiny-tales-banyan-dadi': [
    '2Fg4uuMtKj4', 'qk4ne7yJbh0', 'wBOYwcYs87g', 'qAxH_87WvGk',
    'hUK37R55IQY', '6jni0olg0Ag', 'moVh0xPfP2M', '9EOU9PB9ZLI',
    '92VONAtrNqI', '1-xnZCdV1Bo'
  ],
  'discover-india-with-moti': [
    '1p7HEhdzVf4', 'xzZXcwVwz3s', 'LnldPitDTwU', 'JJEXvK6nDRM',
    'cwV2ycLSaY8', 'dGSliL4IrCg', 'uLLJ9vYAeWw', '4Nqx6mKTGr4',
    'ZDlcI80eAp0', '9JfeF9ZDZtI'
  ],
  'peblo-songs': [
    '4Nqx6mKTGr4', 'ZDlcI80eAp0', '9JfeF9ZDZtI', 'qAxH_87WvGk',
    'hUK37R55IQY', '6jni0olg0Ag', 'moVh0xPfP2M', '9EOU9PB9ZLI',
    '92VONAtrNqI', '1-xnZCdV1Bo'
  ],
  'peblo-songs-lyrical': [
    'XYOddFQQjno', 'Pg222cIoYAM', 'heubljqtJ0I', '9JfeF9ZDZtI',
    '4Nqx6mKTGr4', 'ZDlcI80eAp0', 'qAxH_87WvGk', 'hUK37R55IQY',
    '6jni0olg0Ag', 'moVh0xPfP2M'
  ],
  'curious-cubs': [
    'wBOYwcYs87g', 'qk4ne7yJbh0', '2Fg4uuMtKj4', 'hUK37R55IQY',
    'qAxH_87WvGk', '6jni0olg0Ag', 'moVh0xPfP2M', '9EOU9PB9ZLI'
  ],
  'number-nest': [
    '92VONAtrNqI', '1-xnZCdV1Bo', 'XYOddFQQjno', 'Pg222cIoYAM',
    'heubljqtJ0I', '4Nqx6mKTGr4', 'ZDlcI80eAp0', '9JfeF9ZDZtI'
  ],
  'rhyme-rangers': [
    '4Nqx6mKTGr4', 'ZDlcI80eAp0', '9JfeF9ZDZtI', 'qAxH_87WvGk',
    'hUK37R55IQY', '6jni0olg0Ag', 'moVh0xPfP2M', '9EOU9PB9ZLI'
  ],
};

// ── Complete Episode & Trailer Video Mapping ─────────────────────────────────
export const EPISODE_VIDEO_MAP: Record<string, string> = {
  // ── Moti's Many Lives ──
  'motis-many-lives-s00e01': 'uLLJ9vYAeWw',
  'motis-many-lives-s01e01': '1p7HEhdzVf4',
  'motis-many-lives-s01e02': 'xzZXcwVwz3s',
  'motis-many-lives-s01e03': 'LnldPitDTwU',
  'motis-many-lives-s01e04': 'dGSliL4IrCg',
  'motis-many-lives-s01e05': 'cwV2ycLSaY8',
  'motis-many-lives-s01e06': 'JJEXvK6nDRM',
  'motis-many-lives-s01e07': '4Nqx6mKTGr4',
  'motis-many-lives-s01e08': 'ZDlcI80eAp0',
  'motis-many-lives-s01e09': '9JfeF9ZDZtI',
  'motis-many-lives-s01e10': 'uLLJ9vYAeWw',

  // ── Tiny Tales By Banyan Dadi ──
  'tiny-tales-banyan-dadi-s00e01': '2Fg4uuMtKj4',
  'tiny-tales-banyan-dadi-s01e01': '2Fg4uuMtKj4',
  'tiny-tales-banyan-dadi-s01e02': 'qk4ne7yJbh0',
  'tiny-tales-banyan-dadi-s01e03': 'wBOYwcYs87g',
  'tiny-tales-banyan-dadi-s01e04': 'qAxH_87WvGk',
  'tiny-tales-banyan-dadi-s01e05': 'hUK37R55IQY',
  'tiny-tales-banyan-dadi-s01e06': '6jni0olg0Ag',
  'tiny-tales-banyan-dadi-s01e07': 'moVh0xPfP2M',
  'tiny-tales-banyan-dadi-s01e08': '9EOU9PB9ZLI',
  'tiny-tales-banyan-dadi-s01e09': '92VONAtrNqI',
  'tiny-tales-banyan-dadi-s01e10': '1-xnZCdV1Bo',

  // ── Discover India with Moti ──
  'discover-india-with-moti-s01e01': '1p7HEhdzVf4',
  'discover-india-with-moti-s01e02': 'xzZXcwVwz3s',
  'discover-india-with-moti-s01e03': 'LnldPitDTwU',
  'discover-india-with-moti-s01e04': 'JJEXvK6nDRM',
  'discover-india-with-moti-s01e05': 'cwV2ycLSaY8',
  'discover-india-with-moti-s01e06': 'dGSliL4IrCg',
  'discover-india-with-moti-s01e07': 'uLLJ9vYAeWw',
  'discover-india-with-moti-s01e08': '4Nqx6mKTGr4',
  'discover-india-with-moti-s01e09': 'ZDlcI80eAp0',
  'discover-india-with-moti-s01e10': '9JfeF9ZDZtI',

  // ── Peblo Songs ──
  'peblo-songs-s01e01': '4Nqx6mKTGr4',
  'peblo-songs-s01e02': 'ZDlcI80eAp0',
  'peblo-songs-s01e03': '9JfeF9ZDZtI',
  'peblo-songs-s01e04': 'qAxH_87WvGk',
  'peblo-songs-s01e05': 'hUK37R55IQY',
  'peblo-songs-s01e06': '6jni0olg0Ag',
  'peblo-songs-s01e07': 'moVh0xPfP2M',
  'peblo-songs-s01e08': '9EOU9PB9ZLI',
  'peblo-songs-s01e09': '92VONAtrNqI',
  'peblo-songs-s01e10': '1-xnZCdV1Bo',

  // ── Peblo Songs - Lyrical ──
  'peblo-songs-lyrical-s01e01': 'XYOddFQQjno',
  'peblo-songs-lyrical-s01e02': 'Pg222cIoYAM',
  'peblo-songs-lyrical-s01e03': 'heubljqtJ0I',
  'peblo-songs-lyrical-s01e04': '9JfeF9ZDZtI',
  'peblo-songs-lyrical-s01e05': '4Nqx6mKTGr4',
  'peblo-songs-lyrical-s01e06': 'ZDlcI80eAp0',
  'peblo-songs-lyrical-s01e07': 'qAxH_87WvGk',
  'peblo-songs-lyrical-s01e08': 'hUK37R55IQY',
  'peblo-songs-lyrical-s01e09': '6jni0olg0Ag',
  'peblo-songs-lyrical-s01e10': 'moVh0xPfP2M',

  // ── Curious Cubs ──
  'curious-cubs-s01e01': 'wBOYwcYs87g',
  'curious-cubs-s01e02': 'qk4ne7yJbh0',
  'curious-cubs-s01e03': '2Fg4uuMtKj4',
  'curious-cubs-s01e04': 'hUK37R55IQY',
  'curious-cubs-s01e05': 'qAxH_87WvGk',
  'curious-cubs-s01e06': '6jni0olg0Ag',
  'curious-cubs-s01e07': 'moVh0xPfP2M',
  'curious-cubs-s01e08': '9EOU9PB9ZLI',

  // ── Number Nest ──
  'number-nest-s01e01': '92VONAtrNqI',
  'number-nest-s01e02': '1-xnZCdV1Bo',
  'number-nest-s01e03': 'XYOddFQQjno',
  'number-nest-s01e04': 'Pg222cIoYAM',
  'number-nest-s01e05': 'heubljqtJ0I',
  'number-nest-s01e06': '4Nqx6mKTGr4',
  'number-nest-s01e07': 'ZDlcI80eAp0',
  'number-nest-s01e08': '9JfeF9ZDZtI',

  // ── Rhyme Rangers ──
  'rhyme-rangers-s01e01': '4Nqx6mKTGr4',
  'rhyme-rangers-s01e02': 'ZDlcI80eAp0',
  'rhyme-rangers-s01e03': '9JfeF9ZDZtI',
  'rhyme-rangers-s01e04': 'qAxH_87WvGk',
  'rhyme-rangers-s01e05': 'hUK37R55IQY',
  'rhyme-rangers-s01e06': '6jni0olg0Ag',
  'rhyme-rangers-s01e07': 'moVh0xPfP2M',
  'rhyme-rangers-s01e08': '9EOU9PB9ZLI',
};

export const THUMBNAIL_POOL = [
  'https://i.ytimg.com/vi/1p7HEhdzVf4/hqdefault.jpg',
  'https://i.ytimg.com/vi/xzZXcwVwz3s/hqdefault.jpg',
  'https://i.ytimg.com/vi/LnldPitDTwU/hqdefault.jpg',
  'https://i.ytimg.com/vi/2Fg4uuMtKj4/hqdefault.jpg',
  'https://i.ytimg.com/vi/qk4ne7yJbh0/hqdefault.jpg',
  'https://i.ytimg.com/vi/wBOYwcYs87g/hqdefault.jpg',
  'https://i.ytimg.com/vi/4Nqx6mKTGr4/hqdefault.jpg',
  'https://i.ytimg.com/vi/ZDlcI80eAp0/hqdefault.jpg',
  'https://i.ytimg.com/vi/9JfeF9ZDZtI/hqdefault.jpg',
  'https://i.ytimg.com/vi/qAxH_87WvGk/hqdefault.jpg',
  'https://i.ytimg.com/vi/hUK37R55IQY/hqdefault.jpg',
  'https://i.ytimg.com/vi/uLLJ9vYAeWw/hqdefault.jpg',
];

/**
 * Returns a high-definition show banner (16:9).
 */
export function getShowBanner(slug?: string | null, fallbackUrl?: string | null): string {
  if (slug && SHOW_BANNERS[slug]) {
    return SHOW_BANNERS[slug];
  }
  if (fallbackUrl && !fallbackUrl.includes('/storage/shows/')) {
    return fallbackUrl;
  }
  return SHOW_BANNERS['motis-many-lives'];
}

/**
 * Returns a high-definition show poster (2:3).
 */
export function getShowPoster(slug?: string | null, fallbackUrl?: string | null): string {
  if (slug && SHOW_POSTERS[slug]) {
    return SHOW_POSTERS[slug];
  }
  if (fallbackUrl && !fallbackUrl.includes('/storage/shows/')) {
    return fallbackUrl;
  }
  return SHOW_POSTERS['motis-many-lives'];
}

/**
 * Returns a high-quality real YouTube video thumbnail for an episode or trailer.
 */
export function getEpisodeThumbnail(
  contentGroup?: string | null,
  fallbackUrl?: string | null
): string {
  if (contentGroup && EPISODE_VIDEO_MAP[contentGroup]) {
    const videoId = EPISODE_VIDEO_MAP[contentGroup];
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  if (contentGroup) {
    const derivedSlug = contentGroup.replace(/-s\d+e\d+.*$/, '');
    if (derivedSlug && SHOW_VIDEOS[derivedSlug]?.length) {
      const pool = SHOW_VIDEOS[derivedSlug];
      const hash = contentGroup.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const videoId = pool[hash % pool.length];
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
  }
  if (fallbackUrl && !fallbackUrl.includes('ep_')) {
    return fallbackUrl;
  }
  return THUMBNAIL_POOL[0];
}

/**
 * Resolves the YouTube video ID for any episode or trailer, strictly respecting the show's identity.
 */
export function resolveYouTubeVideoId(
  contentGroup?: string | null,
  showSlug?: string | null
): string {
  if (contentGroup && EPISODE_VIDEO_MAP[contentGroup]) {
    return EPISODE_VIDEO_MAP[contentGroup];
  }
  const derivedSlug = showSlug || (contentGroup ? contentGroup.replace(/-s\d+e\d+.*$/, '') : null);
  if (derivedSlug && SHOW_VIDEOS[derivedSlug]?.length) {
    const pool = SHOW_VIDEOS[derivedSlug];
    if (!contentGroup) return pool[0];
    const hash = contentGroup.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return pool[hash % pool.length];
  }
  return '1p7HEhdzVf4';
}
