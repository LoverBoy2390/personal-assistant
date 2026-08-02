@echo off
setlocal
cd /d "%~dp0"
title AEGIS LifeOS v0.4.1
where py >nul 2>nul
if %errorlevel%==0 (
  start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 900; Start-Process 'http://localhost:8787'"
  py server.py
  goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 900; Start-Process 'http://localhost:8787'"
  python server.py
  goto :eof
)
echo Python was not found. Install Python 3, then run START_AEGIS.bat again.
pause
