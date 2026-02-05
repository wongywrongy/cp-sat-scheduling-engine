/**
 * Schedule hook - calls stateless API with data from Zustand store
 * Uses global state for generation progress to persist across tab switches
 */
import { useCallback, useState, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../api/client';
import type { ScheduleView } from '../api/dto';

export function useSchedule() {
  const config = useAppStore((state) => state.config);
  const players = useAppStore((state) => state.players);
  const matches = useAppStore((state) => state.matches);
  const schedule = useAppStore((state) => state.schedule);
  const setSchedule = useAppStore((state) => state.setSchedule);
  const setScheduleStats = useAppStore((state) => state.setScheduleStats);

  // Use global generation state (persists across tab switches)
  const isGenerating = useAppStore((state) => state.isGenerating);
  const generationProgress = useAppStore((state) => state.generationProgress);
  const generationError = useAppStore((state) => state.generationError);
  const setIsGenerating = useAppStore((state) => state.setIsGenerating);
  const setGenerationProgress = useAppStore((state) => state.setGenerationProgress);
  const setGenerationError = useAppStore((state) => state.setGenerationError);

  const [view, setView] = useState<ScheduleView>('timeslot');

  // Track abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateSchedule = useCallback(async () => {
    if (!config) {
      throw new Error('No configuration set');
    }

    // Cancel any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setIsGenerating(true);
      setGenerationError(null);
      setGenerationProgress(null);

      // Call stateless API with progress tracking
      const result = await apiClient.generateScheduleWithProgress(
        {
          config,
          players,
          matches,
        },
        (progress) => {
          // Update global state - survives tab switches
          setGenerationProgress(progress);
        },
        abortController.signal
      );

      setSchedule(result);

      // Save final stats from global state
      const finalProgress = useAppStore.getState().generationProgress;
      if (finalProgress?.current_assignments) {
        setScheduleStats({
          elapsed: finalProgress.elapsed_ms,
          solutionCount: finalProgress.solution_count,
          objectiveScore: finalProgress.current_objective,
          bestBound: finalProgress.best_bound,
          assignments: finalProgress.current_assignments,
        });
      }
    } catch (err) {
      // Don't treat abort as error
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to generate schedule';
      setGenerationError(message);
      throw err;
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [config, players, matches, setSchedule, setScheduleStats, setIsGenerating, setGenerationProgress, setGenerationError]);

  const reoptimizeSchedule = useCallback(async () => {
    if (!config || !schedule) {
      throw new Error('No schedule to reoptimize');
    }

    try {
      setIsGenerating(true);
      setGenerationError(null);

      // Call stateless API with previous assignments
      const result = await apiClient.generateSchedule({
        config,
        players,
        matches,
        previousAssignments: schedule.assignments,
      });

      setSchedule(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reoptimize schedule';
      setGenerationError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [config, players, matches, schedule, setSchedule, setIsGenerating, setGenerationError]);

  return {
    schedule,
    loading: isGenerating,
    error: generationError,
    view,
    setView,
    generateSchedule,
    reoptimizeSchedule,
    loadSchedule: () => {}, // No-op for stateless (schedule is already in store)
    generationProgress,
  };
}
