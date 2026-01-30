"""Single elimination (knockout) draw generator."""
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


class SingleEliminationGenerator(DrawGenerator):
    """Generates single elimination bracket with seeding."""

    def generate(
        self,
        entries: List[Entry],
        seeds: Dict[str, int],
        parameters: Dict | None = None
    ) -> List[DrawMatchDTO]:
        """Generate single elimination bracket."""
        num_entries = len(entries)
        if num_entries < 2:
            return []
        
        # Calculate bracket size (next power of 2)
        bracket_size = 2 ** math.ceil(math.log2(num_entries))
        num_byes = bracket_size - num_entries
        
        # Sort entries by seed (1 = top seed)
        sorted_entries = sorted(entries, key=lambda e: seeds.get(e.id, 999))
        
        # Place seeds in bracket positions (standard tournament seeding)
        bracket_positions = self._seed_bracket(sorted_entries, seeds, bracket_size)
        
        matches: List[DrawMatchDTO] = []
        round_matches: Dict[str, List[DrawMatchDTO]] = {}  # round_name -> matches
        
        # Generate rounds from final backwards
        current_round_size = bracket_size // 2
        round_num = 1
        
        while current_round_size >= 1:
            round_name = self._get_round_name(current_round_size, bracket_size)
            round_matches[round_name] = []
            
            for match_idx in range(current_round_size):
                match_id = self._create_match_id(f"se-{round_name.lower()}-{match_idx + 1}")
                
                # Determine sides based on round and position
                if current_round_size == bracket_size // 2:
                    # First round: use bracket positions
                    pos_a = match_idx * 2
                    pos_b = match_idx * 2 + 1
                    entry_a = bracket_positions.get(pos_a)
                    entry_b = bracket_positions.get(pos_b)
                    
                    side_a = _get_entry_participant_ids(entry_a) if entry_a else []
                    side_b = _get_entry_participant_ids(entry_b) if entry_b else []
                    
                    # Bye handling: if one side is empty, match is ready but represents a bye
                    dependencies = []
                    draw_status = MatchStatus.READY if entry_a and entry_b else MatchStatus.PENDING
                else:
                    # Later rounds: depend on previous round winners
                    prev_round_name = self._get_round_name(current_round_size * 2, bracket_size)
                    prev_match_a_idx = match_idx * 2
                    prev_match_b_idx = match_idx * 2 + 1
                    
                    prev_matches = round_matches.get(prev_round_name, [])
                    if prev_match_a_idx < len(prev_matches) and prev_match_b_idx < len(prev_matches):
                        dep_match_a = prev_matches[prev_match_a_idx]
                        dep_match_b = prev_matches[prev_match_b_idx]
                        dependencies = [dep_match_a.id, dep_match_b.id]
                    else:
                        dependencies = []
                    
                    side_a = []  # Will be filled by winner of dependency match
                    side_b = []
                    draw_status = MatchStatus.PENDING
                
                match = DrawMatchDTO(
                    id=match_id,
                    eventCode="",  # Will be set by caller
                    sideA=side_a,
                    sideB=side_b,
                    dependencies=dependencies,
                    drawMetadata={
                        "format": "single_elimination",
                        "round": round_name,
                        "roundNumber": round_num,
                        "bracketPosition": match_idx,
                        "bracketSize": bracket_size,
                    },
                    drawStatus=draw_status,
                    durationSlots=1,
                )
                
                round_matches[round_name].append(match)
                matches.append(match)
            
            current_round_size //= 2
            round_num += 1
        
        return matches

    def _seed_bracket(self, entries: List[Entry], seeds: Dict[str, int], bracket_size: int) -> Dict[int, Entry]:
        """Place entries in bracket positions following standard seeding."""
        positions: Dict[int, Entry] = {}
        
        # Standard tournament seeding: 1 vs last, 2 vs second-to-last, etc.
        # Positions are 0-indexed
        num_entries = len(entries)
        
        for i, entry in enumerate(entries):
            seed = seeds.get(entry.id, i + 1)
            # Place seed 1 at position 0, seed 2 at position bracket_size-1, etc.
            if seed == 1:
                positions[0] = entry
            elif seed == 2:
                positions[bracket_size - 1] = entry
            else:
                # For other seeds, use standard bracket placement
                pos = self._get_seed_position(seed, bracket_size)
                if pos < bracket_size:
                    positions[pos] = entry
        
        return positions

    def _get_seed_position(self, seed: int, bracket_size: int) -> int:
        """Calculate bracket position for a given seed."""
        # Simplified seeding: distribute seeds evenly
        if seed == 1:
            return 0
        elif seed == 2:
            return bracket_size - 1
        else:
            # Distribute other seeds
            section_size = bracket_size // 4
            if seed <= bracket_size // 2:
                return (seed - 1) * 2
            else:
                return bracket_size - ((seed - bracket_size // 2) * 2) - 1

    def _get_round_name(self, round_size: int, bracket_size: int) -> str:
        """Get round name (Final, Semi-Final, Quarter-Final, etc.)."""
        if round_size == 1:
            return "Final"
        elif round_size == 2:
            return "Semi-Final"
        elif round_size == 4:
            return "Quarter-Final"
        elif round_size == 8:
            return "R16"
        elif round_size == 16:
            return "R32"
        elif round_size == 32:
            return "R64"
        else:
            return f"R{round_size * 2}"
