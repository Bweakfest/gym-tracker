@echo off
title Nexero
cd /d "%~dp0"

echo Starting Nexero backend...
start "Nexero - Server" cmd /k "cd server && node index.js"

echo Starting Nexero frontend...
start "Nexero - Client" cmd /k "cd client && npx vite --port 5173"

echo Waiting for servers to start...
timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo.
echo Nexero is running at http://localhost:5173
echo Close the two terminal windows to stop the servers.
