import React, { useState } from 'react';
import { seasonsApi, extractErrorMessage } from '../../api/client';
import type { Season, SeasonCreate } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

interface SeasonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  showId: string;
  existingSeasonNumbers: number[];
  onCreated: (season: Season) => void;
}

export const SeasonFormModal: React.FC<SeasonFormModalProps> = ({
  isOpen,
  onClose,
  showId,
  existingSeasonNumbers,
  onCreated,
}) => {
  // Suggest next season number
  const nextDefaultNumber =
    existingSeasonNumbers.length === 0
      ? 1
      : Math.max(...existingSeasonNumbers) + 1;

  const [seasonNumber, setSeasonNumber] = useState(nextDefaultNumber);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const num = Number(seasonNumber);
    if (isNaN(num) || num < 0) {
      setError('Season number must be a non-negative integer (0 is reserved for Trailers).');
      return;
    }

    if (existingSeasonNumbers.includes(num)) {
      setError(`Season ${num} already exists for this show.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const data: SeasonCreate = {
        show_id: showId,
        season_number: num,
        title: title.trim() || (num === 0 ? 'Trailers & Teasers' : `Season ${num}`),
      };
      const created = await seasonsApi.createSeason(data);
      onCreated(created);
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Season"
      subtitle="Create a new season container for episodes. Season 0 is reserved for Trailers."
      maxWidth="500px"
    >
      {error && (
        <Alert type="danger" title="Creation Failed">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Season Number <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="number"
            min={0}
            className="form-input"
            value={seasonNumber}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setSeasonNumber(isNaN(n) ? 0 : n);
              if (n === 0 && !title) {
                setTitle('Trailers & Teasers');
              }
            }}
            required
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Enter 0 for Trailers. Standard seasons start at 1.
          </span>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Season Title / Label</label>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={seasonNumber === 0 ? 'Trailers & Teasers' : `Season ${seasonNumber}`}
          />
        </div>

        <div className="modal-footer" style={{ padding: '1rem 0 0 0', marginTop: '0.5rem' }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Season'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
