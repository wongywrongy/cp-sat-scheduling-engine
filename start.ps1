# Scheduling App - Single Command Deployment
#
# Usage:
#   .\start.ps1           - Start all services
#   .\start.ps1 restart   - Restart backend only (rebuild Docker)
#   .\start.ps1 stop      - Stop all services
#   .\start.ps1 logs      - View backend logs
#
# Manual commands:
#   docker-compose down                 - Stop backend
#   docker-compose up -d --build        - Rebuild and start backend
#   docker-compose logs -f              - Follow backend logs

param(
    [string]$Command = "start"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Handle commands
switch ($Command) {
    "stop" {
        Write-Host "Stopping all services..." -ForegroundColor Yellow
        docker-compose down
        Write-Host "Stopped." -ForegroundColor Green
        exit 0
    }
    "restart" {
        Write-Host "Restarting backend..." -ForegroundColor Yellow
        docker-compose down
        docker-compose up -d --build
        Write-Host "Backend restarted. Waiting for health check..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 10
            Write-Host "Backend is healthy!" -ForegroundColor Green
        } catch {
            Write-Host "Backend may still be starting. Check with: docker-compose logs" -ForegroundColor Yellow
        }
        exit 0
    }
    "logs" {
        docker-compose logs -f
        exit 0
    }
}

Write-Host "=== Scheduling App Startup ===" -ForegroundColor Cyan

# Check Docker is running
Write-Host "`nChecking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Error: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check Node.js is installed
Write-Host "`nChecking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed. Please install Node.js." -ForegroundColor Red
    exit 1
}

# Cleanup function
function Cleanup {
    Write-Host "`n`nShutting down..." -ForegroundColor Yellow
    Set-Location $PSScriptRoot
    docker-compose down
    Write-Host "Cleanup complete" -ForegroundColor Green
}

# Register cleanup on script exit
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup }

# Start backend with Docker
Write-Host "`nStarting backend (Docker)..." -ForegroundColor Yellow
docker-compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to start backend containers" -ForegroundColor Red
    exit 1
}

# Wait for backend health check
Write-Host "`nWaiting for backend to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$healthy = $false

while ($attempt -lt $maxAttempts -and -not $healthy) {
    Start-Sleep -Seconds 1
    $attempt++
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 2
        if ($response.status -eq "healthy") {
            $healthy = $true
        }
    } catch {
        Write-Host "  Attempt $attempt/$maxAttempts - Backend starting..." -ForegroundColor Gray
    }
}

if (-not $healthy) {
    Write-Host "Error: Backend failed to become healthy after $maxAttempts seconds" -ForegroundColor Red
    docker-compose logs
    Cleanup
    exit 1
}

Write-Host "Backend is healthy!" -ForegroundColor Green

# Install frontend dependencies if needed
Set-Location "$PSScriptRoot\frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "`nInstalling frontend dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: npm install failed" -ForegroundColor Red
        Cleanup
        exit 1
    }
}

# Start frontend
Write-Host "`nStarting frontend..." -ForegroundColor Yellow
Write-Host "=== App Ready ===" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop all services`n" -ForegroundColor Gray

try {
    npm run dev
} finally {
    Cleanup
}
