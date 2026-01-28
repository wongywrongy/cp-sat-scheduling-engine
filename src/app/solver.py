"""
CP-SAT Tournament Scheduling Algorithm.

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

from app.schemas import (
    ScheduleRequest,
    ScheduleResponse,
    Assignment,
    SoftViolation,
    SolverStatus,
    PlayerInput,
    MatchInput,
    PreviousAssignment,
    ScheduleConfig,
    SolverOptions,
)


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
        self.matches: Dict[str, MatchInput] = {}
        self.players: Dict[str, PlayerInput] = {}
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
    
    def add_matches(self, matches: List[MatchInput]) -> None:
        """Add matches to be scheduled."""
        for match in matches:
            self.matches[match.id] = match
    
    def add_players(self, players: List[PlayerInput]) -> None:
        """Add players with their constraints."""
        for player in players:
            self.players[player.id] = player
    
    def set_previous_assignments(self, assignments: List[PreviousAssignment]) -> None:
        """Set previous assignments for re-optimization."""
        for assignment in assignments:
            self.previous_assignments[assignment.matchId] = assignment
            if assignment.locked:
                self.locked_matches.add(assignment.matchId)
    
    def _get_player_ids(self, match: MatchInput) -> Set[str]:
        """Get all player IDs in a match."""
        return set(match.sideA) | set(match.sideB)
    
    def _create_variables(self) -> None:
        """Create decision variables."""
        T = self.config.totalSlots
        C = self.config.courtCount
        
        for match_id, match in self.matches.items():
            d = match.durationSlots
            max_start = T - d
            
            for t in range(max_start + 1):
                for c in range(1, C + 1):
                    var_name = f"x_{match_id}_{t}_{c}"
                    self.x[(match_id, t, c)] = self.model.NewBoolVar(var_name)
            
            self.start_slot[match_id] = self.model.NewIntVar(0, max_start, f"start_{match_id}")
            self.end_slot[match_id] = self.model.NewIntVar(d, T, f"end_{match_id}")
            self.model.Add(self.end_slot[match_id] == self.start_slot[match_id] + d)
    
    def _link_start_to_x(self) -> None:
        """Link start slot variables to x decision variables."""
        T = self.config.totalSlots
        C = self.config.courtCount
        
        for match_id, match in self.matches.items():
            d = match.durationSlots
            max_start = T - d
            
            terms = []
            for t in range(max_start + 1):
                for c in range(1, C + 1):
                    if (match_id, t, c) in self.x:
                        terms.append(t * self.x[(match_id, t, c)])
            
            if terms:
                self.model.Add(self.start_slot[match_id] == sum(terms))
    
    def _add_exactly_once_constraint(self) -> None:
        """Each match scheduled exactly once."""
        T = self.config.totalSlots
        C = self.config.courtCount
        
        for match_id, match in self.matches.items():
            d = match.durationSlots
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
                    f"Match {match.eventCode}: no valid time slots available"
                )
    
    def _add_court_capacity_constraint(self) -> None:
        """Court capacity: at most one match per court per slot."""
        T = self.config.totalSlots
        C = self.config.courtCount
        
        for s in range(T):
            for c in range(1, C + 1):
                overlapping_vars = []
                
                for match_id, match in self.matches.items():
                    d = match.durationSlots
                    for t in range(max(0, s - d + 1), s + 1):
                        if (match_id, t, c) in self.x:
                            overlapping_vars.append(self.x[(match_id, t, c)])
                
                if len(overlapping_vars) > 1:
                    self.model.Add(sum(overlapping_vars) <= 1)
    
    def _add_player_nonoverlap_constraint(self) -> None:
        """Player non-overlap: each player in at most one match per slot."""
        T = self.config.totalSlots
        C = self.config.courtCount
        
        player_matches: Dict[str, List[MatchInput]] = defaultdict(list)
        for match in self.matches.values():
            for player_id in self._get_player_ids(match):
                player_matches[player_id].append(match)
        
        for player_id, matches in player_matches.items():
            if len(matches) <= 1:
                continue
            
            for s in range(T):
                overlapping_vars = []
                
                for match in matches:
                    d = match.durationSlots
                    for t in range(max(0, s - d + 1), s + 1):
                        for c in range(1, C + 1):
                            if (match.id, t, c) in self.x:
                                overlapping_vars.append(self.x[(match.id, t, c)])
                
                if len(overlapping_vars) > 1:
                    self.model.Add(sum(overlapping_vars) <= 1)
    
    def _add_availability_constraint(self) -> None:
        """Availability: respect player availability windows."""
        T = self.config.totalSlots
        C = self.config.courtCount
        
        for match_id, match in self.matches.items():
            d = match.durationSlots
            
            for player_id in self._get_player_ids(match):
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
        T = self.config.totalSlots
        C = self.config.courtCount
        
        for match_id, assignment in self.previous_assignments.items():
            if match_id not in self.matches:
                continue
            
            match = self.matches[match_id]
            d = match.durationSlots
            
            if assignment.locked:
                t_star = assignment.slotId
                c_star = assignment.courtId
                
                if (match_id, t_star, c_star) in self.x:
                    self.model.Add(self.x[(match_id, t_star, c_star)] == 1)
                else:
                    self.infeasible_reasons.append(
                        f"Match {match.eventCode}: locked assignment ({t_star}, {c_star}) is invalid"
                    )
            else:
                if assignment.pinnedSlotId is not None:
                    t_pin = assignment.pinnedSlotId
                    for t in range(T - d + 1):
                        if t != t_pin:
                            for c in range(1, C + 1):
                                if (match_id, t, c) in self.x:
                                    self.model.Add(self.x[(match_id, t, c)] == 0)
                
                if assignment.pinnedCourtId is not None:
                    c_pin = assignment.pinnedCourtId
                    for t in range(T - d + 1):
                        for c in range(1, C + 1):
                            if c != c_pin and (match_id, t, c) in self.x:
                                self.model.Add(self.x[(match_id, t, c)] == 0)
    
    def _add_freeze_horizon_constraint(self) -> None:
        """Freeze horizon: treat near-future assignments as locked."""
        horizon = self.config.freezeHorizonSlots
        current = self.config.currentSlot
        freeze_until = current + horizon
        
        for match_id, assignment in self.previous_assignments.items():
            if match_id not in self.matches or assignment.locked:
                continue
            
            if assignment.slotId < freeze_until:
                t_star = assignment.slotId
                c_star = assignment.courtId
                
                if (match_id, t_star, c_star) in self.x:
                    self.model.Add(self.x[(match_id, t_star, c_star)] == 1)
                    self.locked_matches.add(match_id)
    
    def _add_rest_constraint(self) -> None:
        """Rest constraint: minimum rest between matches for each player."""
        player_matches: Dict[str, List[MatchInput]] = defaultdict(list)
        for match in self.matches.values():
            for player_id in self._get_player_ids(match):
                player_matches[player_id].append(match)
        
        for player_id, matches in player_matches.items():
            if len(matches) <= 1:
                continue
            
            player = self.players.get(player_id)
            rest_slots = player.restSlots if player else self.config.defaultRestSlots
            is_hard = player.restIsHard if player else True
            penalty = player.restPenalty if player else self.config.restSlackPenalty
            
            for i in range(len(matches)):
                for j in range(i + 1, len(matches)):
                    m_i = matches[i]
                    m_j = matches[j]
                    
                    b_ij = self.model.NewBoolVar(f"order_{m_i.id}_{m_j.id}_{player_id}")
                    
                    if is_hard or not self.config.softRestEnabled:
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
        if self.config.softRestEnabled:
            for (player_id, m_i, m_j), slack in self.rest_slack.items():
                player = self.players.get(player_id)
                penalty = player.restPenalty if player else self.config.restSlackPenalty
                objective_terms.append(int(penalty * 10) * slack)
        
        # Disruption penalty
        if self.previous_assignments and self.config.disruptionPenalty > 0:
            for match_id, prev in self.previous_assignments.items():
                if match_id not in self.matches or match_id in self.locked_matches:
                    continue
                
                prev_start = prev.slotId
                diff_pos = self.model.NewIntVar(0, self.config.totalSlots, f"diff_pos_{match_id}")
                diff_neg = self.model.NewIntVar(0, self.config.totalSlots, f"diff_neg_{match_id}")
                
                self.model.Add(self.start_slot[match_id] - prev_start == diff_pos - diff_neg)
                objective_terms.append(int(self.config.disruptionPenalty * 10) * (diff_pos + diff_neg))
                
                if self.config.courtChangePenalty > 0:
                    prev_court = prev.courtId
                    court_changed = self.model.NewBoolVar(f"court_changed_{match_id}")
                    
                    match = self.matches[match_id]
                    d = match.durationSlots
                    same_court_vars = []
                    
                    for t in range(self.config.totalSlots - d + 1):
                        if (match_id, t, prev_court) in self.x:
                            same_court_vars.append(self.x[(match_id, t, prev_court)])
                    
                    if same_court_vars:
                        self.model.Add(sum(same_court_vars) + court_changed == 1)
                        objective_terms.append(int(self.config.courtChangePenalty * 10) * court_changed)
        
        # Late finish penalty
        if self.config.lateFinishPenalty > 0:
            for match_id in self.matches:
                if match_id in self.locked_matches:
                    continue
                objective_terms.append(int(self.config.lateFinishPenalty * 10) * self.start_slot[match_id])
        
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
    
    def build(self) -> None:
        """Build the complete CP-SAT model."""
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
    
    def solve(self) -> ScheduleResponse:
        """Solve the model and return results."""
        start_time = time_module.perf_counter()
        
        if self.infeasible_reasons:
            return ScheduleResponse(
                status=SolverStatus.INFEASIBLE,
                runtimeMs=(time_module.perf_counter() - start_time) * 1000,
                infeasibleReasons=self.infeasible_reasons,
                unscheduledMatches=list(self.matches.keys()),
            )
        
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.solver_options.timeLimitSeconds
        solver.parameters.num_search_workers = self.solver_options.numWorkers
        solver.parameters.log_search_progress = self.solver_options.logProgress
        
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
            return self._extract_solution(solver, solver_status, runtime_ms)
        else:
            return ScheduleResponse(
                status=solver_status,
                runtimeMs=runtime_ms,
                infeasibleReasons=self._diagnose_infeasibility(),
                unscheduledMatches=list(self.matches.keys()),
            )
    
    def _extract_solution(
        self,
        solver: cp_model.CpSolver,
        status: SolverStatus,
        runtime_ms: float,
    ) -> ScheduleResponse:
        """Extract solution from solved model."""
        assignments: List[Assignment] = []
        soft_violations: List[SoftViolation] = []
        moved_count = 0
        
        for match_id, match in self.matches.items():
            found = False
            for (m, t, c), var in self.x.items():
                if m == match_id and solver.Value(var) == 1:
                    prev = self.previous_assignments.get(match_id)
                    moved = False
                    prev_slot = None
                    prev_court = None
                    
                    if prev and match_id not in self.locked_matches:
                        if prev.slotId != t or prev.courtId != c:
                            moved = True
                            moved_count += 1
                            prev_slot = prev.slotId
                            prev_court = prev.courtId
                    
                    assignments.append(Assignment(
                        matchId=match_id,
                        slotId=t,
                        courtId=c,
                        durationSlots=match.durationSlots,
                        moved=moved,
                        previousSlotId=prev_slot,
                        previousCourtId=prev_court,
                    ))
                    found = True
                    break
        
        if self.config.softRestEnabled:
            for (player_id, m_i, m_j), slack in self.rest_slack.items():
                slack_val = solver.Value(slack)
                if slack_val > 0:
                    player = self.players.get(player_id)
                    player_name = player.name if player else player_id
                    soft_violations.append(SoftViolation(
                        type="rest",
                        playerId=player_id,
                        description=f"Player {player_name} has {slack_val} slots less rest than required",
                        penaltyIncurred=slack_val * (player.restPenalty if player else 10.0),
                    ))
        
        return ScheduleResponse(
            status=status,
            objectiveScore=solver.ObjectiveValue() if solver.ObjectiveValue() else None,
            runtimeMs=runtime_ms,
            assignments=assignments,
            softViolations=soft_violations,
            movedCount=moved_count,
            lockedCount=len(self.locked_matches),
        )
    
    def _diagnose_infeasibility(self) -> List[str]:
        """Attempt to diagnose why the model is infeasible."""
        reasons = list(self.infeasible_reasons)
        
        if not self.matches:
            reasons.append("No matches to schedule")
        
        total_match_slots = sum(m.durationSlots for m in self.matches.values())
        total_capacity = self.config.totalSlots * self.config.courtCount
        if total_match_slots > total_capacity:
            reasons.append(
                f"Not enough capacity: {total_match_slots} match-slots needed, "
                f"but only {total_capacity} available"
            )
        
        from collections import Counter
        player_match_count = Counter()
        for match in self.matches.values():
            for pid in self._get_player_ids(match):
                player_match_count[pid] += match.durationSlots
        
        for player_id, slots_needed in player_match_count.items():
            player = self.players.get(player_id)
            if player and player.availability:
                available_slots = sum(end - start for start, end in player.availability)
                if slots_needed > available_slots:
                    reasons.append(
                        f"Player {player.name} needs {slots_needed} slots "
                        f"but only available for {available_slots}"
                    )
        
        if not reasons:
            reasons.append("Could not determine specific cause - constraints may be too restrictive")
        
        return reasons


def solve_schedule(request: ScheduleRequest) -> ScheduleResponse:
    """
    Main entry point for scheduling.
    
    Takes a complete scheduling request and returns the optimized schedule.
    """
    scheduler = CPSATScheduler(
        config=request.config,
        solver_options=request.solverOptions,
    )
    
    scheduler.add_players(request.players)
    scheduler.add_matches(request.matches)
    scheduler.set_previous_assignments(request.previousAssignments)
    
    scheduler.build()
    return scheduler.solve()
