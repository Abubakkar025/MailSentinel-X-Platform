@echo off
title MailSentinel X — Launcher
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1"
pause
