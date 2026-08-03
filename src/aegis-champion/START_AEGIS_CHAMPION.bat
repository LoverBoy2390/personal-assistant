@echo off
setlocal
set "AEGIS_SCRIPT=%~dp0aegis-local-server.ps1"
set "AEGIS_ROOT=%~dp0\..\.."

if not exist "%AEGIS_SCRIPT%" (
  echo AEGIS Champion server file is missing.
  echo Re-extract the complete ZIP, then try again.
  pause
  exit /b 1
)

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo Windows PowerShell is unavailable on this PC.
  echo AEGIS Champion did not make any system changes.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%AEGIS_SCRIPT%" -RootPath "%AEGIS_ROOT%" -Port 8765
set "AEGIS_EXIT=%ERRORLEVEL%"

if not "%AEGIS_EXIT%"=="0" (
  echo.
  echo AEGIS Champion stopped with error code %AEGIS_EXIT%.
  echo No AWS service, paid resource, or external account was contacted.
  pause
)

exit /b %AEGIS_EXIT%
