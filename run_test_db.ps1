param(
    [int]$TimeoutSeconds = 300
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$runner = Join-Path $scriptDir 'run_with_timeout.js'
$test = Join-Path $scriptDir 'test_db.js'

if (-not (Test-Path $runner)) { Write-Error "run_with_timeout.js not found at $runner"; exit 1 }
if (-not (Test-Path $test)) { Write-Error "test_db.js not found at $test"; exit 1 }

$timeoutMs = [int]($TimeoutSeconds * 1000)

Write-Host "Running test_db.js with timeout ${TimeoutSeconds}s ($timeoutMs ms)"

$outFile = Join-Path $scriptDir 'test_db.out.txt'
$errFile = Join-Path $scriptDir 'test_db.err.txt'

# Start node with the runner and pass the inner command to run test_db.js
# Build the --cmd argument as a single string: node "full\path\to\test_db.js"
$cmdArg = 'node "' + $test + '"'
$proc = Start-Process -FilePath 'node' -ArgumentList @($runner, '--cmd', $cmdArg, '--timeout', $timeoutMs) -NoNewWindow -PassThru -RedirectStandardOutput $outFile -RedirectStandardError $errFile

# Wait for exit up to timeout + 5s
$didExit = $proc.WaitForExit($timeoutMs + 5000)
if (-not $didExit) {
    Write-Warning "Process did not exit in time. Killing..."
    try { Stop-Process -Id $proc.Id -Force } catch { }
}

Write-Host "ExitCode: $($proc.ExitCode)"
Write-Host "Stdout saved to: $outFile"
Write-Host "Stderr saved to: $errFile"
exit $proc.ExitCode
