import { useState } from 'react';
import type { PlayerInput } from '../../types/schedule';
import { useScheduleStore } from '../../store/scheduleStore';

interface PlayerFormProps {
  player?: PlayerInput;
  onSave: () => void;
  onCancel: () => void;
}

export function PlayerForm({ player, onSave, onCancel }: PlayerFormProps) {
  const { addPlayer, updatePlayer } = useScheduleStore();
  const [formData, setFormData] = useState<PlayerInput>(
    player || {
      id: '',
      name: '',
      availability: [],
      restSlots: 1,
      restIsHard: true,
      restPenalty: 10.0,
    }
  );
  const [availabilityInput, setAvailabilityInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) {
      alert('ID and Name are required');
      return;
    }

    if (player) {
      updatePlayer(player.id, formData);
    } else {
      addPlayer(formData);
    }
    onSave();
  };

  const addAvailability = () => {
    const parts = availabilityInput.split('-').map((s) => s.trim());
    if (parts.length === 2) {
      const start = parseInt(parts[0]);
      const end = parseInt(parts[1]);
      if (!isNaN(start) && !isNaN(end) && start < end) {
        setFormData({
          ...formData,
          availability: [...formData.availability, [start, end]],
        });
        setAvailabilityInput('');
      }
    }
  };

  const removeAvailability = (index: number) => {
    setFormData({
      ...formData,
      availability: formData.availability.filter((_, i) => i !== index),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700">Player ID</label>
        <input
          type="text"
          value={formData.id}
          onChange={(e) => setFormData({ ...formData, id: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
          disabled={!!player}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Rest Slots</label>
        <input
          type="number"
          min="0"
          value={formData.restSlots}
          onChange={(e) =>
            setFormData({ ...formData, restSlots: parseInt(e.target.value) || 0 })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.restIsHard}
          onChange={(e) =>
            setFormData({ ...formData, restIsHard: e.target.checked })
          }
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label className="ml-2 text-sm text-gray-700">Hard Rest Constraint</label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Availability</label>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            placeholder="e.g., 0-10 or 12-20"
            value={availabilityInput}
            onChange={(e) => setAvailabilityInput(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addAvailability}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Add
          </button>
        </div>
        <div className="mt-2 space-y-1">
          {formData.availability.map(([start, end], index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded"
            >
              <span className="text-sm">
                Slot {start} - {end}
              </span>
              <button
                type="button"
                onClick={() => removeAvailability(index)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Leave empty for always available. Format: start-end (e.g., 0-10)
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          {player ? 'Update' : 'Add'} Player
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
