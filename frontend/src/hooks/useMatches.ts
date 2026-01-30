import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { MatchDTO, MatchesImportDTO } from '../api/dto';

const DEFAULT_TOURNAMENT_ID = 'default';

export function useMatches(tournamentId: string = DEFAULT_TOURNAMENT_ID) {
  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loaded = await apiClient.getMatches(tournamentId);
      setMatches(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const importMatches = useCallback(async (data: MatchesImportDTO) => {
    try {
      setLoading(true);
      setError(null);
      const imported = await apiClient.importMatches(tournamentId, data);
      setMatches(imported);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import matches');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const createMatch = useCallback(async (match: MatchDTO) => {
    try {
      setLoading(true);
      setError(null);
      const created = await apiClient.createMatch(tournamentId, match);
      setMatches((prev) => [...prev, created]);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create match');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const updateMatch = useCallback(async (matchId: string, updates: Partial<MatchDTO>) => {
    try {
      setLoading(true);
      setError(null);
      const updated = await apiClient.updateMatch(tournamentId, matchId, updates);
      setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update match');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const deleteMatch = useCallback(async (matchId: string) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.deleteMatch(tournamentId, matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete match');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return {
    matches,
    loading,
    error,
    importMatches,
    createMatch,
    updateMatch,
    deleteMatch,
    reloadMatches: loadMatches,
  };
}
