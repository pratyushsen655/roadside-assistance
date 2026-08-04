@echo off
echo ===================================================
echo   RideRescue Mechanic App - SDK 56 & EAS Fix Script
echo ===================================================

cd /d "c:\Users\praty\OneDrive\Desktop\my app\mechanic-app"

echo 1. Checking dependencies against Expo SDK 56...
call npx expo install --check

echo.
echo 2. Installing packages...
call npm install --legacy-peer-deps

echo.
echo 3. Cleaning and regenerating native Android directory...
call npx expo prebuild --clean

echo.
echo ===================================================
echo Ready to trigger fresh EAS Build!
echo Run: eas build --platform android --profile preview
echo ===================================================
