import { useScheduleStore } from '../../store/scheduleStore';
import { exportToJSON, exportScheduleToCSV } from '../../utils/exporters';
import type { ScheduleRequest } from '../../types/schedule';

export function ExportMenu() {
  const {
    players,
    matches,
    config,
    solverOptions,
    scheduleResponse,
    getPreviousAssignments,
  } = useScheduleStore();

  const handleExportRequest = () => {
    if (!config) {
      alert('No configuration to export');
      return;
    }

    const request: ScheduleRequest = {
      config,
      players,
      matches,
      previousAssignments: scheduleResponse ? getPreviousAssignments() : [],
      solverOptions: solverOptions || undefined,
    };

    exportToJSON(request, `schedule_request_${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleExportResponse = () => {
    if (!scheduleResponse) {
      alert('No schedule to export');
      return;
    }

    exportToJSON(scheduleResponse, `schedule_response_${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleExportCSV = () => {
    if (!scheduleResponse || !config) {
      alert('No schedule to export');
      return;
    }

    exportScheduleToCSV(scheduleResponse, matches, config.intervalMinutes);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Export</h3>
      <div className="space-y-2">
        <button
          onClick={handleExportRequest}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Export Request (JSON)
        </button>
        <button
          onClick={handleExportResponse}
          disabled={!scheduleResponse}
          className={`w-full px-4 py-2 rounded-md ${
            scheduleResponse
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Export Schedule (JSON)
        </button>
        <button
          onClick={handleExportCSV}
          disabled={!scheduleResponse}
          className={`w-full px-4 py-2 rounded-md ${
            scheduleResponse
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Export Schedule (CSV)
        </button>
      </div>
    </div>
  );
}
