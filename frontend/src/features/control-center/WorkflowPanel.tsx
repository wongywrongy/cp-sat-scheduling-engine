/**
 * Workflow Panel - Per Wireframe Design (Tailwind CSS)
 * Left: In Progress (~320px) with elapsed timer
 * Center: Tabbed Up Next / Finished with colored left borders
 */
import { useState, useMemo, useEffect } from 'react';
import type { ScheduleAssignment, MatchDTO, MatchStateDTO, TournamentConfig, SetScore, DelayReason } from '../../api/dto';
import type { TrafficLightResult } from '../../utils/trafficLight';
import { formatSlotTime } from '../../utils/timeUtils';
import { MatchScoreDialog } from '../tracking/MatchScoreDialog';
import { BadmintonScoreDialog } from '../tracking/BadmintonScoreDialog';
import { DelayReasonDialog } from '../tracking/DelayReasonDialog';

interface WorkflowPanelProps {
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
  selectedMatchId?: string | null;
  onSelectMatch?: (matchId: string) => void;
  trafficLights?: Map<string, TrafficLightResult>;
  playerNames: Map<string, string>;
}

function getMatchLabel(match: MatchDTO | undefined): string {
  if (!match) return '?';
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

  return <span className="tabular-nums">{elapsed}</span>;
}

// In Progress Card with Score Dialog
function InProgressCard({
  assignment,
  match,
  matchState,
  playerNames,
  config,
  isSelected,
  onSelect,
  onUpdateStatus,
}: {
  assignment: ScheduleAssignment;
  match: MatchDTO | undefined;
  matchState: MatchStateDTO | undefined;
  playerNames: Map<string, string>;
  config: TournamentConfig | null;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateStatus: (matchId: string, status: MatchStateDTO['status'], data?: Partial<MatchStateDTO>) => Promise<void>;
}) {
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (!match) return null;

  const sideANames = (match.sideA || []).map((id) => playerNames.get(id) || id).join(' & ');
  const sideBNames = (match.sideB || []).map((id) => playerNames.get(id) || id).join(' & ');

  // Scoring format from config
  const useBadmintonScoring = config?.scoringFormat === 'badminton';
  const setsToWin = config?.setsToWin ?? 2;
  const pointsPerSet = config?.pointsPerSet ?? 21;
  const deuceEnabled = config?.deuceEnabled ?? true;

  const handleSimpleScoreSubmit = async (score: { sideA: number; sideB: number }, notes: string) => {
    setUpdating(true);
    try {
      await onUpdateStatus(assignment.matchId, 'finished', { score, notes });
      setShowScoreDialog(false);
    } finally {
      setUpdating(false);
    }
  };

  const handleBadmintonScoreSubmit = async (sets: SetScore[], _winner: 'A' | 'B', notes: string) => {
    setUpdating(true);
    try {
      const setsWonA = sets.filter(s => s.sideA > s.sideB).length;
      const setsWonB = sets.filter(s => s.sideB > s.sideA).length;
      await onUpdateStatus(assignment.matchId, 'finished', {
        sets,
        score: { sideA: setsWonA, sideB: setsWonB },
        notes,
      });
      setShowScoreDialog(false);
    } finally {
      setUpdating(false);
    }
  };

  const handleUndo = async () => {
    setUpdating(true);
    try {
      await onUpdateStatus(assignment.matchId, 'called', { actualStartTime: undefined });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div
        onClick={onSelect}
        className={`rounded-lg border p-2.5 mb-1.5 cursor-pointer transition-all ${
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
            : 'border-green-200 bg-green-50 hover:border-green-300'
        }`}
      >
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm">{getMatchLabel(match)}</span>
            <span className="text-xs text-gray-500">C{assignment.courtId}</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setShowScoreDialog(true); }}
              disabled={updating}
              className="px-2.5 py-1 bg-purple-600 text-white rounded text-xs font-semibold hover:bg-purple-700 disabled:bg-gray-400"
            >
              Finish
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleUndo(); }}
              disabled={updating}
              className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300 disabled:bg-gray-100"
            >
              Undo
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-700 mb-1 truncate">{sideANames} vs {sideBNames}</div>
        <div className="text-xs text-gray-500">
          <ElapsedTimer startTime={matchState?.actualStartTime} />
        </div>
      </div>

      {showScoreDialog && (
        useBadmintonScoring ? (
          <BadmintonScoreDialog
            matchName={getMatchLabel(match)}
            sideAName={sideANames}
            sideBName={sideBNames}
            setsToWin={setsToWin}
            pointsPerSet={pointsPerSet}
            deuceEnabled={deuceEnabled}
            onSubmit={handleBadmintonScoreSubmit}
            onCancel={() => setShowScoreDialog(false)}
            isSubmitting={updating}
          />
        ) : (
          <MatchScoreDialog
            matchName={getMatchLabel(match)}
            sideAName={sideANames}
            sideBName={sideBNames}
            onSubmit={handleSimpleScoreSubmit}
            onCancel={() => setShowScoreDialog(false)}
            isSubmitting={updating}
          />
        )
      )}
    </>
  );
}

// Up Next Card with colored left border and inline tooltip
function UpNextCard({
  assignment,
  match,
  matchState,
  playerNames,
  trafficLight,
  isSelected,
  isCalled,
  config,
  currentSlot,
  onSelect,
  onUpdateStatus,
}: {
  assignment: ScheduleAssignment;
  match: MatchDTO | undefined;
  matchState: MatchStateDTO | undefined;
  playerNames: Map<string, string>;
  trafficLight?: TrafficLightResult;
  isSelected: boolean;
  isCalled: boolean;
  config: TournamentConfig | null;
  currentSlot: number;
  onSelect: () => void;
  onUpdateStatus: (matchId: string, status: MatchStateDTO['status'], data?: Partial<MatchStateDTO>) => Promise<void>;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDelayDialog, setShowDelayDialog] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (!match) return null;

  const sideANames = (match.sideA || []).map((id) => playerNames.get(id) || id).join(' & ');
  const sideBNames = (match.sideB || []).map((id) => playerNames.get(id) || id).join(' & ');
  const scheduledTime = config ? formatSlotTime(assignment.slotId, config) : '??:??';
  const isLate = currentSlot > assignment.slotId && !isCalled;

  const light = trafficLight?.status || 'green';

  // Border and background colors based on traffic light
  const borderColorClass = light === 'green'
    ? 'border-l-green-500'
    : light === 'yellow'
      ? 'border-l-yellow-500'
      : 'border-l-red-500';

  const bgColorClass = light === 'green'
    ? 'bg-green-50'
    : light === 'yellow'
      ? 'bg-yellow-50'
      : 'bg-red-50';

  const dotColorClass = light === 'green'
    ? 'bg-green-500'
    : light === 'yellow'
      ? 'bg-yellow-500'
      : 'bg-red-500';

  const handleCall = async () => {
    setUpdating(true);
    try {
      await onUpdateStatus(assignment.matchId, 'called', { delayed: false });
    } finally {
      setUpdating(false);
    }
  };

  const handleStart = async () => {
    setUpdating(true);
    try {
      await onUpdateStatus(assignment.matchId, 'started');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelayWithReason = async (reason: DelayReason, notes?: string) => {
    setUpdating(true);
    try {
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      await onUpdateStatus(assignment.matchId, 'scheduled', {
        delayed: true,
        delayReason: reason,
        notes: notes ? `Delayed at ${timestamp}: ${notes}` : `Delayed at ${timestamp}`,
      });
      setShowDelayDialog(false);
    } finally {
      setUpdating(false);
    }
  };

  const handleUndo = async () => {
    setUpdating(true);
    try {
      await onUpdateStatus(assignment.matchId, 'scheduled', { delayed: false });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div
        onClick={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`rounded-lg border border-l-[3px] p-2.5 mb-1.5 cursor-pointer transition-all ${borderColorClass} ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' : `${bgColorClass} hover:brightness-95`
        }`}
      >
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dotColorClass}`} />
            <span className="font-bold text-sm">{getMatchLabel(match)}</span>
            <span className="text-xs text-gray-500">C{assignment.courtId} · {scheduledTime}</span>
            {isLate && <span className="text-[10px] text-yellow-600 font-semibold">(late)</span>}
          </div>
          <div className="flex gap-1">
            {isCalled ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleStart(); }}
                  disabled={updating}
                  className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 disabled:bg-gray-400"
                >
                  Start
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleUndo(); }}
                  disabled={updating}
                  className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300 disabled:bg-gray-100"
                >
                  Undo
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCall(); }}
                  disabled={updating || light !== 'green'}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    light === 'green'
                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Call
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDelayDialog(true); }}
                  disabled={updating}
                  className="px-2.5 py-1 bg-yellow-500 text-white rounded text-xs font-semibold hover:bg-yellow-600 disabled:bg-gray-400"
                >
                  Delay
                </button>
              </>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-700 truncate">{sideANames} vs {sideBNames}</div>

        {/* Inline tooltip on hover for yellow/red */}
        {isHovered && trafficLight?.reason && light !== 'green' && (
          <div className={`mt-1.5 px-2.5 py-1.5 rounded text-xs flex items-center gap-1.5 ${
            light === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
            {trafficLight.reason}
          </div>
        )}
      </div>

      {showDelayDialog && (
        <DelayReasonDialog
          matchName={getMatchLabel(match)}
          onSubmit={handleDelayWithReason}
          onCancel={() => setShowDelayDialog(false)}
          isSubmitting={updating}
        />
      )}
    </>
  );
}

// Finished Card with Undo
function FinishedCard({
  assignment,
  match,
  matchState,
  playerNames,
  isSelected,
  onSelect,
  onUpdateStatus,
}: {
  assignment: ScheduleAssignment;
  match: MatchDTO | undefined;
  matchState: MatchStateDTO | undefined;
  playerNames: Map<string, string>;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateStatus: (matchId: string, status: MatchStateDTO['status'], data?: Partial<MatchStateDTO>) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);

  if (!match) return null;

  const sideANames = (match.sideA || []).map((id) => playerNames.get(id) || id).join(' & ');
  const sideBNames = (match.sideB || []).map((id) => playerNames.get(id) || id).join(' & ');
  const score = matchState?.score;

  const handleUndo = async () => {
    setUpdating(true);
    try {
      await onUpdateStatus(assignment.matchId, 'started', {
        actualEndTime: undefined,
        score: undefined,
        sets: undefined,
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg border p-2.5 mb-1.5 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
      }`}
    >
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm text-gray-500">{getMatchLabel(match)}</span>
          <span className="text-xs text-gray-400">C{assignment.courtId}</span>
        </div>
        <div className="flex items-center gap-2">
          {score && (
            <span className="font-bold text-sm text-purple-600">
              {score.sideA}-{score.sideB}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleUndo(); }}
            disabled={updating}
            className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300 disabled:bg-gray-100"
          >
            Undo
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-500 truncate">{sideANames} vs {sideBNames}</div>
    </div>
  );
}

export function WorkflowPanel({
  matchesByStatus,
  matches,
  matchStates,
  config,
  currentSlot,
  onUpdateStatus,
  selectedMatchId,
  onSelectMatch,
  trafficLights,
  playerNames,
}: WorkflowPanelProps) {
  const [activeTab, setActiveTab] = useState<'up_next' | 'finished'>('up_next');

  const matchMap = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const calledIds = useMemo(() => new Set(matchesByStatus.called.map((a) => a.matchId)), [matchesByStatus.called]);

  // Sort Up Next by: 1) called first, 2) traffic light (green > yellow > red), 3) time
  const trafficPriority: Record<string, number> = { green: 0, yellow: 1, red: 2 };
  const upNextSorted = useMemo(() => {
    return [...matchesByStatus.called, ...matchesByStatus.scheduled].sort((a, b) => {
      // Called matches first
      const aIsCalled = calledIds.has(a.matchId);
      const bIsCalled = calledIds.has(b.matchId);
      if (aIsCalled && !bIsCalled) return -1;
      if (!aIsCalled && bIsCalled) return 1;

      // Traffic light priority
      if (!aIsCalled && !bIsCalled && trafficLights) {
        const aLight = trafficLights.get(a.matchId)?.status || 'green';
        const bLight = trafficLights.get(b.matchId)?.status || 'green';
        const priorityDiff = trafficPriority[aLight] - trafficPriority[bLight];
        if (priorityDiff !== 0) return priorityDiff;
      }

      return a.slotId - b.slotId;
    });
  }, [matchesByStatus.called, matchesByStatus.scheduled, calledIds, trafficLights]);

  const finishedSorted = useMemo(() => {
    return [...matchesByStatus.finished].sort((a, b) => b.slotId - a.slotId);
  }, [matchesByStatus.finished]);

  const startedSorted = useMemo(() => {
    return [...matchesByStatus.started].sort((a, b) => a.slotId - b.slotId);
  }, [matchesByStatus.started]);

  return (
    <div className="h-full flex overflow-hidden min-h-0">
      {/* In Progress Column */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-semibold text-sm">In Progress</span>
          <span className="text-xs text-gray-400">({matchesByStatus.started.length})</span>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {startedSorted.length === 0 ? (
            <div className="text-center text-gray-400 text-xs py-4">No active matches</div>
          ) : (
            startedSorted.map((assignment) => (
              <InProgressCard
                key={assignment.matchId}
                assignment={assignment}
                match={matchMap.get(assignment.matchId)}
                matchState={matchStates[assignment.matchId]}
                playerNames={playerNames}
                config={config}
                isSelected={selectedMatchId === assignment.matchId}
                onSelect={() => onSelectMatch?.(assignment.matchId)}
                onUpdateStatus={onUpdateStatus}
              />
            ))
          )}
        </div>
      </div>

      {/* Tabbed Up Next / Finished */}
      <div className="flex-1 bg-white flex flex-col min-w-0">
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('up_next')}
            className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'up_next'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Up Next
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === 'up_next' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {upNextSorted.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('finished')}
            className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'finished'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Finished
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === 'finished' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {finishedSorted.length}
            </span>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {activeTab === 'up_next' && (
            upNextSorted.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-4">No matches pending</div>
            ) : (
              upNextSorted.map((assignment) => (
                <UpNextCard
                  key={assignment.matchId}
                  assignment={assignment}
                  match={matchMap.get(assignment.matchId)}
                  matchState={matchStates[assignment.matchId]}
                  playerNames={playerNames}
                  trafficLight={trafficLights?.get(assignment.matchId)}
                  isSelected={selectedMatchId === assignment.matchId}
                  isCalled={calledIds.has(assignment.matchId)}
                  config={config}
                  currentSlot={currentSlot}
                  onSelect={() => onSelectMatch?.(assignment.matchId)}
                  onUpdateStatus={onUpdateStatus}
                />
              ))
            )
          )}
          {activeTab === 'finished' && (
            finishedSorted.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-4">No completed matches</div>
            ) : (
              finishedSorted.map((assignment) => (
                <FinishedCard
                  key={assignment.matchId}
                  assignment={assignment}
                  match={matchMap.get(assignment.matchId)}
                  matchState={matchStates[assignment.matchId]}
                  playerNames={playerNames}
                  isSelected={selectedMatchId === assignment.matchId}
                  onSelect={() => onSelectMatch?.(assignment.matchId)}
                  onUpdateStatus={onUpdateStatus}
                />
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
