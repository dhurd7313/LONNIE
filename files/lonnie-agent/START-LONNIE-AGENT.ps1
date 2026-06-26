# LONNIE Local Agent — Windows Startup Script
# Double-click this file OR right-click > Run with PowerShell

Write-Host "Starting LONNIE Local Agent..." -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install deps if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies (first run only)..." -ForegroundColor Yellow
    npm install
}

# Start agent
Write-Host "Agent starting on http://localhost:45678" -ForegroundColor Green
Write-Host "Keep this window open while using LONNIE." -ForegroundColor Yellow
Write-Host ""
node agent.js
