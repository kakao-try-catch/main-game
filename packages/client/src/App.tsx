import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GameContainer } from './game/GameContainer';
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
import { GameType } from '../../common/src/config';
import type { PlayerId } from './game/types/flappybird.types';
import {
  SystemPacketType,
  type JoinRoomPacket,
  type ServerPacket,
} from '../../common/src/packets';
import flappyBird1 from './assets/images/flappybird_1.png';
import flappyBird2 from './assets/images/flappybird_2.png';
import flappyBird3 from './assets/images/flappybird_3.png';
import flappyBird4 from './assets/images/flappybird_4.png';

import './App.css';
import { socketManager } from './network/socket';

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
  // const { nickname, color, setUserInfo } = useUser();

  // const [currentScreen, setCurrentScreen] = useState<
  //   'landing' | 'lobby' | 'game' | 'flappybird'
  // >('landing');
  const screen = useGameStore((s) => s.screen);

  const [gameReady, setGameReady] = useState(false);
  const isGameStarted = useGameStore((s) => s.isGameStarted);
  const setGameStarted = useGameStore((s) => s.setGameStarted);
  const gameRef = useRef<Phaser.Game | null>(null);

  // 플래피버드 관련 상태 - store에서 직접 구독
  const [flappyScore, setFlappyScore] = useState(0); // 팀 점수 (UI 표시용)
  const isFlappyGameOver = useGameStore((s) => s.isFlappyGameOver);
  const flappyGameOverData = useGameStore((s) => s.flappyGameOverData);

  // players: prefer server-provided players (from zustand store), fallback to currentPlayer
  const players = useGameStore((s) => s.players);
  const setPlayers = useGameStore((s) => s.setPlayers);

  // FlappyBird 게임 오버 데이터를 GameResult가 기대하는 형식으로 변환
  const flappyFinalData = useMemo(() => {
    if (!isFlappyGameOver || !flappyGameOverData) return null;
    return {
      finalScore: flappyGameOverData.finalScore,
      reason: flappyGameOverData.reason,
      collidedPlayerId: String(flappyGameOverData.collidedPlayerIndex) as PlayerId,
      players: players.map((p, i) => ({
        ...p,
        playerIndex: i,
      })),
    };
  }, [isFlappyGameOver, flappyGameOverData, players]);

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

  // 게임 종료 시 BGM/SFX 처리 (store에서 isFlappyGameOver 변경 감지)
  const resetFlappyState = useGameStore((s) => s.resetFlappyState);
  useEffect(() => {
    if (isFlappyGameOver) {
      playSFX('appleGameEnd');
      pause();
      reset();
    }
  }, [isFlappyGameOver, playSFX, pause, reset]);

  // 플래피버드 점수 업데이트 핸들러
  // todo 이거 setFlappyScore 제거 해줘야 함. 통합 대상.
  const handleFlappyScoreUpdate = useCallback((score: number) => {
    setFlappyScore(score);
  }, []);

  // 지뢰찾기 점수 업데이트 핸들러
  const handleMinesweeperScoreUpdate = useCallback(
    (data: {
      playerIndex: number;
      scoreChange: number;
      newScore: number;
      reason: string;
    }) => {
      try {
        setPlayers((prevPlayers) =>
          prevPlayers.map((player, index) =>
            index === data.playerIndex
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
    [],
  );

  // 게임 세션이 새로 시작될 때(리플레이 포함) 관련 상태 초기화
  useEffect(() => {
    if (gameSessionId > 0) {
      console.log(
        `[App] Game Session ${gameSessionId} started - resetting states`,
      );
      setFlappyScore(0);
      resetFlappyState(); // store의 FlappyBird 상태 초기화
      // 플레이어 점수 초기화
      setPlayers((prev) =>
        prev.map((p) => ({ ...p, reportCard: { ...p.reportCard, score: 0 } })),
      );
    }
  }, [gameSessionId, setPlayers, resetFlappyState]);

  const handleReplay = useCallback(() => {
    console.log('[App] handleReplay 호출됨');

    // 서버에 리플레이 요청 전송
    const replayReq: ServerPacket = {
      type: SystemPacketType.REPLAY_REQ,
    };
    socketManager.send(replayReq);
    console.log('[App] REPLAY_REQ sent');
    //     // 상태 초기화
    // setGameReady(false); // 재마운트 후 onGameReady에서 다시 true로 올려 BGM play 트리거
    // setGameEnded(false);
    // setFlappyGameEnded(false);
    // setFlappyScore(0);
    // setFlappyFinalData(null);
    // setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));

    // 나머지 처리는 서버의 READY_SCENE 패킷을 받았을 때 처리됨
  }, []);

  const handleLobby = useCallback(() => {
    // 서버에 로비 복귀 요청 전송
    const lobbyReq: ServerPacket = {
      type: SystemPacketType.RETURN_TO_THE_LOBBY_REQ,
    };
    socketManager.send(lobbyReq);
    console.log('[App] RETURN_TO_THE_LOBBY_REQ sent');
    //     setGameReady(false); // 로비로 복귀 시 BGM 재생 트리거를 초기화
    // setGameEnded(false);
    // setFlappyGameEnded(false);
    // setFlappyScore(0);
    // setFlappyFinalData(null);
    // setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    // reset(); // 로비로 복귀 시에도 BGM을 처음으로 되감기
    // setCurrentScreen('lobby');

    // 나머지 처리는 서버의 RETURN_TO_THE_LOBBY 패킷을 받았을 때 처리됨
  }, []);

  // 닉네임 설정하고 시작 버튼 누를 때 동작
  const handleStart = (inputNickname: string) => {
    // todo 색상도 서버가 알아서 줌.
    // const userColor = PLAYER_COLORS[0]; // 처음 유저는 첫 번째 색상
    // // todo 이거 이렇게 할 필요없고 내가 그 방의 몇 번째인지만 관리해주면 될 것 같음. number로.
    // // todo 그 다음에는 gameStore의 players에서 index 찍어서 내 PlayerData 뽑아내고 그걸로 보면 될 듯?
    // setUserInfo(inputNickname, userColor, true);
    // setCurrentUser((prev) => ({ ...prev, name: inputNickname }));
    //
    // setPlayers((prev) =>
    //   prev.map((player, index) =>
    //     index === 0
    //       ? { ...player, playerName: inputNickname, color: userColor }
    //       : player,
    //   ),
    // );
    // URL에서 roomId 추출
    let roomId = '';
    const path = window.location.pathname;

    if (path.includes('/invite/')) {
      // /invite/{roomId} 형식에서 roomId 추출
      const parts = path.split('/invite/');
      if (parts.length > 1) {
        roomId = parts[1].split('/')[0]; // /invite/ 다음의 첫 번째 세그먼트 가져오기
      }
    }

    const joinRoomPacket: JoinRoomPacket = {
      type: SystemPacketType.JOIN_ROOM,
      roomId: roomId, // URL에서 추출한 roomId 또는 빈 문자열
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

      {/* <SocketCounter /> */}

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
          {/* TODO: score는 추후 ReportCard 통합 후 재작업 예정 */}
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
          {currentGameType === GameType.FLAPPY_BIRD && ( // todo/merge:  GameType.FLAPPY_BIRD
            <>
              {players.slice(0, testPlayerCount).map((player, index) => (
                <PlayerCard
                  key={index}
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
                color="#209cee" // 메인 커러
              />
            </>
          )}

          {/* 지뢰찾기: 4개 플레이어카드 */}
          {currentGameType === GameType.MINESWEEPER &&
            players
              .slice(0, testPlayerCount)
              .map((player, index) => (
                <PlayerCard
                  key={index}
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
        {currentGameType && ( // todo/merge: isGameStarted && !flappyGameEnded && currentGameType && (
          <GameContainer
            key={gameSessionId}
            gameType={currentGameType}
            playerCount={players.length}
            players={players}
            flappyPreset={flappyPreset}
            minesweeperPreset={minesweeperPreset}
            onScoreUpdate={handleFlappyScoreUpdate}
            onMinesweeperScoreUpdate={handleMinesweeperScoreUpdate}
            onGameReady={handleGameReady}
          />
        )}
        <GameResult
          currentGameType={currentGameType}
          gameEnded={!isGameStarted}
          finalPlayers={players.map((p, i) => ({ ...p, playerIndex: i }))}
          flappyGameEnded={isFlappyGameOver}
          flappyFinalData={flappyFinalData}
          onReplay={handleReplay}
          onLobby={handleLobby}
          ratio={gameResultRatio}
        />
      </main>
    </div>
  );
}
// todo/merge: 이전 게임 결과창
// {/* 사과게임 결과 모달 */}
//         {!isGameStarted && (
//           <GameResult
//             onReplay={handleReplay}
//             onLobby={handleLobby}
//             title="APPLE GAME TOGETHER"
//             ratio={
//               (window as Window & { __GAME_RATIO?: number }).__GAME_RATIO || 1
//             }
//           />
//         )}
//         {/* 플래피버드 결과 모달 */}
//         {flappyGameEnded && flappyFinalData && (
//           <FlappyBirdResult
//             finalScore={flappyFinalData.finalScore}
//             reason={
//               flappyFinalData.reason as 'pipe_collision' | 'ground_collision'
//             }
//             onReplay={handleReplay}
//             onLobby={handleLobby}
//             ratio={
//               (window as Window & { __GAME_RATIO?: number }).__GAME_RATIO || 1
//             }
//           />
//         )}

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
