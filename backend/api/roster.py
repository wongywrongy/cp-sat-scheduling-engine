"""Roster API endpoints - simplified for school sparring."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import PlayerDTO, RosterGroupDTO, RosterImportDTO
from app.models import Player, Tournament, RosterGroup
from services.csv_importer import CSVImporterService
import uuid

router = APIRouter(prefix="/tournaments/{tournament_id}/roster", tags=["roster"])


# Group endpoints
@router.get("/groups", response_model=list[RosterGroupDTO])
async def get_groups(
    tournament_id: str,
    db: Session = Depends(get_db)
):
    """Get all groups (schools) for a tournament."""
    groups = db.query(RosterGroup).filter(RosterGroup.tournament_id == tournament_id).all()
    return [_group_to_dto(g) for g in groups]


@router.post("/groups", response_model=RosterGroupDTO)
async def create_group(
    tournament_id: str,
    group: RosterGroupDTO,
    db: Session = Depends(get_db)
):
    """Create a new group (school)."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if not group.id:
        group.id = str(uuid.uuid4())
    
    db_group = RosterGroup(
        id=group.id,
        tournament_id=tournament_id,
        name=group.name,
        group_metadata=group.metadata,
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return _group_to_dto(db_group)


@router.put("/groups/{group_id}", response_model=RosterGroupDTO)
async def update_group(
    tournament_id: str,
    group_id: str,
    updates: dict,
    db: Session = Depends(get_db)
):
    """Update a group."""
    group = db.query(RosterGroup).filter(
        RosterGroup.id == group_id,
        RosterGroup.tournament_id == tournament_id
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if 'name' in updates:
        group.name = updates['name']
    if 'metadata' in updates:
        group.group_metadata = updates['metadata']
    
    db.commit()
    db.refresh(group)
    return _group_to_dto(group)


@router.delete("/groups/{group_id}")
async def delete_group(
    tournament_id: str,
    group_id: str,
    db: Session = Depends(get_db)
):
    """Delete a group."""
    group = db.query(RosterGroup).filter(
        RosterGroup.id == group_id,
        RosterGroup.tournament_id == tournament_id
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    db.delete(group)
    db.commit()
    return {"message": "Group deleted"}


def _group_to_dto(group: RosterGroup) -> RosterGroupDTO:
    """Convert RosterGroup model to RosterGroupDTO."""
    return RosterGroupDTO(
        id=group.id,
        name=group.name,
        metadata=group.group_metadata,
    )


@router.get("", response_model=list[PlayerDTO])
async def get_players(
    tournament_id: str,
    db: Session = Depends(get_db)
):
    """Get all players for a tournament."""
    players = db.query(Player).filter(Player.tournament_id == tournament_id).all()
    return [_player_to_dto(p) for p in players]


@router.post("", response_model=PlayerDTO)
async def create_player(
    tournament_id: str,
    player: PlayerDTO,
    db: Session = Depends(get_db)
):
    """Create a new player."""
    # Verify tournament exists
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Ensure ID is set
    if not player.id:
        player.id = str(uuid.uuid4())
    
    db_player = Player(
        id=player.id,
        tournament_id=tournament_id,
        group_id=player.groupId,
        name=player.name,
        rank=player.rank,
        availability=[{"start": a.start, "end": a.end} for a in player.availability],
        min_rest_minutes=player.minRestMinutes,
        notes=player.notes,
    )
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return _player_to_dto(db_player)


@router.put("/{player_id}", response_model=PlayerDTO)
async def update_player(
    tournament_id: str,
    player_id: str,
    updates: dict,
    db: Session = Depends(get_db)
):
    """Update a player."""
    player = db.query(Player).filter(
        Player.id == player_id,
        Player.tournament_id == tournament_id
    ).first()
    
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    if 'name' in updates:
        player.name = updates['name']
    if 'groupId' in updates:
        player.group_id = updates['groupId']
    if 'rank' in updates:
        player.rank = updates['rank']
    if 'availability' in updates:
        player.availability = updates['availability']
    if 'minRestMinutes' in updates:
        player.min_rest_minutes = updates['minRestMinutes']
    if 'notes' in updates:
        player.notes = updates['notes']
    
    db.commit()
    db.refresh(player)
    return _player_to_dto(player)


@router.delete("/{player_id}")
async def delete_player(
    tournament_id: str,
    player_id: str,
    db: Session = Depends(get_db)
):
    """Delete a player."""
    player = db.query(Player).filter(
        Player.id == player_id,
        Player.tournament_id == tournament_id
    ).first()
    
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    db.delete(player)
    db.commit()
    return {"message": "Player deleted"}


@router.post("/import", response_model=list[PlayerDTO])
async def import_roster(
    tournament_id: str,
    data: RosterImportDTO,
    db: Session = Depends(get_db)
):
    """Import roster from CSV."""
    try:
        players = CSVImporterService.parse_roster_csv(data.csv)
        
        created_players = []
        for player in players:
            if not player.id:
                player.id = str(uuid.uuid4())
            
            db_player = Player(
                id=player.id,
                tournament_id=tournament_id,
                group_id=player.groupId,
                name=player.name,
                rank=player.rank,
                availability=[{"start": a.start, "end": a.end} for a in player.availability],
                min_rest_minutes=player.minRestMinutes,
                notes=player.notes,
            )
            db.add(db_player)
            created_players.append(_player_to_dto(db_player))
        
        db.commit()
        return created_players
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


def _player_to_dto(player: Player) -> PlayerDTO:
    """Convert Player model to PlayerDTO."""
    from app.schemas import AvailabilityWindow
    
    availability = []
    if player.availability:
        for av in player.availability:
            if isinstance(av, dict):
                availability.append(AvailabilityWindow(start=av['start'], end=av['end']))
    
    return PlayerDTO(
        id=player.id,
        name=player.name,
        groupId=player.group_id,
        rank=player.rank,
        availability=availability,
        minRestMinutes=player.min_rest_minutes,
        notes=player.notes,
    )
