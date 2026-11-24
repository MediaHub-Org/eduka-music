<#
.SYNOPSIS
  Quita la tarea de inicio de Eduka Music y para su servidor.

.DESCRIPTION
  Para y desregistra la tarea "Eduka Music local server" creada por
  install-local.ps1, y después para el servidor: primero por el pid que deja
  server\serve.mjs en .serve.pid, y si no está, por la línea de comandos del
  proceso. Se puede ejecutar sin que haya nada instalado.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TaskName = 'Eduka Music local server'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$server = Join-Path $repo 'server\serve.mjs'
$pidFile = Join-Path $repo '.serve.pid'
$removed = $false

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction Stop } catch {}
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Tarea '$TaskName' eliminada."
  $removed = $true
}

if (Test-Path $pidFile) {
  $raw = (Get-Content $pidFile -Raw).Trim()
  $pidValue = 0
  if ([int]::TryParse($raw, [ref]$pidValue)) {
    $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq 'node') {
      try {
        Stop-Process -Id $pidValue -Force -ErrorAction Stop
        Write-Host "Servidor parado (pid $pidValue)."
        $removed = $true
      } catch {}
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Respaldo: procesos lanzados a mano, con ruta absoluta o relativa.
$procs = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object {
    $cmd = $_.CommandLine
    if (-not $cmd) { return $false }
    $absolute = $cmd.IndexOf($server, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    $relative = $cmd.IndexOf('server/serve.mjs', [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -or
                $cmd.IndexOf('server\serve.mjs', [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    $absolute -or $relative
  })
foreach ($p in $procs) {
  try {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
    Write-Host "Servidor parado (pid $($p.ProcessId))."
    $removed = $true
  } catch {}
}

if (-not $removed) { Write-Host 'No había nada que quitar.' }
