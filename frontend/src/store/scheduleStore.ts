import { create } from 'zustand';
import type {
  ScheduleResponse,
  PlayerInput,
  MatchInput,
  ScheduleConfig,
  SolverOptions,
  PreviousAssignment,
} from '../types/schedule';

interface ScheduleState {
  // Input data
  players: PlayerInput[];
  matches: MatchInput[];
  config: ScheduleConfig | null;
  solverOptions: SolverOptions | null;
  
  // Schedule result
  scheduleResponse: ScheduleResponse | null;
  
  // Court order (for display)
  courtOrder: number[];
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setPlayers: (players: PlayerInput[]) => void;
  addPlayer: (player: PlayerInput) => void;
  updatePlayer: (id: string, player: Partial<PlayerInput>) => void;
  removePlayer: (id: string) => void;
  
  setMatches: (matches: MatchInput[]) => void;
  addMatch: (match: MatchInput) => void;
  updateMatch: (id: string, match: Partial<MatchInput>) => void;
  removeMatch: (id: string) => void;
  
  setConfig: (config: ScheduleConfig) => void;
  setSolverOptions: (options: SolverOptions) => void;
  
  setScheduleResponse: (response: ScheduleResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  setCourtOrder: (order: number[]) => void;
  reorderCourt: (fromIndex: number, toIndex: number) => void;
  
  // Helper to get previous assignments from current schedule
  getPreviousAssignments: () => PreviousAssignment[];
  
  // Reset state
  reset: () => void;
}

const defaultConfig: ScheduleConfig = {
  totalSlots: 20,
  courtCount: 4,
  intervalMinutes: 30,
  defaultRestSlots: 1,
  freezeHorizonSlots: 0,
  currentSlot: 0,
  softRestEnabled: false,
  disruptionPenalty: 1.0,
  lateFinishPenalty: 0.5,
  courtChangePenalty: 0.5,
};

const defaultSolverOptions: SolverOptions = {
  timeLimitSeconds: 5.0,
  numWorkers: 4,
  logProgress: false,
};

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  players: [],
  matches: [],
  config: defaultConfig,
  solverOptions: defaultSolverOptions,
  scheduleResponse: null,
  courtOrder: Array.from({ length: defaultConfig.courtCount }, (_, i) => i + 1),
  isLoading: false,
  error: null,

  setPlayers: (players) => set({ players }),
  
  addPlayer: (player) => set((state) => ({
    players: [...state.players, player],
  })),
  
  updatePlayer: (id, updates) => set((state) => ({
    players: state.players.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),
  
  removePlayer: (id) => set((state) => ({
    players: state.players.filter((p) => p.id !== id),
  })),

  setMatches: (matches) => set({ matches }),
  
  addMatch: (match) => set((state) => ({
    matches: [...state.matches, match],
  })),
  
  updateMatch: (id, updates) => set((state) => ({
    matches: state.matches.map((m) =>
      m.id === id ? { ...m, ...updates } : m
    ),
  })),
  
  removeMatch: (id) => set((state) => ({
    matches: state.matches.filter((m) => m.id !== id),
  })),

  setConfig: (config) => {
    set({ config });
    // Update court order when court count changes
    const currentOrder = get().courtOrder;
    const newCourtCount = config.courtCount;
    if (currentOrder.length !== newCourtCount) {
      set({ courtOrder: Array.from({ length: newCourtCount }, (_, i) => i + 1) });
    }
  },
  
  setSolverOptions: (options) => set({ solverOptions: options }),

  setScheduleResponse: (response) => set({ scheduleResponse: response }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),

  setCourtOrder: (order) => set({ courtOrder: order }),
  
  reorderCourt: (fromIndex, toIndex) => set((state) => {
    const newOrder = [...state.courtOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    return { courtOrder: newOrder };
  }),

  getPreviousAssignments: () => {
    const response = get().scheduleResponse;
    if (!response) return [];
    
    return response.assignments.map((assignment) => ({
      matchId: assignment.matchId,
      slotId: assignment.slotId,
      courtId: assignment.courtId,
      locked: false,
      pinnedSlotId: null,
      pinnedCourtId: null,
    }));
  },

  reset: () => set({
    players: [],
    matches: [],
    config: defaultConfig,
    solverOptions: defaultSolverOptions,
    scheduleResponse: null,
    courtOrder: [],
    isLoading: false,
    error: null,
  }),
}));
