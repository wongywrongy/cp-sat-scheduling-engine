/**
 * Progress Summary Component
 * Displays overall tournament progress statistics
 */
interface ProgressSummaryProps {
  total: number;
  finished: number;
  inProgress: number;
  remaining: number;
  percentage: number;
}

export function ProgressSummary({
  total,
  finished,
  inProgress,
  remaining,
  percentage
}: ProgressSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Tournament Progress</h2>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{finished} of {total} matches completed</span>
          <span className="font-semibold">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500 flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${percentage}%` }}
          >
            {percentage > 10 && `${percentage}%`}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-600 mt-1">Total</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-700">{finished}</div>
          <div className="text-sm text-gray-600 mt-1">Finished</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{inProgress}</div>
          <div className="text-sm text-gray-600 mt-1">In Progress</div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">{remaining}</div>
          <div className="text-sm text-gray-600 mt-1">Remaining</div>
        </div>
      </div>

      {/* Completion Message */}
      {percentage === 100 && (
        <div className="mt-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-start gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Tournament Complete!</p>
            <p className="text-sm mt-1">All matches have been finished.</p>
          </div>
        </div>
      )}
    </div>
  );
}
