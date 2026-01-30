import type { Assignment } from '../../types/schedule';
import { useScheduleStore } from '../../store/scheduleStore';

interface ScheduleTimelineProps {
  assignments: Assignment[];
  onAssignmentClick?: (assignment: Assignment) => void;
}

export function ScheduleTimeline({ assignments, onAssignmentClick }: ScheduleTimelineProps) {
  const { config, matches } = useScheduleStore();

  if (!config) return null;

  const { totalSlots, intervalMinutes } = config;

  const formatTime = (slotIndex: number) => {
    const minutes = slotIndex * intervalMinutes;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Group assignments by slot
  const assignmentsBySlot = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.slotId]) {
      acc[assignment.slotId] = [];
    }
    acc[assignment.slotId].push(assignment);
    return acc;
  }, {} as Record<number, Assignment[]>);

  return (
    <div className="space-y-2">
      {Array.from({ length: totalSlots }, (_, slotIndex) => {
        const slotAssignments = assignmentsBySlot[slotIndex] || [];
        return (
          <div
            key={slotIndex}
            className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
          >
            <div className="w-24 text-sm font-medium text-gray-700">
              {formatTime(slotIndex)}
            </div>
            <div className="flex-1 flex gap-2 flex-wrap">
              {slotAssignments.map((assignment) => {
                const match = matches.find((m) => m.id === assignment.matchId);
                return (
                  <div
                    key={assignment.matchId}
                    onClick={() => onAssignmentClick?.(assignment)}
                    className={`
                      px-3 py-1 rounded text-sm cursor-pointer
                      ${assignment.moved ? 'bg-orange-100 border-orange-300' : 'bg-blue-100 border-blue-300'}
                      border
                    `}
                  >
                    <div className="font-semibold">
                      {match?.eventCode || assignment.matchId}
                    </div>
                    <div className="text-xs text-gray-600">
                      Court {assignment.courtId}
                    </div>
                  </div>
                );
              })}
              {slotAssignments.length === 0 && (
                <span className="text-gray-400 text-sm">No matches</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
