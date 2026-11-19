@echo off
title Corporate Compliance - Master AI Automation Hub
cd /d "%~dp0"
node master_hub.js
if %errorlevel% neq 0 (
    echo.
    echo An unexpected error occurred.
    pause
)
