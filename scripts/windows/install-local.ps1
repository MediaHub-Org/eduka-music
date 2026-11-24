<#
.SYNOPSIS
  Arranca el servidor local de Eduka Music al iniciar sesión, sin ventana.

.DESCRIPTION
  Registra una tarea programada por usuario, "Eduka Music local server", que
  ejecuta server\serve.mjs de este repositorio al iniciar sesión a través de
  "conhost.exe --headless" (sin consola). Sirve la PWA instalada en
  http://localhost:4174/eduka-music/, solo en loopback. Si el proceso se cae, la
  tarea lo reintenta hasta 3 veces. Ejecutarlo de nuevo reemplaza la tarea. No
  hacen falta permisos de administrador.

  Para quitarla: scripts\windows\uninstall-local.ps1

.PARAMETER StartNow
  Arranca la tarea en el acto y espera a que el servidor responda.

.EXAMPLE
  pwsh -NoProfile -File scripts\windows\install-local.ps1 -StartNow
#>
[CmdletBinding()]
param([switch]$StartNow)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TaskName = 'Eduka Music local server'
$Port = 4174
$Url = "http://localhost:$Port/eduka-music/"
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$server = Join-Path $repo 'server\serve.mjs'

if (-not (Test-Path (Join-Path $repo 'dist\index.html'))) {
  throw "Falta dist\ en $repo. Ejecuta 'npm run build' primero."
}
$holder = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($holder) {
  Write-Warning "El puerto $Port ya está ocupado (pid $($holder.OwningProcess)). Si es otra app, la tarea no podrá servir la PWA."
}
$nodeCmd = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $nodeCmd) { throw 'No se encontró node en el PATH. Instala Node.js 20 o superior.' }
$node = $nodeCmd.Source

$conhost = Join-Path $env:SystemRoot 'System32\conhost.exe'
$action = New-ScheduledTaskAction -Execute $conhost `
  -Argument ('--headless "{0}" "{1}"' -f $node, $server) `
  -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal `
  -Description 'Sirve la PWA de Eduka Music en localhost:4174 (solo loopback).' `
  -Force | Out-Null
Write-Host "Tarea '$TaskName' registrada: arranca al iniciar sesión."
Write-Host "  node:    $node"
Write-Host "  servidor: $server"

if ($StartNow) {
  Start-ScheduledTask -TaskName $TaskName
  $deadline = (Get-Date).AddSeconds(10)
  $up = $false
  while ((Get-Date) -lt $deadline -and -not $up) {
    try {
      $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      $up = $true
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  if ($up) { Write-Host "Listo -> $Url" }
  else { Write-Warning "La tarea arrancó pero $Url no respondió en 10 s. ¿Está el puerto ocupado?" }
}
