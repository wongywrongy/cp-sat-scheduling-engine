"""Event service - CRUD operations for events."""
from sqlalchemy.orm import Session
from draws.models import Event, Division
from draws.schemas import EventCreate, EventUpdate
from draws.services.division_service import DivisionService
import uuid


class EventService:
    """Service for event management."""

    @staticmethod
    def create_event(db: Session, tournament_id: str, event_data: EventCreate) -> Event:
        """Create a new event."""
        # Verify division exists and belongs to tournament
        division = DivisionService.get_division(db, tournament_id, event_data.divisionId)
        if not division:
            raise ValueError(f"Division {event_data.divisionId} not found in tournament {tournament_id}")
        
        event_id = str(uuid.uuid4())
        event = Event(
            id=event_id,
            tournament_id=tournament_id,
            division_id=event_data.divisionId,
            name=event_data.name,
            draw_format=event_data.drawFormat,
            parameters=event_data.parameters,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def get_event(db: Session, tournament_id: str, event_id: str) -> Event | None:
        """Get event by ID."""
        return db.query(Event).filter(
            Event.id == event_id,
            Event.tournament_id == tournament_id
        ).first()

    @staticmethod
    def list_events(db: Session, tournament_id: str) -> list[Event]:
        """List all events for a tournament."""
        return db.query(Event).filter(Event.tournament_id == tournament_id).all()

    @staticmethod
    def update_event(
        db: Session, tournament_id: str, event_id: str, updates: EventUpdate
    ) -> Event | None:
        """Update event."""
        event = EventService.get_event(db, tournament_id, event_id)
        if not event:
            return None
        
        if updates.name is not None:
            event.name = updates.name
        if updates.drawFormat is not None:
            event.draw_format = updates.drawFormat
        if updates.parameters is not None:
            event.parameters = updates.parameters
        
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def delete_event(db: Session, tournament_id: str, event_id: str) -> bool:
        """Delete event."""
        event = EventService.get_event(db, tournament_id, event_id)
        if not event:
            return False
        
        db.delete(event)
        db.commit()
        return True
