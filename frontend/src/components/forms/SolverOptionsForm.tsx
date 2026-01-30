import { useState, useEffect } from 'react';
import type { SolverOptions } from '../../types/schedule';
import { useScheduleStore } from '../../store/scheduleStore';

export function SolverOptionsForm() {
  const { solverOptions, setSolverOptions } = useScheduleStore();
  const [formData, setFormData] = useState<SolverOptions>(
    solverOptions || {
      timeLimitSeconds: 5.0,
      numWorkers: 4,
      logProgress: false,
    }
  );

  useEffect(() => {
    if (solverOptions) {
      setFormData(solverOptions);
    }
  }, [solverOptions]);

  const handleChange = (field: keyof SolverOptions, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setSolverOptions(updated);
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900">Solver Options</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Time Limit (seconds)
        </label>
        <input
          type="number"
          min="0.1"
          max="300"
          step="0.1"
          value={formData.timeLimitSeconds}
          onChange={(e) =>
            handleChange('timeLimitSeconds', parseFloat(e.target.value) || 5.0)
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">Range: 0.1 - 300 seconds</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Number of Workers</label>
        <input
          type="number"
          min="1"
          max="16"
          value={formData.numWorkers}
          onChange={(e) =>
            handleChange('numWorkers', parseInt(e.target.value) || 4)
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">Range: 1 - 16 workers</p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.logProgress}
          onChange={(e) => handleChange('logProgress', e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label className="ml-2 text-sm text-gray-700">Log Solver Progress</label>
      </div>
    </div>
  );
}
