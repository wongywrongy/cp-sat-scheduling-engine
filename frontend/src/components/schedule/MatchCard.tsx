import type { Assignment } from '../../types/schedule';
import { useScheduleStore } from '../../store/scheduleStore';

interface MatchCardProps {
  assignment: Assignment;
  slotIndex: number;
  intervalMinutes: number;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onClick?: () => void;
}

export function MatchCard({
  assignment,
  slotIndex,
  intervalMinutes,
  onDragStart,
  onDragEnd,
  onClick,
}: MatchCardProps) {
  const { matches } = useScheduleStore();
  const match = matches.find((m) => m.id === assignment.matchId);
  const startTime = slotIndex * intervalMinutes;
  const endTime = (slotIndex + assignment.durationSlots) * intervalMinutes;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        p-2 rounded border-2 cursor-pointer transition-all
        ${assignment.moved ? 'border-orange-400 bg-orange-50' : 'border-blue-400 bg-blue-50'}
        ${onDragStart ? 'hover:shadow-md hover:scale-105' : ''}
      `}
      style={{
        gridRow: `span ${assignment.durationSlots}`,
      }}
    >
      <div className="text-xs font-semibold text-gray-900">
        {match?.eventCode || assignment.matchId}
      </div>
      <div className="text-xs text-gray-600 mt-1">
        {formatTime(startTime)} - {formatTime(endTime)}
      </div>
      {assignment.moved && (
        <div className="text-xs text-orange-600 mt-1">Moved</div>
      )}
    </div>
  );
}
