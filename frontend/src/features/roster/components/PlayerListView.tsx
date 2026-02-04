import { useEffect, useState, useMemo } from 'react';
import { PlayerListItem } from './PlayerListItem';
import { usePlayerSelection } from '../hooks/usePlayerSelection';
import type { PlayerDTO, RosterGroupDTO } from '../../../api/dto';

type SortField = 'name' | 'school' | 'none';
type SortDirection = 'asc' | 'desc';

interface PlayerListViewProps {
  players: PlayerDTO[];
  schools: RosterGroupDTO[];
  onSchoolChange: (playerId: string, schoolId: string) => void;
  onRanksChange: (playerId: string, ranks: string[]) => void;
  onEdit: (player: PlayerDTO) => void;
  onDelete: (playerId: string) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
}

/**
 * PlayerListView Component
 *
 * Main container for the player list with multi-select functionality.
 *
 * Features:
 * - Table-based layout (unified with MatchesList)
 * - Header with "Select All" checkbox
 * - Sortable columns (Name, School)
 * - Individual PlayerListItem rows
 * - Multi-select state management
 * - Empty state when no players
 *
 * Exposes selection state to parent for bulk actions.
 */
export function PlayerListView({
  players,
  schools,
  onSchoolChange,
  onRanksChange,
  onEdit,
  onDelete,
  onSelectionChange,
}: PlayerListViewProps) {
  const selection = usePlayerSelection();
  const [sortField, setSortField] = useState<SortField>('none');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Notify parent whenever selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selection.getSelectedIds());
    }
  }, [selection.selectedIds, onSelectionChange]);

  // Sort players
  const sortedPlayers = useMemo(() => {
    if (sortField === 'none') return players;

    return [...players].sort((a, b) => {
      let compareResult = 0;

      if (sortField === 'name') {
        compareResult = a.name.localeCompare(b.name);
      } else if (sortField === 'school') {
        const schoolA = schools.find(s => s.id === a.groupId)?.name || '';
        const schoolB = schools.find(s => s.id === b.groupId)?.name || '';
        compareResult = schoolA.localeCompare(schoolB);
      }

      return sortDirection === 'asc' ? compareResult : -compareResult;
    });
  }, [players, schools, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selection.selectedCount === players.length) {
      selection.clearSelection();
    } else {
      selection.selectAll(players.map(p => p.id));
    }
  };

  if (players.length === 0) {
    return (
      <div className="p-4 bg-white rounded shadow-sm border border-gray-200 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No players</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by adding a player.
        </p>
      </div>
    );
  }

  const allSelected = selection.selectedCount === players.length;
  const someSelected = selection.selectedCount > 0 && !allSelected;

  return (
    <div className="bg-white rounded shadow-sm border border-gray-200 overflow-visible">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 w-12">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = someSelected;
                  }
                }}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                aria-label="Select all players"
              />
            </th>
            <th className="px-3 py-2 text-left">
              <button
                onClick={() => handleSort('name')}
                className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1 hover:text-gray-900"
              >
                Name
                {sortField === 'name' && (
                  <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            </th>
            <th className="px-3 py-2 text-left">
              <button
                onClick={() => handleSort('school')}
                className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1 hover:text-gray-900"
              >
                School
                {sortField === 'school' && (
                  <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Events/Ranks
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedPlayers.map((player) => (
            <PlayerListItem
              key={player.id}
              player={player}
              schools={schools}
              isSelected={selection.isSelected(player.id)}
              onToggleSelect={() => selection.togglePlayer(player.id)}
              onSchoolChange={(schoolId) => onSchoolChange(player.id, schoolId)}
              onRanksChange={(ranks) => onRanksChange(player.id, ranks)}
              onEdit={() => onEdit(player)}
              onDelete={() => onDelete(player.id)}
            />
          ))}
        </tbody>
      </table>

      {/* Selection info - shown below table when players are selected */}
      {selection.hasSelection && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-700">
          {selection.selectedCount} of {players.length} selected
          <button
            onClick={() => selection.clearSelection()}
            className="ml-3 text-blue-600 hover:text-blue-800"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to access PlayerListView's selection from parent
 * Returns the selection hook for external use (e.g., bulk actions toolbar)
 */
export { usePlayerSelection };
