# Read .env file if it exists
if (Test-Path .env) {
    Write-Host "Loading environment variables from .env..."
    foreach ($line in Get-Content .env) {
        if ($line -match "^([^#\s][^=]*)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

# Kill any process using ports 8080 or 20447
$ports = @(8080, 20447)
$killed = $false
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        if ($conn.OwningProcess -gt 0) {
            Write-Host "Cleaning up port $port (PID $($conn.OwningProcess))..." -ForegroundColor Yellow
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            $killed = $true
        }
    }
}

# Give Windows time to release the ports
if ($killed) {
    Write-Host "Waiting for ports to be released..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 2
}

# Check if required environment variables are set
if (-not $env:DATABASE_URL) {
    Write-Host "Error: DATABASE_URL is not set. Please add it to your .env file." -ForegroundColor Red
    exit 1
}

if (-not $env:OPENAI_API_KEY) {
    Write-Host "Warning: OPENAI_API_KEY is not set. AI features may fail." -ForegroundColor Yellow
}

Write-Host "Syncing database schema..." -ForegroundColor Magenta
Push-Location lib/db
pnpm run push-force
Pop-Location

Write-Host "Starting API Server on port 8080..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `" `cd `'$PWD`'; `$env:PORT='8080'; pnpm --filter @workspace/api-server run dev `""

# Small delay so API server starts before frontend
Start-Sleep -Seconds 1

Write-Host "Starting Web Frontend on port 20447..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `" `cd `'$PWD`'; `$env:PORT='20447'; `$env:BASE_PATH='/'; pnpm --filter @workspace/second-brain run dev `""

Write-Host ""
Write-Host "Project started!" -ForegroundColor Green
Write-Host "Frontend:  http://localhost:20447" -ForegroundColor White
Write-Host "API:       http://localhost:8080"  -ForegroundColor White
