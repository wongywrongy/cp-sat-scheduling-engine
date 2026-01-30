# School Sparring Scheduler

A simplified scheduling system for between-school sparring matches, with a FastAPI backend and React frontend, using Google OR-Tools CP-SAT solver for optimal match scheduling.

## Overview

This system is designed for scheduling matches between schools (School A vs School B). It provides:
- **Backend API**: FastAPI-based scheduling algorithm API
- **Frontend UI**: React-based web interface for player management, match creation, and schedule visualization

## Quick Start

### Using Docker (Recommended)

```bash
# Build and run both backend and frontend
docker-compose up --build

# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Frontend: http://localhost:3000
```

### Local Development

#### Backend

```bash
cd src

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -e ".[dev]"

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
├── src/                    # Backend API
│   ├── app/               # FastAPI application
│   ├── adapters/          # API adapters
│   └── scheduler_core/    # Core scheduling logic
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   └── store/         # State management
│   └── package.json
└── docker-compose.yml     # Docker setup
```

## Features

### Backend
- CP-SAT constraint programming solver for optimal scheduling
- Hard and soft constraints (availability, rest times, court preferences)
- Re-optimization support
- Simple match model: School A vs School B with player lists

### Frontend
- **Player Management**: Add and manage players with availability windows
- **Match Creation**: Simple match creation (School A vs School B)
- **Schedule Visualization**: Grid and timeline views
- **Interactive Editing**: Edit match assignments
- **Re-optimization**: Lock matches and re-optimize
- **Court Management**: Reorder court display
- **Export/Import**: CSV import for players and matches

## Use Case

This system is optimized for **between-school sparring** scenarios where:
- Schools compete against each other
- Matches are simple: School A players vs School B players
- No complex tournament brackets or draws needed
- Focus is on optimal scheduling respecting player availability and rest times

## API Endpoints

See [src/README.md](src/README.md) for detailed API documentation.

## License

MIT
