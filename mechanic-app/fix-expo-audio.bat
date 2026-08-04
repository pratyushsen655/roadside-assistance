@echo off
setlocal
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   Definitive Fix: expo-audio removed, reverted to expo-av   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo WHY: expo-audio's Kotlin AudioModule (ALL versions: 0.x and 56.x)
echo depends on expo.modules.kotlin.types.AnyTypeProvider, a class in
echo expo-modules-core's Kotlin interop layer. This class is absent
echo from the version of expo-modules-core bundled in this native build,
echo causing NoClassDefFoundError on every launch.
echo.
echo FIX: expo-av uses the older stable Java-based Audio API with no
echo Kotlin interop dependency. soundService.js now uses expo-av's
echo Audio.Sound API instead of expo-audio's createAudioPlayer.
echo.

echo ──────────────────────────────────────────────────────────────
echo  STEP 1: npm install --legacy-peer-deps
echo ──────────────────────────────────────────────────────────────
call npm install --legacy-peer-deps
if %ERRORLEVEL% neq 0 (
  echo ERROR: npm install failed. Exit code: %ERRORLEVEL%
  pause
  exit /b %ERRORLEVEL%
)
echo OK.

echo.
echo ──────────────────────────────────────────────────────────────
echo  STEP 2: Verify expo-av is installed, expo-audio is GONE
echo ──────────────────────────────────────────────────────────────
call node -e "try { const p = require('./node_modules/expo-av/package.json'); console.log('  expo-av installed:', p.version, '(GOOD)'); } catch(e) { console.log('  ERROR: expo-av NOT FOUND. Run npm install again.'); }"
call node -e "try { require('./node_modules/expo-audio/package.json'); console.log('  WARNING: expo-audio still in node_modules! Remove it manually.'); } catch(e) { console.log('  expo-audio: not installed (GOOD - it should be absent)'); }"
echo.

echo ──────────────────────────────────────────────────────────────
echo  STEP 3: npx expo install --check (full SDK compatibility audit)
echo ──────────────────────────────────────────────────────────────
call npx expo install --check
echo.

echo ──────────────────────────────────────────────────────────────
echo  STEP 4: npx expo prebuild --clean  (regenerate native Android)
echo ──────────────────────────────────────────────────────────────
echo  IMPORTANT: This deletes android/ and regenerates it cleanly.
echo  expo-audio will NOT appear in autolinking since it is uninstalled.
call npx expo prebuild --clean
if %ERRORLEVEL% neq 0 (
  echo ERROR: prebuild --clean failed. Exit code: %ERRORLEVEL%
  pause
  exit /b %ERRORLEVEL%
)
echo OK. Native project regenerated without expo-audio.

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    Next Steps                                ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  LOCAL BUILD (recommended - fast feedback loop):            ║
echo ║    npx expo run:android                                      ║
echo ║                                                              ║
echo ║  OR EAS CLOUD BUILD (after local build succeeds):           ║
echo ║    eas build --platform android --profile preview           ║
echo ║                                                              ║
echo ║  VERIFY with logcat after install:                          ║
echo ║    adb logcat *:S AndroidRuntime:E                          ║
echo ║  Launch the app 5+ times — if no FATAL EXCEPTION appears,  ║
echo ║  the crash is fixed.                                        ║
echo ╚══════════════════════════════════════════════════════════════╝
pause
