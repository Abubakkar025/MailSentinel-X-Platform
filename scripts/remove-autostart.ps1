# ============================================================
# MailSentinel X — Remove Windows Auto-Start Launcher
# ============================================================

$startupFolder = [Environment]::GetFolderPath('Startup')
$startupCmdPath = Join-Path $startupFolder "MailSentinel-X-AutoStart.cmd"

if (Test-Path $startupCmdPath) {
    Remove-Item -Path $startupCmdPath -Force
    Write-Host "[✓] Removed '$startupCmdPath' from Windows Startup folder." -ForegroundColor Green
} else {
    Write-Host "[!] Auto-start launcher was not found in Windows Startup folder." -ForegroundColor Yellow
}
