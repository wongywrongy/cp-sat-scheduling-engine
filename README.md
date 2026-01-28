# CP-SAT Scheduling Engine

Tournament match scheduling via constraint programming. Competition layer (what to play) + scheduling layer (when/where). Use as a library or HTTP API.

**Tech stack:** Python 3.x, [OR-Tools](https://developers.google.com/optimization) CP-SAT, [FastAPI](https://fastapi.tiangolo.com/), Pydantic.

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

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| **GET** | `/health` | Health check. Returns `{ "status": "healthy", "version": "..." }`. |
| **POST** | `/schedule` | Solve. Body: `ScheduleRequest` (config, players, matches, optional previousAssignments, solverOptions). Returns `ScheduleResponse` (status, assignments, softViolations, infeasibleReasons, …). |
| **POST** | `/validate` | Validate request only. Same body as `/schedule`. Returns `{ "valid": bool, "errors": [...], "summary": {...} }`. |
| **GET** | `/docs` | Swagger UI. |
| **GET** | `/redoc` | ReDoc. |

Base URL when running locally: `http://localhost:8000`.
