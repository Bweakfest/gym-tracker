@echo off
title PumpTracker
cd /d "%~dp0"

echo Starting PumpTracker backend...
start "PumpTracker - Server" cmd /k "cd server && node index.js"

echo Starting PumpTracker frontend...
start "PumpTracker - Client" cmd /k "cd client && npx vite --port 5173"

echo Waiting for servers to start...
timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo.
echo PumpTracker is running at http://localhost:5173
echo Close the two terminal windows to stop the servers.
