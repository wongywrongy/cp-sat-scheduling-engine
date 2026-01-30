import { useState, type FormEvent, useEffect } from 'react';
import { useRosterGroups } from '../../hooks/useRosterGroups';
import { RosterTreeSelector } from '../../components/roster/RosterTreeSelector';
import type { MatchDTO, PlayerDTO } from '../../api/dto';

interface RosterMatchFormProps {
  match?: MatchDTO;
  onSave: (match: MatchDTO) => void;
  onCancel: () => void;
}

export function RosterMatchForm({ match, onSave, onCancel }: RosterMatchFormProps) {
  const { groups, getPlayersInGroup } = useRosterGroups();
  const [formData, setFormData] = useState<MatchDTO>({
    id: match?.id || '',
    eventCode: match?.eventCode || '',
    matchType: match?.matchType || 'roster_vs_roster',
    sideA: match?.sideA || [],
    sideB: match?.sideB || [],
    rosterAId: match?.rosterAId,
    rosterBId: match?.rosterBId,
    selectedPlayersA: match?.selectedPlayersA || [],
    selectedPlayersB: match?.selectedPlayersB || [],
    durationSlots: match?.durationSlots || 1,
    preferredCourt: match?.preferredCourt || null,
    tags: match?.tags || [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [playersA, setPlayersA] = useState<PlayerDTO[]>([]);
  const [playersB, setPlayersB] = useState<PlayerDTO[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    if (match) {
      setFormData(match);
      if (match.rosterAId) {
        loadPlayersA(match.rosterAId);
      }
      if (match.rosterBId) {
        loadPlayersB(match.rosterBId);
      }
    }
  }, [match]);

  const loadPlayersA = async (rosterId: string) => {
    try {
      setLoadingPlayers(true);
      const players = await getPlayersInGroup(rosterId, true); // recursive
      setPlayersA(players);
    } catch (err) {
      console.error('Failed to load players for roster A:', err);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const loadPlayersB = async (rosterId: string) => {
    try {
      setLoadingPlayers(true);
      const players = await getPlayersInGroup(rosterId, true); // recursive
      setPlayersB(players);
    } catch (err) {
      console.error('Failed to load players for roster B:', err);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleRosterASelect = async (rosterId: string | null) => {
    if (!rosterId) {
      setFormData({ ...formData, rosterAId: undefined, selectedPlayersA: [] });
      setPlayersA([]);
      return;
    }

    setFormData({ ...formData, rosterAId: rosterId, selectedPlayersA: [] });
    await loadPlayersA(rosterId);
  };

  const handleRosterBSelect = async (rosterId: string | null) => {
    if (!rosterId) {
      setFormData({ ...formData, rosterBId: undefined, selectedPlayersB: [] });
      setPlayersB([]);
      return;
    }

    setFormData({ ...formData, rosterBId: rosterId, selectedPlayersB: [] });
    await loadPlayersB(rosterId);
  };

  const togglePlayerA = (playerId: string) => {
    setFormData({
      ...formData,
      selectedPlayersA: formData.selectedPlayersA?.includes(playerId)
        ? formData.selectedPlayersA.filter(id => id !== playerId)
        : [...(formData.selectedPlayersA || []), playerId],
    });
  };

  const togglePlayerB = (playerId: string) => {
    setFormData({
      ...formData,
      selectedPlayersB: formData.selectedPlayersB?.includes(playerId)
        ? formData.selectedPlayersB.filter(id => id !== playerId)
        : [...(formData.selectedPlayersB || []), playerId],
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = 'ID is required';
    }
    if (!formData.eventCode.trim()) {
      newErrors.eventCode = 'Event code is required';
    }
    if (!formData.rosterAId) {
      newErrors.rosterA = 'Roster A is required';
    }
    if (!formData.rosterBId) {
      newErrors.rosterB = 'Roster B is required';
    }
    if (!formData.selectedPlayersA || formData.selectedPlayersA.length === 0) {
      newErrors.playersA = 'At least one player required for Side A';
    }
    if (!formData.selectedPlayersB || formData.selectedPlayersB.length === 0) {
      newErrors.playersB = 'At least one player required for Side B';
    }
    if (formData.durationSlots < 1) {
      newErrors.durationSlots = 'Must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Convert selected players to sideA/sideB for backend compatibility
      const matchToSave: MatchDTO = {
        ...formData,
        sideA: formData.selectedPlayersA || [],
        sideB: formData.selectedPlayersB || [],
      };
      onSave(matchToSave);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{match ? 'Edit Roster Match' : 'Create Roster Match'}</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Match ID *
          </label>
          <input
            type="text"
            value={formData.id}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md ${errors.id ? 'border-red-500' : 'border-gray-300'}`}
            disabled={!!match}
          />
          {errors.id && <p className="text-red-500 text-sm mt-1">{errors.id}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Code *
          </label>
          <input
            type="text"
            value={formData.eventCode}
            onChange={(e) => setFormData({ ...formData, eventCode: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md ${errors.eventCode ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="MD10"
          />
          {errors.eventCode && <p className="text-red-500 text-sm mt-1">{errors.eventCode}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roster A *
            </label>
            <RosterTreeSelector
              groups={groups}
              selectedId={formData.rosterAId || null}
              onSelect={handleRosterASelect}
              allowNone={false}
              filterType="roster"
              searchPlaceholder="Select Roster A..."
            />
            {errors.rosterA && <p className="text-red-500 text-sm mt-1">{errors.rosterA}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roster B *
            </label>
            <RosterTreeSelector
              groups={groups}
              selectedId={formData.rosterBId || null}
              onSelect={handleRosterBSelect}
              allowNone={false}
              filterType="roster"
              searchPlaceholder="Select Roster B..."
            />
            {errors.rosterB && <p className="text-red-500 text-sm mt-1">{errors.rosterB}</p>}
          </div>
        </div>

        {loadingPlayers && (
          <div className="text-sm text-gray-500">Loading players...</div>
        )}

        {!loadingPlayers && (playersA.length > 0 || playersB.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Players from Roster A *
              </label>
              <div className="border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
                {playersA.length === 0 ? (
                  <div className="text-sm text-gray-500">No players in selected roster</div>
                ) : (
                  playersA.map((player) => (
                    <label key={player.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={formData.selectedPlayersA?.includes(player.id) || false}
                        onChange={() => togglePlayerA(player.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{player.name} ({player.id})</span>
                    </label>
                  ))
                )}
              </div>
              {errors.playersA && <p className="text-red-500 text-sm mt-1">{errors.playersA}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Players from Roster B *
              </label>
              <div className="border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
                {playersB.length === 0 ? (
                  <div className="text-sm text-gray-500">No players in selected roster</div>
                ) : (
                  playersB.map((player) => (
                    <label key={player.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={formData.selectedPlayersB?.includes(player.id) || false}
                        onChange={() => togglePlayerB(player.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{player.name} ({player.id})</span>
                    </label>
                  ))
                )}
              </div>
              {errors.playersB && <p className="text-red-500 text-sm mt-1">{errors.playersB}</p>}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration Slots *
          </label>
          <input
            type="number"
            value={formData.durationSlots}
            onChange={(e) => setFormData({ ...formData, durationSlots: parseInt(e.target.value) || 1 })}
            className={`w-full px-3 py-2 border rounded-md ${errors.durationSlots ? 'border-red-500' : 'border-gray-300'}`}
            min="1"
          />
          {errors.durationSlots && <p className="text-red-500 text-sm mt-1">{errors.durationSlots}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Court (optional)
          </label>
          <input
            type="number"
            value={formData.preferredCourt || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                preferredCourt: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="1"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
