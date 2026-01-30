import { useState, type FormEvent } from 'react';
import type { MatchesImportDTO } from '../../api/dto';

interface MatchesImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: MatchesImportDTO) => Promise<void>;
}

export function MatchesImportDialog({ isOpen, onClose, onImport }: MatchesImportDialogProps) {
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      setError('CSV content is required');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      await onImport({ csv: csvContent });
      setCsvContent('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import matches');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Import Matches from CSV</h3>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV Content (format: id,eventCode,sideA,sideB,durationSlots,preferredCourt,tags)
            </label>
            <textarea
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              rows={10}
              placeholder="match1,MD10,player1 player2,player3 player4,1,1,finals"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              disabled={importing}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importing}
              className={`px-4 py-2 rounded-md text-white ${
                importing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
