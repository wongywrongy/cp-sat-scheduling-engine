/**
 * Live timeline grid showing matches as dot nodes on a court x timeslot grid
 * Enhanced with animations during schedule generation
 */
import { useMemo, useEffect, useState, useRef } from 'react';
import { calculateTotalSlots, formatSlotTime } from '../../../utils/timeUtils';
import type { ScheduleAssignment, MatchDTO, PlayerDTO, TournamentConfig } from '../../../api/dto';

interface LiveTimelineGridProps {
  assignments: ScheduleAssignment[];
  matches: MatchDTO[];
  players: PlayerDTO[];
  config: TournamentConfig;
  status?: 'solving' | 'complete' | 'error';
}

// Event type colors for visual distinction
const EVENT_COLORS: Record<string, { dot: string; line: string; label: string }> = {
  MS: { dot: 'bg-blue-500', line: 'bg-blue-300', label: "Men's Singles" },
  WS: { dot: 'bg-pink-500', line: 'bg-pink-300', label: "Women's Singles" },
  MD: { dot: 'bg-emerald-500', line: 'bg-emerald-300', label: "Men's Doubles" },
  WD: { dot: 'bg-purple-500', line: 'bg-purple-300', label: "Women's Doubles" },
  XD: { dot: 'bg-orange-500', line: 'bg-orange-300', label: "Mixed Doubles" },
};

const DEFAULT_COLOR = { dot: 'bg-gray-400', line: 'bg-gray-300', label: 'Unknown' };

export function LiveTimelineGrid({
  assignments,
  matches,
  players,
  config,
  status = 'solving',
}: LiveTimelineGridProps) {
  // Track which assignments are "new" for animation purposes
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set());
  const prevAssignmentsRef = useRef<string[]>([]);
  const [pulseWave, setPulseWave] = useState(0);

  // Build lookup maps
  const matchMap = useMemo(() => new Map(matches.map(m => [m.id, m])), [matches]);
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  // Calculate time slots (handles overnight schedules)
  const totalSlots = useMemo(() => calculateTotalSlots(config), [config]);

  // Determine visible slot range (only show slots that have matches)
  const { minSlot, maxSlot } = useMemo(() => {
    if (assignments.length === 0) return { minSlot: 0, maxSlot: Math.min(12, totalSlots) };
    const slots = assignments.map(a => a.slotId);
    const endSlots = assignments.map(a => a.slotId + a.durationSlots);
    return {
      minSlot: Math.max(0, Math.min(...slots) - 1),
      maxSlot: Math.min(totalSlots, Math.max(...endSlots) + 1),
    };
  }, [assignments, totalSlots]);

  const visibleSlots = maxSlot - minSlot;
  const courts = Array.from({ length: config.courtCount }, (_, i) => i + 1);

  // Build grid data: assignments indexed by court and slot
  const gridData = useMemo(() => {
    const grid = new Map<string, ScheduleAssignment>();
    for (const a of assignments) {
      const key = `${a.courtId}-${a.slotId}`;
      grid.set(key, a);
    }
    return grid;
  }, [assignments]);

  // Track new assignments for staggered animation
  useEffect(() => {
    const currentIds = assignments.map(a => a.matchId);
    const prevIds = prevAssignmentsRef.current;
    const newIds = currentIds.filter(id => !prevIds.includes(id));

    if (newIds.length > 0) {
      // Add new IDs to animated set with staggered timing
      newIds.forEach((id, index) => {
        setTimeout(() => {
          setAnimatedIds(prev => new Set([...prev, id]));
        }, index * 50); // 50ms stagger between each dot
      });
    }

    prevAssignmentsRef.current = currentIds;
  }, [assignments]);

  // Pulse wave animation during solving
  useEffect(() => {
    if (status !== 'solving') return;

    const interval = setInterval(() => {
      setPulseWave(prev => (prev + 1) % 100);
    }, 100);

    return () => clearInterval(interval);
  }, [status]);

  // Format slot to time (handles overnight schedules)
  const slotToTime = (slot: number) => formatSlotTime(slot, config);

  // Get event type from eventRank (e.g., "MS1" -> "MS")
  const getEventType = (eventRank: string | null | undefined): string => {
    if (!eventRank) return '';
    return eventRank.replace(/[0-9]/g, '');
  };

  // Get colors for a match based on event type
  const getMatchColors = (matchId: string) => {
    const match = matchMap.get(matchId);
    if (!match?.eventRank) return DEFAULT_COLOR;

    const eventType = getEventType(match.eventRank);
    return EVENT_COLORS[eventType] || DEFAULT_COLOR;
  };

  // Get detailed tooltip for a match
  const getMatchTooltip = (matchId: string, assignment: ScheduleAssignment) => {
    const match = matchMap.get(matchId);
    if (!match) return matchId;

    const lines: string[] = [];

    // Event info
    if (match.eventRank) {
      const eventType = getEventType(match.eventRank);
      const eventNum = match.eventRank.replace(/[^0-9]/g, '');
      const eventConfig = EVENT_COLORS[eventType];
      const eventLabel = eventConfig?.label || eventType;
      lines.push(`${eventLabel} #${eventNum}`);
    }

    // Player names
    const sideANames = match.sideA?.map(id => playerMap.get(id)?.name || 'Unknown').join(', ');
    const sideBNames = match.sideB?.map(id => playerMap.get(id)?.name || 'Unknown').join(', ');
    if (sideANames) lines.push(`A: ${sideANames}`);
    if (sideBNames) lines.push(`B: ${sideBNames}`);

    // Time and court
    const time = slotToTime(assignment.slotId);
    const duration = assignment.durationSlots * config.intervalMinutes;
    lines.push(`Court ${assignment.courtId} @ ${time} (${duration} min)`);

    return lines.join('\n');
  };

  // Calculate animation delay based on position in grid
  const getAnimationDelay = (court: number, slot: number) => {
    const position = (court - 1) * visibleSlots + (slot - minSlot);
    return `${position * 30}ms`;
  };

  // Check if a dot should pulse (wave effect during solving)
  const shouldPulse = (court: number, slot: number) => {
    if (status !== 'solving') return false;
    const position = (court - 1) + (slot - minSlot);
    const wavePosition = Math.floor(pulseWave / 10);
    return Math.abs(position - wavePosition) <= 1;
  };

  if (assignments.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <div className="text-sm">Waiting for first solution...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header row with time slots */}
      <div
        className="grid bg-gray-50 border-b border-gray-200"
        style={{ gridTemplateColumns: `60px repeat(${visibleSlots}, minmax(40px, 1fr))` }}
      >
        <div className="p-2 font-medium text-gray-600 text-xs border-r border-gray-200">
          Court
        </div>
        {Array.from({ length: visibleSlots }, (_, i) => minSlot + i).map(slot => (
          <div
            key={slot}
            className="p-1 text-center text-xs text-gray-500 border-r border-gray-100"
          >
            {slotToTime(slot)}
          </div>
        ))}
      </div>

      {/* Court rows */}
      {courts.map(court => (
        <div
          key={court}
          className="grid border-b border-gray-100 last:border-b-0"
          style={{ gridTemplateColumns: `60px repeat(${visibleSlots}, minmax(40px, 1fr))` }}
        >
          {/* Court label */}
          <div className="p-2 font-medium text-gray-700 text-sm bg-gray-50 border-r border-gray-200 flex items-center justify-center">
            C{court}
          </div>

          {/* Time slot cells */}
          {Array.from({ length: visibleSlots }, (_, i) => minSlot + i).map(slot => {
            const assignment = gridData.get(`${court}-${slot}`);

            // Check if this cell is part of a multi-slot match (continuation)
            const continuationOf = assignments.find(
              a => a.courtId === court && slot > a.slotId && slot < a.slotId + a.durationSlots
            );

            // Check if this is the last slot of a multi-slot match
            const isEndSlot = assignments.find(
              a => a.courtId === court && slot === a.slotId + a.durationSlots - 1 && a.durationSlots > 1
            );

            const isPulsing = shouldPulse(court, slot);

            return (
              <div
                key={slot}
                className="h-10 border-r border-gray-100 flex items-center justify-center relative"
              >
                {/* Duration line (for continuation slots) */}
                {continuationOf && (
                  <div
                    className={`absolute inset-y-4 left-0 right-0 ${getMatchColors(continuationOf.matchId).line} transition-all duration-500`}
                    style={{ height: '4px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                )}

                {/* End dot for multi-slot matches */}
                {isEndSlot && (
                  <div
                    className={`w-2 h-2 rounded-full ${getMatchColors(isEndSlot.matchId).dot}
                      transition-all duration-300
                      ${isPulsing ? 'scale-150 opacity-70' : ''}
                      ${animatedIds.has(isEndSlot.matchId) ? 'animate-dot-appear' : 'opacity-0 scale-0'}`}
                    style={{ animationDelay: getAnimationDelay(court, slot) }}
                    title={getMatchTooltip(isEndSlot.matchId, isEndSlot)}
                  />
                )}

                {/* Start dot */}
                {assignment && (
                  <>
                    {/* Line extending to the right for multi-slot matches */}
                    {assignment.durationSlots > 1 && (
                      <div
                        className={`absolute top-1/2 left-1/2 ${getMatchColors(assignment.matchId).line} transition-all duration-500`}
                        style={{
                          height: '4px',
                          width: animatedIds.has(assignment.matchId)
                            ? `calc(${(assignment.durationSlots - 1) * 100}% + ${(assignment.durationSlots - 1) * 1}px)`
                            : '0%',
                          transform: 'translateY(-50%)',
                          transition: 'width 0.5s ease-out',
                        }}
                      />
                    )}
                    {/* Dot node with enhanced animation */}
                    <div
                      className={`w-3 h-3 rounded-full ${getMatchColors(assignment.matchId).dot}
                        shadow-sm cursor-default z-10
                        transition-all duration-300 ease-out
                        hover:scale-150 hover:shadow-lg
                        ${isPulsing ? 'scale-125 shadow-md' : ''}
                        ${animatedIds.has(assignment.matchId) ? 'animate-dot-appear' : 'opacity-0 scale-0'}`}
                      style={{
                        animationDelay: getAnimationDelay(court, slot),
                      }}
                      title={getMatchTooltip(assignment.matchId, assignment)}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend with event type colors */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        {Object.entries(EVENT_COLORS).map(([key, { dot, label }]) => (
          <span key={key} className="flex items-center gap-1" title={label}>
            <span className={`w-2 h-2 rounded-full ${dot} ${status === 'solving' ? 'animate-pulse' : ''}`}></span>
            {key}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="w-4 h-1 bg-gray-300 rounded"></span>
          Duration
        </span>
        {status === 'solving' && (
          <span className="ml-auto flex items-center gap-1 text-blue-600">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
            Optimizing
          </span>
        )}
        {status === 'complete' && (
          <span className="ml-auto flex items-center gap-1 text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Complete
          </span>
        )}
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes dot-appear {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-dot-appear {
          animation: dot-appear 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
