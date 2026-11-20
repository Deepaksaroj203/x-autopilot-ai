@echo off
title Connect YouTube Channel @arnavsaroj245
set "USERDATA=%~dp0.youtube_user_data"

echo =====================================================================
echo  Connecting YouTube Studio Channel (@arnavsaroj245)
echo =====================================================================
echo.
echo Launching Microsoft Edge directly for YouTube Studio login...
echo 1. Sign into your Google account for @arnavsaroj245.
echo 2. Once your YouTube Studio dashboard opens, session is saved permanently!
echo 3. You can close the Edge window when done.
echo.

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --user-data-dir="%USERDATA%" "https://studio.youtube.com"
) else (
    start msedge --user-data-dir="%USERDATA%" "https://studio.youtube.com"
)

echo Microsoft Edge launched! Complete your sign-in in the opened browser window.
echo.
pause
