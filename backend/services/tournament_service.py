"""Tournament service - CRUD operations for tournaments."""
from sqlalchemy.orm import Session
from app.models import Tournament
from app.schemas import TournamentConfig
import uuid


class TournamentService:
    """Service for tournament management."""

    @staticmethod
    def create_tournament(db: Session, name: str, config: TournamentConfig) -> Tournament:
        """Create a new tournament."""
        tournament_id = str(uuid.uuid4())
        tournament = Tournament(
            id=tournament_id,
            name=name,
            config=config.model_dump(),
        )
        db.add(tournament)
        db.commit()
        db.refresh(tournament)
        return tournament

    @staticmethod
    def get_tournament(db: Session, tournament_id: str) -> Tournament | None:
        """Get tournament by ID."""
        return db.query(Tournament).filter(Tournament.id == tournament_id).first()

    @staticmethod
    def list_tournaments(db: Session) -> list[Tournament]:
        """List all tournaments."""
        return db.query(Tournament).all()

    @staticmethod
    def update_tournament_config(
        db: Session, tournament_id: str, config: TournamentConfig
    ) -> Tournament | None:
        """Update tournament config."""
        tournament = TournamentService.get_tournament(db, tournament_id)
        if not tournament:
            return None
        
        tournament.config = config.model_dump()
        db.commit()
        db.refresh(tournament)
        return tournament

    @staticmethod
    def delete_tournament(db: Session, tournament_id: str) -> bool:
        """Delete tournament."""
        tournament = TournamentService.get_tournament(db, tournament_id)
        if not tournament:
            return False
        
        db.delete(tournament)
        db.commit()
        return True
