@echo off
setlocal
title Naver Cafe Visitor
chcp 65001 >nul
set "CAFE_VISITOR_SELF=%~f0"
powershell.exe -NoProfile -Command "$text=[IO.File]::ReadAllText($env:CAFE_VISITOR_SELF); & ([scriptblock]::Create($text.Substring($text.LastIndexOf('# POWERSHELL_START')+18)))"
pause
exit /b
# POWERSHELL_START
param([switch]$LoginOnly)
$ErrorActionPreference = 'Stop'
$Url = 'https://cafe.naver.com/truckerking'
$IntervalSeconds = 1830
$OpenSeconds = 15
$Profile = Join-Path $env:LOCALAPPDATA 'CafeVisitorEdgeProfile'
$LogDirectory = Join-Path $env:LOCALAPPDATA 'CafeVisitor'
$null = New-Item -ItemType Directory -Path $LogDirectory -Force
$LogPath = Join-Path $LogDirectory 'activity.log'
function Write-Status([string]$Message) {
    $Line = ('[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message)
    Write-Host $Line
    try { Add-Content -LiteralPath $LogPath -Value $Line -Encoding UTF8 }
    catch { Write-Warning '로그 파일을 저장하지 못했습니다.' }
}
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
    $Processes = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" -ErrorAction Stop |
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
    Write-Host '자동 접속 중에는 이 검은 창을 열어 두세요. 중지: Ctrl+C'
    Write-Host ('실행 기록: ' + $LogPath)
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
    Write-Status '자동 반복 접속 시작 (간격: 30분 30초)'
    $Attempt = 0
    do {
        $Attempt++
        $Timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            Start-Process -FilePath $Edge -ArgumentList @(
                "--user-data-dir=`"$Profile`"",
                "--app=$Url",
                '--no-first-run',
                '--disable-background-mode'
            ) -ErrorAction Stop
            Write-Status ("접속 시도 #{0}: 브라우저 열기 명령 완료" -f $Attempt)
            Start-Sleep -Seconds $OpenSeconds
            Close-CafeWindow
            Write-Status '창 닫기 완료'
        } catch {
            Write-Status ('오류: ' + $_.Exception.Message)
            Write-Status '프로그램을 종료하지 않고 다음 예정 시각에 재시도합니다.'
        }
        $Remaining = [Math]::Max(0, $IntervalSeconds - $Timer.Elapsed.TotalSeconds)
        Write-Status ('다음 접속 예정: ' + (Get-Date).AddSeconds($Remaining).ToString('yyyy-MM-dd HH:mm:ss'))
        while ($Timer.Elapsed.TotalSeconds -lt $IntervalSeconds) {
            $SecondsLeft = [int][Math]::Ceiling($IntervalSeconds - $Timer.Elapsed.TotalSeconds)
            $Minutes = [int][Math]::Floor($SecondsLeft / 60)
            $Seconds = $SecondsLeft % 60
            Write-Host ("`r다음 접속까지 {0:00}분 {1:00}초 / 중지: Ctrl+C   " -f $Minutes, $Seconds) -NoNewline
            Start-Sleep -Milliseconds 1000
        }
        Write-Host ''
    } while ($true)
} finally {
    try { Close-CafeWindow } catch { Write-Warning $_.Exception.Message }
    $Mutex.ReleaseMutex()
    $Mutex.Dispose()
}
