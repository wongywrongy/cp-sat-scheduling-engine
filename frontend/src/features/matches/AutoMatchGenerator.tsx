import { useState } from 'react';
import { useRosterGroups } from '../../hooks/useRosterGroups';
import { apiClient } from '../../api/client';
import { RosterTreeSelector } from '../../components/roster/RosterTreeSelector';
import type { MatchGenerationRule, MatchDTO } from '../../api/dto';

interface AutoMatchGeneratorProps {
  onGenerate: (matches: MatchDTO[]) => void;
  onCancel: () => void;
}

export function AutoMatchGenerator({ onGenerate, onCancel }: AutoMatchGeneratorProps) {
  const { groups } = useRosterGroups();
  const [rule, setRule] = useState<MatchGenerationRule>({
    type: 'all_vs_all',
    rosterAId: '',
    rosterBId: undefined,
    playersPerSide: 1,
    constraints: {
      avoidSameGroup: false,
      maxMatchesPerPlayer: undefined,
    },
  });
  const [previewMatches, setPreviewMatches] = useState<MatchDTO[]>([]);
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePreview = async () => {
    if (!rule.rosterAId) {
      setErrors({ rosterA: 'Roster A is required' });
      return;
    }

    try {
      setGenerating(true);
      setErrors({});
      const matches = await apiClient.generateMatchesFromRule('default', rule);
      setPreviewMatches(matches);
    } catch (err) {
      setErrors({ preview: err instanceof Error ? err.message : 'Failed to generate preview' });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (previewMatches.length === 0) {
      setErrors({ generate: 'Please preview matches first' });
      return;
    }
    onGenerate(previewMatches);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Auto-Generate Matches</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Generation Type *
          </label>
          <select
            value={rule.type}
            onChange={(e) => setRule({ ...rule, type: e.target.value as MatchGenerationRule['type'] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="all_vs_all">All vs All (every combination)</option>
            <option value="round_robin">Round Robin (each plays each once)</option>
            <option value="bracket">Bracket (elimination tournament)</option>
            <option value="custom">Custom Rules</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {rule.type === 'all_vs_all' && 'Generates all possible match combinations'}
            {rule.type === 'round_robin' && 'Each player/team plays every other player/team once'}
            {rule.type === 'bracket' && 'Single elimination bracket (coming soon)'}
            {rule.type === 'custom' && 'Define custom generation rules'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roster A *
            </label>
            <RosterTreeSelector
              groups={groups}
              selectedId={rule.rosterAId || null}
              onSelect={(id) => setRule({ ...rule, rosterAId: id || '' })}
              allowNone={false}
              filterType="roster"
              searchPlaceholder="Select Roster A..."
            />
            {errors.rosterA && <p className="text-red-500 text-sm mt-1">{errors.rosterA}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roster B (optional - leave empty for within-roster)
            </label>
            <RosterTreeSelector
              groups={groups}
              selectedId={rule.rosterBId || null}
              onSelect={(id) => setRule({ ...rule, rosterBId: id || undefined })}
              allowNone={true}
              filterType="roster"
              searchPlaceholder="Select Roster B (optional)..."
            />
            <p className="text-xs text-gray-500 mt-1">
              If empty, matches will be generated within Roster A
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Players Per Side *
          </label>
          <input
            type="number"
            value={rule.playersPerSide}
            onChange={(e) => setRule({ ...rule, playersPerSide: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="1"
          />
          <p className="text-xs text-gray-500 mt-1">
            1 for singles, 2 for doubles, etc.
          </p>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-700 mb-2">Constraints (optional)</h4>
          
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={rule.constraints?.avoidSameGroup || false}
                onChange={(e) => setRule({
                  ...rule,
                  constraints: { ...rule.constraints, avoidSameGroup: e.target.checked },
                })}
                className="rounded"
              />
              <span className="text-sm">Avoid matches between players from same immediate group</span>
            </label>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Max Matches Per Player (optional)
              </label>
              <input
                type="number"
                value={rule.constraints?.maxMatchesPerPlayer || ''}
                onChange={(e) => setRule({
                  ...rule,
                  constraints: {
                    ...rule.constraints,
                    maxMatchesPerPlayer: e.target.value ? parseInt(e.target.value) : undefined,
                  },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                placeholder="No limit"
              />
            </div>
          </div>
        </div>

        {errors.preview && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {errors.preview}
          </div>
        )}

        {errors.generate && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {errors.generate}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={generating || !rule.rosterAId}
            className={`px-4 py-2 rounded-md ${
              generating || !rule.rosterAId
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {generating ? 'Generating Preview...' : 'Preview Matches'}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={previewMatches.length === 0}
            className={`px-4 py-2 rounded-md ${
              previewMatches.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            Generate {previewMatches.length > 0 ? `${previewMatches.length} ` : ''}Matches
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>

        {previewMatches.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-700 mb-2">
              Preview: {previewMatches.length} match{previewMatches.length !== 1 ? 'es' : ''} will be created
            </h4>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
              <div className="space-y-1 text-sm">
                {previewMatches.slice(0, 20).map((match, idx) => (
                  <div key={idx} className="text-gray-700">
                    {match.eventCode}: {match.sideA.join(', ')} vs {match.sideB.join(', ')}
                  </div>
                ))}
                {previewMatches.length > 20 && (
                  <div className="text-gray-500 text-xs mt-2">
                    ... and {previewMatches.length - 20} more matches
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
