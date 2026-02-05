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

const TYPE_CONFIG: Record<string, { label: string }> = {
  overlap: { label: 'Player Overlap' },
  rest: { label: 'Rest Time' },
  court_capacity: { label: 'Court Capacity' },
  availability: { label: 'Availability' },
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
    <div className="h-full">
      {/* Match count summary */}
      <div className={`mb-3 pb-2 border-b border-gray-100 transition-all duration-300 ${matchCountFlash ? 'bg-gray-50 -mx-2 px-2 -mt-2 pt-2' : ''}`}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Matches</span>
          <span className={`font-medium transition-colors duration-300 ${matchCountFlash ? 'text-gray-900' : 'text-gray-700'}`}>
            <AnimatedCounter value={matchCount} />
            <span className="text-gray-400">/{totalMatches}</span>
          </span>
        </div>
        {unscheduledCount > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {unscheduledCount} unscheduled
          </div>
        )}
      </div>

      {/* Violations summary */}
      <div className="mb-3 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Hard violations</span>
          <span className={`font-medium ${hardCount === 0 ? 'text-gray-400' : 'text-gray-900'}`}>{hardCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Soft violations</span>
          <span className={`font-medium ${softCount === 0 ? 'text-gray-400' : 'text-gray-900'}`}>{softCount}</span>
        </div>
      </div>

      {/* Violations by type - simple stats */}
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">By Type</h4>
        {allTypes.map((type) => {
          const count = byType[type] || 0;
          const config = TYPE_CONFIG[type];

          return (
            <div
              key={type}
              className="flex items-center justify-between py-0.5 text-sm"
            >
              <span className="text-gray-600">{config.label}</span>
              <span className={`font-medium ${count > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                <AnimatedCounter value={count} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
