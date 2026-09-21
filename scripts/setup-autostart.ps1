# ============================================================
# MailSentinel X — Windows Logon Auto-Start Setup
# Places a startup launcher in the user's Windows Startup folder
# (C:\Users\Abu\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup)
# so the backend and frontend launch automatically whenever Windows boots/logs on.
# ============================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = (Resolve-Path "$scriptDir\..").Path
$launcherPath = Join-Path $rootDir "Start-MailSentinel-X.cmd"

$startupFolder = [Environment]::GetFolderPath('Startup')
$startupCmdPath = Join-Path $startupFolder "MailSentinel-X-AutoStart.cmd"

Write-Host "Configuring Windows Startup Folder for MailSentinel X..." -ForegroundColor Cyan

# Create startup batch wrapper
$cmdContent = "@echo off`r`ntitle MailSentinel X AutoStart`r`ncd /d `"$rootDir`"`r`ncall `"$launcherPath`"`r`n"
Set-Content -Path $startupCmdPath -Value $cmdContent -Encoding ASCII

if (Test-Path $startupCmdPath) {
    Write-Host "[✓] Windows Startup launcher created successfully!" -ForegroundColor Green
    Write-Host "    Location : $startupCmdPath" -ForegroundColor White
    Write-Host "    Target   : $launcherPath" -ForegroundColor White
    Write-Host "    Behavior : Automatically starts Backend (port 8000) & Frontend (port 3000) on Windows Logon" -ForegroundColor White
} else {
    Write-Host "[X] ERROR: Could not create startup launcher in $startupFolder" -ForegroundColor Red
}
