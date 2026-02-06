# School Sparring Scheduler

A **stateless** scheduling system for between-school sparring matches, with a FastAPI backend and React frontend, using Google OR-Tools CP-SAT solver for optimal match scheduling.

## Overview

This system is designed for scheduling matches between schools (School A vs School B). It provides:
- **Stateless Backend API**: FastAPI-based scheduling algorithm using CP-SAT solver
- **Frontend UI**: React-based web interface with local data storage
- **No Database**: All data is stored in browser localStorage for simplicity

**Key Features:**
- Stateless architecture - no server-side persistence
- Client-side data management with localStorage
- CP-SAT constraint solver for optimal scheduling
- Simple school vs school match model

## Quick Start

### Using Docker (Backend Only)

```bash
# Build and run backend
docker-compose up --build

# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at http://localhost:5173 (Vite default port).

## Project Structure

```
schedulingalg/
├── backend/               # Stateless FastAPI backend
│   ├── app/              # FastAPI application
│   ├── api/              # API endpoints
│   └── services/         # Business logic
├── src/                  # Scheduler core library
│   └── scheduler_core/   # CP-SAT solver implementation
├── frontend/             # React frontend with localStorage
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # React hooks
│   │   ├── store/       # Zustand store with localStorage
│   │   └── api/         # API client
│   └── package.json
└── docker-compose.yml    # Docker setup (backend only)
```

## How It Works

### Stateless Architecture

```
┌──────────────────────────────────────┐
│          Browser (Frontend)          │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  localStorage                  │ │
│  │  - Config                      │ │
│  │  - Players                     │ │
│  │  - Matches                     │ │
│  │  - Groups                      │ │
│  └────────────────────────────────┘ │
│                ↓                     │
│  ┌────────────────────────────────┐ │
│  │  React + Zustand Store         │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
                 ↓
        POST /schedule
   {config, players, matches}
                 ↓
┌──────────────────────────────────────┐
│     FastAPI Backend (Stateless)      │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  CP-SAT Solver (OR-Tools)      │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
                 ↓
        JSON Schedule Response
                 ↓
         Display in Frontend
```

**No database. No server-side state. Pure request/response API.**

## Features

### Backend
- **Stateless API**: Single endpoint accepts all data and returns schedule
- **CP-SAT Solver**: Google OR-Tools constraint programming for optimal scheduling
- **Hard Constraints**: Player availability, rest time requirements
- **Soft Constraints**: Court preferences, minimize violations
- **Fast**: Optimizes complex schedules in seconds

### Frontend
- **Player Management**: Add and manage players with availability windows
- **School Grouping**: Organize players by school
- **Match Creation**: Simple match creation (School A vs School B)
- **Schedule Visualization**: Grid and timeline views
- **Local Storage**: All data persists in browser
- **Export/Import**: Export/import data as JSON for backup

## Workflow

1. **Setup** (`/setup`) - Configure tournament settings (times, courts, intervals)
2. **Roster** (`/roster`) - Add schools and players with availability
3. **Matches** (`/matches`) - Create matches between schools
4. **Schedule** (`/schedule`) - Generate optimized schedule using CP-SAT solver

All data is stored locally in your browser. Use Export to save your work!

## Use Case

This system is optimized for **between-school sparring** scenarios where:
- Schools compete against each other in matches
- Matches are simple: School A players vs School B players
- No complex tournament brackets or draws needed
- Focus is on optimal scheduling respecting player availability and rest times
- Quick setup without database configuration

## API Endpoints

### POST /schedule
Generate optimized schedule.

**Request:**
```json
{
  "config": {
    "intervalMinutes": 15,
    "dayStart": "09:00",
    "dayEnd": "17:00",
    "breaks": [],
    "courtCount": 2,
    "defaultRestMinutes": 30,
    "freezeHorizonSlots": 0
  },
  "players": [
    {
      "id": "p1",
      "name": "Alice",
      "groupId": "school-a",
      "availability": [],
      "minRestMinutes": 30
    }
  ],
  "matches": [
    {
      "id": "m1",
      "sideA": ["p1"],
      "sideB": ["p2"],
      "durationSlots": 1
    }
  ]
}
```

**Response:**
```json
{
  "assignments": [
    {
      "matchId": "m1",
      "slotId": 0,
      "courtId": 0,
      "durationSlots": 1
    }
  ],
  "unscheduledMatches": [],
  "softViolations": [],
  "status": "optimal",
  "objectiveScore": 0.0
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0"
}
```

## Development

### Running Tests

```bash
cd backend
pytest
```

### Building for Production

```bash
# Backend
docker build -t scheduler-backend -f backend/Dockerfile .

# Frontend
cd frontend
npm run build
```

## License

MIT
