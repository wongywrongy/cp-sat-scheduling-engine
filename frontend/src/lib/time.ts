/**
 * Time and slot formatting utilities
 */

/**
 * Convert slot index to human-readable time string
 * @param slotId - Zero-based slot index
 * @param dayStart - Start time in HH:mm format
 * @param intervalMinutes - Minutes per slot
 * @returns Time string in HH:mm format
 */
export function slotToTime(slotId: number, dayStart: string, intervalMinutes: number): string {
  const [startHour, startMinute] = dayStart.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const slotMinutes = slotId * intervalMinutes;
  const totalMinutes = startMinutes + slotMinutes;
  
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Format time range for a slot
 * @param slotId - Zero-based slot index
 * @param durationSlots - Number of slots the match occupies
 * @param dayStart - Start time in HH:mm format
 * @param intervalMinutes - Minutes per slot
 * @returns Time range string like "09:00 - 09:30"
 */
export function formatSlotRange(
  slotId: number,
  durationSlots: number,
  dayStart: string,
  intervalMinutes: number
): string {
  const startTime = slotToTime(slotId, dayStart, intervalMinutes);
  const endSlotId = slotId + durationSlots;
  const endTime = slotToTime(endSlotId, dayStart, intervalMinutes);
  return `${startTime} - ${endTime}`;
}

/**
 * Parse HH:mm time string to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to HH:mm
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Check if a time string is valid HH:mm format
 */
export function isValidTime(time: string): boolean {
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}
