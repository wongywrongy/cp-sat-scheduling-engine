"""Competition graph: DAG of PlayUnits with dependency info.

Represents competition as a graph/DAG of play units. A unit is "ready" iff
all dependencies have a Result and any advancement has been applied.
"""

from typing import Dict, List, Set

from scheduler_core.domain.tournament import (
    PlayUnit,
    PlayUnitId,
    Result,
)


class CompetitionGraph:
    """DAG of PlayUnits. Nodes = units; edges = dependencies (must complete before)."""

    def __init__(
        self,
        play_units: Dict[PlayUnitId, PlayUnit] | None = None,
    ) -> None:
        self.play_units: Dict[PlayUnitId, PlayUnit] = play_units or {}

    def add_unit(self, unit: PlayUnit) -> None:
        """Add a PlayUnit to the graph."""
        self.play_units[unit.id] = unit

    def add_units(self, units: List[PlayUnit]) -> None:
        """Add multiple PlayUnits."""
        for u in units:
            self.add_unit(u)

    def dependency_edges(self) -> List[tuple[PlayUnitId, PlayUnitId]]:
        """Return (u, v) edges where v depends on u (u must finish before v)."""
        edges: List[tuple[PlayUnitId, PlayUnitId]] = []
        for uid, unit in self.play_units.items():
            for dep in unit.dependencies:
                edges.append((dep, uid))
        return edges

    def dependents(self, unit_id: PlayUnitId) -> Set[PlayUnitId]:
        """Units that depend on this unit (this must finish before them)."""
        return {v for u, v in self.dependency_edges() if u == unit_id}

    def ready_unit_ids(self, results: Dict[PlayUnitId, Result]) -> List[PlayUnitId]:
        """Units that exist and have no unmet dependencies (all deps have results)."""
        ready: List[PlayUnitId] = []
        for uid, unit in self.play_units.items():
            if all(dep in results for dep in unit.dependencies):
                ready.append(uid)
        return ready

    def get_unit(self, unit_id: PlayUnitId) -> PlayUnit | None:
        """Return PlayUnit by id."""
        return self.play_units.get(unit_id)
