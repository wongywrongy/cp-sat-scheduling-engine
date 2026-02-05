/**
 * Gantt Chart with Traffic Light Colors (Tailwind CSS)
 * Displays matches across courts with traffic light colored blocks
 */
import { useMemo } from 'react';
import { calculateTotalSlots, formatSlotTime } from '../../utils/timeUtils';
import type {
  ScheduleDTO,
  MatchDTO,
  MatchStateDTO,
  TournamentConfig,
  ScheduleAssignment,
} from '../../api/dto';
import type { TrafficLightResult } from '../../utils/trafficLight';

interface GanttChartProps {
  schedule: ScheduleDTO;
  matches: MatchDTO[];
  matchStates: Record<string, MatchStateDTO>;
  config: TournamentConfig;
  currentSlot: number;
  selectedMatchId?: string | null;
  onMatchSelect: (matchId: string) => void;
  trafficLights?: Map<string, TrafficLightResult>;
}

function getMatchLabel(match: MatchDTO): string {
  if (match.eventRank) return match.eventRank;
  if (match.matchNumber) return `M${match.matchNumber}`;
  return match.id.slice(0, 6);
}

export function GanttChart({
  schedule,
  matches,
  matchStates,
  config,
  currentSlot,
  selectedMatchId,
  onMatchSelect,
  trafficLights,
}: GanttChartProps) {
  const matchMap = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const totalSlots = calculateTotalSlots(config);

  // Generate time slot labels (show every 2 slots)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let i = 0; i < totalSlots; i += 2) {
      slots.push(formatSlotTime(i, config));
    }
    return slots;
  }, [totalSlots, config]);

  // Group assignments by court
  const courtAssignments = useMemo(() => {
    const byCourtMap = new Map<number, ScheduleAssignment[]>();
    for (let c = 1; c <= config.courtCount; c++) {
      byCourtMap.set(c, []);
    }
    for (const assignment of schedule.assignments) {
      const courtList = byCourtMap.get(assignment.courtId) || [];
      courtList.push(assignment);
      byCourtMap.set(assignment.courtId, courtList);
    }
    // Sort each court's assignments by time
    byCourtMap.forEach((assignments) => {
      assignments.sort((a, b) => a.slotId - b.slotId);
    });
    return byCourtMap;
  }, [schedule.assignments, config.courtCount]);

  return (
    <div className="overflow-x-auto bg-white">
      {/* Time header */}
      <div className="flex items-center ml-8 mb-1.5">
        {timeSlots.map((t) => (
          <div key={t} className="w-[120px] flex-shrink-0 text-[11px] text-gray-400">
            {t}
          </div>
        ))}
      </div>

      {/* Court rows */}
      {Array.from({ length: config.courtCount }, (_, i) => i + 1).map((courtId) => (
        <div key={courtId} className="flex items-center mb-1">
          <div className="w-7 flex-shrink-0 text-xs font-semibold text-gray-500">
            C{courtId}
          </div>
          <div className="flex gap-0.5 flex-1">
            {(courtAssignments.get(courtId) || []).map((assignment) => {
              const match = matchMap.get(assignment.matchId);
              const state = matchStates[assignment.matchId];
              const trafficLight = trafficLights?.get(assignment.matchId);
              const isSelected = selectedMatchId === assignment.matchId;
              const matchLabel = match ? getMatchLabel(match) : '?';

              // Check if delayed (past scheduled time but not started)
              const isDelayed = currentSlot > assignment.slotId &&
                (!state || state.status === 'scheduled' || state.status === 'called');

              // Get styles based on status and traffic light
              let bgClass = 'bg-gray-100';
              let borderClass = 'border-gray-300';
              let textClass = 'text-gray-700';
              let dotClass = 'bg-gray-400';

              if (state?.status === 'started') {
                bgClass = 'bg-green-100';
                borderClass = 'border-green-500';
                textClass = 'text-green-800';
              } else if (state?.status === 'called') {
                bgClass = 'bg-blue-100';
                borderClass = 'border-blue-500';
                textClass = 'text-blue-800';
              } else if (state?.status === 'finished') {
                bgClass = 'bg-gray-100';
                borderClass = 'border-gray-400';
                textClass = 'text-gray-500';
              } else {
                // Scheduled - use traffic light color
                const light = trafficLight?.status || 'green';
                if (light === 'green') {
                  bgClass = 'bg-green-100';
                  borderClass = 'border-green-500';
                  textClass = 'text-green-800';
                  dotClass = 'bg-green-500';
                } else if (light === 'yellow') {
                  bgClass = 'bg-yellow-100';
                  borderClass = 'border-yellow-500';
                  textClass = 'text-yellow-800';
                  dotClass = 'bg-yellow-500';
                } else {
                  bgClass = 'bg-red-100';
                  borderClass = 'border-red-500';
                  textClass = 'text-red-800';
                  dotClass = 'bg-red-500';
                }
              }

              // Calculate min width based on duration (min 56px to show full ID)
              const minWidth = Math.max(56, assignment.durationSlots * 60);

              return (
                <div
                  key={assignment.matchId}
                  onClick={() => onMatchSelect(assignment.matchId)}
                  className={`cursor-pointer transition-all rounded border-[1.5px] px-2 py-0.5 flex items-center gap-1 whitespace-nowrap ${bgClass} ${borderClass} ${
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                  } ${isDelayed ? 'ring-2 ring-yellow-500' : ''}`}
                  style={{ minWidth }}
                  title={trafficLight?.reason || matchLabel}
                >
                  {/* Traffic light dot for scheduled matches */}
                  {(!state || state.status === 'scheduled') && (
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                  )}
                  {/* Status indicators for active/finished */}
                  {state?.status === 'started' && (
                    <span className="text-green-600 animate-pulse">●</span>
                  )}
                  {state?.status === 'finished' && (
                    <span className="text-gray-500">✓</span>
                  )}
                  <span className={`text-[11px] font-semibold ${textClass}`}>
                    {matchLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
