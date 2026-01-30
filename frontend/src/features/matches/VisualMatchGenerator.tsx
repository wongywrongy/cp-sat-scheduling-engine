import { useState, useRef, useCallback, useEffect } from 'react';
import { useRoster } from '../../hooks/useRoster';
import { useRosterGroups } from '../../hooks/useRosterGroups';
import type { PlayerDTO, MatchDTO, RosterGroupDTO } from '../../api/dto';

interface VisualMatchGeneratorProps {
  onSaveMatches: (matches: MatchDTO[]) => void;
  onCancel: () => void;
  matchType?: 'dual' | 'tri';
}

interface Connection {
  id: string;
  from: { playerId: string; schoolId: string };
  to: { playerId: string; schoolId: string };
  eventRank: string;
}

export function VisualMatchGenerator({ onSaveMatches, onCancel, matchType = 'dual' }: VisualMatchGeneratorProps) {
  const { players } = useRoster();
  const { groups } = useRosterGroups();
  const [selectedEventRank, setSelectedEventRank] = useState<string>('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [draggingFrom, setDraggingFrom] = useState<{ playerId: string; schoolId: string } | null>(null);
  const [hoveringOver, setHoveringOver] = useState<string | null>(null);
  const [linePositions, setLinePositions] = useState<Record<string, { x1: number; y1: number; x2: number; y2: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Get unique event ranks from players
  const eventRanks = Array.from(new Set(players.filter(p => p.rank).map(p => p.rank!))).sort();

  // Group players by school and rank
  const playersBySchoolAndRank = groups.reduce((acc, school) => {
    acc[school.id] = eventRanks.reduce((rankAcc, rank) => {
      rankAcc[rank] = players.filter(p => p.groupId === school.id && p.rank === rank);
      return rankAcc;
    }, {} as Record<string, PlayerDTO[]>);
    return acc;
  }, {} as Record<string, Record<string, PlayerDTO[]>>);

  // Get selected schools (first 2 or 3 depending on match type)
  const selectedSchools = groups.slice(0, matchType === 'tri' ? 3 : 2);

  const handlePlayerMouseDown = (playerId: string, schoolId: string) => {
    if (selectedEventRank) {
      setDraggingFrom({ playerId, schoolId });
    }
  };

  const handlePlayerMouseUp = (playerId: string, schoolId: string) => {
    if (draggingFrom && draggingFrom.playerId !== playerId && draggingFrom.schoolId !== schoolId) {
      // Check if connection already exists
      const exists = connections.some(
        conn =>
          ((conn.from.playerId === draggingFrom.playerId && conn.to.playerId === playerId) ||
            (conn.from.playerId === playerId && conn.to.playerId === draggingFrom.playerId)) &&
          conn.eventRank === selectedEventRank
      );

      if (!exists) {
        setConnections([
          ...connections,
          {
            id: `${Date.now()}-${Math.random()}`,
            from: draggingFrom,
            to: { playerId, schoolId },
            eventRank: selectedEventRank,
          },
        ]);
      }
    }
    setDraggingFrom(null);
    setHoveringOver(null);
  };

  const handleDeleteConnection = (connectionId: string) => {
    setConnections(connections.filter(c => c.id !== connectionId));
  };

  const handleGenerateMatches = () => {
    // Group connections by event rank
    const connectionsByRank = connections.reduce((acc, conn) => {
      if (!acc[conn.eventRank]) {
        acc[conn.eventRank] = [];
      }
      acc[conn.eventRank].push(conn);
      return acc;
    }, {} as Record<string, Connection[]>);

    const matches: MatchDTO[] = [];

    Object.entries(connectionsByRank).forEach(([rank, conns]) => {
      if (matchType === 'tri') {
        // For tri-meets, we need connections between all three schools
        // Group players by school for this rank
        const playersBySchool: Record<string, string[]> = {};
        
        conns.forEach(conn => {
          if (!playersBySchool[conn.from.schoolId]) {
            playersBySchool[conn.from.schoolId] = [];
          }
          if (!playersBySchool[conn.to.schoolId]) {
            playersBySchool[conn.to.schoolId] = [];
          }
          if (!playersBySchool[conn.from.schoolId].includes(conn.from.playerId)) {
            playersBySchool[conn.from.schoolId].push(conn.from.playerId);
          }
          if (!playersBySchool[conn.to.schoolId].includes(conn.to.playerId)) {
            playersBySchool[conn.to.schoolId].push(conn.to.playerId);
          }
        });

        const schoolIds = Object.keys(playersBySchool);
        if (schoolIds.length === 3) {
          // Create one tri-meet match with all three schools
          matches.push({
            id: `match-${rank}-tri-${Date.now()}`,
            sideA: playersBySchool[schoolIds[0]] || [],
            sideB: playersBySchool[schoolIds[1]] || [],
            sideC: playersBySchool[schoolIds[2]] || [],
            matchType: 'tri',
            eventRank: rank,
            durationSlots: 1,
            tags: [rank, ...schoolIds.map(id => groups.find(g => g.id === id)?.name || '')],
          });
        } else if (schoolIds.length === 2) {
          // Only two schools connected - create dual meet
          matches.push({
            id: `match-${rank}-${schoolIds[0]}-${schoolIds[1]}-${Date.now()}`,
            sideA: playersBySchool[schoolIds[0]] || [],
            sideB: playersBySchool[schoolIds[1]] || [],
            matchType: 'dual',
            eventRank: rank,
            durationSlots: 1,
            tags: [rank, groups.find(g => g.id === schoolIds[0])?.name || '', groups.find(g => g.id === schoolIds[1])?.name || ''],
          });
        }
      } else {
        // For dual meets, group by pairs
        const pairs = new Map<string, { sideA: string[]; sideB: string[] }>();

        conns.forEach(conn => {
          const key = [conn.from.schoolId, conn.to.schoolId].sort().join('-');
          if (!pairs.has(key)) {
            pairs.set(key, { sideA: [], sideB: [] });
          }
          const pair = pairs.get(key)!;
          if (conn.from.schoolId < conn.to.schoolId) {
            pair.sideA.push(conn.from.playerId);
            pair.sideB.push(conn.to.playerId);
          } else {
            pair.sideA.push(conn.to.playerId);
            pair.sideB.push(conn.from.playerId);
          }
        });

        pairs.forEach((pair, key) => {
          const [schoolA, schoolB] = key.split('-');
          matches.push({
            id: `match-${rank}-${schoolA}-${schoolB}-${Date.now()}`,
            sideA: Array.from(new Set(pair.sideA)),
            sideB: Array.from(new Set(pair.sideB)),
            matchType: 'dual',
            eventRank: rank,
            durationSlots: 1,
            tags: [rank, groups.find(g => g.id === schoolA)?.name || '', groups.find(g => g.id === schoolB)?.name || ''],
          });
        });
      }
    });

    onSaveMatches(matches);
  };

  // Update line positions based on actual DOM elements
  useEffect(() => {
    if (!selectedEventRank || !containerRef.current) return;

    const updatePositions = () => {
      const positions: Record<string, { x1: number; y1: number; x2: number; y2: number }> = {};
      const containerRect = containerRef.current!.getBoundingClientRect();

      connections
        .filter(c => c.eventRank === selectedEventRank)
        .forEach(conn => {
          const fromEl = document.getElementById(`player-${conn.from.playerId}`);
          const toEl = document.getElementById(`player-${conn.to.playerId}`);

          if (fromEl && toEl) {
            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();

            positions[conn.id] = {
              x1: fromRect.left + fromRect.width / 2 - containerRect.left,
              y1: fromRect.top + fromRect.height / 2 - containerRect.top,
              x2: toRect.left + toRect.width / 2 - containerRect.left,
              y2: toRect.top + toRect.height / 2 - containerRect.top,
            };
          }
        });

      setLinePositions(positions);
    };

    updatePositions();
    const interval = setInterval(updatePositions, 100);
    return () => clearInterval(interval);
  }, [connections, selectedEventRank]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-7xl mx-auto">
      <h3 className="text-lg font-semibold mb-4">Visual Match Generator - {matchType === 'tri' ? 'Tri-Meet' : 'Dual Meet'}</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Event/Rank to Match
        </label>
        <select
          value={selectedEventRank}
          onChange={(e) => {
            setSelectedEventRank(e.target.value);
            setConnections(connections.filter(c => c.eventRank === e.target.value));
          }}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select an event/rank</option>
          {eventRanks.map(rank => (
            <option key={rank} value={rank}>{rank}</option>
          ))}
        </select>
      </div>

      {selectedEventRank && (
        <>
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Instructions:</strong> Click and drag from a player to another player to create a match connection.
              Click on a connection line to delete it.
            </p>
            <p className="text-sm text-gray-600">
              Matching players for: <strong>{selectedEventRank}</strong>
            </p>
          </div>

          <div ref={containerRef} className="relative border border-gray-300 rounded-lg p-4" style={{ minHeight: '500px', position: 'relative' }}>
            <svg
              ref={svgRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: '100%', height: '100%', zIndex: 1 }}
            >
              {connections
                .filter(c => c.eventRank === selectedEventRank)
                .map(conn => {
                  const pos = linePositions[conn.id];
                  if (!pos) return null;

                  return (
                    <line
                      key={conn.id}
                      x1={pos.x1}
                      y1={pos.y1}
                      x2={pos.x2}
                      y2={pos.y2}
                      stroke="#3b82f6"
                      strokeWidth="3"
                      markerEnd="url(#arrowhead)"
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onClick={() => handleDeleteConnection(conn.id)}
                    />
                  );
                })}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                </marker>
              </defs>
            </svg>

            <div className="flex gap-8 relative" style={{ zIndex: 10, position: 'relative' }}>
              {selectedSchools.map((school, schoolIndex) => (
                <div key={school.id} className="flex-shrink-0" style={{ width: '200px' }}>
                  <h4 className="font-semibold text-center mb-4 p-2 bg-blue-100 rounded">
                    {school.name}
                  </h4>
                  {eventRanks.map((rank, rankIndex) => {
                    const schoolPlayers = playersBySchoolAndRank[school.id]?.[rank] || [];
                    return (
                      <div key={rank} className="mb-4">
                        <div className="text-xs font-medium text-gray-600 mb-2">{rank}</div>
                        {schoolPlayers.map((player, playerIndex) => (
                          <div
                            key={player.id}
                            id={`player-${player.id}`}
                            className={`p-2 mb-1 border rounded cursor-pointer transition-colors ${
                              draggingFrom?.playerId === player.id
                                ? 'bg-blue-300 border-blue-500'
                                : hoveringOver === player.id
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-gray-300 hover:border-blue-400'
                            }`}
                            onMouseDown={() => handlePlayerMouseDown(player.id, school.id)}
                            onMouseUp={() => handlePlayerMouseUp(player.id, school.id)}
                            onMouseEnter={() => setHoveringOver(player.id)}
                            onMouseLeave={() => setHoveringOver(null)}
                          >
                            {player.name}
                          </div>
                        ))}
                        {schoolPlayers.length === 0 && (
                          <div className="text-xs text-gray-400 p-2">No players</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateMatches}
              disabled={connections.filter(c => c.eventRank === selectedEventRank).length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Generate Matches ({connections.filter(c => c.eventRank === selectedEventRank).length} connections)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
