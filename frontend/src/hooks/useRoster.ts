import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { PlayerDTO, RosterImportDTO } from '../api/dto';

const DEFAULT_TOURNAMENT_ID = 'default';

export function useRoster(tournamentId: string = DEFAULT_TOURNAMENT_ID) {
  const [players, setPlayers] = useState<PlayerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const roster = await apiClient.getRoster(tournamentId);
      setPlayers(roster);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const importRoster = useCallback(async (data: RosterImportDTO) => {
    try {
      setLoading(true);
      setError(null);
      const imported = await apiClient.importRoster(tournamentId, data);
      setPlayers(imported);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import roster');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const createPlayer = useCallback(async (player: PlayerDTO) => {
    try {
      setLoading(true);
      setError(null);
      const created = await apiClient.createPlayer(tournamentId, player);
      setPlayers((prev) => [...prev, created]);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create player');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const updatePlayer = useCallback(async (playerId: string, updates: Partial<PlayerDTO>) => {
    try {
      setLoading(true);
      setError(null);
      const updated = await apiClient.updatePlayer(tournamentId, playerId, updates);
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? updated : p)));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update player');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const deletePlayer = useCallback(async (playerId: string) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.deletePlayer(tournamentId, playerId);
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete player');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  return {
    players,
    loading,
    error,
    importRoster,
    createPlayer,
    updatePlayer,
    deletePlayer,
    reloadRoster: loadRoster,
  };
}
