@echo off
setlocal EnableDelayedExpansion

:: Enable ANSI colors (Windows 10+)
reg add HKCU\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

:: Function to print a green checkmark
:print_success
    set "msg=%~1"
    echo ^[32m✔ %msg%^[0m
    goto :eof

:: Function to print a red cross
:print_failure
    set "msg=%~1"
    echo ^[31m✖ %msg%^[0m
    goto :eof

:: Install Node.js LTS
winget install --id OpenJS.NodeJS --exact --source winget --accept-source-agreements --accept-package-agreements
if %ERRORLEVEL% EQU 0 (
    call :print_success "Node.js installed"
) else (
    call :print_failure "Node.js installation failed"
    exit /b 1
)

:: Install MongoDB Community Server
winget install --id MongoDB.Server --exact --source winget --accept-source-agreements --accept-package-agreements
if %ERRORLEVEL% EQU 0 (
    call :print_success "MongoDB installed"
) else (
    call :print_failure "MongoDB installation failed"
    exit /b 1
)

:: Install Redis for Windows
winget install --id Redis.Redis --exact --source winget --accept-source-agreements --accept-package-agreements
if %ERRORLEVEL% EQU 0 (
    call :print_success "Redis installed"
) else (
    call :print_failure "Redis installation failed"
    exit /b 1
)

:: Set PATH for Node, MongoDB, and Redis (add if not already present)
set "NEWPATH=%PATH%"
if not "%PATH%"=="%PATH:;C:\Program Files\nodejs=%" set "NEWPATH=%NEWPATH%;C:\Program Files\nodejs"
if not "%PATH%"=="%PATH:;C:\Program Files\MongoDB\Server=\%" set "NEWPATH=%NEWPATH%;C:\Program Files\MongoDB\Server\{version}\bin"
if not "%PATH%"=="%PATH:;C:\Program Files\Redis=%" set "NEWPATH=%NEWPATH%;C:\Program Files\Redis"
rem Persist the new PATH for future sessions
setx PATH "%NEWPATH%"
call :print_success "PATH variables updated"

endlocal
exit /b 0
