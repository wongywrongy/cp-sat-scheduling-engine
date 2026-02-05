interface ScheduleActionsProps {
  onGenerate: () => void;
  onReoptimize: () => void;
  generating: boolean;
  reoptimizing: boolean;
  hasSchedule: boolean;
}

export function ScheduleActions({
  onGenerate,
  onReoptimize,
  generating,
  reoptimizing,
  hasSchedule,
}: ScheduleActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onGenerate}
        disabled={generating}
        className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
          generating
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {generating ? 'Generating...' : 'Generate Schedule'}
      </button>
      {hasSchedule && (
        <button
          onClick={onReoptimize}
          disabled={reoptimizing}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
            reoptimizing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {reoptimizing ? 'Optimizing...' : 'Re-optimize'}
        </button>
      )}
    </div>
  );
}
