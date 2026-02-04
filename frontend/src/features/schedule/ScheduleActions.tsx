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
    <div className="flex gap-1">
      <button
        onClick={onGenerate}
        disabled={generating}
        className={`px-3 py-1.5 rounded-sm text-sm font-medium ${
          generating
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700'
        } text-white`}
      >
        {generating ? 'Generating...' : 'Generate Schedule'}
      </button>
      {hasSchedule && (
        <button
          onClick={onReoptimize}
          disabled={reoptimizing}
          className={`px-3 py-1.5 rounded-sm text-sm font-medium ${
            reoptimizing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {reoptimizing ? 'Reoptimizing...' : 'Reoptimize Schedule'}
        </button>
      )}
    </div>
  );
}
