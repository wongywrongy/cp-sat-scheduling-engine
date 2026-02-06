/**
 * Lock guard hook for protecting schedule from accidental edits
 * When a schedule is generated, it becomes locked.
 * Editing config/players/matches requires confirmation to unlock (which clears the schedule).
 */
import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';

export function useLockGuard() {
  const isScheduleLocked = useAppStore((state) => state.isScheduleLocked);
  const unlockSchedule = useAppStore((state) => state.unlockSchedule);

  /**
   * Request to unlock the schedule.
   * Shows confirmation dialog if locked.
   * Returns true if unlocked (or was never locked), false if user cancelled.
   */
  const confirmUnlock = useCallback((actionDescription?: string): boolean => {
    if (!isScheduleLocked) return true;

    const action = actionDescription || 'This action';
    const confirmed = window.confirm(
      `WARNING: ${action} will CLEAR the current schedule!\n\n` +
      'All schedule data will be lost and you will need to regenerate it.\n\n' +
      'Are you sure you want to continue?'
    );

    if (confirmed) {
      unlockSchedule();
    }

    return confirmed;
  }, [isScheduleLocked, unlockSchedule]);

  /**
   * Wrap an action with lock guard.
   * If locked, shows confirmation before executing.
   * If user cancels, action is not executed.
   */
  const guardAction = useCallback(<T extends (...args: any[]) => any>(
    action: T
  ): ((...args: Parameters<T>) => ReturnType<T> | undefined) => {
    return (...args: Parameters<T>) => {
      if (confirmUnlock()) {
        return action(...args);
      }
      return undefined;
    };
  }, [confirmUnlock]);

  return {
    isLocked: isScheduleLocked,
    confirmUnlock,
    guardAction,
  };
}
