/**
 * Live conflicts panel showing constraint violation summary
 * Enhanced with animations during optimization
 */
import { useEffect, useState, useRef } from 'react';
import type { ConstraintViolation } from '../../../api/dto';

interface LiveConflictsPanelProps {
  violations: ConstraintViolation[];
  matchCount: number;
  totalMatches: number;
  status: 'solving' | 'complete' | 'error';
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  overlap: { label: 'Player Overlap', color: 'bg-red-400' },
  rest: { label: 'Rest Time', color: 'bg-orange-400' },
  court_capacity: { label: 'Court Capacity', color: 'bg-purple-400' },
  availability: { label: 'Availability', color: 'bg-blue-400' },
};

// Animated counter component
function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 150);
      prevValueRef.current = value;
      return () => clearTimeout(timeout);
    }
  }, [value]);

  return (
    <span className={`${className} transition-all duration-300 ${isAnimating ? 'scale-125 opacity-70' : ''}`}>
      {displayValue}
    </span>
  );
}

export function LiveConflictsPanel({
  violations,
  matchCount,
  totalMatches,
  status,
}: LiveConflictsPanelProps) {
  const unscheduledCount = totalMatches - matchCount;
  const [prevMatchCount, setPrevMatchCount] = useState(matchCount);
  const [matchCountFlash, setMatchCountFlash] = useState(false);

  // Group violations by type
  const byType = violations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hardCount = violations.filter(v => v.severity === 'hard').length;
  const softCount = violations.filter(v => v.severity === 'soft').length;

  const allTypes = ['overlap', 'rest', 'court_capacity', 'availability'];

  // Flash effect when match count changes
  useEffect(() => {
    if (matchCount !== prevMatchCount) {
      setMatchCountFlash(true);
      const timeout = setTimeout(() => setMatchCountFlash(false), 400);
      setPrevMatchCount(matchCount);
      return () => clearTimeout(timeout);
    }
  }, [matchCount, prevMatchCount]);

  return (
    <div className="bg-white rounded border border-gray-200 p-2 h-full">
      {/* Compact top section: status + counts */}
      <div className={`mb-2 pb-2 border-b border-gray-100 transition-all duration-300 ${matchCountFlash ? 'bg-blue-50 -mx-2 px-2 -mt-2 pt-2 rounded-t' : ''}`}>
        {/* Status row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {status === 'solving' && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-sm text-blue-600 font-medium">Optimizing...</span>
              </>
            )}
            {status === 'complete' && (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-green-600 font-medium">Complete</span>
              </>
            )}
            {status === 'error' && (
              <>
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm text-red-600 font-medium">Error</span>
              </>
            )}
          </div>
          <div className={`text-right transition-colors duration-300 ${matchCountFlash ? 'text-blue-600' : 'text-gray-700'}`}>
            <span className="font-bold"><AnimatedCounter value={matchCount} /></span>
            <span className="text-xs text-gray-500">/{totalMatches}</span>
          </div>
        </div>

        {/* Inline badges row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {unscheduledCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {unscheduledCount} unscheduled
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full transition-all duration-300 ${hardCount === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hardCount === 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            {hardCount} hard
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full transition-all duration-300 ${softCount === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${softCount === 0 ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {softCount} soft
          </span>
        </div>
      </div>

      {/* Violations by type with staggered animation */}
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">By Type</h4>
        {allTypes.map((type, index) => {
          const count = byType[type] || 0;
          const config = TYPE_CONFIG[type];
          const isViolated = count > 0;

          return (
            <div
              key={type}
              className={`flex items-center justify-between p-1.5 rounded transition-all duration-300 ${
                isViolated ? 'bg-red-50' : 'bg-gray-50'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className={`text-sm flex items-center gap-2 transition-colors duration-300 ${isViolated ? 'text-red-700' : 'text-gray-600'}`}>
                <span className={`w-2 h-2 rounded-full ${config.color} ${status === 'solving' ? 'animate-pulse' : ''}`} />
                {config.label}
              </span>
              <div className="flex items-center gap-1">
                {count === 0 ? (
                  <span className="w-2 h-2 rounded-full bg-green-500 transition-all duration-300" />
                ) : (
                  <span className="font-semibold text-red-600 min-w-[20px] text-right">
                    <AnimatedCounter value={count} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>


      {/* CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .scale-102 {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}
