@echo off

:: ---------------------------------------------------------------
:: stop.bat – kills the three processes started by run.bat
:: ---------------------------------------------------------------

rem Find and kill the Node backend process (assumes it's started via npm run dev)
for /f "tokens=2 delims=," %%I in ('tasklist /fi "imagename eq node.exe" /fo csv /nh') do (
    echo Stopping backend (node.exe) PID: %%I
    taskkill /PID %%I /F >nul 2>&1
)

rem Find and kill Expo processes (expo.exe or node.exe started by expo)
for /f "tokens=2 delims=," %%I in ('tasklist /fi "imagename eq node.exe" /fo csv /nh') do (
    rem Check if the command line contains "expo start"
    for /f "tokens=*" %%C in ('wmic process where "ProcessId=%%I" get CommandLine ^| findstr /i "expo start"') do (
        echo Stopping Expo (node.exe) PID: %%I
        taskkill /PID %%I /F >nul 2>&1
    )
)
rem Also kill any lingering \"expo.exe\" processes (some installations spawn this wrapper)for /f "tokens=2 delims=," %%I in ('tasklist /fi "imagename eq expo.exe" /fo csv /nh') do (
    echo Stopping Expo (expo.exe) PID: %%I
    taskkill /PID %%I /F >nul 2>&1
)

echo All started services have been terminated.
pause
