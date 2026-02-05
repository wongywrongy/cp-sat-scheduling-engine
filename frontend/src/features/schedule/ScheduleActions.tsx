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
        className={`px-2 py-1 text-xs ${
          generating
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        {generating ? 'Generating...' : 'Generate'}
      </button>
      {hasSchedule && (
        <button
          onClick={onReoptimize}
          disabled={reoptimizing}
          className={`px-2 py-1 text-xs ${
            reoptimizing
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {reoptimizing ? 'Reoptimizing...' : 'Reoptimize'}
        </button>
      )}
    </div>
  );
}
