/**
 * Time utility functions for live tracking
 */
import type { TournamentConfig, ScheduleAssignment, MatchStateDTO } from '../api/dto';

/**
 * Get current time in HH:mm format
 */
export function getCurrentTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Calculate current slot based on tournament config and current time
 */
export function getCurrentSlot(config: TournamentConfig | null): number {
  if (!config) return 0;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = config.dayStart.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;

  const elapsedMinutes = currentMinutes - startMinutes;
  const slot = Math.floor(elapsedMinutes / config.intervalMinutes);

  return Math.max(0, slot);
}

/**
 * Format slot ID to HH:mm time
 */
export function formatSlotTime(slotId: number, config: TournamentConfig): string {
  const [startHour, startMin] = config.dayStart.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;

  const slotMinutes = startMinutes + (slotId * config.intervalMinutes);
  const hours = Math.floor(slotMinutes / 60);
  const minutes = slotMinutes % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Format slot range (start to end) as time range
 */
export function formatSlotRange(slotId: number, durationSlots: number, config: TournamentConfig): string {
  const startTime = formatSlotTime(slotId, config);
  const endTime = formatSlotTime(slotId + durationSlots, config);
  return `${startTime} - ${endTime}`;
}

/**
 * Check if a match is currently in progress
 */
export function isMatchInProgress(
  assignment: ScheduleAssignment,
  matchState: MatchStateDTO | undefined,
  currentSlot: number
): boolean {
  // If explicitly marked as started, it's in progress
  if (matchState?.status === 'started') {
    return true;
  }

  // If finished or called, not in progress
  if (matchState?.status === 'finished' || matchState?.status === 'called') {
    return false;
  }

  // Otherwise, check if current time is within the scheduled slot range
  const matchStartSlot = assignment.slotId;
  const matchEndSlot = assignment.slotId + assignment.durationSlots;

  return currentSlot >= matchStartSlot && currentSlot < matchEndSlot;
}

/**
 * Get upcoming matches (next N matches after current slot)
 */
export function getUpcomingMatches(
  schedule: { assignments: ScheduleAssignment[] } | null,
  currentSlot: number,
  limit: number = 5
): ScheduleAssignment[] {
  if (!schedule) return [];

  return schedule.assignments
    .filter(a => a.slotId >= currentSlot)
    .sort((a, b) => a.slotId - b.slotId)
    .slice(0, limit);
}

/**
 * Get recently finished matches (last N finished matches)
 */
export function getRecentlyFinished(
  matchStates: Record<string, MatchStateDTO>,
  limit: number = 5
): MatchStateDTO[] {
  return Object.values(matchStates)
    .filter(state => state.status === 'finished')
    .sort((a, b) => {
      // Sort by updated time, most recent first
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, limit);
}

/**
 * Parse time string (HH:mm) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: MatchStateDTO['status']): string {
  switch (status) {
    case 'scheduled':
      return 'bg-gray-200 text-gray-700';
    case 'called':
      return 'bg-blue-200 text-blue-800';
    case 'started':
      return 'bg-green-200 text-green-800';
    case 'finished':
      return 'bg-purple-200 text-purple-800';
    default:
      return 'bg-gray-200 text-gray-700';
  }
}
