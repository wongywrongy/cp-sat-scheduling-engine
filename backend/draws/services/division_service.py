"""Division service - CRUD operations for divisions."""
from sqlalchemy.orm import Session
from draws.models import Division, Discipline, GenderCategory
from draws.schemas import DivisionCreate, DivisionUpdate
import uuid


class DivisionService:
    """Service for division management."""

    @staticmethod
    def create_division(db: Session, tournament_id: str, division_data: DivisionCreate) -> Division:
        """Create a new division."""
        division_id = str(uuid.uuid4())
        division = Division(
            id=division_id,
            tournament_id=tournament_id,
            discipline=division_data.discipline,
            gender_category=division_data.genderCategory,
            level_label=division_data.levelLabel,
            code=division_data.code,
            sort_order=division_data.sortOrder,
        )
        db.add(division)
        db.commit()
        db.refresh(division)
        return division

    @staticmethod
    def get_division(db: Session, tournament_id: str, division_id: str) -> Division | None:
        """Get division by ID."""
        return db.query(Division).filter(
            Division.id == division_id,
            Division.tournament_id == tournament_id
        ).first()

    @staticmethod
    def list_divisions(db: Session, tournament_id: str) -> list[Division]:
        """List all divisions for a tournament."""
        return db.query(Division).filter(
            Division.tournament_id == tournament_id
        ).order_by(Division.sort_order, Division.level_label).all()

    @staticmethod
    def update_division(
        db: Session, tournament_id: str, division_id: str, updates: DivisionUpdate
    ) -> Division | None:
        """Update division."""
        division = DivisionService.get_division(db, tournament_id, division_id)
        if not division:
            return None
        
        if updates.levelLabel is not None:
            division.level_label = updates.levelLabel
        if updates.code is not None:
            division.code = updates.code
        if updates.sortOrder is not None:
            division.sort_order = updates.sortOrder
        
        db.commit()
        db.refresh(division)
        return division

    @staticmethod
    def delete_division(db: Session, tournament_id: str, division_id: str) -> bool:
        """Delete division."""
        division = DivisionService.get_division(db, tournament_id, division_id)
        if not division:
            return False
        
        db.delete(division)
        db.commit()
        return True

    @staticmethod
    def get_division_by_code(db: Session, tournament_id: str, code: str) -> Division | None:
        """Get division by code."""
        return db.query(Division).filter(
            Division.tournament_id == tournament_id,
            Division.code == code
        ).first()
