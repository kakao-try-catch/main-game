# FlappyBird 공통 수정 사항

> A안, B안 모두에서 필요한 공통 수정 사항

---

## 1. 새 초기 위치 Desync 수정

### 문제
서버와 클라이언트의 `calculateBirdPositions()` 함수가 다른 값 반환

| 항목 | 서버 | 클라이언트 (현재) | 클라이언트 (수정) |
|------|------|------------------|------------------|
| startX | 250 | 200 | **250** |
| spacing | 90 | 120 | **90** |
| startY | 300 + i*3 | 300 | **300 + i*3** |

### 수정 파일
`packages/client/src/game/scene/flappybirds/FlappyBirdsScene.ts`

### 수정 내용
```typescript
private calculateBirdPositions(count: number): { x: number; y: number }[] {
  const centerX = 300;
  const centerY = 350;
  const spacing = 80;

  // 기본: 수평 일렬 배치 - 서버와 동일하게 수정
  if (!this.gameConfig.connectAll || count < 3) {
    const startX = 250;  // 200 → 250
    const startY = 300;
    return Array.from({ length: count }, (_, i) => ({
      x: startX + i * 90,  // 120 → 90
      y: startY + i * 3,   // 계단식 추가
    }));
  }

  // connectAll=true (3인 이상) - 기존 코드 유지
  // ...
}
```

---

## 2. 서버-클라이언트 게임 설정 동기화

### 문제
클라이언트가 `DEFAULT_FLAPPYBIRD_PRESET`만 사용하고, 서버에서 전송한 설정을 무시

### 수정 파일
`packages/client/src/game/scene/flappybirds/FlappyBirdsScene.ts`

### 수정 내용
```typescript
// create() 메서드 내, 실제 서버 모드 분기에서
import { GameType } from '../../../../../common/src/config';

// ...

} else {
  // 실제 서버 모드

  // 서버 설정 적용 (추가)
  const store = useGameStore.getState();
  if (store.gameConfig && store.selectedGameType === GameType.FLAPPY_BIRD) {
    this.gameConfig = resolveFlappyBirdPreset(
      store.gameConfig as FlappyBirdGamePreset
    );
    console.log('[FlappyBirdsScene] 서버 설정 적용:', this.gameConfig);
  }

  this.setupStoreSubscription();
  // ... 기존 코드
}
```

---

## 3. 리플레이 시 상태 초기화

### 문제
게임 재시작 시 이전 상태가 남아있을 수 있음

### 수정 파일
`packages/client/src/game/scene/flappybirds/FlappyBirdsScene.ts`

### 수정 내용
```typescript
create() {
  console.log('[FlappyBirdsScene] create 메서드 시작');

  // 이전 게임 상태 강제 초기화 (추가)
  useGameStore.getState().resetFlappyState();

  // ... 기존 코드
}
```

---

## 4. Mock 모드 코드 정리 (향후)

Mock 모드는 제거 대상이므로, 수정 완료 후:
- `MockServerCore.ts` 관련 코드 제거
- `isMockMode()` 분기 제거
- `MockSocket` 관련 코드 제거

---

## 검증 방법 (공통)

1. **초기 위치 테스트**
   - 게임 시작 시 새들이 "튀어나가지" 않는지 확인
   - 서버 콘솔과 클라이언트 콘솔에서 초기 위치 로그 비교

2. **설정 동기화 테스트**
   - 로비에서 설정 변경 (예: pipeSpeed → slow)
   - 게임 시작 후 클라이언트 콘솔에서 설정 적용 로그 확인

3. **리플레이 테스트**
   - 게임 오버 → 리플레이 → 상태가 정상 초기화되는지 확인
