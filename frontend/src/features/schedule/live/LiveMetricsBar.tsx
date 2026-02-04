/**
 * Live metrics bar showing solver progress during optimization
 * Enhanced with smooth animations and visual feedback
 */
import { useEffect, useState, useRef } from 'react';

interface LiveMetricsBarProps {
  elapsed: number;
  solutionCount?: number;
  objectiveScore?: number;
  bestBound?: number;
  status: 'solving' | 'complete' | 'error';
}

// Animated number component for smooth counting
function AnimatedNumber({
  value,
  formatFn = (n: number) => n.toString(),
}: {
  value: number | undefined;
  formatFn?: (n: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(value ?? 0);
  const prevValueRef = useRef(value ?? 0);

  useEffect(() => {
    if (value === undefined) return;

    const prevValue = prevValueRef.current;
    const diff = value - prevValue;
    const duration = 300;
    const steps = 20;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(prevValue + diff * easeProgress);

      if (currentStep >= steps) {
        clearInterval(interval);
        setDisplayValue(value);
      }
    }, stepDuration);

    prevValueRef.current = value;
    return () => clearInterval(interval);
  }, [value]);

  return <span>{value !== undefined ? formatFn(displayValue) : '-'}</span>;
}

export function LiveMetricsBar({
  elapsed,
  solutionCount,
  objectiveScore,
  bestBound,
  status,
}: LiveMetricsBarProps) {
  const [showPulse, setShowPulse] = useState(false);
  const prevSolutionCountRef = useRef(solutionCount);

  // Calculate optimality gap
  const gap = objectiveScore && bestBound && objectiveScore > 0
    ? ((objectiveScore - bestBound) / objectiveScore) * 100
    : null;

  // Flash effect when solution count increases
  useEffect(() => {
    if (solutionCount !== undefined && solutionCount !== prevSolutionCountRef.current) {
      setShowPulse(true);
      const timeout = setTimeout(() => setShowPulse(false), 500);
      prevSolutionCountRef.current = solutionCount;
      return () => clearTimeout(timeout);
    }
  }, [solutionCount]);

  // Format elapsed time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const statusConfig = {
    solving: {
      bg: 'bg-blue-500',
      text: 'Optimizing...',
      glow: 'shadow-blue-500/50',
    },
    complete: {
      bg: 'bg-green-500',
      text: 'Complete',
      glow: 'shadow-green-500/50',
    },
    error: {
      bg: 'bg-red-500',
      text: 'Error',
      glow: 'shadow-red-500/50',
    },
  };

  const { bg, text, glow } = statusConfig[status];

  return (
    <div className={`bg-white border border-gray-200 rounded p-2 shadow-sm transition-all duration-500 ${status === 'solving' ? 'shadow-md' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div
              className={`w-2 h-2 rounded-full ${bg} transition-all duration-300
                ${status === 'solving' ? 'animate-pulse shadow-lg ' + glow : ''}`}
            />
            {status === 'solving' && (
              <div className={`absolute inset-0 w-2 h-2 rounded-full ${bg} animate-ping opacity-50`} />
            )}
          </div>
          <span className="font-semibold text-base text-gray-900">{text}</span>
        </div>

        {/* Metrics with animated numbers */}
        <div className="flex items-center gap-4">
          {/* Elapsed time */}
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-blue-600 tabular-nums">
              {formatTime(elapsed)}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Elapsed</div>
          </div>

          {/* Solutions found with flash effect */}
          <div className={`text-center transition-all duration-300 ${showPulse ? 'scale-110' : ''}`}>
            <div className={`text-lg font-mono font-bold tabular-nums transition-colors duration-300 ${showPulse ? 'text-green-500' : 'text-green-600'}`}>
              <AnimatedNumber
                value={solutionCount}
                formatFn={(n) => Math.round(n).toString()}
              />
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Solutions</div>
          </div>

          {/* Objective score */}
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-amber-600 tabular-nums">
              <AnimatedNumber
                value={objectiveScore}
                formatFn={(n) => Math.round(n).toString()}
              />
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Score</div>
          </div>

          {/* Optimality gap */}
          <div className="text-center min-w-[60px]">
            <div className="text-lg font-mono font-bold text-purple-600 tabular-nums">
              {gap !== null ? (
                <AnimatedNumber
                  value={gap}
                  formatFn={(n) => `${n.toFixed(1)}%`}
                />
              ) : '-'}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Gap</div>
          </div>
        </div>

        {/* Progress bar with animated fill */}
        <div className="flex-1 max-w-xs">
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            {/* Background shimmer during solving */}
            {status === 'solving' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300 to-transparent animate-metrics-shimmer" />
            )}
            {/* Progress fill */}
            <div
              className={`h-full transition-all duration-500 ease-out rounded-full relative overflow-hidden
                ${status === 'complete' ? 'bg-green-500' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`}
              style={{ width: `${status === 'complete' ? 100 : (gap !== null ? Math.max(0, 100 - gap) : 0)}%` }}
            >
              {/* Shine effect */}
              {status === 'solving' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-metrics-shine" />
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center mt-1">
            {status === 'complete' ? (
              <span className="text-green-600 font-medium">Optimization complete</span>
            ) : gap !== null ? (
              <span className="tabular-nums">{(100 - gap).toFixed(1)}% optimal</span>
            ) : (
              <span className="animate-pulse">Computing...</span>
            )}
          </div>
        </div>
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes metrics-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-metrics-shimmer {
          animation: metrics-shimmer 2s linear infinite;
        }
        @keyframes metrics-shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-metrics-shine {
          animation: metrics-shine 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
