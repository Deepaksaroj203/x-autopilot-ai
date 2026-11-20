@echo off
cd /d "%~dp0"
set "PATH=C:\Users\acer\.local\nodejs;C:\Users\acer\.local\bin;%PATH%"
title Auto-Upload YouTube Short @arnavsaroj245
echo =====================================================================
echo  Autonomous YouTube Shorts Generator & Uploader (@arnavsaroj245)
echo =====================================================================
echo.
echo [1/2] Generating latest 60fps compliance Short...
node super_reel_engine\super_reel_orchestrator.js --mode=scratch --duration=40 --style=hybrid_super_reel
echo.
echo [2/2] Auto-uploading to YouTube Studio (@arnavsaroj245)...
node youtube_poster.js
echo.
pause
