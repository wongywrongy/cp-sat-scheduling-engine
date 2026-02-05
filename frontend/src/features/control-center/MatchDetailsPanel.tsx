/**
 * Match Details Panel - Per Wireframe Design (Tailwind CSS)
 * Shows selected match details with traffic light status, players, timing, and impacted matches
 */
import { useState, useEffect, useMemo } from 'react';
import type { ImpactAnalysis } from '../../hooks/useLiveOperations';
import type { MatchDTO, MatchStateDTO, ScheduleAssignment } from '../../api/dto';
import type { TrafficLightResult } from '../../utils/trafficLight';

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

function getMatchLabel(match: MatchDTO | undefined, fallbackId?: string): string {
  if (!match) return fallbackId?.slice(0, 6) || '?';
  if (match.eventRank) return match.eventRank;
  if (match.matchNumber) return `M${match.matchNumber}`;
  return match.id.slice(0, 6);
}

// Elapsed timer component
function ElapsedTimer({ startTime }: { startTime: string | undefined }) {
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    if (!startTime) {
      setElapsed('0:00');
      return;
    }

    const calculateElapsed = () => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const start = new Date();
      start.setHours(hours, minutes, 0, 0);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
    };

    setElapsed(calculateElapsed());
    const interval = setInterval(() => setElapsed(calculateElapsed()), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="font-semibold tabular-nums">{elapsed}</span>;
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

  return (
    <div className="h-full overflow-auto p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="text-xl font-extrabold text-gray-900 mb-0.5">
          {getMatchLabel(match)}
        </div>
        <div className="text-xs text-gray-500">
          C{assignment.courtId} · Scheduled {scheduledTime}
        </div>
      </div>

      {/* Status badge */}
      {status === 'scheduled' && (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4 text-xs font-semibold ${
          light === 'green'
            ? 'bg-green-50 text-green-700'
            : light === 'yellow'
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-red-50 text-red-700'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            light === 'green' ? 'bg-green-500' : light === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          {light === 'green' ? 'Ready to call' : light === 'yellow' ? 'Resting' : 'Blocked'}
        </div>
      )}
      {status === 'called' && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4 text-xs font-semibold bg-blue-50 text-blue-700">
          Called to court
        </div>
      )}
      {status === 'started' && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4 text-xs font-semibold bg-green-50 text-green-700">
          In Progress
        </div>
      )}
      {status === 'finished' && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4 text-xs font-semibold bg-purple-50 text-purple-700">
          Finished {matchState?.score ? `— ${matchState.score.sideA}-${matchState.score.sideB}` : ''}
        </div>
      )}

      {/* Reason for yellow/red */}
      {status === 'scheduled' && trafficLight?.reason && light !== 'green' && (
        <div className={`px-3 py-2 rounded-lg text-xs mb-4 leading-relaxed ${
          light === 'yellow'
            ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {trafficLight.reason}
        </div>
      )}

      {/* Players */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Players
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
            A
          </span>
          <div className="text-sm font-medium">{sideANames.join(' & ')}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center text-[10px] font-bold text-pink-600">
            B
          </span>
          <div className="text-sm font-medium">{sideBNames.join(' & ')}</div>
        </div>
      </div>

      {/* Timing (only for in_progress) */}
      {status === 'started' && (
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Timing
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Elapsed</span>
            <ElapsedTimer startTime={matchState?.actualStartTime} />
          </div>
        </div>
      )}

      {/* Impacted Matches */}
      {analysis && analysis.directlyImpacted.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Impacted Matches ({analysis.directlyImpacted.length})
          </div>
          {analysis.directlyImpacted.slice(0, 5).map((matchId) => {
            const impactedMatch = matchMap.get(matchId);
            return (
              <div
                key={matchId}
                onClick={() => onSelectMatch?.(matchId)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded mb-1 text-xs font-medium cursor-pointer hover:border-gray-300 flex justify-between items-center"
              >
                <span>{getMatchLabel(impactedMatch, matchId)}</span>
                <span className="text-gray-400">→</span>
              </div>
            );
          })}
          {analysis.directlyImpacted.length > 5 && (
            <div className="text-xs text-gray-400">
              +{analysis.directlyImpacted.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
