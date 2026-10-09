# Quad Live

## Windows PC 앱

PC 버전은 iframe 대신 Electron의 독립된 WebContentsView 네 개로 원본 방송 사이트를 엽니다. 치지직의 외부 iframe 제한에 의존하지 않는 구조입니다. 방송별 음소거, 새로고침, 확대/복원, 전체 화면, 조합 저장/불러오기를 지원합니다. 로그인 상태는 앱 전용 로컬 프로필에 보관되며, 일반 Edge/Chrome의 로그인과 별개입니다.

GitHub **Actions → Build Windows Desktop App → 최신 성공 실행 → Artifacts → Quad-Live-Windows**에서 ZIP을 다운로드하고 압축을 푼 뒤 `Quad-Live-0.2.0-Windows.exe`를 실행하세요. GitHub 로그인이 필요할 수 있습니다. 실행 파일은 코드 서명되지 않았으며 Windows가 게시자를 확인할 수 없다는 안내를 표시할 수 있습니다. Windows 10/11 64비트를 대상으로 합니다. 빌드 성공 전에는 실행 파일이 제공되지 않습니다.

소스에서 실행하려면 Node.js 22.12 이상이 필요합니다.

```sh
npm ci
npm run desktop:install
npm run desktop
```

Windows에서 `npm run desktop:build`로 portable EXE를 만들 수 있습니다. `npm run desktop:smoke`는 실제 창과 네 개의 독립 뷰, IPC, 음소거, 확대, 저장/복원, 닫기를 로컬 테스트 페이지로 검증합니다. 실제 방송 재생 테스트는 아닙니다.

SOOP 로컬 네트워크 권한 요청은 사용자 확인 후에만 허용합니다. 브라우저 알림·카메라·마이크 권한은 기본적으로 거절합니다. 원격 방송 페이지는 Node.js를 사용할 수 없으며 sandbox/context isolation을 사용합니다. 로그인 창은 별도 보안 브라우저 창으로 열립니다. 플랫폼별 로그인 제한, 인증, DRM 또는 SOOP 고화질 프로그램 설치 요구는 별도로 남을 수 있으며, 실제 Windows 방송 재생은 확인이 필요합니다.

## 웹 화면 배치

PC 일반 화면은 소개 영역을 숨기고 브라우저 높이에 맞춰 네 칸을 배치합니다. 전체 화면에서는 하단 안내도 숨기고 2×2 방송 영역을 확장합니다. 원본 영상 비율 때문에 플레이어 내부에 생기는 검은 여백은 그대로 유지합니다.

## GitHub Pages 배포

저장소 Settings → Pages → Build and deployment → Source에서 **GitHub Actions**를 선택하세요. Actions 탭에서 **Deploy Quad Live to GitHub Pages** 워크플로를 실행하거나 실패한 실행을 다시 실행하면 됩니다. 이후 main에 푸시할 때마다 테스트 후 public 폴더가 자동 배포됩니다. 배포 완료 주소는 https://freedomo-o.github.io/cargo-transport/ 입니다. Actions의 성공 여부를 확인하기 전에는 배포 완료로 간주하지 마세요.

이 배포는 정적 파일만 사용하므로 서버나 Node.js를 사용자 PC에 설치할 필요가 없습니다.

PC에서 방송 URL 네 개를 2×2로 모아 보는 한국어 웹앱입니다. Node.js 20 이상만 필요하며 외부 npm 의존성은 없습니다.

```sh
cd /workspace/cargo-transport
npm start
```

PC에서 실행한다면 브라우저로 `http://localhost:3000`을 여세요. 포트는 `PORT` 환경 변수로 변경할 수 있습니다. `npm test`로 URL 처리 테스트를 실행합니다.

각 칸에 YouTube 영상/live URL, SOOP 방송 URL 또는 치지직 live URL을 입력하세요. 조합 저장/불러오기는 브라우저 localStorage를 이용합니다. 확대/복원과 전체 화면을 지원합니다. 음량, 음소거, 화질은 각 방송 플레이어 자체의 컨트롤을 사용합니다. YouTube는 자동 재생 정책에 맞춰 음소거로 시작하며, 브라우저에 따라 재생 버튼을 눌러야 합니다.

YouTube는 공식 임베드 주소를 사용합니다. SOOP는 현재 `play.sooplive.com` 주소와 direct 플레이어를 사용하며, `PonReady` 메시지에 `Pload`로 응답해 방송을 시작합니다. 이전 SOOP·아프리카TV 주소도 현재 주소로 변환합니다. 치지직은 실제 `/live/채널ID` 경로로 연결합니다. 존재하지 않는 `/embed/live/…` 경로를 사용하지 않습니다.

치지직은 CSP frame-ancestors 정책으로 외부 사이트의 iframe 재생을 제한할 수 있습니다. 올바른 채널 주소라도 GitHub Pages 안에서 재생이 보장되지 않습니다. 이 앱은 보안 헤더를 우회하지 않습니다. SOOP 연결 방식은 [Mul.Live의 공개 구현](https://github.com/jebibot/mullive)을 참고해 확인했으며, 이 클라우드의 네트워크 정책 때문에 실제 SOOP·치지직 재생은 검증하지 못했습니다.

재생이 제한되면 각 칸의 **시청 창** 버튼으로 원본 사이트를 별도 창에 여세요. 각 칸 번호에 따라 화면의 2×2 위치와 크기를 요청합니다. 브라우저가 팝업을 차단하거나 위치를 조절할 수 있으므로 팝업 허용 또는 수동 창 배치가 필요할 수 있습니다. 로그인/성인 인증, 지역 제한, 방송 종료 또는 방송자의 임베드 차단도 재생에 영향을 줍니다. 원본 열기는 새 탭으로 방송 사이트를 엽니다. 네 방송이 앱 안에서 반드시 동시 재생된다는 보장은 없습니다.
