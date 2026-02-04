/**
 * Match Status Card Component
 * Displays individual match details with status and action buttons
 */
import { useState } from 'react';
import type { ScheduleAssignment, MatchDTO, MatchStateDTO, PlayerDTO } from '../../api/dto';
import { formatSlotRange, getStatusColor } from '../../utils/timeUtils';
import { MatchScoreDialog } from './MatchScoreDialog';
import { usePlayerNames } from '../../hooks/usePlayerNames';

interface MatchStatusCardProps {
  assignment: ScheduleAssignment;
  match: MatchDTO | undefined;
  matchState: MatchStateDTO | undefined;
  config: any;
  onUpdateStatus: (matchId: string, status: MatchStateDTO['status'], additionalData?: Partial<MatchStateDTO>) => Promise<void>;
}

export function MatchStatusCard({
  assignment,
  match,
  matchState,
  config,
  onUpdateStatus
}: MatchStatusCardProps) {
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { getPlayerNames } = usePlayerNames();

  if (!match) return null;

  const status = matchState?.status || 'scheduled';

  // Get player names using the hook
  const sideANames = getPlayerNames(match.sideA || []).join(' & ');
  const sideBNames = getPlayerNames(match.sideB || []).join(' & ');

  const handleStatusChange = async (newStatus: MatchStateDTO['status']) => {
    if (updating) return;

    setUpdating(true);
    try {
      await onUpdateStatus(assignment.matchId, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update match status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleFinishClick = () => {
    setShowScoreDialog(true);
  };

  const handleScoreSubmit = async (score: { sideA: number; sideB: number }, notes: string) => {
    setUpdating(true);
    try {
      await onUpdateStatus(assignment.matchId, 'finished', { score, notes });
      setShowScoreDialog(false);
    } catch (error) {
      console.error('Failed to submit score:', error);
      alert('Failed to submit score. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded shadow-sm p-2 hover:shadow transition-shadow">
        {/* Header with Event Rank and Status */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-base font-bold text-gray-900">
              {match.eventRank || 'Match'}
            </div>
            <div className="text-xs text-gray-500">
              Court {assignment.courtId} • {config && formatSlotRange(assignment.slotId, assignment.durationSlots, config)}
            </div>
          </div>

          <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold ${getStatusColor(status)}`}>
            {status.toUpperCase()}
          </span>
        </div>

        {/* Match Details */}
        <div className="space-y-1 mb-2 text-sm">
          <div className="flex items-center">
            <span className="font-medium text-gray-700 w-14">Side A:</span>
            <span className="text-gray-900">{sideANames || 'TBD'}</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium text-gray-700 w-14">Side B:</span>
            <span className="text-gray-900">{sideBNames || 'TBD'}</span>
          </div>
        </div>

        {/* Times and Score (if available) */}
        {(matchState?.actualStartTime || matchState?.actualEndTime || matchState?.score) && (
          <div className="border-t border-gray-200 pt-2 mb-2 space-y-0.5 text-xs">
            {matchState.actualStartTime && (
              <div className="text-xs text-gray-600">
                Started: {matchState.actualStartTime}
              </div>
            )}
            {matchState.actualEndTime && (
              <div className="text-xs text-gray-600">
                Finished: {matchState.actualEndTime}
              </div>
            )}
            {matchState.score && (
              <div className="text-sm font-semibold text-gray-900 mt-2">
                Score: {matchState.score.sideA} - {matchState.score.sideB}
              </div>
            )}
            {matchState.notes && (
              <div className="text-xs text-gray-600 italic mt-1">
                Notes: {matchState.notes}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-1">
          {status === 'scheduled' && (
            <button
              onClick={() => handleStatusChange('called')}
              disabled={updating}
              className="flex-1 px-2 py-1 bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:bg-gray-400 text-xs font-medium"
            >
              {updating ? 'Updating...' : 'Call Match'}
            </button>
          )}

          {status === 'called' && (
            <button
              onClick={() => handleStatusChange('started')}
              disabled={updating}
              className="flex-1 px-2 py-1 bg-green-600 text-white rounded-sm hover:bg-green-700 disabled:bg-gray-400 text-xs font-medium"
            >
              {updating ? 'Updating...' : 'Start Match'}
            </button>
          )}

          {status === 'started' && (
            <button
              onClick={handleFinishClick}
              disabled={updating}
              className="flex-1 px-2 py-1 bg-purple-600 text-white rounded-sm hover:bg-purple-700 disabled:bg-gray-400 text-xs font-medium"
            >
              Finish Match
            </button>
          )}

          {status === 'finished' && (
            <div className="flex-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-sm text-center text-xs font-medium flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Complete
            </div>
          )}
        </div>
      </div>

      {/* Score Dialog */}
      {showScoreDialog && (
        <MatchScoreDialog
          matchName={match.eventRank || 'Match'}
          sideAName={sideANames}
          sideBName={sideBNames}
          onSubmit={handleScoreSubmit}
          onCancel={() => setShowScoreDialog(false)}
          isSubmitting={updating}
        />
      )}
    </>
  );
}
