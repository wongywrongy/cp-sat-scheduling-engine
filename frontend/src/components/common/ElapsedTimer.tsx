/**
 * Elapsed Timer Component
 * Displays elapsed time since a given start time, updating every second
 */
import { useState, useEffect } from 'react';

interface ElapsedTimerProps {
  startTime: string | undefined;
  className?: string;
}

export function ElapsedTimer({ startTime, className = 'tabular-nums' }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    if (!startTime) {
      setElapsed('0:00');
      return;
    }

    const calculateElapsed = () => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const start = new Date();
      start.setHours(hours, minutes, 0, 0);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
    };

    setElapsed(calculateElapsed());
    const interval = setInterval(() => setElapsed(calculateElapsed()), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className={className}>{elapsed}</span>;
}
