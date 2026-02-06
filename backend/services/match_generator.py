"""Match generation service - generates matches based on rules."""
from typing import List
from app.schemas import MatchDTO, MatchGenerationRule, PlayerDTO, MatchType
from app.models import RosterGroup


class MatchGeneratorService:
    """Service for generating matches from rules."""

    @staticmethod
    def generate_matches(
        rule: MatchGenerationRule,
        players_a: List[PlayerDTO],
        players_b: List[PlayerDTO],
        roster_groups: List[RosterGroup],
        tournament_id: str,
    ) -> List[MatchDTO]:
        """Generate matches based on the rule."""
        matches: List[MatchDTO] = []
        match_counter = 1

        if rule.type == 'all_vs_all':
            matches = MatchGeneratorService._generate_all_vs_all(
                rule, players_a, players_b, roster_groups, tournament_id, match_counter
            )
        elif rule.type == 'round_robin':
            matches = MatchGeneratorService._generate_round_robin(
                rule, players_a, players_b, tournament_id, match_counter
            )

        # Apply constraints
        if rule.constraints:
            matches = MatchGeneratorService._apply_constraints(matches, rule, roster_groups)

        return matches

    @staticmethod
    def _generate_all_vs_all(
        rule: MatchGenerationRule,
        players_a: List[PlayerDTO],
        players_b: List[PlayerDTO],
        roster_groups: List[RosterGroup],
        tournament_id: str,
        start_counter: int,
    ) -> List[MatchDTO]:
        """Generate all vs all matches."""
        matches: List[MatchDTO] = []
        match_counter = start_counter

        for i in range(0, len(players_a), rule.playersPerSide):
            side_a = [p.id for p in players_a[i:i + rule.playersPerSide]]
            if len(side_a) < rule.playersPerSide:
                break

            for j in range(0, len(players_b), rule.playersPerSide):
                side_b = [p.id for p in players_b[j:j + rule.playersPerSide]]
                if len(side_b) < rule.playersPerSide:
                    break

                # Skip if same players (for within-roster generation)
                if rule.rosterAId == rule.rosterBId and all(pid in side_b for pid in side_a):
                    continue

                # Check avoidSameGroup constraint
                if rule.constraints and rule.constraints.avoidSameGroup:
                    group_a = next((g for g in roster_groups if side_a[0] in g.playerIds), None)
                    group_b = next((g for g in roster_groups if side_b[0] in g.playerIds), None)
                    if group_a and group_b and group_a.id == group_b.id:
                        continue

                matches.append(MatchDTO(
                    id=f"auto-{match_counter}",
                    eventCode=f"AUTO-{match_counter}",
                    matchType=MatchType.AUTO_GENERATED,
                    sideA=side_a,
                    sideB=side_b,
                    durationSlots=1,
                    generationRule=rule,
                ))
                match_counter += 1

        return matches

    @staticmethod
    def _generate_round_robin(
        rule: MatchGenerationRule,
        players_a: List[PlayerDTO],
        players_b: List[PlayerDTO],
        tournament_id: str,
        start_counter: int,
    ) -> List[MatchDTO]:
        """Generate round robin matches."""
        matches: List[MatchDTO] = []
        match_counter = start_counter

        # Combine players, removing duplicates
        all_players = players_a.copy()
        for p_b in players_b:
            if not any(p_a.id == p_b.id for p_a in players_a):
                all_players.append(p_b)

        for i in range(0, len(all_players), rule.playersPerSide):
            side_a = [p.id for p in all_players[i:i + rule.playersPerSide]]
            if len(side_a) < rule.playersPerSide:
                break

            for j in range(i + rule.playersPerSide, len(all_players), rule.playersPerSide):
                side_b = [p.id for p in all_players[j:j + rule.playersPerSide]]
                if len(side_b) < rule.playersPerSide:
                    break

                matches.append(MatchDTO(
                    id=f"auto-{match_counter}",
                    eventCode=f"RR-{match_counter}",
                    matchType=MatchType.AUTO_GENERATED,
                    sideA=side_a,
                    sideB=side_b,
                    durationSlots=1,
                    generationRule=rule,
                ))
                match_counter += 1

        return matches

    @staticmethod
    def _apply_constraints(
        matches: List[MatchDTO],
        rule: MatchGenerationRule,
        roster_groups: List[RosterGroup],
    ) -> List[MatchDTO]:
        """Apply constraints to generated matches."""
        if not rule.constraints:
            return matches

        # Apply maxMatchesPerPlayer constraint
        if rule.constraints.maxMatchesPerPlayer:
            player_match_counts: dict[str, int] = {}
            filtered_matches: List[MatchDTO] = []

            for match in matches:
                all_players_in_match = match.sideA + match.sideB
                would_exceed = any(
                    player_match_counts.get(pid, 0) >= rule.constraints.maxMatchesPerPlayer
                    for pid in all_players_in_match
                )

                if not would_exceed:
                    for pid in all_players_in_match:
                        player_match_counts[pid] = player_match_counts.get(pid, 0) + 1
                    filtered_matches.append(match)

            return filtered_matches

        return matches
