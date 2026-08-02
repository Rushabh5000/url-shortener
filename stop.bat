@echo off
echo Stopping URL Shortener (port 3003)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3003 " ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1
echo URL Shortener stopped.
