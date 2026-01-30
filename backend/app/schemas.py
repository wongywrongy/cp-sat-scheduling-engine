"""Pydantic schemas for API requests/responses - simplified for school sparring."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


# Enums
class SolverStatus(str, Enum):
    OPTIMAL = "optimal"
    FEASIBLE = "feasible"
    INFEASIBLE = "infeasible"
    UNKNOWN = "unknown"


class ScheduleView(str, Enum):
    TIMESLOT = "timeslot"
    COURT = "court"


# Tournament Configuration
class BreakWindow(BaseModel):
    start: str  # HH:mm format
    end: str  # HH:mm format


class TournamentConfig(BaseModel):
    intervalMinutes: int
    dayStart: str  # HH:mm format
    dayEnd: str  # HH:mm format
    breaks: List[BreakWindow]
    courtCount: int
    defaultRestMinutes: int
    freezeHorizonSlots: int


# Availability
class AvailabilityWindow(BaseModel):
    start: str  # HH:mm format
    end: str  # HH:mm format


# Roster Group (for school grouping)
class RosterGroupDTO(BaseModel):
    id: str
    name: str
    metadata: Optional[Dict[str, Any]] = None


# Player
class PlayerDTO(BaseModel):
    id: str
    name: str
    groupId: Optional[str] = None  # School group ID
    rank: Optional[str] = None  # MS1, MS2, WS1, WS2, MD1, WD1, XD1, etc.
    availability: List[AvailabilityWindow] = Field(default_factory=list)
    minRestMinutes: int = 30
    notes: Optional[str] = None


class RosterImportDTO(BaseModel):
    csv: str


# Match - simplified for school sparring (supports dual and tri-meets)
class MatchDTO(BaseModel):
    id: str
    sideA: List[str] = Field(default_factory=list)  # List of player IDs (School A)
    sideB: List[str] = Field(default_factory=list)  # List of player IDs (School B)
    sideC: Optional[List[str]] = None  # List of player IDs (School C) - for tri-meets
    matchType: str = "dual"  # "dual" or "tri"
    eventRank: Optional[str] = None  # MS1, MS2, WS1, WS2, etc. - the rank/event this match represents
    durationSlots: int = 1
    preferredCourt: Optional[int] = None
    tags: Optional[List[str]] = None  # Optional tags like ["School A", "School B"]


class MatchesImportDTO(BaseModel):
    csv: str


# Schedule
class ScheduleAssignment(BaseModel):
    matchId: str
    slotId: int
    courtId: int
    durationSlots: int


class SoftViolation(BaseModel):
    type: str
    matchId: Optional[str] = None
    playerId: Optional[str] = None
    description: str
    penaltyIncurred: float


class ScheduleDTO(BaseModel):
    assignments: List[ScheduleAssignment] = Field(default_factory=list)
    unscheduledMatches: List[str] = Field(default_factory=list)
    softViolations: List[SoftViolation] = Field(default_factory=list)
    objectiveScore: Optional[float] = None
    infeasibleReasons: List[str] = Field(default_factory=list)
    status: SolverStatus


# Match State (for Match Desk)
class MatchScore(BaseModel):
    sideA: int
    sideB: int


class MatchStateDTO(BaseModel):
    status: str  # 'scheduled' | 'called' | 'started' | 'finished'
    score: Optional[MatchScore] = None


# Health
class HealthResponse(BaseModel):
    status: str
    version: str
