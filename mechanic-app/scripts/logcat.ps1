param (
    [string]$Filter = "*:S ReactNative:V ReactNativeJS:V"
)

# 1. Locate adb.exe
$adbPath = $null

# Check if adb is already in PATH
$adbInPath = Get-Command adb -ErrorAction SilentlyContinue
if ($adbInPath) {
    $adbPath = "adb"
} else {
    # Check standard install locations
    $candidatePaths = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$env:ANDROID_HOME\platform-tools\adb.exe",
        "C:\Users\praty\AppData\Local\Android\Sdk\platform-tools\adb.exe"
    )

    foreach ($path in $candidatePaths) {
        if (Test-Path $path) {
            $dir = Split-Path $path
            if ($env:Path -notlike "*$dir*") {
                $env:Path = "$dir;$env:Path"
            }
            $adbPath = $path
            break
        }
    }
}

if (-not $adbPath) {
    Write-Error "Could not locate adb.exe. Please ensure Android SDK platform-tools is installed."
    exit 1
}

Write-Host "[LOGCAT] Using ADB at: $adbPath" -ForegroundColor Green
Write-Host "[LOGCAT] Running logcat with filter: $Filter" -ForegroundColor Cyan

# Invoke adb logcat with passed parameters or default filter
$filterArgs = $Filter -split ' '
& $adbPath logcat @filterArgs
