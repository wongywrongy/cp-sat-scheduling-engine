import { useMemo } from 'react';
import type { Assignment } from '../../types/schedule';
import { useScheduleStore } from '../../store/scheduleStore';
import { MatchCard } from './MatchCard';
import { CourtHeader } from './CourtHeader';

interface ScheduleGridProps {
  assignments: Assignment[];
  onAssignmentClick?: (assignment: Assignment) => void;
}

export function ScheduleGrid({ assignments, onAssignmentClick }: ScheduleGridProps) {
  const { config, courtOrder } = useScheduleStore();

  if (!config) return null;

  const { totalSlots, courtCount, intervalMinutes } = config;
  const displayCourtOrder = courtOrder.length === courtCount
    ? courtOrder
    : Array.from({ length: courtCount }, (_, i) => i + 1);

  // Group assignments by court and slot
  const scheduleMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    assignments.forEach((assignment) => {
      const key = `${assignment.courtId}-${assignment.slotId}`;
      map.set(key, assignment);
    });
    return map;
  }, [assignments]);

  const formatTime = (slotIndex: number) => {
    const minutes = slotIndex * intervalMinutes;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-1 border-2 border-gray-300"
        style={{
          gridTemplateColumns: `120px repeat(${courtCount}, 200px)`,
          gridTemplateRows: `auto repeat(${totalSlots}, 60px)`,
        }}
      >
        {/* Empty corner */}
        <div className="bg-gray-200 p-2 font-semibold border-b-2 border-gray-300">
          Time
        </div>

        {/* Court headers */}
        {displayCourtOrder.map((courtId) => (
          <CourtHeader key={courtId} courtId={courtId} />
        ))}

        {/* Time slots and matches */}
        {Array.from({ length: totalSlots }, (_, slotIndex) => (
          <div key={`time-${slotIndex}`} className="contents">
            {/* Time label */}
            <div className="bg-gray-50 p-2 text-sm text-gray-700 border-r-2 border-gray-300 flex items-center justify-center">
              {formatTime(slotIndex)}
            </div>

            {/* Court cells */}
            {displayCourtOrder.map((courtId) => {
              const key = `${courtId}-${slotIndex}`;
              const assignment = scheduleMap.get(key);

              if (assignment && assignment.slotId === slotIndex) {
                return (
                  <MatchCard
                    key={key}
                    assignment={assignment}
                    slotIndex={slotIndex}
                    intervalMinutes={intervalMinutes}
                    onClick={() => onAssignmentClick?.(assignment)}
                  />
                );
              }

              return (
                <div
                  key={key}
                  className="bg-white border border-gray-200 min-h-[60px]"
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
