@echo off
chcp 65001 >nul
title Connect Social Media Accounts (LinkedIn, Instagram, Facebook, X)
color 0B

cd /d "%~dp0"
set "PATH=C:\Users\acer\.local\nodejs;C:\Users\acer\.local\bin;C:\Users\acer\AppData\Local\Python\bin;%PATH%"

:MENU
cls
echo ==============================================================================
echo       CONNECT SOCIAL ACCOUNTS: ZERO-PASSWORD BROWSER AUTHENTICATION
echo ==============================================================================
echo   Supported Platforms:
echo     - LinkedIn  (B2B Thought-Leadership ^& Professional Cards)
echo     - Instagram (High-Engagement 1:1 Visual Square Posts)
echo     - Facebook  (Community Updates ^& Resource Links)
echo     - Twitter/X (Breaking News Threads ^& Viral Takes)
echo ==============================================================================
echo.
echo   HOW IT WORKS:
echo   1. Select an account to connect below.
echo   2. Microsoft Edge will open directly to the official login page.
echo   3. Log in normally using your password, 2FA, or Google/Apple sign-in.
echo   4. Once you are logged in and on your feed, session cookies are saved locally.
echo   5. You NEVER have to enter or share passwords in code or config files!
echo ==============================================================================
echo.
echo  [1] Connect LinkedIn (Opens Edge to login)
echo  [2] Connect Instagram (Opens Edge to login)
echo  [3] Connect Facebook (Opens Edge to login)
echo  [4] Connect Twitter / X (Opens Edge to login)
echo  [5] Connect All Missing Accounts Sequentially
echo  [6] Check Current Connection Status of All Accounts
echo  [7] Exit
echo.
echo ==============================================================================
set /p choice="Select an option [1-7]: "

if "%choice%"=="1" goto CONNECT_LINKEDIN
if "%choice%"=="2" goto CONNECT_INSTA
if "%choice%"=="3" goto CONNECT_FB
if "%choice%"=="4" goto CONNECT_TWITTER
if "%choice%"=="5" goto CONNECT_ALL
if "%choice%"=="6" goto CHECK_STATUS
if "%choice%"=="7" goto EXIT

echo Invalid option. Please select 1-7.
timeout /t 2 >nul
goto MENU

:CONNECT_LINKEDIN
cls
echo [*] Launching Microsoft Edge for LinkedIn Login...
node setup_sessions.js linkedin
echo.
pause
goto MENU

:CONNECT_INSTA
cls
echo [*] Launching Microsoft Edge for Instagram Login...
node setup_sessions.js instagram
echo.
pause
goto MENU

:CONNECT_FB
cls
echo [*] Launching Microsoft Edge for Facebook Login...
node setup_sessions.js facebook
echo.
pause
goto MENU

:CONNECT_TWITTER
cls
echo [*] Launching Microsoft Edge for Twitter / X Login...
node setup_sessions.js twitter
echo.
pause
goto MENU

:CONNECT_ALL
cls
echo [*] Starting Sequential Connection for All Missing Accounts...
node setup_sessions.js all
echo.
pause
goto MENU

:CHECK_STATUS
cls
node setup_sessions.js --status
echo.
pause
goto MENU

:EXIT
exit /b
