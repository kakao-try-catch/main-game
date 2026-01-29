# Main Game 개발 가이드라인

팀 프로젝트의 개발 환경 설정과 코드 작성 규칙을 안내합니다. (\*임시임)

---

## 📋 목차

1. [프로젝트 구조](#프로젝트-구조)
2. [초기 설정](#초기-설정)
3. [개발 환경 실행](#개발-환경-실행)
4. [폴더별 역할](#폴더별-역할)
5. [코드 작성 규칙](#코드-작성-규칙)
6. [Git 워크플로우](#git-워크플로우)
7. [자주 묻는 질문](#자주-묻는-질문)

---

## 프로젝트 구조

```
main-game/
├── packages/
│   ├── client/              # React + Vite + Phaser 게임
│   ├── server/              # Node.js 백엔드
│   └── common/              # 공유 타입 및 유틸리티
├── Dockerfile               # 도커 설정
├── package.json             # 루트 패키지 (workspace)
└── README.md
```

### Client 구조

```
packages/client/src/
├── assets/                  # 이미지, 오디오 등 정적 리소스
├── components/              # React 컴포넌트 (UI, 로비, 채팅 등)
├── game/
│   ├── GameContainer.tsx    # Phaser 인스턴스 관리
│   ├── scene/               # Phaser Scene 파일들
│   │   ├── AppleGameScene.ts
│   │   ├── FlappyBirdsScene.ts (예정)
│   │   └── MineSweeperScene.ts (예정)
│   └── utils/               # 게임 유틸리티 (좌표 계산, 물리 등)
├── App.css
├── App.tsx                  # 메인 React 컴포넌트
└── main.tsx                 # 진입점
```

---

## 초기 설정

### 1. 저장소 클론

```bash
git clone https://github.com/YOUR_ORG/main-game.git
cd main-game
```

### 2. 의존성 설치

모노레포 구조이므로 루트에서 한 번에 설치합니다:

```bash
npm install
```

### 3. 환경 변수 설정

필요한 경우 `.env.local` 파일을 생성합니다:

```bash
# packages/client/.env.local
VITE_API_URL=http://localhost:3000
```

---

## 개발 환경 실행

### 전체 개발 서버 실행

```bash
npm run dev
```

- **Client**: http://localhost:5173
- **Server**: http://localhost:3000

### 개별 패키지 실행

```bash
# Client만 실행
npm run dev -w @main-game/client

# Server만 실행
npm run dev -w @main-game/server
```

### 빌드

```bash
# 전체 빌드
npm run build

# Client만 빌드
npm run build -w @main-game/client

# Server만 빌드
npm run build -w @main-game/server
```

### TypeScript 타입 체크

```bash
npm run type-check
```

### Linting & 포맷팅

```bash
# ESLint 실행
npm run lint

# Prettier로 포맷팅
npm run format         # 전체 프로젝트 포맷팅
npm run format:check   # 포맷팅 확인 (CI용)
```

---

## 코드 포맷팅

이 프로젝트는 **Prettier**를 사용하여 일관된 코드 스타일을 유지합니다.

### 에디터 설정

1. **VS Code 확장 프로그램 설치**
   - Prettier - Code formatter (`esbenp.prettier-vscode`)
   - ESLint (`dbaeumer.vscode-eslint`)

2. **자동 포맷팅**
   - 저장 시 자동으로 포맷팅됩니다 (`.vscode/settings.json`에 설정됨)
   - 수동 포맷팅: `Shift + Alt + F` (Windows/Linux) 또는 `Shift + Option + F` (Mac)

### Prettier 설정 (`.prettierrc`)

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "bracketSameLine": false
}
```

### 명령어

```bash
# 전체 프로젝트 포맷팅
pnpm format

# 포맷팅 확인 (수정하지 않음)
pnpm format:check

# 특정 파일만 포맷팅
pnpm prettier --write "path/to/file.ts"
```

---

## 폴더별 역할

### `/packages/client`

**React + Vite 기반 클라이언트**

- `components/`: UI 컴포넌트 (로비, 채팅, 결과창 등)
- `game/GameContainer.tsx`: Phaser 게임 인스턴스 생성 및 관리
- `game/scene/`: 각 게임의 Scene 파일
- `game/utils/`: 좌표 계산, 물리 공식, 게임 로직 유틸리티
- `assets/`: 이미지, 오디오 파일 저장

**TypeScript 설정:**

- `tsconfig.json`: 기본 설정
- `tsconfig.app.json`: 앱 컴파일 옵션
- `tsconfig.node.json`: 빌드 도구 설정

### `/packages/server`

**Node.js 백엔드**

- 게임 로직 처리
- 다중 플레이 동기화
- WebSocket 통신 (예정)

### `/packages/common`

**공유 코드**

- 타입 정의
- 공통 유틸리티
- 클라이언트와 서버에서 모두 사용

**import 방법:**

```typescript
// packages/client/src/components/MyComponent.tsx
import { SharedType } from '@main-game/common';
```

---

## 코드 작성 규칙

### TypeScript

- ✅ **항상 타입을 명시**합니다
- ✅ **`any` 타입 사용 금지** (특수한 경우 `unknown` 사용)
- ✅ **Interface 우선**, 복잡한 경우에만 Type 사용

```typescript
// ✅ Good
interface GameState {
  score: number;
  gameOver: boolean;
}

// ❌ Bad
const gameState: any = {};
```

### React 컴포넌트

- ✅ **함수형 컴포넌트** 사용
- ✅ **Props에 명시적 타입** 정의
- ✅ **컴포넌트 분해** (한 파일에 한 컴포넌트)

```typescript
// ✅ Good
interface ButtonProps {
  onClick: () => void;
  text: string;
}

export const Button: React.FC<ButtonProps> = ({ onClick, text }) => {
  return <button onClick={onClick}>{text}</button>;
};

// ❌ Bad (인라인 타입)
export const Button = ({ onClick, text }: any) => (
  <button onClick={onClick}>{text}</button>
);
```

### Phaser Scene

- ✅ **Scene 클래스는 `game/scene/` 폴더에 배치**
- ✅ **명확한 Scene 이름 지정** (예: `AppleGameScene`)
- ✅ **Scene Key와 클래스 이름 일치**

```typescript
// ✅ Good
export class AppleGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AppleGameScene' });
  }

  preload() {
    // 리소스 로드
  }

  create() {
    // 게임 객체 생성
  }

  update() {
    // 게임 로직 업데이트
  }
}
```

### 명명 규칙

| 대상       | 규칙                       | 예시                                     |
| ---------- | -------------------------- | ---------------------------------------- |
| 파일명     | PascalCase (.tsx, .ts)     | `AppleGameScene.ts`, `GameContainer.tsx` |
| 폴더명     | lowercase                  | `game`, `scene`, `components`, `utils`   |
| 변수명     | camelCase                  | `playerScore`, `gameConfig`              |
| 상수명     | UPPER_SNAKE_CASE           | `MAX_PLAYERS`, `GAME_WIDTH`              |
| 인터페이스 | PascalCase (I 접두사 생략) | `GameState`, `PlayerProps`               |
| CSS 클래스 | kebab-case                 | `game-container`, `player-score`         |

### Import 순서

```typescript
// 1. 외부 라이브러리
import { useState } from 'react';
import Phaser from 'phaser';

// 2. 경로 별칭 import
import { SharedType } from '@main-game/common';

// 3. 상대 경로 import
import { AppleGameScene } from './scene/AppleGameScene';

// 4. 스타일
import './App.css';
```

---

## Git 워크플로우

### 브랜치 전략 (Git Flow)

```
main (프로덕션)
  ↑
release/* (릴리스 준비)
  ↑
develop (개발 메인)
  ↑
feature/* (기능 개발)
```

### 기본 흐름

1. **develop 브랜치에서 최신 코드 동기화**

```bash
git checkout develop
git pull origin develop
```

2. **기능 브랜치 생성**

```bash
git checkout -b feature/your-feature-name
```

**브랜치 이름 규칙:**

- `feature/add-apple-game` (새 기능)
- `fix/bug-fix-description` (버그 수정)
- `refactor/code-cleanup` (리팩토링)

3. **코드 작성 및 커밋**

```bash
git add .
git commit -m "feat: add apple game scene"
```

**커밋 메시지 규칙:**

- `feat:` 새 기능
- `fix:` 버그 수정
- `refactor:` 코드 리팩토링
- `docs:` 문서 변경
- `test:` 테스트 추가
- `chore:` 빌드, 의존성 등

4. **Pull Request 생성**

```bash
git push origin feature/your-feature-name
```

GitHub에서 PR을 생성하고 코드 리뷰를 받습니다.

5. **Merge 후 브랜치 삭제**

```bash
git branch -d feature/your-feature-name
```

---

## 자주 묻는 질문

### Q1: "vite/client 형식 정의 파일을 찾을 수 없습니다" 에러가 발생합니다

**A:** 의존성이 설치되지 않았습니다.

```bash
cd packages/client
npm install
```

### Q2: 새로운 Phaser Scene을 어떻게 추가합니다?

**A:** 다음 단계를 따릅니다:

1. `packages/client/src/game/scene/` 폴더에 파일 생성 (예: `FlappyBirdsScene.ts`)
2. Scene 클래스 작성
3. `packages/client/src/game/GameContainer.tsx`에 import 및 등록

```typescript
// GameContainer.tsx에서
import { FlappyBirdsScene } from './scene/FlappyBirdsScene';

// config에 추가
scene: [AppleGameScene, FlappyBirdsScene],
```

### Q3: 공통 타입을 `@main-game/common`에 추가하려면?

**A:**

1. `packages/common/src/index.ts`에 타입 정의
2. export 추가
3. 다른 패키지에서 import

```typescript
// packages/common/src/index.ts
export interface GameConfig {
  width: number;
  height: number;
}
```

### Q4: 로컬에서 전체 개발 환경을 테스트하려면?

**A:**

```bash
# 터미널 1: Client 실행
npm run dev -w @main-game/client

# 터미널 2: Server 실행
npm run dev -w @main-game/server

# 브라우저에서 http://localhost:5173 접속
```

### Q5: Docker로 실행하려면?

**A:**

```bash
# 빌드
docker build -t main-game .

# 실행
docker run -p 5173:5173 -p 3000:3000 main-game

# 컨테이너 멈추기
docker ps           # 실행 중인 컨테이너 확인
docker stop <CONTAINER_ID>
```

---

## 📞 문의 사항

문제가 발생하면:

1. 이 가이드 문서 확인
2. 질문
3. GitHub에 이슈 등록

**Happy Coding! 🚀**
