/**
 * Hook for live operations - manages actual times, impact analysis, and re-optimization
 * Used for real-time tournament management where matches may run longer than scheduled
 */
import { useCallback, useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../api/client';
import type { MatchStateDTO, ScheduleAssignment, TournamentConfig } from '../api/dto';

export interface ImpactAnalysis {
  matchId: string;
  matchNumber?: number;
  overrunSlots: number;
  actualEndSlot: number;
  scheduledEndSlot: number;
  directlyImpacted: string[]; // Match IDs that share players
  cascadeImpacted: string[]; // Matches impacted by the directly impacted
  suggestedAction: 'none' | 'wait' | 'reoptimize' | 'manual_adjust';
}

/**
 * Convert HH:mm time string to slot number
 * Handles overnight schedules (e.g., 10pm to 6am)
 */
function timeToSlot(time: string, config: TournamentConfig): number {
  const [startHours, startMins] = config.dayStart.split(':').map(Number);
  const [endHours, endMins] = config.dayEnd.split(':').map(Number);
  const [hours, mins] = time.split(':').map(Number);

  const startMinutes = startHours * 60 + startMins;
  const endMinutes = endHours * 60 + endMins;
  let timeMinutes = hours * 60 + mins;

  // Check if this is an overnight schedule
  const isOvernight = endMinutes <= startMinutes;

  // If overnight and time is before start (e.g., 2am when start is 10pm),
  // add 24 hours to treat it as part of the overnight period
  if (isOvernight && timeMinutes < startMinutes) {
    timeMinutes += 24 * 60;
  }

  return Math.floor((timeMinutes - startMinutes) / config.intervalMinutes);
}

/**
 * Convert slot number to HH:mm time string
 * Handles overnight schedules by wrapping hours past midnight
 */
function slotToTime(slot: number, config: TournamentConfig): string {
  const [startHours, startMins] = config.dayStart.split(':').map(Number);
  const startMinutes = startHours * 60 + startMins;
  const slotMinutes = startMinutes + slot * config.intervalMinutes;
  // Wrap around midnight (1440 minutes = 24 hours)
  const normalizedMinutes = slotMinutes % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function useLiveOperations() {
  const schedule = useAppStore((state) => state.schedule);
  const config = useAppStore((state) => state.config);
  const matches = useAppStore((state) => state.matches);
  const players = useAppStore((state) => state.players);
  const matchStates = useAppStore((state) => state.matchStates);
  const setMatchState = useAppStore((state) => state.setMatchState);
  const setSchedule = useAppStore((state) => state.setSchedule);

  const [isReoptimizing, setIsReoptimizing] = useState(false);
  const [reoptimizeError, setReoptimizeError] = useState<string | null>(null);

  // Calculate overrun matches (actual end > scheduled end)
  const overrunMatches = useMemo(() => {
    if (!schedule || !config) return [];

    return schedule.assignments.filter((assignment) => {
      const state = matchStates[assignment.matchId];
      if (!state?.actualEndTime) return false;

      const scheduledEnd = assignment.slotId + assignment.durationSlots;
      const actualEndSlot = timeToSlot(state.actualEndTime, config);

      return actualEndSlot > scheduledEnd;
    });
  }, [schedule, matchStates, config]);

  // Get all player IDs from a match
  const getMatchPlayerIds = useCallback((matchId: string): string[] => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return [];
    const playerIds: string[] = [];
    if (match.sideA) playerIds.push(...match.sideA);
    if (match.sideB) playerIds.push(...match.sideB);
    if (match.sideC) playerIds.push(...match.sideC);
    return playerIds;
  }, [matches]);

  // Calculate impacted matches (matches affected by overruns)
  // Only scheduled matches can be impacted - started/finished matches are already in progress or done
  const impactedMatches = useMemo(() => {
    if (!schedule || overrunMatches.length === 0 || !config) return [];

    const impacted = new Set<string>();

    for (const overrun of overrunMatches) {
      const overrunPlayers = getMatchPlayerIds(overrun.matchId);
      const state = matchStates[overrun.matchId];
      const actualEndSlot = state?.actualEndTime
        ? timeToSlot(state.actualEndTime, config)
        : overrun.slotId + overrun.durationSlots;

      // Find matches with same players scheduled after the overrun
      for (const assignment of schedule.assignments) {
        if (assignment.matchId === overrun.matchId) continue;

        // Only scheduled matches can be impacted (not started/finished/called)
        const assignmentState = matchStates[assignment.matchId];
        if (assignmentState && assignmentState.status !== 'scheduled') continue;

        // Only future matches
        if (assignment.slotId < actualEndSlot) continue;

        const matchPlayers = getMatchPlayerIds(assignment.matchId);
        const hasOverlap = matchPlayers.some((p) => overrunPlayers.includes(p));

        if (hasOverlap) {
          impacted.add(assignment.matchId);
        }
      }
    }

    return schedule.assignments.filter((a) => impacted.has(a.matchId));
  }, [schedule, overrunMatches, matchStates, config, getMatchPlayerIds]);

  // Analyze impact for a specific match
  const analyzeImpact = useCallback(
    (matchId: string): ImpactAnalysis | null => {
      if (!schedule || !config) return null;

      const assignment = schedule.assignments.find((a) => a.matchId === matchId);
      if (!assignment) return null;

      const match = matches.find((m) => m.id === matchId);
      const state = matchStates[matchId];

      const scheduledEndSlot = assignment.slotId + assignment.durationSlots;
      const actualEndSlot = state?.actualEndTime
        ? timeToSlot(state.actualEndTime, config)
        : scheduledEndSlot;

      const overrunSlots = Math.max(0, actualEndSlot - scheduledEndSlot);

      // Find directly impacted matches
      // Only scheduled matches can be impacted - started/finished/called matches are already committed
      const matchPlayers = getMatchPlayerIds(matchId);
      const directlyImpacted: string[] = [];
      const cascadeImpacted: string[] = [];

      for (const a of schedule.assignments) {
        if (a.matchId === matchId) continue;

        // Only scheduled matches can be impacted
        const aState = matchStates[a.matchId];
        if (aState && aState.status !== 'scheduled') continue;

        if (a.slotId < actualEndSlot) continue;

        const aPlayers = getMatchPlayerIds(a.matchId);
        const hasOverlap = aPlayers.some((p) => matchPlayers.includes(p));

        if (hasOverlap) {
          directlyImpacted.push(a.matchId);
        }
      }

      // Suggest action based on impact
      let suggestedAction: ImpactAnalysis['suggestedAction'] = 'none';
      if (overrunSlots > 0) {
        if (directlyImpacted.length === 0) {
          suggestedAction = 'wait'; // No impact, just wait
        } else if (directlyImpacted.length <= 2) {
          suggestedAction = 'manual_adjust'; // Small impact, manual adjustment
        } else {
          suggestedAction = 'reoptimize'; // Large impact, need reoptimization
        }
      }

      return {
        matchId,
        matchNumber: match?.matchNumber,
        overrunSlots,
        actualEndSlot,
        scheduledEndSlot,
        directlyImpacted,
        cascadeImpacted,
        suggestedAction,
      };
    },
    [schedule, config, matches, matchStates, getMatchPlayerIds]
  );

  // Update actual time for a match
  const updateActualTime = useCallback(
    async (matchId: string, field: 'actualStartTime' | 'actualEndTime', time: string) => {
      const current = matchStates[matchId] || { matchId, status: 'scheduled' as const };
      const updated: MatchStateDTO = {
        ...current,
        [field]: time,
      };

      // Update local state immediately
      setMatchState(matchId, updated);

      // Sync to backend
      try {
        await apiClient.updateMatchState(matchId, updated);
      } catch (err) {
        console.error('Failed to sync match state:', err);
      }
    },
    [matchStates, setMatchState]
  );

  // Trigger re-optimization with frozen horizon
  const triggerReoptimize = useCallback(async () => {
    if (!config || !schedule) return;

    setIsReoptimizing(true);
    setReoptimizeError(null);

    try {
      // Freeze assignments for in-progress and finished matches
      const frozenAssignments = schedule.assignments.filter((a) => {
        const state = matchStates[a.matchId];
        return state?.status === 'started' || state?.status === 'finished';
      });

      const result = await apiClient.generateSchedule({
        config: {
          ...config,
          freezeHorizonSlots: Math.max(config.freezeHorizonSlots, 2),
        },
        players,
        matches,
        previousAssignments: frozenAssignments.map((a) => ({
          matchId: a.matchId,
          slotId: a.slotId,
          courtId: a.courtId,
          locked: true,
        })),
      });

      setSchedule(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Re-optimization failed';
      setReoptimizeError(message);
    } finally {
      setIsReoptimizing(false);
    }
  }, [config, schedule, matches, players, matchStates, setSchedule]);

  // Helper to get current slot based on time (handles overnight schedules)
  const getCurrentSlot = useCallback((): number => {
    if (!config) return 0;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const slot = timeToSlot(timeStr, config);
    return Math.max(0, slot);
  }, [config]);

  return {
    schedule,
    config,
    matches,
    matchStates,
    impactedMatches,
    overrunMatches,
    analyzeImpact,
    triggerReoptimize,
    updateActualTime,
    isReoptimizing,
    reoptimizeError,
    getCurrentSlot,
    timeToSlot: (time: string) => config ? timeToSlot(time, config) : 0,
    slotToTime: (slot: number) => config ? slotToTime(slot, config) : '00:00',
  };
}
