"""Match API endpoints - simplified for school sparring."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import MatchDTO, MatchesImportDTO
from app.models import Match, Tournament
from services.csv_importer import CSVImporterService
import uuid

router = APIRouter(prefix="/tournaments/{tournament_id}/matches", tags=["matches"])


@router.get("", response_model=list[MatchDTO])
async def get_matches(
    tournament_id: str,
    db: Session = Depends(get_db)
):
    """Get all matches for a tournament."""
    matches = db.query(Match).filter(Match.tournament_id == tournament_id).all()
    return [_match_to_dto(m) for m in matches]


@router.post("", response_model=MatchDTO)
async def create_match(
    tournament_id: str,
    match: MatchDTO,
    db: Session = Depends(get_db)
):
    """Create a new match."""
    # Verify tournament exists
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Ensure ID is set
    if not match.id:
        match.id = str(uuid.uuid4())
    
    db_match = Match(
        id=match.id,
        tournament_id=tournament_id,
        side_a=match.sideA,
        side_b=match.sideB,
        side_c=match.sideC,
        match_type=match.matchType,
        event_rank=match.eventRank,
        duration_slots=match.durationSlots,
        preferred_court=match.preferredCourt,
        tags=match.tags,
    )
    db.add(db_match)
    db.commit()
    db.refresh(db_match)
    return _match_to_dto(db_match)


@router.put("/{match_id}", response_model=MatchDTO)
async def update_match(
    tournament_id: str,
    match_id: str,
    updates: dict,
    db: Session = Depends(get_db)
):
    """Update a match."""
    match = db.query(Match).filter(
        Match.id == match_id,
        Match.tournament_id == tournament_id
    ).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if 'sideA' in updates:
        match.side_a = updates['sideA']
    if 'sideB' in updates:
        match.side_b = updates['sideB']
    if 'sideC' in updates:
        match.side_c = updates['sideC']
    if 'matchType' in updates:
        match.match_type = updates['matchType']
    if 'eventRank' in updates:
        match.event_rank = updates['eventRank']
    if 'durationSlots' in updates:
        match.duration_slots = updates['durationSlots']
    if 'preferredCourt' in updates:
        match.preferred_court = updates['preferredCourt']
    if 'tags' in updates:
        match.tags = updates['tags']
    
    db.commit()
    db.refresh(match)
    return _match_to_dto(match)


@router.delete("/{match_id}")
async def delete_match(
    tournament_id: str,
    match_id: str,
    db: Session = Depends(get_db)
):
    """Delete a match."""
    match = db.query(Match).filter(
        Match.id == match_id,
        Match.tournament_id == tournament_id
    ).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    db.delete(match)
    db.commit()
    return {"message": "Match deleted"}


@router.post("/import", response_model=list[MatchDTO])
async def import_matches(
    tournament_id: str,
    data: MatchesImportDTO,
    db: Session = Depends(get_db)
):
    """Import matches from CSV."""
    try:
        matches = CSVImporterService.parse_matches_csv(data.csv)
        
        created_matches = []
        for match in matches:
            if not match.id:
                match.id = str(uuid.uuid4())
            
            db_match = Match(
                id=match.id,
                tournament_id=tournament_id,
                side_a=match.sideA,
                side_b=match.sideB,
                side_c=match.sideC,
                match_type=match.matchType or "dual",
                event_rank=match.eventRank,
                duration_slots=match.durationSlots,
                preferred_court=match.preferredCourt,
                tags=match.tags,
            )
            db.add(db_match)
            created_matches.append(_match_to_dto(db_match))
        
        db.commit()
        return created_matches
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


def _match_to_dto(match: Match) -> MatchDTO:
    """Convert Match model to MatchDTO."""
    return MatchDTO(
        id=match.id,
        sideA=list(match.side_a) if match.side_a else [],
        sideB=list(match.side_b) if match.side_b else [],
        sideC=list(match.side_c) if match.side_c else None,
        matchType=match.match_type or "dual",
        eventRank=match.event_rank,
        durationSlots=match.duration_slots,
        preferredCourt=match.preferred_court,
        tags=match.tags if match.tags else None,
    )
