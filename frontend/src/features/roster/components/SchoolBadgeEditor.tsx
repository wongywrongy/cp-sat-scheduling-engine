import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import type { RosterGroupDTO } from '../../../api/dto';

interface SchoolBadgeEditorProps {
  currentSchoolId: string | null;
  schools: RosterGroupDTO[];
  onSchoolChange: (schoolId: string) => void;
  className?: string;
}

/**
 * SchoolBadgeEditor Component
 *
 * Inline dropdown editor for school assignment.
 * Click the school badge to open a dropdown and select a different school.
 *
 * Features:
 * - Accessible dropdown using Headless UI Menu
 * - Shows current school as a badge
 * - Instant update on selection
 * - Keyboard navigation support
 */
export function SchoolBadgeEditor({
  currentSchoolId,
  schools,
  onSchoolChange,
  className = '',
}: SchoolBadgeEditorProps) {
  const currentSchool = schools.find(s => s.id === currentSchoolId);
  const displayText = currentSchool?.name || 'No School';
  const schoolColor = currentSchool?.metadata?.color;

  return (
    <Menu as="div" className={`relative w-full ${className}`}>
      <Menu.Button
        className="w-full flex items-center justify-between px-2 py-1 text-sm text-left border rounded transition-colors hover:border-gray-300"
        style={schoolColor ? {
          backgroundColor: `${schoolColor}15`,
          borderColor: `${schoolColor}40`,
        } : {
          backgroundColor: 'white',
          borderColor: '#e5e7eb',
        }}
      >
        <span className={`truncate ${currentSchool ? 'text-gray-800' : 'text-gray-400'}`}>
          {displayText}
        </span>
        <svg
          className="w-3 h-3 text-gray-400 flex-shrink-0 ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {schools.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                No schools available
              </div>
            ) : (
              schools.map((school) => {
                const isSelected = school.id === currentSchoolId;
                return (
                  <Menu.Item key={school.id}>
                    {({ active }) => (
                      <button
                        onClick={() => onSchoolChange(school.id)}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } group flex w-full items-center justify-between px-4 py-2 text-sm text-gray-900`}
                      >
                        <span>{school.name}</span>
                        {isSelected && (
                          <svg
                            className="h-4 w-4 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </Menu.Item>
                );
              })
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
