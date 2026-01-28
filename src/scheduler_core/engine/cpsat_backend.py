"""CP-SAT Tournament Scheduling Algorithm.

Uses Google OR-Tools CP-SAT solver to find optimal match schedules.

Decision Variables:
- x[m,t,c] ∈ {0,1}: match m starts at slot t on court c

Hard Constraints:
1. Each match scheduled exactly once
2. Court capacity: at most one match per court per slot
3. Player non-overlap: players can't be in multiple matches simultaneously
4. Availability: respect player availability windows
5. Locks/pins: respect locked and pinned assignments
6. Freeze horizon: treat near-future assignments as locked

Soft Constraints (with penalties):
- Rest between matches (can be hard or soft)
- Disruption from previous schedule
- Late finish penalty
"""
import time as time_module
from collections import defaultdict
from typing import Dict, List, Optional, Set, Tuple

from ortools.sat.python import cp_model

from scheduler_core.domain.models import (
    Assignment,
    Match,
    Player,
    PreviousAssignment,
    ScheduleConfig,
    ScheduleResult,
    SolverOptions,
    SolverStatus,
)
from scheduler_core._log import (
    log_build_end,
    log_build_start,
    log_infeasible_diagnostics,
    log_solution_extraction,
    log_solve_end,
    log_solve_start,
)
from scheduler_core.engine.diagnostics import diagnose_infeasibility, get_player_ids
from scheduler_core.engine.extraction import extract_solution
from scheduler_core.engine.variables import create_variables, link_start_to_x


class CPSATScheduler:
    """
    CP-SAT based tournament scheduler.
    
    Builds and solves a constraint satisfaction problem to find optimal
    match schedules respecting all hard constraints while minimizing
    soft constraint violations.
    """
    
    def __init__(
        self,
        config: ScheduleConfig,
        solver_options: Optional[SolverOptions] = None,
    ):
        self.config = config
        self.solver_options = solver_options or SolverOptions()
        
        # Model components
        self.model = cp_model.CpModel()
        
        # Data structures
        self.matches: Dict[str, Match] = {}
        self.players: Dict[str, Player] = {}
        self.previous_assignments: Dict[str, PreviousAssignment] = {}
        
        # Decision variables: x[match_id, slot, court] = bool
        self.x: Dict[Tuple[str, int, int], cp_model.IntVar] = {}
        
        # Auxiliary variables for objectives
        self.start_slot: Dict[str, cp_model.IntVar] = {}
        self.end_slot: Dict[str, cp_model.IntVar] = {}
        
        # Soft constraint slack variables
        self.rest_slack: Dict[Tuple[str, str, str], cp_model.IntVar] = {}
        
        # Tracking
        self.infeasible_reasons: List[str] = []
        self.locked_matches: Set[str] = set()
    
    def add_matches(self, matches: List[Match]) -> None:
        """Add matches to be scheduled."""
        for match in matches:
            self.matches[match.id] = match
    
    def add_players(self, players: List[Player]) -> None:
        """Add players with their constraints."""
        for player in players:
            self.players[player.id] = player
    
    def set_previous_assignments(self, assignments: List[PreviousAssignment]) -> None:
        """Set previous assignments for re-optimization."""
        for assignment in assignments:
            self.previous_assignments[assignment.match_id] = assignment
            if assignment.locked:
                self.locked_matches.add(assignment.match_id)
    
    def _create_variables(self) -> None:
        """Create decision variables."""
        self.x, self.start_slot, self.end_slot = create_variables(
            self.model, self.matches, self.config
        )
    
    def _link_start_to_x(self) -> None:
        """Link start slot variables to x decision variables."""
        link_start_to_x(self.model, self.matches, self.config, self.x, self.start_slot)
    
    def _add_exactly_once_constraint(self) -> None:
        """Each match scheduled exactly once."""
        T = self.config.total_slots
        C = self.config.court_count
        
        for match_id, match in self.matches.items():
            d = match.duration_slots
            max_start = T - d
            
            all_vars = [
                self.x[(match_id, t, c)]
                for t in range(max_start + 1)
                for c in range(1, C + 1)
                if (match_id, t, c) in self.x
            ]
            
            if all_vars:
                self.model.AddExactlyOne(all_vars)
            else:
                self.infeasible_reasons.append(
                    f"Match {match.event_code}: no valid time slots available"
                )
    
    def _add_court_capacity_constraint(self) -> None:
        """Court capacity: at most one match per court per slot."""
        T = self.config.total_slots
        C = self.config.court_count
        
        for s in range(T):
            for c in range(1, C + 1):
                overlapping_vars = []
                
                for match_id, match in self.matches.items():
                    d = match.duration_slots
                    for t in range(max(0, s - d + 1), s + 1):
                        if (match_id, t, c) in self.x:
                            overlapping_vars.append(self.x[(match_id, t, c)])
                
                if len(overlapping_vars) > 1:
                    self.model.Add(sum(overlapping_vars) <= 1)
    
    def _add_player_nonoverlap_constraint(self) -> None:
        """Player non-overlap: each player in at most one match per slot."""
        T = self.config.total_slots
        C = self.config.court_count
        
        player_matches: Dict[str, List[Match]] = defaultdict(list)
        for match in self.matches.values():
            for player_id in get_player_ids(match):
                player_matches[player_id].append(match)
        
        for player_id, matches in player_matches.items():
            if len(matches) <= 1:
                continue
            
            for s in range(T):
                overlapping_vars = []
                
                for match in matches:
                    d = match.duration_slots
                    for t in range(max(0, s - d + 1), s + 1):
                        for c in range(1, C + 1):
                            if (match.id, t, c) in self.x:
                                overlapping_vars.append(self.x[(match.id, t, c)])
                
                if len(overlapping_vars) > 1:
                    self.model.Add(sum(overlapping_vars) <= 1)
    
    def _add_availability_constraint(self) -> None:
        """Availability: respect player availability windows."""
        T = self.config.total_slots
        C = self.config.court_count
        
        for match_id, match in self.matches.items():
            d = match.duration_slots
            
            for player_id in get_player_ids(match):
                player = self.players.get(player_id)
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
                            if (match_id, t, c) in self.x:
                                self.model.Add(self.x[(match_id, t, c)] == 0)
    
    def _add_lock_pin_constraints(self) -> None:
        """Locks and pins: respect locked and pinned assignments."""
        T = self.config.total_slots
        C = self.config.court_count
        
        for match_id, assignment in self.previous_assignments.items():
            if match_id not in self.matches:
                continue
            
            match = self.matches[match_id]
            d = match.duration_slots
            
            if assignment.locked:
                t_star = assignment.slot_id
                c_star = assignment.court_id
                
                if (match_id, t_star, c_star) in self.x:
                    self.model.Add(self.x[(match_id, t_star, c_star)] == 1)
                else:
                    self.infeasible_reasons.append(
                        f"Match {match.event_code}: locked assignment ({t_star}, {c_star}) is invalid"
                    )
            else:
                if assignment.pinned_slot_id is not None:
                    t_pin = assignment.pinned_slot_id
                    for t in range(T - d + 1):
                        if t != t_pin:
                            for c in range(1, C + 1):
                                if (match_id, t, c) in self.x:
                                    self.model.Add(self.x[(match_id, t, c)] == 0)
                
                if assignment.pinned_court_id is not None:
                    c_pin = assignment.pinned_court_id
                    for t in range(T - d + 1):
                        for c in range(1, C + 1):
                            if c != c_pin and (match_id, t, c) in self.x:
                                self.model.Add(self.x[(match_id, t, c)] == 0)
    
    def _add_freeze_horizon_constraint(self) -> None:
        """Freeze horizon: treat near-future assignments as locked."""
        horizon = self.config.freeze_horizon_slots
        current = self.config.current_slot
        freeze_until = current + horizon
        
        for match_id, assignment in self.previous_assignments.items():
            if match_id not in self.matches or assignment.locked:
                continue
            
            if assignment.slot_id < freeze_until:
                t_star = assignment.slot_id
                c_star = assignment.court_id
                
                if (match_id, t_star, c_star) in self.x:
                    self.model.Add(self.x[(match_id, t_star, c_star)] == 1)
                    self.locked_matches.add(match_id)
    
    def _add_rest_constraint(self) -> None:
        """Rest constraint: minimum rest between matches for each player."""
        player_matches: Dict[str, List[Match]] = defaultdict(list)
        for match in self.matches.values():
            for player_id in get_player_ids(match):
                player_matches[player_id].append(match)
        
        for player_id, matches in player_matches.items():
            if len(matches) <= 1:
                continue
            
            player = self.players.get(player_id)
            rest_slots = player.rest_slots if player else self.config.default_rest_slots
            is_hard = player.rest_is_hard if player else True
            penalty = player.rest_penalty if player else self.config.rest_slack_penalty
            
            for i in range(len(matches)):
                for j in range(i + 1, len(matches)):
                    m_i = matches[i]
                    m_j = matches[j]
                    
                    b_ij = self.model.NewBoolVar(f"order_{m_i.id}_{m_j.id}_{player_id}")
                    
                    if is_hard or not self.config.soft_rest_enabled:
                        self.model.Add(
                            self.end_slot[m_i.id] + rest_slots <= self.start_slot[m_j.id]
                        ).OnlyEnforceIf(b_ij)
                        self.model.Add(
                            self.end_slot[m_j.id] + rest_slots <= self.start_slot[m_i.id]
                        ).OnlyEnforceIf(b_ij.Not())
                    else:
                        slack = self.model.NewIntVar(0, rest_slots, f"rest_slack_{m_i.id}_{m_j.id}_{player_id}")
                        self.rest_slack[(player_id, m_i.id, m_j.id)] = slack
                        
                        self.model.Add(
                            self.end_slot[m_i.id] + rest_slots - slack <= self.start_slot[m_j.id]
                        ).OnlyEnforceIf(b_ij)
                        self.model.Add(
                            self.end_slot[m_j.id] + rest_slots - slack <= self.start_slot[m_i.id]
                        ).OnlyEnforceIf(b_ij.Not())
    
    def _build_objective(self) -> None:
        """Build the objective function to minimize."""
        objective_terms = []
        
        # Rest slack penalties
        if self.config.soft_rest_enabled:
            for (player_id, m_i, m_j), slack in self.rest_slack.items():
                player = self.players.get(player_id)
                penalty = player.rest_penalty if player else self.config.rest_slack_penalty
                objective_terms.append(int(penalty * 10) * slack)
        
        # Disruption penalty
        if self.previous_assignments and self.config.disruption_penalty > 0:
            for match_id, prev in self.previous_assignments.items():
                if match_id not in self.matches or match_id in self.locked_matches:
                    continue
                
                prev_start = prev.slot_id
                diff_pos = self.model.NewIntVar(0, self.config.total_slots, f"diff_pos_{match_id}")
                diff_neg = self.model.NewIntVar(0, self.config.total_slots, f"diff_neg_{match_id}")
                
                self.model.Add(self.start_slot[match_id] - prev_start == diff_pos - diff_neg)
                objective_terms.append(int(self.config.disruption_penalty * 10) * (diff_pos + diff_neg))
                
                if self.config.court_change_penalty > 0:
                    prev_court = prev.court_id
                    court_changed = self.model.NewBoolVar(f"court_changed_{match_id}")
                    
                    match = self.matches[match_id]
                    d = match.duration_slots
                    same_court_vars = []
                    
                    for t in range(self.config.total_slots - d + 1):
                        if (match_id, t, prev_court) in self.x:
                            same_court_vars.append(self.x[(match_id, t, prev_court)])
                    
                    if same_court_vars:
                        self.model.Add(sum(same_court_vars) + court_changed == 1)
                        objective_terms.append(int(self.config.court_change_penalty * 10) * court_changed)
        
        # Late finish penalty
        if self.config.late_finish_penalty > 0:
            for match_id in self.matches:
                if match_id in self.locked_matches:
                    continue
                objective_terms.append(int(self.config.late_finish_penalty * 10) * self.start_slot[match_id])
        
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
    
    def build(self) -> None:
        """Build the complete CP-SAT model."""
        log_build_start(
            len(self.matches),
            len(self.players),
            self.config.total_slots,
            self.config.court_count,
        )
        self._create_variables()
        self._link_start_to_x()
        self._add_exactly_once_constraint()
        self._add_court_capacity_constraint()
        self._add_player_nonoverlap_constraint()
        self._add_availability_constraint()
        self._add_lock_pin_constraints()
        self._add_freeze_horizon_constraint()
        self._add_rest_constraint()
        self._build_objective()
        log_build_end(len(self.matches))

    def solve(self) -> ScheduleResult:
        """Solve the model and return results."""
        start_time = time_module.perf_counter()
        log_solve_start()

        if self.infeasible_reasons:
            log_infeasible_diagnostics(len(self.infeasible_reasons), self.infeasible_reasons)
            runtime_ms = (time_module.perf_counter() - start_time) * 1000
            log_solve_end(SolverStatus.INFEASIBLE.value, runtime_ms, 0)
            return ScheduleResult(
                status=SolverStatus.INFEASIBLE,
                runtime_ms=runtime_ms,
                infeasible_reasons=self.infeasible_reasons,
                unscheduled_matches=list(self.matches.keys()),
            )

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.solver_options.time_limit_seconds
        solver.parameters.num_search_workers = self.solver_options.num_workers
        solver.parameters.log_search_progress = self.solver_options.log_progress

        status = solver.Solve(self.model)
        runtime_ms = (time_module.perf_counter() - start_time) * 1000

        status_map = {
            cp_model.OPTIMAL: SolverStatus.OPTIMAL,
            cp_model.FEASIBLE: SolverStatus.FEASIBLE,
            cp_model.INFEASIBLE: SolverStatus.INFEASIBLE,
            cp_model.UNKNOWN: SolverStatus.UNKNOWN,
            cp_model.MODEL_INVALID: SolverStatus.MODEL_INVALID,
        }
        solver_status = status_map.get(status, SolverStatus.UNKNOWN)

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            assignments, soft_violations, moved_count = extract_solution(
                solver,
                self.matches,
                self.players,
                self.previous_assignments,
                self.locked_matches,
                self.x,
                self.rest_slack,
                self.config,
                solver_status,
                runtime_ms,
            )
            log_solution_extraction(len(assignments), moved_count, len(self.locked_matches))
            log_solve_end(solver_status.value, runtime_ms, len(assignments))
            return ScheduleResult(
                status=solver_status,
                objective_score=solver.ObjectiveValue() if solver.ObjectiveValue() else None,
                runtime_ms=runtime_ms,
                assignments=assignments,
                soft_violations=soft_violations,
                moved_count=moved_count,
                locked_count=len(self.locked_matches),
            )
        else:
            infeasible_reasons = diagnose_infeasibility(
                self.matches,
                self.players,
                self.config,
                self.infeasible_reasons,
            )
            log_infeasible_diagnostics(len(infeasible_reasons), infeasible_reasons)
            log_solve_end(solver_status.value, runtime_ms, 0)
            return ScheduleResult(
                status=solver_status,
                runtime_ms=runtime_ms,
                infeasible_reasons=infeasible_reasons,
                unscheduled_matches=list(self.matches.keys()),
            )
