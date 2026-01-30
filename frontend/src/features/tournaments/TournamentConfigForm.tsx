import { useState, type FormEvent } from 'react';
import type { TournamentConfig, BreakWindow } from '../../api/dto';
import { isValidTime } from '../../lib/time';
import { SetupGuide } from './SetupGuide';

interface TournamentConfigFormProps {
  config: TournamentConfig;
  onSave: (config: TournamentConfig) => void;
  saving: boolean;
}

export function TournamentConfigForm({ config, onSave, saving }: TournamentConfigFormProps) {
  const [formData, setFormData] = useState<TournamentConfig>(config);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [breakWindows, setBreakWindows] = useState<BreakWindow[]>(config.breaks || []);
  const [showGuide, setShowGuide] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isValidTime(formData.dayStart)) {
      newErrors.dayStart = 'Invalid time format (HH:mm)';
    }
    if (!isValidTime(formData.dayEnd)) {
      newErrors.dayEnd = 'Invalid time format (HH:mm)';
    }
    if (formData.intervalMinutes < 5) {
      newErrors.intervalMinutes = 'Must be at least 5 minutes';
    }
    if (formData.courtCount < 1) {
      newErrors.courtCount = 'Must be at least 1';
    }
    if (formData.defaultRestMinutes < 0) {
      newErrors.defaultRestMinutes = 'Must be non-negative';
    }
    if (formData.freezeHorizonSlots < 0) {
      newErrors.freezeHorizonSlots = 'Must be non-negative';
    }

    // Validate break windows
    breakWindows.forEach((breakWindow, index) => {
      if (!isValidTime(breakWindow.start)) {
        newErrors[`break_${index}_start`] = 'Invalid time format';
      }
      if (!isValidTime(breakWindow.end)) {
        newErrors[`break_${index}_end`] = 'Invalid time format';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({ ...formData, breaks: breakWindows });
    }
  };

  const addBreak = () => {
    setBreakWindows([...breakWindows, { start: '12:00', end: '13:00' }]);
  };

  const removeBreak = (index: number) => {
    setBreakWindows(breakWindows.filter((_, i) => i !== index));
  };

  const updateBreak = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...breakWindows];
    updated[index] = { ...updated[index], [field]: value };
    setBreakWindows(updated);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Tournament Configuration</h3>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
          >
            <span>📖</span> Setup Guide
          </button>
        </div>

        <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interval Minutes
          </label>
          <input
            type="number"
            value={formData.intervalMinutes}
            onChange={(e) => setFormData({ ...formData, intervalMinutes: parseInt(e.target.value) || 0 })}
            className={`w-full px-3 py-2 border rounded-md ${errors.intervalMinutes ? 'border-red-500' : 'border-gray-300'}`}
            min="5"
          />
          <p className="text-xs text-gray-500 mt-1">
            Duration of each time slot. Common: 15, 30, 45, or 60 minutes
          </p>
          {errors.intervalMinutes && <p className="text-red-500 text-sm mt-1">{errors.intervalMinutes}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day Start (HH:mm)
            </label>
            <input
              type="text"
              value={formData.dayStart}
              onChange={(e) => setFormData({ ...formData, dayStart: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md ${errors.dayStart ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="09:00"
            />
            <p className="text-xs text-gray-500 mt-1">Tournament start time in 24-hour format</p>
            {errors.dayStart && <p className="text-red-500 text-sm mt-1">{errors.dayStart}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day End (HH:mm)
            </label>
            <input
              type="text"
              value={formData.dayEnd}
              onChange={(e) => setFormData({ ...formData, dayEnd: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md ${errors.dayEnd ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="18:00"
            />
            <p className="text-xs text-gray-500 mt-1">Tournament end time in 24-hour format</p>
            {errors.dayEnd && <p className="text-red-500 text-sm mt-1">{errors.dayEnd}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Court Count
          </label>
          <input
            type="number"
            value={formData.courtCount}
            onChange={(e) => setFormData({ ...formData, courtCount: parseInt(e.target.value) || 0 })}
            className={`w-full px-3 py-2 border rounded-md ${errors.courtCount ? 'border-red-500' : 'border-gray-300'}`}
            min="1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of courts available for simultaneous matches
          </p>
          {errors.courtCount && <p className="text-red-500 text-sm mt-1">{errors.courtCount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Rest Minutes
          </label>
          <input
            type="number"
            value={formData.defaultRestMinutes}
            onChange={(e) => setFormData({ ...formData, defaultRestMinutes: parseInt(e.target.value) || 0 })}
            className={`w-full px-3 py-2 border rounded-md ${errors.defaultRestMinutes ? 'border-red-500' : 'border-gray-300'}`}
            min="0"
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum rest time between matches (players can override individually)
          </p>
          {errors.defaultRestMinutes && <p className="text-red-500 text-sm mt-1">{errors.defaultRestMinutes}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Freeze Horizon Slots
          </label>
          <input
            type="number"
            value={formData.freezeHorizonSlots}
            onChange={(e) => setFormData({ ...formData, freezeHorizonSlots: parseInt(e.target.value) || 0 })}
            className={`w-full px-3 py-2 border rounded-md ${errors.freezeHorizonSlots ? 'border-red-500' : 'border-gray-300'}`}
            min="0"
          />
          <p className="text-xs text-gray-500 mt-1">
            Slots from current time that won't be rescheduled (0 = full flexibility)
          </p>
          {errors.freezeHorizonSlots && <p className="text-red-500 text-sm mt-1">{errors.freezeHorizonSlots}</p>}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Breaks
            </label>
            <button
              type="button"
              onClick={addBreak}
              className="text-sm px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Add Break
            </button>
          </div>
          <div className="space-y-2">
            {breakWindows.map((breakWindow, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={breakWindow.start}
                  onChange={(e) => updateBreak(index, 'start', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md ${errors[`break_${index}_start`] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="12:00"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="text"
                  value={breakWindow.end}
                  onChange={(e) => updateBreak(index, 'end', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md ${errors[`break_${index}_end`] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="13:00"
                />
                <button
                  type="button"
                  onClick={() => removeBreak(index)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`w-full px-4 py-2 rounded-md font-medium ${
            saving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
    <SetupGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}
