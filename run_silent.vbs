' run_silent.vbs — Silent Execution Wrapper for EPFO Autopilot
' Runs run_browser_bot.bat in the background with window hidden (SW_HIDE = 0)
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd.exe /c ""C:\Users\acer\Documents\GitHub\twitter-auto-poster-bot-ai\run_browser_bot.bat""", 0, False
