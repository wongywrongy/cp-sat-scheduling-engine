import { Link } from 'react-router-dom';
import { useSchedule } from '../hooks/useSchedule';
import { useTournament } from '../hooks/useTournament';
import { useAppStore } from '../store/appStore';
import { ScheduleView } from '../features/schedule/ScheduleView';
import { ScheduleActions } from '../features/schedule/ScheduleActions';
import { LiveScheduleGrid } from '../features/schedule/live';

export function SchedulePage() {
  const { config, loading: configLoading, error: configError } = useTournament();
  const players = useAppStore((state) => state.players);
  const matches = useAppStore((state) => state.matches);
  const scheduleStats = useAppStore((state) => state.scheduleStats);
  const {
    schedule,
    loading,
    error,
    view,
    setView,
    generateSchedule,
    reoptimizeSchedule,
    generationProgress,
  } = useSchedule();

  // Use global loading state - persists across tab switches
  const isOptimizing = loading;

  const handleGenerate = async () => {
    // Warn if schedule already exists
    if (schedule) {
      const confirmed = window.confirm(
        'WARNING: Generating a new schedule will REPLACE the current schedule!\n\n' +
        'All existing schedule data will be lost.\n\n' +
        'Are you sure you want to continue?'
      );
      if (!confirmed) return;
    }

    try {
      await generateSchedule();
    } catch (err) {
      // Error is already set in the hook
      console.error('Generation failed:', err);
    }
  };

  const handleReoptimize = async () => {
    try {
      await reoptimizeSchedule();
    } catch (err) {
      console.error('Reoptimization failed:', err);
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tournament configuration...</div>
      </div>
    );
  }

  const needsConfig = !config || (configError && configError.includes("not found"));

  // Determine what to show for visualization
  const hasLiveProgress = isOptimizing && generationProgress?.current_assignments && generationProgress.current_assignments.length > 0;

  // Use live progress during optimization, or stored stats after completion, or schedule assignments
  const displayAssignments = hasLiveProgress
    ? generationProgress.current_assignments
    : (scheduleStats?.assignments || schedule?.assignments || []);

  const showVisualization = config && (hasLiveProgress || scheduleStats || schedule);

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      {needsConfig && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded text-sm">
          <p className="font-medium">Tournament configuration needed</p>
          <p>Please configure your tournament settings in <Link to="/setup" className="underline hover:text-yellow-900">Tournament Setup</Link> to generate schedules.</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* Infeasible schedule warning */}
      {schedule?.status === 'infeasible' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
          <p className="font-medium text-red-800 mb-2">Schedule is Infeasible</p>
          <p className="text-red-700 mb-2">The solver could not find a valid schedule with the current configuration.</p>
          {schedule.infeasibleReasons && schedule.infeasibleReasons.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-red-600 hover:text-red-800">
                View {schedule.infeasibleReasons.length} constraint violations
              </summary>
              <ul className="mt-2 pl-4 space-y-1 text-red-600 text-xs max-h-48 overflow-y-auto">
                {schedule.infeasibleReasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </details>
          )}
          <p className="mt-3 text-red-700 text-xs">
            Try: Extending tournament hours, adding more courts, or reducing player constraints.
          </p>
        </div>
      )}

      {/* Live Schedule Grid - shown during optimization AND after completion */}
      {showVisualization && displayAssignments.length > 0 && (
        <LiveScheduleGrid
            assignments={displayAssignments}
            matches={matches}
            players={players}
            config={config!}
            elapsed={hasLiveProgress ? generationProgress.elapsed_ms : (scheduleStats?.elapsed || 0)}
            solutionCount={hasLiveProgress ? generationProgress.solution_count : scheduleStats?.solutionCount}
            objectiveScore={hasLiveProgress ? generationProgress.current_objective : (scheduleStats?.objectiveScore || schedule?.objectiveScore || undefined)}
            bestBound={hasLiveProgress ? generationProgress.best_bound : scheduleStats?.bestBound}
            status={isOptimizing ? 'solving' : 'complete'}
            totalMatches={matches.length}
            onGenerate={handleGenerate}
            onReoptimize={handleReoptimize}
            generating={isOptimizing}
            reoptimizing={isOptimizing}
            hasSchedule={!!schedule}
          />
      )}

      {/* Starting optimization spinner */}
      {isOptimizing && !hasLiveProgress && (
        <div className="flex flex-col items-center justify-center h-48 gap-2 bg-white rounded border border-gray-200">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <div className="text-gray-500 text-sm">Starting optimization...</div>
        </div>
      )}

      {/* Schedule details section - shown after schedule is generated (not if infeasible) */}
      {schedule && schedule.status !== 'infeasible' && config && !isOptimizing && (
        <div className="bg-white rounded border border-gray-200">
          {/* Header with view toggle */}
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('timeslot')}
                className={`px-2 py-1 text-xs rounded ${
                  view === 'timeslot'
                    ? 'bg-gray-100 text-gray-800 font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Time-Slot View
              </button>
              <button
                onClick={() => setView('court')}
                className={`px-2 py-1 text-xs rounded ${
                  view === 'court'
                    ? 'bg-gray-100 text-gray-800 font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Court View
              </button>
            </div>
          </div>

          {/* Schedule content */}
          <ScheduleView
            schedule={schedule}
            view={view}
            config={config}
          />
        </div>
      )}

      {/* Empty state - also show when schedule is infeasible */}
      {(!schedule || schedule?.status === 'infeasible') && !isOptimizing && !scheduleStats && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded border border-gray-200">
          <div className="text-gray-400 mb-3">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {needsConfig ? 'Configure tournament settings first to generate a schedule.' : 'No schedule generated yet.'}
          </p>
          <ScheduleActions
            onGenerate={handleGenerate}
            onReoptimize={handleReoptimize}
            generating={isOptimizing}
            reoptimizing={isOptimizing}
            hasSchedule={!!schedule}
          />
        </div>
      )}
    </div>
  );
}
