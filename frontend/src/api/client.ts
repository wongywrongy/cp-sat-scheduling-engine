import axios, { type AxiosInstance } from 'axios';
import type {
  TournamentConfig,
  TournamentConfigDTO,
  ScheduleView,
  ScheduleDTO,
  MatchStateDTO,
  PlayerDTO,
  RosterGroupDTO,
  MatchDTO,
  RosterImportDTO,
  MatchesImportDTO,
} from './dto';

// Use /api proxy in dev, or explicit URL in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? '/api' : 'http://localhost:8000');

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5 minutes for large schedules
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const message = error.response.data?.detail || error.response.data?.message || 'An error occurred';
          throw new Error(message);
        } else if (error.request) {
          throw new Error('No response from server. Please check if the backend is running.');
        } else {
          throw new Error(error.message || 'An unexpected error occurred');
        }
      }
    );
  }

  // Tournament Config
  async getTournamentConfig(tournamentId: string): Promise<TournamentConfig> {
    const response = await this.client.get<TournamentConfigDTO>(`/tournaments/${tournamentId}/config`);
    return this.mapConfigFromDTO(response.data);
  }

  async updateTournamentConfig(tournamentId: string, config: TournamentConfig): Promise<TournamentConfig> {
    const dto = this.mapConfigToDTO(config);
    const response = await this.client.put<TournamentConfigDTO>(`/tournaments/${tournamentId}/config`, dto);
    return this.mapConfigFromDTO(response.data);
  }

  // Schedule Generation
  async generateSchedule(tournamentId: string): Promise<ScheduleDTO> {
    const response = await this.client.post<ScheduleDTO>(`/tournaments/${tournamentId}/schedule/generate`);
    return response.data;
  }

  async reoptimizeSchedule(tournamentId: string): Promise<ScheduleDTO> {
    const response = await this.client.post<ScheduleDTO>(`/tournaments/${tournamentId}/schedule/reoptimize`);
    return response.data;
  }

  async getSchedule(tournamentId: string, view: ScheduleView = 'timeslot'): Promise<ScheduleDTO> {
    const response = await this.client.get<ScheduleDTO>(`/tournaments/${tournamentId}/schedule`, {
      params: { view },
    });
    return response.data;
  }

  // Match State
  async updateMatchState(tournamentId: string, matchId: string, state: MatchStateDTO): Promise<void> {
    await this.client.post(`/tournaments/${tournamentId}/schedule/matches/${matchId}/state`, state);
  }

  // Roster
  async getRoster(tournamentId: string): Promise<PlayerDTO[]> {
    const response = await this.client.get<PlayerDTO[]>(`/tournaments/${tournamentId}/roster`);
    return response.data;
  }

  async importRoster(tournamentId: string, data: RosterImportDTO): Promise<PlayerDTO[]> {
    const response = await this.client.post<PlayerDTO[]>(`/tournaments/${tournamentId}/roster/import`, data);
    return response.data;
  }

  async createPlayer(tournamentId: string, player: PlayerDTO): Promise<PlayerDTO> {
    const response = await this.client.post<PlayerDTO>(`/tournaments/${tournamentId}/roster`, player);
    return response.data;
  }

  async updatePlayer(tournamentId: string, playerId: string, player: Partial<PlayerDTO>): Promise<PlayerDTO> {
    const response = await this.client.put<PlayerDTO>(`/tournaments/${tournamentId}/roster/${playerId}`, player);
    return response.data;
  }

  async deletePlayer(tournamentId: string, playerId: string): Promise<void> {
    await this.client.delete(`/tournaments/${tournamentId}/roster/${playerId}`);
  }

  // Groups (Schools)
  async getGroups(tournamentId: string): Promise<RosterGroupDTO[]> {
    const response = await this.client.get<RosterGroupDTO[]>(`/tournaments/${tournamentId}/roster/groups`);
    return response.data;
  }

  async createGroup(tournamentId: string, group: RosterGroupDTO): Promise<RosterGroupDTO> {
    const response = await this.client.post<RosterGroupDTO>(`/tournaments/${tournamentId}/roster/groups`, group);
    return response.data;
  }

  async updateGroup(tournamentId: string, groupId: string, group: Partial<RosterGroupDTO>): Promise<RosterGroupDTO> {
    const response = await this.client.put<RosterGroupDTO>(`/tournaments/${tournamentId}/roster/groups/${groupId}`, group);
    return response.data;
  }

  async deleteGroup(tournamentId: string, groupId: string): Promise<void> {
    await this.client.delete(`/tournaments/${tournamentId}/roster/groups/${groupId}`);
  }

  // Matches
  async getMatches(tournamentId: string): Promise<MatchDTO[]> {
    const response = await this.client.get<MatchDTO[]>(`/tournaments/${tournamentId}/matches`);
    return response.data;
  }

  async importMatches(tournamentId: string, data: MatchesImportDTO): Promise<MatchDTO[]> {
    const response = await this.client.post<MatchDTO[]>(`/tournaments/${tournamentId}/matches/import`, data);
    return response.data;
  }

  async createMatch(tournamentId: string, match: MatchDTO): Promise<MatchDTO> {
    const response = await this.client.post<MatchDTO>(`/tournaments/${tournamentId}/matches`, match);
    return response.data;
  }

  async updateMatch(tournamentId: string, matchId: string, match: Partial<MatchDTO>): Promise<MatchDTO> {
    const response = await this.client.put<MatchDTO>(`/tournaments/${tournamentId}/matches/${matchId}`, match);
    return response.data;
  }

  async deleteMatch(tournamentId: string, matchId: string): Promise<void> {
    await this.client.delete(`/tournaments/${tournamentId}/matches/${matchId}`);
  }

  // Helper methods for DTO mapping
  private mapConfigToDTO(config: TournamentConfig): TournamentConfigDTO {
    return {
      intervalMinutes: config.intervalMinutes,
      dayStart: config.dayStart,
      dayEnd: config.dayEnd,
      breaks: config.breaks,
      courtCount: config.courtCount,
      defaultRestMinutes: config.defaultRestMinutes,
      freezeHorizonSlots: config.freezeHorizonSlots,
    };
  }

  private mapConfigFromDTO(dto: TournamentConfigDTO): TournamentConfig {
    return {
      intervalMinutes: dto.intervalMinutes,
      dayStart: dto.dayStart,
      dayEnd: dto.dayEnd,
      breaks: dto.breaks,
      courtCount: dto.courtCount,
      defaultRestMinutes: dto.defaultRestMinutes,
      freezeHorizonSlots: dto.freezeHorizonSlots,
    };
  }

}

export const apiClient = new ApiClient();
export default apiClient;
