/**
 * Main container for live schedule visualization during optimization
 * Combines metrics bar, timeline grid, and conflicts panel
 */
import { useMemo } from 'react';
import { LiveMetricsBar } from './LiveMetricsBar';
import { LiveTimelineGrid } from './LiveTimelineGrid';
import { LiveConflictsPanel } from './LiveConflictsPanel';
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
}: LiveScheduleGridProps) {
  // Compute violations client-side
  const violations = useMemo(
    () => computeConstraintViolations(assignments, matches, players, config),
    [assignments, matches, players, config]
  );

  return (
    <div className="space-y-4">
      {/* Metrics Bar */}
      <LiveMetricsBar
        elapsed={elapsed}
        solutionCount={solutionCount}
        objectiveScore={objectiveScore}
        bestBound={bestBound}
        status={status}
      />

      {/* Main content: Grid + Conflicts Panel */}
      <div className="flex gap-4">
        {/* Timeline Grid (main area) */}
        <div className="flex-1 min-w-0">
          <LiveTimelineGrid
            assignments={assignments}
            matches={matches}
            players={players}
            config={config}
            status={status}
          />
        </div>

        {/* Conflicts Panel (sidebar) */}
        <div className="w-56 flex-shrink-0">
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
