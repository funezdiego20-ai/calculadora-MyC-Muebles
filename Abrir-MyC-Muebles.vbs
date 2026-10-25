Option Explicit
Dim shell, project, powershell, launcher, command
Set shell = CreateObject("WScript.Shell")
project = "C:\Users\DIEGO\Desktop\MyC Muebles"
shell.CurrentDirectory = project
powershell = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
launcher = project & "\Abrir-Taller.ps1"
command = """" & powershell & """ -NoProfile -WindowStyle Hidden -File """ & launcher & """"
shell.Run command, 0, False
