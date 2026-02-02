/**
 * Tournament File Management Component
 * Handles export/import of complete tournament data (config, players, matches, schedule, match states)
 */
import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { apiClient } from '../../api/client';
import type { TournamentExportV2 } from '../../api/dto';

export function TournamentFileManagement() {
  const config = useAppStore((state) => state.config);
  const players = useAppStore((state) => state.players);
  const matches = useAppStore((state) => state.matches);
  const schedule = useAppStore((state) => state.schedule);
  const setConfig = useAppStore((state) => state.setConfig);
  const setPlayers = useAppStore((state) => state.setPlayers);
  const setMatches = useAppStore((state) => state.setMatches);
  const setSchedule = useAppStore((state) => state.setSchedule);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      setMessage(null);

      // Fetch match states from backend (if they exist)
      let matchStates: Record<string, any> = {};
      try {
        const matchStatesArray = await apiClient.getMatchStates();
        matchStates = matchStatesArray.reduce(
          (acc, ms) => ({ ...acc, [ms.matchId]: ms }),
          {}
        );
      } catch (err) {
        // Match states might not exist yet - that's okay
        console.warn('Could not fetch match states:', err);
      }

      const exportData: TournamentExportV2 = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        config: config!,
        players,
        matches,
        schedule: schedule || undefined,
        matchStates: Object.keys(matchStates).length > 0 ? matchStates : undefined,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tournament_${config?.tournamentDate || new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Tournament data exported successfully!' });
    } catch (err) {
      console.error('Export error:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to export tournament data'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setMessage(null);

      const text = await file.text();
      const data: TournamentExportV2 = JSON.parse(text);

      // Validate version
      if (data.version !== '2.0') {
        throw new Error('Unsupported file version. Please use a newer export.');
      }

      // Validate required fields
      if (!data.config || !data.players || !data.matches) {
        throw new Error('Invalid tournament file: missing required data');
      }

      // Load into store
      setConfig(data.config);
      setPlayers(data.players);
      setMatches(data.matches);
      if (data.schedule) {
        setSchedule(data.schedule);
      }

      // Import match states to backend (if they exist)
      if (data.matchStates && Object.keys(data.matchStates).length > 0) {
        try {
          await apiClient.importMatchStatesBulk(data.matchStates);
        } catch (err) {
          console.warn('Could not import match states:', err);
        }
      }

      setMessage({
        type: 'success',
        text: `Tournament data imported successfully! Loaded ${data.players.length} players and ${data.matches.length} matches.`
      });

      // Clear the file input
      event.target.value = '';
    } catch (err) {
      console.error('Import error:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to import tournament data'
      });
    } finally {
      setImporting(false);
    }
  };

  const hasData = config && (players.length > 0 || matches.length > 0);

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h3 className="text-lg font-semibold">Tournament File Management</h3>

      <p className="text-sm text-gray-600">
        Export your complete tournament data to a portable JSON file that can be moved between computers.
        The file includes configuration, players, matches, schedule, and live tracking states.
      </p>

      {message && (
        <div
          className={`p-3 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleExport}
          disabled={!hasData || exporting}
          className={`px-4 py-2 rounded-md font-medium ${
            hasData && !exporting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {exporting ? 'Exporting...' : 'Export Tournament'}
        </button>

        <label
          className={`px-4 py-2 rounded-md font-medium cursor-pointer ${
            importing
              ? 'bg-gray-300 text-gray-500'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {importing ? 'Importing...' : 'Import Tournament'}
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={importing}
            className="hidden"
          />
        </label>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Tip:</strong> Regular exports act as backups. Copy the file to USB or cloud storage for safekeeping.</p>
        <p><strong>File format:</strong> tournament_2026-02-15.json</p>
        {!hasData && (
          <p className="text-yellow-700 mt-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            No tournament data to export. Create a configuration and add players/matches first.
          </p>
        )}
      </div>
    </div>
  );
}
