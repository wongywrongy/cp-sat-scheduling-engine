"""Round robin draw generator."""
from typing import List, Dict
from draws.models import Entry, EntryMember
from draws.schemas import DrawMatchDTO, MatchStatus
from draws.generators.base import DrawGenerator
import math


def _get_entry_participant_ids(entry: Entry) -> List[str]:
    """Get participant IDs from entry, using entry_members if available, fallback to participant_ids."""
    if entry.members:
        # Use entry_members (preferred)
        return [m.player_id for m in sorted(entry.members, key=lambda m: m.role.value)]
    elif entry.participant_ids:
        # Fallback to deprecated participant_ids
        return list(entry.participant_ids) if isinstance(entry.participant_ids, list) else []
    else:
        return []


class RoundRobinGenerator(DrawGenerator):
    """Generates round robin (all-vs-all) matches within groups/pools."""

    def generate(
        self,
        entries: List[Entry],
        seeds: Dict[str, int],
        parameters: Dict | None = None
    ) -> List[DrawMatchDTO]:
        """Generate round robin matches."""
        params = parameters or {}
        group_size = params.get("group_size", 4)  # Default 4 entries per group
        num_groups = math.ceil(len(entries) / group_size)
        
        matches: List[DrawMatchDTO] = []
        
        # Split entries into groups
        groups: List[List[Entry]] = []
        for i in range(num_groups):
            start_idx = i * group_size
            end_idx = min(start_idx + group_size, len(entries))
            groups.append(entries[start_idx:end_idx])
        
        # Generate matches within each group
        for group_idx, group in enumerate(groups):
            group_id = f"group-{group_idx + 1}"
            
            # Generate all-vs-all matches within group
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    entry_a = group[i]
                    entry_b = group[j]
                    
                    match = DrawMatchDTO(
                        id=self._create_match_id(f"rr-{group_id}"),
                        eventCode="",  # Will be set by caller
                        sideA=_get_entry_participant_ids(entry_a),
                        sideB=_get_entry_participant_ids(entry_b),
                        dependencies=[],  # No dependencies in round robin
                        drawMetadata={
                            "format": "round_robin",
                            "group": group_id,
                            "groupIndex": group_idx,
                            "entryA": entry_a.id,
                            "entryB": entry_b.id,
                        },
                        drawStatus=MatchStatus.READY,  # All matches ready immediately
                        durationSlots=1,
                    )
                    matches.append(match)
        
        return matches
