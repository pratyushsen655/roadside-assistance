@echo off
cd /d "%~dp0"
echo Running expo export to check for bundle errors...
npx expo export --platform android 2>&1
echo Done. Exit code: %ERRORLEVEL%
pause
