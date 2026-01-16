# 🎮 사과 게임 프리셋 가이드

> 사과 게임의 모든 설정 옵션과 구현 위치를 한눈에 확인할 수 있는 문서입니다.

---

## 📋 목차
- [그리드 크기](#-그리드-크기)
- [제한 시간](#-제한-시간)
- [사과 생성 (숫자 범위)](#-사과-생성-숫자-범위)
- [구현 파일 위치](#-구현-파일-위치)

---

## 🔲 그리드 크기

게임판의 크기를 설정합니다.

| 옵션 | 크기 (가로×세로) | 사과 개수 | 난이도 | 사과 크기 |
|------|-----------------|----------|--------|----------|
| **S (작음)** | 16×8 | 128개 | 쉬움 | 110% |
| **M (보통)** ⭐ | 20×10 | 200개 | 보통 | 105% |
| **L (큼)** | 30×15 | 450개 | 어려움 | 70% |

⭐ = 기본값

### 📍 구현 위치
- **타입 정의**: `src/game/types/GamePreset.ts` (6번 줄)
  ```typescript
  export type AppleGridSize = 'S' | 'M' | 'L' | 'manual';
  ```

- **실제 크기 변환**: `src/game/types/GamePreset.ts` (57-74번 줄)
  ```typescript
  case 'S': gridCols = 16; gridRows = 8;
  case 'M': gridCols = 20; gridRows = 10;
  case 'L': gridCols = 30; gridRows = 15;
  ```

- **사과 크기 조정**: `src/game/apple/AppleGameManager.ts` (175-183번 줄)
  ```typescript
  if (gridCols >= 30 || gridRows >= 15) {
      appleScale = ratio * 0.7;  // L: 70%
  } else if (gridCols === 20 && gridRows === 10) {
      appleScale = ratio * 1.05; // M: 105%
  } else if (gridCols <= 16 && gridRows <= 8) {
      appleScale = ratio * 1.1;  // S: 110%
  }
  ```

- **UI 설정**: `src/components/Lobby.tsx` (204-207번 줄)
  ```tsx
  <option value="small">작음</option>
  <option value="normal">보통</option>
  <option value="large">큼</option>
  ```

---

## ⏱️ 제한 시간

게임 플레이 시간을 설정합니다.

| 옵션 | 시간 (초) | 설명 |
|------|----------|------|
| **120초** ⭐ | 2분 | 기본 시간 |
| **180초** | 3분 | 여유 있는 플레이 |
| **240초** | 4분 | 긴 게임 |
| **직접 입력** | 30~300초 | 사용자 정의 (30초 이상 300초 이하) |

⭐ = 기본값

### 📍 구현 위치
- **타입 정의**: `src/game/types/GamePreset.ts` (9번 줄)
  ```typescript
  export type TimeLimit = 120 | 180 | 240 | 'manual';
  ```

- **기본값 설정**: `src/game/types/GamePreset.ts` (46번 줄)
  ```typescript
  timeLimit: 120,
  ```

- **UI 프리셋 옵션**: `src/components/Lobby.tsx` (277-280번 줄)
  ```tsx
  <option value={120}>120초</option>
  <option value={180}>180초</option>
  <option value={240}>240초</option>
  <option value={-1}>직접 입력</option>
  ```

- **커스텀 입력 제한**: `src/components/Lobby.tsx` (247-248번 줄)
  ```tsx
  min={30}
  max={300}
  ```

- **유효성 검사**: `src/components/Lobby.tsx` (233-267번 줄)
  - 엔터 키 입력 시: 300초 초과 → 자동으로 300초로 설정
  - blur 이벤트 시: 30초 미만 → 120초로 설정, 300초 초과 → 300초로 설정

---

## 🍎 사과 생성 (숫자 범위)

사과에 표시되는 숫자의 범위를 설정합니다.

### 숫자 범위

| 옵션 | 범위 | 난이도 | 설명 |
|------|------|--------|------|
| **기본 (1-9)** ⭐ | 1~9 | 쉬움 | 다양한 조합 가능 |
| **어려움 (1-5)** | 1~5 | 어려움 | 제한된 숫자로 10 만들기 |

⭐ = 기본값

### 0 포함 옵션

| 옵션 | 설명 |
|------|------|
| **X** ⭐ | 0을 생성하지 않음 |
| **O** | 0을 포함하여 생성 (최소값이 0으로 변경) |

⭐ = 기본값

### 📍 구현 위치
- **타입 정의**: `src/game/types/GamePreset.ts` (12번 줄)
  ```typescript
  export type NumberRange = '1-9' | '1-5' | '1-3';
  ```

- **기본값 설정**: `src/game/types/GamePreset.ts` (47-48번 줄)
  ```typescript
  numberRange: '1-9',
  includeZero: false,
  ```

- **숫자 범위 변환**: `src/game/types/GamePreset.ts` (88-101번 줄)
  ```typescript
  case '1-5': minNumber = 1; maxNumber = 5;
  case '1-9': minNumber = 1; maxNumber = 9;
  ```

- **0 포함 처리**: `src/game/types/GamePreset.ts` (104-106번 줄)
  ```typescript
  if (preset.includeZero) {
      minNumber = 0;
  }
  ```

- **UI 설정**: `src/components/Lobby.tsx` (290-309번 줄)
  ```tsx
  <select value={settings.appleRange}>
    <option value="1-9">쉬움(1-9)</option>
    <option value="1-5">어려움(1-5)</option>
  </select>
  
  <select value={settings.includeZero ? "O" : "X"}>
    <option value="X">X</option>
    <option value="O">O</option>
  </select>
  ```

---

## 📂 구현 파일 위치

### 핵심 파일

| 파일 | 역할 | 주요 내용 |
|------|------|----------|
| **`src/game/types/GamePreset.ts`** | 타입 정의 및 변환 로직 | - 모든 프리셋 타입 정의<br>- 기본값 설정<br>- 프리셋 → 게임 설정 변환 |
| **`src/components/Lobby.tsx`** | 로비 UI | - 프리셋 선택 UI<br>- 유효성 검사<br>- 게임 시작 시 프리셋 전달 |
| **`src/game/apple/AppleGameManager.ts`** | 게임 로직 | - 사과 생성<br>- 그리드 크기에 따른 사과 크기 조정<br>- 타이머 관리 |

### 파일별 주요 코드 위치

#### 📄 `GamePreset.ts`
```
6번 줄    - AppleGridSize 타입
9번 줄    - TimeLimit 타입
12번 줄   - NumberRange 타입
15-32번 줄 - AppleGamePreset 인터페이스
44-49번 줄 - DEFAULT_PRESET (기본값)
52-115번 줄 - resolvePreset() 함수 (프리셋 변환)
```

#### 📄 `Lobby.tsx`
```
54-59번 줄  - 기본 게임 설정
86-116번 줄 - handleStartGame() (게임 시작)
204-207번 줄 - 그리드 크기 선택
210-284번 줄 - 제한 시간 선택 및 커스텀 입력
286-293번 줄 - 사과 생성 범위 선택
295-310번 줄 - 0 포함 토글
```

#### 📄 `AppleGameManager.ts`
```
15-27번 줄  - AppleGameConfig 인터페이스
29-41번 줄  - DEFAULT_CONFIG
107-154번 줄 - constructor (초기화)
156-161번 줄 - updateGameConfig() (설정 업데이트)
172-201번 줄 - createApples() (사과 생성)
175-183번 줄 - 그리드 크기별 사과 스케일 조정
```

---

## 🔄 프리셋 적용 흐름

```
1. 로비에서 설정 선택 (Lobby.tsx)
   ↓
2. "게임 시작" 버튼 클릭
   ↓
3. handleStartGame() 실행
   ↓
4. 설정을 AppleGamePreset 형식으로 변환
   ↓
5. onGameStart(preset) 호출
   ↓
6. App.tsx에서 프리셋 받음
   ↓
7. resolvePreset()로 실제 게임 설정으로 변환
   ↓
8. AppleGameManager.updateGameConfig() 호출
   ↓
9. 게임 시작!
```

---

## 📝 수정 이력

- **2026-01-16**: 초기 문서 작성
  - 그리드 크기: S(16×8), M(20×10), L(30×15)
  - 제한 시간: 120초, 180초, 240초, manual
  - 사과 생성: 1-9, 1-5, 0 포함 토글
  - M 크기 사과 스케일 105%로 조정

---

## 💡 팁

- **새로운 프리셋 추가 시**: `GamePreset.ts`의 타입 정의부터 수정하세요
- **UI 변경 시**: `Lobby.tsx`의 select 옵션을 수정하세요
- **게임 로직 변경 시**: `AppleGameManager.ts`의 createApples() 함수를 확인하세요
- **기본값 변경 시**: `GamePreset.ts`의 DEFAULT_PRESET과 `Lobby.tsx`의 초기 gameSettings를 모두 수정하세요
