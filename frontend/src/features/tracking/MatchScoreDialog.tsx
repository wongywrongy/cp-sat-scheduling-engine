/**
 * Match Score Dialog Component
 * Modal dialog for entering match scores when finishing a match
 */
import { useState } from 'react';

interface MatchScoreDialogProps {
  matchName: string;
  sideAName: string;
  sideBName: string;
  onSubmit: (score: { sideA: number; sideB: number }, notes: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function MatchScoreDialog({
  matchName,
  sideAName,
  sideBName,
  onSubmit,
  onCancel,
  isSubmitting = false
}: MatchScoreDialogProps) {
  const [scoreA, setScoreA] = useState<string>('');
  const [scoreB, setScoreB] = useState<string>('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const sideAScore = parseInt(scoreA);
    const sideBScore = parseInt(scoreB);

    if (isNaN(sideAScore) || isNaN(sideBScore)) {
      alert('Please enter valid scores for both sides');
      return;
    }

    if (sideAScore < 0 || sideBScore < 0) {
      alert('Scores must be non-negative');
      return;
    }

    onSubmit({ sideA: sideAScore, sideB: sideBScore }, notes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-purple-600 text-white px-4 py-2 rounded-t">
          <h3 className="text-base font-semibold">Finish Match: {matchName}</h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Side A Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {sideAName || 'Side A'} Score
            </label>
            <input
              type="number"
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter score"
              min="0"
              required
              autoFocus
            />
          </div>

          {/* Side B Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {sideBName || 'Side B'} Score
            </label>
            <input
              type="number"
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter score"
              min="0"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Add any notes about the match..."
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-sm text-sm hover:bg-gray-50 disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded-sm text-sm hover:bg-purple-700 disabled:bg-gray-400 font-medium"
            >
              {isSubmitting ? 'Saving...' : 'Save & Finish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
