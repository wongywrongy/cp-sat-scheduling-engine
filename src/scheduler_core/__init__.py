"""Scheduler core library — competition layer + scheduling layer.

Public API (stable, minimal):
- schedule(problem, *, options?) -> SchedulingResult
- schedule_from_api(request) -> ScheduleResponse  (lazy app import; use from API layer)

Core usable without FastAPI and without importing app schemas.
"""
from scheduler_core.domain import (
    Assignment,
    Match,
    Player,
    PreviousAssignment,
    ScheduleConfig,
    ScheduleRequest,
    ScheduleResult,
    SchedulingProblem,
    SchedulingResult,
    SoftViolation,
    SolverOptions,
    SolverStatus,
    FrameworkError,
    ValidationError,
    InfeasibleError,
)
from scheduler_core.schedule import schedule, schedule_from_api

# Backend + competition (for extension and advanced usage)
from scheduler_core.engine import (
    CPSATBackend,
    CPSATScheduler,
    GreedyBackend,
    SchedulingBackend,
    SchedulingProblemBuilder,
    BridgeOptions,
    LiveOpsConfig,
    reschedule,
    update_actuals,
    apply_freeze_horizon,
    result_from_schedule,
    handle_overrun,
    handle_no_show,
    handle_court_outage,
)
from scheduler_core.competition import (
    CompetitionGraph,
    FormatPlugin,
    GenerationPolicy,
    BracketGenerationPolicy,
    PoolGenerationPolicy,
    AdvancementPolicy,
    KnockoutAdvancementPolicy,
    SwissAdvancementPolicy,
    LadderAdvancementPolicy,
)
from scheduler_core.plugins import ConstraintPlugin, ObjectivePlugin
from scheduler_core.domain.tournament import (
    Event,
    Participant,
    PlayUnit,
    Result,
    TournamentState,
    WinnerSide,
)

__all__ = [
    "schedule",
    "schedule_from_api",
    "SchedulingProblem",
    "SchedulingResult",
    "ScheduleRequest",
    "ScheduleResult",
    "ScheduleConfig",
    "SolverOptions",
    "SolverStatus",
    "Assignment",
    "Match",
    "Player",
    "PreviousAssignment",
    "SoftViolation",
    "FrameworkError",
    "ValidationError",
    "InfeasibleError",
    "CPSATScheduler",
    "CPSATBackend",
    "GreedyBackend",
    "SchedulingBackend",
    "SchedulingProblemBuilder",
    "BridgeOptions",
    "LiveOpsConfig",
    "reschedule",
    "update_actuals",
    "apply_freeze_horizon",
    "result_from_schedule",
    "handle_overrun",
    "handle_no_show",
    "handle_court_outage",
    "CompetitionGraph",
    "FormatPlugin",
    "GenerationPolicy",
    "BracketGenerationPolicy",
    "PoolGenerationPolicy",
    "AdvancementPolicy",
    "KnockoutAdvancementPolicy",
    "SwissAdvancementPolicy",
    "LadderAdvancementPolicy",
    "ConstraintPlugin",
    "ObjectivePlugin",
    "Event",
    "Participant",
    "PlayUnit",
    "Result",
    "TournamentState",
    "WinnerSide",
]
