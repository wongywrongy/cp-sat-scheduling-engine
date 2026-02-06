/**
 * Hook for managing Smart Court Fill suggestions
 *
 * Detects free courts and computes suggestions, tracking which courts
 * the director has skipped.
 */
import { useMemo, useState, useCallback } from 'react';
import type {
  MatchDTO,
  MatchStateDTO,
  PlayerDTO,
  ScheduleDTO,
  TournamentConfig,
} from '../api/dto';
import type { TrafficLightResult } from '../utils/trafficLight';
import type { CourtFillSuggestion } from '../utils/courtFill';
import { findAllCourtFillSuggestions } from '../utils/courtFill';

interface UseCourtFillSuggestionsParams {
  schedule: ScheduleDTO | null;
  matches: MatchDTO[];
  matchStates: Record<string, MatchStateDTO>;
  trafficLights: Map<string, TrafficLightResult>;
  players: PlayerDTO[];
  config: TournamentConfig | null;
  currentSlot: number;
  slotToTime: (slot: number) => string;
}

interface UseCourtFillSuggestionsResult {
  suggestions: CourtFillSuggestion[];
  skippedCourts: Set<number>;
  skipCourt: (courtId: number) => void;
  resetSkipped: () => void;
}

export function useCourtFillSuggestions({
  schedule,
  matches,
  matchStates,
  trafficLights,
  players,
  config,
  currentSlot,
  slotToTime,
}: UseCourtFillSuggestionsParams): UseCourtFillSuggestionsResult {
  // Track which courts have been skipped (reset when match states change significantly)
  const [skippedCourts, setSkippedCourts] = useState<Set<number>>(new Set());

  // Compute suggestions
  const suggestions = useMemo(() => {
    if (!schedule || !config) return [];

    return findAllCourtFillSuggestions(
      schedule,
      matches,
      matchStates,
      trafficLights,
      players,
      config,
      currentSlot,
      slotToTime
    );
  }, [schedule, matches, matchStates, trafficLights, players, config, currentSlot, slotToTime]);

  // Skip a court (don't show suggestion until state changes)
  const skipCourt = useCallback((courtId: number) => {
    setSkippedCourts((prev) => new Set([...prev, courtId]));
  }, []);

  // Reset all skipped courts
  const resetSkipped = useCallback(() => {
    setSkippedCourts(new Set());
  }, []);

  return {
    suggestions,
    skippedCourts,
    skipCourt,
    resetSkipped,
  };
}
