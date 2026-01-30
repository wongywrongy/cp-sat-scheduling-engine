import { useState } from 'react';
import { useScheduleStore } from '../../store/scheduleStore';
import { importFromJSON } from '../../utils/importers';
import type { ScheduleRequest } from '../../types/schedule';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const {
    setPlayers,
    setMatches,
    setConfig,
    setSolverOptions,
    setScheduleResponse,
  } = useScheduleStore();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const data: ScheduleRequest = await importFromJSON(file);

      // Import the data into the store
      if (data.players) setPlayers(data.players);
      if (data.matches) setMatches(data.matches);
      if (data.config) setConfig(data.config);
      if (data.solverOptions) setSolverOptions(data.solverOptions);

      // Clear schedule response since we're importing new data
      setScheduleResponse(null);

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import file');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Import Schedule Data</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select JSON file
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
