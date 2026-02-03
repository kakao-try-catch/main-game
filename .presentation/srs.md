# **SRS (Software Requirements Specification) — Try-Catch**

---

## **1\. 문서 목적과 범위**

### **1.1 목적**

본 문서는 Try-Catch 멀티플레이 미니게임 플랫폼(메인 게임)의 요구사항을 정의한다. 요구사항은 현재 코드에 구현된 동작(소켓 프로토콜·세션·사과게임 로직)을 “사실 기준”으로 삼고, 계획서의 규칙(특히 Flappy Bird / Minesweeper 변형 규칙)을 “목표 기능”으로 반영해 **구체화된 SRS**를 제공한다.

### **1.2 범위**

* **클라이언트:** React \+ Phaser 기반 UI/게임 실행, Socket.IO 클라이언트  
* **서버:** Node.js(Socket.IO) 기반 실시간 게임 서버, 방/세션/게임 인스턴스 관리  
* **공용 패키지(common):** 패킷 타입, 설정(config), 공용 타입(PlayerData 등)

---

## **2\. 시스템 개요(Overall Description)**

### **2.1 제품 관점**

* **모노레포(pnpm workspace)** 구조: `packages/client`, `packages/server`, `packages/common`  
* **실시간 통신:** HTTP REST가 아니라 **Socket.IO(WebSocket only)** 이벤트 기반으로 동작  
* **서버 상태 저장 방식:** 세션/점수/게임 상태는 **서버 메모리(in-memory)** 기반이며 영속 저장소가 없다(서버 재시작 시 초기화).

### **2.2 사용자 역할**

* **호스트(방장):** 방에 최초 입장한 사용자(현재 서버 구현은 `Map`의 첫 번째 플레이어를 호스트로 간주)  
* **게스트(참가자):** 호스트 이후 입장한 사용자

### **2.3 핵심 사용자 흐름(요약)**

1. 닉네임 입력 → 2\) 방 참가/생성 → 3\) 로비에서 게임 선택/설정(호스트) → 4\) 게임 시작(호스트) → 5\) 플레이 → 6\) 결과 → 7\) 재시작 또는 로비 복귀

---

## **3\. 기능 요구사항 (Functional Requirements)**

### **FR-1. 방(Room) 생성/참가**

**FR-1.1** 클라이언트는 `JOIN_ROOM` 패킷으로 방 참가를 요청해야 한다.

* 입력: `roomId`, `playerName`  
* `roomId`가 비어있으면 서버는 **10자리 영숫자(소문자+숫자)** 룸 ID를 생성한다(현재 서버 로직).

**FR-1.2** 서버는 방 인원 제한을 **최대 4명**으로 제한한다.

* 초과 참가 시 서버는 시스템 메시지를 전송하고 연결을 종료할 수 있다(현재 서버 로직에 포함).

**FR-1.3** 서버는 동일 소켓의 중복 참가를 방지해야 한다.

* 중복 참가 시 `SYSTEM_MESSAGE`로 거부 사유를 알린다.

**FR-1.4 (권장/보완 요구사항)** 새로운 플레이어가 입장하면 **기존 플레이어들에게도 ROOM\_UPDATE 브로드캐스트**가 필요하다.

* 현재 서버 구현은 “입장한 플레이어에게만 ROOM\_UPDATE를 보내는 형태”가 중심이라, 다자 로비 UI 일관성을 위해 요구사항으로 명시한다.

---

### **FR-2. 플레이어 상태/색상/인덱스**

**FR-2.1** 서버는 플레이어를 `PlayerData{ playerName, color, reportCard{score} }`로 관리한다.  
**FR-2.2** 서버는 입장 순서 기반으로 `yourIndex`(0\~3)를 부여한다.  
**FR-2.3** 플레이어 색상은 서버가 미리 정의된 팔레트에서 할당한다(현재 공용 타입에 정의된 상수 기반).  
**FR-2.4** 플레이어 연결 해제 시 서버는 플레이어를 제거하고, 필요 시 게임을 중단할 수 있다(세션 내 인원이 0이면 stop).

---

### **FR-3. 로비(Lobby) 및 공통 제어**

**FR-3.1** 호스트만 게임 설정 변경 요청을 보낼 수 있다.

* 패킷: `GAME_CONFIG_UPDATE_REQ`  
* 호스트가 아닌 경우 서버는 `SYSTEM_MESSAGE`로 거부 사유를 전송한다(현재 서버 로직).

**FR-3.2** 서버는 설정 변경을 검증/정규화(sanitize)한 뒤, `GAME_CONFIG_UPDATE`로 방 전체에 공유해야 한다.

* 사과게임 설정은 서버에서 범위 검증(격자 크기, 시간 등) 수행(현재 sanitize 구현 존재).

**FR-3.3** 호스트만 게임 시작 요청을 수행할 수 있다.

* 패킷: `GAME_START_REQ`  
* 서버는 시작 시 `READY_SCENE`을 브로드캐스트하고, 선택된 게임의 인스턴스를 생성/시작한다(현재 GameSession 흐름).

**FR-3.4** 게임 종료 후, 호스트는 로비 복귀를 수행할 수 있다.

* 패킷: `RETURN_TO_THE_LOBBY_REQ` → 서버 브로드캐스트 `RETURN_TO_THE_LOBBY`

**FR-3.5** 게임 종료 후, 호스트는 재시작을 수행할 수 있다.

* 패킷: `REPLAY_REQ` (세부 동작은 구현/연결 상태에 따라 확정 필요)

---

## **4\. 게임별 요구사항**

### **FR-4. 사과 게임(Apple Game)**

#### **FR-4.1 규칙(계획서 기준)**

* **여러 플레이어가 드래그로 영역을 선택**하고, 선택한 숫자들의 **합이 10이면 해당 사과가 사라지며 점수를 획득**한다.  
* 점수는 기본적으로 “획득 성공”에 대한 누적이며(코드에서는 제거한 칸 수를 점수로 더함), 결과는 점수 내림차순 정렬이 자연스럽다.

#### **FR-4.2 서버 상태**

서버는 최소한 다음 상태를 보유해야 한다.

* `apples: number[]` (격자 숫자 필드)  
* `removedIndices: Set<number>` (이미 제거된 칸)  
* 플레이어별 `reportCard.score`

#### **FR-4.3 드래그 표시(실시간)**

* 클라이언트는 드래그 중 `APPLE_DRAWING_DRAG_AREA`를 전송한다.  
* 서버는 이를 다른 플레이어에게 `APPLE_UPDATE_DRAG_AREA`로 전달할 수 있다(현재 구현: 동일 드래그 반복 전송을 제한하는 로직 포함).

#### **FR-4.4 확정/판정**

* 클라이언트는 드래그 확정 시 `APPLE_CONFIRM_DRAG_AREA{indices}`를 전송한다.  
* 서버는 다음을 검증해야 한다.  
  * 게임 상태가 playing인지  
  * indices 중 이미 제거된 값이 있는지(레이스 컨디션 방지)  
  * indices 합이 10인지  
* 성공 시:  
  * indices를 제거 처리(removedIndices 반영)  
  * 점수 반영(현재 서버 구현: `addedScore = indices.length`)  
  * `APPLE_DROP_CELL_INDEX{winnerIndex, indices, totalScore}`를 방 전체에 브로드캐스트

#### **FR-4.5 종료 처리**

* 제한 시간이 종료되면 서버는 `TIME_END{results: PlayerData[]}`를 브로드캐스트하고 게임을 ended로 전환해야 한다.  
* 결과는 점수 기준 내림차순 정렬(현재 AppleGameInstance에서 정렬 수행).

**구현-요구사항 정합성 메모:** 공용 패킷에 `SET_TIME`(서버 시작 타임스탬프 포함)이 정의돼 있으나, 현재 “사과게임 인스턴스 start() 흐름”에서는 이를 브로드캐스트하지 않는다. 타이머 동기화가 필요하면 `SET_TIME`을 요구사항에 포함시키고 서버 구현을 맞추는 편이 안전하다.

---

### **FR-5. 지뢰찾기(Minesweeper) — 목표 기능(계획서 기반, 서버 미구현/부분 구현)**

계획서의 변형 규칙은 다음을 요구한다.

#### **FR-5.1 협동 모드(계획서)**

* **각 플레이어가 자신의 보드를 갖고** 동시에 지뢰를 해제한다.  
* **한 플레이어의 폭발은 다른 플레이어에게 영향을 주지 않는다**(개별 진행).  
* **깃발 개수는 점수로 환산**되어 경쟁 요소를 갖는다.

#### **FR-5.2 배틀 모드(계획서)**

* 상대 플레이어에게 **방해물(예: 폭탄)을 투척**하는 등 PvP 요소를 포함한다.  
* 최종적으로 “지뢰찾기 규칙 \+ 점수 경쟁 \+ 방해”의 형태를 요구한다.

**코드 정합성:** 공용 타입에 `MineSweeperReportCard{flags}`가 존재하므로(설계 의도), 서버/패킷이 확장될 때 `score + flags` 등의 결과 집계가 자연스럽다. 다만 현재 서버 패킷 정의에는 MINESWEEPER 전용 패킷이 없다(추가 필요).

---

### **FR-6. 플래피버드(Flappy Bird) — 목표 기능(계획서 기반, 서버 미완)**

#### **FR-6.1 협동/연결(계획서)**

* **각 플레이어 새는 로프로 연결**되어 있으며, 한 명이 떨어지면 **연결된 플레이어도 함께 추락**한다.  
* 이를 통해 “개인 실력 \+ 협동 타이밍”을 동시에 요구한다.

#### **FR-6.2 실시간 동기화 요구**

* 서버 권위(authoritative) 기반으로 월드 상태(새 위치/속도, 파이프 위치 등)를 주기적으로 브로드캐스트해야 한다.  
* 클라이언트 입력은 최소 `FLAPPY_JUMP`(점프) 패킷으로 서버에 전달되어야 한다.  
* 공용 패킷에 `FLAPPY_WORLD_STATE`, `FLAPPY_SCORE_UPDATE`, `FLAPPY_GAME_OVER`가 이미 정의되어 있으므로, 서버 인스턴스는 이를 실제로 사용하도록 구현되어야 한다(현재 서버 쪽 Flappy 인스턴스는 미완/정합성 점검 필요).

---

## **5\. 외부 인터페이스 요구사항 (External Interface Requirements)**

### **5.1 네트워크/통신 (Socket.IO)**

**전송 규칙(코드 기반):**

* 이벤트 이름 \= 패킷 `type` 문자열  
* payload \= `{type 제외 나머지 필드}`

**서버 구동**

* 기본 포트: `3000`  
* Transport: `websocket`만 허용(서버/클라이언트 모두)  
* CORS 허용 origin은 개발 환경에서 제한 목록으로 구성(배포 시 환경변수화 권장)

### **5.2 패킷 카탈로그(현행 공용 정의 기준)**

#### **(A) SystemPacketType**

* `JOIN_ROOM { roomId: string; playerName: string }`  
* `ROOM_UPDATE { players: PlayerData[]; updateType: 0|1|2; yourIndex: number; roomId: string }`  
* `SYSTEM_MESSAGE { message: string }`  
* `GAME_CONFIG_UPDATE_REQ { selectedGameType: GameType; gameConfig: GameConfig }`  
* `GAME_CONFIG_UPDATE { selectedGameType: GameType; gameConfig: GameConfig }`  
* `GAME_START_REQ {}`  
* `READY_SCENE { selectedGameType: GameType }`  
* `UPDATE_SCORE { scoreboard: ReportCard[] }`  
* `SET_TIME { limitTime: number; serverStartTime: number }` *(정의는 존재, 실제 사용은 게임별 구현에 맞춰 확정 필요)*  
* `TIME_END { results: PlayerData[] }`  
* `RETURN_TO_THE_LOBBY_REQ {}`  
* `RETURN_TO_THE_LOBBY {}`  
* `REPLAY_REQ {}`

#### **(B) AppleGamePacketType**

* `APPLE_SET_FIELD { apples: number[] }`  
* `APPLE_DRAWING_DRAG_AREA { startX; startY; endX; endY }`  
* `APPLE_UPDATE_DRAG_AREA { playerIndex; startX; startY; endX; endY }`  
* `APPLE_CONFIRM_DRAG_AREA { indices: number[] }`  
* `APPLE_DROP_CELL_INDEX { winnerIndex: number; indices: number[]; totalScore: number }`

#### **(C) FlappyBirdPacketType**

* `FLAPPY_JUMP {}` (또는 입력 파라미터 확장 가능)  
* `FLAPPY_WORLD_STATE { tick; birds; pipes; cameraX }`  
* `FLAPPY_SCORE_UPDATE { score: number }`  
* `FLAPPY_GAME_OVER { collidedPlayerIndex; reason; finalScore }`

### **5.3 UI 요구사항(클라이언트 화면)**

* 닉네임 입력 화면  
* 로비 화면(플레이어 목록, 호스트 표시, 게임 선택/프리셋 설정, 시작 버튼)  
* 게임 화면(사과/지뢰찾기/플래피버드 씬)  
* 결과 화면(순위, 점수, 재시작/로비 복귀)

---

## **6\. 데이터 요구사항 (Data Requirements)**

### **6.1 공용 타입(요구사항 최소 단위)**

* `PlayerData`: `playerName`, `color`, `reportCard`  
* `ReportCard`: `score`  
* (확장) `MineSweeperReportCard`: `score`, `flags`

### **6.2 게임 설정(GameConfig)**

* `GameType = APPLE_GAME | FLAPPY_BIRD | MINESWEEPER`  
* 사과게임 렌더/규칙 설정: `gridCols`, `gridRows`, `minNumber`, `maxNumber`, `totalTime`, `includeZero`  
* 플래피버드 프리셋: `pipeSpeed`, `pipeSpacing`, `pipeGap`, `pipeWidth`, `ropeLength`, `connectAll` 등(프리셋 → 실수치 resolve)

---

## **7\. 비기능 요구사항 (Non-Functional Requirements)**

### **NFR-1 성능/지연**

* WebSocket 기반 실시간 상호작용에서 **입력→반영 지연**은 체감상 100ms\~200ms 이하를 목표로 한다.  
* FlappyBird는 물리 FPS(예: 60)와 네트워크 tick(예: 20)을 분리하여 서버 부하를 제어한다(현재 코드 상수 존재).

### **NFR-2 신뢰성/동기화**

* 타이머, 점수, 제거 인덱스 등 **승패에 영향을 주는 상태는 서버 권위**로 관리해야 한다.  
* 재접속(reconnect) 시 세션 복구 정책(스냅샷 재전송, 관전자 처리 등)을 명확히 정의해야 한다.

### **NFR-3 보안/치팅 방지(최소 요구)**

* indices 합 검증, 중복 제거 검증 등은 서버에서 수행(사과게임은 이미 수행).  
* 과도한 패킷 전송(드래그 스팸 등)에 대한 rate limiting/디바운싱 정책을 도입한다.

### **NFR-4 운영성**

* 서버는 접속/입장/시작/종료/오류에 대한 구조화된 로그를 남겨야 한다.  
* 개발/배포 환경별 설정(CORS, 서버 주소, 포트)은 환경변수로 분리하는 것을 요구한다.

---

## **8\. 제약 및 가정**

* 서버는 현재 영속 DB 없이 메모리 기반 세션이다(재시작 시 방/점수 초기화).  
* 방장 판정은 “세션에 가장 먼저 들어온 플레이어”이며, 방장 이탈 시 승계 정책이 필요(현 구현은 Map 첫 키 기준이라, 제거 후 자연스럽게 다음 플레이어가 호스트가 될 가능성이 있음).  
* Minesweeper/FlappyBird는 계획서 규칙을 기준으로 요구사항을 정의하되, 서버 패킷/인스턴스 구현은 추가 개발이 전제된다.

---

