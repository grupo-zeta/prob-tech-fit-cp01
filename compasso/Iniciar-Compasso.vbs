Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & folder & "\iniciar.ps1"""
For Each arg In WScript.Arguments
  If arg = "--startup" Then command = command & " -Startup"
Next
shell.Run command, 0, False
