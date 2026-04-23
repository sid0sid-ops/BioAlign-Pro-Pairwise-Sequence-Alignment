@echo off
echo Starting BioAlign-Pro Local Server...
echo Please wait, checking for dependencies...
call npm install -g serve >nul 2>&1
echo Local server running at:
echo http://localhost:8080
echo.
echo Press Ctrl+C to stop the server.
call npx serve . -p 8080
pause
