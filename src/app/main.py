"""
Standalone CP-SAT Tournament Scheduling API.

A minimal, stateless API for tournament match scheduling using
Google OR-Tools CP-SAT solver.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.schemas import ScheduleRequest, ScheduleResponse, HealthResponse
from app.solver import solve_schedule

app = FastAPI(
    title="Tournament Scheduling API",
    description="""
## CP-SAT Tournament Match Scheduler

A stateless scheduling algorithm API using Google OR-Tools CP-SAT solver.

### Features
- **Constraint-based scheduling**: Handles court capacity, player conflicts, availability windows
- **Soft constraints**: Rest time, disruption minimization, late finish penalties
- **Re-optimization**: Supports locked/pinned assignments and freeze horizons
- **Diagnostics**: Returns detailed infeasibility reasons

### How it works
1. Send a POST request to `/schedule` with matches, players, and config
2. The solver finds an optimal assignment of matches to time slots and courts
3. Returns assignments along with any soft constraint violations

### Input
- `config`: Tournament settings (slots, courts, penalties)
- `players`: List of players with availability and rest constraints
- `matches`: List of matches with player assignments
- `previousAssignments`: (Optional) Previous schedule for re-optimization

### Output
- `status`: optimal, feasible, infeasible, unknown
- `assignments`: Match → (slot, court) mappings
- `softViolations`: Any soft constraint violations
- `infeasibleReasons`: Why scheduling failed (if applicable)
    """,
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - allow all origins for standalone use
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(status="healthy", version=__version__)


@app.post("/schedule", response_model=ScheduleResponse, tags=["Scheduling"])
async def create_schedule(request: ScheduleRequest):
    """
    Generate an optimized schedule for the given matches.
    
    This endpoint takes a complete scheduling problem specification and returns
    an optimal (or near-optimal) assignment of matches to time slots and courts.
    
    **Hard Constraints** (always enforced):
    - Each match scheduled exactly once
    - No court conflicts (one match per court per slot)
    - No player conflicts (player can't be in two matches at once)
    - Player availability windows
    - Locked/pinned assignments
    
    **Soft Constraints** (minimized via objective):
    - Player rest time between matches
    - Disruption from previous schedule
    - Late finish times
    
    **Returns**:
    - `optimal`: Best possible solution found
    - `feasible`: Valid solution but may not be optimal (time limit hit)
    - `infeasible`: No valid schedule exists
    """
    try:
        result = solve_schedule(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/validate", tags=["Scheduling"])
async def validate_request(request: ScheduleRequest):
    """
    Validate a scheduling request without solving.
    
    Returns validation errors if the request is malformed.
    """
    errors = []
    
    # Check player references in matches
    player_ids = {p.id for p in request.players}
    for match in request.matches:
        for pid in match.sideA + match.sideB:
            if pid not in player_ids:
                errors.append(f"Match {match.id}: player {pid} not found")
    
    # Check previous assignment references
    match_ids = {m.id for m in request.matches}
    for assignment in request.previousAssignments:
        if assignment.matchId not in match_ids:
            errors.append(f"Previous assignment references unknown match {assignment.matchId}")
        if assignment.courtId > request.config.courtCount:
            errors.append(f"Previous assignment court {assignment.courtId} exceeds courtCount")
        if assignment.slotId >= request.config.totalSlots:
            errors.append(f"Previous assignment slot {assignment.slotId} exceeds totalSlots")
    
    # Check capacity
    total_match_slots = sum(m.durationSlots for m in request.matches)
    total_capacity = request.config.totalSlots * request.config.courtCount
    if total_match_slots > total_capacity:
        errors.append(
            f"Insufficient capacity: {total_match_slots} match-slots needed, "
            f"only {total_capacity} available"
        )
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "summary": {
            "players": len(request.players),
            "matches": len(request.matches),
            "totalSlots": request.config.totalSlots,
            "courtCount": request.config.courtCount,
            "previousAssignments": len(request.previousAssignments),
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
