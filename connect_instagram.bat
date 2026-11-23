@echo off
cd /d "C:\Users\acer\Documents\GitHub\twitter-auto-poster-bot-ai"
set "PATH=C:\Users\acer\.local\nodejs;C:\Users\acer\.local\bin;%PATH%"
title Connect Instagram @corporatecomplaince
echo =====================================================================
echo  Connecting Instagram Profile (@corporatecomplaince)
echo =====================================================================
echo.
echo Launching Microsoft Edge...
echo 1. Log into your @corporatecomplaince account.
echo 2. Complete 2FA / OTP if prompted.
echo 3. When you see your feed or profile, session cookies will save automatically!
echo.
node setup_sessions.js instagram
echo.
pause
