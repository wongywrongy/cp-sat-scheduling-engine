import { useState } from 'react';
import type { Assignment } from '../../types/schedule';
import { useScheduleStore } from '../../store/scheduleStore';

interface MatchEditorProps {
  assignment: Assignment;
  onClose: () => void;
}

export function MatchEditor({ assignment, onClose }: MatchEditorProps) {
  const { config, matches, scheduleResponse, setScheduleResponse } = useScheduleStore();
  const [slotId, setSlotId] = useState(assignment.slotId);
  const [courtId, setCourtId] = useState(assignment.courtId);

  if (!config || !scheduleResponse) return null;

  const match = matches.find((m) => m.id === assignment.matchId);
  const availableSlots = Array.from({ length: config.totalSlots }, (_, i) => i);
  const availableCourts = Array.from({ length: config.courtCount }, (_, i) => i + 1);

  const handleSave = () => {
    // Update the assignment in the schedule response
    const updatedAssignments = scheduleResponse.assignments.map((a) =>
      a.matchId === assignment.matchId
        ? {
            ...a,
            slotId,
            courtId,
            moved: slotId !== assignment.slotId || courtId !== assignment.courtId,
            previousSlotId: assignment.slotId,
            previousCourtId: assignment.courtId,
          }
        : a
    );

    setScheduleResponse({
      ...scheduleResponse,
      assignments: updatedAssignments,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">
          Edit Match: {match?.eventCode || assignment.matchId}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Time Slot</label>
            <select
              value={slotId}
              onChange={(e) => setSlotId(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {availableSlots.map((slot) => (
                <option key={slot} value={slot}>
                  Slot {slot}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Court</label>
            <select
              value={courtId}
              onChange={(e) => setCourtId(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {availableCourts.map((court) => (
                <option key={court} value={court}>
                  Court {court}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
