@echo off
setlocal
cd /d "%~dp0"
set "PYRUN="
where py >nul 2>nul && set "PYRUN=py"
if not defined PYRUN where python >nul 2>nul && set "PYRUN=python"
if not defined PYRUN (
  echo Python was not found. Install Python 3, then try again.
  pause
  exit /b 1
)
start "AEGIS Local Server" /min cmd /c "%PYRUN% server.py"
timeout /t 2 /nobreak >nul
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --app=http://localhost:8787
  exit /b 0
)
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --app=http://localhost:8787
  exit /b 0
)
start "" http://localhost:8787
