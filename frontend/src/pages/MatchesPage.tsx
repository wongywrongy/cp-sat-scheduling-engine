import { useState } from 'react';
import { useMatches } from '../hooks/useMatches';
import { MatchesList } from '../features/matches/MatchesList';
import { MatchForm } from '../features/matches/MatchForm';
import { VisualMatchGenerator } from '../features/matches/VisualMatchGenerator';
import { MatchBulkActionsToolbar } from '../features/matches/MatchBulkActionsToolbar';
import type { MatchDTO } from '../api/dto';

export function MatchesPage() {
  const { matches, loading, error, createMatch, updateMatch, deleteMatch } = useMatches();
  const [showForm, setShowForm] = useState(false);
  const [showVisualGenerator, setShowVisualGenerator] = useState(false);
  const [matchType, setMatchType] = useState<'dual' | 'tri'>('dual');
  const [editingMatch, setEditingMatch] = useState<MatchDTO | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);

  const handleEdit = (match: MatchDTO) => {
    setEditingMatch(match);
    setShowForm(true);
  };

  const handleSave = async (match: MatchDTO) => {
    try {
      if (editingMatch) {
        await updateMatch(match.id, match);
      } else {
        await createMatch(match);
      }
      setShowForm(false);
      setEditingMatch(null);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMatch(null);
  };

  const handleDelete = async (matchId: string) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      await deleteMatch(matchId);
    }
  };

  const handleAddMatch = () => {
    setEditingMatch(null);
    setShowForm(true);
  };

  const handleSaveGeneratedMatches = async (generatedMatches: MatchDTO[]) => {
    try {
      for (const match of generatedMatches) {
        await createMatch(match);
      }
      setShowVisualGenerator(false);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedMatchIds.length;
    if (window.confirm(`Are you sure you want to delete ${count} match${count !== 1 ? 'es' : ''}?`)) {
      try {
        for (const matchId of selectedMatchIds) {
          await deleteMatch(matchId);
        }
        setSelectedMatchIds([]);
      } catch (err) {
        // Error handled by hook
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedMatchIds([]);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Matches</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMatchType('dual');
              setShowVisualGenerator(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Visual Generator (Dual)
          </button>
          <button
            onClick={() => {
              setMatchType('tri');
              setShowVisualGenerator(true);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Visual Generator (Tri-Meet)
          </button>
          <button
            onClick={handleAddMatch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Match Manually
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {showVisualGenerator && (
        <div className="mb-6">
          <VisualMatchGenerator
            matchType={matchType}
            onSaveMatches={handleSaveGeneratedMatches}
            onCancel={() => setShowVisualGenerator(false)}
          />
        </div>
      )}

      {showForm && !showVisualGenerator && (
        <div className="mb-6">
          <MatchForm
            match={editingMatch || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading matches...</div>
        </div>
      ) : (
        <MatchesList
          matches={matches}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSelectionChange={setSelectedMatchIds}
        />
      )}

      <MatchBulkActionsToolbar
        selectedCount={selectedMatchIds.length}
        onBulkDelete={handleBulkDelete}
        onClearSelection={handleClearSelection}
      />
    </div>
  );
}
