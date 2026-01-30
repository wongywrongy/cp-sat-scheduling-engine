"""Entry service - CRUD operations for entries."""
from sqlalchemy.orm import Session
from draws.models import Entry, EntryMember, EntryMemberRole, Event, Division, Discipline
from draws.schemas import EntryCreate, EntryUpdate
import uuid


class EntryService:
    """Service for entry management."""

    @staticmethod
    def create_entry(db: Session, event_id: str, entry_data: EntryCreate) -> Entry:
        """Create a new entry with validation."""
        # Get event and division to validate discipline rules
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise ValueError(f"Event {event_id} not found")
        
        division = db.query(Division).filter(Division.id == event.division_id).first()
        if not division:
            raise ValueError(f"Division for event {event_id} not found")
        
        # Validate participant count based on discipline
        participant_count = len(entry_data.participantIds)
        if division.discipline == Discipline.SINGLES:
            if participant_count != 1:
                raise ValueError(f"Singles entries must have exactly 1 player, got {participant_count}")
        elif division.discipline in (Discipline.DOUBLES, Discipline.MIXED):
            if participant_count != 2:
                raise ValueError(f"{division.discipline.value} entries must have exactly 2 players, got {participant_count}")
        
        # Check for duplicate entries (same players in same event)
        existing_entries = db.query(Entry).filter(Entry.event_id == event_id).all()
        for existing_entry in existing_entries:
            existing_members = db.query(EntryMember).filter(
                EntryMember.entry_id == existing_entry.id
            ).all()
            existing_player_ids = {m.player_id for m in existing_members}
            new_player_ids = set(entry_data.participantIds)
            
            if existing_player_ids == new_player_ids:
                raise ValueError(f"Entry with players {entry_data.participantIds} already exists in this event")
        
        # Create entry
        entry_id = str(uuid.uuid4())
        entry = Entry(
            id=entry_id,
            event_id=event_id,
            seed=entry_data.seed,
            entry_metadata=entry_data.metadata,
        )
        db.add(entry)
        db.flush()  # Flush to get entry ID
        
        # Create entry members
        for idx, player_id in enumerate(entry_data.participantIds):
            member_id = str(uuid.uuid4())
            role = EntryMemberRole.PLAYER1 if idx == 0 else EntryMemberRole.PLAYER2
            member = EntryMember(
                id=member_id,
                entry_id=entry_id,
                player_id=player_id,
                role=role,
            )
            db.add(member)
        
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def get_entry(db: Session, event_id: str, entry_id: str) -> Entry | None:
        """Get entry by ID."""
        return db.query(Entry).filter(
            Entry.id == entry_id,
            Entry.event_id == event_id
        ).first()

    @staticmethod
    def list_entries(db: Session, event_id: str) -> list[Entry]:
        """List all entries for an event."""
        return db.query(Entry).filter(Entry.event_id == event_id).all()

    @staticmethod
    def update_entry(
        db: Session, event_id: str, entry_id: str, updates: EntryUpdate
    ) -> Entry | None:
        """Update entry."""
        entry = EntryService.get_entry(db, event_id, entry_id)
        if not entry:
            return None
        
        # If participantIds are being updated, validate and update entry_members
        if updates.participantIds is not None:
            # Get event and division for validation
            event = db.query(Event).filter(Event.id == event_id).first()
            if event:
                division = db.query(Division).filter(Division.id == event.division_id).first()
                if division:
                    participant_count = len(updates.participantIds)
                    if division.discipline == Discipline.SINGLES and participant_count != 1:
                        raise ValueError(f"Singles entries must have exactly 1 player")
                    elif division.discipline in (Discipline.DOUBLES, Discipline.MIXED) and participant_count != 2:
                        raise ValueError(f"{division.discipline.value} entries must have exactly 2 players")
            
            # Delete existing members
            db.query(EntryMember).filter(EntryMember.entry_id == entry_id).delete()
            
            # Create new members
            for idx, player_id in enumerate(updates.participantIds):
                member_id = str(uuid.uuid4())
                role = EntryMemberRole.PLAYER1 if idx == 0 else EntryMemberRole.PLAYER2
                member = EntryMember(
                    id=member_id,
                    entry_id=entry_id,
                    player_id=player_id,
                    role=role,
                )
                db.add(member)
        
        if updates.seed is not None:
            entry.seed = updates.seed
        if updates.metadata is not None:
            entry.entry_metadata = updates.metadata
        
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def delete_entry(db: Session, event_id: str, entry_id: str) -> bool:
        """Delete entry."""
        entry = EntryService.get_entry(db, event_id, entry_id)
        if not entry:
            return False
        
        db.delete(entry)
        db.commit()
        return True

    @staticmethod
    def import_entries(db: Session, event_id: str, entries_data: list[EntryCreate]) -> list[Entry]:
        """Import multiple entries."""
        created_entries = []
        for entry_data in entries_data:
            entry = EntryService.create_entry(db, event_id, entry_data)
            created_entries.append(entry)
        return created_entries
