interface SetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetupGuide({ isOpen, onClose }: SetupGuideProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Tournament Setup Guide</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Interval Minutes</h4>
            <p className="text-gray-700">
              The duration of each time slot in minutes. This determines how granular your schedule will be.
              Common values: 15, 30, 45, or 60 minutes.
            </p>
            <p className="text-gray-600 mt-1 text-xs">
              <strong>Example:</strong> If set to 30, each slot represents 30 minutes (9:00-9:30, 9:30-10:00, etc.)
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Day Start / Day End</h4>
            <p className="text-gray-700">
              The start and end times for the tournament day in 24-hour format (HH:mm).
              All matches must be scheduled within this time window.
            </p>
            <p className="text-gray-600 mt-1 text-xs">
              <strong>Example:</strong> Day Start: 09:00, Day End: 18:00 means matches can run from 9 AM to 6 PM
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Court Count</h4>
            <p className="text-gray-700">
              The number of courts available for simultaneous matches. This directly affects how many matches
              can be played at the same time.
            </p>
            <p className="text-gray-600 mt-1 text-xs">
              <strong>Example:</strong> With 4 courts, up to 4 matches can run simultaneously
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Default Rest Minutes</h4>
            <p className="text-gray-700">
              The default minimum rest time (in minutes) that players should have between matches.
              Individual players can override this with their own rest requirements.
            </p>
            <p className="text-gray-600 mt-1 text-xs">
              <strong>Example:</strong> 30 minutes means a player finishing at 10:00 cannot start another match before 10:30
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Freeze Horizon Slots</h4>
            <p className="text-gray-700">
              The number of time slots from the current time that should be "frozen" and not rescheduled
              during reoptimization. This prevents disruption to matches that are about to start or are in progress.
            </p>
            <p className="text-gray-600 mt-1 text-xs">
              <strong>Example:</strong> If set to 2 and interval is 30 minutes, matches in the next hour (2 slots) won't be moved
            </p>
            <p className="text-gray-600 mt-1 text-xs">
              <strong>Tip:</strong> Set to 0 if you want full flexibility, or higher if you need to protect upcoming matches
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Breaks</h4>
            <p className="text-gray-700">
              Time windows when no matches should be scheduled (e.g., lunch break, ceremony).
              You can add multiple break periods.
            </p>
            <p className="text-gray-600 mt-1 text-xs">
              <strong>Example:</strong> Break from 12:00 to 13:00 means no matches will be scheduled during lunch hour
            </p>
            <p className="text-gray-600 mt-1 text-xs">
              <strong>Note:</strong> Break times should be within your Day Start and Day End times
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Tips</h4>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs">
              <li>Make sure Day End is after Day Start</li>
              <li>Total available time = (Day End - Day Start) minutes</li>
              <li>Number of slots = Total minutes ÷ Interval Minutes</li>
              <li>More courts = more simultaneous matches = shorter overall schedule</li>
              <li>Shorter intervals = more precise scheduling but more slots to manage</li>
              <li>You can always adjust these settings later and regenerate the schedule</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
