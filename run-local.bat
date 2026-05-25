@echo off
setlocal EnableExtensions

REM ============================================================================
REM  E-Press local dev launcher
REM  Opens windows for the backend, admin panel, and the Expo mobile dev server.
REM
REM  Usage:
REM    run-local.bat                     -> Customer mobile, LAN mode
REM    run-local.bat customer            -> same as above
REM    run-local.bat worker              -> Worker mobile,  LAN mode
REM    run-local.bat both                -> both mobile variants (extra window)
REM    run-local.bat customer tunnel     -> Customer mobile via Expo tunnel
REM                                         (use when phone cannot reach the
REM                                         laptop directly over Wi-Fi)
REM    run-local.bat worker tunnel       -> Worker mobile via Expo tunnel
REM    run-local.bat /h                  -> show this help
REM ============================================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "VARIANT=%~1"
set "MODE=%~2"
if "%VARIANT%"=="" set "VARIANT=customer"
if "%MODE%"=="" set "MODE=lan"
if /I "%VARIANT%"=="/h"   goto :help
if /I "%VARIANT%"=="-h"   goto :help
if /I "%VARIANT%"=="help" goto :help

if /I "%VARIANT%"=="customer" goto :validVariant
if /I "%VARIANT%"=="worker"   goto :validVariant
if /I "%VARIANT%"=="both"     goto :validVariant
echo [X] Unknown variant: %VARIANT%
echo     Valid: customer ^| worker ^| both
goto :error

:validVariant
echo.
echo  E-Press local launcher
echo  Root:    %ROOT%
echo  Variant: %VARIANT%
echo.

REM --- Sanity: each subproject is present ------------------------------------
if not exist "%ROOT%\backend\package.json"      goto :missingBackend
if not exist "%ROOT%\admin-panel\package.json"  goto :missingAdmin
if not exist "%ROOT%\mobile\package.json"       goto :missingMobile

REM --- Sanity: each subproject has node_modules ------------------------------
set "MISSING="
if not exist "%ROOT%\backend\node_modules"      call :flagMissing backend
if not exist "%ROOT%\admin-panel\node_modules"  call :flagMissing admin-panel
if not exist "%ROOT%\mobile\node_modules"       call :flagMissing mobile
if defined MISSING goto :installNeeded

REM --- Friendly reminder about mobile env (non-blocking) ---------------------
if exist "%ROOT%\mobile\.env"       goto :envOK
if exist "%ROOT%\mobile\.env.local" goto :envOK
echo [i] mobile\.env / mobile\.env.local not found.
echo     The mobile app will fall back to the production server (161.97.66.69).
echo     For local backend testing, create mobile\.env.local with:
echo         EXPO_PUBLIC_DEV_API_URL=http://YOUR_LAN_IP:5000/api
echo         EXPO_PUBLIC_SOCKET_URL=http://YOUR_LAN_IP:5000
echo.

:envOK
echo Starting backend  -^> http://localhost:5000
start "E-Press Backend"  cmd /k "cd /d ""%ROOT%\backend"" && npm run dev"

echo Starting admin    -^> http://localhost:5173
start "E-Press Admin"    cmd /k "cd /d ""%ROOT%\admin-panel"" && npm run dev"

if /I "%VARIANT%"=="customer" goto :startCustomer
if /I "%VARIANT%"=="worker"   goto :startWorker
if /I "%VARIANT%"=="both"     goto :startBoth
goto :done

:startCustomer
if /I "%MODE%"=="tunnel" (
    echo Starting mobile   -^> Expo dev server [Customer, TUNNEL mode]
    start "E-Press Mobile (Customer, tunnel)" cmd /k "cd /d ""%ROOT%\mobile"" && npm run start:customer:tunnel"
) else (
    echo Starting mobile   -^> Expo dev server [Customer / E-Press, LAN]
    start "E-Press Mobile (Customer)" cmd /k "cd /d ""%ROOT%\mobile"" && npm run start:customer"
)
goto :done

:startWorker
if /I "%MODE%"=="tunnel" (
    echo Starting mobile   -^> Expo dev server [Worker, TUNNEL mode]
    start "E-Press Mobile (Worker, tunnel)" cmd /k "cd /d ""%ROOT%\mobile"" && npm run start:worker:tunnel"
) else (
    echo Starting mobile   -^> Expo dev server [Worker / E-Press Pro, LAN]
    start "E-Press Mobile (Worker)" cmd /k "cd /d ""%ROOT%\mobile"" && npm run start:worker"
)
goto :done

:startBoth
echo Starting mobile   -^> Customer variant
start "E-Press Mobile (Customer)" cmd /k "cd /d ""%ROOT%\mobile"" && npm run start:customer"
echo Starting mobile   -^> Worker variant
start "E-Press Mobile (Worker)"   cmd /k "cd /d ""%ROOT%\mobile"" && npm run start:worker"
goto :done

:flagMissing
echo [!] %~1\node_modules missing. Run: cd %~1 ^&^& npm install --legacy-peer-deps
set "MISSING=1"
exit /b 0

:missingBackend
echo [X] backend\package.json not found at %ROOT%\backend
goto :error
:missingAdmin
echo [X] admin-panel\package.json not found at %ROOT%\admin-panel
goto :error
:missingMobile
echo [X] mobile\package.json not found at %ROOT%\mobile
goto :error

:installNeeded
echo.
echo Install the missing dependencies above, then re-run this script.
goto :error

:help
echo Usage:
echo   run-local.bat                        ^(default: customer, LAN^)
echo   run-local.bat customer
echo   run-local.bat worker
echo   run-local.bat both
echo   run-local.bat customer tunnel        ^(use Expo tunnel - works when LAN fails^)
echo   run-local.bat worker tunnel
endlocal
exit /b 0

:done
echo.
echo  All services launched in separate windows.
echo  Close each window to stop the corresponding service.
endlocal
exit /b 0

:error
echo.
echo Launch aborted.
endlocal
exit /b 1
