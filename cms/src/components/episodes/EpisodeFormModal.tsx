import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { episodesApi, artworkApi, extractErrorMessage } from '../../api/client';
import type { Episode, EpisodeCreate, EpisodeUpdate, Season } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { ArtworkUploadSlot } from '../artwork/ArtworkUploadSlot';

interface EpisodeFormContentProps {
  seasons: Season[];
  episodeToEdit?: Episode | null;
  defaultSeasonId?: string;
  onClose: () => void;
  onSaved: (episode: Episode) => void;
}

const EpisodeFormContent: React.FC<EpisodeFormContentProps> = ({
  seasons,
  episodeToEdit,
  defaultSeasonId,
  onClose,
  onSaved,
}) => {
  const queryClient = useQueryClient();
  const isEdit = !!episodeToEdit;

  const [seasonId, setSeasonId] = useState(
    episodeToEdit?.season_id || defaultSeasonId || (seasons.length > 0 ? seasons[0].id : '')
  );
  const [episodeNumber, setEpisodeNumber] = useState(episodeToEdit?.episode_number ?? 1);
  const [title, setTitle] = useState(episodeToEdit?.title || '');
  const [contentGroup, setContentGroup] = useState(episodeToEdit?.content_group || '');
  const [language, setLanguage] = useState(episodeToEdit?.language || 'en');
  const [durationSeconds, setDurationSeconds] = useState<string>(
    episodeToEdit?.duration_seconds !== null && episodeToEdit?.duration_seconds !== undefined
      ? String(episodeToEdit.duration_seconds)
      : '600'
  );
  const [status, setStatus] = useState<'draft' | 'published'>(episodeToEdit?.status || 'draft');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TanStack Query to fetch existing artwork for this episode
  const { data: artworkList = [], isLoading: loadingArtwork } = useQuery({
    queryKey: ['artwork', 'episode', episodeToEdit?.id],
    queryFn: () => (episodeToEdit ? artworkApi.getForEntity('episode', episodeToEdit.id) : Promise.resolve([])),
    enabled: isEdit && !!episodeToEdit?.id,
  });

  const thumbnailArtwork = artworkList.find((a) => a.artwork_type === 'thumbnail') || null;

  // Auto-generate content_group from title on new episode creation
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEdit && !contentGroup) {
      const generatedGroup = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
      setContentGroup(generatedGroup);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Episode title is required.');
      return;
    }
    if (!contentGroup.trim()) {
      setError('Content Group is required for collapsing language variants.');
      return;
    }
    if (!seasonId) {
      setError('Please select a season for this episode.');
      return;
    }

    const durationParsed = durationSeconds.trim() === '' ? null : parseInt(durationSeconds, 10);
    if (durationParsed !== null && (isNaN(durationParsed) || durationParsed < 0)) {
      setError('Duration must be a positive number of seconds.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && episodeToEdit) {
        const updateData: EpisodeUpdate = {
          title: title.trim(),
          episode_number: Number(episodeNumber),
          content_group: contentGroup.trim(),
          language: language.trim(),
          duration_seconds: durationParsed,
          status,
        };
        const updated = await episodesApi.updateEpisode(episodeToEdit.id, updateData);
        onSaved(updated);
        onClose();
      } else {
        const createData: EpisodeCreate = {
          season_id: seasonId,
          episode_number: Number(episodeNumber),
          title: title.trim(),
          content_group: contentGroup.trim(),
          language: language.trim(),
          duration_seconds: durationParsed,
          status,
        };
        const created = await episodesApi.createEpisode(createData);
        onSaved(created);
        onClose();
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshThumbnail = () => {
    if (episodeToEdit) {
      queryClient.invalidateQueries({ queryKey: ['artwork', 'episode', episodeToEdit.id] });
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
    }
  };

  return (
    <>
      {error && (
        <Alert type="danger" title="Save Failed">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Season & Episode Number */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Season <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <select
              className="form-input"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              disabled={isEdit}
              required
            >
              <option value="">-- Select Season --</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.season_number === 0
                    ? `Season 0 — Trailers (${s.title || 'Trailers & Teasers'})`
                    : `Season ${s.season_number} — ${s.title || `Season ${s.season_number}`}`}
                </option>
              ))}
            </select>
            {isEdit && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                Season cannot be moved once created.
              </span>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Episode Number <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="number"
              min={0}
              className="form-input"
              value={episodeNumber}
              onChange={(e) => setEpisodeNumber(parseInt(e.target.value, 10) || 0)}
              required
            />
          </div>
        </div>

        {/* Title & Content Group */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Episode Title <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. The Brave Little Cub"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Content Group <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={contentGroup}
              onChange={(e) => setContentGroup(e.target.value)}
              placeholder="e.g. brave_little_cub"
              required
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Episodes sharing this group collapse into one entry with multiple languages in the catalogue.
            </span>
          </div>
        </div>

        {/* Language & Duration & Status */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Language <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <select
              className="form-input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
            >
              <option value="en">English (en)</option>
              <option value="hi">Hindi (hi)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Duration (Seconds)
            </label>
            <input
              type="number"
              min={0}
              className="form-input"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
              placeholder="e.g. 600"
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Required to publish (P3 validation rule).
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Status</label>
            <select
              className="form-input"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        {/* ── Artwork Thumbnail Upload Slot (when editing) ─────────────── */}
        {isEdit && episodeToEdit && (
          <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem', color: '#fff' }}>
              🖼️ Episode Thumbnail Slot (16:9, ~640×360)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Upload a 16:9 landscape thumbnail image. Required before publishing this episode. Max 200 KB.
            </p>

            {loadingArtwork ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading thumbnail slot...
              </div>
            ) : (
              <ArtworkUploadSlot
                entityType="episode"
                entityId={episodeToEdit.id}
                artworkType="thumbnail"
                currentArtwork={thumbnailArtwork}
                onSuccess={refreshThumbnail}
                onDelete={refreshThumbnail}
              />
            )}
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="modal-footer" style={{ padding: '1rem 0 0 0', marginTop: '0.75rem' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Episode' : 'Create Episode'}
          </Button>
        </div>
      </form>
    </>
  );
};

interface EpisodeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  showId: string;
  seasons: Season[];
  episodeToEdit?: Episode | null;
  defaultSeasonId?: string;
  onSaved: (episode: Episode) => void;
}

export const EpisodeFormModal: React.FC<EpisodeFormModalProps> = ({
  isOpen,
  onClose,
  seasons,
  episodeToEdit,
  defaultSeasonId,
  onSaved,
}) => {
  const isEdit = !!episodeToEdit;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Episode: ${episodeToEdit?.title}` : 'Add New Episode'}
      subtitle={
        isEdit
          ? 'Modify episode metadata, language code, content group, and thumbnail artwork.'
          : 'Create a new episode in the selected season.'
      }
      maxWidth="720px"
    >
      <EpisodeFormContent
        key={episodeToEdit ? episodeToEdit.id : 'new'}
        seasons={seasons}
        episodeToEdit={episodeToEdit}
        defaultSeasonId={defaultSeasonId}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
};
