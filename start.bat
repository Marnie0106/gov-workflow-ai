@echo off
chcp 65001 >nul
echo ================================
echo   市容巡查一体化系统 - 启动
echo ================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装
    pause
    exit /b 1
)

:: 启动后端
echo [1/2] 启动后端服务 (端口 3001)...
cd /d "%~dp0backend"
start "后端服务" cmd /c "node server.js"
timeout /t 2 /nobreak >nul

:: 启动前端
echo [2/2] 启动前端开发服务器...
cd /d "%~dp0frontend"
start "前端服务" cmd /c "npm run dev"

echo.
echo ================================
echo   启动完成！
echo   后端: http://localhost:3001
echo   前端: http://localhost:5173
echo ================================
echo.
echo 按任意键关闭此窗口...
pause >nul
