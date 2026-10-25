$ErrorActionPreference = 'Stop'
$project = 'C:\Users\DIEGO\Desktop\MyC Muebles'
$node = 'C:\Users\DIEGO\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$vite = Join-Path $project 'node_modules\vite\bin\vite.js'
$server = $null
try {
  if (-not (Test-Path $node) -or -not (Test-Path $vite)) { throw 'Faltan Node.js o las dependencias de la aplicación.' }
  $tcp = [System.Net.Sockets.TcpClient]::new()
  try { $tcp.Connect('127.0.0.1', 5173); $ready = $true } catch { $ready = $false } finally { $tcp.Dispose() }
  if (-not $ready) {
    $server = Start-Process -FilePath $node -ArgumentList "`"$vite`" --host 127.0.0.1" -WorkingDirectory $project -WindowStyle Hidden -PassThru
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
      Start-Sleep -Milliseconds 500
      $tcp = [System.Net.Sockets.TcpClient]::new()
      try { $tcp.Connect('127.0.0.1', 5173); $ready = $true } catch { $ready = $false } finally { $tcp.Dispose() }
      if ($ready) { break }
      if ($server.HasExited) { throw 'El servidor de la aplicación se cerró al iniciar.' }
    }
  }
  if (-not $ready) { throw 'El servidor no respondió en localhost:5173.' }
  Start-Process 'http://localhost:5173/'
  if ($server) { Wait-Process -Id $server.Id }
} catch {
  Add-Content -LiteralPath (Join-Path $project 'launcher.log') -Value "$(Get-Date -Format s) $($_.Exception.Message)"
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show("No se pudo abrir MyC Muebles.`n$($_.Exception.Message)", 'MyC Muebles') | Out-Null
}
