"""Draw generation service - orchestrates draw generation."""
from sqlalchemy.orm import Session
from app.models import Match
from draws.models import Event, Entry, Draw, DrawStatus
from draws.schemas import DrawFormat, DrawMatchDTO
from draws.generators.base import DrawGenerator
from draws.generators.round_robin import RoundRobinGenerator
from draws.generators.single_elimination import SingleEliminationGenerator
import uuid


class DrawGeneratorService:
    """Service for generating draws."""

    def __init__(self):
        self.generators: dict[str, DrawGenerator] = {
            "round_robin": RoundRobinGenerator(),
            "single_elimination": SingleEliminationGenerator(),
        }

    def generate_draw(
        self,
        db: Session,
        event: Event,
        format_type: DrawFormat | str,
        parameters: dict | None = None
    ) -> tuple[Draw, list[Match]]:
        """
        Generate a draw for an event and create matches.
        
        Returns:
            Tuple of (Draw, list[Match])
        """
        # Normalize format_type
        if isinstance(format_type, str):
            format_enum = format_type
        else:
            format_enum = format_type.value if hasattr(format_type, 'value') else str(format_type)
        
        # Get or create draw
        draw = db.query(Draw).filter(
            Draw.event_id == event.id,
            Draw.format == format_enum
        ).first()
        
        if not draw:
            draw_id = str(uuid.uuid4())
            draw = Draw(
                id=draw_id,
                event_id=event.id,
                format=format_enum,
                status=DrawStatus.GENERATED,
                draw_metadata=parameters or {},
            )
            db.add(draw)
        else:
            if draw.status == DrawStatus.LOCKED:
                raise ValueError("Draw is locked and cannot be regenerated")
            draw.status = DrawStatus.GENERATED
            draw.draw_metadata = parameters or {}
        
        # Get entries with their members eagerly loaded
        from sqlalchemy.orm import joinedload
        entries = db.query(Entry).options(joinedload(Entry.members)).filter(Entry.event_id == event.id).all()
        if len(entries) < 2:
            raise ValueError("Need at least 2 entries to generate a draw")
        
        # Build seeds dictionary
        seeds: dict[str, int] = {}
        for entry in entries:
            if entry.seed:
                seeds[entry.id] = entry.seed
        
        # Generate draw matches
        generator = self.generators.get(format_enum)
        if not generator:
            raise ValueError(f"Unsupported draw format: {format_enum}")
        
        draw_matches = generator.generate(entries, seeds, parameters)
        
        # Set event code on all matches (for backwards compatibility)
        event_code_str = None
        if event.division and event.division.code:
            event_code_str = event.division.code
        for draw_match in draw_matches:
            if event_code_str:
                draw_match.eventCode = event_code_str
        
        # Convert DrawMatchDTO to Match models and save
        matches: list[Match] = []
        for draw_match in draw_matches:
            draw_status_str = None
            if draw_match.drawStatus:
                if hasattr(draw_match.drawStatus, 'value'):
                    draw_status_str = draw_match.drawStatus.value
                elif isinstance(draw_match.drawStatus, str):
                    draw_status_str = draw_match.drawStatus
            
            match = Match(
                id=draw_match.id,
                tournament_id=event.tournament_id,
                division_id=event.division_id,
                event_code=draw_match.eventCode,  # Keep for backwards compatibility
                match_type="auto_generated",
                side_a=draw_match.sideA,
                side_b=draw_match.sideB,
                dependencies=draw_match.dependencies,
                draw_metadata=draw_match.drawMetadata,
                draw_status=draw_status_str,
                duration_slots=draw_match.durationSlots,
                preferred_court=draw_match.preferredCourt,
            )
            db.add(match)
            matches.append(match)
        
        db.commit()
        db.refresh(draw)
        
        return draw, matches
