import { useState } from "react";
import "nes.css/css/nes.min.css";
import "../assets/fonts/Font.css";
import "./Lobby.css";
import type { AppleGamePreset } from "../game/types/GamePreset";

interface Player {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
}

interface Game {
  id: string;
  name: string;
  thumbnail: string;
}

interface GameSettings {
  mapSize?: "small" | "normal" | "large" | string;
  timeLimit?: number;
  appleRange?: "1-9" | "1-5" | string;
  includeZero?: boolean;
}

interface LobbyProps {
  currentPlayer: Player;
  onGameStart: (preset: AppleGamePreset) => void;
}

function Lobby({ currentPlayer, onGameStart }: LobbyProps) {
  // 플레이어 색깔 (들어온 순서대로)
  const playerColors = ["#209cee", "#e76e55", "#92cc41", "#f2d024"];

  // 테스트용 플레이어 목록 (나중에 서버에서 받아올 예정)
  const [players, setPlayers] = useState<Player[]>([
    { ...currentPlayer, color: playerColors[0] },
  ]);

  // 게임 리스트
  const [games] = useState<Game[]>([
    { id: "apple", name: "사과 게임", thumbnail: "" },
    { id: "flappy", name: "플래피 버드", thumbnail: "" },
    { id: "minesweeper", name: "지뢰찾기", thumbnail: "" },
  ]);

  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  // 각 게임의 설정 (기본값)
  const [gameSettings, setGameSettings] = useState<
    Record<string, GameSettings>
  >({
    apple: {
      mapSize: "normal",
      timeLimit: 180,
      appleRange: "1-9",
      includeZero: false,
    },
    flappy: {},
    minesweeper: {},
  });

  const handleSelectGame = (gameId: string) => {
    setSelectedGame(gameId);
  };

  const handleSettingChange = (
    gameId: string,
    setting: keyof GameSettings,
    value: any
  ) => {
    setGameSettings((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], [setting]: value },
    }));
  };

  const handleCopyLink = () => {
    // 나중에 구현
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert("초대 링크가 복사되었습니다!");
  };

  const handleStartGame = () => {
    if (!selectedGame) {
      alert("게임을 선택해주세요!");
      return;
    }

    // 사과 게임 설정을 프리셋으로 변환
    if (selectedGame === "apple") {
      const settings = gameSettings.apple;

      // mapSize를 gridSize로 변환
      let gridSize: 'S' | 'M' | 'L' = 'M';
      if (settings.mapSize === 'small') gridSize = 'S';
      else if (settings.mapSize === 'normal') gridSize = 'M';
      else if (settings.mapSize === 'large') gridSize = 'L';

      // appleRange를 numberRange로 변환
      let numberRange: '1-9' | '1-5' | '1-3' = '1-9';
      if (settings.appleRange === '1-5') numberRange = '1-5';
      else if (settings.appleRange === '1-3') numberRange = '1-3';

      const preset: AppleGamePreset = {
        gridSize,
        timeLimit: settings.timeLimit === -1 ? 'manual' : (settings.timeLimit as 120 | 180 | 240),
        manualTime: settings.timeLimit === -1 ? undefined : settings.timeLimit,
        numberRange,
        includeZero: settings.includeZero || false,
      };

      onGameStart(preset);
    }
  };

  // 빈 슬롯 생성
  const emptySlots = Array(4 - players.length).fill(null);

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h1 className="nes-text is-primary lobby-title">다같이 오락가락</h1>
      </div>

      <div className="lobby-content">
        {/* 왼쪽: 플레이어 리스트 */}
        <div className="lobby-left">
          <div className="nes-container is-rounded player-section">
            <h2 className="section-title">플레이어</h2>
            <div className="player-list">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="player-item"
                  style={{ borderColor: player.color }}
                >
                  <div
                    className="player-color-indicator"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="player-name">{player.name}</span>
                  {player.isHost && (
                    <span className="player-host-badge">방장</span>
                  )}
                </div>
              ))}
              {emptySlots.map((_, index) => (
                <div key={`empty-${index}`} className="player-item empty">
                  <div className="player-color-indicator empty" />
                  <span className="player-name">대기 중...</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: 게임 리스트 */}
        <div className="lobby-right">
          <div className="nes-container is-rounded game-section">
            <h2 className="section-title">게임 선택</h2>
            <div className="game-list">
              {games.map((game) => {
                const settings = gameSettings[game.id];

                return (
                  <div
                    key={game.id}
                    className={`game-item ${selectedGame === game.id ? "selected" : ""
                      } ${selectedGame && selectedGame !== game.id ? "dimmed" : ""
                      }`}
                    onClick={() => handleSelectGame(game.id)}
                  >
                    <div className="game-thumbnail">
                      {game.thumbnail || "🎮"}
                    </div>
                    <div className="game-info">
                      <h3 className="game-name">{game.name}</h3>
                      {game.id === "apple" ? (
                        <div
                          className="settings-edit"
                          onClick={(e) => {
                            if (selectedGame !== game.id) {
                              handleSelectGame(game.id);
                            }
                            e.stopPropagation();
                          }}
                        >
                          <div className="setting-item">
                            <label>맵 크기:</label>
                            <select
                              value={settings.mapSize}
                              onChange={(e) =>
                                handleSettingChange(
                                  game.id,
                                  "mapSize",
                                  e.target.value
                                )
                              }
                              className="nes-select is-small"
                            >
                              <option value="small">작음</option>
                              <option value="normal">보통</option>
                              <option value="large">큼</option>
                            </select>
                          </div>
                          <div className="setting-item">
                            <label>제한 시간:</label>
                            {settings.timeLimit === -1 ||
                              (![120, 180, 240].includes(
                                settings.timeLimit || 0
                              ) &&
                                settings.timeLimit !== undefined) ? (
                              <input
                                type="number"
                                value={
                                  settings.timeLimit === -1
                                    ? ""
                                    : settings.timeLimit
                                }
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    "timeLimit",
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : -1
                                  )
                                }
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    let val = parseInt(e.currentTarget.value);
                                    if (val && val >= 30) {
                                      if (val > 300) {
                                        val = 300;
                                        handleSettingChange(
                                          game.id,
                                          "timeLimit",
                                          val
                                        );
                                      }
                                      e.currentTarget.blur();
                                    }
                                  }
                                }}
                                className="nes-input is-small"
                                placeholder="초"
                                min={30}
                                max={300}
                                autoFocus
                                onBlur={(e) => {
                                  let val = parseInt(e.target.value);
                                  if (!val || val < 30) {
                                    handleSettingChange(
                                      game.id,
                                      "timeLimit",
                                      120
                                    );
                                  } else if (val > 300) {
                                    handleSettingChange(
                                      game.id,
                                      "timeLimit",
                                      300
                                    );
                                  }
                                }}
                              />
                            ) : (
                              <select
                                value={settings.timeLimit}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  handleSettingChange(
                                    game.id,
                                    "timeLimit",
                                    val
                                  );
                                }}
                                className="nes-select is-small"
                              >
                                <option value={120}>120초</option>
                                <option value={180}>180초</option>
                                <option value={240}>240초</option>
                                <option value={-1}>직접 입력</option>
                              </select>
                            )}
                          </div>
                          <div className="setting-item">
                            <label>사과 생성:</label>
                            <select
                              value={settings.appleRange}
                              onChange={(e) =>
                                handleSettingChange(
                                  game.id,
                                  "appleRange",
                                  e.target.value
                                )
                              }
                              className="nes-select is-small"
                            >
                              <option value="1-9">쉬움(1-9)</option>
                              <option value="1-5">어려움(1-5)</option>
                            </select>
                          </div>
                          <div className="setting-item">
                            <label>0 생성:</label>
                            <select
                              value={settings.includeZero ? "O" : "X"}
                              onChange={(e) =>
                                handleSettingChange(
                                  game.id,
                                  "includeZero",
                                  e.target.value === "O"
                                )
                              }
                              className="nes-select is-small"
                            >
                              <option value="X">X</option>
                              <option value="O">O</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="settings-edit settings-empty"
                          onClick={(e) => {
                            if (selectedGame !== game.id) {
                              handleSelectGame(game.id);
                            }
                            e.stopPropagation();
                          }}
                        >
                          <span className="settings-placeholder">
                            설정 준비 중
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 하단: 버튼들 */}
      <div className="lobby-footer">
        <button className="nes-btn" onClick={handleCopyLink}>
          <i className="nes-icon is-small link"></i>
          초대 링크 복사
        </button>
        <button
          className="nes-btn is-primary"
          onClick={handleStartGame}
          disabled={!selectedGame}
        >
          게임 시작
        </button>
      </div>
    </div>
  );
}

export default Lobby;
