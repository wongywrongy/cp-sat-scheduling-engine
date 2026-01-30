"""Draw API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Match
from draws.schemas import DrawDTO, DrawGenerateRequest, DrawMatchDTO
from draws.services.draw_service import DrawService
from draws.services.draw_generator import DrawGeneratorService
from draws.services.event_service import EventService
from draws.models import Draw, DrawStatus

router = APIRouter(prefix="/tournaments/{tournament_id}/events/{event_id}/draw", tags=["draws"])


@router.get("", response_model=DrawDTO | None)
async def get_draw(
    tournament_id: str,
    event_id: str,
    db: Session = Depends(get_db)
):
    """Get the current draw for an event."""
    # Verify event exists
    event = EventService.get_event(db, tournament_id, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    draw = DrawService.get_draw(db, event_id)
    if not draw:
        return None
    
    return _draw_to_dto(draw)


@router.post("/generate", response_model=list[DrawMatchDTO])
async def generate_draw(
    tournament_id: str,
    event_id: str,
    request: DrawGenerateRequest,
    db: Session = Depends(get_db)
):
    """Generate a draw for an event."""
    # Verify event exists
    event = EventService.get_event(db, tournament_id, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    generator_service = DrawGeneratorService()
    
    try:
        # Convert DrawFormat enum to string if needed
        format_value = request.format.value if hasattr(request.format, 'value') else request.format
        draw, matches = generator_service.generate_draw(
            db, event, format_value, request.parameters
        )
        
        # Convert matches to DrawMatchDTO
        return [_match_to_draw_dto(m) for m in matches]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/lock")
async def lock_draw(
    tournament_id: str,
    event_id: str,
    db: Session = Depends(get_db)
):
    """Lock the draw to prevent regeneration."""
    # Verify event exists
    event = EventService.get_event(db, tournament_id, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    draw = DrawService.get_draw(db, event_id)
    if not draw:
        raise HTTPException(status_code=404, detail="Draw not found")
    
    updated_draw = DrawService.update_draw_status(db, draw.id, DrawStatus.LOCKED)
    if not updated_draw:
        raise HTTPException(status_code=404, detail="Draw not found")
    
    return {"message": "Draw locked"}


@router.get("/matches", response_model=list[DrawMatchDTO])
async def get_draw_matches(
    tournament_id: str,
    event_id: str,
    db: Session = Depends(get_db)
):
    """Get all matches from the draw."""
    # Verify event exists
    event = EventService.get_event(db, tournament_id, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get matches by division_id (preferred) or event_code (backwards compatibility)
    matches = db.query(Match).filter(
        Match.tournament_id == tournament_id,
        Match.draw_metadata.isnot(None)
    )
    if event.division_id:
        matches = matches.filter(Match.division_id == event.division_id)
    else:
        # Fallback to event_code for backwards compatibility
        matches = matches.filter(Match.event_code.isnot(None))
    matches = matches.all()
    
    return [_match_to_draw_dto(m) for m in matches]


@router.get("/matches/ready", response_model=list[DrawMatchDTO])
async def get_ready_matches(
    tournament_id: str,
    event_id: str,
    db: Session = Depends(get_db)
):
    """Get matches that are ready to be scheduled (dependencies satisfied)."""
    # Verify event exists
    event = EventService.get_event(db, tournament_id, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get matches by division_id (preferred) or event_code (backwards compatibility)
    all_matches = db.query(Match).filter(
        Match.tournament_id == tournament_id,
        Match.draw_metadata.isnot(None)
    )
    if event.division_id:
        all_matches = all_matches.filter(Match.division_id == event.division_id)
    else:
        # Fallback to event_code for backwards compatibility
        all_matches = all_matches.filter(Match.event_code.isnot(None))
    all_matches = all_matches.all()
    
    # Get finished matches
    finished_match_ids = {
        m.id for m in all_matches
        if m.draw_status == "finished"
    }
    
    # Filter matches where dependencies are satisfied
    ready_matches = []
    for match in all_matches:
        if match.draw_status == "ready":
            ready_matches.append(match)
        elif match.draw_status == "pending" and match.dependencies:
            # Check if all dependencies are finished
            if all(dep_id in finished_match_ids for dep_id in match.dependencies):
                match.draw_status = "ready"
                db.commit()
                ready_matches.append(match)
        elif match.draw_status == "pending" and not match.dependencies:
            # No dependencies, mark as ready
            match.draw_status = "ready"
            db.commit()
            ready_matches.append(match)
    
    return [_match_to_draw_dto(m) for m in ready_matches]


def _draw_to_dto(draw) -> DrawDTO:
    """Convert Draw model to DrawDTO."""
    format_value = draw.format.value if hasattr(draw.format, 'value') else draw.format
    status_value = draw.status.value if hasattr(draw.status, 'value') else draw.status
    
    return DrawDTO(
        id=draw.id,
        eventId=draw.event_id,
        format=format_value,
        status=status_value,
        metadata=draw.draw_metadata,
    )


def _match_to_draw_dto(match: Match) -> DrawMatchDTO:
    """Convert Match model to DrawMatchDTO."""
    from draws.schemas import MatchStatus
    
    draw_status = None
    if match.draw_status:
        try:
            # Handle both enum and string values
            if isinstance(match.draw_status, str):
                draw_status = MatchStatus(match.draw_status)
            else:
                draw_status = match.draw_status
        except (ValueError, TypeError):
            pass
    
    # Derive eventCode from division or use event_code as fallback
    event_code = None
    if match.division and match.division.code:
        event_code = match.division.code
    elif match.event_code:
        event_code = match.event_code
    
    return DrawMatchDTO(
        id=match.id,
        eventCode=event_code or "",
        sideA=list(match.side_a) if match.side_a else [],
        sideB=list(match.side_b) if match.side_b else [],
        dependencies=list(match.dependencies) if match.dependencies else [],
        drawMetadata=match.draw_metadata,
        drawStatus=draw_status,
        durationSlots=match.duration_slots,
        preferredCourt=match.preferred_court,
    )
