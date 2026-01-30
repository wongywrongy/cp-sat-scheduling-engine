import { useState } from 'react';
import type { Assignment } from '../../types/schedule';
import { ScheduleGrid } from '../schedule/ScheduleGrid';
import { ScheduleTimeline } from '../schedule/ScheduleTimeline';
import { MatchEditor } from './MatchEditor';

interface EditableScheduleProps {
  assignments: Assignment[];
  viewMode?: 'grid' | 'timeline';
}

export function EditableSchedule({ assignments, viewMode = 'grid' }: EditableScheduleProps) {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'timeline'>(viewMode);

  const handleAssignmentClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
  };

  const handleCloseEditor = () => {
    setSelectedAssignment(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Schedule</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentViewMode('grid')}
            className={`px-4 py-2 rounded ${
              currentViewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setCurrentViewMode('timeline')}
            className={`px-4 py-2 rounded ${
              currentViewMode === 'timeline'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Timeline View
          </button>
        </div>
      </div>

      {currentViewMode === 'grid' ? (
        <ScheduleGrid
          assignments={assignments}
          onAssignmentClick={handleAssignmentClick}
        />
      ) : (
        <ScheduleTimeline
          assignments={assignments}
          onAssignmentClick={handleAssignmentClick}
        />
      )}

      {selectedAssignment && (
        <MatchEditor
          assignment={selectedAssignment}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
}
