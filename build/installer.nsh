; NSIS installer script
; Auto-repair configuration for Windows installation

RequestExecutionLevel admin

!macro customInstall
  DetailPrint "Starting Windows installation auto-repair..."
  
  ; Create user data directories
  CreateDirectory "$LOCALAPPDATA\ainewstool"
  CreateDirectory "$LOCALAPPDATA\ainewstool\logs"
  CreateDirectory "$LOCALAPPDATA\ainewstool\cache"
  DetailPrint "User data directories created"

  ; Write installation info
  FileOpen $0 "$LOCALAPPDATA\ainewstool\installinfo.txt" w
  FileWrite $0 "Install Time: ${__DATE__} ${__TIME__}$
"
  FileWrite $0 "Install Path: $INSTDIR$
"
  FileWrite $0 "Version: ${VERSION}$
"
  FileClose $0
  DetailPrint "Installation info written"

  ; Create shortcuts
  CreateShortcut "$DESKTOP\AI Assistant.lnk" "$INSTDIR\AI Assistant.exe"
  CreateDirectory "$SMPROGRAMS\AI Assistant"
  CreateShortcut "$SMPROGRAMS\AI Assistant\AI Assistant.lnk" "$INSTDIR\AI Assistant.exe"
  CreateShortcut "$SMPROGRAMS\AI Assistant\Uninstall.lnk" "$INSTDIR\Uninstall AI Assistant.exe"
  DetailPrint "Shortcuts created"
  
  DetailPrint "Installation auto-repair completed"
!macroend

!macro customUnInstall
  DetailPrint "Starting uninstall cleanup..."

  ; Remove user data
  MessageBox MB_YESNO "Delete user data? This will remove all saved news and settings." IDYES deleteData IDNO skipDelete

  deleteData:
    RMDir /r "$LOCALAPPDATA\ainewstool"
    DetailPrint "User data deleted"
  skipDelete:

  ; Delete shortcuts
  Delete "$DESKTOP\AI Assistant.lnk"
  RMDir /r "$SMPROGRAMS\AI Assistant"
  DetailPrint "Shortcuts deleted"
  DetailPrint "Uninstall completed"
!macroend

!macro customInit
  UserInfo::GetAccountType
  Pop $0
  StrCmp $0 "admin" isAdmin
    MessageBox MB_OK "Please run the installer as administrator."
    Quit
  isAdmin:
  DetailPrint "Admin rights check passed"
!macroend
