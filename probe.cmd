@echo off
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | ForEach-Object { \"$($_.ProcessId) :: $($_.CommandLine)\" }" > "%~dp0probe-out.txt" 2>&1
echo COMPLETE >> "%~dp0probe-out.txt"
