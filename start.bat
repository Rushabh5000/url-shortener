@echo off
title URL Shortener - Starting...
cd /d "D:\AIProjects\url-shortener"

echo ============================================
echo   URL Shortener Dev Server
echo   App: http://localhost:3003
echo ============================================

echo Clearing port 3003...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3003 " ^| findstr LISTENING 2^>nul') do taskkill /PID %%a /F >nul 2>&1

start "URL Shortener" cmd /k "cd /d D:\AIProjects\url-shortener && npm run dev"

echo Done. URL Shortener is starting in a new window.
