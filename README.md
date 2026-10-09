# Quad Live

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

YouTube는 공식 임베드 주소를 사용합니다. SOOP와 치지직은 실험적인 임베드 연결이며 현재 클라우드의 네트워크 정책 때문에 실제 재생을 검증하지 못했습니다. 플랫폼의 외부 재생 정책, 로그인/성인 인증, 지역 제한, 방송 종료 또는 방송자의 임베드 차단으로 재생이 안 될 수 있습니다. 원본 열기로 방송 사이트에 접근할 수 있습니다. 이 기능은 네 방송이 앱 안에서 반드시 동시 재생된다는 보장이 아닙니다. 플랫폼 제한을 우회하거나 방송 영상을 중계하지 않습니다.
