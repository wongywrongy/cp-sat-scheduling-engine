"""Event API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from draws.schemas import EventDTO, EventCreate, EventUpdate
from draws.services.event_service import EventService

router = APIRouter(prefix="/tournaments/{tournament_id}/events", tags=["events"])


@router.get("", response_model=list[EventDTO])
async def list_events(
    tournament_id: str,
    db: Session = Depends(get_db)
):
    """List all events for a tournament."""
    events = EventService.list_events(db, tournament_id)
    return [_event_to_dto(e) for e in events]


@router.post("", response_model=EventDTO)
async def create_event(
    tournament_id: str,
    event: EventCreate,
    db: Session = Depends(get_db)
):
    """Create a new event."""
    created_event = EventService.create_event(db, tournament_id, event)
    return _event_to_dto(created_event)


@router.get("/{event_id}", response_model=EventDTO)
async def get_event(
    tournament_id: str,
    event_id: str,
    db: Session = Depends(get_db)
):
    """Get an event by ID."""
    event = EventService.get_event(db, tournament_id, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_to_dto(event)


@router.put("/{event_id}", response_model=EventDTO)
async def update_event(
    tournament_id: str,
    event_id: str,
    updates: EventUpdate,
    db: Session = Depends(get_db)
):
    """Update an event."""
    updated_event = EventService.update_event(db, tournament_id, event_id, updates)
    if not updated_event:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_to_dto(updated_event)


@router.delete("/{event_id}")
async def delete_event(
    tournament_id: str,
    event_id: str,
    db: Session = Depends(get_db)
):
    """Delete an event."""
    success = EventService.delete_event(db, tournament_id, event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}


def _event_to_dto(event) -> EventDTO:
    """Convert Event model to EventDTO."""
    format_value = event.draw_format.value if event.draw_format and hasattr(event.draw_format, 'value') else event.draw_format
    
    # Derive code from division if available
    code_value = None
    if event.division and event.division.code:
        code_value = event.division.code
    
    return EventDTO(
        id=event.id,
        tournamentId=event.tournament_id,
        divisionId=event.division_id,
        code=code_value,
        name=event.name,
        drawFormat=format_value,
        parameters=event.parameters,
    )
