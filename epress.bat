@echo off
REM ============================================================================
REM  E-Press (Customer app) — full local stack launcher
REM
REM  Double-click to launch:
REM    - Backend       (http://localhost:5000)
REM    - Admin panel   (http://localhost:5173/admin/)
REM    - Mobile        Expo dev server  [Customer / E-Press]
REM
REM  Thin wrapper around run-local.bat — delegates so both shortcuts stay in sync.
REM ============================================================================

call "%~dp0run-local.bat" customer
