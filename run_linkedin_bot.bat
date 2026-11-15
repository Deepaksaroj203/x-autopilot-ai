@echo off
cd /d "%~dp0"
set "PATH=C:\Users\acer\.local\nodejs;C:\Users\acer\.local\bin;%PATH%"
title LinkedIn Autonomous Thought-Leadership Poster
echo =====================================================================
echo  LinkedIn B2B Autonomous Auto-Poster (Zero API Costs)
echo =====================================================================
echo Launching LinkedIn Poster via Playwright & Gemini AI...
echo.
node linkedin_poster.js
pause
