/**
 * Public Display Page - Tournament status display for TVs, projectors, and public viewing
 * Access via /display with optional query params:
 * - ?view=courts (default) - Shows current match on each court
 * - ?view=schedule - Shows upcoming matches
 * - ?view=standings - Shows school-vs-school leaderboard
 */
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useLiveTracking } from '../hooks/useLiveTracking';
import { formatSlotTime } from '../utils/timeUtils';

type ViewMode = 'courts' | 'schedule' | 'standings';

export function PublicDisplayPage() {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as ViewMode | null;
  const [view, setView] = useState<ViewMode>(viewParam || 'courts');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));

  const { schedule, config, matches, matchStates, matchesByStatus } = useLiveTracking();
  const players = useAppStore((state) => state.players);
  const groups = useAppStore((state) => state.groups);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Player names map
  const playerNames = useMemo(() => new Map(players.map(p => [p.id, p.name])), [players]);

  // Group names map
  const groupNames = useMemo(() => new Map(groups.map(g => [g.id, g.name])), [groups]);

  // Get player's group name
  const getPlayerGroup = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? groupNames.get(player.groupId) || 'Unknown' : 'Unknown';
  };

  // Match lookup
  const matchMap = useMemo(() => new Map(matches.map(m => [m.id, m])), [matches]);

  // Get current matches by court
  const courtMatches = useMemo(() => {
    if (!schedule || !config) return [];

    const courts: { courtId: number; match: typeof matches[0] | null; state: typeof matchStates[string] | null; status: 'active' | 'called' | 'empty' }[] = [];

    for (let courtId = 1; courtId <= config.courtCount; courtId++) {
      // Find active match on this court
      const activeAssignment = matchesByStatus.started.find(a => a.courtId === courtId);
      if (activeAssignment) {
        courts.push({
          courtId,
          match: matchMap.get(activeAssignment.matchId) || null,
          state: matchStates[activeAssignment.matchId] || null,
          status: 'active',
        });
        continue;
      }

      // Find called match on this court
      const calledAssignment = matchesByStatus.called.find(a => a.courtId === courtId);
      if (calledAssignment) {
        courts.push({
          courtId,
          match: matchMap.get(calledAssignment.matchId) || null,
          state: matchStates[calledAssignment.matchId] || null,
          status: 'called',
        });
        continue;
      }

      courts.push({ courtId, match: null, state: null, status: 'empty' });
    }

    return courts;
  }, [schedule, config, matchesByStatus, matchMap, matchStates]);

  // Get upcoming matches (next 10)
  const upcomingMatches = useMemo(() => {
    if (!schedule) return [];
    return matchesByStatus.scheduled.slice(0, 10).map(a => ({
      assignment: a,
      match: matchMap.get(a.matchId),
    }));
  }, [matchesByStatus.scheduled, matchMap, schedule]);

  // Calculate standings by group (school)
  const standings = useMemo(() => {
    const groupScores: Record<string, { wins: number; losses: number; matchesPlayed: number }> = {};

    // Initialize all groups
    groups.forEach(g => {
      groupScores[g.id] = { wins: 0, losses: 0, matchesPlayed: 0 };
    });

    // Count wins/losses from finished matches
    matchesByStatus.finished.forEach(assignment => {
      const match = matchMap.get(assignment.matchId);
      const state = matchStates[assignment.matchId];
      if (!match || !state?.score) return;

      const sideAGroup = match.sideA?.[0] ? getPlayerGroup(match.sideA[0]) : null;
      const sideBGroup = match.sideB?.[0] ? getPlayerGroup(match.sideB[0]) : null;
      const sideAGroupId = players.find(p => match.sideA?.includes(p.id))?.groupId;
      const sideBGroupId = players.find(p => match.sideB?.includes(p.id))?.groupId;

      if (sideAGroupId && sideBGroupId && sideAGroupId !== sideBGroupId) {
        const aWon = state.score.sideA > state.score.sideB;

        if (groupScores[sideAGroupId]) {
          groupScores[sideAGroupId].matchesPlayed++;
          if (aWon) groupScores[sideAGroupId].wins++;
          else groupScores[sideAGroupId].losses++;
        }

        if (groupScores[sideBGroupId]) {
          groupScores[sideBGroupId].matchesPlayed++;
          if (!aWon) groupScores[sideBGroupId].wins++;
          else groupScores[sideBGroupId].losses++;
        }
      }
    });

    return Object.entries(groupScores)
      .map(([groupId, scores]) => ({
        groupId,
        groupName: groupNames.get(groupId) || groupId,
        ...scores,
      }))
      .filter(s => s.matchesPlayed > 0)
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  }, [matchesByStatus.finished, matchMap, matchStates, groups, groupNames, players]);

  // Format player names for display
  const formatPlayers = (playerIds: string[] | undefined) => {
    if (!playerIds || playerIds.length === 0) return '—';
    return playerIds.map(id => playerNames.get(id) || id).join(' & ');
  };

  // No data state
  if (!schedule || !config) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">Tournament Display</div>
          <div className="text-xl text-gray-400">No schedule generated yet</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-3xl font-bold">Tournament Status</div>
        <div className="flex items-center gap-6">
          {/* View tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setView('courts')}
              className={`px-4 py-2 rounded-lg text-lg font-medium transition-colors ${
                view === 'courts' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Courts
            </button>
            <button
              onClick={() => setView('schedule')}
              className={`px-4 py-2 rounded-lg text-lg font-medium transition-colors ${
                view === 'schedule' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Schedule
            </button>
            <button
              onClick={() => setView('standings')}
              className={`px-4 py-2 rounded-lg text-lg font-medium transition-colors ${
                view === 'standings' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Standings
            </button>
          </div>
          <div className="text-2xl tabular-nums text-gray-400">{currentTime}</div>
        </div>
      </div>

      {/* Courts View */}
      {view === 'courts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courtMatches.map(({ courtId, match, state, status }) => (
            <div
              key={courtId}
              className={`rounded-xl p-6 ${
                status === 'active'
                  ? 'bg-green-900 border-2 border-green-500'
                  : status === 'called'
                    ? 'bg-yellow-900 border-2 border-yellow-500'
                    : 'bg-gray-800 border border-gray-700'
              }`}
            >
              <div className="text-xl font-bold mb-2 text-gray-400">Court {courtId}</div>
              {match ? (
                <>
                  <div className="text-2xl font-bold mb-3">
                    {match.eventRank || `M${match.matchNumber || '?'}`}
                  </div>
                  <div className="text-xl mb-1">{formatPlayers(match.sideA)}</div>
                  <div className="text-lg text-gray-400 mb-1">vs</div>
                  <div className="text-xl mb-3">{formatPlayers(match.sideB)}</div>
                  {status === 'called' && (
                    <div className="text-yellow-400 font-bold text-lg animate-pulse">
                      NOW CALLING
                    </div>
                  )}
                  {status === 'active' && state?.actualStartTime && (
                    <div className="text-green-400 font-medium">
                      Started {state.actualStartTime}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-500 text-xl">Available</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Schedule View */}
      {view === 'schedule' && (
        <div className="space-y-3">
          <div className="text-xl text-gray-400 mb-4">Up Next</div>
          {upcomingMatches.length === 0 ? (
            <div className="text-gray-500 text-xl text-center py-8">No upcoming matches</div>
          ) : (
            upcomingMatches.map(({ assignment, match }) => (
              <div
                key={assignment.matchId}
                className="bg-gray-800 rounded-xl p-4 flex items-center gap-6"
              >
                <div className="text-xl font-bold w-20">
                  {match?.eventRank || `M${match?.matchNumber || '?'}`}
                </div>
                <div className="text-lg text-gray-400 w-16">C{assignment.courtId}</div>
                <div className="text-lg text-gray-400 w-20 tabular-nums">
                  {config ? formatSlotTime(assignment.slotId, config) : '—'}
                </div>
                <div className="flex-1 text-xl">
                  {formatPlayers(match?.sideA)} <span className="text-gray-500">vs</span> {formatPlayers(match?.sideB)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Standings View */}
      {view === 'standings' && (
        <div className="max-w-2xl mx-auto">
          <div className="text-xl text-gray-400 mb-4">Team Standings</div>
          {standings.length === 0 ? (
            <div className="text-gray-500 text-xl text-center py-8">No matches completed yet</div>
          ) : (
            <div className="space-y-3">
              {standings.map((team, index) => (
                <div
                  key={team.groupId}
                  className="bg-gray-800 rounded-xl p-4 flex items-center gap-6"
                >
                  <div className="text-3xl font-bold text-gray-500 w-12">#{index + 1}</div>
                  <div className="flex-1 text-2xl font-bold">{team.groupName}</div>
                  <div className="text-xl">
                    <span className="text-green-400">{team.wins}W</span>
                    <span className="text-gray-500 mx-2">-</span>
                    <span className="text-red-400">{team.losses}L</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <div className="text-lg text-gray-400">
            {matchesByStatus.finished.length} / {schedule.assignments.length} matches complete
          </div>
          <div className="text-lg">
            <span className="text-green-400 mr-4">{matchesByStatus.started.length} active</span>
            <span className="text-yellow-400">{matchesByStatus.called.length} called</span>
          </div>
        </div>
        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-500"
            style={{ width: `${(matchesByStatus.finished.length / schedule.assignments.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
