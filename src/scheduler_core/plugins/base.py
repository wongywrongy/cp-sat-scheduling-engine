"""Plugin interfaces for constraints and objectives.

This module defines the abstract base classes for extending the scheduling
engine with custom constraints and objectives.
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional

from ortools.sat.python import cp_model

from scheduler_core.domain.models import Match, Player, PreviousAssignment, ScheduleConfig


class ConstraintPlugin(ABC):
    """Base class for constraint plugins.
    
    Constraint plugins add hard constraints to the CP-SAT model.
    They are called during model building and can add constraints
    to the model based on matches, players, and configuration.
    """
    
    @abstractmethod
    def apply(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        infeasible_reasons: List[str],
    ) -> None:
        """Apply this constraint to the model.
        
        Args:
            model: The CP-SAT model to add constraints to
            matches: Dictionary of match_id -> Match
            players: Dictionary of player_id -> Player
            previous_assignments: Dictionary of match_id -> PreviousAssignment
            config: Schedule configuration
            x: Decision variables x[(match_id, slot, court)]
            start_slot: Start slot variables for each match
            end_slot: End slot variables for each match
            infeasible_reasons: List to append infeasibility reasons to
        """
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Return the name of this constraint plugin."""
        pass


class ObjectivePlugin(ABC):
    """Base class for objective plugins.

    Objective plugins add terms to the objective function.
    They are called during model building. Canonical interface: terms(model, vars, context).
    """

    @abstractmethod
    def get_objective_terms(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        rest_slack: Dict[tuple[str, str, str], cp_model.IntVar],
        locked_matches: set[str],
    ) -> List[cp_model.IntVar]:
        """Get objective terms to add to the model. Override in subclasses."""
        pass

    def terms(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        rest_slack: Dict[tuple[str, str, str], cp_model.IntVar],
        locked_matches: set[str],
    ) -> List[cp_model.IntVar]:
        """Canonical interface: delegates to get_objective_terms."""
        return self.get_objective_terms(
            model, matches, players, previous_assignments, config,
            x, start_slot, end_slot, rest_slack, locked_matches,
        )

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the name of this objective plugin."""
        pass
