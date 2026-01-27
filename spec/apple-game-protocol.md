## 1. ClientBound (Server -> Client)

서버에서 클라이언트로 상태 변화를 알리는 패킷입니다.

### 1.1 SET_FIELD

게임 시작 시 사과 배치를 초기화합니다.

- **Data:**
- `apples: int[]`: 사과 숫자 배열 (예: 100개의 사과 숫자가 담긴 1차원 배열)

- **비고:** 클라이언트는 이 배열의 index를 기준으로 화면에 사과를 배치합니다.

### 1.2 SET_TIME

게임의 제한 시간을 설정하고 카운트다운을 시작하게 합니다.

- **Data:**
- `limitTime: int`: 제한 시간 (초 단위)

- **비고:** 로비 설정에 따라 가변적인 시간을 전달합니다.

### 1.3 UPDATE_DRAG_AREA

다른 플레이어가 현재 드래그 중인 영역을 실시간으로 공유합니다.

- **Data:**
- `playerId: string`: 드래그 중인 플레이어 식별값
- `startX: float, startY: float`: 드래그 시작 좌표
- `endX: float, endY: float`: 현재 드래그 끝점 좌표

- **비고:** 클라이언트는 보간(Interpolation)을 통해 부드러운 사각형 UI를 렌더링합니다.

### 1.4 DROP_CELL_INDEX (핵심 동기화)

사과 획득 성공 시 모든 클라이언트에게 알립니다.

- **Data:**
- `winnerId: string`: 사과를 딴 플레이어 ID
- `indices: int[]`: 제거된 사과들의 index 배열
- `addedScore: int`: 이번 드래그로 획득한 점수
- `totalScore: int`: 해당 플레이어의 갱신된 총점

- **UX 처리:** \* `winnerId == Me`: 투명화된 사과 확정 제거 애니메이션.
- `winnerId != Me`: 해당 index 사과 즉시 소멸(블랙홀 효과 등) 및 상대 점수 갱신.

### 1.5 TIME_END

제한 시간이 종료되었음을 알리고 최종 결과를 전달합니다.

- **Data:**
- `results: PlayerData[]`: 순위 순으로 정렬된 결과 PlayerData 배열

- **비고:** 서버 권위 데이터로 결과창을 구성하여 클라이언트 간 데이터 불일치를 방지합니다.

---

## 2. ServerBound (Client -> Server)

클라이언트가 서버에 액션을 요청하는 패킷입니다.

### 2.1 DRAWING_DRAG_AREA

자신의 드래그 상태를 서버에 전송합니다.

- **Data:**
- `startX: float, startY: float, endX: float, endY: float`

- **주기:** 약 50ms\~100ms (초당 10\~20회) 또는 유의미한 좌표 변화 발생 시.
- **비고:** 서버는 이 데이터를 받아 `UPDATE_DRAG_AREA`로 브로드캐스팅합니다.

### 2.2 CONFIRM_DRAG_AREA

드래그를 마쳤을 때, 서버에 사과 제거 판정을 요청합니다.

- **Data:**
- `indices: int[]`: 선택된 사과들의 index 배열

- **클라이언트 로직:**

1. 클라이언트 자체 계산 결과가 합 10일 때만 발송.
2. 발송 즉시 해당 사과들을 **'투명화(Pending)'** 처리.
3. **내부 타이머(Timeout, 약 1초)** 가동.

- **서버 로직:**

1. 받은 index들이 실제 살아있는 사과인지 검증.
2. 사과들의 합이 10인지 최종 검증.
3. 성공 시 `DROP_CELL_INDEX` 브로드캐스팅. 실패 시 무시(Ignore).

---

## 3. 예외 및 동기화 처리 (Sequence)

### 3.1 낙관적 UI 복구 (Timeout)

- **상황:** 클라이언트가 `CONFIRM_DRAG_AREA`를 보냈으나 서버로부터 응답이 없는 경우 (패킷 유실 가능성).
- **처리:** 가동 중인 내부 타이머가 만료되면, 투명화 처리했던 사과들을 다시 원래 상태(불투명)로 복구합니다.
  패배 처리용이 아니라 네트워크 고립 방지용임.

### 3.2 중복 점유 (Race Condition)

- **상황:** A와 B가 동일한 사과를 포함하여 드래그 성공.
- **결과:** 서버에 먼저 도달한 패킷만 처리됨. 늦게 도달한 패킷은 서버 검증 단계(이미 제거된 index 포함됨)에서 탈락하여 무시됨.
