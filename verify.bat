@echo off
setlocal EnableDelayedExpansion

:: Verify Node.js installation
node -v >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js is installed
) else (
    echo ❌ Node.js is not installed
)

:: Verify npm installation
npm -v >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ npm is installed
) else (
    echo ❌ npm is not installed
)

:: Verify MongoDB installation
mongo --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MongoDB is installed
) else (
    echo ❌ MongoDB is not installed
)

:: Verify Redis installation
redis-cli --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Redis is installed
) else (
    echo ❌ Redis is not installed
)

pause
