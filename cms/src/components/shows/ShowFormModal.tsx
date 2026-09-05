import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showsApi, artworkApi, extractErrorMessage } from '../../api/client';
import type { Show, ShowCreate, ShowUpdate } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { ArtworkUploadSlot } from '../artwork/ArtworkUploadSlot';

const AVAILABLE_SECTIONS = ['featured', 'series', 'minisodes', 'songs'];
const AVAILABLE_CATEGORIES = [
  'adventure',
  'folk',
  'friendship',
  'india',
  'language',
  'learning',
  'maths',
  'music',
  'nature',
  'reading',
  'science',
  'singalong',
  'stories',
  'travel',
  'values',
];

interface ShowFormContentProps {
  showToEdit?: Show | null;
  onClose: () => void;
  onSaved: (show: Show) => void;
}

const ShowFormContent: React.FC<ShowFormContentProps> = ({
  showToEdit,
  onClose,
  onSaved,
}) => {
  const queryClient = useQueryClient();
  const isEdit = !!showToEdit;

  const [title, setTitle] = useState(showToEdit?.title || '');
  const [slug, setSlug] = useState(showToEdit?.slug || '');
  const [synopsis, setSynopsis] = useState(showToEdit?.synopsis || '');
  const [section, setSection] = useState(showToEdit?.section || 'series');
  const [categories, setCategories] = useState<string[]>(showToEdit?.categories || []);
  const [status, setStatus] = useState<'draft' | 'published'>(showToEdit?.status || 'draft');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TanStack Query to fetch existing artwork for this show
  const { data: artworkList = [], isLoading: loadingArtwork } = useQuery({
    queryKey: ['artwork', 'show', showToEdit?.id],
    queryFn: () => (showToEdit ? artworkApi.getForEntity('show', showToEdit.id) : Promise.resolve([])),
    enabled: isEdit && !!showToEdit?.id,
  });

  const posterArtwork = artworkList.find((a) => a.artwork_type === 'poster') || null;
  const bannerArtwork = artworkList.find((a) => a.artwork_type === 'banner') || null;

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEdit) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  };

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Show title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && showToEdit) {
        const updateData: ShowUpdate = {
          title: title.trim(),
          slug: slug.trim() || undefined,
          synopsis: synopsis.trim() || null,
          section: section || null,
          categories,
          status,
        };
        const updated = await showsApi.updateShow(showToEdit.id, updateData);
        onSaved(updated);
        onClose();
      } else {
        const createData: ShowCreate = {
          title: title.trim(),
          slug: slug.trim() || undefined,
          synopsis: synopsis.trim() || null,
          section: section || null,
          categories,
          status,
        };
        const created = await showsApi.createShow(createData);
        onSaved(created);
        onClose();
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshArtwork = () => {
    if (showToEdit) {
      queryClient.invalidateQueries({ queryKey: ['artwork', 'show', showToEdit.id] });
      queryClient.invalidateQueries({ queryKey: ['shows'] });
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
        {/* Basic Show Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Show Title <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Leo The Wildlife Ranger"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">URL Slug</label>
            <input
              type="text"
              className="form-input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. leo-the-wildlife-ranger"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Catalogue Section</label>
            <select
              className="form-input"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="">(None - Missing Section Warning)</option>
              {AVAILABLE_SECTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec.charAt(0).toUpperCase() + sec.slice(1)}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Shows must have a section before they can be published.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Publishing Status</label>
            <select
              className="form-input"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
            >
              <option value="draft">Draft (Internal Only)</option>
              <option value="published">Published (Visible in Viewer)</option>
            </select>
          </div>
        </div>

        {/* Categories Multi-Select */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Categories / Tags</label>
          <div className="pill-grid">
            {AVAILABLE_CATEGORIES.map((cat) => {
              const active = categories.includes(cat);
              return (
                <label
                  key={cat}
                  className={`pill-checkbox ${active ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => {}}
                  />
                  <span>#{cat}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Synopsis */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Show Synopsis</label>
          <textarea
            className="form-input"
            rows={3}
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="Brief description of the series for young viewers..."
          />
        </div>

        {/* ── Artwork Slots Section (when editing an existing show) ───────── */}
        {isEdit && showToEdit && (
          <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem', color: '#fff' }}>
              🎨 Show Artwork Slots
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Upload poster (portrait) and hero banner (landscape) artwork. Artwork files are validated on upload for exact aspect ratio and a 200 KB ceiling.
            </p>

            {loadingArtwork ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading artwork slots...
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {/* 1. Poster Slot (2:3, ~600x900) */}
                <ArtworkUploadSlot
                  entityType="show"
                  entityId={showToEdit.id}
                  artworkType="poster"
                  currentArtwork={posterArtwork}
                  onSuccess={refreshArtwork}
                  onDelete={refreshArtwork}
                />

                {/* 2. Banner Slot (16:9, ~1280x720) */}
                <ArtworkUploadSlot
                  entityType="show"
                  entityId={showToEdit.id}
                  artworkType="banner"
                  currentArtwork={bannerArtwork}
                  onSuccess={refreshArtwork}
                  onDelete={refreshArtwork}
                />
              </div>
            )}
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="modal-footer" style={{ padding: '1rem 0 0 0', marginTop: '0.75rem' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Show'}
          </Button>
        </div>
      </form>
    </>
  );
};

interface ShowFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToEdit?: Show | null;
  onSaved: (show: Show) => void;
}

export const ShowFormModal: React.FC<ShowFormModalProps> = ({
  isOpen,
  onClose,
  showToEdit,
  onSaved,
}) => {
  const isEdit = !!showToEdit;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Show: ${showToEdit?.title}` : 'Create New Show'}
      subtitle={
        isEdit
          ? 'Update show details, metadata, and upload required poster & hero banner artwork.'
          : 'Add a new show entry to the catalogue library.'
      }
      maxWidth="780px"
    >
      <ShowFormContent
        key={showToEdit ? showToEdit.id : 'new'}
        showToEdit={showToEdit}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
};
