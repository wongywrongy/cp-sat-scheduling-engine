/**
 * Workflow View
 * Horizontal three-column layout for managing match status transitions
 * Shows all matches, grays out those not in current slot
 */
import { MatchStatusCard } from '../tracking/MatchStatusCard';
import type { ScheduleAssignment, MatchDTO, MatchStateDTO, TournamentConfig } from '../../api/dto';

interface WorkflowViewProps {
  matchesByStatus: {
    scheduled: ScheduleAssignment[];
    called: ScheduleAssignment[];
    started: ScheduleAssignment[];
    finished: ScheduleAssignment[];
  };
  matches: MatchDTO[];
  matchStates: Record<string, MatchStateDTO>;
  config: TournamentConfig | null;
  currentSlot: number;
  onUpdateStatus: (matchId: string, status: MatchStateDTO['status'], additionalData?: Partial<MatchStateDTO>) => Promise<void>;
}

export function WorkflowView({
  matchesByStatus,
  matches,
  matchStates,
  config,
  currentSlot,
  onUpdateStatus,
}: WorkflowViewProps) {
  const upNextCount = matchesByStatus.called.length + matchesByStatus.scheduled.length;

  // Check if assignment is in current slot (or within 1 slot)
  const isCurrentSlot = (assignment: ScheduleAssignment) => {
    const matchEnd = assignment.slotId + assignment.durationSlots;
    return assignment.slotId <= currentSlot + 1 && matchEnd > currentSlot;
  };

  return (
    <div className="h-full grid grid-cols-3 gap-2 overflow-hidden">
      {/* In Progress */}
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-1 mb-1 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-gray-700">In Progress</span>
          <span className="text-xs text-gray-400">({matchesByStatus.started.length})</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {matchesByStatus.started.length === 0 ? (
            <div className="bg-gray-50 rounded p-2 text-center text-gray-400 text-xs">
              None
            </div>
          ) : (
            matchesByStatus.started.map((assignment) => (
              <MatchStatusCard
                key={assignment.matchId}
                assignment={assignment}
                match={matches.find((m) => m.id === assignment.matchId)}
                matchState={matchStates[assignment.matchId]}
                config={config}
                onUpdateStatus={onUpdateStatus}
                dimmed={false}
              />
            ))
          )}
        </div>
      </div>

      {/* Up Next - show all, gray out future */}
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-1 mb-1 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs font-semibold text-gray-700">Up Next</span>
          <span className="text-xs text-gray-400">({upNextCount})</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {/* Called matches first - never dimmed */}
          {matchesByStatus.called.map((assignment) => (
            <MatchStatusCard
              key={assignment.matchId}
              assignment={assignment}
              match={matches.find((m) => m.id === assignment.matchId)}
              matchState={matchStates[assignment.matchId]}
              config={config}
              onUpdateStatus={onUpdateStatus}
              dimmed={false}
            />
          ))}

          {/* All scheduled matches - dim if not current slot */}
          {matchesByStatus.scheduled.map((assignment) => (
            <MatchStatusCard
              key={assignment.matchId}
              assignment={assignment}
              match={matches.find((m) => m.id === assignment.matchId)}
              matchState={matchStates[assignment.matchId]}
              config={config}
              onUpdateStatus={onUpdateStatus}
              dimmed={!isCurrentSlot(assignment)}
            />
          ))}

          {matchesByStatus.called.length === 0 && matchesByStatus.scheduled.length === 0 && (
            <div className="bg-gray-50 rounded p-2 text-center text-gray-400 text-xs">
              None
            </div>
          )}
        </div>
      </div>

      {/* Finished - show all */}
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-1 mb-1 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-xs font-semibold text-gray-700">Finished</span>
          <span className="text-xs text-gray-400">({matchesByStatus.finished.length})</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {matchesByStatus.finished.length === 0 ? (
            <div className="bg-gray-50 rounded p-2 text-center text-gray-400 text-xs">
              None
            </div>
          ) : (
            matchesByStatus.finished
              .slice()
              .reverse()
              .map((assignment) => (
                <MatchStatusCard
                  key={assignment.matchId}
                  assignment={assignment}
                  match={matches.find((m) => m.id === assignment.matchId)}
                  matchState={matchStates[assignment.matchId]}
                  config={config}
                  onUpdateStatus={onUpdateStatus}
                  dimmed={false}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
}
