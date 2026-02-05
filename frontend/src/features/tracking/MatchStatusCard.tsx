/**
 * Match Status Card Component - Compact version
 * Displays match details with status and action buttons
 */
import { useState } from 'react';
import type { ScheduleAssignment, MatchDTO, MatchStateDTO } from '../../api/dto';
import { formatSlotRange, getStatusColor } from '../../utils/timeUtils';
import { MatchScoreDialog } from './MatchScoreDialog';
import { usePlayerNames } from '../../hooks/usePlayerNames';

interface MatchStatusCardProps {
  assignment: ScheduleAssignment;
  match: MatchDTO | undefined;
  matchState: MatchStateDTO | undefined;
  config: any;
  onUpdateStatus: (matchId: string, status: MatchStateDTO['status'], additionalData?: Partial<MatchStateDTO>) => Promise<void>;
  dimmed?: boolean;
}

export function MatchStatusCard({
  assignment,
  match,
  matchState,
  config,
  onUpdateStatus,
  dimmed = false,
}: MatchStatusCardProps) {
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { getPlayerNames } = usePlayerNames();

  if (!match) return null;

  const status = matchState?.status || 'scheduled';
  const sideANames = getPlayerNames(match.sideA || []).join(' & ');
  const sideBNames = getPlayerNames(match.sideB || []).join(' & ');

  const handleStatusChange = async (newStatus: MatchStateDTO['status']) => {
    if (updating) return;
    setUpdating(true);
    try {
      await onUpdateStatus(assignment.matchId, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleScoreSubmit = async (score: { sideA: number; sideB: number }, notes: string) => {
    setUpdating(true);
    try {
      await onUpdateStatus(assignment.matchId, 'finished', { score, notes });
      setShowScoreDialog(false);
    } catch (error) {
      console.error('Failed to submit score:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div className={`bg-white rounded border p-1.5 transition-colors text-xs ${
        dimmed
          ? 'border-gray-100 opacity-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}>
        {/* Row 1: Match label + Court/Time + Action */}
        <div className="flex items-center gap-2">
          <div className="font-semibold text-gray-900 w-14 flex-shrink-0 truncate">
            {match.eventRank || `M${match.matchNumber || '?'}`}
          </div>
          <div className="text-gray-500 flex-shrink-0">
            C{assignment.courtId} {config && formatSlotRange(assignment.slotId, assignment.durationSlots, config)}
          </div>
          <div className="flex-1" />
          {/* Score if finished */}
          {matchState?.score && (
            <div className="font-semibold text-gray-900 flex-shrink-0">
              {matchState.score.sideA}-{matchState.score.sideB}
            </div>
          )}
          {/* Action button */}
          <div className="flex-shrink-0">
            {status === 'scheduled' && (
              <button
                onClick={() => handleStatusChange('called')}
                disabled={updating || dimmed}
                className="px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Call
              </button>
            )}
            {status === 'called' && (
              <button
                onClick={() => handleStatusChange('started')}
                disabled={updating}
                className="px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                Start
              </button>
            )}
            {status === 'started' && (
              <button
                onClick={() => setShowScoreDialog(true)}
                disabled={updating}
                className="px-2 py-0.5 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
              >
                Finish
              </button>
            )}
            {status === 'finished' && (
              <span className="text-green-600 font-medium">Done</span>
            )}
          </div>
        </div>

        {/* Row 2: Players */}
        <div className="text-gray-600 truncate mt-0.5">
          {sideANames || '?'} vs {sideBNames || '?'}
        </div>
      </div>

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
