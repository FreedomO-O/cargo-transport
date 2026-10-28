param([switch]$LoginOnly)
$ErrorActionPreference = 'Stop'
$Url = 'https://cafe.naver.com/truckerking'
$IntervalSeconds = 1830
$OpenSeconds = 15
$Profile = Join-Path $env:LOCALAPPDATA 'CafeVisitorEdgeProfile'
$Candidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)
$Edge = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Edge) { throw 'Microsoft Edge is required.' }
$Mutex = New-Object System.Threading.Mutex($false, 'Local\CafeVisitorTruckerking')
$Locked = $Mutex.WaitOne(0)
if (-not $Locked) { $Mutex.Dispose(); throw 'Cafe visitor is already running.' }
function Close-CafeWindow {
    # Only stop Edge processes belonging to this dedicated browser profile.
    $Processes = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" |
        Where-Object { $_.CommandLine -and $_.CommandLine.Contains($Profile) }
    foreach ($Process in $Processes) {
        Stop-Process -Id $Process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}
try {
    Write-Host 'Cafe visitor: Ctrl+C or close this console to stop.'
    Write-Host 'Dedicated Edge profile; visit counting is not guaranteed.'
    do {
        $Timer = [System.Diagnostics.Stopwatch]::StartNew()
        Start-Process -FilePath $Edge -ArgumentList @(
            "--user-data-dir=`"$Profile`"",
            "--app=$Url",
            '--no-first-run',
            '--disable-background-mode'
        )
        if ($LoginOnly) {
            Read-Host 'Log in manually in Edge, then press Enter here to close it'
            break
        }
        Write-Host ('Opened: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
        Start-Sleep -Seconds $OpenSeconds
        Close-CafeWindow
        $Remaining = [Math]::Max(0, $IntervalSeconds - $Timer.Elapsed.TotalSeconds)
        Start-Sleep -Milliseconds ([int]($Remaining * 1000))
    } while ($true)
} finally {
    Close-CafeWindow
    $Mutex.ReleaseMutex()
    $Mutex.Dispose()
}
