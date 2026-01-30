"""Draw service - CRUD operations for draws."""
from sqlalchemy.orm import Session
from draws.models import Draw, DrawStatus
from draws.schemas import DrawGenerateRequest
import uuid


class DrawService:
    """Service for draw management."""

    @staticmethod
    def get_or_create_draw(db: Session, event_id: str, format_type) -> Draw:
        """Get existing draw or create a new one."""
        draw = db.query(Draw).filter(
            Draw.event_id == event_id,
            Draw.format == format_type
        ).first()
        
        if not draw:
            draw_id = str(uuid.uuid4())
            draw = Draw(
                id=draw_id,
                event_id=event_id,
                format=format_type,
                status=DrawStatus.DRAFT,
            )
            db.add(draw)
            db.commit()
            db.refresh(draw)
        
        return draw

    @staticmethod
    def get_draw(db: Session, event_id: str) -> Draw | None:
        """Get the current draw for an event."""
        return db.query(Draw).filter(Draw.event_id == event_id).order_by(Draw.created_at.desc()).first()

    @staticmethod
    def update_draw_status(db: Session, draw_id: str, status: DrawStatus) -> Draw | None:
        """Update draw status."""
        draw = db.query(Draw).filter(Draw.id == draw_id).first()
        if not draw:
            return None
        
        draw.status = status
        db.commit()
        db.refresh(draw)
        return draw

    @staticmethod
    def update_draw_metadata(db: Session, draw_id: str, metadata: dict) -> Draw | None:
        """Update draw metadata."""
        draw = db.query(Draw).filter(Draw.id == draw_id).first()
        if not draw:
            return None
        
        draw.draw_metadata = metadata
        db.commit()
        db.refresh(draw)
        return draw
