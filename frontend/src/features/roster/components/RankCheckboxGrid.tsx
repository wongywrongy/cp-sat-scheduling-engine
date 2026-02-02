import { useState } from 'react';
import type { TournamentConfig } from '../../../api/dto';

interface RankOption {
  value: string;
  disabled: boolean;
  assignedTo?: string; // Name of player who has this rank
}

interface RankCategory {
  label: string;
  ranks: RankOption[];
}

interface RankCheckboxGridProps {
  selectedRanks: string[];
  availableRanks: Record<string, RankCategory>;
  onToggleRank: (rank: string) => void;
  onSelectAllInCategory: (categoryKey: string) => void;
  showSelected?: boolean; // Show "Selected Ranks" section
  defaultExpanded?: boolean; // Whether categories start expanded (default: false)
}

/**
 * RankCheckboxGrid Component
 *
 * Reusable rank selection grid with grouped categories.
 * Used in PlayerForm and inline rank editors.
 *
 * Features:
 * - Grouped by category (MS, WS, MD, WD, XD)
 * - Select All/Deselect All per category
 * - Shows selection count
 * - Optional "Selected Ranks" display section
 */
export function RankCheckboxGrid({
  selectedRanks,
  availableRanks,
  onToggleRank,
  onSelectAllInCategory,
  showSelected = true,
  defaultExpanded = false,
}: RankCheckboxGridProps) {
  // Track which categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(availableRanks).forEach(key => {
      initial[key] = defaultExpanded;
    });
    return initial;
  });

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  if (Object.keys(availableRanks).length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
        All ranks for this school are already assigned to other players.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 border border-gray-300 rounded-md bg-gray-50">
        {Object.entries(availableRanks).map(([categoryKey, category]) => {
          const categoryRanks = category.ranks.map(r => r.value);
          const selectedCount = categoryRanks.filter(rank => selectedRanks.includes(rank)).length;
          const allSelected = selectedCount === categoryRanks.length && categoryRanks.length > 0;

          const isExpanded = expandedCategories[categoryKey] ?? defaultExpanded;

          return (
            <div key={categoryKey} className="border-b border-gray-300 last:border-b-0">
              {/* Category Header */}
              <div
                className="flex items-center justify-between p-3 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => toggleCategory(categoryKey)}
              >
                <div className="flex items-center gap-2">
                  {/* Chevron indicator */}
                  <span className="text-gray-600">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span className="font-medium text-gray-800">{category.label}</span>
                  <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                    {selectedCount}/{categoryRanks.length} selected
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAllInCategory(categoryKey);
                  }}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Category Ranks - Only show when expanded */}
              {isExpanded && (
                <div className="p-3 bg-white grid grid-cols-1 sm:grid-cols-2 gap-2">
                {category.ranks.map((rank) => (
                  <label
                    key={rank.value}
                    className={`flex items-center space-x-2 p-2 rounded ${
                      rank.disabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRanks.includes(rank.value)}
                      onChange={() => !rank.disabled && onToggleRank(rank.value)}
                      disabled={rank.disabled}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{rank.value}</span>
                    {rank.assignedTo && (
                      <span className={`text-xs ${rank.disabled ? 'text-gray-500' : 'text-blue-600'}`}>
                        ({rank.assignedTo})
                      </span>
                    )}
                  </label>
                ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showSelected && selectedRanks.length > 0 && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm font-medium text-blue-900 mb-1">Selected Ranks:</p>
          <div className="flex flex-wrap gap-1">
            {selectedRanks.map((rank) => (
              <span
                key={rank}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
              >
                {rank}
                <button
                  type="button"
                  onClick={() => onToggleRank(rank)}
                  className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
