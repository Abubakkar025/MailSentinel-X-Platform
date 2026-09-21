# ============================================================
# MailSentinel X — Backend Launcher & Port 8000 Verification
# ============================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Resolve-Path "$scriptDir\.."
$apiDir = Join-Path $rootDir "services\api"

# 1. Check if backend is already running on port 8000
try {
    $res = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
    if ($res.status -eq "ok") {
        Write-Host "[MailSentinel API] Backend is ALREADY RUNNING on http://localhost:8000 (v$($res.version))" -ForegroundColor Green
        exit 0
    }
} catch {
    # Port not active or not responding, proceed to start
}

Write-Host "[MailSentinel API] Starting FastAPI backend on http://localhost:8000..." -ForegroundColor Cyan

# 2. Locate Python executable (prefer venv if present)
$venvPython = Join-Path $apiDir "venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    $pythonCmd = $venvPython
} else {
    $pythonCmd = "python"
}

# 3. Launch Uvicorn backend process
$process = Start-Process -FilePath $pythonCmd -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory $apiDir -PassThru -NoNewWindow

# 4. Wait for readiness
$maxRetries = 30
$ready = $false

for ($i = 1; $i -le $maxRetries; $i++) {
    Start-Sleep -Seconds 1
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
        if ($res.status -eq "ok") {
            $ready = $true
            Write-Host "[MailSentinel API] Backend is ONLINE & READY on http://localhost:8000" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "[MailSentinel API] Waiting for readiness... ($i/$maxRetries)" -ForegroundColor Yellow
    }
}

if (-not $ready) {
    Write-Host "[MailSentinel API] ERROR: Backend failed to respond within 30 seconds." -ForegroundColor Red
    exit 1
}
