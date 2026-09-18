; Extra steps for the Windows installer (electron-builder nsis.include).

; electron-builder's uninstaller removes the PManager.Backup file type but leaves the ".pmb"
; key pointing at it. Remove that key too when it is still ours, so an uninstalled PManager
; leaves nothing behind. An update runs the old uninstaller first and registers the type again,
; so it is skipped there.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    ReadRegStr $0 HKCU "Software\Classes\.pmb" ""
    ${if} $0 == "PManager.Backup"
      DeleteRegKey HKCU "Software\Classes\.pmb"
      System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
    ${endIf}
  ${endIf}
!macroend
