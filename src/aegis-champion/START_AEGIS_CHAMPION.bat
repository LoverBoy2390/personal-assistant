@echo off
setlocal
cd /d "%~dp0\..\.."
where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher not found. Install Python from the Microsoft Store or python.org, then run this file again.
  pause
  exit /b 1
)
start "AEGIS Champion" cmd /c "timeout /t 2 /nobreak >nul & start \"\" http://127.0.0.1:8765/src/aegis-champion/"
echo Starting AEGIS Champion on this PC only: http://127.0.0.1:8765/src/aegis-champion/
echo Close this window to stop the local server.
py -m http.server 8765 --bind 127.0.0.1
endlocal
