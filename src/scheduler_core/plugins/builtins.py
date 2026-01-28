"""Built-in constraint and objective plugins.

These plugins implement the default scheduling behavior.
They wrap the existing constraint and objective logic.
"""
from collections import defaultdict
from typing import Dict, List

from ortools.sat.python import cp_model

from scheduler_core.domain.models import Match, Player, PreviousAssignment, ScheduleConfig
from scheduler_core.engine.diagnostics import get_player_ids
from scheduler_core.plugins.base import ConstraintPlugin, ObjectivePlugin


class ExactlyOnceConstraint(ConstraintPlugin):
    """Each match scheduled exactly once."""
    
    @property
    def name(self) -> str:
        return "exactly_once"
    
    def apply(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        infeasible_reasons: List[str],
    ) -> None:
        T = config.total_slots
        C = config.court_count
        
        for match_id, match in matches.items():
            d = match.duration_slots
            max_start = T - d
            
            all_vars = [
                x[(match_id, t, c)]
                for t in range(max_start + 1)
                for c in range(1, C + 1)
                if (match_id, t, c) in x
            ]
            
            if all_vars:
                model.AddExactlyOne(all_vars)
            else:
                infeasible_reasons.append(
                    f"Match {match.event_code}: no valid time slots available"
                )


class CourtCapacityConstraint(ConstraintPlugin):
    """Court capacity: at most one match per court per slot."""
    
    @property
    def name(self) -> str:
        return "court_capacity"
    
    def apply(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        infeasible_reasons: List[str],
    ) -> None:
        T = config.total_slots
        C = config.court_count
        
        for s in range(T):
            for c in range(1, C + 1):
                overlapping_vars = []
                
                for match_id, match in matches.items():
                    d = match.duration_slots
                    for t in range(max(0, s - d + 1), s + 1):
                        if (match_id, t, c) in x:
                            overlapping_vars.append(x[(match_id, t, c)])
                
                if len(overlapping_vars) > 1:
                    model.Add(sum(overlapping_vars) <= 1)


class PlayerNonOverlapConstraint(ConstraintPlugin):
    """Player non-overlap: each player in at most one match per slot."""
    
    @property
    def name(self) -> str:
        return "player_nonoverlap"
    
    def apply(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        infeasible_reasons: List[str],
    ) -> None:
        T = config.total_slots
        C = config.court_count
        
        player_matches: Dict[str, List[Match]] = defaultdict(list)
        for match in matches.values():
            for player_id in get_player_ids(match):
                player_matches[player_id].append(match)
        
        for player_id, player_match_list in player_matches.items():
            if len(player_match_list) <= 1:
                continue
            
            for s in range(T):
                overlapping_vars = []
                
                for match in player_match_list:
                    d = match.duration_slots
                    for t in range(max(0, s - d + 1), s + 1):
                        for c in range(1, C + 1):
                            if (match.id, t, c) in x:
                                overlapping_vars.append(x[(match.id, t, c)])
                
                if len(overlapping_vars) > 1:
                    model.Add(sum(overlapping_vars) <= 1)


class AvailabilityConstraint(ConstraintPlugin):
    """Availability: respect player availability windows."""
    
    @property
    def name(self) -> str:
        return "availability"
    
    def apply(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        infeasible_reasons: List[str],
    ) -> None:
        T = config.total_slots
        C = config.court_count
        
        for match_id, match in matches.items():
            d = match.duration_slots
            
            for player_id in get_player_ids(match):
                player = players.get(player_id)
                if not player or not player.availability:
                    continue
                
                for t in range(T - d + 1):
                    match_range = range(t, t + d)
                    
                    is_available = False
                    for start, end in player.availability:
                        if all(start <= s < end for s in match_range):
                            is_available = True
                            break
                    
                    if not is_available:
                        for c in range(1, C + 1):
                            if (match_id, t, c) in x:
                                model.Add(x[(match_id, t, c)] == 0)


class LockPinConstraint(ConstraintPlugin):
    """Locks and pins: respect locked and pinned assignments."""
    
    @property
    def name(self) -> str:
        return "lock_pin"
    
    def apply(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        infeasible_reasons: List[str],
    ) -> None:
        T = config.total_slots
        C = config.court_count
        
        for match_id, assignment in previous_assignments.items():
            if match_id not in matches:
                continue
            
            match = matches[match_id]
            d = match.duration_slots
            
            if assignment.locked:
                t_star = assignment.slot_id
                c_star = assignment.court_id
                
                if (match_id, t_star, c_star) in x:
                    model.Add(x[(match_id, t_star, c_star)] == 1)
                else:
                    infeasible_reasons.append(
                        f"Match {match.event_code}: locked assignment ({t_star}, {c_star}) is invalid"
                    )
            else:
                if assignment.pinned_slot_id is not None:
                    t_pin = assignment.pinned_slot_id
                    for t in range(T - d + 1):
                        if t != t_pin:
                            for c in range(1, C + 1):
                                if (match_id, t, c) in x:
                                    model.Add(x[(match_id, t, c)] == 0)
                
                if assignment.pinned_court_id is not None:
                    c_pin = assignment.pinned_court_id
                    for t in range(T - d + 1):
                        for c in range(1, C + 1):
                            if c != c_pin and (match_id, t, c) in x:
                                model.Add(x[(match_id, t, c)] == 0)


class FreezeHorizonConstraint(ConstraintPlugin):
    """Freeze horizon: treat near-future assignments as locked."""
    
    @property
    def name(self) -> str:
        return "freeze_horizon"
    
    def apply(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        infeasible_reasons: List[str],
    ) -> None:
        horizon = config.freeze_horizon_slots
        current = config.current_slot
        freeze_until = current + horizon
        
        for match_id, assignment in previous_assignments.items():
            if match_id not in matches or assignment.locked:
                continue
            
            if assignment.slot_id < freeze_until:
                t_star = assignment.slot_id
                c_star = assignment.court_id
                
                if (match_id, t_star, c_star) in x:
                    model.Add(x[(match_id, t_star, c_star)] == 1)


class RestConstraint(ConstraintPlugin):
    """Rest constraint: minimum rest between matches for each player."""
    
    @property
    def name(self) -> str:
        return "rest"
    
    def apply(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        infeasible_reasons: List[str],
    ) -> None:
        # Note: This constraint also creates rest_slack variables for soft rest,
        # but those are managed separately. This plugin only handles hard rest.
        # The rest_slack variables are created in the RestSlackObjective plugin.
        player_matches: Dict[str, List[Match]] = defaultdict(list)
        for match in matches.values():
            for player_id in get_player_ids(match):
                player_matches[player_id].append(match)
        
        for player_id, player_match_list in player_matches.items():
            if len(player_match_list) <= 1:
                continue
            
            player = players.get(player_id)
            rest_slots = player.rest_slots if player else config.default_rest_slots
            is_hard = player.rest_is_hard if player else True
            
            for i in range(len(player_match_list)):
                for j in range(i + 1, len(player_match_list)):
                    m_i = player_match_list[i]
                    m_j = player_match_list[j]
                    
                    b_ij = model.NewBoolVar(f"order_{m_i.id}_{m_j.id}_{player_id}")
                    
                    if is_hard or not config.soft_rest_enabled:
                        model.Add(
                            end_slot[m_i.id] + rest_slots <= start_slot[m_j.id]
                        ).OnlyEnforceIf(b_ij)
                        model.Add(
                            end_slot[m_j.id] + rest_slots <= start_slot[m_i.id]
                        ).OnlyEnforceIf(b_ij.Not())


class RestSlackObjective(ObjectivePlugin):
    """Rest slack penalties objective."""
    
    @property
    def name(self) -> str:
        return "rest_slack"
    
    def get_objective_terms(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        rest_slack: Dict[tuple[str, str, str], cp_model.IntVar],
        locked_matches: set[str],
    ) -> List[cp_model.IntVar]:
        objective_terms = []
        
        if config.soft_rest_enabled:
            for (player_id, m_i, m_j), slack in rest_slack.items():
                player = players.get(player_id)
                penalty = player.rest_penalty if player else config.rest_slack_penalty
                objective_terms.append(int(penalty * 10) * slack)
        
        return objective_terms


class DisruptionObjective(ObjectivePlugin):
    """Disruption penalty objective."""
    
    @property
    def name(self) -> str:
        return "disruption"
    
    def get_objective_terms(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        rest_slack: Dict[tuple[str, str, str], cp_model.IntVar],
        locked_matches: set[str],
    ) -> List[cp_model.IntVar]:
        objective_terms = []
        
        if previous_assignments and config.disruption_penalty > 0:
            for match_id, prev in previous_assignments.items():
                if match_id not in matches or match_id in locked_matches:
                    continue
                
                prev_start = prev.slot_id
                diff_pos = model.NewIntVar(0, config.total_slots, f"diff_pos_{match_id}")
                diff_neg = model.NewIntVar(0, config.total_slots, f"diff_neg_{match_id}")
                
                model.Add(start_slot[match_id] - prev_start == diff_pos - diff_neg)
                objective_terms.append(int(config.disruption_penalty * 10) * (diff_pos + diff_neg))
        
        return objective_terms


class CourtChangeObjective(ObjectivePlugin):
    """Court change penalty objective."""
    
    @property
    def name(self) -> str:
        return "court_change"
    
    def get_objective_terms(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        rest_slack: Dict[tuple[str, str, str], cp_model.IntVar],
        locked_matches: set[str],
    ) -> List[cp_model.IntVar]:
        objective_terms = []
        
        if config.court_change_penalty > 0:
            for match_id, prev in previous_assignments.items():
                if match_id not in matches or match_id in locked_matches:
                    continue
                
                prev_court = prev.court_id
                court_changed = model.NewBoolVar(f"court_changed_{match_id}")
                
                match = matches[match_id]
                d = match.duration_slots
                same_court_vars = []
                
                for t in range(config.total_slots - d + 1):
                    if (match_id, t, prev_court) in x:
                        same_court_vars.append(x[(match_id, t, prev_court)])
                
                if same_court_vars:
                    model.Add(sum(same_court_vars) + court_changed == 1)
                    objective_terms.append(int(config.court_change_penalty * 10) * court_changed)
        
        return objective_terms


class LateFinishObjective(ObjectivePlugin):
    """Late finish penalty objective."""
    
    @property
    def name(self) -> str:
        return "late_finish"
    
    def get_objective_terms(
        self,
        model: cp_model.CpModel,
        matches: Dict[str, Match],
        players: Dict[str, Player],
        previous_assignments: Dict[str, PreviousAssignment],
        config: ScheduleConfig,
        x: Dict[tuple[str, int, int], cp_model.IntVar],
        start_slot: Dict[str, cp_model.IntVar],
        end_slot: Dict[str, cp_model.IntVar],
        rest_slack: Dict[tuple[str, str, str], cp_model.IntVar],
        locked_matches: set[str],
    ) -> List[cp_model.IntVar]:
        objective_terms = []
        
        if config.late_finish_penalty > 0:
            for match_id in matches:
                if match_id in locked_matches:
                    continue
                objective_terms.append(int(config.late_finish_penalty * 10) * start_slot[match_id])
        
        return objective_terms
