"""Pairing / generation policies (format plugins).

Given participants + seed + format parameters, generate initial PlayUnits.
Stateless, deterministic for same inputs + seed. Does not schedule.
"""

from abc import ABC, abstractmethod
import random
from typing import Any, Dict, List, Optional

from scheduler_core.competition.graph import CompetitionGraph
from scheduler_core.domain.tournament import (
    Event,
    EventId,
    Participant,
    ParticipantId,
    PlayUnit,
    PlayUnitId,
    PlayUnitKind,
)


class GenerationPolicy(ABC):
    """Format plugin that generates initial PlayUnits into the competition graph."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Plugin name (e.g. bracket, pool, swiss, scrimmage)."""
        ...

    @abstractmethod
    def generate(
        self,
        participants: List[Participant],
        event: Event,
        seed: Optional[int],
        graph: CompetitionGraph,
    ) -> None:
        """Generate initial PlayUnits and add them to the graph. Mutates graph.

        Stateless, deterministic for same participants, event, seed.
        """
        ...

    def generate_initial_units(
        self,
        participants: List[Participant],
        event: Event,
        seed: Optional[int],
        graph: CompetitionGraph,
    ) -> None:
        """Canonical interface: same as generate. Override generate in subclasses."""
        self.generate(participants, event, seed, graph)


# Canonical alias (competition-layer plugin)
FormatPlugin = GenerationPolicy


def _participant_ids(participants: List[Participant]) -> List[ParticipantId]:
    return [p.id for p in participants]


def _shuffle_with_seed(ids: List[ParticipantId], seed: Optional[int]) -> List[ParticipantId]:
    out = list(ids)
    rng = random.Random(seed)
    rng.shuffle(out)
    return out


class BracketGenerationPolicy(GenerationPolicy):
    """Knockout bracket: round-1 matches only. Advancement creates later rounds."""

    @property
    def name(self) -> str:
        return "bracket"

    def generate(
        self,
        participants: List[Participant],
        event: Event,
        seed: Optional[int],
        graph: CompetitionGraph,
    ) -> None:
        ids = _participant_ids(participants)
        n = len(ids)
        if n < 2:
            return

        params = event.parameters or {}
        duration = int(params.get("expected_duration_slots", 1))
        event_id = event.id

        # Power-of-2 bracket size; byes for first (2^k - n) players
        k = 1
        while (1 << k) < n:
            k += 1
        bracket_size = 1 << k
        num_byes = bracket_size - n
        # Byes: first num_byes players get bye (advance without match)
        # Remaining (bracket_size - num_byes) = 2*n - bracket_size play round-1
        num_matches_r1 = (bracket_size - num_byes) // 2
        # Paired: (bye+0, bye+1), (bye+2, bye+3), ...
        shuffled = _shuffle_with_seed(ids, seed)

        for i in range(num_matches_r1):
            a = shuffled[2 * i]
            b = shuffled[2 * i + 1]
            uid: PlayUnitId = f"{event_id}-r1-{i}"
            unit = PlayUnit(
                id=uid,
                event_id=event_id,
                side_a=[a],
                side_b=[b],
                expected_duration_slots=duration,
                dependencies=[],
                metadata={"round": 1, "bracket_match": i},
                kind=PlayUnitKind.MATCH,
            )
            graph.add_unit(unit)


class PoolGenerationPolicy(GenerationPolicy):
    """Round-robin pool(s). All vs all. No advancement."""

    @property
    def name(self) -> str:
        return "pool"

    def generate(
        self,
        participants: List[Participant],
        event: Event,
        seed: Optional[int],
        graph: CompetitionGraph,
    ) -> None:
        ids = _participant_ids(participants)
        n = len(ids)
        if n < 2:
            return

        params = event.parameters or {}
        pool_size = int(params.get("pool_size", n))
        expected_duration_slots = int(params.get("expected_duration_slots", 1))
        event_id = event.id

        # Single pool or multiple pools
        if pool_size >= n:
            pools: List[List[ParticipantId]] = [_shuffle_with_seed(ids, seed)]
        else:
            shuffled = _shuffle_with_seed(ids, seed)
            pools = []
            for i in range(0, len(shuffled), pool_size):
                pools.append(shuffled[i : i + pool_size])

        match_idx = 0
        for pool_idx, pool in enumerate(pools):
            for i in range(len(pool)):
                for j in range(i + 1, len(pool)):
                    a, b = pool[i], pool[j]
                    uid: PlayUnitId = f"{event_id}-pool{pool_idx}-m{match_idx}"
                    unit = PlayUnit(
                        id=uid,
                        event_id=event_id,
                        side_a=[a],
                        side_b=[b],
                        expected_duration_slots=expected_duration_slots,
                        dependencies=[],
                        metadata={"pool": pool_idx, "round": 0},
                        kind=PlayUnitKind.MATCH,
                    )
                    graph.add_unit(unit)
                    match_idx += 1
