"""Stateless schedule API endpoint - directly uses scheduler_core engine."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, AsyncGenerator
import json
import asyncio
from app.schemas import (
    TournamentConfig, PlayerDTO, MatchDTO, ScheduleDTO,
    ScheduleAssignment, SoftViolation, SolverStatus
)
import sys
import os

# Add project root to path to import scheduler_core
backend_dir = os.path.dirname(os.path.dirname(__file__))
project_root = os.path.dirname(backend_dir)
scheduler_core_path = os.path.join(project_root, 'src')
if scheduler_core_path not in sys.path:
    sys.path.insert(0, scheduler_core_path)

# Import directly from scheduler_core domain models and engine
try:
    from scheduler_core.domain.models import (
        ScheduleRequest, ScheduleConfig, Player, Match,
        PreviousAssignment, SolverOptions
    )
    from scheduler_core.engine import CPSATBackend
    from scheduler_core.engine.cpsat_backend import CPSATScheduler
except ImportError as e:
    raise ImportError(
        f"Could not import scheduler_core: {e}. "
        "Make sure src/scheduler_core is accessible."
    )

router = APIRouter(prefix="", tags=["schedule"])


class GenerateScheduleRequest(BaseModel):
    """Request to generate a schedule - includes all data needed."""
    config: TournamentConfig
    players: List[PlayerDTO]
    matches: List[MatchDTO]
    previousAssignments: Optional[List[dict]] = None


@router.post("/schedule", response_model=ScheduleDTO)
async def generate_schedule(request: GenerateScheduleRequest):
    """
    Generate optimized schedule for matches.

    This is a stateless endpoint - all data is provided in the request,
    and the schedule is returned without persistence.

    Args:
        request: Contains tournament config, players, and matches

    Returns:
        Optimized schedule with match assignments
    """
    try:
        # Convert to scheduler_core format
        schedule_config = _convert_to_schedule_config(request.config)
        players = _convert_players(request.players, request.config)
        matches = _convert_matches(request.matches)
        previous_assignments = _convert_previous_assignments(request.previousAssignments)

        # Create schedule request for solver
        solver_request = ScheduleRequest(
            config=schedule_config,
            players=players,
            matches=matches,
            previous_assignments=previous_assignments,
            solver_options=SolverOptions(
                time_limit_seconds=30,
                num_workers=4,
                log_progress=False
            )
        )

        # Call CP-SAT solver directly
        backend = CPSATBackend(solver_options=solver_request.solver_options)
        result = backend.solve(solver_request)

        # Convert result to ScheduleDTO and return
        return _convert_result_to_dto(result)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Schedule generation failed: {str(e)}"
        )


@router.post("/schedule/stream")
async def generate_schedule_stream(request: GenerateScheduleRequest):
    """
    Generate schedule with real-time progress updates via Server-Sent Events.

    Streams progress events during optimization:
    - type: 'progress' - intermediate solution found
    - type: 'complete' - optimization finished successfully
    - type: 'error' - optimization failed

    Args:
        request: Contains tournament config, players, and matches

    Returns:
        StreamingResponse with text/event-stream content
    """
    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate Server-Sent Events for progress updates."""
        progress_queue: asyncio.Queue = asyncio.Queue()
        result_holder = {}
        error_holder = {}

        # Get the running event loop BEFORE starting the thread
        loop = asyncio.get_running_loop()

        def progress_callback(progress_data: dict):
            """Called by solver when a new solution is found (from worker thread)."""
            # Thread-safe way to put data in async queue
            loop.call_soon_threadsafe(
                progress_queue.put_nowait,
                {'type': 'progress', **progress_data}
            )

        def solve_in_thread():
            """Run solver in thread pool to avoid blocking event loop."""
            try:
                # Convert to scheduler_core format
                schedule_config = _convert_to_schedule_config(request.config)
                players = _convert_players(request.players, request.config)
                matches = _convert_matches(request.matches)
                previous_assignments = _convert_previous_assignments(request.previousAssignments)

                # Create scheduler with progress callback
                scheduler = CPSATScheduler(
                    config=schedule_config,
                    solver_options=SolverOptions(
                        time_limit_seconds=30,
                        num_workers=4,
                        log_progress=False
                    )
                )
                scheduler.add_players(players)
                scheduler.add_matches(matches)
                scheduler.set_previous_assignments(previous_assignments)
                scheduler.build()

                # Solve with progress callback
                result = scheduler.solve(progress_callback=progress_callback)
                result_holder['result'] = result

            except Exception as e:
                error_holder['error'] = str(e)

            # Signal completion (thread-safe)
            loop.call_soon_threadsafe(
                progress_queue.put_nowait,
                {'type': 'done'}
            )

        # Start solver in background thread
        loop.run_in_executor(None, solve_in_thread)

        # Stream progress events
        while True:
            event = await progress_queue.get()

            if event['type'] == 'done':
                # Send final result or error
                if 'error' in error_holder:
                    yield f"data: {json.dumps({'type': 'error', 'message': error_holder['error']})}\n\n"
                elif 'result' in result_holder:
                    result_dto = _convert_result_to_dto(result_holder['result'])
                    yield f"data: {json.dumps({'type': 'complete', 'result': result_dto.model_dump()})}\n\n"
                break

            elif event['type'] == 'progress':
                # Send progress update
                yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


def _convert_to_schedule_config(config: TournamentConfig) -> ScheduleConfig:
    """Convert TournamentConfig to scheduler_core ScheduleConfig."""
    # Calculate total slots
    start_minutes = _time_to_minutes(config.dayStart)
    end_minutes = _time_to_minutes(config.dayEnd)
    total_minutes = end_minutes - start_minutes
    total_slots = total_minutes // config.intervalMinutes

    # Calculate default rest slots
    default_rest_slots = config.defaultRestMinutes // config.intervalMinutes

    return ScheduleConfig(
        total_slots=total_slots,
        court_count=config.courtCount,
        interval_minutes=config.intervalMinutes,
        default_rest_slots=default_rest_slots,
        freeze_horizon_slots=config.freezeHorizonSlots,
        current_slot=0,
        soft_rest_enabled=False,
        rest_slack_penalty=10.0,
        disruption_penalty=5.0,
        late_finish_penalty=1.0,
        court_change_penalty=2.0,
        enable_court_utilization=config.enableCourtUtilization if config.enableCourtUtilization is not None else True,
        court_utilization_penalty=config.courtUtilizationPenalty if config.courtUtilizationPenalty is not None else 50.0,
    )


def _convert_players(players: List[PlayerDTO], config: TournamentConfig) -> List[Player]:
    """Convert PlayerDTOs to scheduler_core Player objects."""
    player_list = []
    for player in players:
        # Convert availability windows to slot ranges
        availability_slots = []
        for window in player.availability:
            start_slot = _time_to_slot(window.start, config.dayStart, config.intervalMinutes)
            end_slot = _time_to_slot(window.end, config.dayStart, config.intervalMinutes)
            availability_slots.append((start_slot, end_slot))

        # Calculate rest slots from rest minutes (use config default if not specified)
        rest_minutes = player.minRestMinutes if player.minRestMinutes is not None else config.defaultRestMinutes
        rest_slots = rest_minutes // config.intervalMinutes

        player_list.append(Player(
            id=player.id,
            name=player.name,
            availability=availability_slots,  # Empty list means available all day
            rest_slots=rest_slots,
            rest_is_hard=True,  # Always enforce rest as hard constraint
            rest_penalty=10.0,
        ))

    return player_list


def _convert_matches(matches: List[MatchDTO]) -> List[Match]:
    """Convert MatchDTOs to scheduler_core Match objects."""
    match_list = []
    for match in matches:
        # Use eventRank if available, otherwise generate from match ID
        event_code = match.eventRank if match.eventRank else f"MATCH-{match.id[:8]}"

        match_list.append(Match(
            id=match.id,
            event_code=event_code,
            duration_slots=match.durationSlots,
            side_a=match.sideA if match.sideA else [],
            side_b=match.sideB if match.sideB else [],
        ))

    return match_list


def _convert_previous_assignments(assignments_data: Optional[List[dict]]) -> List[PreviousAssignment]:
    """Convert previous assignments from dict format to PreviousAssignment objects."""
    if not assignments_data:
        return []

    previous_assignments = []
    for pa in assignments_data:
        previous_assignments.append(PreviousAssignment(
            match_id=pa.get('matchId', ''),
            slot_id=pa.get('slotId', 0),
            court_id=pa.get('courtId', 0),
            locked=pa.get('locked', False),
            pinned_slot_id=pa.get('pinnedSlotId'),
            pinned_court_id=pa.get('pinnedCourtId'),
        ))

    return previous_assignments


def _convert_result_to_dto(result) -> ScheduleDTO:
    """Convert scheduler_core ScheduleResult to API ScheduleDTO."""
    # Convert assignments
    assignments = [
        ScheduleAssignment(
            matchId=a.match_id,
            slotId=a.slot_id,
            courtId=a.court_id,
            durationSlots=a.duration_slots,
        )
        for a in result.assignments
    ]

    # Convert soft violations
    soft_violations = [
        SoftViolation(
            type=v.type,
            matchId=v.match_id if v.match_id else None,
            playerId=v.player_id if v.player_id else None,
            description=v.description,
            penaltyIncurred=v.penalty_incurred,
        )
        for v in result.soft_violations
    ]

    # Map solver status
    status_map = {
        'optimal': SolverStatus.OPTIMAL,
        'feasible': SolverStatus.FEASIBLE,
        'infeasible': SolverStatus.INFEASIBLE,
        'unknown': SolverStatus.UNKNOWN,
        'model_invalid': SolverStatus.UNKNOWN,
    }
    status = status_map.get(result.status.value.lower(), SolverStatus.UNKNOWN)

    return ScheduleDTO(
        assignments=assignments,
        unscheduledMatches=result.unscheduled_matches,
        softViolations=soft_violations,
        objectiveScore=result.objective_score,
        infeasibleReasons=result.infeasible_reasons,
        status=status,
    )


def _time_to_minutes(time: str) -> int:
    """Convert HH:mm to minutes since midnight."""
    hours, minutes = map(int, time.split(':'))
    return hours * 60 + minutes


def _time_to_slot(time: str, day_start: str, interval_minutes: int) -> int:
    """Convert time to slot number relative to day start."""
    start_minutes = _time_to_minutes(day_start)
    time_minutes = _time_to_minutes(time)
    return (time_minutes - start_minutes) // interval_minutes
