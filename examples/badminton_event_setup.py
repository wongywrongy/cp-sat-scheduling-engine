"""Badminton-style setup: CompetitionGraph -> ready PlayUnits -> schedule.

Run from project root:
  PYTHONPATH=src python examples/badminton_event_setup.py

Uses pool format, bridge, and CPSAT backend.
"""
from scheduler_core import (
    schedule,
    ScheduleConfig,
    SchedulingProblemBuilder,
    CPSATBackend,
    Participant,
    Event,
    PoolGenerationPolicy,
    CompetitionGraph,
    TournamentState,
)

# Participants and event
participants = [
    Participant(id=f"p{i}", name=f"Player {i}") for i in range(4)
]
event = Event(
    id="MS",
    format_plugin_name="pool",
    parameters={"pool_size": 4, "expected_duration_slots": 1},
)

# Competition layer: generate pool matches
graph = CompetitionGraph()
PoolGenerationPolicy().generate_initial_units(participants, event, seed=42, graph=graph)
ready = graph.ready_unit_ids({})

state = TournamentState(
    participants={p.id: p for p in participants},
    play_units=graph.play_units,
    events={event.id: event},
)

# Bridge: state + ready -> SchedulingProblem
config = ScheduleConfig(total_slots=20, court_count=2)
request = SchedulingProblemBuilder().build(state, ready, config)

# Schedule
backend = CPSATBackend()
result = backend.solve(request)

print(f"Status: {result.status.value}, assignments: {len(result.assignments)}")
for a in result.assignments:
    print(f"  {a.match_id} -> slot {a.slot_id}, court {a.court_id}")
