/**
 * Live conflicts panel showing constraint violation log
 */
import { useEffect, useState, useRef } from 'react';
import type { ConstraintViolation } from '../../../api/dto';

interface LiveConflictsPanelProps {
  violations: ConstraintViolation[];
  matchCount: number;
  totalMatches: number;
  status: 'solving' | 'complete' | 'error';
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
  const logRef = useRef<HTMLDivElement>(null);

  const softViolations = violations.filter(v => v.severity === 'soft');

  // Flash effect when match count changes
  useEffect(() => {
    if (matchCount !== prevMatchCount) {
      setMatchCountFlash(true);
      const timeout = setTimeout(() => setMatchCountFlash(false), 400);
      setPrevMatchCount(matchCount);
      return () => clearTimeout(timeout);
    }
  }, [matchCount, prevMatchCount]);

  // Auto-scroll log when new violations appear
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [violations.length]);

  return (
    <div className="h-full flex flex-col">
      {/* Match count summary */}
      <div className={`mb-2 pb-2 border-b border-gray-100 transition-all duration-300 ${matchCountFlash ? 'bg-gray-50 -mx-2 px-2 -mt-2 pt-2' : ''}`}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Matches</span>
          <span className={`font-medium transition-colors duration-300 ${matchCountFlash ? 'text-gray-900' : 'text-gray-700'}`}>
            {matchCount}<span className="text-gray-400">/{totalMatches}</span>
          </span>
        </div>
        {unscheduledCount > 0 && (
          <div className="text-xs text-gray-500 mt-0.5">
            {unscheduledCount} unscheduled
          </div>
        )}
      </div>

      {/* Violation log */}
      <div className="flex-1 min-h-0">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Log {softViolations.length > 0 && <span className="text-gray-400">({softViolations.length})</span>}
        </h4>
        <div
          ref={logRef}
          className="overflow-y-auto max-h-32 text-xs space-y-1"
        >
          {softViolations.length === 0 ? (
            <div className="text-gray-400 italic">No violations</div>
          ) : (
            softViolations.map((v, i) => (
              <div key={i} className="text-gray-600 py-0.5 border-b border-gray-50 last:border-0">
                {v.description}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
