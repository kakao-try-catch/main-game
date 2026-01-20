# 🎵 사운드 관리 가이드

이 문서는 게임의 BGM과 SFX를 관리하는 방법을 설명합니다.

## 📁 파일 구조

```
src/
├── config/
│   └── soundConfig.ts        # 모든 사운드 설정이 여기에!
├── contexts/
│   ├── BGMContext.tsx         # BGM 재생 로직
│   └── SFXContext.tsx         # SFX 재생 로직
└── assets/
    └── sounds/
        ├── testapplebgm.mp3   # 사과게임 BGM
        └── SFX/
            ├── appleDrop.mp3
            ├── gameStart.mp3
            └── ...
```

## 🎼 BGM 추가하기

### 1단계: 사운드 파일 준비

```
assets/sounds/lobbyBGM.mp3  # 파일을 여기에 추가
```

### 2단계: soundConfig.ts에서 import

```typescript
// soundConfig.ts 상단에 추가
import lobbyBGM from '../assets/sounds/lobbyBGM.mp3';
```

### 3단계: BGM_CONFIG에 등록

```typescript
export const BGM_CONFIG: Record<BGMName, SoundConfig> = {
  lobby: {
    file: lobbyBGM, // ← import한 파일
    volume: 0.6, // ← 기본 볼륨 (0.0 ~ 1.0)
  },
  // ... 다른 BGM들
};
```

### 4단계: 사용하기

```typescript
import { useBGMContext } from './contexts/BGMContext';

function MyComponent() {
  const { loadBGM, play } = useBGMContext();

  const handleEnterLobby = () => {
    loadBGM('lobby'); // ← BGM 로드
    play(); // ← 재생
  };
}
```

## 🔊 SFX 추가하기

### 1단계: 사운드 파일 준비

```
assets/sounds/SFX/flappyJump.mp3  # 파일을 여기에 추가
```

### 2단계: soundConfig.ts에서 import

```typescript
// soundConfig.ts 상단에 추가
import flappyJumpSound from '../assets/sounds/SFX/flappyJump.mp3';
```

### 3단계: SFXName 타입에 추가

```typescript
export type SFXName = 'buttonClick' | 'appleDrop' | 'flappyJump'; // ← 새로 추가
```

### 4단계: SFX_CONFIG에 등록

```typescript
export const SFX_CONFIG: Record<SFXName, SoundConfig> = {
  flappyJump: {
    file: flappyJumpSound,
    volume: 0.7, // ← 기본 볼륨
    startTime: 0, // ← 재생 시작 시점 (초)
  },
  // ... 다른 SFX들
};
```

### 5단계: 사용하기

```typescript
import { useSFXContext } from './contexts/SFXContext';

function FlappyBird() {
  const { playSFX } = useSFXContext();

  const handleJump = () => {
    playSFX('flappyJump'); // ← 효과음 재생
  };
}
```

## 🎮 게임별 사운드 구성 예시

### 사과 게임

```typescript
// BGM
loadBGM('appleGame');
play();

// SFX
playSFX('appleDrop'); // 사과 떨어질 때
playSFX('appleGameStart'); // 게임 시작
playSFX('appleGameEnd'); // 게임 종료
```

### 플래피버드 (추후 추가 예정)

```typescript
// BGM
loadBGM('flappyBird');
play();

// SFX
playSFX('flappyJump'); // 점프
playSFX('flappyHit'); // 충돌
```

### 지뢰찾기 (추후 추가 예정)

```typescript
// BGM
loadBGM('minesweeper');
play();

// SFX
playSFX('mineClick'); // 클릭
playSFX('mineExplode'); // 폭발
```

## 🛠️ 고급 기능

### 볼륨 조절

```typescript
const { setVolume } = useBGMContext();
setVolume(0.5); // 0.0 ~ 1.0
```

### 특정 시점부터 재생

```typescript
playSFX('buttonClick', true, 0.2); // 0.2초부터 재생
```

### 중복 재생 방지

```typescript
playSFX('soundName', false); // 이미 재생 중이면 무시
```

## 📋 현재 등록된 사운드

### BGM

- ✅ `lobby` - 로비 BGM (임시: 사과게임 BGM 사용)
- ✅ `appleGame` - 사과게임 BGM
- ⏳ `flappyBird` - 플래피버드 BGM (추후 추가)
- ⏳ `minesweeper` - 지뢰찾기 BGM (추후 추가)

### SFX

#### 공통 UI

- ✅ `buttonClick` - 버튼 클릭
- ✅ `buttonHover` - 버튼 호버

#### 사과 게임

- ✅ `appleDrop` - 사과 떨어짐
- ✅ `appleGameStart` - 게임 시작
- ✅ `appleGameEnd` - 게임 종료

#### 플래피버드 (추후 추가)

- ⏳ `flappyJump` - 점프
- ⏳ `flappyHit` - 충돌

#### 지뢰찾기 (추후 추가)

- ⏳ `mineClick` - 클릭
- ⏳ `mineExplode` - 폭발

## 💡 팁

1. **파일 크기**: 사운드 파일은 가능한 작게 (< 1MB)
2. **포맷**: MP3 권장 (호환성 좋음)
3. **볼륨 설정**:
   - BGM: 0.6 ~ 1.0
   - SFX: 0.7 ~ 1.0
   - UI 효과음: 1.0
4. **네이밍**: 명확하고 일관된 이름 사용
   - BGM: `{게임이름}BGM`
   - SFX: `{게임이름}{동작}`

## 🐛 문제 해결

### 소리가 안 나요!

1. 볼륨이 0인지 확인
2. 브라우저 자동재생 정책 확인 (사용자 인터랙션 후 재생)
3. 파일 경로가 올바른지 확인

### 소리가 끊겨요!

1. `allowOverlap` 옵션 확인
2. 파일 크기 확인 (너무 크면 로딩 느림)

### 소리가 너무 크거나 작아요!

1. soundConfig.ts에서 `volume` 값 조정
2. 사용자 볼륨 설정 확인 (SoundSetting 컴포넌트)
