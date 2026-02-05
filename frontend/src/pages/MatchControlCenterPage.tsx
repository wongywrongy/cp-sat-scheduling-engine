/**
 * Match Control Center Page - Per Wireframe Design (Tailwind CSS)
 * Layout: Status Bar → Gantt Chart → Workflow Panel (In Progress | Tabbed Center | Details) → Suggested Next Dock
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveTracking } from '../hooks/useLiveTracking';
import { useLiveOperations } from '../hooks/useLiveOperations';
import { useTrafficLights } from '../hooks/useTrafficLights';
import { useAppStore } from '../store/appStore';
import { GanttChart } from '../features/control-center/GanttChart';
import { WorkflowPanel } from '../features/control-center/WorkflowPanel';
import { MatchDetailsPanel } from '../features/control-center/MatchDetailsPanel';
import { SuggestedNextDock } from '../features/control-center/SuggestedNextDock';

export function MatchControlCenterPage() {
  const liveTracking = useLiveTracking();
  const liveOps = useLiveOperations();
  const players = useAppStore((state) => state.players);

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [currentSlot, setCurrentSlot] = useState(0);

  // Update current slot every minute
  useEffect(() => {
    setCurrentSlot(liveOps.getCurrentSlot());
    const interval = setInterval(() => {
      setCurrentSlot(liveOps.getCurrentSlot());
    }, 60000);
    return () => clearInterval(interval);
  }, [liveOps.getCurrentSlot]);

  // Compute traffic light status for all matches
  const trafficLights = useTrafficLights(
    liveOps.schedule,
    liveOps.matches,
    liveOps.matchStates,
    players,
    liveOps.config,
    currentSlot
  );

  // Player names map for display
  const playerNames = useMemo(() => {
    return new Map(players.map((p) => [p.id, p.name]));
  }, [players]);

  // Get selected match data
  const selectedMatch = selectedMatchId
    ? liveOps.matches.find((m) => m.id === selectedMatchId)
    : undefined;
  const selectedState = selectedMatchId
    ? liveOps.matchStates[selectedMatchId]
    : undefined;
  const selectedAssignment = selectedMatchId && liveOps.schedule
    ? liveOps.schedule.assignments.find((a) => a.matchId === selectedMatchId)
    : undefined;
  const selectedAnalysis = selectedMatchId
    ? liveOps.analyzeImpact(selectedMatchId)
    : null;
  const selectedTrafficLight = selectedMatchId
    ? trafficLights.get(selectedMatchId)
    : undefined;

  // Calculate stats
  const stats = liveTracking.progressStats;

  // Count delayed matches
  const delayedCount = useMemo(() => {
    if (!liveOps.schedule) return 0;
    return liveOps.schedule.assignments.filter((a) => {
      const state = liveOps.matchStates[a.matchId];
      const isExplicitlyDelayed = state?.delayed === true;
      const isTimeDelayed = currentSlot > a.slotId &&
        (!state || state.status === 'scheduled' || state.status === 'called');
      return isExplicitlyDelayed || isTimeDelayed;
    }).length;
  }, [liveOps.schedule, liveOps.matchStates, currentSlot]);

  // No schedule state
  if (!liveTracking.schedule) {
    return (
      <div className="p-3">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <h3 className="font-semibold mb-1">No Schedule Generated</h3>
          <p className="text-sm">
            Generate a schedule first on the{' '}
            <Link to="/schedule" className="underline hover:text-yellow-900">Schedule page</Link>
          </p>
        </div>
      </div>
    );
  }

  if (!liveTracking.config || !liveOps.config || !liveOps.schedule) {
    return (
      <div className="p-3">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gray-50 overflow-hidden">
      {/* Status Bar */}
      <div className="flex justify-between items-center px-5 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold">{stats?.percentage || 0}% complete</span>
          <span className="text-gray-500">
            {stats?.finished || 0}/{stats?.total || 0} matches
          </span>
          {(stats?.inProgress || 0) > 0 && (
            <span className="text-gray-500">{stats.inProgress} active</span>
          )}
          {delayedCount > 0 && (
            <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">
              {delayedCount} running late
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Ready
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Resting
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Blocked
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <span className="w-2.5 h-2.5 rounded-sm border-2 border-yellow-500 bg-transparent" />
            Late
          </span>
          <button
            onClick={liveOps.triggerReoptimize}
            disabled={liveOps.isReoptimizing}
            className="px-3.5 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-wait"
          >
            {liveOps.isReoptimizing ? 'Optimizing...' : 'Re-optimize'}
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="px-5 py-3 bg-white border-b border-gray-200 overflow-x-auto flex-shrink-0">
        <GanttChart
          schedule={liveOps.schedule}
          matches={liveOps.matches}
          matchStates={liveOps.matchStates}
          config={liveOps.config}
          currentSlot={currentSlot}
          selectedMatchId={selectedMatchId}
          onMatchSelect={setSelectedMatchId}
          trafficLights={trafficLights}
        />
      </div>

      {/* Main Content: Workflow Panel + Match Details */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Workflow Panel (In Progress + Tabbed Up Next/Finished) */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <WorkflowPanel
            matchesByStatus={liveTracking.matchesByStatus}
            matches={liveTracking.matches}
            matchStates={liveTracking.matchStates}
            config={liveTracking.config}
            currentSlot={currentSlot}
            onUpdateStatus={liveTracking.updateMatchStatus}
            selectedMatchId={selectedMatchId}
            onSelectMatch={setSelectedMatchId}
            trafficLights={trafficLights}
            playerNames={playerNames}
          />
        </div>

        {/* Match Details Sidebar */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
          <div className="px-4 py-2.5 border-b border-gray-200">
            <span className="font-bold text-sm text-gray-500 uppercase tracking-wide">
              Match Details
            </span>
          </div>
          <MatchDetailsPanel
            assignment={selectedAssignment}
            match={selectedMatch}
            matchState={selectedState}
            matches={liveOps.matches}
            trafficLight={selectedTrafficLight}
            analysis={selectedAnalysis}
            playerNames={playerNames}
            slotToTime={liveOps.slotToTime}
            onSelectMatch={setSelectedMatchId}
          />
        </div>
      </div>

      {/* Suggested Next Dock */}
      <SuggestedNextDock
        schedule={liveOps.schedule}
        matches={liveOps.matches}
        matchStates={liveOps.matchStates}
        trafficLights={trafficLights}
        onSelectMatch={setSelectedMatchId}
        selectedMatchId={selectedMatchId}
        slotToTime={liveOps.slotToTime}
        playerNames={playerNames}
      />

      {liveTracking.isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
            <p className="text-gray-600 mt-2 text-sm">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
