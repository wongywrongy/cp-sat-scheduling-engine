import { useState, useEffect } from 'react';
import type { ScheduleConfig } from '../../types/schedule';
import { useScheduleStore } from '../../store/scheduleStore';

export function ConfigForm() {
  const { config, setConfig } = useScheduleStore();
  const [formData, setFormData] = useState<ScheduleConfig>(
    config || {
      totalSlots: 20,
      courtCount: 4,
      intervalMinutes: 30,
      defaultRestSlots: 1,
      freezeHorizonSlots: 0,
      currentSlot: 0,
      softRestEnabled: false,
      disruptionPenalty: 1.0,
      lateFinishPenalty: 0.5,
      courtChangePenalty: 0.5,
    }
  );

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleChange = (field: keyof ScheduleConfig, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setConfig(updated);
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900">Tournament Configuration</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Total Slots</label>
          <input
            type="number"
            min="1"
            value={formData.totalSlots}
            onChange={(e) => handleChange('totalSlots', parseInt(e.target.value) || 1)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Court Count</label>
          <input
            type="number"
            min="1"
            value={formData.courtCount}
            onChange={(e) => handleChange('courtCount', parseInt(e.target.value) || 1)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Interval (Minutes)</label>
          <input
            type="number"
            min="5"
            value={formData.intervalMinutes}
            onChange={(e) => handleChange('intervalMinutes', parseInt(e.target.value) || 30)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Default Rest Slots</label>
          <input
            type="number"
            min="0"
            value={formData.defaultRestSlots}
            onChange={(e) => handleChange('defaultRestSlots', parseInt(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Freeze Horizon Slots</label>
          <input
            type="number"
            min="0"
            value={formData.freezeHorizonSlots}
            onChange={(e) => handleChange('freezeHorizonSlots', parseInt(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Current Slot</label>
          <input
            type="number"
            min="0"
            value={formData.currentSlot}
            onChange={(e) => handleChange('currentSlot', parseInt(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.softRestEnabled}
          onChange={(e) => handleChange('softRestEnabled', e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label className="ml-2 text-sm text-gray-700">Enable Soft Rest Constraints</label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Disruption Penalty</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={formData.disruptionPenalty}
            onChange={(e) => handleChange('disruptionPenalty', parseFloat(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Late Finish Penalty</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={formData.lateFinishPenalty}
            onChange={(e) => handleChange('lateFinishPenalty', parseFloat(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Court Change Penalty</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={formData.courtChangePenalty}
            onChange={(e) => handleChange('courtChangePenalty', parseFloat(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
