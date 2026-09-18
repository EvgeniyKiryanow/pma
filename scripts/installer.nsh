; Extra steps for the Windows installer (electron-builder nsis.include).

!macro customUnInstall
  ${ifNot} ${isUpdated}
    ; electron-builder's uninstaller removes the PManager.Backup file type but leaves the ".pmb"
    ; key pointing at it. Remove that key too when it is still ours. An update runs the old
    ; uninstaller first and registers the type again, so this is skipped there.
    ReadRegStr $0 HKCU "Software\Classes\.pmb" ""
    ${if} $0 == "PManager.Backup"
      DeleteRegKey HKCU "Software\Classes\.pmb"
      System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
    ${endIf}

    ; The data stays unless the person asks otherwise (a silent uninstall keeps it: the
    ; in-app «Видалити програму» has destroyed it already).
    ${if} ${FileExists} "$APPDATA\p-manager\*.*"
      MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Видалити також усі дані PManager на цьому компʼютері (особовий склад, документи, облікові записи, автокопії)?$\r$\n$\r$\nБез резервної копії (.pmb) їх не повернути.$\r$\n$\r$\n«Ні» — дані залишаться, і після повторного встановлення програма відкриє їх знову." /SD IDNO IDNO pmanager_keep_data
        RMDir /r "$APPDATA\p-manager"
        RMDir /r "$LOCALAPPDATA\p-manager-updater"
      pmanager_keep_data:
    ${endIf}
  ${endIf}
!macroend
