/**
 * Main container for live schedule visualization during optimization
 * Combines metrics bar, timeline grid, and conflicts panel
 */
import { useMemo } from 'react';
import { LiveMetricsBar } from './LiveMetricsBar';
import { LiveTimelineGrid } from './LiveTimelineGrid';
import { LiveConflictsPanel } from './LiveConflictsPanel';
import { ScheduleActions } from '../ScheduleActions';
import { computeConstraintViolations } from '../../../utils/constraintChecker';
import type {
  ScheduleAssignment,
  MatchDTO,
  PlayerDTO,
  TournamentConfig,
} from '../../../api/dto';

interface LiveScheduleGridProps {
  assignments: ScheduleAssignment[];
  matches: MatchDTO[];
  players: PlayerDTO[];
  config: TournamentConfig;
  elapsed: number;
  solutionCount?: number;
  objectiveScore?: number;
  bestBound?: number;
  status: 'solving' | 'complete' | 'error';
  totalMatches?: number;
  onGenerate?: () => void;
  onReoptimize?: () => void;
  generating?: boolean;
  reoptimizing?: boolean;
  hasSchedule?: boolean;
}

export function LiveScheduleGrid({
  assignments,
  matches,
  players,
  config,
  elapsed,
  solutionCount,
  objectiveScore,
  bestBound,
  status,
  totalMatches,
  onGenerate,
  onReoptimize,
  generating,
  reoptimizing,
  hasSchedule,
}: LiveScheduleGridProps) {
  // Compute violations client-side
  const violations = useMemo(
    () => computeConstraintViolations(assignments, matches, players, config),
    [assignments, matches, players, config]
  );

  return (
    <div className="bg-white rounded border border-gray-200">
      {/* Header with metrics and actions */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <LiveMetricsBar
          elapsed={elapsed}
          solutionCount={solutionCount}
          objectiveScore={objectiveScore}
          bestBound={bestBound}
          status={status}
        />
        {onGenerate && (
          <ScheduleActions
            onGenerate={onGenerate}
            onReoptimize={onReoptimize!}
            generating={generating || false}
            reoptimizing={reoptimizing || false}
            hasSchedule={hasSchedule || false}
          />
        )}
      </div>

      {/* Main content: Grid + Conflicts Panel */}
      <div className="flex">
        {/* Timeline Grid (main area) */}
        <div className="flex-1 min-w-0 p-3">
          <LiveTimelineGrid
            assignments={assignments}
            matches={matches}
            players={players}
            config={config}
            status={status}
          />
        </div>

        {/* Conflicts Panel (sidebar) */}
        <div className="w-48 flex-shrink-0 border-l border-gray-200 p-2">
          <LiveConflictsPanel
            violations={violations}
            matchCount={assignments.length}
            totalMatches={totalMatches ?? matches.length}
            status={status}
          />
        </div>
      </div>
    </div>
  );
}
