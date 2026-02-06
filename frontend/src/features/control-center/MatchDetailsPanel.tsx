/**
 * Match Details Panel - Shows selected match details
 */
import { useMemo } from 'react';
import type { ImpactAnalysis } from '../../hooks/useLiveOperations';
import type { MatchDTO, MatchStateDTO, ScheduleAssignment } from '../../api/dto';
import type { TrafficLightResult } from '../../utils/trafficLight';
import { getMatchLabel } from '../../utils/matchUtils';
import { ElapsedTimer } from '../../components/common/ElapsedTimer';

interface MatchDetailsPanelProps {
  assignment?: ScheduleAssignment;
  match: MatchDTO | undefined;
  matchState: MatchStateDTO | undefined;
  matches: MatchDTO[];
  trafficLight?: TrafficLightResult;
  analysis?: ImpactAnalysis | null;
  playerNames: Map<string, string>;
  slotToTime: (slot: number) => string;
  onSelectMatch?: (matchId: string) => void;
}

export function MatchDetailsPanel({
  assignment,
  match,
  matchState,
  matches,
  trafficLight,
  analysis,
  playerNames,
  slotToTime,
  onSelectMatch,
}: MatchDetailsPanelProps) {
  const matchMap = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  // Empty state
  if (!match || !assignment) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Click a match to see details
      </div>
    );
  }

  const status = matchState?.status || 'scheduled';
  const scheduledTime = slotToTime(assignment.slotId);
  const light = trafficLight?.status || 'green';

  // Get player names
  const sideANames = (match.sideA || []).map((id) => playerNames.get(id) || id);
  const sideBNames = (match.sideB || []).map((id) => playerNames.get(id) || id);
  const allPlayerIds = [...(match.sideA || []), ...(match.sideB || [])];

  // Display court (use actual if set)
  const actualCourtId = matchState?.actualCourtId;
  const displayCourtId = actualCourtId ?? assignment.courtId;
  const courtChanged = actualCourtId !== undefined && actualCourtId !== assignment.courtId;

  return (
    <div className="h-full overflow-auto p-2">
      {/* Header */}
      <div className="mb-3">
        <div className="text-sm font-bold text-gray-700 mb-0.5">
          {getMatchLabel(match)}
        </div>
        <div className="text-[10px] text-gray-500">
          C{displayCourtId}{courtChanged && ` (sched: C${assignment.courtId})`} · {scheduledTime}
        </div>
      </div>

      {/* Status badge */}
      {status === 'scheduled' && (
        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded mb-3 text-[10px] font-medium ${
          light === 'green'
            ? 'bg-green-50 text-green-700'
            : light === 'yellow'
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-red-50 text-red-700'
        }`}>
          <span className={`w-1 h-1 rounded-full ${
            light === 'green' ? 'bg-green-500' : light === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          {light === 'green' ? 'Ready' : light === 'yellow' ? 'Resting' : 'Blocked'}
        </div>
      )}
      {status === 'called' && (
        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded mb-3 text-[10px] font-medium bg-blue-50 text-blue-700">
          Called
        </div>
      )}
      {status === 'started' && (
        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded mb-3 text-[10px] font-medium bg-green-50 text-green-700">
          In Progress
        </div>
      )}
      {status === 'finished' && (
        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded mb-3 text-[10px] font-medium bg-purple-50 text-purple-700">
          Done {matchState?.score ? `${matchState.score.sideA}-${matchState.score.sideB}` : ''}
        </div>
      )}

      {/* Reason for yellow/red */}
      {status === 'scheduled' && trafficLight?.reason && light !== 'green' && (
        <div className={`px-2 py-1.5 rounded text-[10px] mb-3 ${
          light === 'yellow'
            ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {trafficLight.reason}
        </div>
      )}

      {/* Players */}
      <div className="mb-3">
        <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wide mb-1">
          Players
        </div>
        <div className="text-xs text-gray-700 space-y-0.5">
          {sideANames.map((name, i) => (
            <div key={i}>{name}</div>
          ))}
          <div className="text-[10px] text-gray-400">vs</div>
          {sideBNames.map((name, i) => (
            <div key={i}>{name}</div>
          ))}
        </div>
      </div>

      {/* Timing (only for in_progress) */}
      {status === 'started' && (
        <div className="mb-3">
          <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wide mb-1">
            Timing
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Elapsed</span>
            <ElapsedTimer startTime={matchState?.actualStartTime} className="font-semibold tabular-nums" />
          </div>
        </div>
      )}

      {/* Impacted Matches */}
      {analysis && analysis.directlyImpacted.length > 0 && (
        <div>
          <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Impacted ({analysis.directlyImpacted.length})
          </div>
          {analysis.directlyImpacted.map((matchId) => {
            const impactedMatch = matchMap.get(matchId);
            const currentPlayerIds = new Set(allPlayerIds);
            const impactedPlayerIds = [
              ...(impactedMatch?.sideA || []),
              ...(impactedMatch?.sideB || []),
            ];
            const sharedPlayerIds = impactedPlayerIds.filter(id => currentPlayerIds.has(id));
            const sharedPlayerNames = sharedPlayerIds.map(id => playerNames.get(id) || id);
            const eventLabel = impactedMatch?.eventRank || getMatchLabel(impactedMatch, matchId);

            return (
              <div
                key={matchId}
                onClick={() => onSelectMatch?.(matchId)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded mb-1 cursor-pointer hover:border-gray-300"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">{eventLabel}</span>
                  <span className="text-gray-400 text-[10px]">→</span>
                </div>
                {sharedPlayerNames.length > 0 && (
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {sharedPlayerNames.map((name, i) => (
                      <span key={i}>
                        {name} plays{i < sharedPlayerNames.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
