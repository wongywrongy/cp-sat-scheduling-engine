import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { TournamentConfig } from '../api/dto';

const DEFAULT_TOURNAMENT_ID = 'default';

export function useTournament(tournamentId: string = DEFAULT_TOURNAMENT_ID) {
  const [config, setConfig] = useState<TournamentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedConfig = await apiClient.getTournamentConfig(tournamentId);
      setConfig(loadedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tournament config');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const updateConfig = useCallback(async (newConfig: TournamentConfig) => {
    try {
      setLoading(true);
      setError(null);
      const updatedConfig = await apiClient.updateTournamentConfig(tournamentId, newConfig);
      setConfig(updatedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tournament config');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    updateConfig,
    reloadConfig: loadConfig,
  };
}
