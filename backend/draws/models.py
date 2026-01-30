"""Draw-specific database models."""
from sqlalchemy import Column, String, Integer, ForeignKey, Enum, JSON, DateTime, Boolean, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class Discipline(str, enum.Enum):
    """Match discipline type."""
    SINGLES = "singles"
    DOUBLES = "doubles"
    MIXED = "mixed"


class GenderCategory(str, enum.Enum):
    """Gender category for events."""
    MEN = "men"
    WOMEN = "women"
    MIXED = "mixed"
    OPEN = "open"


class DrawFormat(str, enum.Enum):
    SINGLE_ELIMINATION = "single_elimination"
    ROUND_ROBIN = "round_robin"
    POOL_KNOCKOUT = "pool_knockout"
    SWISS = "swiss"
    DOUBLE_ELIMINATION = "double_elimination"


class DrawStatus(str, enum.Enum):
    DRAFT = "draft"
    GENERATED = "generated"
    LOCKED = "locked"


class MatchStatus(str, enum.Enum):
    PENDING = "pending"  # Dependencies not met
    READY = "ready"  # Dependencies satisfied, can be scheduled
    SCHEDULED = "scheduled"  # Assigned to slot/court
    FINISHED = "finished"  # Match completed


class EntryMemberRole(str, enum.Enum):
    """Role of a player in an entry."""
    PLAYER1 = "player1"
    PLAYER2 = "player2"


class Division(Base):
    """Event category/division - replaces hardcoded EventCode enum.
    
    Examples:
    - Men's Singles A: discipline=singles, gender_category=men, level_label="A"
    - Women's Doubles B: discipline=doubles, gender_category=women, level_label="B"
    - Mixed Doubles Open: discipline=mixed, gender_category=mixed, level_label="Open"
    """
    __tablename__ = "divisions"

    id = Column(String, primary_key=True, index=True)
    tournament_id = Column(String, ForeignKey("tournaments.id"), nullable=False, index=True)
    discipline = Column(Enum(Discipline), nullable=False)  # singles/doubles/mixed
    gender_category = Column(Enum(GenderCategory), nullable=False)  # men/women/mixed/open
    level_label = Column(String, nullable=False)  # "A", "B", "C", "Beginner", "Intermediate", "Open", "U19", etc.
    code = Column(String, nullable=True)  # Optional short code (e.g., "MS-A", "WD-B")
    sort_order = Column(Integer, nullable=False, default=0)  # For ordering divisions in UI
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tournament = relationship("Tournament", backref="divisions")
    events = relationship("Event", back_populates="division", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="division", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        UniqueConstraint('tournament_id', 'code', name='uq_division_tournament_code'),  # Code unique per tournament
        Index('ix_divisions_tournament_discipline', 'tournament_id', 'discipline'),
        Index('ix_divisions_tournament_gender', 'tournament_id', 'gender_category'),
    )


class Event(Base):
    """Event/competition within a division. A division can have multiple events (e.g., different formats)."""
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    tournament_id = Column(String, ForeignKey("tournaments.id"), nullable=False, index=True)
    division_id = Column(String, ForeignKey("divisions.id"), nullable=False, index=True)
    name = Column(String, nullable=False)  # Display name (e.g., "Men's Singles A")
    draw_format = Column(Enum(DrawFormat), nullable=True)
    parameters = Column(JSON, nullable=True)  # Draw-specific parameters
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tournament = relationship("Tournament", backref="events")
    division = relationship("Division", back_populates="events")
    entries = relationship("Entry", back_populates="event", cascade="all, delete-orphan")
    draws = relationship("Draw", back_populates="event", cascade="all, delete-orphan")


class Entry(Base):
    """Entry/competitor in an event (single player or pair)."""
    __tablename__ = "entries"

    id = Column(String, primary_key=True, index=True)
    event_id = Column(String, ForeignKey("events.id"), nullable=False, index=True)
    participant_ids = Column(JSON, nullable=True)  # Deprecated - use entry_members instead. Kept for backwards compatibility.
    seed = Column(Integer, nullable=True)  # Seed number (1 = top seed)
    entry_metadata = Column(JSON, nullable=True)  # Additional entry metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    event = relationship("Event", back_populates="entries")
    members = relationship("EntryMember", back_populates="entry", cascade="all, delete-orphan")


class EntryMember(Base):
    """Links entries to players with roles (player1/player2)."""
    __tablename__ = "entry_members"

    id = Column(String, primary_key=True, index=True)
    entry_id = Column(String, ForeignKey("entries.id"), nullable=False, index=True)
    player_id = Column(String, ForeignKey("players.id"), nullable=False, index=True)
    role = Column(Enum(EntryMemberRole), nullable=False)  # player1 or player2
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    entry = relationship("Entry", back_populates="members")
    player = relationship("Player", backref="entry_memberships")

    # Constraints
    __table_args__ = (
        UniqueConstraint('entry_id', 'role', name='uq_entry_member_role'),  # One player1, one player2 per entry
        Index('ix_entry_members_entry', 'entry_id'),
        Index('ix_entry_members_player', 'player_id'),
    )


class Draw(Base):
    __tablename__ = "draws"

    id = Column(String, primary_key=True, index=True)
    event_id = Column(String, ForeignKey("events.id"), nullable=False, index=True)
    format = Column(Enum(DrawFormat), nullable=False)
    status = Column(Enum(DrawStatus), nullable=False, server_default='DRAFT')
    draw_metadata = Column(JSON, nullable=True)  # Draw-specific metadata (groups, rounds, etc.) (renamed from 'metadata' to avoid SQLAlchemy conflict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    event = relationship("Event", back_populates="draws")
