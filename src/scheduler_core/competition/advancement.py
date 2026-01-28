"""Advancement policies (result -> next).

Given results, update the competition graph: create new PlayUnits,
set side_a/side_b from advancement rules, add dependencies.
Supports partial knowledge (future matches created when prior results exist).
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional

from scheduler_core.competition.graph import CompetitionGraph
from scheduler_core.domain.tournament import (
    EventId,
    PlayUnit,
    PlayUnitId,
    PlayUnitKind,
    Result,
    WinnerSide,
)


class AdvancementPolicy(ABC):
    """Policy that updates the graph when a PlayUnit has a result."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Policy name (e.g. knockout, swiss, ladder)."""
        ...

    @abstractmethod
    def on_result(
        self,
        unit_id: PlayUnitId,
        result: Result,
        graph: CompetitionGraph,
        results_registry: Dict[PlayUnitId, Result],
    ) -> None:
        """Process result for unit_id. Mutates graph; may add units / fix sides.

        results_registry: all results so far (including this one).
        """
        ...

    def apply_result(
        self,
        unit_id: PlayUnitId,
        result: Result,
        graph: CompetitionGraph,
        results_registry: Dict[PlayUnitId, Result],
    ) -> None:
        """Canonical interface: same as on_result. Override on_result in subclasses."""
        self.on_result(unit_id, result, graph, results_registry)


def _winner_id(unit: PlayUnit, result: Result) -> Optional[str]:
    """Return participant id of winner, or None if draw/N/A."""
    if result.winner_side == WinnerSide.NONE:
        return None
    if result.winner_side == WinnerSide.A and unit.side_a:
        return unit.side_a[0]
    if result.winner_side == WinnerSide.B and unit.side_b:
        return unit.side_b[0]
    return None


class KnockoutAdvancementPolicy(AdvancementPolicy):
    """Knockout: winner advances to next round. Creates round-2+ matches when both feeders have results."""

    @property
    def name(self) -> str:
        return "knockout"

    def on_result(
        self,
        unit_id: PlayUnitId,
        result: Result,
        graph: CompetitionGraph,
        results_registry: Dict[PlayUnitId, Result],
    ) -> None:
        unit = graph.get_unit(unit_id)
        if not unit or unit.kind != PlayUnitKind.MATCH:
            return
        meta = unit.metadata or {}
        if meta.get("round") != 1:
            return
        bracket_match = meta.get("bracket_match")
        if bracket_match is None:
            return

        # Round-2 match index: floor(bracket_match / 2)
        r2_idx = bracket_match // 2
        sibling = bracket_match ^ 1
        event_id: EventId = unit.event_id

        # Find sibling round-1 unit (same event, round 1, bracket_match = sibling)
        sibling_id: Optional[PlayUnitId] = None
        for uid, u in graph.play_units.items():
            if u.event_id != event_id:
                continue
            m = u.metadata or {}
            if m.get("round") == 1 and m.get("bracket_match") == sibling:
                sibling_id = uid
                break

        if not sibling_id or sibling_id not in results_registry:
            return

        r1_a = _winner_id(unit, result)
        r1_b = _winner_id(graph.play_units[sibling_id], results_registry[sibling_id])
        if not r1_a or not r1_b:
            return

        # Create round-2 match if not already present
        r2_id: PlayUnitId = f"{event_id}-r2-{r2_idx}"
        if r2_id in graph.play_units:
            return

        params = {}
        for u in graph.play_units.values():
            if u.event_id == event_id and u.metadata:
                params = u.metadata
                break
        duration = 1
        if isinstance(params.get("expected_duration_slots"), (int, float)):
            duration = int(params["expected_duration_slots"])

        r2 = PlayUnit(
            id=r2_id,
            event_id=event_id,
            side_a=[r1_a],
            side_b=[r1_b],
            expected_duration_slots=duration,
            dependencies=[unit_id, sibling_id],
            metadata={"round": 2, "bracket_match": r2_idx},
            kind=PlayUnitKind.MATCH,
        )
        graph.add_unit(r2)


class SwissAdvancementPolicy(AdvancementPolicy):
    """Swiss: after each round, pair by score. Creates next-round matches when round complete.

    Minimal impl: when all round-k matches have results, create round-(k+1)
    matches by pairing 1–2, 3–4, etc. by current points. Standings inferred
    from results_registry (simplified: assume order from prior round).
    """

    @property
    def name(self) -> str:
        return "swiss"

    def on_result(
        self,
        unit_id: PlayUnitId,
        result: Result,
        graph: CompetitionGraph,
        results_registry: Dict[PlayUnitId, Result],
    ) -> None:
        unit = graph.get_unit(unit_id)
        if not unit or unit.kind != PlayUnitKind.MATCH:
            return
        meta = unit.metadata or {}
        round_num = meta.get("round", 0)
        if round_num < 1:
            return
        event_id: EventId = unit.event_id

        # Collect all round-k units for this event
        round_units: List[PlayUnitId] = []
        for uid, u in graph.play_units.items():
            if u.event_id != event_id:
                continue
            m = u.metadata or {}
            if m.get("round") == round_num:
                round_units.append(uid)

        round_units.sort()
        if not all(uid in results_registry for uid in round_units):
            return

        # All round-k results in. Create round-(k+1) matches.
        # Pair 1–2, 3–4, ... by order of round_units (winners only).
        next_round = round_num + 1
        duration = 1
        match_idx = 0
        for i in range(0, len(round_units) - 1, 2):
            uid_a, uid_b = round_units[i], round_units[i + 1]
            u_a = graph.play_units[uid_a]
            u_b = graph.play_units[uid_b]
            w_a = _winner_id(u_a, results_registry[uid_a])
            w_b = _winner_id(u_b, results_registry[uid_b])
            if not w_a or not w_b:
                continue
            r2_id: PlayUnitId = f"{event_id}-r{next_round}-{match_idx}"
            if r2_id in graph.play_units:
                match_idx += 1
                continue
            r2 = PlayUnit(
                id=r2_id,
                event_id=event_id,
                side_a=[w_a],
                side_b=[w_b],
                expected_duration_slots=duration,
                dependencies=[uid_a, uid_b],
                metadata={"round": next_round},
                kind=PlayUnitKind.MATCH,
            )
            graph.add_unit(r2)
            match_idx += 1


class LadderAdvancementPolicy(AdvancementPolicy):
    """Ladder / king-of-the-court: winner stays; next challenger from queue.

    Queue order stored in event parameters or metadata. Advancement creates
    next challenger match (holder = winner, challenger = next in queue).
    """

    @property
    def name(self) -> str:
        return "ladder"

    def on_result(
        self,
        unit_id: PlayUnitId,
        result: Result,
        graph: CompetitionGraph,
        results_registry: Dict[PlayUnitId, Result],
    ) -> None:
        unit = graph.get_unit(unit_id)
        if not unit or unit.kind != PlayUnitKind.MATCH:
            return
        meta = unit.metadata or {}
        if meta.get("format") != "ladder":
            return
        holder = _winner_id(unit, result)
        if not holder:
            return
        queue = meta.get("queue", [])
        if not isinstance(queue, list) or len(queue) < 1:
            return
        challenger = queue[0]
        if challenger == holder:
            if len(queue) < 2:
                return
            challenger = queue[1]
        event_id: EventId = unit.event_id
        next_id: PlayUnitId = f"{event_id}-ladder-{unit_id}"
        if next_id in graph.play_units:
            return
        duration = int(meta.get("expected_duration_slots", 1))
        next_unit = PlayUnit(
            id=next_id,
            event_id=event_id,
            side_a=[holder],
            side_b=[challenger],
            expected_duration_slots=duration,
            dependencies=[unit_id],
            metadata={"format": "ladder", "queue": queue[1:]},
            kind=PlayUnitKind.MATCH,
        )
        graph.add_unit(next_unit)
