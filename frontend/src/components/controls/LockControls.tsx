import { useState } from 'react';
import type { Assignment } from '../../types/schedule';
import { useScheduleStore } from '../../store/scheduleStore';

interface LockControlsProps {
  assignments: Assignment[];
}

export function LockControls({ assignments }: LockControlsProps) {
  const { scheduleResponse, setScheduleResponse } = useScheduleStore();
  const [lockedMatches, setLockedMatches] = useState<Set<string>>(new Set());

  const toggleLock = (matchId: string) => {
    const newLocked = new Set(lockedMatches);
    if (newLocked.has(matchId)) {
      newLocked.delete(matchId);
    } else {
      newLocked.add(matchId);
    }
    setLockedMatches(newLocked);

    // Update schedule response with locked status
    if (scheduleResponse) {
      const updatedAssignments = scheduleResponse.assignments.map((a) =>
        a.matchId === matchId
          ? { ...a, locked: newLocked.has(matchId) }
          : a
      );

      setScheduleResponse({
        ...scheduleResponse,
        assignments: updatedAssignments,
        lockedCount: newLocked.size,
      });
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Lock Matches</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {assignments.map((assignment) => {
          const isLocked = lockedMatches.has(assignment.matchId);
          return (
            <div
              key={assignment.matchId}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div>
                <div className="font-medium">Match {assignment.matchId}</div>
                <div className="text-sm text-gray-600">
                  Slot {assignment.slotId}, Court {assignment.courtId}
                </div>
              </div>
              <button
                onClick={() => toggleLock(assignment.matchId)}
                className={`px-3 py-1 rounded text-sm ${
                  isLocked
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {isLocked ? 'Unlock' : 'Lock'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-sm text-gray-600">
        Locked: {lockedMatches.size} / {assignments.length}
      </div>
    </div>
  );
}
