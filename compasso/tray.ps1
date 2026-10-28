param([int]$Port = 8765)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$baseUrl = "http://127.0.0.1:$Port"
function Invoke-Compasso([string]$Action) {
  try {
    $state = Invoke-RestMethod "$baseUrl/api/state" -TimeoutSec 2
    Invoke-RestMethod "$baseUrl/api/$Action" -Method Post -Headers @{'X-Compasso-Token'=$state.token} -ContentType 'application/json' -Body '{}' -TimeoutSec 2 | Out-Null
  } catch {}
}
$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon = New-Object System.Drawing.Icon (Join-Path $PSScriptRoot 'compasso.ico')
$tray.Text = 'Compasso — foco no seu ritmo'
$tray.Visible = $true
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$openItem = $menu.Items.Add('Abrir Compasso')
$openItem.Add_Click({ Invoke-Compasso 'restore' })
$exitItem = $menu.Items.Add('Encerrar Compasso')
$exitItem.Add_Click({ Invoke-Compasso 'shutdown'; $tray.Visible=$false; [System.Windows.Forms.Application]::Exit() })
$tray.ContextMenuStrip = $menu
$tray.Add_DoubleClick({ Invoke-Compasso 'restore' })
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval=5000
$timer.Add_Tick({
  try { Invoke-RestMethod "$baseUrl/api/state" -TimeoutSec 2 | Out-Null }
  catch { $tray.Visible=$false; [System.Windows.Forms.Application]::Exit() }
})
$timer.Start()
[System.Windows.Forms.Application]::Run()
$tray.Dispose()
