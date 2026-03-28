$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut("C:\Users\Pc\Desktop\ENTRAR ACA.lnk")
$s.TargetPath = "C:\Users\Pc\Desktop\Claude proyects\terminal-app\dist\win-unpacked\Amadeus.exe"
$s.WorkingDirectory = "C:\Users\Pc\Desktop\Claude proyects\terminal-app\dist\win-unpacked"
$s.Description = "Amadeus Terminal"
$s.Save()
