/**
 * Container component for constraint graph visualization
 * Combines the graph and violation summary panel
 */
import { useMemo } from 'react';
import { ConstraintGraph } from './ConstraintGraph';
import { ViolationSummaryPanel } from './ViolationSummaryPanel';
import { buildGraphData } from './buildGraphData';
import { computeConstraintViolations } from '../../../utils/constraintChecker';
import type {
  ScheduleAssignment,
  MatchDTO,
  PlayerDTO,
  TournamentConfig,
} from '../../../api/dto';

interface ConstraintGraphPanelProps {
  assignments: ScheduleAssignment[];
  matches: MatchDTO[];
  players: PlayerDTO[];
  config: TournamentConfig;
  isRealtime?: boolean;
  elapsed?: number;
  solutionCount?: number;
  objectiveScore?: number;
}

export function ConstraintGraphPanel({
  assignments,
  matches,
  players,
  config,
  isRealtime = false,
  elapsed,
  solutionCount,
  objectiveScore,
}: ConstraintGraphPanelProps) {
  // Compute violations client-side
  const violations = useMemo(
    () => computeConstraintViolations(assignments, matches, players, config),
    [assignments, matches, players, config]
  );

  // Build graph data
  const graphData = useMemo(
    () => buildGraphData(assignments, matches, players, violations),
    [assignments, matches, players, violations]
  );

  if (assignments.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-8">
        <div className="text-center">
          <div className="text-4xl mb-2">🔄</div>
          <div className="text-gray-500 text-sm">
            {isRealtime ? 'Waiting for first solution...' : 'No assignments to visualize'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Constraint Graph</h3>
          {isRealtime && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              Live
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {graphData.nodes.length} players · {graphData.links.length} edges
        </div>
      </div>

      {/* Content */}
      <div className="flex">
        {/* Graph area */}
        <div className="flex-1 p-4">
          <ConstraintGraph
            data={graphData}
            width={480}
            height={320}
          />
        </div>

        {/* Side panel */}
        <div className="border-l border-gray-200 p-4 bg-gray-50">
          <ViolationSummaryPanel
            violations={violations}
            elapsed={elapsed}
            solutionCount={solutionCount}
            objectiveScore={objectiveScore}
          />
        </div>
      </div>
    </div>
  );
}
