/**
 * Smart Court Fill Utilities
 *
 * Detects free courts and suggests the best callable match to fill them.
 * Maintains schedule stability by not moving other matches.
 */
import type {
  MatchDTO,
  MatchStateDTO,
  ScheduleDTO,
  ScheduleAssignment,
  TournamentConfig,
} from '../api/dto';
import type { TrafficLightResult } from './trafficLight';

export interface FreeCourt {
  courtId: number;
  freeAtSlot: number; // Slot when the court became free
  lastMatch?: {
    matchId: string;
    matchLabel: string;
    finishedEarly: boolean; // True if finished before scheduled end
  };
}

export interface CourtFillSuggestion {
  court: FreeCourt;
  suggestedMatch: {
    matchId: string;
    matchLabel: string;
    players: string; // "Player A vs Player B"
    originalCourt: number;
    originalSlot: number;
    originalTime: string; // HH:mm
  };
  reason: string; // Why this match was chosen
}

/**
 * Find courts that are currently free (no active match)
 */
export function findFreeCourts(
  schedule: ScheduleDTO,
  matchStates: Record<string, MatchStateDTO>,
  matches: MatchDTO[],
  config: TournamentConfig,
  currentSlot: number,
  slotToTime: (slot: number) => string
): FreeCourt[] {
  const freeCourts: FreeCourt[] = [];
  const matchMap = new Map(matches.map((m) => [m.id, m]));

  for (let courtId = 1; courtId <= config.courtCount; courtId++) {
    // Get all assignments for this court
    const courtAssignments = schedule.assignments
      .filter((a) => a.courtId === courtId)
      .sort((a, b) => a.slotId - b.slotId);

    // Find the last finished or currently active match on this court
    let lastFinished: ScheduleAssignment | null = null;
    let hasActiveMatch = false;

    for (const assignment of courtAssignments) {
      const state = matchStates[assignment.matchId];

      if (state?.status === 'started') {
        // Court has an active match - not free
        hasActiveMatch = true;
        break;
      }

      if (state?.status === 'finished') {
        lastFinished = assignment;
      }
    }

    if (hasActiveMatch) continue;

    // Check if there's a scheduled match for this court that should have started
    const nextScheduled = courtAssignments.find((a) => {
      const state = matchStates[a.matchId];
      return !state || state.status === 'scheduled' || state.status === 'called';
    });

    // Court is free if:
    // 1. A match just finished, OR
    // 2. There's no upcoming match scheduled
    if (lastFinished) {
      const lastFinishedState = matchStates[lastFinished.matchId];
      const lastMatch = matchMap.get(lastFinished.matchId);

      // Calculate if it finished early
      const scheduledEndSlot = lastFinished.slotId + lastFinished.durationSlots;
      const finishedEarly = currentSlot < scheduledEndSlot;

      // Only show as free if:
      // - Match finished (any time), AND
      // - No match is currently being called on this court
      const noCalledMatch = !courtAssignments.some((a) => matchStates[a.matchId]?.status === 'called');

      if (noCalledMatch) {
        freeCourts.push({
          courtId,
          freeAtSlot: currentSlot,
          lastMatch: lastMatch ? {
            matchId: lastFinished.matchId,
            matchLabel: lastMatch.eventRank || `M${lastMatch.matchNumber || '?'}`,
            finishedEarly,
          } : undefined,
        });
      }
    }
  }

  return freeCourts;
}

/**
 * Find the best match to suggest for a free court
 *
 * Logic:
 * 1. Filter to only green (callable) matches
 * 2. Exclude matches already assigned to this court (they can be called normally)
 * 3. Exclude pinned matches (they should not be reassigned)
 * 4. Prefer matches scheduled earliest (to maintain tournament progress)
 */
export function suggestMatchForCourt(
  freeCourt: FreeCourt,
  schedule: ScheduleDTO,
  matches: MatchDTO[],
  matchStates: Record<string, MatchStateDTO>,
  trafficLights: Map<string, TrafficLightResult>,
  players: { id: string; name: string }[],
  slotToTime: (slot: number) => string
): CourtFillSuggestion | null {
  const matchMap = new Map(matches.map((m) => [m.id, m]));
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  // Get all unstarted matches that are NOT on this court
  const candidates = schedule.assignments
    .filter((a) => {
      const state = matchStates[a.matchId];
      // Not started or finished
      if (state?.status === 'started' || state?.status === 'finished') return false;
      // Not already on this court (they can be called normally via workflow)
      if (a.courtId === freeCourt.courtId) return false;
      // Not pinned (pinned matches should not be reassigned)
      if (state?.pinned) return false;
      // Must be green (callable)
      const light = trafficLights.get(a.matchId);
      if (!light || light.status !== 'green') return false;
      return true;
    })
    // Sort by scheduled time (earliest first)
    .sort((a, b) => a.slotId - b.slotId);

  if (candidates.length === 0) return null;

  // Pick the earliest green match
  const bestCandidate = candidates[0];
  const match = matchMap.get(bestCandidate.matchId);
  if (!match) return null;

  // Format player names
  const sideANames = (match.sideA || []).map((id) => playerMap.get(id) || id).join(' & ');
  const sideBNames = (match.sideB || []).map((id) => playerMap.get(id) || id).join(' & ');

  return {
    court: freeCourt,
    suggestedMatch: {
      matchId: bestCandidate.matchId,
      matchLabel: match.eventRank || `M${match.matchNumber || '?'}`,
      players: `${sideANames} vs ${sideBNames}`,
      originalCourt: bestCandidate.courtId,
      originalSlot: bestCandidate.slotId,
      originalTime: slotToTime(bestCandidate.slotId),
    },
    reason: freeCourt.lastMatch?.finishedEarly
      ? `${freeCourt.lastMatch.matchLabel} finished early`
      : 'Court is available',
  };
}

/**
 * Find all court fill suggestions
 */
export function findAllCourtFillSuggestions(
  schedule: ScheduleDTO,
  matches: MatchDTO[],
  matchStates: Record<string, MatchStateDTO>,
  trafficLights: Map<string, TrafficLightResult>,
  players: { id: string; name: string }[],
  config: TournamentConfig,
  currentSlot: number,
  slotToTime: (slot: number) => string
): CourtFillSuggestion[] {
  const freeCourts = findFreeCourts(
    schedule,
    matchStates,
    matches,
    config,
    currentSlot,
    slotToTime
  );

  const suggestions: CourtFillSuggestion[] = [];

  for (const court of freeCourts) {
    const suggestion = suggestMatchForCourt(
      court,
      schedule,
      matches,
      matchStates,
      trafficLights,
      players,
      slotToTime
    );

    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  return suggestions;
}
