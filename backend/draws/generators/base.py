"""Base draw generator interface."""
from abc import ABC, abstractmethod
from typing import List, Dict
from draws.models import Entry
from draws.schemas import DrawMatchDTO
import uuid


class DrawGenerator(ABC):
    """Base class for draw generators."""

    @abstractmethod
    def generate(
        self,
        entries: List[Entry],
        seeds: Dict[str, int],
        parameters: Dict | None = None
    ) -> List[DrawMatchDTO]:
        """
        Generate matches with dependencies.
        
        Args:
            entries: List of entries (competitors)
            seeds: Dictionary mapping entry_id -> seed number
            parameters: Draw-specific parameters
            
        Returns:
            List of DrawMatchDTO objects with dependencies set
        """
        pass

    def _create_match_id(self, prefix: str = "match") -> str:
        """Generate a unique match ID."""
        return f"{prefix}-{uuid.uuid4().hex[:8]}"
