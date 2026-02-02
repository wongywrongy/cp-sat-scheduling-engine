/**
 * Schedule hook - calls stateless API with data from Zustand store
 */
import { useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../api/client';
import type { ScheduleView, SolverProgressEvent } from '../api/dto';

export function useSchedule() {
  const config = useAppStore((state) => state.config);
  const players = useAppStore((state) => state.players);
  const matches = useAppStore((state) => state.matches);
  const schedule = useAppStore((state) => state.schedule);
  const setSchedule = useAppStore((state) => state.setSchedule);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ScheduleView>('timeslot');
  const [generationProgress, setGenerationProgress] = useState<SolverProgressEvent | null>(null);

  const generateSchedule = useCallback(async () => {
    if (!config) {
      throw new Error('No configuration set');
    }

    try {
      setLoading(true);
      setError(null);
      setGenerationProgress(null);

      // Call stateless API with progress tracking
      const result = await apiClient.generateScheduleWithProgress(
        {
          config,
          players,
          matches,
        },
        (progress) => {
          setGenerationProgress(progress);
        }
      );

      setSchedule(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate schedule';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
      setGenerationProgress(null);
    }
  }, [config, players, matches, setSchedule]);

  const reoptimizeSchedule = useCallback(async () => {
    if (!config || !schedule) {
      throw new Error('No schedule to reoptimize');
    }

    try {
      setLoading(true);
      setError(null);

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
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [config, players, matches, schedule, setSchedule]);

  return {
    schedule,
    loading,
    error,
    view,
    setView,
    generateSchedule,
    reoptimizeSchedule,
    loadSchedule: () => {}, // No-op for stateless (schedule is already in store)
    generationProgress,
  };
}
