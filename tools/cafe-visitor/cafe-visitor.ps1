param([switch]$LoginOnly)
$ErrorActionPreference = 'Stop'
$Url = 'https://cafe.naver.com/truckerking'
$IntervalSeconds = 1830
$OpenSeconds = 15
$Profile = Join-Path $env:LOCALAPPDATA 'CafeVisitorEdgeProfile'
$LogDirectory = Join-Path $env:LOCALAPPDATA 'CafeVisitor'
if ($env:CAFE_VISITOR_SELF) {
    $LogDirectory = Split-Path -Parent $env:CAFE_VISITOR_SELF
} elseif ($PSScriptRoot) {
    $LogDirectory = $PSScriptRoot
}
try {
    $LogPath = Join-Path $LogDirectory 'cafe-visitor.log'
    Add-Content -LiteralPath $LogPath -Value '' -Encoding UTF8 -ErrorAction Stop
} catch {
    $LogDirectory = Join-Path $env:LOCALAPPDATA 'CafeVisitor'
    $null = New-Item -ItemType Directory -Path $LogDirectory -Force
    $LogPath = Join-Path $LogDirectory 'activity.log'
}
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
Write-Status '========== 프로그램 시작 =========='
Write-Status ('실행 기록 저장 위치: ' + $LogPath)
if (-not $Edge) { Write-Status '오류: Microsoft Edge를 찾지 못했습니다.'; throw 'Microsoft Edge is required.' }
$Mutex = New-Object System.Threading.Mutex($false, 'Local\CafeVisitorTruckerking')
try { $Locked = $Mutex.WaitOne(0) }
catch [System.Threading.AbandonedMutexException] {
    $Locked = $true
    Write-Status '이전 실행이 비정상 종료되어 실행 잠금을 복구했습니다.'
}
if (-not $Locked) { Write-Status '오류: 이미 실행 중입니다. 기존 창을 먼저 종료하세요.'; $Mutex.Dispose(); throw 'Cafe visitor is already running.' }
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
        Write-Status '로그인 창 열기 요청'
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
        Write-Status '로그인 대기: 로그인 후 이 콘솔에서 Enter를 눌러야 반복을 시작합니다.'
        $null = Read-Host '준비되면 Enter (그 전에는 창을 자동으로 닫지 않습니다)'
        Write-Status '사용자가 로그인 완료를 확인했습니다 (로그인 상태 자동 검증 아님). '
        Close-CafeWindow
        if ($LoginOnly -or $Choice -eq '3') { return }
    }
    Write-Status '자동 반복 접속 시작 (간격: 30분 30초)'
    $Attempt = 0
    do {
        $Attempt++
        $Timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            Write-Status ("접속 시도 #{0} 시작: {1}" -f $Attempt, $Url)
            $OpenTimer = [System.Diagnostics.Stopwatch]::StartNew()
            Start-Process -FilePath $Edge -ArgumentList @(
                "--user-data-dir=`"$Profile`"",
                "--app=$Url",
                '--no-first-run',
                '--disable-background-mode'
            ) -ErrorAction Stop
            Write-Status ("접속 시도 #{0}: 브라우저 열기 명령 완료" -f $Attempt)
            $WindowFound = $false
            do {
                $BrowserProcesses = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" -ErrorAction Stop |
                    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($Profile) }
                foreach ($BrowserProcess in $BrowserProcesses) {
                    $Window = Get-Process -Id $BrowserProcess.ProcessId -ErrorAction SilentlyContinue
                    if ($Window -and $Window.MainWindowHandle -ne 0) { $WindowFound = $true; break }
                }
                if ($WindowFound) { break }
                Start-Sleep -Milliseconds 500
            } while ($OpenTimer.Elapsed.TotalSeconds -lt 5)
            if ($WindowFound) {
                Write-Status ("접속 시도 #{0}: Edge 창 열림 확인 (페이지 로딩/방문수 확인 아님)" -f $Attempt)
            } else {
                Write-Status ("접속 시도 #{0}: 5초 안에 Edge 창을 확인하지 못했습니다." -f $Attempt)
            }
            $HoldSeconds = [Math]::Max(0, $OpenSeconds - $OpenTimer.Elapsed.TotalSeconds)
            Start-Sleep -Milliseconds ([int]($HoldSeconds * 1000))
            Write-Status ("접속 시도 #{0}: 창 닫기 시작" -f $Attempt)
            Close-CafeWindow
            Write-Status ("접속 시도 #{0}: 창 닫기 완료" -f $Attempt)
        } catch {
            Write-Status ('오류: ' + $_.Exception.Message)
            Write-Status ('오류 위치: 줄 ' + $_.InvocationInfo.ScriptLineNumber + ' / ' + $_.FullyQualifiedErrorId)
            Write-Status '프로그램을 종료하지 않고 다음 예정 시각에 재시도합니다.'
        }
        $Remaining = [Math]::Max(0, $IntervalSeconds - $Timer.Elapsed.TotalSeconds)
        Write-Status ('다음 접속 예정: ' + (Get-Date).AddSeconds($Remaining).ToString('yyyy-MM-dd HH:mm:ss'))
        while ($Timer.Elapsed.TotalSeconds -lt $IntervalSeconds) {
            $SecondsLeft = [int][Math]::Ceiling($IntervalSeconds - $Timer.Elapsed.TotalSeconds)
            $Minutes = [int][Math]::Floor($SecondsLeft / 60)
            $Seconds = $SecondsLeft % 60
            Write-Host ("`r자동 접속 시도: {0}회 | 다음 접속까지 {1:00}분 {2:00}초 | 중지: Ctrl+C   " -f $Attempt, $Minutes, $Seconds) -NoNewline
            Start-Sleep -Milliseconds 1000
        }
        Write-Host ''
        Write-Status '대기 완료: 다음 접속 시도를 시작합니다.'
    } while ($true)
} catch {
    Write-Status ('프로그램 중단 오류: ' + $_.Exception.Message)
    Write-Status ('오류 위치: 줄 ' + $_.InvocationInfo.ScriptLineNumber + ' / ' + $_.FullyQualifiedErrorId)
    throw
} finally {
    try { Close-CafeWindow } catch { Write-Warning $_.Exception.Message }
    Write-Status '프로그램 종료'
    $Mutex.ReleaseMutex()
    $Mutex.Dispose()
}
