import { useState, useEffect } from 'react';
import 'nes.css/css/nes.min.css';
import '../assets/fonts/Font.css';
import './Lobby.css';
import type { Game, GameSettings } from '../game/types/common';
import type { AppleGamePreset } from '../game/types/AppleGamePreset';
import type {
  FlappyBirdGamePreset,
  PipeGapPreset,
  PipeWidthPreset,
  PipeSpacingPreset,
  PipeSpeedPreset,
  RopeLengthPreset,
} from '../game/types/FlappyBirdGamePreset';
import type {
  MineSweeperGamePreset,
  MapSizePreset,
  DifficultyPreset,
  TimeLimit,
} from '../game/types/minesweeperPresets';
import { CONSTANTS } from '../game/types/common';
import SoundSetting from './SoundSetting';
import { useGameStore } from '../store/gameStore';
import { SystemPacketType } from '../../../common/src/packets';
import {
  MapSize,
  GameType,
  APPLE_GAME_CONFIG,
} from '../../../common/src/config.ts';
import type { AppleGameConfig } from '../../../common/src/config.ts';
import { socketManager } from '../network/socket';
import { type PlayerData } from '../../../common/src/packets';

export interface LobbyProps {
  players: PlayerData[];
  onGameStart: (gameType: string, preset: unknown) => void;
}

const {
  PLAYER_COLORS,
  MAX_PLAYERS,
  TOOLTIP_DURATION,
  MIN_TIME_LIMIT,
  MAX_TIME_LIMIT,
  DEFAULT_TIME_LIMIT,
} = CONSTANTS;

/** 난이도 색상 (쉬움/보통/어려움) */
const DIFFICULTY_COLORS = {
  easy: '#4CAF50',
  normal: '#FF9800',
  hard: '#F44336',
} as const;

function Lobby({ players, onGameStart }: LobbyProps) {
  // 게임 리스트
  const [games] = useState<Game[]>([
    { id: 'apple', name: '다같이 사과 게임', thumbnail: '🍎' },
    { id: 'flappy', name: '다같이 플래피 버드', thumbnail: '🐦' },
    { id: 'minesweeper', name: '다같이 지뢰찾기', thumbnail: '💣' },
  ]);

  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });
  const [showButtonTooltip, setShowButtonTooltip] = useState(false);
  const [showTimeLimitTooltip, setShowTimeLimitTooltip] = useState<
    Record<string, boolean>
  >({});

  // 각 게임의 설정 (기본값)
  const [gameSettings, setGameSettings] = useState<
    Record<string, GameSettings>
  >({
    apple: {
      mapSize: 'normal',
      timeLimit: 120,
      appleRange: '1-9',
      includeZero: false,
    },
    flappy: {
      pipeGap: 'normal', // 상하 파이프 간격
      pipeWidth: 'normal', // 파이프 넓이
      pipeSpacing: 'normal', // 좌우 파이프 간격
      pipeSpeed: 'normal', // 이동 속도
      ropeLength: 'normal', // 밧줄 길이
      connectAll: false, // 모두 묶기
    },
    minesweeper: {
      mapSize: 'medium',
      timeLimit: 180,
      mineRatio: 'normal', // easy: 10%, normal: 20%, hard: 30%
    },
  });

  // 방장 여부 확인 (myselfIndex가 변경될 때마다 리렌더링)
  const myselfIndex = useGameStore((s) => s.myselfIndex);
  const isHost = myselfIndex === 0;
  const isDisabled = !isHost;

  const handleSelectGame = (gameId: string) => {
    setSelectedGame(gameId);
    // send current settings to server
    const settings = gameSettings[gameId];
    sendGameConfigUpdate(gameId, settings);
  };

  const handleSettingChange = (
    gameId: string,
    setting: keyof GameSettings,
    value: string | number | boolean,
  ) => {
    setGameSettings((prev) => {
      const updated = {
        ...prev,
        [gameId]: { ...prev[gameId], [setting]: value },
      };
      // send updated settings to server immediately
      sendGameConfigUpdate(gameId, updated[gameId]);
      return updated;
    });
  };

  // Build and send GAME_CONFIG_UPDATE_REQ according to current settings
  const sendGameConfigUpdate = (
    gameId: string,
    settings: GameSettings | undefined,
  ) => {
    if (!settings) return;

    let selectedGameType = GameType.APPLE_GAME;
    if (gameId === 'apple') selectedGameType = GameType.APPLE_GAME;
    else if (gameId === 'flappy') selectedGameType = GameType.FLAPPY_BIRD;
    else if (gameId === 'minesweeper') selectedGameType = GameType.MINESWEEPER;

    // For now the only concrete GameConfig type is AppleGameConfig
    const appleCfg: AppleGameConfig = {
      mapSize: MapSize.MEDIUM,
      time: APPLE_GAME_CONFIG.totalTime,
      generation: 0,
      zero: APPLE_GAME_CONFIG.includeZero,
    };

    if (gameId === 'apple') {
      const s = settings as GameSettings;
      if (s.mapSize === 'small') appleCfg.mapSize = MapSize.SMALL;
      else if (s.mapSize === 'normal') appleCfg.mapSize = MapSize.MEDIUM;
      else if (s.mapSize === 'large') appleCfg.mapSize = MapSize.LARGE;

      // derive a valid time to send to server
      // if timeLimit is a number and not the sentinel -1, use it (covers manual input)
      // otherwise fall back to DEFAULT_TIME_LIMIT
      const timeVal =
        typeof s.timeLimit === 'number' && s.timeLimit !== -1
          ? s.timeLimit
          : DEFAULT_TIME_LIMIT;
      appleCfg.time = timeVal;

      // map appleRange to protocol generation (0 = easy (1-9), 1 = hard (1-5))
      if (s.appleRange === '1-5') appleCfg.generation = 1;
      else appleCfg.generation = 0;

      appleCfg.zero = !!s.includeZero;
    }

    const packet = {
      type: SystemPacketType.GAME_CONFIG_UPDATE_REQ,
      selectedGameType,
      gameConfig: appleCfg,
    } as const;

    socketManager.send(packet);
  };

  const showTooltip = (
    message: string,
    type: 'success' | 'error' = 'success',
  ) => {
    setTooltip({ show: true, message, type });
    setTimeout(() => {
      setTooltip({ show: false, message: '', type: 'success' });
    }, TOOLTIP_DURATION);
  };

  const showTimeLimitTooltipForGame = (gameId: string) => {
    setShowTimeLimitTooltip((prev) => ({ ...prev, [gameId]: true }));
    setTimeout(() => {
      setShowTimeLimitTooltip((prev) => ({ ...prev, [gameId]: false }));
    }, TOOLTIP_DURATION);
  };

  const handleCopyLink = () => {
    // TODO: 서버에서 받은 실제 초대 링크로 교체 필요
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    showTooltip('초대 링크가 복사되었습니다!', 'success');
  };

  const handleStartGame = () => {
    if (!selectedGame) {
      showTooltip('게임을 선택해주세요!', 'error');
      return;
    }

    // 사과 게임: gameStore.gameConfig를 사용하므로 별도 프리셋 불필요
    if (selectedGame === 'apple') {
      onGameStart('apple', null);
      const settings = gameSettings.apple;

      // mapSize를 gridSize로 변환
      let gridSize: 'S' | 'M' | 'L' = 'M';
      if (settings.mapSize === 'small') gridSize = 'S';
      else if (settings.mapSize === 'normal') gridSize = 'M';
      else if (settings.mapSize === 'large') gridSize = 'L';

      // appleRange를 numberRange로 변환
      let numberRange: '1-9' | '1-5' = '1-9';
      if (settings.appleRange === '1-5') numberRange = '1-5';

      // TODO 서버가 프리셋 가지고 있어야 하는 것. GAME_CONFIG_UPDATE
      const preset: AppleGamePreset = {
        gridSize,
        timeLimit:
          typeof settings.timeLimit === 'number' && settings.timeLimit !== -1
            ? settings.timeLimit
            : 120,
        numberRange,
        includeZero: settings.includeZero || false,
      };

      onGameStart('apple', preset);
    } else if (selectedGame === 'flappy') {
      const settings = gameSettings.flappy;

      const preset: FlappyBirdGamePreset = {
        pipeGap: (settings.pipeGap || 'normal') as PipeGapPreset,
        pipeWidth: (settings.pipeWidth || 'normal') as PipeWidthPreset,
        pipeSpacing: (settings.pipeSpacing || 'normal') as PipeSpacingPreset,
        pipeSpeed: (settings.pipeSpeed || 'normal') as PipeSpeedPreset,
        ropeLength: (settings.ropeLength || 'normal') as RopeLengthPreset,
        connectAll: settings.connectAll ?? false,
      };
      onGameStart('flappy', preset);
    } else if (selectedGame === 'minesweeper') {
      const settings = gameSettings.minesweeper;

      // mapSize 변환
      let mapSize: MapSizePreset = 'medium';
      if (settings.mapSize === 'small') mapSize = 'small';
      else if (settings.mapSize === 'medium') mapSize = 'medium';
      else if (settings.mapSize === 'large') mapSize = 'large';

      // difficulty 변환 (mineRatio)
      let difficulty: DifficultyPreset = 'normal';
      if (settings.mineRatio === 'easy') difficulty = 'easy';
      else if (settings.mineRatio === 'normal') difficulty = 'normal';
      else if (settings.mineRatio === 'hard') difficulty = 'hard';

      const preset: MineSweeperGamePreset = {
        mapSize,
        difficulty,
        timeLimit:
          settings.timeLimit === -1
            ? 'manual'
            : (settings.timeLimit as TimeLimit),
        manualTime:
          settings.timeLimit === -1 || ![120, 180, 240].includes(settings.timeLimit || 0)
            ? settings.timeLimit
            : undefined,
      };

      onGameStart('minesweeper', preset);
    }
  };

  // React to server-provided game config updates
  const serverSelectedGame = useGameStore((s) => s.selectedGameType);
  const serverGameConfig = useGameStore((s) => s.gameConfig);

  useEffect(() => {
    if (!serverSelectedGame || !serverGameConfig) return;

    // Map common GameType to local game id
    if (serverSelectedGame === ('APPLE_GAME' as unknown as GameType)) {
      // schedule selection update to avoid synchronous setState in effect
      setTimeout(() => setSelectedGame('apple'));

      const cfg = serverGameConfig as AppleGameConfig;

      let mapSize: 'small' | 'normal' | 'large' = 'normal';
      if (cfg.mapSize === (MapSize.SMALL as unknown as MapSize))
        mapSize = 'small';
      else if (cfg.mapSize === (MapSize.MEDIUM as unknown as MapSize))
        mapSize = 'normal';
      else if (cfg.mapSize === (MapSize.LARGE as unknown as MapSize))
        mapSize = 'large';

      // generation -> appleRange (protocol uses 0/1)
      let appleRange: '1-9' | '1-5' = '1-9';
      if (cfg.generation === 1) appleRange = '1-5';

      setTimeout(() => {
        setGameSettings((prev) => ({
          ...prev,
          apple: {
            ...prev.apple,
            mapSize,
            timeLimit: cfg.time,
            appleRange,
            includeZero: !!cfg.zero,
          },
        }));
      });
    } else if (serverSelectedGame === ('FLAPPY_BIRD' as unknown as GameType)) {
      setTimeout(() => setSelectedGame('flappy'));
    } else if (serverSelectedGame === ('MINESWEEPER' as unknown as GameType)) {
      setTimeout(() => setSelectedGame('minesweeper'));
    }
  }, [serverSelectedGame, serverGameConfig]);

  // 빈 슬롯 생성
  const emptySlots = Array(MAX_PLAYERS - players.length).fill(null);

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
                  key={`player-${index}`}
                  className="player-item"
                  style={{ borderColor: player.color }}
                >
                  <div
                    className="player-color-indicator"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="player-name">{player.playerName}</span>
                  {index == 0 && (
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
            <div className="section-header">
              <h2 className="section-title">게임 선택</h2>
              <div className="difficulty-legend">
                <span className="legend-label">난이도:</span>
                <span style={{ color: DIFFICULTY_COLORS.easy }}>쉬움</span>
                <span style={{ color: DIFFICULTY_COLORS.normal }}>보통</span>
                <span style={{ color: DIFFICULTY_COLORS.hard }}>어려움</span>
              </div>
            </div>
            <div className="game-list">
              {/* 이거 map 이어야 함? */}
              {games.map((game) => {
                const settings = gameSettings[game.id];

                return (
                  // 이거 다 컴포넌트로 분리 가능한 거 아님?
                  <div
                    key={game.id}
                    className={`game-item ${
                      selectedGame === game.id ? 'selected' : ''
                    } ${
                      selectedGame && selectedGame !== game.id ? 'dimmed' : ''
                    } ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => !isDisabled && handleSelectGame(game.id)}
                  >
                    {isDisabled && (
                      <span className="game-item-tooltip">
                        방장만 게임을 선택할 수 있습니다
                      </span>
                    )}
                    <div className="game-thumbnail">{game.thumbnail}</div>
                    <div className="game-info">
                      <h3 className="game-name">{game.name}</h3>
                      {game.id === 'apple' ? (
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
                            <div className="nes-select is-small">
                              <select
                                value={settings.mapSize}
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    'mapSize',
                                    e.target.value,
                                  )
                                }
                                onFocus={() => handleSelectGame(game.id)}
                                style={{
                                  color:
                                    settings.mapSize === 'large'
                                      ? DIFFICULTY_COLORS.easy
                                      : settings.mapSize === 'normal'
                                        ? DIFFICULTY_COLORS.normal
                                        : DIFFICULTY_COLORS.hard,
                                }}
                              >
                                <option value="large" style={{ color: DIFFICULTY_COLORS.easy }}>큼 (30x15)</option>
                                <option value="normal" style={{ color: DIFFICULTY_COLORS.normal }}>보통 (20x10)</option>
                                <option value="small" style={{ color: DIFFICULTY_COLORS.hard }}>작음 (16x8)</option>
                              </select>
                            </div>
                          </div>
                          <div className="setting-item time-limit-setting">
                            <label>제한 시간:</label>
                            {settings.timeLimit === -1 ||
                            (![180, 120, 90].includes(
                              settings.timeLimit || 0,
                            ) &&
                              settings.timeLimit !== undefined) ? (
                              <input
                                type="number"
                                value={
                                  settings.timeLimit === -1
                                    ? ''
                                    : settings.timeLimit
                                }
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    'timeLimit',
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : -1,
                                  )
                                }
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                className="nes-input is-small"
                                placeholder="초"
                                min={MIN_TIME_LIMIT}
                                max={MAX_TIME_LIMIT}
                                autoFocus
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!e.target.value) {
                                    // 빈 값이면 셀렉트로 돌아가기
                                    handleSettingChange(
                                      game.id,
                                      'timeLimit',
                                      DEFAULT_TIME_LIMIT,
                                    );
                                  } else if (
                                    val < MIN_TIME_LIMIT ||
                                    val > MAX_TIME_LIMIT
                                  ) {
                                    showTimeLimitTooltipForGame(game.id);
                                    setTimeout(() => {
                                      handleSettingChange(
                                        game.id,
                                        'timeLimit',
                                        DEFAULT_TIME_LIMIT,
                                      );
                                    }, 100);
                                  }
                                }}
                              />
                            ) : (
                              <div className="nes-select is-small">
                                <select
                                  value={settings.timeLimit}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    handleSettingChange(
                                      game.id,
                                      'timeLimit',
                                      val,
                                    );
                                  }}
                                  onFocus={() => handleSelectGame(game.id)}
                                  style={{
                                    color:
                                      settings.timeLimit === 180
                                        ? DIFFICULTY_COLORS.easy
                                        : settings.timeLimit === 120
                                          ? DIFFICULTY_COLORS.normal
                                          : DIFFICULTY_COLORS.hard,
                                  }}
                                >
                                  <option value={180} style={{ color: DIFFICULTY_COLORS.easy }}>180초</option>
                                  <option value={120} style={{ color: DIFFICULTY_COLORS.normal }}>120초</option>
                                  <option value={90} style={{ color: DIFFICULTY_COLORS.hard }}>90초</option>
                                  <option value={-1}>직접 입력</option>
                                </select>
                              </div>
                            )}
                            {showTimeLimitTooltip[game.id] && (
                              <div className="time-limit-tooltip">
                                제한 시간은 30-300초 사이로 설정해주세요
                              </div>
                            )}
                          </div>
                          <div className="setting-item">
                            <label>사과 생성:</label>
                            <div className="nes-select is-small">
                              <select
                                value={settings.appleRange}
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    'appleRange',
                                    e.target.value,
                                  )
                                }
                                onFocus={() => handleSelectGame(game.id)}
                                style={{
                                  color:
                                    settings.appleRange === '1-9'
                                      ? DIFFICULTY_COLORS.easy
                                      : DIFFICULTY_COLORS.hard,
                                }}
                              >
                                <option value="1-9" style={{ color: DIFFICULTY_COLORS.easy }}>쉬움(1-9)</option>
                                <option value="1-5" style={{ color: DIFFICULTY_COLORS.hard }}>어려움(1-5)</option>
                              </select>
                            </div>
                          </div>
                          <div className="setting-item">
                            <label>0 생성:</label>
                            <div className="radio-group">
                              <label>
                                <input
                                  type="radio"
                                  className="nes-radio"
                                  name={`includeZero-${game.id}`}
                                  checked={!settings.includeZero}
                                  onChange={() =>
                                    handleSettingChange(
                                      game.id,
                                      'includeZero',
                                      false,
                                    )
                                  }
                                  onFocus={() => handleSelectGame(game.id)}
                                />
                                <span style={{ color: DIFFICULTY_COLORS.easy }}>X</span>
                              </label>
                              <label>
                                <input
                                  type="radio"
                                  className="nes-radio"
                                  name={`includeZero-${game.id}`}
                                  checked={settings.includeZero}
                                  onChange={() =>
                                    handleSettingChange(
                                      game.id,
                                      'includeZero',
                                      true,
                                    )
                                  }
                                  onFocus={() => handleSelectGame(game.id)}
                                />
                                <span style={{ color: DIFFICULTY_COLORS.hard }}>O</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ) : game.id === 'flappy' ? (
                        <div
                          className="settings-edit settings-flappy"
                          onClick={(e) => {
                            if (selectedGame !== game.id) {
                              handleSelectGame(game.id);
                            }
                            e.stopPropagation();
                          }}
                        >
                          <div className="setting-item">
                            <label>상하 간격:</label>
                            <div className="nes-select is-small">
                              <select
                                value={settings.pipeGap}
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    'pipeGap',
                                    e.target.value,
                                  )
                                }
                                onFocus={() => handleSelectGame(game.id)}
                                style={{
                                  color:
                                    settings.pipeGap === 'wide'
                                      ? DIFFICULTY_COLORS.easy
                                      : settings.pipeGap === 'normal'
                                        ? DIFFICULTY_COLORS.normal
                                        : DIFFICULTY_COLORS.hard,
                                }}
                              >
                                <option value="wide" style={{ color: DIFFICULTY_COLORS.easy }}>넓음</option>
                                <option value="normal" style={{ color: DIFFICULTY_COLORS.normal }}>보통</option>
                                <option value="narrow" style={{ color: DIFFICULTY_COLORS.hard }}>좁음</option>
                              </select>
                            </div>
                          </div>
                          <div className="setting-item">
                            <label>파이프 넓이:</label>
                            <div className="nes-select is-small">
                              <select
                                value={settings.pipeWidth}
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    'pipeWidth',
                                    e.target.value,
                                  )
                                }
                                onFocus={() => handleSelectGame(game.id)}
                                style={{
                                  color:
                                    settings.pipeWidth === 'narrow'
                                      ? DIFFICULTY_COLORS.easy
                                      : settings.pipeWidth === 'normal'
                                        ? DIFFICULTY_COLORS.normal
                                        : DIFFICULTY_COLORS.hard,
                                }}
                              >
                                <option value="narrow" style={{ color: DIFFICULTY_COLORS.easy }}>좁음</option>
                                <option value="normal" style={{ color: DIFFICULTY_COLORS.normal }}>보통</option>
                                <option value="wide" style={{ color: DIFFICULTY_COLORS.hard }}>넓음</option>
                              </select>
                            </div>
                          </div>
                          <div className="setting-item">
                            <label>좌우 간격:</label>
                            <div className="nes-select is-small">
                              <select
                                value={settings.pipeSpacing}
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    'pipeSpacing',
                                    e.target.value,
                                  )
                                }
                                onFocus={() => handleSelectGame(game.id)}
                                style={{
                                  color:
                                    settings.pipeSpacing === 'wide'
                                      ? DIFFICULTY_COLORS.easy
                                      : settings.pipeSpacing === 'normal'
                                        ? DIFFICULTY_COLORS.normal
                                        : DIFFICULTY_COLORS.hard,
                                }}
                              >
                                <option value="wide" style={{ color: DIFFICULTY_COLORS.easy }}>넓음</option>
                                <option value="normal" style={{ color: DIFFICULTY_COLORS.normal }}>보통</option>
                                <option value="narrow" style={{ color: DIFFICULTY_COLORS.hard }}>좁음</option>
                              </select>
                            </div>
                          </div>
                          <div className="setting-item">
                            <label>이동 속도:</label>
                            <div className="nes-select is-small">
                              <select
                                value={settings.pipeSpeed}
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    'pipeSpeed',
                                    e.target.value,
                                  )
                                }
                                onFocus={() => handleSelectGame(game.id)}
                                style={{
                                  color:
                                    settings.pipeSpeed === 'slow'
                                      ? DIFFICULTY_COLORS.easy
                                      : settings.pipeSpeed === 'normal'
                                        ? DIFFICULTY_COLORS.normal
                                        : DIFFICULTY_COLORS.hard,
                                }}
                              >
                                <option value="slow" style={{ color: DIFFICULTY_COLORS.easy }}>느림</option>
                                <option value="normal" style={{ color: DIFFICULTY_COLORS.normal }}>보통</option>
                                <option value="fast" style={{ color: DIFFICULTY_COLORS.hard }}>빠름</option>
                              </select>
                            </div>
                          </div>
                          <div className="setting-item">
                            <label>줄 길이:</label>
                            <div className="nes-select is-small">
                              <select
                                value={settings.ropeLength}
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    'ropeLength',
                                    e.target.value,
                                  )
                                }
                                onFocus={() => handleSelectGame(game.id)}
                                style={{
                                  color:
                                    settings.ropeLength === 'long'
                                      ? DIFFICULTY_COLORS.easy
                                      : settings.ropeLength === 'normal'
                                        ? DIFFICULTY_COLORS.normal
                                        : DIFFICULTY_COLORS.hard,
                                }}
                              >
                                <option value="long" style={{ color: DIFFICULTY_COLORS.easy }}>길음</option>
                                <option value="normal" style={{ color: DIFFICULTY_COLORS.normal }}>보통</option>
                                <option value="short" style={{ color: DIFFICULTY_COLORS.hard }}>짧음</option>
                              </select>
                            </div>
                          </div>

                          {/* 모두 묶기 라디오 */}
                          <div className="setting-item">
                            <label>모두 묶기:</label>
                            <div className="radio-group">
                              <label>
                                <input
                                  type="radio"
                                  className="nes-radio"
                                  name={`connectAll-${game.id}`}
                                  checked={!settings.connectAll}
                                  onChange={() =>
                                    handleSettingChange(
                                      game.id,
                                      'connectAll',
                                      false,
                                    )
                                  }
                                  onFocus={() => handleSelectGame(game.id)}
                                />
                                <span style={{ color: DIFFICULTY_COLORS.easy }}>X</span>
                              </label>
                              <label>
                                <input
                                  type="radio"
                                  className="nes-radio"
                                  name={`connectAll-${game.id}`}
                                  checked={settings.connectAll ?? false}
                                  onChange={() =>
                                    handleSettingChange(
                                      game.id,
                                      'connectAll',
                                      true,
                                    )
                                  }
                                  onFocus={() => handleSelectGame(game.id)}
                                />
                                <span style={{ color: DIFFICULTY_COLORS.hard }}>O</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ) : game.id === 'minesweeper' ? (
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
                            <div className="nes-select is-small">
                              <select
                                value={settings.mapSize}
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    'mapSize',
                                    e.target.value,
                                  )
                                }
                                onFocus={() => handleSelectGame(game.id)}
                                style={{
                                  color:
                                    settings.mapSize === 'large'
                                      ? DIFFICULTY_COLORS.easy
                                      : settings.mapSize === 'medium'
                                        ? DIFFICULTY_COLORS.normal
                                        : DIFFICULTY_COLORS.hard,
                                }}
                              >
                                <option value="large" style={{ color: DIFFICULTY_COLORS.easy }}>큼 (60x30)</option>
                                <option value="medium" style={{ color: DIFFICULTY_COLORS.normal }}>보통 (40x20)</option>
                                <option value="small" style={{ color: DIFFICULTY_COLORS.hard }}>작음 (20x10)</option>
                              </select>
                            </div>
                          </div>
                          <div className="setting-item time-limit-setting">
                            <label>제한 시간:</label>
                            {settings.timeLimit === -1 ||
                            (![240, 180, 120].includes(
                              settings.timeLimit || 0,
                            ) &&
                              settings.timeLimit !== undefined) ? (
                              <input
                                type="number"
                                value={
                                  settings.timeLimit === -1
                                    ? ''
                                    : settings.timeLimit
                                }
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    'timeLimit',
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : -1,
                                  )
                                }
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                className="nes-input is-small"
                                placeholder="초"
                                min={MIN_TIME_LIMIT}
                                max={MAX_TIME_LIMIT}
                                autoFocus
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!e.target.value) {
                                    handleSettingChange(
                                      game.id,
                                      'timeLimit',
                                      180,
                                    );
                                  } else if (
                                    val < MIN_TIME_LIMIT ||
                                    val > MAX_TIME_LIMIT
                                  ) {
                                    showTimeLimitTooltipForGame(game.id);
                                    setTimeout(() => {
                                      handleSettingChange(
                                        game.id,
                                        'timeLimit',
                                        180,
                                      );
                                    }, 100);
                                  }
                                }}
                              />
                            ) : (
                              <div className="nes-select is-small">
                                <select
                                  value={settings.timeLimit}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    handleSettingChange(
                                      game.id,
                                      'timeLimit',
                                      val,
                                    );
                                  }}
                                  onFocus={() => handleSelectGame(game.id)}
                                  style={{
                                    color:
                                      settings.timeLimit === 240
                                        ? DIFFICULTY_COLORS.easy
                                        : settings.timeLimit === 180
                                          ? DIFFICULTY_COLORS.normal
                                          : DIFFICULTY_COLORS.hard,
                                  }}
                                >
                                  <option value={240} style={{ color: DIFFICULTY_COLORS.easy }}>240초</option>
                                  <option value={180} style={{ color: DIFFICULTY_COLORS.normal }}>180초</option>
                                  <option value={120} style={{ color: DIFFICULTY_COLORS.hard }}>120초</option>
                                  <option value={-1}>직접 입력</option>
                                </select>
                              </div>
                            )}
                            {showTimeLimitTooltip[game.id] && (
                              <div className="time-limit-tooltip">
                                제한 시간은 30-300초 사이로 설정해주세요
                              </div>
                            )}
                          </div>
                          <div className="setting-item">
                            <label>지뢰 비율:</label>
                            <div className="nes-select is-small">
                              <select
                                value={settings.mineRatio}
                                onChange={(e) =>
                                  handleSettingChange(
                                    game.id,
                                    'mineRatio',
                                    e.target.value,
                                  )
                                }
                                onFocus={() => handleSelectGame(game.id)}
                                style={{
                                  color:
                                    settings.mineRatio === 'easy'
                                      ? DIFFICULTY_COLORS.easy
                                      : settings.mineRatio === 'normal'
                                        ? DIFFICULTY_COLORS.normal
                                        : DIFFICULTY_COLORS.hard,
                                }}
                              >
                                <option value="easy" style={{ color: DIFFICULTY_COLORS.easy }}>10%</option>
                                <option value="normal" style={{ color: DIFFICULTY_COLORS.normal }}>20%</option>
                                <option value="hard" style={{ color: DIFFICULTY_COLORS.hard }}>30%</option>
                              </select>
                            </div>
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

      {/* 툴팁 */}
      {tooltip.show && (
        <div className={`lobby-tooltip ${tooltip.type}`}>{tooltip.message}</div>
      )}

      {/* 소리 설정 */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
        }}
      >
        <SoundSetting />
      </div>

      {/* 하단: 버튼들 */}
      <div className="lobby-footer">
        <button className="nes-btn" onClick={handleCopyLink}>
          <i className="nes-icon is-small link"></i>
          초대 링크 복사
        </button>
        <div
          className="button-wrapper"
          onMouseEnter={() =>
            (!selectedGame || isDisabled || players.length < 2) && setShowButtonTooltip(true)
          }
          onMouseLeave={() => setShowButtonTooltip(false)}
        >
          <button
            className="nes-btn is-primary"
            onClick={handleStartGame}
            disabled={!selectedGame || isDisabled || players.length < 2}
          >
            게임 시작
          </button>
          {showButtonTooltip && !isHost && (
            <div className="button-tooltip">
              {'방장만 게임을 시작할 수 있습니다.'}
            </div>
          )}
          {showButtonTooltip &&
            isHost &&
            (players.length < 2 || !selectedGame) && (
              <div className="button-tooltip">
                {players.length < 2
                  ? '최소 2명이 있어야 진행할 수 있습니다.'
                  : '게임을 선택해주세요'}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;
