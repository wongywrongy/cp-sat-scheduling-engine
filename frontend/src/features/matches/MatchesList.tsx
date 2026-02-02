import { useState, useEffect } from 'react';
import type { MatchDTO } from '../../api/dto';
import { usePlayerNames } from '../../hooks/usePlayerNames';

interface MatchesListProps {
  matches: MatchDTO[];
  onEdit: (match: MatchDTO) => void;
  onDelete: (matchId: string) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function MatchesList({ matches, onEdit, onDelete, onSelectionChange }: MatchesListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'eventRank' | 'type'>('eventRank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { getPlayerNames } = usePlayerNames();

  // Notify parent when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(selectedIds));
    }
  }, [selectedIds, onSelectionChange]);

  const toggleSelection = (matchId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === matches.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(matches.map(m => m.id)));
    }
  };

  const handleSort = (field: 'eventRank' | 'type') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort matches
  const sortedMatches = [...matches].sort((a, b) => {
    let aValue: string;
    let bValue: string;

    if (sortField === 'eventRank') {
      aValue = a.eventRank || '';
      bValue = b.eventRank || '';
    } else {
      aValue = a.matchType;
      bValue = b.matchType;
    }

    const comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const allSelected = matches.length > 0 && selectedIds.size === matches.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  if (matches.length === 0) {
    return (
      <div className="p-8 bg-white rounded-lg shadow text-center">
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No matches</h3>
        <p className="mt-1 text-sm text-gray-500">
          Add matches to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 w-12">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = someSelected;
                  }
                }}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                aria-label="Select all matches"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('eventRank')}
                className="flex items-center gap-1 hover:text-gray-700 focus:outline-none"
              >
                Event/Rank
                {sortField === 'eventRank' && (
                  <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('type')}
                className="flex items-center gap-1 hover:text-gray-700 focus:outline-none"
              >
                Type
                {sortField === 'type' && (
                  <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Side A
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Side B
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Side C
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration (slots)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Preferred Court
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tags
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedMatches.map((match) => {
            const isSelected = selectedIds.has(match.id);
            return (
              <tr
                key={match.id}
                className={isSelected ? 'bg-blue-50' : ''}
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(match.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    aria-label={`Select match ${match.eventRank || match.id}`}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {match.eventRank || '-'}
                </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`px-2 py-1 rounded text-xs ${
                  match.matchType === 'tri' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {match.matchType === 'tri' ? 'Tri-Meet' : 'Dual'}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {match.sideA.length > 0 ? getPlayerNames(match.sideA).join(' & ') : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {match.sideB.length > 0 ? getPlayerNames(match.sideB).join(' & ') : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {match.sideC && match.sideC.length > 0 ? getPlayerNames(match.sideC).join(' & ') : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {match.durationSlots}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {match.preferredCourt || '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {match.tags && match.tags.length > 0 ? match.tags.join(', ') : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(match)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(match.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
