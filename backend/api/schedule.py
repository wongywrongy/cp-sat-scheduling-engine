"""Schedule API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ScheduleDTO, ScheduleView, MatchStateDTO
from app.models import Schedule, Match, Tournament, SolverStatus
from services.tournament_service import TournamentService
from services.roster_service import RosterService
import uuid
import sys
import os

# Add project root to path to import scheduler_core
# backend/api/schedule.py -> backend -> project root -> src
backend_dir = os.path.dirname(os.path.dirname(__file__))
project_root = os.path.dirname(backend_dir)
src_path = os.path.join(project_root, 'src')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

try:
    from src.app.schemas import ScheduleRequest, ScheduleResponse, ScheduleConfig, PlayerInput, MatchInput, PreviousAssignment
    from src.adapters.fastapi.routes import create_schedule
except ImportError as e:
    # Fallback: try relative import if src is not available
    print(f"Warning: Could not import from src: {e}")
    # These will need to be defined locally or imported from elsewhere
    ScheduleRequest = None
    ScheduleResponse = None
    ScheduleConfig = None
    PlayerInput = None
    MatchInput = None
    PreviousAssignment = None
    create_schedule = None

router = APIRouter(prefix="/tournaments/{tournament_id}/schedule", tags=["schedule"])


@router.post("/generate", response_model=ScheduleDTO)
async def generate_schedule(
    tournament_id: str,
    db: Session = Depends(get_db)
):
    """Generate schedule for a tournament."""
    tournament = TournamentService.get_tournament(db, tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    config = tournament.config
    
    # Get players
    players = RosterService.list_players(db, tournament_id)
    
    # Get matches - all matches are ready for scheduling
    matches = db.query(Match).filter(Match.tournament_id == tournament_id).all()
    
    # Convert to scheduler_core format
    schedule_config = _convert_to_schedule_config(config)
    player_inputs = _convert_players_to_input(players, config)
    match_inputs = _convert_matches_to_input(matches)
    
    # Get previous assignments if schedule exists
    previous_schedule = db.query(Schedule).filter(
        Schedule.tournament_id == tournament_id
    ).order_by(Schedule.created_at.desc()).first()
    
    previous_assignments = []
    if previous_schedule:
        for assignment in previous_schedule.assignments:
            previous_assignments.append(PreviousAssignment(
                matchId=assignment['matchId'],
                slotId=assignment['slotId'],
                courtId=assignment['courtId'],
                locked=False,
            ))
    
    # Create schedule request
    request = ScheduleRequest(
        config=schedule_config,
        players=player_inputs,
        matches=match_inputs,
        previousAssignments=previous_assignments,
    )
    
    # Call scheduler
    response: ScheduleResponse = await create_schedule(request)
    
    # Convert response to ScheduleDTO
    schedule_dto = _convert_response_to_dto(response)
    
    # Save schedule to database
    schedule_id = str(uuid.uuid4())
    db_schedule = Schedule(
        id=schedule_id,
        tournament_id=tournament_id,
        assignments=[a.model_dump() for a in response.assignments],
        status=SolverStatus(response.status.value),
        objective_score=response.objectiveScore,
        unscheduled_matches=response.unscheduledMatches,
        soft_violations=[v.model_dump() for v in response.softViolations],
        infeasible_reasons=response.infeasibleReasons,
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    
    return schedule_dto


@router.post("/reoptimize", response_model=ScheduleDTO)
async def reoptimize_schedule(
    tournament_id: str,
    db: Session = Depends(get_db)
):
    """Re-optimize existing schedule."""
    # Same as generate, but includes previous assignments as locked
    return await generate_schedule(tournament_id, db)


@router.get("", response_model=ScheduleDTO)
async def get_schedule(
    tournament_id: str,
    view: ScheduleView = Query(default=ScheduleView.TIMESLOT),
    db: Session = Depends(get_db)
):
    """Get the latest schedule for a tournament."""
    schedule = db.query(Schedule).filter(
        Schedule.tournament_id == tournament_id
    ).order_by(Schedule.created_at.desc()).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return _schedule_to_dto(schedule)


@router.post("/matches/{match_id}/state", response_model=MatchStateDTO)
async def update_match_state(
    tournament_id: str,
    match_id: str,
    state: MatchStateDTO,
    db: Session = Depends(get_db)
):
    """Update match state (for match desk operations)."""
    match = db.query(Match).filter(
        Match.id == match_id,
        Match.tournament_id == tournament_id
    ).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Store state in match tags or separate table (simplified: store in tags)
    if not match.tags:
        match.tags = []
    
    # Update tags with state
    match.tags = [tag for tag in match.tags if not tag.startswith('state:')]
    match.tags.append(f"state:{state.status}")
    
    if state.score:
        match.tags.append(f"score:{state.score.sideA}-{state.score.sideB}")
    
    db.commit()
    db.refresh(match)
    
    return state


def _convert_to_schedule_config(config: dict) -> ScheduleConfig:
    """Convert tournament config to ScheduleConfig."""
    from app.schemas import TournamentConfig
    tc = TournamentConfig(**config)
    
    # Calculate total slots
    start_minutes = _time_to_minutes(tc.dayStart)
    end_minutes = _time_to_minutes(tc.dayEnd)
    total_minutes = end_minutes - start_minutes
    total_slots = total_minutes // tc.intervalMinutes
    
    return ScheduleConfig(
        totalSlots=total_slots,
        courtCount=tc.courtCount,
        intervalMinutes=tc.intervalMinutes,
        defaultRestSlots=tc.defaultRestMinutes // tc.intervalMinutes,
        freezeHorizonSlots=tc.freezeHorizonSlots,
        currentSlot=0,
    )


def _convert_players_to_input(players, config: dict) -> list[PlayerInput]:
    """Convert PlayerDTOs to PlayerInputs."""
    from app.schemas import TournamentConfig
    tc = TournamentConfig(**config)
    
    player_inputs = []
    for player in players:
        # Convert availability windows to slots
        availability_slots = []
        for window in player.availability:
            start_slot = _time_to_slot(window.start, tc.dayStart, tc.intervalMinutes)
            end_slot = _time_to_slot(window.end, tc.dayStart, tc.intervalMinutes)
            availability_slots.append((start_slot, end_slot))
        
        player_inputs.append(PlayerInput(
            id=player.id,
            name=player.name,
            availability=availability_slots,
            restSlots=player.minRestMinutes // tc.intervalMinutes,
            restIsHard=True,
        ))
    
    return player_inputs


def _convert_matches_to_input(matches) -> list[MatchInput]:
    """Convert Match models to MatchInputs."""
    match_inputs = []
    for match in matches:
        # Use event_rank if available, otherwise generate from tags or match ID
        event_code = match.event_rank if match.event_rank else (
            match.tags[0] if match.tags and len(match.tags) > 0 else f"MATCH-{match.id[:8]}"
        )
        match_inputs.append(MatchInput(
            id=match.id,
            eventCode=event_code,
            durationSlots=match.duration_slots,
            sideA=list(match.side_a) if match.side_a else [],
            sideB=list(match.side_b) if match.side_b else [],
        ))
    return match_inputs


def _convert_response_to_dto(response: ScheduleResponse) -> ScheduleDTO:
    """Convert ScheduleResponse to ScheduleDTO."""
    from app.schemas import ScheduleAssignment, SoftViolation
    
    assignments = [
        ScheduleAssignment(
            matchId=a.matchId,
            slotId=a.slotId,
            courtId=a.courtId,
            durationSlots=a.durationSlots,
        )
        for a in response.assignments
    ]
    
    soft_violations = [
        SoftViolation(
            type=v.type,
            matchId=v.matchId,
            playerId=v.playerId,
            description=v.description,
            penaltyIncurred=v.penaltyIncurred,
        )
        for v in response.softViolations
    ]
    
    return ScheduleDTO(
        assignments=assignments,
        unscheduledMatches=response.unscheduledMatches,
        softViolations=soft_violations,
        objectiveScore=response.objectiveScore,
        infeasibleReasons=response.infeasibleReasons,
        status=SolverStatus(response.status.value),
    )


def _schedule_to_dto(schedule: Schedule) -> ScheduleDTO:
    """Convert Schedule model to ScheduleDTO."""
    from app.schemas import ScheduleAssignment, SoftViolation
    
    assignments = [
        ScheduleAssignment(**a) if isinstance(a, dict) else a
        for a in schedule.assignments
    ]
    
    soft_violations = [
        SoftViolation(**v) if isinstance(v, dict) else v
        for v in schedule.soft_violations
    ]
    
    return ScheduleDTO(
        assignments=assignments,
        unscheduledMatches=schedule.unscheduled_matches,
        softViolations=soft_violations,
        objectiveScore=schedule.objective_score,
        infeasibleReasons=schedule.infeasible_reasons,
        status=SolverStatus(schedule.status.value),
    )


def _time_to_minutes(time: str) -> int:
    """Convert HH:mm to minutes."""
    hours, minutes = map(int, time.split(':'))
    return hours * 60 + minutes


def _time_to_slot(time: str, day_start: str, interval_minutes: int) -> int:
    """Convert time to slot number."""
    start_minutes = _time_to_minutes(day_start)
    time_minutes = _time_to_minutes(time)
    return (time_minutes - start_minutes) // interval_minutes


