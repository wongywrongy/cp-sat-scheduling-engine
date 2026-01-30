"""Entry API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from draws.schemas import EntryDTO, EntryCreate, EntryUpdate
from draws.services.entry_service import EntryService
from draws.services.event_service import EventService
from draws.models import EntryMember

router = APIRouter(prefix="/tournaments/{tournament_id}/events/{event_id}/entries", tags=["entries"])


@router.get("", response_model=list[EntryDTO])
async def list_entries(
    tournament_id: str,
    event_id: str,
    db: Session = Depends(get_db)
):
    """List all entries for an event."""
    # Verify event exists
    event = EventService.get_event(db, tournament_id, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    entries = EntryService.list_entries(db, event_id)
    return [_entry_to_dto(db, e) for e in entries]


@router.post("", response_model=EntryDTO)
async def create_entry(
    tournament_id: str,
    event_id: str,
    entry: EntryCreate,
    db: Session = Depends(get_db)
):
    """Create a new entry."""
    # Verify event exists
    event = EventService.get_event(db, tournament_id, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    try:
        created_entry = EntryService.create_entry(db, event_id, entry)
        return _entry_to_dto(db, created_entry)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{entry_id}", response_model=EntryDTO)
async def update_entry(
    tournament_id: str,
    event_id: str,
    entry_id: str,
    updates: EntryUpdate,
    db: Session = Depends(get_db)
):
    """Update an entry."""
    try:
        updated_entry = EntryService.update_entry(db, event_id, entry_id, updates)
        if not updated_entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        return _entry_to_dto(db, updated_entry)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{entry_id}")
async def delete_entry(
    tournament_id: str,
    event_id: str,
    entry_id: str,
    db: Session = Depends(get_db)
):
    """Delete an entry."""
    success = EntryService.delete_entry(db, event_id, entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted"}


def _entry_to_dto(db: Session, entry) -> EntryDTO:
    """Convert Entry model to EntryDTO."""
    # Get participant IDs from entry_members
    members = db.query(EntryMember).filter(
        EntryMember.entry_id == entry.id
    ).order_by(EntryMember.role).all()
    
    participant_ids = [m.player_id for m in members]
    
    return EntryDTO(
        id=entry.id,
        eventId=entry.event_id,
        participantIds=participant_ids,
        seed=entry.seed,
        metadata=entry.entry_metadata,
    )
