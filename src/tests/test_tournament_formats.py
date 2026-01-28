"""Tests for competition/format layer, bridge, backends, and live ops."""

from scheduler_core import (
    BracketGenerationPolicy,
    BridgeOptions,
    CompetitionGraph,
    CPSATBackend,
    GreedyBackend,
    Participant,
    Event,
    PoolGenerationPolicy,
    KnockoutAdvancementPolicy,
    SchedulingProblemBuilder,
    ScheduleConfig,
    TournamentState,
    Result,
    WinnerSide,
    result_from_schedule,
    reschedule,
    update_actuals,
    apply_freeze_horizon,
    handle_no_show,
    handle_court_outage,
    LiveOpsConfig,
)
from scheduler_core.domain.tournament import TournamentAssignment


def test_bracket_generation_and_bridge_greedy():
    """BracketGenerationPolicy -> Bridge -> GreedyBackend."""
    ps = [Participant(id=f"p{i}", name=f"P{i}") for i in range(8)]
    ev = Event(id="e1", format_plugin_name="bracket", parameters={"expected_duration_slots": 1})
    g = CompetitionGraph()
    BracketGenerationPolicy().generate(ps, ev, 42, g)
    assert len(g.play_units) == 4
    ready = g.ready_unit_ids({})
    assert len(ready) == 4

    state = TournamentState(
        participants={p.id: p for p in ps},
        play_units=g.play_units,
        events={"e1": ev},
    )
    cfg = ScheduleConfig(total_slots=20, court_count=2)
    req = SchedulingProblemBuilder().build(state, ready, cfg)
    assert len(req.matches) == 4
    assert len(req.players) == 8

    res = GreedyBackend().solve(req)
    assert res.status.value == "feasible"
    assert len(res.assignments) == 4


def test_pool_generation_and_bridge_cpsat():
    """PoolGenerationPolicy -> Bridge -> CPSATBackend."""
    ps = [Participant(id=f"p{i}", name=f"P{i}") for i in range(4)]
    ev = Event(id="e2", format_plugin_name="pool", parameters={"pool_size": 4})
    g = CompetitionGraph()
    PoolGenerationPolicy().generate(ps, ev, 0, g)
    assert len(g.play_units) == 6
    ready = g.ready_unit_ids({})
    assert len(ready) == 6

    state = TournamentState(
        participants={p.id: p for p in ps},
        play_units=g.play_units,
        events={"e2": ev},
    )
    cfg = ScheduleConfig(total_slots=20, court_count=2)
    req = SchedulingProblemBuilder().build(state, ready, cfg)
    res = CPSATBackend().solve(req)
    assert res.status.value in ("optimal", "feasible")
    assert len(res.assignments) == 6


def test_knockout_advancement_creates_round2():
    """KnockoutAdvancementPolicy creates round-2 match when both feeders have results."""
    ps = [Participant(id=f"p{i}", name=f"P{i}") for i in range(8)]
    ev = Event(id="e1", format_plugin_name="bracket", parameters={})
    g = CompetitionGraph()
    BracketGenerationPolicy().generate(ps, ev, 0, g)
    unit_ids = list(g.play_units.keys())
    u0, u1 = unit_ids[0], unit_ids[1]

    results = {}
    results[u0] = Result(winner_side=WinnerSide.A)
    results[u1] = Result(winner_side=WinnerSide.B)
    pol = KnockoutAdvancementPolicy()
    pol.on_result(u0, results[u0], g, results)
    pol.on_result(u1, results[u1], g, results)

    r2 = [uid for uid in g.play_units if "r2" in uid]
    assert len(r2) == 1
    r2_unit = g.play_units[r2[0]]
    assert r2_unit.metadata.get("round") == 2
    assert r2_unit.dependencies == [u0, u1]


def test_bridge_options_rolling_horizon_and_freeze():
    """BridgeOptions: rolling_horizon_slots, max_units, freeze_horizon_slots, current_slot."""
    ps = [Participant(id=f"p{i}", name=f"P{i}") for i in range(4)]
    ev = Event(id="e2", format_plugin_name="pool", parameters={"pool_size": 4})
    g = CompetitionGraph()
    PoolGenerationPolicy().generate(ps, ev, 0, g)
    ready = g.ready_unit_ids({})
    state = TournamentState(
        participants={p.id: p for p in ps},
        play_units=g.play_units,
        events={"e2": ev},
    )
    cfg = ScheduleConfig(
        total_slots=20,
        court_count=2,
        freeze_horizon_slots=2,
        current_slot=0,
    )
    opts = BridgeOptions(max_units=3, rolling_horizon_slots=10)
    req = SchedulingProblemBuilder().build(state, ready, cfg, opts)
    assert len(req.matches) == 3
    assert req.config.total_slots == 10


def test_live_ops_update_actuals_and_freeze():
    """update_actuals, apply_freeze_horizon, result_from_schedule."""
    ps = [Participant(id="p1", name="P1"), Participant(id="p2", name="P2")]
    ev = Event(id="e1", format_plugin_name="pool", parameters={"pool_size": 2})
    g = CompetitionGraph()
    PoolGenerationPolicy().generate(ps, ev, 0, g)
    ready = g.ready_unit_ids({})
    state = TournamentState(
        participants={p.id: p for p in ps},
        play_units=g.play_units,
        events={"e1": ev},
    )
    cfg = ScheduleConfig(total_slots=10, court_count=1)
    req = SchedulingProblemBuilder().build(state, ready, cfg)
    res = GreedyBackend().solve(req)
    result_from_schedule(state, res)
    assert len(state.assignments) == 1
    uid = list(state.assignments.keys())[0]
    ta = state.assignments[uid]
    assert ta.slot_id >= 0
    assert ta.court_id >= 1

    update_actuals(state, uid, ta.slot_id, ta.slot_id + 2)
    assert state.assignments[uid].actual_start_slot == ta.slot_id
    assert state.assignments[uid].actual_end_slot == ta.slot_id + 2

    apply_freeze_horizon(state, ScheduleConfig(total_slots=10, court_count=1, freeze_horizon_slots=5, current_slot=0))
    assert state.assignments[uid].locked is True


def test_live_ops_reschedule():
    """reschedule with LiveOpsConfig and backend."""
    ps = [Participant(id=f"p{i}", name=f"P{i}") for i in range(4)]
    ev = Event(id="e2", format_plugin_name="pool", parameters={"pool_size": 4})
    g = CompetitionGraph()
    PoolGenerationPolicy().generate(ps, ev, 0, g)
    ready = g.ready_unit_ids({})
    state = TournamentState(
        participants={p.id: p for p in ps},
        play_units=g.play_units,
        events={"e2": ev},
    )
    cfg = ScheduleConfig(total_slots=20, court_count=2)
    live = LiveOpsConfig(max_units=4)
    res = reschedule(state, ready, cfg, GreedyBackend(), live_config=live)
    assert res.status.value == "feasible"
    assert len(res.assignments) == 4


def test_handle_no_show_and_court_outage():
    """handle_no_show records walkover; handle_court_outage returns reduced config."""
    state = TournamentState()
    state.results["m1"] = Result(winner_side=WinnerSide.NONE)
    handle_no_show(state, "m1", WinnerSide.A)
    assert state.results["m1"].walkover is True
    assert state.results["m1"].winner_side == WinnerSide.A

    cfg = ScheduleConfig(total_slots=20, court_count=4)
    reduced = handle_court_outage(cfg, {2, 3})
    assert reduced.court_count == 2


def test_terminology_slot_locked_pinned_freeze():
    """Terminology: slot, locked, pinned, freeze used consistently in config and models."""
    cfg = ScheduleConfig(
        total_slots=10,
        court_count=2,
        freeze_horizon_slots=2,
        current_slot=0,
    )
    assert hasattr(cfg, "total_slots") and hasattr(cfg, "freeze_horizon_slots") and hasattr(cfg, "current_slot")

    ta = TournamentAssignment(play_unit_id="u1", slot_id=1, court_id=1, locked=True, pinned_slot_id=1, pinned_court_id=1)
    assert ta.slot_id == 1 and ta.locked is True and ta.pinned_slot_id == 1 and ta.pinned_court_id == 1
