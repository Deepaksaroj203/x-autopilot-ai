@echo off
cd /d "%~dp0"
set "PATH=C:\Users\acer\.local\nodejs;C:\Users\acer\.local\bin;%PATH%"
title Autonomous YouTube Shorts Uploader @arnavsaroj245
echo =====================================================================
echo  Autonomous YouTube Shorts Uploader (@arnavsaroj245)
echo =====================================================================
echo.

if "%~1"=="" (
    echo Enter path to high-quality .mp4 video to upload:
    set /p "VIDEOPATH="
) else (
    set "VIDEOPATH=%~1"
)

if "%VIDEOPATH%"=="" (
    echo [ERROR] No video file specified.
    pause
    exit /b 1
)

echo.
echo Auto-uploading to YouTube Studio (@arnavsaroj245)...
node youtube_poster.js --video="%VIDEOPATH%"
echo.
pause
