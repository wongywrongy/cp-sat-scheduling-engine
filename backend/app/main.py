"""Main FastAPI application - simplified for school sparring."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from api import tournaments, roster, matches, schedule

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="School Sparring Scheduler API",
    description="Backend API for school sparring match scheduling",
    version="2.0.0",
)

# CORS middleware - explicit dev origins for local development
DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",  # Vite preview
    "http://127.0.0.1:4173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_ORIGINS,
    allow_credentials=False,  # Set to False when not using cookies/session auth
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["*"],
)

# Register routers
app.include_router(tournaments.router)
app.include_router(roster.router)
app.include_router(matches.router)
app.include_router(schedule.router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
