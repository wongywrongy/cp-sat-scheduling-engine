import { useEffect } from 'react';
import { useScheduleStore } from '../../store/scheduleStore';

export function CourtOrderManager() {
  const { config, courtOrder, setCourtOrder } = useScheduleStore();

  useEffect(() => {
    if (config && courtOrder.length !== config.courtCount) {
      // Initialize court order if not set
      const defaultOrder = Array.from({ length: config.courtCount }, (_, i) => i + 1);
      setCourtOrder(defaultOrder);
    }
  }, [config, courtOrder.length, setCourtOrder]);

  if (!config) return null;

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newOrder = [...courtOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setCourtOrder(newOrder);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Court Display Order</h3>
      <div className="space-y-2">
        {courtOrder.map((courtId, index) => (
          <div
            key={courtId}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <span className="font-medium">Court {courtId}</span>
            <div className="flex gap-1">
              {index > 0 && (
                <button
                  onClick={() => handleReorder(index, index - 1)}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  ↑
                </button>
              )}
              {index < courtOrder.length - 1 && (
                <button
                  onClick={() => handleReorder(index, index + 1)}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  ↓
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-600">
        Drag court headers in the schedule grid to reorder, or use the buttons above.
      </p>
    </div>
  );
}
