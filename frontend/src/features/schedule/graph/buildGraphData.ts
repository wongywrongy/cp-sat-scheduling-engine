/**
 * Transform schedule data into graph visualization format
 */
import type {
  ScheduleAssignment,
  MatchDTO,
  PlayerDTO,
  ConstraintViolation,
  GraphData,
  GraphNode,
  GraphEdge,
} from '../../../api/dto';

/**
 * Build force-directed graph data from schedule assignments
 */
export function buildGraphData(
  assignments: ScheduleAssignment[],
  matches: MatchDTO[],
  players: PlayerDTO[],
  violations: ConstraintViolation[]
): GraphData {
  const matchMap = new Map(matches.map(m => [m.id, m]));
  const playerMap = new Map(players.map(p => [p.id, p]));

  // Build violation lookup for quick edge status determination
  const violationMap = buildViolationMap(violations);

  // Get players involved in scheduled matches
  const scheduledMatchIds = new Set(assignments.map(a => a.matchId));
  const involvedPlayerIds = new Set<string>();

  for (const matchId of scheduledMatchIds) {
    const match = matchMap.get(matchId);
    if (match) {
      getMatchPlayerIds(match).forEach(id => involvedPlayerIds.add(id));
    }
  }

  // Build nodes from involved players
  const nodes: GraphNode[] = [];
  for (const playerId of involvedPlayerIds) {
    const player = playerMap.get(playerId);
    if (player) {
      // Count how many scheduled matches this player is in
      const matchCount = assignments.filter(a => {
        const m = matchMap.get(a.matchId);
        return m && getMatchPlayerIds(m).includes(playerId);
      }).length;

      nodes.push({
        id: player.id,
        name: player.name,
        groupId: player.groupId,
        matchCount,
      });
    }
  }

  // Build edges between players in the same match
  const links: GraphEdge[] = [];
  const edgeKeys = new Set<string>(); // Prevent duplicate edges

  for (const assignment of assignments) {
    const match = matchMap.get(assignment.matchId);
    if (!match) continue;

    const playerIds = getMatchPlayerIds(match);

    // Create edges between all players in this match
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        const p1 = playerIds[i];
        const p2 = playerIds[j];
        const edgeKey = `${p1}-${p2}-${match.id}`;

        if (edgeKeys.has(edgeKey)) continue;
        edgeKeys.add(edgeKey);

        const status = determineEdgeStatus(p1, p2, match.id, violationMap);

        links.push({
          source: p1,
          target: p2,
          matchId: match.id,
          status,
        });
      }
    }
  }

  return { nodes, links };
}

/**
 * Get all player IDs from a match
 */
function getMatchPlayerIds(match: MatchDTO): string[] {
  const players: string[] = [];
  if (match.sideA) players.push(...match.sideA);
  if (match.sideB) players.push(...match.sideB);
  if (match.sideC) players.push(...match.sideC);
  return players;
}

/**
 * Build a lookup map from violations for quick edge status checks
 */
function buildViolationMap(
  violations: ConstraintViolation[]
): Map<string, ConstraintViolation> {
  const map = new Map<string, ConstraintViolation>();

  for (const v of violations) {
    // Index by player-match combinations
    for (const playerId of v.playerIds) {
      for (const matchId of v.matchIds) {
        const key = `${playerId}-${matchId}`;
        // Keep the most severe violation
        const existing = map.get(key);
        if (!existing || (existing.severity === 'soft' && v.severity === 'hard')) {
          map.set(key, v);
        }
      }
    }
  }

  return map;
}

/**
 * Determine the edge status based on violations
 */
function determineEdgeStatus(
  player1: string,
  player2: string,
  matchId: string,
  violationMap: Map<string, ConstraintViolation>
): 'conflict' | 'resolved' | 'soft_violation' {
  const v1 = violationMap.get(`${player1}-${matchId}`);
  const v2 = violationMap.get(`${player2}-${matchId}`);

  if (v1?.severity === 'hard' || v2?.severity === 'hard') {
    return 'conflict';
  }
  if (v1?.severity === 'soft' || v2?.severity === 'soft') {
    return 'soft_violation';
  }
  return 'resolved';
}
