@echo off
cd /d "%~dp0"
title Omnichannel Social AI Auto-Poster Suite
echo =====================================================================
echo  Omnichannel Autonomous Social Suite (LinkedIn + Insta + FB + X)
echo =====================================================================
echo Launching cross-platform syndication via Playwright & Gemini AI...
echo.
node omnichannel_runner.js --platforms=all
pause
