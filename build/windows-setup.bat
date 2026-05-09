@echo off
chcp 65001 >nul
title AI 助手 - Windows 安装修复工具
echo ==========================================
echo    AI 助手 - Windows 安装修复工具
echo ==========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误: 请以管理员身份运行此脚本！
    echo 右键点击脚本，选择"以管理员身份运行"
    pause
    exit /b 1
)

echo [1/6] 检查系统环境...
echo.

:: 检查 Node.js 运行时
echo 检查 Node.js 运行时...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo 警告: 未检测到 Node.js，某些功能可能无法使用
) else (
    echo ✓ Node.js 已安装
)

:: 检查 .NET Framework
echo 检查 .NET Framework...
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" /v Version >nul 2>&1
if %errorLevel% neq 0 (
    echo 警告: 未检测到 .NET Framework 4.0+
    echo 请从 https://dotnet.microsoft.com/download 下载安装
) else (
    echo ✓ .NET Framework 已安装
)

echo.
echo [2/6] 配置 Windows 防火墙...
echo.

:: 添加防火墙规则
echo 添加防火墙规则允许端口 3001...
netsh advfirewall firewall add rule name="AI News Tool API" dir=in action=allow protocol=tcp localport=3001 enable=yes >nul 2>&1
if %errorLevel% equ 0 (
    echo ✓ 防火墙规则添加成功
) else (
    echo ⚠ 防火墙规则可能已存在或添加失败
)

echo.
echo [3/6] 检查端口占用...
echo.

:: 检查端口 3001
echo 检查端口 3001...
netstat -ano | findstr :3001 >nul 2>&1
if %errorLevel% equ 0 (
    echo ⚠ 端口 3001 已被占用
    echo 尝试释放端口...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        taskkill /F /PID %%a >nul 2>&1
        if %errorLevel% equ 0 (
            echo ✓ 已终止进程 %%a
        ) else (
            echo ✗ 无法终止进程 %%a
        )
    )
) else (
    echo ✓ 端口 3001 可用
)

echo.
echo [4/6] 创建用户数据目录...
echo.

:: 创建用户数据目录
set "USER_DATA=%LOCALAPPDATA%\ai-news-tool"
if not exist "%USER_DATA%" mkdir "%USER_DATA%"
if not exist "%USER_DATA%\logs" mkdir "%USER_DATA%\logs"
if not exist "%USER_DATA%\cache" mkdir "%USER_DATA%\cache"
echo ✓ 用户数据目录创建完成

echo.
echo [5/6] 修复 hosts 文件...
echo.

:: 检查 hosts 文件
set "HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts"
findstr /C:"127.0.0.1 localhost" "%HOSTS_FILE%" >nul 2>&1
if %errorLevel% neq 0 (
    echo 添加 localhost 到 hosts 文件...
    echo. >> "%HOSTS_FILE%"
    echo 127.0.0.1 localhost >> "%HOSTS_FILE%"
    echo ✓ hosts 文件修复完成
) else (
    echo ✓ hosts 文件正常
)

echo.
echo [6/6] 清理临时文件...
echo.

:: 清理临时文件
set "TEMP_DIR=%TEMP%\ai-news-tool"
if exist "%TEMP_DIR%" (
    rmdir /s /q "%TEMP_DIR%" >nul 2>&1
    echo ✓ 临时文件已清理
)

echo.
echo ==========================================
echo    安装修复完成！
echo ==========================================
echo.
echo 现在可以启动 AI 助手应用了。
echo.
echo 如果仍然遇到问题，请尝试：
echo 1. 重启计算机
echo 2. 以管理员身份运行应用
echo 3. 重新安装应用
echo.
pause
