@echo off
cd /d "%~dp0"
set "PATH=C:\Users\acer\.local\nodejs;C:\Users\acer\.local\bin;%PATH%"
echo ========================================================
echo  Corporate Compliance Omnichannel Account Session Setup
echo ========================================================
echo.
node setup_sessions.js
echo.
pause
