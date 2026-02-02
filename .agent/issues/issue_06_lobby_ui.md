# [Client] 로비 UI에 지뢰찾기 설정 추가

## 📋 기본 정보

- **Labels**: `enhancement`, `client`, `ui`
- **Priority**: Medium
- **Estimated Time**: 3-4 hours
- **Dependencies**: Issue #1

---

## 📝 설명

로비에서 지뢰찾기 게임을 선택하고 설정할 수 있는 UI를 구현합니다.
사과 게임과 유사한 방식으로 프리셋 기반 설정 UI를 제공합니다.

---

## ✅ 할 일

### 1. 게임 선택 UI 확장

```tsx
// 게임 선택 드롭다운 또는 탭
const gameOptions = [
  { value: GameType.APPLE_GAME, label: '🍎 사과 게임' },
  { value: GameType.FLAPPY_BIRD, label: '🐦 플래피 버드' },
  { value: GameType.MINESWEEPER, label: '💣 지뢰찾기' }, // 추가
];
```

### 2. 지뢰찾기 설정 패널 컴포넌트

```tsx
const MineSweeperSettings = () => {
  const [preset, setPreset] = useState<MineSweeperGamePreset>(
    DEFAULT_MINESWEEPER_PRESET,
  );

  return (
    <div className="minesweeper-settings">
      {/* 맵 크기 */}
      <div className="setting-group">
        <label>맵 크기</label>
        <div className="button-group">
          <button
            className={preset.mapSize === 'small' ? 'active' : ''}
            onClick={() => setPreset({ ...preset, mapSize: 'small' })}
          >
            Small (30x18)
          </button>
          <button
            className={preset.mapSize === 'medium' ? 'active' : ''}
            onClick={() => setPreset({ ...preset, mapSize: 'medium' })}
          >
            Medium (45x27)
          </button>
          <button
            className={preset.mapSize === 'large' ? 'active' : ''}
            onClick={() => setPreset({ ...preset, mapSize: 'large' })}
          >
            Large (50x30)
          </button>
        </div>
      </div>

      {/* 난이도 (지뢰 비율) */}
      <div className="setting-group">
        <label>난이도</label>
        <div className="button-group">
          <button
            className={preset.difficulty === 'easy' ? 'active' : ''}
            onClick={() => setPreset({ ...preset, difficulty: 'easy' })}
          >
            Easy (10%)
          </button>
          <button
            className={preset.difficulty === 'normal' ? 'active' : ''}
            onClick={() => setPreset({ ...preset, difficulty: 'normal' })}
          >
            Normal (20%)
          </button>
          <button
            className={preset.difficulty === 'hard' ? 'active' : ''}
            onClick={() => setPreset({ ...preset, difficulty: 'hard' })}
          >
            Hard (30%)
          </button>
        </div>
      </div>

      {/* 제한 시간 */}
      <div className="setting-group">
        <label>제한 시간</label>
        <div className="button-group">
          <button
            className={preset.timeLimit === 120 ? 'active' : ''}
            onClick={() => setPreset({ ...preset, timeLimit: 120 })}
          >
            2분
          </button>
          <button
            className={preset.timeLimit === 180 ? 'active' : ''}
            onClick={() => setPreset({ ...preset, timeLimit: 180 })}
          >
            3분
          </button>
          <button
            className={preset.timeLimit === 240 ? 'active' : ''}
            onClick={() => setPreset({ ...preset, timeLimit: 240 })}
          >
            4분
          </button>
        </div>
      </div>

      {/* 예상 지뢰 수 표시 */}
      <div className="info-display">
        <span>예상 지뢰: {calculateMineCount(preset)}개</span>
      </div>
    </div>
  );
};
```

### 3. 설정 동기화

```tsx
// 설정 변경 시 서버에 전송
useEffect(() => {
  if (isHost && selectedGameType === GameType.MINESWEEPER) {
    const resolved = resolveMineSweeperPreset(preset);

    socket.emit(SystemPacketType.GAME_CONFIG_UPDATE_REQ, {
      selectedGameType: GameType.MINESWEEPER,
      gameConfig: resolved,
    });
  }
}, [preset, isHost, selectedGameType]);

// 서버에서 설정 업데이트 수신
useEffect(() => {
  socket.on(SystemPacketType.GAME_CONFIG_UPDATE, (data) => {
    if (data.selectedGameType === GameType.MINESWEEPER) {
      setPreset(data.gameConfig);
    }
  });
}, []);
```

### 4. 조건부 렌더링

```tsx
return (
  <div className="lobby">
    {/* 게임 선택 */}
    <GameSelector selected={selectedGameType} onChange={setSelectedGameType} />

    {/* 게임별 설정 패널 */}
    {selectedGameType === GameType.APPLE_GAME && <AppleGameSettings />}
    {selectedGameType === GameType.FLAPPY_BIRD && <FlappyBirdSettings />}
    {selectedGameType === GameType.MINESWEEPER && <MineSweeperSettings />}

    {/* 게임 시작 버튼 */}
    <button onClick={startGame} disabled={!isHost}>
      게임 시작
    </button>
  </div>
);
```

### 5. CSS 스타일링

```css
.minesweeper-settings {
  padding: 16px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
}

.setting-group {
  margin-bottom: 16px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #fff;
}

.button-group {
  display: flex;
  gap: 8px;
}

.button-group button {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #444;
  border-radius: 6px;
  background: #222;
  color: #ccc;
  cursor: pointer;
  transition: all 0.2s;
}

.button-group button.active {
  border-color: #4caf50;
  background: #2e7d32;
  color: #fff;
}

.button-group button:hover:not(.active) {
  background: #333;
}

.info-display {
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  text-align: center;
  color: #aaa;
}
```

---

## 📎 참고 파일

- `packages/client/src/components/Lobby.tsx`
- `packages/client/src/game/types/minesweeperPresets.ts`

---

## 📋 Acceptance Criteria

- [ ] 게임 선택 UI에서 '지뢰찾기' 선택 가능
- [ ] 지뢰찾기 선택 시 설정 패널이 표시됨
- [ ] 맵 크기, 난이도, 제한 시간 설정 가능
- [ ] 설정 변경 시 다른 플레이어에게 동기화됨
- [ ] 비호스트 플레이어는 설정 변경 불가 (읽기 전용)
- [ ] 게임 시작 버튼 클릭 시 지뢰찾기 게임이 시작됨

---

## 🧪 테스트 포인트

1. 호스트가 지뢰찾기를 선택하면 다른 플레이어도 설정 패널이 보이는가?
2. 호스트가 난이도를 변경하면 다른 플레이어에게도 반영되는가?
3. 비호스트가 설정 버튼을 클릭해도 변경되지 않는가?
4. 로비에서 설정한 값대로 게임이 시작되는가?

---

## 🔗 관련 이슈

- **선행**: Issue #1
- **병렬**: Issue #5
