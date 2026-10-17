@echo off
chcp 65001 > nul
echo ========================================================
echo   DONG BO MA NGUON GIUA LOCALHOST VA GITHUB
echo ========================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0sync_github.ps1"
echo.
pause
