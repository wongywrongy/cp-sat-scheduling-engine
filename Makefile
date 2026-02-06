.PHONY: build run stop logs clean dev help

# Default target
help:
	@echo "Tournament Scheduler - Available Commands"
	@echo ""
	@echo "Production (Docker):"
	@echo "  make build    - Build Docker images"
	@echo "  make run      - Build and run production (http://localhost)"
	@echo "  make stop     - Stop all containers"
	@echo "  make logs     - View container logs"
	@echo "  make clean    - Stop and remove containers, images, volumes"
	@echo ""
	@echo "Development (Hybrid):"
	@echo "  make dev      - Run backend (Docker) + frontend (npm dev server)"
	@echo ""

# === Production Commands ===

build:
	docker-compose build

run:
	docker-compose up -d --build
	@echo ""
	@echo "Application starting..."
	@echo "  Frontend: http://localhost"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/docs"
	@echo ""
	@echo "Run 'make logs' to view logs"

stop:
	docker-compose down

logs:
	docker-compose logs -f

clean:
	docker-compose down -v --rmi local
	@echo "Cleaned up containers and images"

# === Development Commands ===

dev:
	@echo "Starting development environment..."
	@echo "Backend: Docker | Frontend: npm dev server"
	@echo ""
	docker-compose up -d --build backend
	@echo "Waiting for backend..."
	@sleep 5
	@curl -s http://localhost:8000/health > /dev/null && echo "Backend ready!" || echo "Backend starting..."
	@echo ""
	@echo "Starting frontend dev server..."
	cd frontend && npm run dev
