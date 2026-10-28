param([switch]$Startup)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$pythonCandidates = @(
  (Join-Path $projectRoot 'runtime\python.exe'),
  (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe')
)
$pythonPath = $pythonCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $pythonPath) {
  $pythonCommand = Get-Command py.exe -ErrorAction SilentlyContinue
  if ($pythonCommand) { $pythonPath = $pythonCommand.Source }
}
if (-not $pythonPath) {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show('Instale o Python 3.11 ou posterior e execute novamente. O projeto não requer pacotes pip.', 'Compasso') | Out-Null
  exit 1
}
& $pythonPath (Join-Path $projectRoot 'preparar_assets.py')
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível preparar os modelos locais. Confira a conexão na primeira execução.' }
if ($Startup) { & $pythonPath (Join-Path $projectRoot 'app.py') --open --startup }
else { & $pythonPath (Join-Path $projectRoot 'app.py') --open }
