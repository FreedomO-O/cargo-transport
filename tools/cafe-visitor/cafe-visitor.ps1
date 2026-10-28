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
    foreach ($BrowserProcess in $Processes) {
        $Window = Get-Process -Id $BrowserProcess.ProcessId -ErrorAction SilentlyContinue
        if ($Window -and $Window.MainWindowHandle -ne 0) {
            $null = $Window.CloseMainWindow()
        }
    }
    if ($Processes) { Start-Sleep -Seconds 3 }
    foreach ($Process in $Processes) {
        Stop-Process -Id $Process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}
try {
    Write-Host 'Cafe visitor: Ctrl+C or close this console to stop.'
    Write-Host 'Dedicated Edge profile; visit counting is not guaranteed.'
    $Choice = '1'
    if (-not $LoginOnly) {
        Write-Host '1. 로그인 후 자동 접속 시작 (처음 사용 / 로그인 만료)'
        Write-Host '2. 저장된 로그인 상태로 바로 시작'
        Write-Host '3. 로그인만 하고 종료'
        do {
            $Choice = Read-Host '번호를 입력하세요 (기본 1)'
            if ([string]::IsNullOrWhiteSpace($Choice)) { $Choice = '1' }
        } while ($Choice -notin @('1', '2', '3'))
    }
    if ($LoginOnly -or $Choice -in @('1', '3')) {
        $LoginUrl = 'https://nid.naver.com/nidlogin.login?url=' + [Uri]::EscapeDataString($Url)
        Start-Process -FilePath $Edge -ArgumentList @(
            "--user-data-dir=`"$Profile`"",
            '--new-window',
            $LoginUrl,
            '--no-first-run',
            '--disable-background-mode'
        )
        Write-Host '열린 Edge에서 직접 로그인하세요. 필요하면 로그인 상태 유지를 선택하세요.'
        Write-Host '카페에 로그인된 것을 확인한 뒤 이 콘솔로 돌아오세요.'
        $null = Read-Host '준비되면 Enter (그 전에는 창을 자동으로 닫지 않습니다)'
        Close-CafeWindow
        if ($LoginOnly -or $Choice -eq '3') { return }
    }
    do {
        $Timer = [System.Diagnostics.Stopwatch]::StartNew()
        Start-Process -FilePath $Edge -ArgumentList @(
            "--user-data-dir=`"$Profile`"",
            "--app=$Url",
            '--no-first-run',
            '--disable-background-mode'
        )
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
