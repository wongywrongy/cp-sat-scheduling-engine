/**
 * Stateless API Client
 * Communicates with the stateless scheduling backend
 */
import axios, { type AxiosInstance } from 'axios';
import type {
  TournamentConfig,
  PlayerDTO,
  MatchDTO,
  ScheduleDTO,
  MatchStateDTO,
  SolverProgressEvent,
  MatchGenerationRule,
} from './dto';

// Use /api proxy in dev, or explicit URL in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:8000');

interface GenerateScheduleRequest {
  config: TournamentConfig;
  players: PlayerDTO[];
  matches: MatchDTO[];
  previousAssignments?: any[];
}

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

  /**
   * Generate optimized schedule
   * This is the only API call - backend is stateless
   */
  async generateSchedule(request: GenerateScheduleRequest): Promise<ScheduleDTO> {
    const response = await this.client.post<ScheduleDTO>('/schedule', request);
    return response.data;
  }

  /**
   * Generate schedule with progress updates via Server-Sent Events
   * @param abortSignal Optional AbortSignal to cancel the request
   */
  async generateScheduleWithProgress(
    request: GenerateScheduleRequest,
    onProgress: (event: SolverProgressEvent) => void,
    abortSignal?: AbortSignal
  ): Promise<ScheduleDTO> {
    return new Promise((resolve, reject) => {
      // Use same base URL as axios client - this will use /api proxy in dev
      const url = `${API_BASE_URL}/schedule/stream`;

      // Use fetch API for SSE streaming (EventSource doesn't support POST)
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortSignal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body is not readable');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE messages (delimited by \n\n)
            const messages = buffer.split('\n\n');
            buffer = messages.pop() || ''; // Keep incomplete message in buffer

            for (const message of messages) {
              if (!message.trim()) continue;

              // Parse SSE format: "data: {...}"
              const dataMatch = message.match(/^data: (.+)$/m);
              if (!dataMatch) continue;

              try {
                const event = JSON.parse(dataMatch[1]);

                if (event.type === 'progress') {
                  onProgress({
                    elapsed_ms: event.elapsed_ms,
                    current_objective: event.current_objective,
                    best_bound: event.best_bound,
                    solution_count: event.solution_count,
                    current_assignments: event.current_assignments,
                    gap_percent: event.gap_percent,
                    messages: event.messages,
                  });
                } else if (event.type === 'complete') {
                  resolve(event.result as ScheduleDTO);
                  return;
                } else if (event.type === 'error') {
                  reject(new Error(event.message));
                  return;
                }
              } catch (e) {
                console.error('Failed to parse SSE event:', e);
              }
            }
          }
        })
        .catch(reject);
    });
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string; version: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Match State Management (File-based)

  /**
   * Get all match states from the JSON file
   */
  async getMatchStates(): Promise<Record<string, MatchStateDTO>> {
    const response = await this.client.get<Record<string, MatchStateDTO>>('/match-states');
    return response.data;
  }

  /**
   * Get a single match state
   */
  async getMatchState(matchId: string): Promise<MatchStateDTO> {
    const response = await this.client.get<MatchStateDTO>(`/match-states/${matchId}`);
    return response.data;
  }

  /**
   * Update a match state in the file
   */
  async updateMatchState(matchId: string, update: Partial<MatchStateDTO>): Promise<MatchStateDTO> {
    const response = await this.client.put<MatchStateDTO>(`/match-states/${matchId}`, {
      matchId,
      ...update,
    });
    return response.data;
  }

  /**
   * Delete a match state from the file (reset to default)
   */
  async deleteMatchState(matchId: string): Promise<void> {
    await this.client.delete(`/match-states/${matchId}`);
  }

  /**
   * Reset all match states (clear the file)
   */
  async resetMatchStates(): Promise<void> {
    await this.client.post('/match-states/reset');
  }

  /**
   * Export tournament state as downloadable JSON file
   */
  async exportMatchStates(): Promise<Blob> {
    const response = await this.client.get('/match-states/export/download', {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Import tournament state from JSON file
   */
  async importMatchStates(file: File): Promise<{ message: string; matchCount: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/match-states/import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Bulk import match states from a dictionary (used for v2.0 tournament export)
   */
  async importMatchStatesBulk(matchStates: Record<string, MatchStateDTO>): Promise<{ message: string; importedCount: number }> {
    const response = await this.client.post('/match-states/import-bulk', matchStates);
    return response.data;
  }

  /**
   * Generate matches from a rule (placeholder - not yet implemented on backend)
   * @throws Error - Feature not yet implemented
   */
  async generateMatchesFromRule(_tournamentId: string, _rule: MatchGenerationRule): Promise<MatchDTO[]> {
    throw new Error('Auto-match generation is not yet implemented. Please create matches manually.');
  }
}

export const apiClient = new ApiClient();
export default apiClient;
