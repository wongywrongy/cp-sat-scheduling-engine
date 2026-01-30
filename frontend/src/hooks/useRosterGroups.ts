import { useState, useEffect } from 'react';
import { useTournament } from './useTournament';
import apiClient from '../api/client';
import type { RosterGroupDTO } from '../api/dto';

export function useRosterGroups() {
  const { tournamentId } = useTournament();
  const [groups, setGroups] = useState<RosterGroupDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tournamentId) {
      loadGroups();
    }
  }, [tournamentId]);

  const loadGroups = async () => {
    if (!tournamentId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getGroups(tournamentId);
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (group: RosterGroupDTO): Promise<RosterGroupDTO> => {
    if (!tournamentId) throw new Error('No tournament selected');
    
    try {
      const created = await apiClient.createGroup(tournamentId, group);
      setGroups([...groups, created]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create group';
      setError(message);
      throw err;
    }
  };

  const updateGroup = async (groupId: string, updates: Partial<RosterGroupDTO>): Promise<RosterGroupDTO> => {
    if (!tournamentId) throw new Error('No tournament selected');
    
    try {
      const updated = await apiClient.updateGroup(tournamentId, groupId, updates);
      setGroups(groups.map(g => g.id === groupId ? updated : g));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update group';
      setError(message);
      throw err;
    }
  };

  const deleteGroup = async (groupId: string): Promise<void> => {
    if (!tournamentId) throw new Error('No tournament selected');
    
    try {
      await apiClient.deleteGroup(tournamentId, groupId);
      setGroups(groups.filter(g => g.id !== groupId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete group';
      setError(message);
      throw err;
    }
  };

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    refresh: loadGroups,
  };
}
