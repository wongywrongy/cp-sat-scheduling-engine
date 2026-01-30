import { useScheduleStore } from '../../store/scheduleStore';

export function FreezeHorizonControl() {
  const { config, setConfig } = useScheduleStore();

  if (!config) return null;

  const handleChange = (value: number) => {
    setConfig({
      ...config,
      freezeHorizonSlots: Math.max(0, value),
    });
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Freeze Horizon</h3>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Freeze Horizon Slots
        </label>
        <input
          type="number"
          min="0"
          value={config.freezeHorizonSlots}
          onChange={(e) => handleChange(parseInt(e.target.value) || 0)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500">
          Matches within {config.freezeHorizonSlots} slots from current slot ({config.currentSlot}) will be frozen
        </p>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Slot
          </label>
          <input
            type="number"
            min="0"
            value={config.currentSlot}
            onChange={(e) =>
              setConfig({
                ...config,
                currentSlot: Math.max(0, parseInt(e.target.value) || 0),
              })
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
