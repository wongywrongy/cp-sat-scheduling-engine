"""Pydantic schemas for draw DTOs."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum


# Enums matching models
class Discipline(str, Enum):
    SINGLES = "singles"
    DOUBLES = "doubles"
    MIXED = "mixed"


class GenderCategory(str, Enum):
    MEN = "men"
    WOMEN = "women"
    MIXED = "mixed"
    OPEN = "open"


class DrawFormat(str, Enum):
    SINGLE_ELIMINATION = "single_elimination"
    ROUND_ROBIN = "round_robin"
    POOL_KNOCKOUT = "pool_knockout"
    SWISS = "swiss"
    DOUBLE_ELIMINATION = "double_elimination"


class DrawStatus(str, Enum):
    DRAFT = "draft"
    GENERATED = "generated"
    LOCKED = "locked"


class MatchStatus(str, Enum):
    PENDING = "pending"
    READY = "ready"
    SCHEDULED = "scheduled"
    FINISHED = "finished"


class EntryMemberRole(str, Enum):
    PLAYER1 = "player1"
    PLAYER2 = "player2"


# Legacy EventCode enum for backwards compatibility (deprecated)
class EventCode(str, Enum):
    MS = "MS"
    WS = "WS"
    MD = "MD"
    WD = "WD"
    XD = "XD"


# Division DTOs
class DivisionDTO(BaseModel):
    id: str
    tournamentId: str
    discipline: Discipline
    genderCategory: GenderCategory
    levelLabel: str
    code: Optional[str] = None
    sortOrder: int = 0

    class Config:
        from_attributes = True
        populate_by_name = True


class DivisionCreate(BaseModel):
    discipline: Discipline
    genderCategory: GenderCategory
    levelLabel: str
    code: Optional[str] = None
    sortOrder: int = 0


class DivisionUpdate(BaseModel):
    levelLabel: Optional[str] = None
    code: Optional[str] = None
    sortOrder: Optional[int] = None


# Event DTOs
class EventDTO(BaseModel):
    id: str
    tournamentId: str
    divisionId: str
    name: str
    drawFormat: Optional[DrawFormat] = None
    parameters: Optional[Dict[str, Any]] = None
    # Legacy field for backwards compatibility
    code: Optional[str] = None  # Derived from division

    class Config:
        from_attributes = True
        populate_by_name = True


class EventCreate(BaseModel):
    divisionId: str
    name: str
    drawFormat: Optional[DrawFormat] = None
    parameters: Optional[Dict[str, Any]] = None


class EventUpdate(BaseModel):
    name: Optional[str] = None
    drawFormat: Optional[DrawFormat] = None
    parameters: Optional[Dict[str, Any]] = None


# Entry Member DTOs
class EntryMemberDTO(BaseModel):
    id: str
    entryId: str
    playerId: str
    role: EntryMemberRole

    class Config:
        from_attributes = True
        populate_by_name = True


# Entry DTOs
class EntryDTO(BaseModel):
    id: str
    eventId: str
    participantIds: List[str] = Field(default_factory=list)  # Derived from members
    seed: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    members: Optional[List[EntryMemberDTO]] = None  # Full member details

    class Config:
        from_attributes = True
        populate_by_name = True


class EntryCreate(BaseModel):
    participantIds: List[str]  # 1 for singles, 2 for doubles/mixed
    seed: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator('participantIds')
    @classmethod
    def validate_participant_ids(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one participant is required")
        if len(v) > 2:
            raise ValueError("Maximum 2 participants allowed")
        return v


class EntryUpdate(BaseModel):
    participantIds: Optional[List[str]] = None
    seed: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


# Draw DTOs
class DrawDTO(BaseModel):
    id: str
    eventId: str
    format: DrawFormat
    status: DrawStatus
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class DrawGenerateRequest(BaseModel):
    format: DrawFormat
    parameters: Optional[Dict[str, Any]] = None


# Draw Match DTO (extends MatchDTO with draw metadata)
class DrawMatchDTO(BaseModel):
    id: str
    eventCode: str
    sideA: List[str]
    sideB: List[str]
    dependencies: List[str] = Field(default_factory=list)
    drawMetadata: Optional[Dict[str, Any]] = None
    drawStatus: Optional[MatchStatus] = None
    durationSlots: int = 1
    preferredCourt: Optional[int] = None

    class Config:
        from_attributes = True
        populate_by_name = True
