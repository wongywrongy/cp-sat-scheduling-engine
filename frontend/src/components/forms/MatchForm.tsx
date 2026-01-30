import { useState } from 'react';
import type { MatchInput } from '../../types/schedule';
import { useScheduleStore } from '../../store/scheduleStore';

interface MatchFormProps {
  match?: MatchInput;
  onSave: () => void;
  onCancel: () => void;
}

export function MatchForm({ match, onSave, onCancel }: MatchFormProps) {
  const { addMatch, updateMatch, players } = useScheduleStore();
  const [formData, setFormData] = useState<MatchInput>(
    match || {
      id: '',
      eventCode: '',
      durationSlots: 1,
      sideA: [],
      sideB: [],
    }
  );
  const [sideAInput, setSideAInput] = useState('');
  const [sideBInput, setSideBInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.eventCode) {
      alert('ID and Event Code are required');
      return;
    }
    if (formData.sideA.length === 0 || formData.sideB.length === 0) {
      alert('Both sides must have at least one player');
      return;
    }

    if (match) {
      updateMatch(match.id, formData);
    } else {
      addMatch(formData);
    }
    onSave();
  };

  const addPlayerToSide = (side: 'sideA' | 'sideB', playerId: string) => {
    if (playerId && !formData[side].includes(playerId)) {
      setFormData({
        ...formData,
        [side]: [...formData[side], playerId],
      });
    }
  };

  const removePlayerFromSide = (side: 'sideA' | 'sideB', playerId: string) => {
    setFormData({
      ...formData,
      [side]: formData[side].filter((id) => id !== playerId),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700">Match ID</label>
        <input
          type="text"
          value={formData.id}
          onChange={(e) => setFormData({ ...formData, id: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
          disabled={!!match}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Event Code</label>
        <input
          type="text"
          value={formData.eventCode}
          onChange={(e) => setFormData({ ...formData, eventCode: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="e.g., MS-1, MD-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Duration (Slots)</label>
        <input
          type="number"
          min="1"
          value={formData.durationSlots}
          onChange={(e) =>
            setFormData({
              ...formData,
              durationSlots: parseInt(e.target.value) || 1,
            })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Side A</label>
        <div className="flex gap-2 mt-1">
          <select
            value={sideAInput}
            onChange={(e) => {
              setSideAInput(e.target.value);
              if (e.target.value) {
                addPlayerToSide('sideA', e.target.value);
                setSideAInput('');
              }
            }}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select player...</option>
            {players
              .filter((p) => !formData.sideA.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
          </select>
        </div>
        <div className="mt-2 space-y-1">
          {formData.sideA.map((playerId) => {
            const player = players.find((p) => p.id === playerId);
            return (
              <div
                key={playerId}
                className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded"
              >
                <span className="text-sm">
                  {player?.name || playerId}
                </span>
                <button
                  type="button"
                  onClick={() => removePlayerFromSide('sideA', playerId)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Side B</label>
        <div className="flex gap-2 mt-1">
          <select
            value={sideBInput}
            onChange={(e) => {
              setSideBInput(e.target.value);
              if (e.target.value) {
                addPlayerToSide('sideB', e.target.value);
                setSideBInput('');
              }
            }}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select player...</option>
            {players
              .filter((p) => !formData.sideB.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
          </select>
        </div>
        <div className="mt-2 space-y-1">
          {formData.sideB.map((playerId) => {
            const player = players.find((p) => p.id === playerId);
            return (
              <div
                key={playerId}
                className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded"
              >
                <span className="text-sm">
                  {player?.name || playerId}
                </span>
                <button
                  type="button"
                  onClick={() => removePlayerFromSide('sideB', playerId)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          {match ? 'Update' : 'Add'} Match
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
