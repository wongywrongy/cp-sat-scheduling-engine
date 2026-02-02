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
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Schedule</h2>
        <ScheduleActions
          onGenerate={handleGenerate}
          onReoptimize={handleReoptimize}
          generating={generating}
          reoptimizing={reoptimizing}
          hasSchedule={!!schedule}
        />
      </div>

      {needsConfig && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <p className="font-semibold">Tournament configuration needed</p>
          <p className="text-sm">Please configure your tournament settings in <Link to="/setup" className="underline">Tournament Setup</Link> to generate schedules.</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Live Schedule Grid - shown during optimization AND after completion */}
      {showVisualization && displayAssignments.length > 0 && (
        <div className="mb-6">
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
          />
        </div>
      )}

      {/* Starting optimization spinner */}
      {isOptimizing && !hasLiveProgress && (
        <div className="flex flex-col items-center justify-center h-64 gap-4 mb-6">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-500">Starting optimization...</div>
        </div>
      )}

      {/* Schedule details section - shown after schedule is generated */}
      {schedule && config && !isOptimizing && (
        <>
          {/* View Toggle Buttons */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setView('timeslot')}
              className={`px-4 py-2 rounded-md ${
                view === 'timeslot'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Time-Slot View
            </button>
            <button
              onClick={() => setView('court')}
              className={`px-4 py-2 rounded-md ${
                view === 'court'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Court View
            </button>
          </div>

          {/* Detailed Schedule View */}
          <ScheduleView
            schedule={schedule}
            view={view}
            config={config}
          />
        </>
      )}

      {/* Empty state */}
      {!schedule && !isOptimizing && !finalProgress && (
        <div className="p-8 bg-white rounded-lg shadow text-center text-gray-500">
          {needsConfig ? (
            <p>Configure tournament settings first, then click "Generate Schedule" to create a schedule</p>
          ) : (
            <p>Click "Generate Schedule" to create a schedule</p>
          )}
        </div>
      )}
    </div>
  );
}
