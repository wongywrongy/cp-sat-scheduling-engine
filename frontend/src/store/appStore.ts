/**
 * Main application store using Zustand
 * Manages all app state with localStorage persistence
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  TournamentConfig,
  PlayerDTO,
  RosterGroupDTO,
  MatchDTO,
  ScheduleDTO,
  MatchStateDTO,
  LiveScheduleState,
  ScheduleAssignment,
  SolverProgressEvent,
} from '../api/dto';

// Stats from schedule generation (persists across page navigation)
interface ScheduleGenerationStats {
  elapsed: number;
  solutionCount?: number;
  objectiveScore?: number;
  bestBound?: number;
  assignments: ScheduleAssignment[];
}

// Solver log entry (persists across page navigation)
export interface SolverLogEntry {
  id: number;
  message: string;
  timestamp: number;
  type: 'info' | 'solution' | 'violation' | 'stats' | 'progress';
}

interface AppState {
  // Tournament Configuration
  config: TournamentConfig | null;
  setConfig: (config: TournamentConfig) => void;

  // Roster Groups (Schools)
  groups: RosterGroupDTO[];
  addGroup: (group: RosterGroupDTO) => void;
  updateGroup: (id: string, updates: Partial<RosterGroupDTO>) => void;
  deleteGroup: (id: string) => void;

  // Players
  players: PlayerDTO[];
  addPlayer: (player: PlayerDTO) => void;
  updatePlayer: (id: string, updates: Partial<PlayerDTO>) => void;
  deletePlayer: (id: string) => void;
  importPlayers: (players: PlayerDTO[]) => void;
  setPlayers: (players: PlayerDTO[]) => void;

  // Matches
  matches: MatchDTO[];
  addMatch: (match: MatchDTO) => void;
  updateMatch: (id: string, updates: Partial<MatchDTO>) => void;
  deleteMatch: (id: string) => void;
  importMatches: (matches: MatchDTO[]) => void;
  setMatches: (matches: MatchDTO[]) => void;

  // Schedule (not persisted - generated fresh each time)
  schedule: ScheduleDTO | null;
  setSchedule: (schedule: ScheduleDTO | null) => void;

  // Schedule generation stats (persists across page navigation, not to localStorage)
  scheduleStats: ScheduleGenerationStats | null;
  setScheduleStats: (stats: ScheduleGenerationStats | null) => void;

  // Generation state (persists across page navigation for tab switching)
  isGenerating: boolean;
  generationProgress: SolverProgressEvent | null;
  generationError: string | null;
  setIsGenerating: (generating: boolean) => void;
  setGenerationProgress: (progress: SolverProgressEvent | null) => void;
  setGenerationError: (error: string | null) => void;

  // Solver logs (persists across page navigation)
  solverLogs: SolverLogEntry[];
  addSolverLog: (message: string, type: SolverLogEntry['type']) => void;
  clearSolverLogs: () => void;

  // Schedule lock state (prevent accidental edits after generation)
  isScheduleLocked: boolean;
  lockSchedule: () => void;
  unlockSchedule: () => void;

  // Live Tracking (Match States) - NOT persisted to localStorage, managed via file
  matchStates: Record<string, MatchStateDTO>;
  liveState: LiveScheduleState | null;
  setMatchStates: (states: Record<string, MatchStateDTO>) => void;
  setMatchState: (matchId: string, state: MatchStateDTO) => void;
  setCurrentTime: (time: string) => void;
  setLastSynced: (time: string) => void;

  // Data management
  clearAllData: () => void;
  exportData: () => string;
  importData: (jsonData: string) => void;
}

const DEFAULT_CONFIG: TournamentConfig = {
  intervalMinutes: 15,
  dayStart: '09:00',
  dayEnd: '17:00',
  breaks: [],
  courtCount: 2,
  defaultRestMinutes: 30,
  freezeHorizonSlots: 0,
  rankCounts: { MS: 3, WS: 3, MD: 2, WD: 2, XD: 2 }, // Default: 3 singles each, 2 doubles each per school
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      config: DEFAULT_CONFIG,
      groups: [],
      players: [],
      matches: [],
      schedule: null,
      scheduleStats: null,
      isGenerating: false,
      generationProgress: null,
      generationError: null,
      solverLogs: [],
      isScheduleLocked: false,
      matchStates: {},
      liveState: null,

      // Config actions
      setConfig: (config) => set({ config, schedule: null, scheduleStats: null }), // Invalidate schedule when config changes

      // Group actions
      addGroup: (group) =>
        set((state) => ({ groups: [...state.groups, group] })),
      updateGroup: (id, updates) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        })),
      deleteGroup: (id) => {
        const state = get();
        const playersInGroup = state.players.filter(p => p.groupId === id);
        if (playersInGroup.length > 0) {
          throw new Error(`Cannot delete group: ${playersInGroup.length} players assigned. Remove players first.`);
        }
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
        }));
      },

      // Player actions
      addPlayer: (player) =>
        set((state) => ({ players: [...state.players, player], schedule: null })), // Invalidate schedule
      updatePlayer: (id, updates) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
          schedule: null, // Invalidate schedule
        })),
      deletePlayer: (id) =>
        set((state) => ({
          players: state.players.filter((p) => p.id !== id),
          schedule: null, // Invalidate schedule
        })),
      importPlayers: (players) => set({ players, schedule: null }), // Invalidate schedule
      setPlayers: (players) => set({ players, schedule: null }),

      // Match actions
      addMatch: (match) =>
        set((state) => {
          // Auto-assign match number if not provided
          const maxNumber = state.matches.reduce((max, m) => Math.max(max, m.matchNumber ?? 0), 0);
          const newMatch = match.matchNumber ? match : { ...match, matchNumber: maxNumber + 1 };
          return { matches: [...state.matches, newMatch], schedule: null };
        }), // Invalidate schedule
      updateMatch: (id, updates) =>
        set((state) => ({
          matches: state.matches.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
          schedule: null, // Invalidate schedule
        })),
      deleteMatch: (id) =>
        set((state) => ({
          matches: state.matches.filter((m) => m.id !== id),
          schedule: null, // Invalidate schedule
        })),
      importMatches: (matches) => {
        // Auto-assign match numbers to all imported matches
        const numberedMatches = matches.map((m, index) => ({
          ...m,
          matchNumber: m.matchNumber ?? index + 1,
        }));
        set({ matches: numberedMatches, schedule: null }); // Invalidate schedule
      },
      setMatches: (matches) => {
        // Auto-assign match numbers
        const numberedMatches = matches.map((m, index) => ({
          ...m,
          matchNumber: m.matchNumber ?? index + 1,
        }));
        set({ matches: numberedMatches, schedule: null });
      },

      // Schedule actions
      setSchedule: (schedule) => set({
        schedule,
        isScheduleLocked: schedule !== null, // Auto-lock when schedule is set
      }),
      setScheduleStats: (scheduleStats) => set({ scheduleStats }),

      // Generation state actions
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setGenerationProgress: (generationProgress) => set({ generationProgress }),
      setGenerationError: (generationError) => set({ generationError }),

      // Solver logs actions
      addSolverLog: (message, type) => set((state) => {
        const newId = state.solverLogs.length > 0
          ? Math.max(...state.solverLogs.map(l => l.id)) + 1
          : 1;
        const newLog: SolverLogEntry = { id: newId, message, timestamp: Date.now(), type };
        // Keep last 50 logs
        return { solverLogs: [...state.solverLogs.slice(-49), newLog] };
      }),
      clearSolverLogs: () => set({ solverLogs: [] }),

      // Lock actions
      lockSchedule: () => set({ isScheduleLocked: true }),
      unlockSchedule: () => set({
        isScheduleLocked: false,
        schedule: null,
        scheduleStats: null,
      }),

      // Live Tracking (Match States) actions
      setMatchStates: (matchStates) => {
        const now = new Date().toISOString();
        set({
          matchStates,
          liveState: {
            currentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            matchStates,
            lastSynced: now,
          },
        });
      },
      setMatchState: (matchId, state) =>
        set((prev) => {
          const newMatchStates = { ...prev.matchStates, [matchId]: state };
          const now = new Date().toISOString();
          return {
            matchStates: newMatchStates,
            liveState: {
              currentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
              matchStates: newMatchStates,
              lastSynced: now,
            },
          };
        }),
      setCurrentTime: (time) =>
        set((state) => ({
          liveState: state.liveState ? { ...state.liveState, currentTime: time } : null,
        })),
      setLastSynced: (time) =>
        set((state) => ({
          liveState: state.liveState ? { ...state.liveState, lastSynced: time } : null,
        })),

      // Data management
      clearAllData: () =>
        set({
          config: DEFAULT_CONFIG,
          groups: [],
          players: [],
          matches: [],
          schedule: null,
        }),

      exportData: () => {
        const state = get();
        return JSON.stringify({
          config: state.config,
          groups: state.groups,
          players: state.players,
          matches: state.matches,
        }, null, 2);
      },

      importData: (jsonData) => {
        try {
          const data = JSON.parse(jsonData);
          set({
            config: data.config || DEFAULT_CONFIG,
            groups: data.groups || [],
            players: data.players || [],
            matches: data.matches || [],
            schedule: null, // Clear schedule on import
          });
        } catch (error) {
          console.error('Failed to import data:', error);
          throw new Error('Invalid JSON data');
        }
      },
    }),
    {
      name: 'scheduler-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields (not schedule)
        config: state.config,
        groups: state.groups,
        players: state.players,
        matches: state.matches,
      }),
    }
  )
);
