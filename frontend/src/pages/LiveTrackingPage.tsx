/**
 * Live Tracking Page
 * Central hub for tracking match status in real-time during tournament execution
 */
import { useLiveTracking } from '../hooks/useLiveTracking';
import { ProgressSummary } from '../features/tracking/ProgressSummary';
import { CurrentTimeIndicator } from '../features/tracking/CurrentTimeIndicator';
import { MatchStatusCard } from '../features/tracking/MatchStatusCard';

export default function LiveTrackingPage() {
  const {
    schedule,
    config,
    matches,
    matchStates,
    liveState,
    progressStats,
    matchesByStatus,
    updateMatchStatus,
    syncMatchStates,
    isLoading
  } = useLiveTracking();

  if (!schedule) {
    return (
      <div className="max-w-7xl mx-auto p-3">
        <div className="bg-yellow-50 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-sm text-sm">
          <h3 className="font-semibold mb-1">No Schedule Generated</h3>
          <p>
            Please generate a schedule first before using live tracking.
            Go to the <a href="/schedule" className="underline font-medium">Schedule page</a> to create one.
          </p>
        </div>
      </div>
    );
  }

  const players = matches.map(m => m);

  return (
    <div className="max-w-7xl mx-auto p-3 space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Tournament Tracking</h1>
        <p className="text-gray-600 text-sm">Track match status in real-time during tournament execution</p>
      </div>

      {/* Current Time Indicator */}
      <CurrentTimeIndicator lastSynced={liveState?.lastSynced} />

      {/* Progress Summary */}
      <ProgressSummary
        total={progressStats.total}
        finished={progressStats.finished}
        inProgress={progressStats.inProgress}
        remaining={progressStats.remaining}
        percentage={progressStats.percentage}
      />

      {/* Match Lists - Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* In Progress */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-1">
            <span className="bg-green-500 w-2 h-2 rounded-full"></span>
            In Progress ({matchesByStatus.started.length})
          </h2>
          <div className="space-y-2">
            {matchesByStatus.started.length === 0 ? (
              <div className="bg-gray-50 rounded p-3 text-center text-gray-500 text-sm">
                No matches currently in progress
              </div>
            ) : (
              matchesByStatus.started.map((assignment) => (
                <MatchStatusCard
                  key={assignment.matchId}
                  assignment={assignment}
                  match={matches.find(m => m.id === assignment.matchId)}
                  matchState={matchStates[assignment.matchId]}
                  config={config}
                  onUpdateStatus={updateMatchStatus}
                />
              ))
            )}
          </div>
        </div>

        {/* Up Next */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-1">
            <span className="bg-blue-500 w-2 h-2 rounded-full"></span>
            Up Next ({matchesByStatus.called.length + matchesByStatus.scheduled.slice(0, 5).length})
          </h2>
          <div className="space-y-2">
            {/* Called matches first */}
            {matchesByStatus.called.map((assignment) => (
              <MatchStatusCard
                key={assignment.matchId}
                assignment={assignment}
                match={matches.find(m => m.id === assignment.matchId)}
                matchState={matchStates[assignment.matchId]}
                config={config}
                onUpdateStatus={updateMatchStatus}
              />
            ))}

            {/* Then next scheduled matches */}
            {matchesByStatus.scheduled.slice(0, 5).map((assignment) => (
              <MatchStatusCard
                key={assignment.matchId}
                assignment={assignment}
                match={matches.find(m => m.id === assignment.matchId)}
                matchState={matchStates[assignment.matchId]}
                config={config}
                onUpdateStatus={updateMatchStatus}
              />
            ))}

            {matchesByStatus.called.length === 0 && matchesByStatus.scheduled.length === 0 && (
              <div className="bg-gray-50 rounded p-3 text-center text-gray-500 text-sm">
                No upcoming matches
              </div>
            )}
          </div>
        </div>

        {/* Recently Finished */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-1">
            <span className="bg-purple-500 w-2 h-2 rounded-full"></span>
            Recently Finished ({matchesByStatus.finished.slice(0, 5).length})
          </h2>
          <div className="space-y-2">
            {matchesByStatus.finished.slice(0, 5).length === 0 ? (
              <div className="bg-gray-50 rounded p-3 text-center text-gray-500 text-sm">
                No finished matches yet
              </div>
            ) : (
              matchesByStatus.finished
                .slice(0, 5)
                .reverse() // Show most recent first
                .map((assignment) => (
                  <MatchStatusCard
                    key={assignment.matchId}
                    assignment={assignment}
                    match={matches.find(m => m.id === assignment.matchId)}
                    matchState={matchStates[assignment.matchId]}
                    config={config}
                    onUpdateStatus={updateMatchStatus}
                  />
                ))
            )}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow p-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-700 mt-2 text-sm">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
