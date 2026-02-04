import { Menu } from '@headlessui/react';
import { SchoolBadgeEditor } from './SchoolBadgeEditor';
import { RankBadgeEditor } from './RankBadgeEditor';
import type { PlayerDTO, RosterGroupDTO } from '../../../api/dto';

interface PlayerListItemProps {
  player: PlayerDTO;
  schools: RosterGroupDTO[];
  isSelected: boolean;
  onToggleSelect: () => void;
  onSchoolChange: (schoolId: string) => void;
  onRanksChange: (ranks: string[]) => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * PlayerListItem Component
 *
 * Individual player row in the table view.
 *
 * Features:
 * - Checkbox for multi-select
 * - Player name (prominent)
 * - Inline school editor (SchoolBadgeEditor)
 * - Inline rank editor (RankBadgeEditor)
 * - Action menu (Edit, Delete)
 * - Table row layout (unified with MatchesList)
 */
export function PlayerListItem({
  player,
  schools,
  isSelected,
  onToggleSelect,
  onSchoolChange,
  onRanksChange,
  onEdit,
  onDelete,
}: PlayerListItemProps) {
  return (
    <tr className={`${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
      {/* Checkbox Column */}
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          aria-label={`Select ${player.name}`}
        />
      </td>

      {/* Player Name Column */}
      <td className="px-3 py-2.5">
        <div className="font-medium text-gray-900 text-sm">{player.name}</div>
        <div className="text-xs text-gray-500">{player.id}</div>
      </td>

      {/* School Column */}
      <td className="px-3 py-2.5">
        <SchoolBadgeEditor
          currentSchoolId={player.groupId}
          schools={schools}
          onSchoolChange={onSchoolChange}
        />
      </td>

      {/* Events/Ranks Column */}
      <td className="px-3 py-2.5">
        <RankBadgeEditor
          currentRanks={player.ranks || []}
          schoolId={player.groupId}
          playerId={player.id}
          onRanksChange={onRanksChange}
        />
      </td>

      {/* Actions Column */}
      <td className="px-3 py-2.5 text-right">
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
            <span className="sr-only">Open menu</span>
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </Menu.Button>

          <Menu.Items className="absolute right-0 z-10 mt-1 w-40 origin-top-right rounded bg-white shadow-sm ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onEdit}
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } group flex w-full items-center px-4 py-2 text-sm`}
                  >
                    <svg
                      className="mr-3 h-4 w-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Advanced Edit
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onDelete}
                    className={`${
                      active ? 'bg-red-50 text-red-900' : 'text-red-700'
                    } group flex w-full items-center px-4 py-2 text-sm`}
                  >
                    <svg
                      className="mr-3 h-4 w-4 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Menu>
      </td>
    </tr>
  );
}
