import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { RankCheckboxGrid } from './RankCheckboxGrid';
import { useRankValidation } from '../hooks/useRankValidation';

interface RankBadgeEditorProps {
  currentRanks: string[];
  schoolId: string | null;
  playerId: string;
  onRanksChange: (ranks: string[]) => void;
  className?: string;
}

/**
 * RankBadgeEditor Component
 *
 * Inline popover editor for rank assignment.
 * Click the rank badges to open a popover with rank selection grid.
 *
 * Features:
 * - Accessible popover using Headless UI
 * - Shows current ranks as colored badges
 * - RankCheckboxGrid for selection
 * - Apply button to confirm changes
 * - Shows warning if no school assigned
 */
export function RankBadgeEditor({
  currentRanks,
  schoolId,
  playerId,
  onRanksChange,
  className = '',
}: RankBadgeEditorProps) {
  const [selectedRanks, setSelectedRanks] = useState<string[]>(currentRanks);
  const { availableRanks, hasIncompletePair } = useRankValidation(schoolId, playerId);
  const [isOpen, setIsOpen] = useState(false);

  // Sync selectedRanks when currentRanks prop changes
  useEffect(() => {
    setSelectedRanks(currentRanks);
  }, [currentRanks]);

  const handleToggleRank = (rank: string) => {
    setSelectedRanks((prev) =>
      prev.includes(rank)
        ? prev.filter((r) => r !== rank)
        : [...prev, rank]
    );
  };

  const handleSelectAllInCategory = (categoryKey: string) => {
    const categoryRanks = availableRanks[categoryKey]?.ranks
      .filter(r => !r.disabled)
      .map(r => r.value) || [];
    const allSelected = categoryRanks.every(rank => selectedRanks.includes(rank));

    if (allSelected) {
      // Deselect all in category
      setSelectedRanks(prev => prev.filter(rank => !categoryRanks.includes(rank)));
    } else {
      // Select all in category
      setSelectedRanks(prev => [...new Set([...prev, ...categoryRanks])]);
    }
  };

  const handleApply = () => {
    onRanksChange(selectedRanks);
    setIsOpen(false);
  };

  if (!schoolId) {
    return (
      <div className={`text-sm text-gray-400 italic ${className}`}>
        Assign school first
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-sm hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
      >
        {currentRanks.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {currentRanks.map((rank) => {
              const isIncomplete = hasIncompletePair(rank);
              return (
                <span
                  key={rank}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
                    isIncomplete
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                  title={isIncomplete ? 'Incomplete doubles pair - needs 2 players' : undefined}
                >
                  {isIncomplete && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                  {rank}
                </span>
              );
            })}
            <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
              Edit
            </span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200">
            + Add Ranks
          </span>
        )}
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900 mb-4">
                    Select Ranks/Events
                  </Dialog.Title>

                  {Object.keys(availableRanks).length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      All ranks for this school are already assigned to other players.
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      <RankCheckboxGrid
                        selectedRanks={selectedRanks}
                        availableRanks={availableRanks}
                        onToggleRank={handleToggleRank}
                        onSelectAllInCategory={handleSelectAllInCategory}
                        showSelected={false}
                      />
                    </div>
                  )}

                  <div className="mt-6 flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {selectedRanks.length} rank{selectedRanks.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApply}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
