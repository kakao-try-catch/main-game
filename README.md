# Phaser + React + TypeScript 게임 프로젝트

Phaser 3 게임 엔진과 React, TypeScript를 활용한 웹 게임 프로젝트입니다.
pnpm workspace를 사용한 모노레포 구조로 구성되어 있습니다.

## 📋 사전 요구사항

프로젝트를 실행하기 전에 다음 소프트웨어가 설치되어 있어야 합니다:

- **Node.js** (v18 이상 권장)
  - [Node.js 공식 사이트](https://nodejs.org/)에서 다운로드
  - 설치 확인: `node --version`
- **pnpm** (패키지 매니저)
  - 설치: `npm install -g pnpm`
  - 설치 확인: `pnpm --version`
- **Git** (저장소 클론용)
  - [Git 공식 사이트](https://git-scm.com/)에서 다운로드

## 🚀 프로젝트 실행 방법

### 1. 저장소 클론

```bash
git clone <저장소-URL>
cd main-game
```

### 2. 의존성 설치

프로젝트 루트 디렉토리에서 다음 명령어를 실행하세요:

```bash
pnpm install
```

이 명령어는 다음을 설치합니다:

- React 19.2
- Phaser 3.90
- TypeScript 5.9
- Vite 개발 서버
- Socket.io Client
- 기타 필요한 개발 도구

### 3. 개발 서버 실행

```bash
pnpm dev
```

서버가 실행되면 터미널에 다음과 같은 메시지가 표시됩니다:

```
VITE v7.2.4  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 4. 브라우저에서 확인

브라우저를 열고 `http://localhost:5173/`로 접속하세요.

## 📦 주요 명령어

| 명령어              | 설명                               |
| ------------------- | ---------------------------------- |
| `pnpm install`      | 프로젝트 의존성 설치               |
| `pnpm dev`          | 개발 서버 실행 (포트 5173)         |
| `pnpm build`        | 모노레포 패키지 프로덕션 빌드 생성 |
| `pnpm preview`      | 빌드된 앱 미리보기                 |
| `pnpm lint`         | ESLint로 코드 검사                 |
| `pnpm format`       | Prettier로 코드 포맷팅             |
| `pnpm format:check` | 코드 포맷 검사                     |

## 🏗️ 프로젝트 구조

```
main-game/
├── packages/
│   ├── client/             # 프론트엔드 (React + Phaser)
│   │   ├── src/
│   │   │   ├── game/       # Phaser 게임 관련 파일
│   │   │   │   ├── GameContainer.tsx
│   │   │   │   ├── PhaserGame.tsx
│   │   │   │   └── scene/  # Phaser 씬 파일들
│   │   │   ├── App.tsx     # React 메인 컴포넌트
│   │   │   └── main.tsx    # 앱 진입점
│   │   ├── public/         # 정적 파일 (이미지, 사운드 등)
│   │   └── package.json
│   ├── common/             # 공통 코드 (타입, 유틸리티 등)
│   │   └── package.json
│   └── server/             # 백엔드 서버
│       └── package.json
├── package.json            # 루트 패키지 설정
├── pnpm-workspace.yaml     # pnpm 워크스페이스 설정
└── README.md
```

## 🛠️ 기술 스택

### Frontend (Client)

- **React 19.2** - UI 컴포넌트 및 상태 관리
- **TypeScript 5.9** - 타입 안정성
- **Phaser 3.90** - 2D 게임 엔진 (Canvas 렌더링)
- **Vite 7.2** - 빌드 도구 및 개발 서버
- **Socket.io Client** - 실시간 통신
- **NES.css** - 레트로 스타일 UI

### Shared

- **Zustand** - 상태 관리 라이브러리

### Development Tools

- **pnpm** - 빠르고 효율적인 패키지 매니저
- **Prettier** - 코드 포맷터
- **ESLint** - 코드 린터

## 🔧 문제 해결

### 포트가 이미 사용 중인 경우

다른 애플리케이션이 5173 포트를 사용 중이면 다음과 같이 다른 포트로 실행할 수 있습니다:

```bash
pnpm dev -- --port 3000
```

### 의존성 설치 오류

`pnpm-lock.yaml`과 `node_modules`를 삭제 후 재설치:

```bash
# Windows PowerShell
Remove-Item -Recurse -Force node_modules, pnpm-lock.yaml
pnpm install

# macOS/Linux
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 캐시 문제

브라우저 캐시를 지우거나 시크릿 모드로 접속해보세요.

pnpm 캐시를 지우려면:

```bash
pnpm store prune
```

## 📝 개발 시작하기

1. **새로운 씬 추가**: `packages/client/src/game/scene/` 폴더에 새 씬 파일 생성
2. **게임 에셋 추가**: `packages/client/public/assets/` 폴더에 이미지, 사운드 등 추가
3. **React 컴포넌트**: `packages/client/src/` 폴더에서 UI 컴포넌트 관리
4. **공통 코드**: `packages/common/` 폴더에 타입 정의 및 공통 유틸리티 작성
5. **서버 개발**: `packages/server/` 폴더에서 백엔드 로직 작성

## 👥 협업 가이드

1. 작업 시작 전 항상 최신 코드를 pull
2. 기능별로 브랜치 생성
3. 커밋 전 `pnpm format` 및 `pnpm lint`로 코드 검사
4. Pull Request로 코드 리뷰 후 병합

## 📞 도움이 필요하면

- 프로젝트 이슈 등록
- 팀원에게 문의
