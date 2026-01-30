"""Tournament API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import TournamentConfig, HealthResponse
from services.tournament_service import TournamentService
from app.models import Tournament
import json

router = APIRouter(prefix="/tournaments", tags=["tournaments"])


@router.get("/{tournament_id}/config", response_model=TournamentConfig)
async def get_tournament_config(
    tournament_id: str,
    db: Session = Depends(get_db)
):
    """Get tournament configuration."""
    tournament = TournamentService.get_tournament(db, tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    return TournamentConfig(**tournament.config)


@router.put("/{tournament_id}/config", response_model=TournamentConfig)
async def update_tournament_config(
    tournament_id: str,
    config: TournamentConfig,
    db: Session = Depends(get_db)
):
    """Update tournament configuration. Creates tournament if it doesn't exist."""
    tournament = TournamentService.get_tournament(db, tournament_id)
    if not tournament:
        # Auto-create tournament if it doesn't exist
        tournament = TournamentService.create_tournament(db, tournament_id, config)
    else:
        tournament = TournamentService.update_tournament_config(db, tournament_id, config)
        if not tournament:
            raise HTTPException(status_code=500, detail="Failed to update tournament")
    
    return TournamentConfig(**tournament.config)


@router.post("", response_model=dict)
async def create_tournament(
    name: str,
    config: TournamentConfig,
    db: Session = Depends(get_db)
):
    """Create a new tournament."""
    tournament = TournamentService.create_tournament(db, name, config)
    return {"id": tournament.id, "name": tournament.name}


@router.get("", response_model=list[dict])
async def list_tournaments(db: Session = Depends(get_db)):
    """List all tournaments."""
    tournaments = TournamentService.list_tournaments(db)
    return [{"id": t.id, "name": t.name} for t in tournaments]
