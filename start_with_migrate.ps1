# Start node with MIGRATE_ON_START=1 and redirect logs
param(
    [int]$DelayBeforeStart = 1
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

Write-Host "Setting MIGRATE_ON_START=1 and starting node index.js"
$env:MIGRATE_ON_START = '1'

$out = Join-Path $scriptDir 'server_run.out.txt'
$err = Join-Path $scriptDir 'server_run.err.txt'

# Start node in background and redirect output
Start-Process -FilePath 'node' -ArgumentList 'index.js' -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err -PassThru

Write-Host "Node started (background). stdout -> $out, stderr -> $err"
