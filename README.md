# CP-SAT Scheduling Engine

Tournament match scheduling via constraint programming. Competition layer (what to play) + scheduling layer (when/where). Use as a library or HTTP API.

**Tech stack:** Python, [OR-Tools](https://developers.google.com/optimization) CP-SAT, [FastAPI](https://fastapi.tiangolo.com/), Pydantic.

---

## How to start

**API server (default port 8000):**

```bash
cd src && PYTHONPATH=. uvicorn adapters.fastapi.main:app --host 0.0.0.0 --port 8000
```

**Library (no server):**

```python
from scheduler_core import schedule, SchedulingProblem, ScheduleConfig, Player, Match

config = ScheduleConfig(total_slots=10, court_count=2)
players = [Player(id="p1", name="Alice"), Player(id="p2", name="Bob")]
matches = [Match(id="m1", event_code="MS-1", side_a=["p1"], side_b=["p2"])]
result = schedule(SchedulingProblem(config=config, players=players, matches=matches))
print(result.status.value, result.assignments)
```

---
