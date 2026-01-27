# 백엔드 가이드 - 사과 게임 Config 동기화

> **⚠️ 중요**: 서버 코드 분석 결과, **대부분의 기능이 이미 구현되어 있습니다!**
> 이 문서는 현재 상태와 수정이 필요한 부분만 명시합니다.

---

## 📋 요약: 현재 상태

| 기능                      | 상태                   | 위치                     |
| ------------------------- | ---------------------- | ------------------------ |
| 사과 배열 생성            | ✅ 구현됨              | `gameSession.ts:193-204` |
| SET_FIELD 전송            | ✅ 구현됨              | `gameSession.ts:155-159` |
| SET_TIME 전송             | ✅ 구현됨              | `gameSession.ts:169-173` |
| CONFIRM_DRAG_AREA 처리    | ✅ 구현됨              | `gameSession.ts:358-397` |
| 합 10 검증                | ✅ 구현됨              | `gameSession.ts:369-370` |
| 점수 계산                 | ✅ 구현됨              | `gameSession.ts:376-377` |
| 타이머 및 게임 종료       | ✅ 구현됨              | `gameSession.ts:238-270` |
| **mapSize → 그리드 변환** | ⚠️ **불일치**          | 아래 참고                |
| UPDATE_SCORE 전송         | ⚠️ 점수 변경 시 미전송 | 아래 참고                |

---

## 🔴 필수 수정: mapSize 그리드 크기 불일치

### 문제점

서버와 클라이언트가 서로 다른 그리드 크기를 사용합니다:

| mapSize | 서버 (gameSession.ts:213-222) | 클라이언트 (AppleGamePreset.ts:58-73) |
| ------- | ----------------------------- | ------------------------------------- |
| SMALL   | 11×6 = 66개                   | 16×8 = 128개                          |
| MEDIUM  | 17×10 = 170개 (기본값)        | 20×10 = 200개                         |
| LARGE   | 25×14 = 350개                 | 30×15 = 450개                         |

### 해결 방법

**서버 코드 수정** (`packages/server/src/applegame/gameSession.ts:213-222`):

```typescript
// 현재 코드 (문제)
switch (mapSize) {
  case MapSize.SMALL:
    gridCols = 11;
    gridRows = 6;
    break;
  case MapSize.LARGE:
    gridCols = 25;
    gridRows = 14;
    break;
}

// 수정 후 (클라이언트와 일치)
switch (mapSize) {
  case MapSize.SMALL:
    gridCols = 16;
    gridRows = 8;
    break;
  case MapSize.MEDIUM:
    gridCols = 20;
    gridRows = 10;
    break;
  case MapSize.LARGE:
    gridCols = 30;
    gridRows = 15;
    break;
}
```

**정확한 위치**: `packages/server/src/applegame/gameSession.ts` 라인 213-222

---

## 🟡 권장 수정: UPDATE_SCORE 전송

### 문제점

현재 `handleDragConfirm()`에서 점수가 변경되면 `DROP_CELL_INDEX`만 전송하고 `UPDATE_SCORE`는 전송하지 않습니다.

### 현재 코드

**파일**: `gameSession.ts:388-394`

```typescript
// Broadcast Success
const dropCellIndexPacket: DropCellIndexPacket = {
  type: GamePacketType.DROP_CELL_INDEX,
  winnerId: playerId,
  indices: indices,
  totalScore: player.reportCard.score,
};
this.broadcastCallback(dropCellIndexPacket);
// UPDATE_SCORE 없음!
```

### 수정 방법

`handleDragConfirm()` 함수 끝에 `broadcastScoreboard()` 호출 추가:

**파일**: `gameSession.ts:394` 다음에 추가

```typescript
this.broadcastCallback(dropCellIndexPacket);

// 점수판 업데이트 브로드캐스트
this.broadcastScoreboard();
```

---

## 📁 파일 구조

### 서버 코드

```
packages/server/src/
├── index.ts                    # 서버 진입점
└── applegame/
    ├── serverHandler.ts        # 패킷 라우팅 (L52-175)
    ├── gameSession.ts          # 게임 로직 핵심 ⭐
    └── room.ts                 # 미사용 (미완성)
```

### 공통 코드

```
packages/common/src/
├── config.ts                   # AppleGameConfig, MapSize 정의
└── packets.ts                  # 패킷 타입 정의
```

### 프로토콜 스펙

```
spec/
├── room-protocol.md            # 방 관련 패킷
└── apple-game-protocol.md      # 게임 패킷 상세 ⭐
```

---

## 🔍 주요 코드 위치 참조

### 서버 (`gameSession.ts`)

| 함수/영역                 | 라인    | 설명                                 |
| ------------------------- | ------- | ------------------------------------ |
| `generateField()`         | 193-204 | 사과 배열 생성                       |
| `getAppliedAppleConfig()` | 206-236 | Config 변환 (⚠️ mapSize 불일치 여기) |
| `startGame()`             | 140-183 | 게임 시작 (SET_FIELD, SET_TIME 전송) |
| `handleDragConfirm()`     | 358-397 | 드래그 확인 처리 (합 검증, 점수)     |
| `finishGame()`            | 249-270 | 게임 종료 (TIME_END 전송)            |
| `updateGameConfig()`      | 272-356 | Config 업데이트 (sanitize 포함)      |

### 서버 (`serverHandler.ts`)

| 함수/영역                     | 라인    | 설명                                 |
| ----------------------------- | ------- | ------------------------------------ |
| `handleClientPacket()`        | 52-175  | 패킷 라우팅                          |
| `GAME_START_REQ` 처리         | 74-97   | 방장 확인 후 startGame() 호출        |
| `CONFIRM_DRAG_AREA` 처리      | 155-157 | handleDragConfirm() 호출             |
| `GAME_CONFIG_UPDATE_REQ` 처리 | 159-168 | 방장 확인 후 updateGameConfig() 호출 |

### 클라이언트 (참고용)

| 파일                  | 라인    | 설명                                 |
| --------------------- | ------- | ------------------------------------ |
| `AppleGamePreset.ts`  | 58-73   | 그리드 크기 정의 (S/M/L)             |
| `Lobby.tsx`           | 130-132 | generation 인코딩 (0=쉬움, 1=어려움) |
| `clientHandler.ts`    | 90-96   | SET_FIELD 처리                       |
| `AppleGameManager.ts` | 362     | 합 10 검증                           |

---

## ✅ 이미 구현된 기능 상세

### 1. 사과 배열 생성 (`generateField`)

**파일**: `gameSession.ts:193-204`

```typescript
private generateField(cfg?: AppleGameRenderConfig) {
  const used = cfg ?? this.getAppliedAppleConfig();
  const count = used.gridCols * used.gridRows;
  const minNumber = used.includeZero ? 0 : used.minNumber;
  this.apples = Array.from(
    { length: count },
    () =>
      Math.floor(Math.random() * (used.maxNumber - minNumber + 1)) +
      minNumber,
  );
}
```

**동작**:

- `mapSize` → `gridCols × gridRows` 계산
- `generation` → `maxNumber` 결정 (0=9, 1=5)
- `zero` → `minNumber` 결정 (true=0, false=1)

### 2. 합 10 검증 (`handleDragConfirm`)

**파일**: `gameSession.ts:369-370`

```typescript
const sum = indices.reduce((acc, idx) => acc + (this.apples[idx] || 0), 0);
if (sum === 10) {
  // 점수 처리...
}
```

**동작**:

- 클라이언트가 보낸 인덱스들의 합 계산
- 10이 아니면 무시 (치팅 방지)

### 3. 중복 점유 방지

**파일**: `gameSession.ts:361-366`

```typescript
const alreadyTaken = indices.some((idx) => this.removedIndices.has(idx));
if (alreadyTaken) {
  return; // 이미 제거된 사과 포함 시 무시
}
```

### 4. 점수 계산

**파일**: `gameSession.ts:376-377`

```typescript
const addedScore = indices.length; // 사과 개수 = 점수
player.reportCard.score += addedScore;
```

**중요**: 점수는 **사과 개수**이지 숫자의 합이 아닙니다!

---

## 📊 generation 필드 인코딩

### 클라이언트 → 서버

**파일**: `Lobby.tsx:130-132`

```typescript
if (s.appleRange === '1-5')
  appleCfg.generation = 1; // 어려움
else appleCfg.generation = 0; // 쉬움 (1-9)
```

### 서버 처리

**파일**: `gameSession.ts:224`

```typescript
const maxNumber = raw?.generation === 1 ? 5 : 9;
```

| generation | 의미   | maxNumber    |
| ---------- | ------ | ------------ |
| 0          | 쉬움   | 9 (1-9 범위) |
| 1          | 어려움 | 5 (1-5 범위) |

---

## 📦 패킷 구조 (실제 코드 기준)

### DROP_CELL_INDEX (수정됨)

**파일**: `packets.ts:131-136`

```typescript
export interface DropCellIndexPacket {
  type: GamePacketType.DROP_CELL_INDEX;
  winnerId: PlayerId;
  indices: AppleIndex[];
  totalScore: number; // 누적 총점만 있음 (addedScore 없음)
}
```

**참고**: 프로토콜 문서(`apple-game-protocol.md`)에 `addedScore` 필드가 있었으나 실제 코드에는 없습니다. 획득 점수는 `indices.length`로 계산합니다.

---

## 🔧 체크리스트

### 필수 수정

- [ ] `gameSession.ts:213-222`: mapSize 그리드 크기 수정
  - SMALL: 11×6 → **16×8**
  - MEDIUM: 기본값 17×10 → **20×10**
  - LARGE: 25×14 → **30×15**

### 권장 수정

- [ ] `gameSession.ts:394` 다음에 `this.broadcastScoreboard()` 추가

### 테스트

- [ ] SMALL/MEDIUM/LARGE 각각 테스트
- [ ] 클라이언트와 사과 개수 일치 확인
- [ ] 점수판 실시간 업데이트 확인

---

## 📝 프로토콜 스펙 참고

### spec/apple-game-protocol.md

이미 작성된 프로토콜 문서가 있습니다:

- **SET_FIELD**: 사과 배열 전송 (L5-12)
- **SET_TIME**: 제한 시간 설정 (L14-21)
- **UPDATE_DRAG_AREA**: 드래그 영역 공유 (L23-32)
- **DROP_CELL_INDEX**: 사과 획득 알림 (L34-43) - **수정됨**
- **TIME_END**: 게임 종료 (L47-54)
- **CONFIRM_DRAG_AREA**: 드래그 확인 요청 (L72-89)

### spec/room-protocol.md

- **JOIN_ROOM**: 방 입장 (L1-7)
- **ROOM_UPDATE**: 방 상태 업데이트 (L9-19)
- **GAME_CONFIG_UPDATE_REQ**: 설정 변경 요청 (L21-35)
- **GAME_CONFIG_UPDATE**: 설정 브로드캐스트 (L37-49)
- **GAME_START_REQ**: 게임 시작 요청 (L51-55)

---

## 🎯 결론

**대부분의 서버 로직이 이미 구현되어 있습니다!**

유일하게 수정이 필요한 부분:

1. **mapSize 그리드 크기 불일치** → `gameSession.ts:213-222` 수정
2. **(선택) UPDATE_SCORE 전송** → `handleDragConfirm()` 끝에 추가

수정 후 테스트를 진행하면 됩니다.
