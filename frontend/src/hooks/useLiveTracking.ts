/**
 * Hook for live tracking page logic
 * Manages match state fetching, updating, and grouping for the live tracking interface
 *
 * Match State Machine:
 *   scheduled → called → started → finished
 *       ↓         ↓         ↓          ↓
 *    (delay)   (undo)    (undo)     (undo)
 *       ↓         ↓         ↓          ↓
 *   scheduled  scheduled  called    started
 */
import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../api/client';
import type { MatchStateDTO } from '../api/dto';

/**
 * Valid state transitions for match state machine
 * Key = current status, Value = array of valid next statuses
 */
const VALID_TRANSITIONS: Record<MatchStateDTO['status'], MatchStateDTO['status'][]> = {
  scheduled: ['called', 'scheduled'], // can call or delay (stays scheduled)
  called: ['started', 'scheduled'],    // can start or undo to scheduled
  started: ['finished', 'called'],     // can finish or undo to called
  finished: ['started'],               // can only undo to started
};

/**
 * Validate if a state transition is allowed
 */
function isValidTransition(
  currentStatus: MatchStateDTO['status'],
  newStatus: MatchStateDTO['status']
): boolean {
  const validNextStates = VALID_TRANSITIONS[currentStatus];
  return validNextStates.includes(newStatus);
}

export function useLiveTracking() {
  const schedule = useAppStore((state) => state.schedule);
  const config = useAppStore((state) => state.config);
  const matches = useAppStore((state) => state.matches);
  const matchStates = useAppStore((state) => state.matchStates);
  const liveState = useAppStore((state) => state.liveState);
  const setMatchStates = useAppStore((state) => state.setMatchStates);
  const setMatchState = useAppStore((state) => state.setMatchState);
  const setCurrentTime = useAppStore((state) => state.setCurrentTime);
  const setLastSynced = useAppStore((state) => state.setLastSynced);

  // Load match states from file on mount
  useEffect(() => {
    loadMatchStates();
  }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      syncMatchStates();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      setCurrentTime(now);
    }, 1000);

    return () => clearInterval(interval);
  }, [setCurrentTime]);

  const loadMatchStates = useCallback(async () => {
    try {
      const states = await apiClient.getMatchStates();
      setMatchStates(states);
    } catch (error) {
      console.error('Failed to load match states:', error);
    }
  }, [setMatchStates]);

  const syncMatchStates = useCallback(async () => {
    try {
      const states = await apiClient.getMatchStates();
      setMatchStates(states);
      setLastSynced(new Date().toISOString());
    } catch (error) {
      console.error('Failed to sync match states:', error);
    }
  }, [setMatchStates, setLastSynced]);

  const updateMatchStatus = useCallback(async (
    matchId: string,
    status: MatchStateDTO['status'],
    additionalData?: Partial<MatchStateDTO>
  ) => {
    try {
      const currentState = matchStates[matchId] || { matchId, status: 'scheduled' };
      const currentStatus = currentState.status || 'scheduled';

      // Validate state transition
      if (!isValidTransition(currentStatus, status)) {
        console.warn(`Invalid state transition: ${currentStatus} → ${status} for match ${matchId}`);
        throw new Error(`Invalid state transition: cannot go from '${currentStatus}' to '${status}'`);
      }

      const now = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const updates: Partial<MatchStateDTO> = {
        ...currentState,
        status,
        ...additionalData,
      };

      // Set timestamps based on status transitions
      if (status === 'started' && !currentState.actualStartTime) {
        updates.actualStartTime = now;
      }
      if (status === 'finished' && !currentState.actualEndTime) {
        updates.actualEndTime = now;
      }

      const updated = await apiClient.updateMatchState(matchId, updates);
      setMatchState(matchId, updated);
    } catch (error) {
      console.error('Failed to update match status:', error);
      throw error;
    }
  }, [matchStates, setMatchState]);

  const setMatchScore = useCallback(async (
    matchId: string,
    score: { sideA: number; sideB: number },
    notes?: string
  ) => {
    try {
      const updated = await apiClient.updateMatchState(matchId, {
        matchId,
        status: 'finished',
        score,
        notes,
        actualEndTime: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
      });
      setMatchState(matchId, updated);
    } catch (error) {
      console.error('Failed to set match score:', error);
      throw error;
    }
  }, [setMatchState]);

  const exportStates = useCallback(async () => {
    try {
      const blob = await apiClient.exportMatchStates();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tournament_state.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export match states:', error);
      throw error;
    }
  }, []);

  const importStates = useCallback(async (file: File) => {
    try {
      const result = await apiClient.importMatchStates(file);
      await loadMatchStates(); // Reload after import
      return result;
    } catch (error) {
      console.error('Failed to import match states:', error);
      throw error;
    }
  }, [loadMatchStates]);

  const resetStates = useCallback(async () => {
    try {
      await apiClient.resetMatchStates();
      setMatchStates({});
    } catch (error) {
      console.error('Failed to reset match states:', error);
      throw error;
    }
  }, [setMatchStates]);

  // Calculate progress stats
  const progressStats = {
    total: schedule?.assignments.length || 0,
    finished: Object.values(matchStates).filter(s => s.status === 'finished').length,
    inProgress: Object.values(matchStates).filter(s => s.status === 'started').length,
    get remaining() {
      return this.total - this.finished;
    },
    get percentage() {
      return this.total > 0 ? Math.round((this.finished / this.total) * 100) : 0;
    },
  };

  // Group matches by status
  const matchesByStatus = {
    scheduled: schedule?.assignments.filter(a => !matchStates[a.matchId] || matchStates[a.matchId].status === 'scheduled') || [],
    called: schedule?.assignments.filter(a => matchStates[a.matchId]?.status === 'called') || [],
    started: schedule?.assignments.filter(a => matchStates[a.matchId]?.status === 'started') || [],
    finished: schedule?.assignments.filter(a => matchStates[a.matchId]?.status === 'finished') || [],
  };

  return {
    schedule,
    config,
    matches,
    matchStates,
    liveState,
    progressStats,
    matchesByStatus,
    updateMatchStatus,
    setMatchScore,
    exportStates,
    importStates,
    resetStates,
    syncMatchStates,
    isLoading: false, // TODO: Add loading state if needed
  };
}
