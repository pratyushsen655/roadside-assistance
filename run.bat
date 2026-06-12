@echo off

:: ---------------------------------------------------------------
:: run.bat – starts the development environment
:: ---------------------------------------------------------------

rem Change to the project root (ensure script is placed in the root folder)
set "PROJECT_ROOT=%~dp0"

rem ---- Terminal 1 – Backend (Node) on port 5000 ----
start "Backend" cmd /k "cd /d %PROJECT_ROOT%backend && set PORT=5000 && npm run dev"

rem ---- Terminal 2 – Customer Expo on port 8081 ----
rem     NODE_OPTIONS flag required for Node v18+ OpenSSL compatibility with Metro bundler
start "Customer-App" cmd /k "cd /d %PROJECT_ROOT%customer-app && set NODE_OPTIONS=--openssl-legacy-provider && expo start --port 8081 --lan"

rem ---- Terminal 3 – Mechanic Expo on port 8082 ----
start "Mechanic-App" cmd /k "cd /d %PROJECT_ROOT%mechanic-app && set NODE_OPTIONS=--openssl-legacy-provider && expo start --port 8082 --lan"

rem Give the user a quick summary of the URLs that will appear in each window.
echo.
echo =============================
echo Backend:   http://localhost:5000
echo Customer:  http://localhost:8081 (Expo QR code will be shown in its window)
echo Mechanic:  http://localhost:8082 (Expo QR code will be shown in its window)
echo.
echo IMPORTANT: Make sure your phone and PC are on the same Wi-Fi network
echo            when using --lan mode.
echo =============================

rem Keep this window open so the user can see the summary.
pause
