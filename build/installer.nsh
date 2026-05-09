; NSIS 安装程序脚本
; 用于 Windows 安装时的自动修复配置

!include "LogicLib.nsh"
!include "FileFunc.nsh"

; 安装完成后自动修复
!macro customInstall
  ; 以管理员权限运行
  RequestExecutionLevel admin

  DetailPrint "=========================================="
  DetailPrint "开始 Windows 安装自动修复..."
  DetailPrint "=========================================="

  ; 1. 添加 Windows 防火墙规则
  DetailPrint "[1/6] 配置 Windows 防火墙..."
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="AI News Tool API" dir=in action=allow protocol=tcp localport=3001 program="$INSTDIR\AI 助手.exe" enable=yes'
  Pop $0
  ${If} $0 != 0
    DetailPrint "防火墙规则可能已存在或添加失败，继续..."
  ${Else}
    DetailPrint "✓ 防火墙规则添加成功"
  ${EndIf}

  ; 2. 检查并释放端口 3001
  DetailPrint "[2/6] 检查端口 3001..."
  nsExec::ExecToLog 'netstat -ano | findstr :3001'
  Pop $0
  ${If} $0 == 0
    DetailPrint "端口 3001 被占用，尝试释放..."
    nsExec::ExecToLog 'for /f "tokens=5" %%a in (''netstat -ano ^| findstr :3001'') do taskkill /F /PID %%a'
    DetailPrint "✓ 端口已释放"
  ${Else}
    DetailPrint "✓ 端口 3001 可用"
  ${EndIf}

  ; 3. 创建用户数据目录
  DetailPrint "[3/6] 创建用户数据目录..."
  CreateDirectory "$LOCALAPPDATA\ai-news-tool"
  CreateDirectory "$LOCALAPPDATA\ai-news-tool\logs"
  CreateDirectory "$LOCALAPPDATA\ai-news-tool\cache"
  CreateDirectory "$LOCALAPPDATA\ai-news-tool\data"
  DetailPrint "✓ 用户数据目录创建完成"

  ; 4. 修复 hosts 文件
  DetailPrint "[4/6] 检查 hosts 文件..."
  nsExec::ExecToLog 'findstr /C:"127.0.0.1 localhost" "$WINDIR\System32\drivers\etc\hosts"'
  Pop $0
  ${If} $0 != 0
    DetailPrint "修复 hosts 文件..."
    nsExec::ExecToLog 'echo. >> "$WINDIR\System32\drivers\etc\hosts"'
    nsExec::ExecToLog 'echo 127.0.0.1 localhost >> "$WINDIR\System32\drivers\etc\hosts"'
    DetailPrint "✓ hosts 文件修复完成"
  ${Else}
    DetailPrint "✓ hosts 文件正常"
  ${EndIf}

  ; 5. 写入安装信息
  DetailPrint "[5/6] 写入安装信息..."
  FileOpen $0 "$LOCALAPPDATA\ai-news-tool\install-info.txt" w
  FileWrite $0 "安装时间: ${__DATE__} ${__TIME__}$
"
  FileWrite $0 "安装路径: $INSTDIR$
"
  FileWrite $0 "版本: ${VERSION}$
"
  FileWrite $0 "操作系统: Windows$
"
  FileClose $0
  DetailPrint "✓ 安装信息已写入"

  ; 6. 创建快捷方式
  DetailPrint "[6/6] 创建快捷方式..."
  CreateShortcut "$DESKTOP\AI 助手.lnk" "$INSTDIR\AI 助手.exe"
  CreateDirectory "$SMPROGRAMS\AI 助手"
  CreateShortcut "$SMPROGRAMS\AI 助手\AI 助手.lnk" "$INSTDIR\AI 助手.exe"
  CreateShortcut "$SMPROGRAMS\AI 助手\卸载.lnk" "$INSTDIR\Uninstall AI 助手.exe"
  CreateShortcut "$SMPROGRAMS\AI 助手\修复工具.lnk" "$INSTDIR\build\windows-setup.bat"
  DetailPrint "✓ 快捷方式创建完成"

  ; 运行额外的修复脚本（如果存在）
  ${If} ${FileExists} "$INSTDIR\build\windows-setup.bat"
    DetailPrint "运行额外修复脚本..."
    ExecWait '"$INSTDIR\build\windows-setup.bat"'
  ${EndIf}

  DetailPrint "=========================================="
  DetailPrint "安装自动修复完成！"
  DetailPrint "=========================================="
!macroend

; 卸载时清理
!macro customUnInstall
  DetailPrint "=========================================="
  DetailPrint "开始卸载清理..."
  DetailPrint "=========================================="

  ; 移除 Windows 防火墙规则
  DetailPrint "移除 Windows 防火墙规则..."
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="AI News Tool API"'
  Pop $0
  DetailPrint "✓ 防火墙规则已移除"

  ; 询问是否删除用户数据
  MessageBox MB_YESNO "是否删除用户数据？$
$
这将删除所有保存的新闻和设置。" IDYES deleteData IDNO skipDelete

  deleteData:
    DetailPrint "删除用户数据..."
    RMDir /r "$LOCALAPPDATA\ai-news-tool"
    DetailPrint "✓ 用户数据已删除"
  skipDelete:

  ; 删除快捷方式
  DetailPrint "删除快捷方式..."
  Delete "$DESKTOP\AI 助手.lnk"
  RMDir /r "$SMPROGRAMS\AI 助手"
  DetailPrint "✓ 快捷方式已删除"

  DetailPrint "=========================================="
  DetailPrint "卸载完成！"
  DetailPrint "=========================================="
!macroend

; 初始化检查
!macro customInit
  ; 检查是否以管理员权限运行
  UserInfo::GetAccountType
  Pop $0
  ${If} $0 != "admin"
    MessageBox MB_OK "请以管理员身份运行安装程序。$
$
右键点击安装程序，选择'以管理员身份运行'。"
    Quit
  ${EndIf}

  ; 检查系统要求
  DetailPrint "检查系统要求..."

  ; 检查 Windows 版本（Windows 10 或更高）
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "CurrentVersion"
  ${If} $0 < "6.2"
    MessageBox MB_OK "需要 Windows 10 或更高版本。"
    Quit
  ${EndIf}

  DetailPrint "✓ 系统要求检查通过"
!macroend

; 安装失败时的回滚
!macro customInstallError
  DetailPrint "安装过程中出现错误，正在回滚..."
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="AI News Tool API"'
  RMDir /r "$LOCALAPPDATA\ai-news-tool"
  DetailPrint "回滚完成"
!macroend
