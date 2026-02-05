/**
 * Live Operations Grid - Compact version
 * Displays schedule with actual vs planned times, progress, and re-optimize controls
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

interface LiveOperationsGridProps {
  schedule: ScheduleDTO;
  matches: MatchDTO[];
  matchStates: Record<string, MatchStateDTO>;
  config: TournamentConfig;
  overrunMatches: ScheduleAssignment[];
  impactedMatches: ScheduleAssignment[];
  onMatchSelect: (matchId: string) => void;
  onActualTimeUpdate: (matchId: string, field: 'actualStartTime' | 'actualEndTime', time: string) => void;
  currentSlot: number;
  // Stats and reoptimize
  stats?: {
    total: number;
    finished: number;
    inProgress: number;
    percentage: number;
  };
  onReoptimize?: () => void;
  isReoptimizing?: boolean;
}

const SLOT_WIDTH = 48;
const ROW_HEIGHT = 32;

function getEventColor(eventRank?: string | null): string {
  if (!eventRank) return 'bg-gray-100 border-gray-300';
  const type = eventRank.replace(/[0-9]/g, '');
  switch (type) {
    case 'MS': return 'bg-blue-100 border-blue-300';
    case 'WS': return 'bg-pink-100 border-pink-300';
    case 'MD': return 'bg-green-100 border-green-300';
    case 'WD': return 'bg-purple-100 border-purple-300';
    case 'XD': return 'bg-orange-100 border-orange-300';
    default: return 'bg-gray-100 border-gray-300';
  }
}

function getMatchLabel(match: MatchDTO): string {
  if (match.matchNumber) return `M${match.matchNumber}`;
  if (match.eventRank) return match.eventRank;
  return match.id.slice(0, 4);
}

export function LiveOperationsGrid({
  schedule,
  matches,
  matchStates,
  config,
  overrunMatches,
  impactedMatches,
  onMatchSelect,
  currentSlot,
  stats,
  onReoptimize,
  isReoptimizing,
}: LiveOperationsGridProps) {
  const matchMap = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  // Calculate total slots (handles overnight schedules)
  const totalSlots = calculateTotalSlots(config);

  const slotLabels = useMemo(() => {
    return Array.from({ length: totalSlots }, (_, i) => formatSlotTime(i, config));
  }, [totalSlots, config]);

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
    return byCourtMap;
  }, [schedule.assignments, config.courtCount]);

  const overrunMatchIds = useMemo(() => new Set(overrunMatches.map((a) => a.matchId)), [overrunMatches]);
  const impactedMatchIds = useMemo(() => new Set(impactedMatches.map((a) => a.matchId)), [impactedMatches]);

  const hasImpacts = overrunMatches.length > 0 || impactedMatches.length > 0;

  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      {/* Header with progress, stats, legend, and reoptimize */}
      <div className="px-2 py-1 border-b border-gray-200 bg-gray-50 flex items-center gap-3 text-xs">
        {/* Progress bar */}
        {stats && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              <span className="text-gray-600 font-medium">{stats.percentage}%</span>
            </div>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">
              <span className="text-green-600 font-medium">{stats.finished}</span>
              <span className="text-gray-400">/</span>
              {stats.total}
            </span>
            {stats.inProgress > 0 && (
              <span className="text-blue-600">{stats.inProgress} active</span>
            )}
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Legend */}
        <span className="flex items-center gap-1 text-gray-500">
          <span className="w-2 h-2 rounded ring-1 ring-red-500 bg-gray-100" />Overrun
        </span>
        <span className="flex items-center gap-1 text-gray-500">
          <span className="w-2 h-2 rounded ring-1 ring-orange-400 bg-gray-100" />Impact
        </span>

        {/* Re-optimize button */}
        {onReoptimize && (
          <button
            onClick={onReoptimize}
            disabled={isReoptimizing || !hasImpacts}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              isReoptimizing || !hasImpacts
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isReoptimizing ? 'Optimizing...' : 'Re-optimize'}
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Time header */}
          <div className="flex border-b border-gray-200">
            <div className="w-12 flex-shrink-0 px-1 py-0.5 bg-gray-50 text-xs text-gray-500" />
            {slotLabels.map((label, i) => (
              <div
                key={i}
                style={{ width: SLOT_WIDTH }}
                className={`flex-shrink-0 px-0.5 py-0.5 text-center text-xs border-l border-gray-100 ${
                  i === currentSlot ? 'bg-blue-100 font-medium text-blue-700' : 'bg-gray-50 text-gray-400'
                }`}
              >
                {i % 2 === 0 ? label : ''}
              </div>
            ))}
          </div>

          {/* Court rows */}
          {Array.from({ length: config.courtCount }, (_, i) => i + 1).map((courtId) => (
            <div key={courtId} className="flex border-b border-gray-100">
              <div className="w-12 flex-shrink-0 px-1 bg-gray-50 text-xs font-medium text-gray-600 flex items-center">
                C{courtId}
              </div>
              <div className="flex-1 relative" style={{ height: ROW_HEIGHT }}>
                <div className="absolute inset-0 flex">
                  {slotLabels.map((_, i) => (
                    <div
                      key={i}
                      style={{ width: SLOT_WIDTH }}
                      className={`flex-shrink-0 border-l border-gray-100 ${
                        i === currentSlot ? 'bg-blue-50' : ''
                      }`}
                    />
                  ))}
                </div>

                {(courtAssignments.get(courtId) || []).map((assignment) => {
                  const match = matchMap.get(assignment.matchId);
                  const state = matchStates[assignment.matchId];
                  const isOverrun = overrunMatchIds.has(assignment.matchId);
                  const isImpacted = impactedMatchIds.has(assignment.matchId);

                  const left = assignment.slotId * SLOT_WIDTH;
                  const width = assignment.durationSlots * SLOT_WIDTH - 2;

                  let borderClass = '';
                  if (isOverrun) borderClass = 'ring-2 ring-red-500';
                  else if (isImpacted) borderClass = 'ring-2 ring-orange-400';

                  let statusIcon = null;
                  if (state?.status === 'finished') statusIcon = <span className="text-green-600">✓</span>;
                  else if (state?.status === 'started') statusIcon = <span className="text-blue-600 animate-pulse">●</span>;

                  return (
                    <div
                      key={assignment.matchId}
                      className={`absolute top-0.5 rounded border cursor-pointer hover:brightness-95 ${getEventColor(match?.eventRank)} ${borderClass}`}
                      style={{ left, width, height: ROW_HEIGHT - 4 }}
                      onClick={() => onMatchSelect(assignment.matchId)}
                      title={match ? getMatchLabel(match) : assignment.matchId}
                    >
                      <div className="px-1 h-full flex items-center gap-0.5 overflow-hidden">
                        {statusIcon}
                        <span className="text-xs font-medium truncate">
                          {match ? getMatchLabel(match) : '?'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
