/**
 * Match Details Panel
 * Always-visible panel showing selected match details and impact analysis
 * Inline component (not a modal/overlay)
 */
import type { ImpactAnalysis } from '../../hooks/useLiveOperations';
import type { MatchDTO, MatchStateDTO } from '../../api/dto';

interface MatchDetailsPanelProps {
  analysis: ImpactAnalysis | null;
  match: MatchDTO | undefined;
  matchState: MatchStateDTO | undefined;
  matches: MatchDTO[];
  slotToTime: (slot: number) => string;
  onActualTimeUpdate: (matchId: string, field: 'actualStartTime' | 'actualEndTime', time: string) => void;
  onReoptimize: () => void;
}

function getMatchLabel(match: MatchDTO | undefined, fallbackId: string): string {
  if (!match) return fallbackId.slice(0, 6);
  if (match.matchNumber) return `M${match.matchNumber}`;
  if (match.eventRank) return match.eventRank;
  return match.id.slice(0, 6);
}

export function MatchDetailsPanel({
  analysis,
  match,
  matchState,
  matches,
  slotToTime,
  onActualTimeUpdate,
  onReoptimize,
}: MatchDetailsPanelProps) {
  const matchMap = new Map(matches.map((m) => [m.id, m]));

  // Empty state - no match selected
  if (!analysis) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <p>Click a match in the grid</p>
          <p className="text-xs mt-1">to see details and impact</p>
        </div>
      </div>
    );
  }

  const scheduledEndTime = slotToTime(analysis.scheduledEndSlot);
  const actualEndTime = slotToTime(analysis.actualEndSlot);

  return (
    <div className="h-full overflow-y-auto space-y-2">
      {/* Match header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">
          {getMatchLabel(match, analysis.matchId)}
        </h3>
        {match?.eventRank && (
          <span className="text-xs text-gray-500">{match.eventRank}</span>
        )}
      </div>

      {/* Time comparison - compact */}
      <div className="bg-gray-50 rounded p-2 text-xs">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <div className="text-gray-500">Scheduled:</div>
          <div className="font-mono">{scheduledEndTime}</div>
          <div className="text-gray-500">Actual:</div>
          <div className={`font-mono ${analysis.overrunSlots > 0 ? 'text-red-600 font-semibold' : ''}`}>
            {actualEndTime}
          </div>
        </div>
        {analysis.overrunSlots > 0 && (
          <div className="mt-1 pt-1 border-t border-gray-200 text-red-600 font-medium">
            +{analysis.overrunSlots * 15} min overrun
          </div>
        )}
      </div>

      {/* Time inputs - compact */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block">Start</label>
          <input
            type="time"
            value={matchState?.actualStartTime || ''}
            onChange={(e) => onActualTimeUpdate(analysis.matchId, 'actualStartTime', e.target.value)}
            className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block">End</label>
          <input
            type="time"
            value={matchState?.actualEndTime || ''}
            onChange={(e) => onActualTimeUpdate(analysis.matchId, 'actualEndTime', e.target.value)}
            className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs"
          />
        </div>
      </div>

      {/* Impacted matches */}
      {analysis.directlyImpacted.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-700 mb-1">
            Impacted ({analysis.directlyImpacted.length})
          </div>
          <div className="space-y-1">
            {analysis.directlyImpacted.slice(0, 5).map((matchId) => {
              const impactedMatch = matchMap.get(matchId);
              return (
                <div
                  key={matchId}
                  className="flex items-center gap-1 px-1.5 py-1 bg-orange-50 border border-orange-200 rounded text-xs"
                >
                  <span className="font-medium">{getMatchLabel(impactedMatch, matchId)}</span>
                </div>
              );
            })}
            {analysis.directlyImpacted.length > 5 && (
              <div className="text-xs text-gray-500">
                +{analysis.directlyImpacted.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggested action - compact */}
      <div className={`rounded p-2 text-xs ${
        analysis.suggestedAction === 'reoptimize' ? 'bg-orange-50 border border-orange-200' :
        analysis.suggestedAction === 'none' ? 'bg-green-50 border border-green-200' :
        'bg-blue-50 border border-blue-200'
      }`}>
        <div className="font-medium mb-0.5">
          {analysis.suggestedAction === 'none' && 'On time'}
          {analysis.suggestedAction === 'wait' && 'Wait'}
          {analysis.suggestedAction === 'manual_adjust' && 'Manual adjust'}
          {analysis.suggestedAction === 'reoptimize' && 'Re-optimize needed'}
        </div>
        <div className="text-gray-600">
          {analysis.suggestedAction === 'none' && 'No action needed'}
          {analysis.suggestedAction === 'wait' && 'No other matches affected'}
          {analysis.suggestedAction === 'manual_adjust' && 'Adjust impacted matches'}
          {analysis.suggestedAction === 'reoptimize' && (
            <button
              onClick={onReoptimize}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Click to re-optimize
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
