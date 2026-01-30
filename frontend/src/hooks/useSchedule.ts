import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { ScheduleDTO, ScheduleView } from '../api/dto';

const DEFAULT_TOURNAMENT_ID = 'default';

export function useSchedule(tournamentId: string = DEFAULT_TOURNAMENT_ID) {
  const [schedule, setSchedule] = useState<ScheduleDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ScheduleView>('timeslot');

  const generateSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.generateSchedule(tournamentId);
      setSchedule(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate schedule');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const reoptimizeSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.reoptimizeSchedule(tournamentId);
      setSchedule(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reoptimize schedule');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const loadSchedule = useCallback(async (scheduleView: ScheduleView = view) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.getSchedule(tournamentId, scheduleView);
      setSchedule(result);
      setView(scheduleView);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [tournamentId, view]);

  return {
    schedule,
    loading,
    error,
    view,
    setView,
    generateSchedule,
    reoptimizeSchedule,
    loadSchedule,
  };
}
