@echo off
chcp 65001 >nul
echo ================================
echo   市容巡查一体化系统 v4.2
echo   启动中...
echo ================================
echo.

set NODE=E:\nodJ\node.exe

:: 启动后端
echo [1/2] 启动后端服务 (端口 3001)...
cd /d "%~dp0backend"
start "GovBackend" cmd /c "%NODE% server.js"
ping -n 3 127.0.0.1 >nul

:: 启动前端
echo [2/2] 启动前端开发服务器 (端口 5173)...
cd /d "%~dp0frontend"
start "GovFrontend" cmd /c "%NODE% node_modules\vite\bin\vite.js --port 5173 --host"
ping -n 3 127.0.0.1 >nul

echo.
echo ================================
echo   系统启动完成！
echo   浏览器访问: http://localhost:3001
echo   后端API:    http://localhost:3001
echo ================================
echo.
echo 演示账号: D001/D002(处置) A001(管理) L001(领导)
echo.
echo 请在浏览器中打开 http://localhost:3001
pause
