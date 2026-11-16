@echo off
cd /d "%~dp0"
set "PATH=C:\Users\acer\.local\nodejs;C:\Users\acer\.local\bin;%PATH%"
title Connect Instagram @epfcompliance
echo =====================================================================
echo  Connecting Instagram Profile (@epfcompliance)
echo =====================================================================
echo.
echo Launching Microsoft Edge...
echo 1. Log into your @epfcompliance account.
echo 2. Complete 2FA / OTP if prompted.
echo 3. When you see your feed or profile, session cookies will save automatically!
echo.
node setup_sessions.js instagram
echo.
pause
