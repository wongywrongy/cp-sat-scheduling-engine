/**
 * Match Control Center Page
 * Dense layout with all information visible at once
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLiveTracking } from '../hooks/useLiveTracking';
import { useLiveOperations } from '../hooks/useLiveOperations';
import { WorkflowView } from '../features/control-center/WorkflowView';
import { MatchDetailsPanel } from '../features/control-center/MatchDetailsPanel';
import { LiveOperationsGrid } from '../features/liveops/LiveOperationsGrid';

export function MatchControlCenterPage() {
  const liveTracking = useLiveTracking();
  const liveOps = useLiveOperations();

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [currentSlot, setCurrentSlot] = useState(0);

  useEffect(() => {
    setCurrentSlot(liveOps.getCurrentSlot());
    const interval = setInterval(() => {
      setCurrentSlot(liveOps.getCurrentSlot());
    }, 60000);
    return () => clearInterval(interval);
  }, [liveOps.getCurrentSlot]);

  const selectedAnalysis = selectedMatchId ? liveOps.analyzeImpact(selectedMatchId) : null;
  const selectedMatch = selectedMatchId ? liveOps.matches.find((m) => m.id === selectedMatchId) : undefined;
  const selectedState = selectedMatchId ? liveOps.matchStates[selectedMatchId] : undefined;

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
    <div className="w-full h-[calc(100vh-56px)] flex flex-col px-2 py-1 gap-2">
      {/* Timeline Grid with integrated stats and reoptimize */}
      <div className="flex-shrink-0">
        <LiveOperationsGrid
          schedule={liveOps.schedule}
          matches={liveOps.matches}
          matchStates={liveOps.matchStates}
          config={liveOps.config}
          overrunMatches={liveOps.overrunMatches}
          impactedMatches={liveOps.impactedMatches}
          onMatchSelect={setSelectedMatchId}
          onActualTimeUpdate={liveOps.updateActualTime}
          currentSlot={currentSlot}
          stats={liveTracking.progressStats}
          onReoptimize={liveOps.triggerReoptimize}
          isReoptimizing={liveOps.isReoptimizing}
        />
      </div>

      {/* Bottom row: Workflow + Match Details */}
      <div className="flex-1 min-h-0 flex gap-2">
        <div className="flex-1 min-w-0 bg-white rounded border border-gray-200 p-2 overflow-hidden">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Workflow</h2>
          <WorkflowView
            matchesByStatus={liveTracking.matchesByStatus}
            matches={liveTracking.matches}
            matchStates={liveTracking.matchStates}
            config={liveTracking.config}
            currentSlot={currentSlot}
            onUpdateStatus={liveTracking.updateMatchStatus}
          />
        </div>

        <div className="w-64 flex-shrink-0 bg-white rounded border border-gray-200 p-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Match Details</h2>
          <MatchDetailsPanel
            analysis={selectedAnalysis}
            match={selectedMatch}
            matchState={selectedState}
            matches={liveOps.matches}
            slotToTime={liveOps.slotToTime}
            onActualTimeUpdate={liveOps.updateActualTime}
            onReoptimize={liveOps.triggerReoptimize}
          />
        </div>
      </div>

      {liveTracking.isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
            <p className="text-gray-700 mt-2 text-sm">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
