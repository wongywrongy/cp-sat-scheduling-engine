/**
 * Data Transfer Objects (DTOs) - Single source of truth for API requests/responses
 * These types match the backend API contract exactly.
 */

// Tournament Configuration
export interface TournamentConfig {
  intervalMinutes: number;
  dayStart: string; // HH:mm format
  dayEnd: string; // HH:mm format
  breaks: BreakWindow[];
  courtCount: number;
  defaultRestMinutes: number;
  freezeHorizonSlots: number;
}

export interface BreakWindow {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export interface TournamentConfigDTO {
  intervalMinutes: number;
  dayStart: string;
  dayEnd: string;
  breaks: BreakWindow[];
  courtCount: number;
  defaultRestMinutes: number;
  freezeHorizonSlots: number;
}

// Schedule Views
export type ScheduleView = 'timeslot' | 'court';

// Schedule
export interface ScheduleDTO {
  assignments: ScheduleAssignment[];
  unscheduledMatches: string[];
  softViolations: SoftViolation[];
  objectiveScore: number | null;
  infeasibleReasons: string[];
  status: 'optimal' | 'feasible' | 'infeasible' | 'unknown';
}

export interface ScheduleAssignment {
  matchId: string;
  slotId: number;
  courtId: number;
  durationSlots: number;
}

export interface SoftViolation {
  type: string;
  matchId?: string | null;
  playerId?: string | null;
  description: string;
  penaltyIncurred: number;
}

// Match State (for Match Desk operations)
export interface MatchStateDTO {
  status: 'scheduled' | 'called' | 'started' | 'finished';
  score?: {
    sideA: number;
    sideB: number;
  };
}

// Roster Group (for school grouping)
export interface RosterGroupDTO {
  id: string;
  name: string;
  metadata?: {
    description?: string;
    color?: string;
    [key: string]: any;
  };
}

// Player
export interface PlayerDTO {
  id: string;
  name: string;
  groupId?: string | null; // School group ID
  rank?: string | null; // MS1, MS2, WS1, WS2, MD1, WD1, XD1, etc.
  availability: AvailabilityWindow[];
  minRestMinutes: number;
  notes?: string;
}

export interface AvailabilityWindow {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export interface RosterImportDTO {
  csv: string; // CSV content
}

// Match - simplified for school sparring (supports dual and tri-meets)
export interface MatchDTO {
  id: string;
  sideA: string[]; // Player IDs (School A)
  sideB: string[]; // Player IDs (School B)
  sideC?: string[]; // Player IDs (School C) - for tri-meets
  matchType?: 'dual' | 'tri'; // Match type
  eventRank?: string | null; // MS1, MS2, WS1, WS2, etc. - the rank/event this match represents
  durationSlots: number;
  preferredCourt?: number | null;
  tags?: string[]; // Optional tags like ['School A', 'School B']
}

export interface MatchesImportDTO {
  csv: string; // CSV content
}

