@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 start-demo.py
) else (
  where python >nul 2>nul
  if errorlevel 1 (
    echo Python 3 is required: https://www.python.org/downloads/
    pause
    exit /b 1
  )
  python start-demo.py
)
if errorlevel 1 (
  echo Start failed. Check that Python 3 is installed and the ZIP is fully extracted.
  pause
  exit /b 1
)
