@echo off
REM ============================================================================
REM  E-Press Pro (Worker app — Livreur + Laverie) — full local stack launcher
REM
REM  Double-click to launch:
REM    - Backend       (http://localhost:5000)
REM    - Admin panel   (http://localhost:5173/admin/)
REM    - Mobile        Expo dev server  [Worker / E-Press Pro]
REM
REM  If you already have epress.bat running and just want to swap mobile to the
REM  Worker variant, close the "E-Press Mobile (Customer)" window first to free
REM  the Metro port (8081), then run this — backend + admin will keep running
REM  (port checks below skip them if already up).
REM ============================================================================

call "%~dp0run-local.bat" worker
