"""SQLAlchemy database models - simplified for school sparring."""
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, Enum, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class SolverStatus(str, enum.Enum):
    OPTIMAL = "optimal"
    FEASIBLE = "feasible"
    INFEASIBLE = "infeasible"
    UNKNOWN = "unknown"


class Tournament(Base):
    """Simple tournament configuration for school sparring."""
    __tablename__ = "tournaments"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    config = Column(JSON, nullable=False)  # TournamentConfig as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    roster_groups = relationship("RosterGroup", back_populates="tournament", cascade="all, delete-orphan")
    players = relationship("Player", back_populates="tournament", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="tournament", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="tournament", cascade="all, delete-orphan")


class RosterGroup(Base):
    """Simple group model for organizing players by school."""
    __tablename__ = "roster_groups"

    id = Column(String, primary_key=True, index=True)
    tournament_id = Column(String, ForeignKey("tournaments.id"), nullable=False, index=True)
    name = Column(String, nullable=False)  # School name
    group_metadata = Column(JSON, nullable=True)  # Optional metadata (color, description, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tournament = relationship("Tournament", back_populates="roster_groups")
    players = relationship("Player", back_populates="group", cascade="all, delete-orphan")


class Player(Base):
    """Simple player model for school sparring."""
    __tablename__ = "players"

    id = Column(String, primary_key=True, index=True)
    tournament_id = Column(String, ForeignKey("tournaments.id"), nullable=False, index=True)
    group_id = Column(String, ForeignKey("roster_groups.id"), nullable=True, index=True)  # School group
    name = Column(String, nullable=False)
    rank = Column(String, nullable=True)  # MS1, MS2, WS1, WS2, MD1, WD1, XD1, etc.
    availability = Column(JSON, nullable=False, default=list)  # List of {start, end} objects
    min_rest_minutes = Column(Integer, nullable=False, default=30)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tournament = relationship("Tournament", back_populates="players")
    group = relationship("RosterGroup", back_populates="players")


class Match(Base):
    """Match model for school sparring - supports dual meets (2 sides) and tri-meets (3 sides)."""
    __tablename__ = "matches"

    id = Column(String, primary_key=True, index=True)
    tournament_id = Column(String, ForeignKey("tournaments.id"), nullable=False, index=True)
    side_a = Column(JSON, nullable=False)  # List of player IDs (team A)
    side_b = Column(JSON, nullable=False)  # List of player IDs (team B)
    side_c = Column(JSON, nullable=True)  # List of player IDs (team C) - for tri-meets
    match_type = Column(String, nullable=False, default="dual")  # "dual" or "tri"
    event_rank = Column(String, nullable=True)  # MS1, MS2, WS1, WS2, etc. - the rank/event this match represents
    duration_slots = Column(Integer, nullable=False, default=1)
    preferred_court = Column(Integer, nullable=True)
    tags = Column(JSON, nullable=True)  # List of strings (e.g., ["School A", "School B"])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tournament = relationship("Tournament", back_populates="matches")


class Schedule(Base):
    """Schedule for a tournament."""
    __tablename__ = "schedules"

    id = Column(String, primary_key=True, index=True)
    tournament_id = Column(String, ForeignKey("tournaments.id"), nullable=False, index=True)
    assignments = Column(JSON, nullable=False)  # List of ScheduleAssignment objects
    status = Column(Enum(SolverStatus), nullable=False)
    objective_score = Column(Float, nullable=True)
    unscheduled_matches = Column(JSON, nullable=False, default=list)
    soft_violations = Column(JSON, nullable=False, default=list)
    infeasible_reasons = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tournament = relationship("Tournament", back_populates="schedules")
