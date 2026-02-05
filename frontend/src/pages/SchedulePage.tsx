import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchedule } from '../hooks/useSchedule';
import { useTournament } from '../hooks/useTournament';
import { useAppStore } from '../store/appStore';
import { ScheduleView } from '../features/schedule/ScheduleView';
import { ScheduleActions } from '../features/schedule/ScheduleActions';
import { LiveScheduleGrid } from '../features/schedule/live';
import type { ScheduleAssignment } from '../api/dto';

export function SchedulePage() {
  const { config, loading: configLoading, error: configError } = useTournament();
  const players = useAppStore((state) => state.players);
  const matches = useAppStore((state) => state.matches);
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

  const [generating, setGenerating] = useState(false);
  const [reoptimizing, setReoptimizing] = useState(false);

  // Store final progress state to keep visualization visible after completion
  const [finalProgress, setFinalProgress] = useState<{
    elapsed: number;
    solutionCount?: number;
    objectiveScore?: number;
    bestBound?: number;
    assignments: ScheduleAssignment[];
  } | null>(null);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setFinalProgress(null); // Clear previous final state
      await generateSchedule();
    } finally {
      setGenerating(false);
      // Save final progress state when generation completes
      if (generationProgress?.current_assignments) {
        setFinalProgress({
          elapsed: generationProgress.elapsed_ms,
          solutionCount: generationProgress.solution_count,
          objectiveScore: generationProgress.current_objective,
          bestBound: generationProgress.best_bound,
          assignments: generationProgress.current_assignments,
        });
      }
    }
  };

  const handleReoptimize = async () => {
    try {
      setReoptimizing(true);
      setFinalProgress(null);
      await reoptimizeSchedule();
    } finally {
      setReoptimizing(false);
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
  const isOptimizing = loading || generating;
  const hasLiveProgress = isOptimizing && generationProgress?.current_assignments && generationProgress.current_assignments.length > 0;

  // Use live progress during optimization, or final progress after completion, or schedule assignments
  const displayAssignments = hasLiveProgress
    ? generationProgress.current_assignments
    : (finalProgress?.assignments || schedule?.assignments || []);

  const showVisualization = config && (hasLiveProgress || finalProgress || schedule);

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

      {/* Live Schedule Grid - shown during optimization AND after completion */}
      {showVisualization && displayAssignments.length > 0 && (
        <LiveScheduleGrid
            assignments={displayAssignments}
            matches={matches}
            players={players}
            config={config!}
            elapsed={hasLiveProgress ? generationProgress.elapsed_ms : (finalProgress?.elapsed || 0)}
            solutionCount={hasLiveProgress ? generationProgress.solution_count : finalProgress?.solutionCount}
            objectiveScore={hasLiveProgress ? generationProgress.current_objective : (finalProgress?.objectiveScore || schedule?.objectiveScore || undefined)}
            bestBound={hasLiveProgress ? generationProgress.best_bound : finalProgress?.bestBound}
            status={isOptimizing ? 'solving' : 'complete'}
            totalMatches={matches.length}
            onGenerate={handleGenerate}
            onReoptimize={handleReoptimize}
            generating={generating}
            reoptimizing={reoptimizing}
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

      {/* Schedule details section - shown after schedule is generated */}
      {schedule && config && !isOptimizing && (
        <div className="bg-white rounded border border-gray-200">
          {/* Header with view toggle */}
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
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
            <ScheduleActions
              onGenerate={handleGenerate}
              onReoptimize={handleReoptimize}
              generating={generating}
              reoptimizing={reoptimizing}
              hasSchedule={!!schedule}
            />
          </div>

          {/* Schedule content */}
          <ScheduleView
            schedule={schedule}
            view={view}
            config={config}
          />
        </div>
      )}

      {/* Empty state */}
      {!schedule && !isOptimizing && !finalProgress && (
        <div className="p-8 bg-white rounded border border-gray-200 text-center">
          <div className="text-gray-400 mb-3">
            <svg className="mx-auto h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {needsConfig ? 'Configure tournament settings first to generate a schedule.' : 'No schedule generated yet.'}
          </p>
          <ScheduleActions
            onGenerate={handleGenerate}
            onReoptimize={handleReoptimize}
            generating={generating}
            reoptimizing={reoptimizing}
            hasSchedule={!!schedule}
          />
        </div>
      )}
    </div>
  );
}
