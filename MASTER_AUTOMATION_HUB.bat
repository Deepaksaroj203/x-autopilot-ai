@echo off
title Corporate Compliance — Master AI Automation Hub
color 0B
chcp 65001 >nul
cd /d "%~dp0"

:MENU
cls
echo ===============================================================================
echo            CORPORATE COMPLIANCE — MASTER AI AUTOMATION HUB (2026)
echo                All Social Media, YouTube & Reel Engines in One Place
echo ===============================================================================
echo.
echo   [A] OMNICHANNEL SOCIAL MEDIA AUTOPILOT (4 PLATFORMS)
echo   -----------------------------------------------------------------------------
echo     1. Run Full Omnichannel Post (LinkedIn + Twitter/X + Facebook)
echo     2. Post to LinkedIn Only (350-500w B2B Masterclass + Visual Infographic)
echo     3. Post to Twitter / X Only (5-Part Regulatory Advisory Thread + News Card)
echo     4. Post to Facebook Only (Community Breakdown + Lead Magnet)
echo     5. Post to Instagram Only (Viral Reel/Carousel Copy)
echo     6. Refresh / Connect Instagram Session (Login Once in Browser)
echo     7. Multi-Platform Session Setup (Configure / Inspect Stored Cookies)
echo.
echo   [B] SUPER YOUTUBE SHORTS & INSTAGRAM REEL MAKER (MULTI-ENGINE)
echo   -----------------------------------------------------------------------------
echo     8. Generate Reel from Scratch (Enter Topic -> Wan2GP + HyperFrames + Vox)
echo     9. 1-Link YouTube Long-to-Short Viral Clipper (Enter URL -> 9:16 Shorts)
echo    10. Compile 1.5s–2.5s Beat Sheet Preview (Timeline JSON Compiler)
echo    11. Generate Vox Documentary Collage Scene (HTML Preview)
echo    12. Open Video Renders Output Folder in Windows Explorer
echo.
echo   [C] WEB PLATFORM, WORKSPACE & SYSTEM WATCHDOGS
echo   -----------------------------------------------------------------------------
echo    13. Open Website /automation Hub in Browser
echo    14. Open Key Workspace in Browser (/automation/workspace)
echo    15. Check Scheduled Watchdogs & GitHub Actions Runner Status
echo    16. Run Complete System Diagnostic Health Check
echo.
echo     0. Exit Hub
echo ===============================================================================
echo.

set /p choice="Select an Automation Tool (0-16): "

if "%choice%"=="1" goto RUN_ALL
if "%choice%"=="2" goto RUN_LINKEDIN
if "%choice%"=="3" goto RUN_TWITTER
if "%choice%"=="4" goto RUN_FACEBOOK
if "%choice%"=="5" goto RUN_INSTAGRAM
if "%choice%"=="6" goto CONNECT_INSTA
if "%choice%"=="7" goto SETUP_SESSIONS
if "%choice%"=="8" goto REEL_SCRATCH
if "%choice%"=="9" goto REEL_CLIP
if "%choice%"=="10" goto BEAT_SHEET
if "%choice%"=="11" goto VOX_COLLAGE
if "%choice%"=="12" goto OPEN_RENDERS
if "%choice%"=="13" goto OPEN_WEB_HUB
if "%choice%"=="14" goto OPEN_WORKSPACE
if "%choice%"=="15" goto CHECK_WATCHDOGS
if "%choice%"=="16" goto RUN_HEALTH_CHECK
if "%choice%"=="0" goto EXIT_HUB

echo [!] Invalid selection. Please enter a number between 0 and 16.
timeout /t 2 >nul
goto MENU

:RUN_ALL
cls
echo [>>>] Launching Full Omnichannel Autopilot Runner...
node omnichannel_runner.js --platforms=linkedin,twitter,facebook
echo.
pause
goto MENU

:RUN_LINKEDIN
cls
echo [>>>] Publishing B2B Thought-Leadership Masterclass to LinkedIn...
node omnichannel_runner.js --platforms=linkedin
echo.
pause
goto MENU

:RUN_TWITTER
cls
echo [>>>] Publishing 5-Part Regulatory Advisory Thread to Twitter / X...
node omnichannel_runner.js --platforms=twitter
echo.
pause
goto MENU

:RUN_FACEBOOK
cls
echo [>>>] Publishing Community Compliance Guide to Facebook...
node omnichannel_runner.js --platforms=facebook
echo.
pause
goto MENU

:RUN_INSTAGRAM
cls
echo [>>>] Publishing Viral Reel/Carousel Copy to Instagram...
node omnichannel_runner.js --platforms=instagram
echo.
pause
goto MENU

:CONNECT_INSTA
cls
echo [>>>] Launching Microsoft Edge for Instagram Session Refresh...
call connect_instagram.bat
echo.
pause
goto MENU

:SETUP_SESSIONS
cls
echo [>>>] Launching Multi-Platform Session Configuration Utility...
call setup_sessions.bat
echo.
pause
goto MENU

:REEL_SCRATCH
cls
echo ===============================================================================
echo            SUPER REEL MAKER FROM SCRATCH (1080x1920 @ 60fps)
echo ===============================================================================
echo.
set "topic=Why 80%% of EPFO Joint Declarations Get Rejected"
set /p topic="Enter Topic/Concept [Default: Why 80%% of EPFO Joint Declarations Get Rejected]: "
set "duration=40"
set /p duration="Enter Target Duration in Seconds (30-60) [Default: 40]: "
set "style=hybrid_super_reel"
set /p style="Enter Visual Style (hybrid_super_reel / wan2gp_cinematic / vox_collage / hyperframes_motion) [Default: hybrid_super_reel]: "

echo.
echo [>>>] Compiling Super Reel Blueprint and Multi-Engine Visual Layers...
node super_reel_engine/super_reel_orchestrator.js --mode=scratch --topic="%topic%" --duration=%duration% --style="%style%"
echo.
pause
goto MENU

:REEL_CLIP
cls
echo ===============================================================================
echo        1-LINK YOUTUBE TO VIRAL 9:16 SHORTS CLIPPER (OPUSCLIP ENGINE)
echo ===============================================================================
echo.
set "yturl=https://www.youtube.com/watch?v=sample"
set /p yturl="Enter YouTube Video URL [Default: sample]: "
set "clips=3"
set /p clips="Number of Viral Clips to Extract (1-5) [Default: 3]: "

echo.
echo [>>>] Ingesting Video, Scoring Virality & Building 9:16 Face-Track Subtitles...
node super_reel_engine/super_reel_orchestrator.js --mode=clip --url="%yturl%" --clips=%clips%
echo.
pause
goto MENU

:BEAT_SHEET
cls
echo ===============================================================================
echo              LIVE 1.5s–2.5s BEAT SHEET TIMELINE COMPILER
echo ===============================================================================
echo.
set "topic=EPFO Interest Relief & Faster Settlement 2026"
set /p topic="Enter Topic for Beat Sheet [Default: EPFO Interest Relief & Faster Settlement 2026]: "

echo.
echo [>>>] Compiling 1.5s–2.5s Visual Beat Cadence...
node -e "const { compileBeatSheet } = require('./super_reel_engine/super_beat_sheet'); const res = compileBeatSheet({ topic: process.argv[1], durationSec: 40 }); console.log(JSON.stringify(res, null, 2));" "%topic%"
echo.
pause
goto MENU

:VOX_COLLAGE
cls
echo ===============================================================================
echo           VOX DOCUMENTARY COLLAGE & EVIDENCE BOARD GENERATOR
echo ===============================================================================
echo.
set "topic=THE HIDDEN STATUTORY BOTTLENECK"
set /p topic="Enter Evidence Board Headline [Default: THE HIDDEN STATUTORY BOTTLENECK]: "

echo.
echo [>>>] Generating Vox Halftone Scissor Cutout & Highlighter HTML Scene...
node -e "const { generateCollageSceneHtml } = require('./super_reel_engine/collage_broll_generator'); const fs = require('fs'); const html = generateCollageSceneHtml({ headline: process.argv[1] }); fs.writeFileSync('./super_reel_engine/renders/vox_preview.html', html, 'utf8'); console.log('Saved to super_reel_engine/renders/vox_preview.html');" "%topic%"
start "" ".\super_reel_engine\renders\vox_preview.html"
echo.
pause
goto MENU

:OPEN_RENDERS
cls
echo [>>>] Opening Video Renders Directory in Windows Explorer...
explorer ".\super_reel_engine\renders"
goto MENU

:OPEN_WEB_HUB
cls
echo [>>>] Opening /automation Hub in Default Web Browser...
start "" "https://corporatecompliance.in/automation"
goto MENU

:OPEN_WORKSPACE
cls
echo [>>>] Opening Unified Key Workspace in Default Web Browser...
start "" "https://corporatecompliance.in/automation/workspace"
goto MENU

:CHECK_WATCHDOGS
cls
echo ===============================================================================
echo                 SCHEDULED WATCHDOGS & BACKGROUND TASKS
echo ===============================================================================
echo.
powershell -Command "Get-ScheduledTask -TaskName 'EPFO_*', 'GitHub_*' -ErrorAction SilentlyContinue | Select-Object TaskName, State, LastRunTime, NextRunTime | Format-Table -AutoSize"
echo.
echo Checking GitHub Actions Self-Hosted Runner Process:
powershell -Command "Get-Process -Name 'Runner.Listener', 'Runner.Worker' -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, CPU, WorkingSet64 | Format-Table -AutoSize"
echo.
pause
goto MENU

:RUN_HEALTH_CHECK
cls
echo ===============================================================================
echo                   SYSTEM DIAGNOSTIC HEALTH CHECK
echo ===============================================================================
echo.
echo [1/5] Checking Node.js:
node -v
echo.
echo [2/5] Checking FFmpeg Binary:
where ffmpeg
echo.
echo [3/5] Checking yt-dlp Binary:
where yt-dlp
echo.
echo [4/5] Checking Internet Connectivity:
ping -n 1 dns.google >nul && echo Active (Online) || echo Offline
echo.
echo [5/5] Latest Omnichannel Posting Status:
type omnichannel_posting_status.json
echo.
pause
goto MENU

:EXIT_HUB
cls
echo.
echo Thank you for using Corporate Compliance AI Automation Hub. Goodbye!
timeout /t 2 >nul
exit /b 0
