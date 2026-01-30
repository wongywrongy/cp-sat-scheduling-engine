"""Division API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from draws.schemas import DivisionDTO, DivisionCreate, DivisionUpdate
from draws.services.division_service import DivisionService

router = APIRouter(prefix="/tournaments/{tournament_id}/divisions", tags=["divisions"])


@router.get("", response_model=list[DivisionDTO])
async def list_divisions(
    tournament_id: str,
    db: Session = Depends(get_db)
):
    """List all divisions for a tournament."""
    divisions = DivisionService.list_divisions(db, tournament_id)
    return [_division_to_dto(d) for d in divisions]


@router.post("", response_model=DivisionDTO)
async def create_division(
    tournament_id: str,
    division: DivisionCreate,
    db: Session = Depends(get_db)
):
    """Create a new division."""
    try:
        created_division = DivisionService.create_division(db, tournament_id, division)
        return _division_to_dto(created_division)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{division_id}", response_model=DivisionDTO)
async def get_division(
    tournament_id: str,
    division_id: str,
    db: Session = Depends(get_db)
):
    """Get a division by ID."""
    division = DivisionService.get_division(db, tournament_id, division_id)
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    return _division_to_dto(division)


@router.put("/{division_id}", response_model=DivisionDTO)
async def update_division(
    tournament_id: str,
    division_id: str,
    updates: DivisionUpdate,
    db: Session = Depends(get_db)
):
    """Update a division."""
    updated_division = DivisionService.update_division(db, tournament_id, division_id, updates)
    if not updated_division:
        raise HTTPException(status_code=404, detail="Division not found")
    return _division_to_dto(updated_division)


@router.delete("/{division_id}")
async def delete_division(
    tournament_id: str,
    division_id: str,
    db: Session = Depends(get_db)
):
    """Delete a division."""
    success = DivisionService.delete_division(db, tournament_id, division_id)
    if not success:
        raise HTTPException(status_code=404, detail="Division not found")
    return {"message": "Division deleted"}


def _division_to_dto(division) -> DivisionDTO:
    """Convert Division model to DivisionDTO."""
    discipline_value = division.discipline.value if hasattr(division.discipline, 'value') else division.discipline
    gender_value = division.gender_category.value if hasattr(division.gender_category, 'value') else division.gender_category
    
    return DivisionDTO(
        id=division.id,
        tournamentId=division.tournament_id,
        discipline=discipline_value,
        genderCategory=gender_value,
        levelLabel=division.level_label,
        code=division.code,
        sortOrder=division.sort_order,
    )
