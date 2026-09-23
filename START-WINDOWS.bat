@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 or newer is required: https://nodejs.org/
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4197/ ^(stop with Ctrl+C^)
if exist backend\.env (
  node --env-file=backend\.env backend\server.mjs
) else (
  node backend\server.mjs
)
if errorlevel 1 (
  echo Start failed. Check Node.js 24+, port 4197, and the terminal output.
  pause
  exit /b 1
)
