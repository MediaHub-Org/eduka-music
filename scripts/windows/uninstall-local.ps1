<#
.SYNOPSIS
  Quita la tarea de inicio de Eduka Music y para su servidor.

.DESCRIPTION
  Para y desregistra la tarea "Eduka Music local server" creada por
  install-local.ps1, y después para cualquier proceso node que esté ejecutando
  el server\serve.mjs de este repositorio. Se puede ejecutar sin que haya nada
  instalado.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TaskName = 'Eduka Music local server'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$server = Join-Path $repo 'server\serve.mjs'
$removed = $false

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction Stop } catch {}
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Tarea '$TaskName' eliminada."
  $removed = $true
}

$procs = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine.IndexOf($server, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
  })
foreach ($p in $procs) {
  try {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
    Write-Host "Servidor parado (pid $($p.ProcessId))."
    $removed = $true
  } catch {}
}

if (-not $removed) { Write-Host 'No había nada que quitar.' }
