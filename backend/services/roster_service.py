"""Roster service - simplified player management for school sparring."""
from sqlalchemy.orm import Session
from typing import List
from app.models import Player, Tournament
from app.schemas import PlayerDTO
import uuid


class RosterService:
    """Service for player management."""

    @staticmethod
    def list_players(db: Session, tournament_id: str) -> List[PlayerDTO]:
        """List all players for a tournament."""
        players = db.query(Player).filter(Player.tournament_id == tournament_id).all()
        return [RosterService._player_to_dto(p) for p in players]

    @staticmethod
    def get_player(db: Session, tournament_id: str, player_id: str) -> Player | None:
        """Get player by ID."""
        return db.query(Player).filter(
            Player.id == player_id,
            Player.tournament_id == tournament_id
        ).first()

    @staticmethod
    def create_player(
        db: Session, tournament_id: str, player_data: PlayerDTO
    ) -> Player:
        """Create a new player."""
        player = Player(
            id=player_data.id,
            tournament_id=tournament_id,
            name=player_data.name,
            availability=[aw.model_dump() if hasattr(aw, 'model_dump') else aw for aw in player_data.availability],
            min_rest_minutes=player_data.minRestMinutes,
            notes=player_data.notes,
        )
        db.add(player)
        db.commit()
        db.refresh(player)
        return player

    @staticmethod
    def update_player(
        db: Session, tournament_id: str, player_id: str, updates: dict
    ) -> Player | None:
        """Update player."""
        player = RosterService.get_player(db, tournament_id, player_id)
        if not player:
            return None
        
        if 'name' in updates:
            player.name = updates['name']
        if 'availability' in updates:
            player.availability = [aw.model_dump() if hasattr(aw, 'model_dump') else aw for aw in updates['availability']]
        if 'minRestMinutes' in updates:
            player.min_rest_minutes = updates['minRestMinutes']
        if 'notes' in updates:
            player.notes = updates['notes']
        
        db.commit()
        db.refresh(player)
        return player

    @staticmethod
    def delete_player(db: Session, tournament_id: str, player_id: str) -> bool:
        """Delete player."""
        player = RosterService.get_player(db, tournament_id, player_id)
        if not player:
            return False
        
        db.delete(player)
        db.commit()
        return True

    @staticmethod
    def _player_to_dto(player: Player) -> PlayerDTO:
        """Convert Player model to PlayerDTO."""
        from app.schemas import AvailabilityWindow
        
        availability = []
        if player.availability:
            for aw in player.availability:
                if isinstance(aw, dict):
                    availability.append(AvailabilityWindow(**aw))
                else:
                    availability.append(aw)
        
        return PlayerDTO(
            id=player.id,
            name=player.name,
            availability=availability,
            minRestMinutes=player.min_rest_minutes,
            notes=player.notes,
        )
