/**
 * Solver progress log showing real-time optimization updates
 * Shows solver messages and violation warnings
 */
import { useEffect, useState, useRef } from 'react';
import type { ConstraintViolation } from '../../../api/dto';

interface LogEntry {
  id: number;
  message: string;
  timestamp: number;
  type: 'info' | 'solution' | 'violation' | 'stats';
}

interface SolverProgressLogProps {
  solutionCount?: number;
  objectiveScore?: number;
  matchCount: number;
  totalMatches: number;
  status: 'solving' | 'complete' | 'error';
  violations: ConstraintViolation[];
}

export function SolverProgressLog({
  solutionCount,
  objectiveScore,
  matchCount,
  totalMatches,
  status,
  violations,
}: SolverProgressLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const prevSolutionCount = useRef(solutionCount);
  const prevObjectiveScore = useRef(objectiveScore);
  const prevStatus = useRef(status);
  const prevViolationCount = useRef(0);
  const idCounter = useRef(0);
  const completionStatsAdded = useRef(false);

  // Add log entry helper
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    idCounter.current++;
    setLogs(prev => [...prev.slice(-29), { id: idCounter.current, message, timestamp: Date.now(), type }]);
  };

  // Track status changes
  useEffect(() => {
    if (status !== prevStatus.current) {
      if (status === 'solving') {
        setLogs([]); // Clear on new solve
        completionStatsAdded.current = false;
        prevViolationCount.current = 0;
        addLog('Starting optimization...');
      } else if (status === 'error') {
        addLog('Error during optimization');
      }
      prevStatus.current = status;
    }
  }, [status]);

  // Track solution improvements
  useEffect(() => {
    if (solutionCount !== undefined && solutionCount !== prevSolutionCount.current) {
      if (prevSolutionCount.current !== undefined && solutionCount > prevSolutionCount.current) {
        const scoreStr = objectiveScore !== undefined ? ` (score: ${Math.round(objectiveScore)})` : '';
        addLog(`Found solution #${solutionCount}${scoreStr}`, 'solution');
      }
      prevSolutionCount.current = solutionCount;
    }
  }, [solutionCount, objectiveScore]);

  // Track significant score improvements
  useEffect(() => {
    if (objectiveScore !== undefined && prevObjectiveScore.current !== undefined) {
      const improvement = prevObjectiveScore.current - objectiveScore;
      if (improvement > 10) {
        addLog(`Score improved by ${Math.round(improvement)} points`, 'solution');
      }
    }
    prevObjectiveScore.current = objectiveScore;
  }, [objectiveScore]);

  // Track new violations
  useEffect(() => {
    if (violations.length > prevViolationCount.current) {
      // Log only the new violations
      const newViolations = violations.slice(prevViolationCount.current);
      for (const v of newViolations) {
        const severityLabel = v.severity === 'hard' ? 'HARD' : 'Soft';
        addLog(`${severityLabel} violation: ${v.description}`, 'violation');
      }
      prevViolationCount.current = violations.length;
    }
  }, [violations]);

  // Add final stats when complete
  useEffect(() => {
    if (status === 'complete' && !completionStatsAdded.current) {
      completionStatsAdded.current = true;

      const hardViolations = violations.filter(v => v.severity === 'hard').length;
      const softViolations = violations.filter(v => v.severity === 'soft').length;

      // Add completion message
      addLog(`Complete - ${matchCount}/${totalMatches} matches scheduled`);

      // Add stats summary
      const parts: string[] = [];
      if (hardViolations > 0) {
        parts.push(`${hardViolations} hard violation${hardViolations !== 1 ? 's' : ''}`);
      }
      if (softViolations > 0) {
        parts.push(`${softViolations} soft violation${softViolations !== 1 ? 's' : ''}`);
      }
      if (objectiveScore !== undefined) {
        parts.push(`score: ${Math.round(objectiveScore)}`);
      }

      if (parts.length > 0) {
        addLog(`Stats: ${parts.join(', ')}`, 'stats');
      } else {
        addLog('Stats: No violations detected', 'stats');
      }
    }
  }, [status, violations, matchCount, totalMatches, objectiveScore]);

  // Auto-scroll
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Get color for log entry type
  const getEntryColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'solution':
        return 'text-green-600';
      case 'violation':
        return 'text-amber-600';
      case 'stats':
        return 'text-blue-600 font-medium';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Solver log - fills available space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto text-xs font-mono space-y-0.5"
        >
          {logs.length === 0 ? (
            <div className="text-gray-400 italic">Waiting for solver...</div>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className="flex gap-1">
                <span className="text-gray-400 flex-shrink-0 text-[10px]">
                  {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
                <span className={`${getEntryColor(entry.type)} truncate`}>{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Violations section (if any) */}
      {violations.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-200 pt-2">
          <div className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
            Violations ({violations.length})
          </div>
          <div className="overflow-y-auto max-h-24 text-xs space-y-0.5">
            {violations.slice(0, 8).map((v, i) => (
              <div key={i} className="text-amber-600 truncate" title={v.description}>
                {v.description}
              </div>
            ))}
            {violations.length > 8 && (
              <div className="text-gray-400 italic">+{violations.length - 8} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
