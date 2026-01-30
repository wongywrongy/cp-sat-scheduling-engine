import { useState } from 'react';
import { useScheduleStore } from '../../store/scheduleStore';
import { apiClient } from '../../services/api';
import type { ScheduleRequest } from '../../types/schedule';

export function ReOptimizeButton() {
  const {
    players,
    matches,
    config,
    solverOptions,
    scheduleResponse,
    setScheduleResponse,
    setLoading,
    setError,
    getPreviousAssignments,
  } = useScheduleStore();
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleReOptimize = async () => {
    if (!config) {
      alert('Please configure the tournament first');
      return;
    }

    if (players.length === 0 || matches.length === 0) {
      alert('Please add players and matches first');
      return;
    }

    setIsOptimizing(true);
    setLoading(true);
    setError(null);

    try {
      const request: ScheduleRequest = {
        config,
        players,
        matches,
        previousAssignments: scheduleResponse ? getPreviousAssignments() : [],
        solverOptions: solverOptions || undefined,
      };

      const response = await apiClient.generateSchedule(request);
      setScheduleResponse(response);
    } catch (error: any) {
      setError(error.message || 'Failed to re-optimize schedule');
      alert(`Error: ${error.message || 'Failed to re-optimize schedule'}`);
    } finally {
      setIsOptimizing(false);
      setLoading(false);
    }
  };

  if (!scheduleResponse) {
    return null;
  }

  return (
    <button
      onClick={handleReOptimize}
      disabled={isOptimizing}
      className={`
        px-6 py-3 rounded-lg font-semibold
        ${isOptimizing
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700'
        }
        text-white
      `}
    >
      {isOptimizing ? 'Re-optimizing...' : 'Re-optimize Schedule'}
    </button>
  );
}
