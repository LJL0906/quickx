@echo off
set /p TOKEN="输入 GitHub Token: "
set GH_TOKEN=%TOKEN%
call npm run release
echo.
echo ========================================
echo  发布完成！打开 GitHub Releases 确认：
echo  https://github.com/LJL0906/quickx/releases
echo ========================================
pause
