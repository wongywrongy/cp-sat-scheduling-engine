/**
 * Badminton Score Dialog Component
 * Modal dialog for entering set-by-set scores with deuce support
 */
import { useState, useMemo } from 'react';
import type { SetScore } from '../../api/dto';

interface BadmintonScoreDialogProps {
  matchName: string;
  sideAName: string;
  sideBName: string;
  setsToWin: number; // 1, 2, or 3 (best of 1, 3, or 5)
  pointsPerSet: number; // 11, 15, or 21
  deuceEnabled: boolean;
  onSubmit: (sets: SetScore[], winner: 'A' | 'B', notes: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function BadmintonScoreDialog({
  matchName,
  sideAName,
  sideBName,
  setsToWin,
  pointsPerSet,
  deuceEnabled,
  onSubmit,
  onCancel,
  isSubmitting = false
}: BadmintonScoreDialogProps) {
  const maxSets = setsToWin * 2 - 1; // Best of 1=1, Best of 3=3, Best of 5=5
  const maxPoints = deuceEnabled ? (pointsPerSet === 21 ? 30 : pointsPerSet + 10) : pointsPerSet;

  // Initialize empty sets
  const [sets, setSets] = useState<SetScore[]>(
    Array.from({ length: maxSets }, () => ({ sideA: 0, sideB: 0 }))
  );
  const [notes, setNotes] = useState('');

  // Calculate winner of each set
  const setWinners = useMemo(() => {
    return sets.map((set) => {
      const { sideA, sideB } = set;
      if (sideA === 0 && sideB === 0) return null; // Not played

      // Standard win condition
      if (sideA >= pointsPerSet && sideA > sideB) {
        if (!deuceEnabled || sideA - sideB >= 2 || sideA >= maxPoints) return 'A';
      }
      if (sideB >= pointsPerSet && sideB > sideA) {
        if (!deuceEnabled || sideB - sideA >= 2 || sideB >= maxPoints) return 'B';
      }

      // Deuce handling
      if (deuceEnabled && sideA >= pointsPerSet - 1 && sideB >= pointsPerSet - 1) {
        if (sideA - sideB >= 2) return 'A';
        if (sideB - sideA >= 2) return 'B';
        if (sideA >= maxPoints) return 'A';
        if (sideB >= maxPoints) return 'B';
      }

      return null; // Incomplete
    });
  }, [sets, pointsPerSet, deuceEnabled, maxPoints]);

  // Count sets won
  const setsWonA = setWinners.filter(w => w === 'A').length;
  const setsWonB = setWinners.filter(w => w === 'B').length;

  // Determine match winner
  const matchWinner = useMemo(() => {
    if (setsWonA >= setsToWin) return 'A';
    if (setsWonB >= setsToWin) return 'B';
    return null;
  }, [setsWonA, setsWonB, setsToWin]);

  // Update a set score with auto-fill logic
  const updateSet = (setIndex: number, side: 'sideA' | 'sideB', value: number) => {
    setSets(prev => {
      const newSets = [...prev];
      const clampedValue = Math.max(0, Math.min(maxPoints, value));
      newSets[setIndex] = { ...newSets[setIndex], [side]: clampedValue };

      // Auto-fill winner's score if this is clearly a losing score
      // A score is "clearly losing" if it's below deuce threshold (pointsPerSet - 1)
      const otherSide = side === 'sideA' ? 'sideB' : 'sideA';
      const otherScore = newSets[setIndex][otherSide];

      // Only auto-fill if:
      // 1. The entered score is a clear losing score (below deuce threshold)
      // 2. The other side doesn't have a score yet (is 0)
      if (clampedValue > 0 && clampedValue < pointsPerSet - 1 && otherScore === 0) {
        // Auto-fill winner with standard winning score
        newSets[setIndex] = { ...newSets[setIndex], [otherSide]: pointsPerSet };
      }

      return newSets;
    });
  };

  // Quick set winner (auto-fill winning score)
  const setQuickWinner = (setIndex: number, winner: 'A' | 'B') => {
    setSets(prev => {
      const newSets = [...prev];
      const loserScore = newSets[setIndex][winner === 'A' ? 'sideB' : 'sideA'];
      // If loser is close to winning points, winner needs 2 more (deuce) or max
      let winnerScore = pointsPerSet;
      if (deuceEnabled && loserScore >= pointsPerSet - 1) {
        winnerScore = Math.min(maxPoints, loserScore + 2);
      }
      newSets[setIndex] = {
        sideA: winner === 'A' ? winnerScore : loserScore,
        sideB: winner === 'B' ? winnerScore : loserScore,
      };
      return newSets;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!matchWinner) {
      alert('Please complete enough sets to determine a winner');
      return;
    }

    // Filter to only completed sets
    const completedSets = sets.slice(0, setsWonA + setsWonB);
    onSubmit(completedSets, matchWinner, notes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow max-w-lg w-full mx-4">
        {/* Header */}
        <div className="bg-purple-600 text-white px-4 py-2 rounded-t">
          <h3 className="text-base font-semibold">Finish Match: {matchName}</h3>
          <p className="text-xs text-purple-200">Best of {maxSets} (first to {setsToWin} sets)</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Score Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 px-2 font-medium text-gray-700">Player</th>
                  {Array.from({ length: maxSets }, (_, i) => (
                    <th key={i} className="text-center py-1 px-2 font-medium text-gray-700 w-16">
                      Set {i + 1}
                    </th>
                  ))}
                  <th className="text-center py-1 px-2 font-medium text-gray-700 w-12">Won</th>
                </tr>
              </thead>
              <tbody>
                {/* Side A */}
                <tr className="border-b">
                  <td className="py-2 px-2 font-medium text-gray-800 truncate max-w-[120px]" title={sideAName}>
                    {sideAName || 'Side A'}
                  </td>
                  {sets.map((set, i) => {
                    const isComplete = setWinners[i] !== null;
                    const isWinner = setWinners[i] === 'A';
                    const isDisabled = matchWinner !== null && i >= setsWonA + setsWonB;
                    return (
                      <td key={i} className="py-1 px-1 text-center">
                        <input
                          type="number"
                          value={set.sideA || ''}
                          onChange={(e) => updateSet(i, 'sideA', parseInt(e.target.value) || 0)}
                          disabled={isDisabled}
                          className={`w-12 px-1 py-1 text-center border rounded text-sm ${
                            isWinner ? 'bg-green-50 border-green-300 font-bold' :
                            isComplete ? 'bg-gray-50 border-gray-200' :
                            'border-gray-300'
                          } ${isDisabled ? 'opacity-50' : ''}`}
                          min="0"
                          max={maxPoints}
                        />
                      </td>
                    );
                  })}
                  <td className={`py-1 px-2 text-center font-bold ${setsWonA >= setsToWin ? 'text-green-600' : 'text-gray-700'}`}>
                    {setsWonA}
                  </td>
                </tr>
                {/* Side B */}
                <tr>
                  <td className="py-2 px-2 font-medium text-gray-800 truncate max-w-[120px]" title={sideBName}>
                    {sideBName || 'Side B'}
                  </td>
                  {sets.map((set, i) => {
                    const isComplete = setWinners[i] !== null;
                    const isWinner = setWinners[i] === 'B';
                    const isDisabled = matchWinner !== null && i >= setsWonA + setsWonB;
                    return (
                      <td key={i} className="py-1 px-1 text-center">
                        <input
                          type="number"
                          value={set.sideB || ''}
                          onChange={(e) => updateSet(i, 'sideB', parseInt(e.target.value) || 0)}
                          disabled={isDisabled}
                          className={`w-12 px-1 py-1 text-center border rounded text-sm ${
                            isWinner ? 'bg-green-50 border-green-300 font-bold' :
                            isComplete ? 'bg-gray-50 border-gray-200' :
                            'border-gray-300'
                          } ${isDisabled ? 'opacity-50' : ''}`}
                          min="0"
                          max={maxPoints}
                        />
                      </td>
                    );
                  })}
                  <td className={`py-1 px-2 text-center font-bold ${setsWonB >= setsToWin ? 'text-green-600' : 'text-gray-700'}`}>
                    {setsWonB}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quick Set Buttons */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center">Quick:</span>
            {Array.from({ length: maxSets }, (_, i) => {
              const isDisabled = matchWinner !== null && i >= setsWonA + setsWonB;
              if (isDisabled) return null;
              return (
                <div key={i} className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setQuickWinner(i, 'A')}
                    className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    S{i + 1}:A
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickWinner(i, 'B')}
                    className="px-2 py-0.5 text-xs bg-pink-100 text-pink-700 rounded hover:bg-pink-200"
                  >
                    S{i + 1}:B
                  </button>
                </div>
              );
            })}
          </div>

          {/* Winner Display */}
          {matchWinner && (
            <div className={`text-center py-2 rounded font-medium ${
              matchWinner === 'A' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
            }`}>
              Winner: {matchWinner === 'A' ? sideAName : sideBName} ({setsWonA}-{setsWonB})
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              placeholder="Add any notes about the match..."
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-sm text-sm hover:bg-gray-50 disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !matchWinner}
              className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded-sm text-sm hover:bg-purple-700 disabled:bg-gray-400 font-medium"
            >
              {isSubmitting ? 'Saving...' : 'Save & Finish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
