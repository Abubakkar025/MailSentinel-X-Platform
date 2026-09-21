# ============================================================
# MailSentinel X — Master Environment Orchestrator
# Checks Port 8000 (Backend) & Port 3000 (Frontend), launches
# required services if missing, and verifies health.
# ============================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = (Resolve-Path "$scriptDir\..").Path
$apiDir = Join-Path $rootDir "services\api"
$webDir = Join-Path $rootDir "apps\web"

Write-Host "============================================================" -ForegroundColor Blue
Write-Host "         MailSentinel X — Development System Launch         " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Blue

# ── 1. Check / Start Backend (Port 8000) ──
$backendRunning = $false
if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) {
    $backendRunning = $true
    Write-Host "[✓] Backend API is ALREADY RUNNING on http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "[!] Backend API is NOT running. Starting FastAPI server on port 8000..." -ForegroundColor Cyan
    
    $venvPython = Join-Path $apiDir "venv\Scripts\python.exe"
    $pythonCmd = if (Test-Path $venvPython) { "`"$venvPython`"" } else { "python" }

    # Start FastAPI in dedicated window/process
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c title MailSentinel API && $pythonCmd -m uvicorn app.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory $apiDir

    # Poll port 8000 readiness
    $ready = $false
    for ($i = 1; $i -le 20; $i++) {
        Start-Sleep -Milliseconds 750
        if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) {
            $ready = $true
            break
        }
        Write-Host "    Waiting for API server on port 8000... ($i/20)" -ForegroundColor Yellow
    }

    if ($ready) {
        Write-Host "[✓] Backend API is ONLINE on http://localhost:8000" -ForegroundColor Green
        $backendRunning = $true
    } else {
        Write-Host "[X] ERROR: Backend server failed to bind to port 8000 within timeout." -ForegroundColor Red
    }
}

# ── 2. Check / Start Frontend (Port 3000) ──
$frontendRunning = $false
if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
    $frontendRunning = $true
    Write-Host "[✓] Frontend UI is ALREADY RUNNING on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "[!] Frontend UI is NOT running. Starting Next.js dev server on port 3000..." -ForegroundColor Cyan

    Start-Process -FilePath "cmd.exe" -ArgumentList "/c title MailSentinel Frontend && npm run dev" -WorkingDirectory $webDir

    # Poll port 3000 readiness
    for ($i = 1; $i -le 15; $i++) {
        Start-Sleep -Milliseconds 800
        if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
            $frontendRunning = $true
            break
        }
        Write-Host "    Waiting for Next.js server on port 3000... ($i/15)" -ForegroundColor Yellow
    }

    if ($frontendRunning) {
        Write-Host "[✓] Frontend UI is ONLINE on http://localhost:3000" -ForegroundColor Green
    } else {
        Write-Host "[!] Frontend server is initializing in background window..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "------------------------------------------------------------" -ForegroundColor Gray
Write-Host "  Backend API Docs : http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Backend Health   : http://localhost:8000/health" -ForegroundColor White
Write-Host "  Frontend Web App : http://localhost:3000" -ForegroundColor White
Write-Host "------------------------------------------------------------" -ForegroundColor Gray
Write-Host ""
