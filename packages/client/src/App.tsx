import { useState, useCallback, useRef, useEffect } from 'react';
import { GameContainer, type GameEndEvent } from './game/GameContainer';
import { BGMProvider, useBGMContext } from './contexts/BGMContext';
import { SFXProvider, useSFXContext } from './contexts/SFXContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { useGameStore } from './store/gameStore';

import PlayerCard from './components/PlayerCard';
import GameResult from './game/utils/game-result/GameResult';
import SoundSetting from './components/SoundSetting';
import LandingPage from './components/LandingPage';
import Lobby from './components/Lobby';
import type { FlappyBirdGamePreset } from './game/types/FlappyBirdGamePreset';
import {
  type MineSweeperGamePreset,
  DEFAULT_MINESWEEPER_PRESET,
} from './game/types/minesweeper.types';
import type { PlayerResultData } from './game/types/common';
import type { PlayerId } from './game/types/flappybird.types';
import { CONSTANTS } from './game/types/common';
import {
  SystemPacketType,
  type JoinRoomPacket,
  type ServerPacket,
} from '../../common/src/packets';
import { GameType } from '../../common/src/config.ts';
import flappyBird1 from './assets/images/flappybird_1.png';
import flappyBird2 from './assets/images/flappybird_2.png';
import flappyBird3 from './assets/images/flappybird_3.png';
import flappyBird4 from './assets/images/flappybird_4.png';

import './App.css';
import { socketManager } from './network/socket';

const { PLAYER_COLORS } = CONSTANTS;
const FLAPPY_BIRD_SPRITES = [
  flappyBird1,
  flappyBird2,
  flappyBird3,
  flappyBird4,
];

function AppContent() {
  const testPlayerCount = 4;
  const { pause, reset } = useBGMContext();
  const { playSFX } = useSFXContext();

  // todo 제거 예정
  const { nickname, color, setUserInfo } = useUser();

  const screen = useGameStore((s) => s.screen);
  // setScreen은 clientHandler에서 서버 패킷 수신 시 호출됨

  const [gameReady, setGameReady] = useState(false);
  const isGameStarted = useGameStore((s) => s.isGameStarted);
  const setGameStarted = useGameStore((s) => s.setGameStarted);
  const gameRef = useRef<Phaser.Game | null>(null);

  // 게임 종료 관련 상태
  const [gameEnded, setGameEnded] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState<PlayerResultData[]>([]);

  // 플래피버드 관련 상태
  const [flappyScore, setFlappyScore] = useState(0);
  const [flappyGameEnded, setFlappyGameEnded] = useState(false);
  const [flappyFinalData, setFlappyFinalData] = useState<{
    finalScore: number;
    reason: 'pipe_collision' | 'ground_collision';
    collidedPlayerId: PlayerId;
    players: PlayerResultData[];
  } | null>(null);

  // players: prefer server-provided players (from zustand store), fallback to currentPlayer
  const players = useGameStore((s) => s.players);
  const setPlayers = useGameStore((s) => s.setPlayers);

  // 현재 게임 타입 및 프리셋 설정 (로비에서 받아옴)
  const currentGameType = useGameStore((s) => s.selectedGameType || undefined);
  const [flappyPreset, setFlappyPreset] = useState<
    FlappyBirdGamePreset | undefined
  >(undefined);
  const [minesweeperPreset, setMinesweeperPreset] = useState<
    MineSweeperGamePreset | undefined
  >(undefined);

  // 게임 컨테이너 재마운트를 위한 세션 ID (gameStore에서 관리)
  const gameSessionId = useGameStore((s) => s.gameSessionId);

  const handleGameReady = useCallback((game: Phaser.Game) => {
    console.log('Phaser game is ready!', game);
    gameRef.current = game;
    setGameReady(true);
  }, []);

  const handleGameEnd = useCallback(
    (data: GameEndEvent) => {
      if (data.gameType === 'flappy') {
        setFlappyFinalData({
          finalScore: data.finalScore,
          reason: data.reason as 'pipe_collision' | 'ground_collision',
          collidedPlayerId: data.collidedPlayerId,
          players: data.players,
        });
        setFlappyGameEnded(true);
      } else {
        setFinalPlayers(data.players);
        setGameEnded(true);
      }
      playSFX('appleGameEnd');
      pause();
      reset();
    },
    [playSFX, pause, reset],
  );

  // 플래피버드 점수 업데이트 핸들러
  const handleFlappyScoreUpdate = useCallback((score: number) => {
    setFlappyScore(score);
  }, []);

  // 플래피버드 게임 종료 핸들러
  const handleFlappyGameEnd = useCallback(
    (data: {
      finalScore: number;
      reason: 'pipe_collision' | 'ground_collision';
      players: PlayerResultData[];
      collidedPlayerId: PlayerId;
    }) => {
      setFlappyFinalData(data);
      setFlappyGameEnded(true);
      playSFX('appleGameEnd');
      pause();
    },
    [playSFX, pause],
  );

  // 플래피버드 점프 사운드 핸들러
  const handleFlappyJump = useCallback(() => {
    playSFX('flappyJump');
  }, [playSFX]);

  // 플래피버드 충돌 사운드 핸들러
  const handleFlappyStrike = useCallback(() => {
    playSFX('flappyStrike');
  }, [playSFX]);

  // 플래피버드 점수 획득 사운드 핸들러
  const handleFlappyScore = useCallback(() => {
    playSFX('flappyScore');
  }, [playSFX]);

  // 지뢰찾기 점수 업데이트 핸들러
  const handleMinesweeperScoreUpdate = useCallback(
    (data: {
      playerId: string;
      scoreChange: number;
      newScore: number;
      reason: string;
    }) => {
      try {
        setPlayers((prevPlayers) =>
          prevPlayers.map((player, index) =>
            index.toString() === data.playerId
              ? {
                  ...player,
                  reportCard: { ...player.reportCard, score: data.newScore },
                }
              : player,
          ),
        );
      } catch (error) {
        console.error('Minesweeper score update handler error:', error);
      }
    },
    [setPlayers],
  );

  // 게임 세션이 새로 시작될 때(리플레이 포함) 관련 상태 초기화
  // 서버의 READY_SCENE 패킷 수신 시 gameSessionId가 증가하여 트리거됨
  useEffect(() => {
    if (gameSessionId > 0) {
      console.log(
        `[App] Game Session ${gameSessionId} started - resetting states`,
      );
      setGameReady(false);
      setFlappyScore(0);
      setFlappyGameEnded(false);
      setFlappyFinalData(null);
      setGameEnded(false);
      setFinalPlayers([]);
      // 플레이어 점수 초기화
      setPlayers((prev) =>
        prev.map((p) => ({ ...p, reportCard: { ...p.reportCard, score: 0 } })),
      );
    }
  }, [gameSessionId, setPlayers]);

  const handleReplay = useCallback(() => {
    console.log('[App] handleReplay 호출됨');

    // 서버에 리플레이 요청 전송만 수행
    // 실제 상태 초기화는 서버의 READY_SCENE 패킷 수신 시 처리됨
    const replayReq: ServerPacket = {
      type: SystemPacketType.REPLAY_REQ,
    };
    socketManager.send(replayReq);
    console.log('[App] REPLAY_REQ sent');
  }, []);

  const handleLobby = useCallback(() => {
    // 서버에 로비 복귀 요청 전송만 수행
    // 실제 상태 초기화는 서버의 RETURN_TO_THE_LOBBY 패킷 수신 시 처리됨
    const lobbyReq: ServerPacket = {
      type: SystemPacketType.RETURN_TO_THE_LOBBY_REQ,
    };
    socketManager.send(lobbyReq);
    console.log('[App] RETURN_TO_THE_LOBBY_REQ sent');
  }, []);

  // 닉네임 설정하고 시작 버튼 누를 때 동작
  const handleStart = (inputNickname: string) => {
    const joinRoomPacket: JoinRoomPacket = {
      type: SystemPacketType.JOIN_ROOM,
      roomId: 'HARDCODED_ROOM_1',
      playerName: inputNickname,
    };
    socketManager.send(joinRoomPacket);
    console.log('JOIN_ROOM sent: ', joinRoomPacket);
  };

  const handleGameStart = (gameType: string, preset: unknown) => {
    // 플래피버드 프리셋만 로컬에서 관리 (사과게임은 gameStore.gameConfig 사용)
    if (gameType === 'flappy') {
      setFlappyPreset(preset as FlappyBirdGamePreset);
    } else if (gameType === 'minesweeper') {
      const minesweeperPreset =
        (preset as MineSweeperGamePreset | undefined)?.mapSize &&
        (preset as MineSweeperGamePreset | undefined)?.difficulty &&
        (preset as MineSweeperGamePreset | undefined)?.timeLimit
          ? (preset as MineSweeperGamePreset)
          : DEFAULT_MINESWEEPER_PRESET;
      setMinesweeperPreset(minesweeperPreset);
    }

    const gameStartReq: ServerPacket = {
      type: SystemPacketType.GAME_START_REQ || 'GAME_START_REQ',
    };
    socketManager.send(gameStartReq);
    console.log('GAME_START_REQ sent: ', gameStartReq);
  };

  // BGM 제어: 게임 종료 시에만 정지 (로비에서는 정지하지 않음)
  useEffect(() => {
    if (!isGameStarted) {
      pause();
      reset();
    }
  }, [isGameStarted, pause, reset]);

  const gameResultRatio =
    (window as Window & { __GAME_RATIO?: number }).__GAME_RATIO || 1;

  // 랜딩 페이지 표시
  if (screen === 'landing') {
    return <LandingPage onStart={handleStart} />;
  }

  // 로비 표시
  if (screen === 'lobby') {
    return <Lobby players={players} onGameStart={handleGameStart} />;
  }

  return (
    <div
      className="App"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
      }}
    >
      <header
        className="App-header"
        style={{
          width: '100%',
          textAlign: 'center',
          margin: '0',
          flexShrink: 0,
        }}
      />

      {/* 상단 영역 */}
      <div
        style={{
          width: '100%',
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          marginTop: '4px',
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        <div
          style={{
            ...playerListStyle,
            marginLeft: `0px`,
            position: 'relative',
            marginTop: '0px',
          }}
        >
          {/* 사과게임: 4개 플레이어카드 */}
          {currentGameType === GameType.APPLE_GAME &&
            players
              .slice(0, testPlayerCount)
              .map((player, index) => (
                <PlayerCard
                  key={`player-${index}`}
                  name={player.playerName}
                  score={player.reportCard.score}
                  color={player.color}
                />
              ))}

          {/* 플래피버드: 팀 점수 카드 1개 */}
          {currentGameType === GameType.FLAPPY_BIRD && (
            <>
              {players.slice(0, testPlayerCount).map((player, index) => (
                <PlayerCard
                  key={`player-${index}`}
                  name={player.playerName}
                  color={player.color}
                  spriteSrc={
                    FLAPPY_BIRD_SPRITES[index % FLAPPY_BIRD_SPRITES.length]
                  }
                  showScore={false}
                />
              ))}
              <PlayerCard
                key="team-score"
                name="Team Score"
                score={flappyScore}
                color="#209cee"
              />
            </>
          )}

          {/* 지뢰찾기: 4개 플레이어카드 */}
          {currentGameType === GameType.MINESWEEPER &&
            players
              .slice(0, testPlayerCount)
              .map((player, index) => (
                <PlayerCard
                  key={`player-${index}`}
                  name={player.playerName}
                  score={player.reportCard.score}
                  color={player.color}
                />
              ))}

          <SoundSetting gameReady={gameReady} />
        </div>
      </div>

      {/* 하단 영역 */}
      <main
        className="game-container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          flex: 4,
          margin: 0,
          padding: 0,
          minHeight: 0,
          maxHeight: '80vh',
          overflow: 'hidden',
        }}
      >
        {/* 게임 오버 후에도 씬 유지 (결과 모달이 씬 위에 표시됨) */}
        {currentGameType && (
          <GameContainer
            key={gameSessionId}
            gameType={currentGameType}
            playerCount={players.length}
            players={players}
            flappyPreset={flappyPreset}
            minesweeperPreset={minesweeperPreset}
            onGameEnd={handleGameEnd}
            onScoreUpdate={handleFlappyScoreUpdate}
            onFlappyJump={handleFlappyJump}
            onFlappyStrike={handleFlappyStrike}
            onFlappyScore={handleFlappyScore}
            onMinesweeperScoreUpdate={handleMinesweeperScoreUpdate}
            onGameReady={handleGameReady}
          />
        )}
        {/* 통합 게임 결과 모달 */}
        <GameResult
          currentGameType={
            currentGameType === GameType.APPLE_GAME
              ? 'apple'
              : currentGameType === GameType.FLAPPY_BIRD
                ? 'flappy'
                : currentGameType === GameType.MINESWEEPER
                  ? 'minesweeper'
                  : undefined
          }
          gameEnded={gameEnded}
          finalPlayers={finalPlayers}
          flappyGameEnded={flappyGameEnded}
          flappyFinalData={flappyFinalData}
          onReplay={handleReplay}
          onLobby={handleLobby}
          ratio={gameResultRatio}
        />
      </main>
    </div>
  );
}

const playerListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '0px',
  alignSelf: 'center',
  justifyContent: 'center',
};

export default function App() {
  return (
    <UserProvider>
      <BGMProvider>
        <SFXProvider>
          <AppContent />
        </SFXProvider>
      </BGMProvider>
    </UserProvider>
  );
}
