# Backend + Main 브랜치 머지 검증 및 수정 계획

## 개요

`main-game`에 `main-game-backend`(멀티플레이어 동기화 개선)와 `main-game-main`(플래피버드/지뢰찾기 완성)을 병합한 현재 상태를 분석한 결과:

> [!TIP]
> **결론**: 현재 `main-game` 코드는 이미 두 브랜치의 핵심 기능을 대부분 포함하고 있습니다. 다만 몇 가지 검증 및 미세 수정이 필요합니다.

---

## 파일별 분석 결과

### 핵심 동기화 파일 (Backend 기능)

| 파일                                                                                                                         | 상태      | 설명                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------- |
| [gameStore.ts](file:///c:/Users/USER/Documents/GitHub/main-game/packages/client/src/store/gameStore.ts)                      | ✅ 완전   | `dropCellEventQueue`, `gameSessionId`, `serverStartTime` 등 모두 포함                               |
| [clientHandler.ts](file:///c:/Users/USER/Documents/GitHub/main-game/packages/client/src/network/clientHandler.ts)            | ✅ 개선됨 | READY_SCENE에서 `incrementGameSession()` 먼저 호출, RETURN_TO_THE_LOBBY에서 `resetGameState()` 추가 |
| [AppleGameScene.ts](file:///c:/Users/USER/Documents/GitHub/main-game/packages/client/src/game/scene/apple/AppleGameScene.ts) | ✅ 개선됨 | `shutdown()`에서 `gameManager.destroy()` 추가 (backend에 없던 버그 수정)                            |
| [GameContainer.tsx](file:///c:/Users/USER/Documents/GitHub/main-game/packages/client/src/game/GameContainer.tsx)             | ✅ 완전   | `disableVisibilityChange: true` 포함, 지뢰찾기 이벤트 핸들러 통합                                   |

### 게임별 통합 상태

| 게임        | 상태    | 설명                              |
| ----------- | ------- | --------------------------------- |
| Apple Game  | ✅ 완전 | Backend 동기화 개선사항 모두 적용 |
| Flappy Bird | ✅ 완전 | Main 브랜치 + 사운드 핸들러 통합  |
| Minesweeper | ✅ 완전 | Main 브랜치에서 완전 통합         |

---

## 잠재적 문제점 및 수정 필요 사항

### 1. DROP_CELL_INDEX 패킷의 winnerId 타입 불일치

현재 `clientHandler.ts`에서:

```typescript
case GamePacketType.DROP_CELL_INDEX: {
  const { winnerIndex, indices, totalScore } = packet;
  store.addDropCellEvent({
    winnerId: winnerIndex.toString(),  // 숫자를 문자열로 변환
    ...
  });
}
```

Backend 브랜치에서:

```typescript
const { winnerId, indices, totalScore } = packet; // winnerId가 이미 문자열
store.addDropCellEvent({ winnerId, indices, totalScore });
```

> [!IMPORTANT]
> **확인 필요**: 서버에서 보내는 패킷의 필드명이 `winnerId` (문자열)인지 `winnerIndex` (숫자)인지 확인해야 합니다.

---

## 제안 사항

현재 코드 상태는 두 브랜치의 기능이 잘 병합되어 있습니다. 다만 확실히 하기 위해 다음 검증을 권장합니다:

### Verification Plan

> [!CAUTION]
> 자동화된 테스트가 존재하지 않아 수동 테스트가 필요합니다.

#### Manual Verification Steps

**1. 기본 동작 테스트**

1. `pnpm dev --filter client` 및 `pnpm dev --filter server` 실행
2. 브라우저에서 http://localhost:5173 접속
3. 닉네임 입력 후 로비 진입 확인

**2. 사과 게임 동기화 테스트**

1. 두 개의 브라우저 창 열기 (또는 다른 모니터)
2. 두 플레이어로 접속
3. 게임 시작 후:
   - 타이머가 두 창에서 동시에 흐르는지 확인
   - 한 플레이어가 사과 제거 시 다른 창에서도 즉시 반영되는지 확인
   - 게임 종료 시 결과 화면이 두 창에서 동시에 나타나는지 확인

**3. 리플레이/로비 복귀 테스트**

1. 게임 종료 후 "다시하기" 버튼 클릭
2. 두 창 모두 새 게임으로 정상 전환되는지 확인
3. "로비로" 버튼 클릭하여 두 창 모두 로비로 복귀하는지 확인

**4. 비활성 창 동기화 테스트**

1. 두 번째 창을 다른 모니터로 이동
2. 첫 번째 창에만 포커스를 두고 게임 진행
3. 두 번째 창의 타이머와 게임 상태가 정상적으로 동기화되는지 확인

---

## 결론

현재 `main-game`의 코드 상태는 두 브랜치의 핵심 기능을 이미 잘 통합하고 있습니다.

수정이 필요하다면 서버 패킷 형식(`winnerId` vs `winnerIndex`)을 확인한 후 `clientHandler.ts`의 해당 부분을 조정하면 됩니다.

**추가 조치가 필요한지 수동 테스트로 확인해 주세요.**
