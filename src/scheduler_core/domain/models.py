"""Core domain models for the scheduling engine.

These models are sport-agnostic and form the core of the scheduling library.
They mirror the API schemas but are independent of FastAPI.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Tuple


class SolverStatus(str, Enum):
    """Solver result status."""
    OPTIMAL = "optimal"
    FEASIBLE = "feasible"
    INFEASIBLE = "infeasible"
    UNKNOWN = "unknown"
    MODEL_INVALID = "model_invalid"


@dataclass
class Player:
    """Player with constraints."""
    id: str
    name: str
    availability: List[Tuple[int, int]] = field(default_factory=list)
    rest_slots: int = 1
    rest_is_hard: bool = True
    rest_penalty: float = 10.0


@dataclass
class Match:
    """Match to be scheduled."""
    id: str
    event_code: str
    duration_slots: int = 1
    side_a: List[str] = field(default_factory=list)
    side_b: List[str] = field(default_factory=list)


@dataclass
class PreviousAssignment:
    """Previous assignment for re-optimization."""
    match_id: str
    slot_id: int
    court_id: int
    locked: bool = False
    pinned_slot_id: Optional[int] = None
    pinned_court_id: Optional[int] = None


@dataclass
class ScheduleConfig:
    """Tournament/schedule configuration."""
    total_slots: int
    court_count: int
    interval_minutes: int = 30
    default_rest_slots: int = 1
    freeze_horizon_slots: int = 0
    current_slot: int = 0
    
    # Objective weights
    soft_rest_enabled: bool = False
    rest_slack_penalty: float = 10.0
    disruption_penalty: float = 1.0
    late_finish_penalty: float = 0.5
    court_change_penalty: float = 0.5


@dataclass
class SolverOptions:
    """Solver execution options."""
    time_limit_seconds: float = 5.0
    num_workers: int = 4
    log_progress: bool = False


@dataclass
class Assignment:
    """Scheduled assignment output."""
    match_id: str
    slot_id: int
    court_id: int
    duration_slots: int
    moved: bool = False
    previous_slot_id: Optional[int] = None
    previous_court_id: Optional[int] = None


@dataclass
class SoftViolation:
    """Soft constraint violation."""
    type: str
    match_id: Optional[str] = None
    player_id: Optional[str] = None
    description: str = ""
    penalty_incurred: float = 0.0


@dataclass
class ScheduleResult:
    """Complete scheduling result."""
    status: SolverStatus
    objective_score: Optional[float] = None
    runtime_ms: float = 0.0
    assignments: List[Assignment] = field(default_factory=list)
    soft_violations: List[SoftViolation] = field(default_factory=list)
    infeasible_reasons: List[str] = field(default_factory=list)
    unscheduled_matches: List[str] = field(default_factory=list)
    moved_count: int = 0
    locked_count: int = 0


@dataclass
class ScheduleRequest:
    """Complete scheduling request (core domain)."""
    config: ScheduleConfig
    players: List[Player]
    matches: List[Match]
    previous_assignments: List[PreviousAssignment] = field(default_factory=list)
    solver_options: Optional[SolverOptions] = None
