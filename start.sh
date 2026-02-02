#!/bin/bash
# Scheduling App - Single Command Deployment
#
# Usage:
#   ./start.sh           - Start all services
#   ./start.sh restart   - Restart backend only (rebuild Docker)
#   ./start.sh stop      - Stop all services
#   ./start.sh logs      - View backend logs
#
# Manual commands:
#   docker-compose down                 - Stop backend
#   docker-compose up -d --build        - Rebuild and start backend
#   docker-compose logs -f              - Follow backend logs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Handle commands
case "${1:-start}" in
    stop)
        echo "Stopping all services..."
        docker-compose down
        echo "Stopped."
        exit 0
        ;;
    restart)
        echo "Restarting backend..."
        docker-compose down
        docker-compose up -d --build
        echo "Backend restarted. Waiting for health check..."
        sleep 5
        if curl -s http://localhost:8000/health | grep -q '"status":"healthy"'; then
            echo "Backend is healthy!"
        else
            echo "Backend may still be starting. Check with: docker-compose logs"
        fi
        exit 0
        ;;
    logs)
        docker-compose logs -f
        exit 0
        ;;
esac

echo "=== Scheduling App Startup ==="

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down..."
    cd "$SCRIPT_DIR"
    docker-compose down
    echo "Cleanup complete"
}

# Register cleanup on exit
trap cleanup EXIT INT TERM

# Check Docker is running
echo ""
echo "Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker."
    exit 1
fi
echo "Docker is running"

# Check Node.js is installed
echo ""
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js."
    exit 1
fi
echo "Node.js $(node --version) found"

# Start backend with Docker
echo ""
echo "Starting backend (Docker)..."
docker-compose up -d --build
if [ $? -ne 0 ]; then
    echo "Error: Failed to start backend containers"
    exit 1
fi

# Wait for backend health check
echo ""
echo "Waiting for backend to be ready..."
max_attempts=30
attempt=0
healthy=false

while [ $attempt -lt $max_attempts ] && [ "$healthy" = false ]; do
    sleep 1
    attempt=$((attempt + 1))
    if curl -s http://localhost:8000/health | grep -q '"status":"healthy"'; then
        healthy=true
    else
        echo "  Attempt $attempt/$max_attempts - Backend starting..."
    fi
done

if [ "$healthy" = false ]; then
    echo "Error: Backend failed to become healthy after $max_attempts seconds"
    docker-compose logs
    exit 1
fi

echo "Backend is healthy!"

# Install frontend dependencies if needed
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing frontend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: npm install failed"
        exit 1
    fi
fi

# Start frontend
echo ""
echo "Starting frontend..."
echo "=== App Ready ==="
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

npm run dev
