# 사과 게임 Config 서버 동기화 - 구현 계획

## 요약

> ✅ **서버 코드 분석 결과**: 대부분의 기능이 **이미 구현됨**
> ⚠️ **발견된 문제**: `mapSize` 그리드 크기 **서버-클라이언트 불일치**

---

## 현재 상태

### ✅ 이미 구현된 기능 (서버)

| 기능             | 파일             | 라인    |
| ---------------- | ---------------- | ------- |
| 사과 배열 생성   | `gameSession.ts` | 193-204 |
| SET_FIELD 전송   | `gameSession.ts` | 155-159 |
| SET_TIME 전송    | `gameSession.ts` | 169-173 |
| 합 10 검증       | `gameSession.ts` | 369-370 |
| 중복 점유 방지   | `gameSession.ts` | 361-366 |
| 점수 계산        | `gameSession.ts` | 376-377 |
| 게임 종료        | `gameSession.ts` | 249-270 |
| Config 검증/저장 | `gameSession.ts` | 272-356 |

### ✅ 이미 구현된 기능 (클라이언트)

| 기능               | 파일                  | 라인    |
| ------------------ | --------------------- | ------- |
| SET_FIELD 수신     | `clientHandler.ts`    | 90-96   |
| 로비 Config 동기화 | `Lobby.tsx`           | 222-261 |
| 사과밭 렌더링      | `AppleGameManager.ts` | 170-214 |

---

## 🔴 수정 필요: mapSize 그리드 불일치

### 문제

| mapSize | 서버          | 클라이언트    |
| ------- | ------------- | ------------- |
| SMALL   | 11×6 = 66개   | 16×8 = 128개  |
| MEDIUM  | 17×10 = 170개 | 20×10 = 200개 |
| LARGE   | 25×14 = 350개 | 30×15 = 450개 |

### 수정 위치

**서버**: `packages/server/src/applegame/gameSession.ts` 라인 213-222

```diff
switch (mapSize) {
  case MapSize.SMALL:
-   gridCols = 11;
-   gridRows = 6;
+   gridCols = 16;
+   gridRows = 8;
    break;
+ case MapSize.MEDIUM:
+   gridCols = 20;
+   gridRows = 10;
+   break;
  case MapSize.LARGE:
-   gridCols = 25;
-   gridRows = 14;
+   gridCols = 30;
+   gridRows = 15;
    break;
}
```

---

## 🟡 권장 수정: UPDATE_SCORE 전송

### 문제

점수 변경 시 `DROP_CELL_INDEX`만 전송하고 `UPDATE_SCORE`는 미전송

### 수정 위치

**서버**: `gameSession.ts` 라인 394 다음에 추가

```typescript
this.broadcastCallback(dropCellIndexPacket);
this.broadcastScoreboard(); // 추가
```

---

## 📝 프로토콜 문서 수정 사항

### DROP_CELL_INDEX 패킷

**수정됨**: `spec/apple-game-protocol.md`

- ❌ 제거: `addedScore` 필드 (실제 코드에 없음)
- ✅ 유지: `totalScore` 필드만 사용
- 📝 참고: 획득 점수는 `indices.length`로 계산

---

## 패킷 흐름 (참고)

```
[로비]
방장 설정 변경 → GAME_CONFIG_UPDATE_REQ → 서버 저장 → GAME_CONFIG_UPDATE 브로드캐스트

[게임 시작]
GAME_START_REQ → startGame()
  → generateField() → SET_FIELD
  → SET_TIME
  → READY_SCENE

[게임 진행]
CONFIRM_DRAG_AREA → handleDragConfirm()
  → 합 10 검증 → DROP_CELL_INDEX + UPDATE_SCORE

[게임 종료]
타이머 만료 → finishGame() → TIME_END
```

---

## 체크리스트

### 백엔드

- [ ] mapSize 그리드 크기 수정 (`gameSession.ts:213-222`)
- [ ] UPDATE_SCORE 전송 추가 (선택)
- [ ] 테스트

### 프론트엔드

- [ ] 수정 필요 없음 (이미 완료)

---

## 관련 문서

- [docs/backend-guide.md](../docs/backend-guide.md) - 상세 백엔드 가이드
- [spec/apple-game-protocol.md](../spec/apple-game-protocol.md) - 패킷 스펙
- [spec/room-protocol.md](../spec/room-protocol.md) - 방 프로토콜 스펙
