/**
 * Data Transfer Objects (DTOs) - Single source of truth for API requests/responses
 * These types match the backend API contract exactly.
 */

// Tournament Configuration
export interface TournamentConfig {
  intervalMinutes: number;
  dayStart: string; // HH:mm format
  dayEnd: string; // HH:mm format
  tournamentDate?: string; // ISO date string: "2026-02-15"
  breaks: BreakWindow[];
  courtCount: number;
  defaultRestMinutes: number;
  freezeHorizonSlots: number;
  rankCounts?: Record<string, number>; // {"MS": 3, "WS": 3, "MD": 2, "WD": 4, "XD": 2}
  enableCourtUtilization?: boolean;
  courtUtilizationPenalty?: number;
}

export interface BreakWindow {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export interface TournamentConfigDTO {
  intervalMinutes: number;
  dayStart: string;
  dayEnd: string;
  tournamentDate?: string; // ISO date string: "2026-02-15"
  breaks: BreakWindow[];
  courtCount: number;
  defaultRestMinutes: number;
  freezeHorizonSlots: number;
  rankCounts?: Record<string, number>;
  enableCourtUtilization?: boolean;
  courtUtilizationPenalty?: number;
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
  matchId: string;
  status: 'scheduled' | 'called' | 'started' | 'finished';
  actualStartTime?: string;
  actualEndTime?: string;
  score?: {
    sideA: number;
    sideB: number;
  };
  notes?: string;
  updatedAt?: string;
}

export interface LiveScheduleState {
  currentTime: string;
  matchStates: Record<string, MatchStateDTO>;
  lastSynced: string;
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
  id: string; // Auto-generated UUID
  name: string;
  groupId: string; // School group ID (REQUIRED - this is school vs school scheduling)
  ranks?: string[]; // [MS1, MD1, XD1] - Player can play multiple events
  availability: AvailabilityWindow[];
  minRestMinutes?: number | null; // If not provided, uses tournament config's defaultRestMinutes
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

// Tournament Export/Import (Complete tournament data - v2.0 format)
export interface TournamentExportV2 {
  version: '2.0';
  exportedAt: string; // ISO timestamp
  config: TournamentConfig;
  players: PlayerDTO[];
  matches: MatchDTO[];
  schedule?: ScheduleDTO;
  matchStates?: Record<string, MatchStateDTO>;
}

// Solver Progress (for real-time optimization visualization)
export interface SolverProgressEvent {
  elapsed_ms: number;
  current_objective?: number;
  best_bound?: number;
  solution_count?: number;
  current_assignments?: ScheduleAssignment[];
}

// Constraint Visualization Types
export interface ConstraintViolation {
  type: 'rest' | 'overlap' | 'availability' | 'court_capacity';
  severity: 'hard' | 'soft';
  playerIds: string[];
  matchIds: string[];
  description: string;
}

export interface GraphNode {
  id: string;
  name: string;
  groupId: string;
  matchCount: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  matchId: string;
  status: 'conflict' | 'resolved' | 'soft_violation';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

