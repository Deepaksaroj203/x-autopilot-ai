@echo off
cd /d "%~dp0"
set "PATH=C:\Users\acer\.local\nodejs;C:\Users\acer\.local\bin;%PATH%"
title Instagram Autonomous Visual Card Poster
echo =====================================================================
echo  Instagram Visual Infographic Auto-Poster (1080x1080)
echo =====================================================================
echo Launching Instagram Poster via Playwright & Gemini AI...
echo.
node instagram_poster.js
pause
