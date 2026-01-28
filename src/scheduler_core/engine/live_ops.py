"""Live Operations / Re-optimization.

Update actuals, lock/freeze near-term schedule, reschedule remaining units.
Handle overruns, no-shows, court outage.
"""

from dataclasses import dataclass
from typing import List, Optional, Set

from scheduler_core.domain.models import ScheduleConfig, ScheduleResult
from scheduler_core.domain.tournament import (
    PlayUnitId,
    Result,
    TournamentAssignment,
    TournamentState,
    WinnerSide,
)
from scheduler_core.engine.backends import SchedulingBackend
from scheduler_core.engine.bridge import BridgeOptions, SchedulingProblemBuilder


@dataclass
class LiveOpsConfig:
    """Config for live ops: freeze horizon, current slot, etc."""

    freeze_horizon_slots: int = 0
    current_slot: int = 0
    rolling_horizon_slots: Optional[int] = None
    max_units: Optional[int] = None


def update_actuals(
    state: TournamentState,
    unit_id: PlayUnitId,
    actual_start_slot: int,
    actual_end_slot: int,
) -> None:
    """Update actual start/end times for a PlayUnit's assignment."""
    ta = state.assignments.get(unit_id)
    if not ta:
        return
    ta.actual_start_slot = actual_start_slot
    ta.actual_end_slot = actual_end_slot


def apply_freeze_horizon(
    state: TournamentState,
    config: ScheduleConfig,
) -> None:
    """Mark assignments in [current_slot, current_slot + freeze_horizon_slots) as locked."""
    current = config.current_slot
    horizon = config.freeze_horizon_slots
    freeze_until = current + horizon
    for uid, ta in state.assignments.items():
        if current <= ta.slot_id < freeze_until:
            ta.locked = True


def result_from_schedule(
    state: TournamentState,
    backend_result: ScheduleResult,
) -> None:
    """Apply ScheduleResult.assignments -> state.assignments (TournamentAssignment)."""
    for a in backend_result.assignments:
        ta = TournamentAssignment(
            play_unit_id=a.match_id,
            slot_id=a.slot_id,
            court_id=a.court_id,
            duration_slots=a.duration_slots,
            locked=False,
        )
        state.assignments[a.match_id] = ta


def reschedule(
    state: TournamentState,
    ready_unit_ids: List[PlayUnitId],
    config: ScheduleConfig,
    backend: SchedulingBackend,
    bridge_options: Optional[BridgeOptions] = None,
    live_config: Optional[LiveOpsConfig] = None,
) -> ScheduleResult:
    """Build request from state + ready units, solve, return result.

    Only non-frozen, non-locked units are rescheduled; frozen/locked
    are passed as previous_assignments.
    """
    base = bridge_options or BridgeOptions()
    live = live_config or LiveOpsConfig()
    opts = BridgeOptions(
        rolling_horizon_slots=live.rolling_horizon_slots if live.rolling_horizon_slots is not None else base.rolling_horizon_slots,
        max_units=live.max_units if live.max_units is not None else base.max_units,
        freeze_horizon_slots=live.freeze_horizon_slots if live.freeze_horizon_slots is not None else base.freeze_horizon_slots,
        current_slot=live.current_slot if live.current_slot is not None else base.current_slot,
    )

    builder = SchedulingProblemBuilder()
    request = builder.build(state, ready_unit_ids, config, opts)
    result = backend.solve(request)
    return result


def handle_overrun(
    state: TournamentState,
    unit_id: PlayUnitId,
    actual_end_slot: int,
) -> None:
    """Record overrun: actual duration > estimated. Update actuals; callers may reschedule."""
    ta = state.assignments.get(unit_id)
    if not ta:
        return
    update_actuals(state, unit_id, ta.slot_id, actual_end_slot)


def handle_no_show(
    state: TournamentState,
    unit_id: PlayUnitId,
    winner_side: WinnerSide,
) -> None:
    """Record no-show as walkover. Update result; advancement policies use it."""
    state.results[unit_id] = Result(
        winner_side=winner_side,
        walkover=True,
    )


def handle_court_outage(
    config: ScheduleConfig,
    excluded_court_ids: Set[int],
) -> ScheduleConfig:
    """Return a config with reduced court set. Callers reschedule affected units."""
    available = [c for c in range(1, config.court_count + 1) if c not in excluded_court_ids]
    new_count = len(available)
    return ScheduleConfig(
        total_slots=config.total_slots,
        court_count=max(1, new_count),
        interval_minutes=config.interval_minutes,
        default_rest_slots=config.default_rest_slots,
        freeze_horizon_slots=config.freeze_horizon_slots,
        current_slot=config.current_slot,
        soft_rest_enabled=config.soft_rest_enabled,
        rest_slack_penalty=config.rest_slack_penalty,
        disruption_penalty=config.disruption_penalty,
        late_finish_penalty=config.late_finish_penalty,
        court_change_penalty=config.court_change_penalty,
    )
