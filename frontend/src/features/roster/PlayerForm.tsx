import { useState, type FormEvent, useEffect } from 'react';
import { useRosterGroups } from '../../hooks/useRosterGroups';
import type { PlayerDTO, AvailabilityWindow } from '../../api/dto';
import { isValidTime } from '../../lib/time';

interface PlayerFormProps {
  player?: PlayerDTO;
  onSave: (player: PlayerDTO) => void;
  onCancel: () => void;
}

export function PlayerForm({ player, onSave, onCancel }: PlayerFormProps) {
  const { groups } = useRosterGroups();
  const [formData, setFormData] = useState<PlayerDTO>({
    id: player?.id || '',
    name: player?.name || '',
    groupId: player?.groupId || null,
    rank: player?.rank || null,
    availability: player?.availability || [],
    minRestMinutes: player?.minRestMinutes || 30,
    notes: player?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availabilityWindows, setAvailabilityWindows] = useState<AvailabilityWindow[]>(
    player?.availability || []
  );

  useEffect(() => {
    if (player) {
      setFormData(player);
      setAvailabilityWindows(player.availability || []);
    }
  }, [player]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = 'ID is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (formData.minRestMinutes < 0) {
      newErrors.minRestMinutes = 'Must be non-negative';
    }

    availabilityWindows.forEach((window, index) => {
      if (!isValidTime(window.start)) {
        newErrors[`avail_${index}_start`] = 'Invalid time format';
      }
      if (!isValidTime(window.end)) {
        newErrors[`avail_${index}_end`] = 'Invalid time format';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({ ...formData, availability: availabilityWindows });
    }
  };

  const addAvailabilityWindow = () => {
    setAvailabilityWindows([...availabilityWindows, { start: '09:00', end: '18:00' }]);
  };

  const removeAvailabilityWindow = (index: number) => {
    setAvailabilityWindows(availabilityWindows.filter((_, i) => i !== index));
  };

  const updateAvailabilityWindow = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...availabilityWindows];
    updated[index] = { ...updated[index], [field]: value };
    setAvailabilityWindows(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">
        {player ? 'Edit Player' : 'Add Player'}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Player ID *
          </label>
          <input
            type="text"
            value={formData.id}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md ${errors.id ? 'border-red-500' : 'border-gray-300'}`}
            disabled={!!player}
          />
          {errors.id && <p className="text-red-500 text-sm mt-1">{errors.id}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Rest Minutes
          </label>
          <input
            type="number"
            value={formData.minRestMinutes}
            onChange={(e) => setFormData({ ...formData, minRestMinutes: parseInt(e.target.value) || 0 })}
            className={`w-full px-3 py-2 border rounded-md ${errors.minRestMinutes ? 'border-red-500' : 'border-gray-300'}`}
            min="0"
          />
          {errors.minRestMinutes && <p className="text-red-500 text-sm mt-1">{errors.minRestMinutes}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            School Group (optional)
          </label>
          <select
            value={formData.groupId || ''}
            onChange={(e) => setFormData({ ...formData, groupId: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">No group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rank/Event (optional)
          </label>
          <select
            value={formData.rank || ''}
            onChange={(e) => setFormData({ ...formData, rank: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">No rank</option>
            <option value="MS1">MS1 - Men's Singles 1</option>
            <option value="MS2">MS2 - Men's Singles 2</option>
            <option value="MS3">MS3 - Men's Singles 3</option>
            <option value="WS1">WS1 - Women's Singles 1</option>
            <option value="WS2">WS2 - Women's Singles 2</option>
            <option value="WS3">WS3 - Women's Singles 3</option>
            <option value="MD1">MD1 - Men's Doubles 1</option>
            <option value="MD2">MD2 - Men's Doubles 2</option>
            <option value="WD1">WD1 - Women's Doubles 1</option>
            <option value="WD2">WD2 - Women's Doubles 2</option>
            <option value="XD1">XD1 - Mixed Doubles 1</option>
            <option value="XD2">XD2 - Mixed Doubles 2</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Rank/event for match pairing (e.g., MS1 players from each school will be matched)
          </p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Availability Windows
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                Leave empty for always available. Format: HH:mm (24-hour format)
              </p>
            </div>
            <button
              type="button"
              onClick={addAvailabilityWindow}
              className="text-sm px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Add Window
            </button>
          </div>
          {availabilityWindows.length === 0 && (
            <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
              No availability windows set. Player will be available all day.
            </div>
          )}
          <div className="space-y-2">
            {availabilityWindows.map((window, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={window.start}
                  onChange={(e) => updateAvailabilityWindow(index, 'start', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md ${errors[`avail_${index}_start`] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="09:00"
                  pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
                  title="Time in HH:mm format (e.g., 09:00)"
                />
                <span className="text-gray-500 font-medium">to</span>
                <input
                  type="text"
                  value={window.end}
                  onChange={(e) => updateAvailabilityWindow(index, 'end', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md ${errors[`avail_${index}_end`] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="18:00"
                  pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]$"
                  title="Time in HH:mm format (e.g., 18:00)"
                />
                <button
                  type="button"
                  onClick={() => removeAvailabilityWindow(index)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  title="Remove this availability window"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {availabilityWindows.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              <strong>Example:</strong> 09:00 to 12:00 and 14:00 to 18:00 means player is available in the morning and afternoon, but not during lunch break.
            </p>
          )}
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
