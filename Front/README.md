# Phaser + React + TypeScript 게임 프로젝트

Phaser 3 게임 엔진과 React, TypeScript를 활용한 웹 게임 프로젝트입니다.

## 📋 사전 요구사항

프로젝트를 실행하기 전에 다음 소프트웨어가 설치되어 있어야 합니다:

- **Node.js** (v18 이상 권장)
  - [Node.js 공식 사이트](https://nodejs.org/)에서 다운로드
  - 설치 확인: `node --version`
- **npm** (Node.js와 함께 설치됨)
  - 설치 확인: `npm --version`
- **Git** (저장소 클론용)
  - [Git 공식 사이트](https://git-scm.com/)에서 다운로드

## 🚀 프로젝트 실행 방법

### 1. 저장소 클론

```bash
git clone <저장소-URL>
cd main-game/Front
```

### 2. 의존성 설치

프로젝트 루트 디렉토리(`Front` 폴더)에서 다음 명령어를 실행하세요:

```bash
npm install
```

이 명령어는 다음을 설치합니다:
- React 19.2
- Phaser 3.90
- TypeScript 5.9
- Vite 개발 서버
- 기타 필요한 개발 도구

### 3. 개발 서버 실행

```bash
npm run dev
```

서버가 실행되면 터미널에 다음과 같은 메시지가 표시됩니다:

```
VITE v7.3.1  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 4. 브라우저에서 확인

브라우저를 열고 `http://localhost:5173/`로 접속하세요.

## 📦 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm install` | 프로젝트 의존성 설치 |
| `npm run dev` | 개발 서버 실행 (포트 5173) |
| `npm run build` | 프로덕션 빌드 생성 |
| `npm run preview` | 빌드된 앱 미리보기 |
| `npm run lint` | ESLint로 코드 검사 |

## 🏗️ 프로젝트 구조

```
Front/
├── src/
│   ├── game/               # Phaser 게임 관련 파일
│   │   ├── PhaserGame.tsx  # Phaser를 React로 래핑한 컴포넌트
│   │   └── scenes/         # Phaser 씬 파일들
│   │       └── MainScene.ts
│   ├── App.tsx             # React 메인 컴포넌트
│   ├── App.css             # 스타일
│   └── main.tsx            # 앱 진입점
├── public/                 # 정적 파일 (이미지, 사운드 등)
├── package.json            # 프로젝트 설정 및 의존성
└── tsconfig.json           # TypeScript 설정
```

## 🛠️ 기술 스택

- **React 19.2** - UI 컴포넌트 및 상태 관리
- **TypeScript 5.9** - 타입 안정성
- **Phaser 3.90** - 2D 게임 엔진 (Canvas 렌더링)
- **Vite** - 빌드 도구 및 개발 서버

## 🔧 문제 해결

### 포트가 이미 사용 중인 경우

다른 애플리케이션이 5173 포트를 사용 중이면 다음과 같이 다른 포트로 실행할 수 있습니다:

```bash
npm run dev -- --port 3000
```

### 의존성 설치 오류

`package-lock.json`과 `node_modules`를 삭제 후 재설치:

```bash
# Windows PowerShell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install

# macOS/Linux
rm -rf node_modules package-lock.json
npm install
```

### 캐시 문제

브라우저 캐시를 지우거나 시크릿 모드로 접속해보세요.

## 📝 개발 시작하기

1. **새로운 씬 추가**: `src/game/scenes/` 폴더에 새 씬 파일 생성
2. **게임 에셋 추가**: `public/assets/` 폴더에 이미지, 사운드 등 추가
3. **React 컴포넌트**: `src/` 폴더에서 UI 컴포넌트 관리
4. **서버 통신**: TypeScript로 API 클라이언트 작성

## 👥 협업 가이드

1. 작업 시작 전 항상 최신 코드를 pull
2. 기능별로 브랜치 생성
3. 커밋 전 `npm run lint`로 코드 검사
4. Pull Request로 코드 리뷰 후 병합

## 📞 도움이 필요하면

- 프로젝트 이슈 등록
- 팀원에게 문의
