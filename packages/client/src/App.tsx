import { useState, useCallback, useRef, useEffect } from 'react';
import { GameContainer } from './game/GameContainer';
import { BGMProvider, useBGMContext } from './contexts/BGMContext';
import { SFXProvider, useSFXContext } from './contexts/SFXContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { useGameStore } from './store/gameStore';

import PlayerCard from './components/PlayerCard';
import GameResult from './game/utils/game-result/GameResult';
import FlappyBirdResult from './game/utils/game-result/FlappyBirdResult';
import SoundSetting from './components/SoundSetting';
import LandingPage from './components/LandingPage';
import Lobby from './components/Lobby';
import type { FlappyBirdGamePreset } from './game/types/FlappyBirdGamePreset';
import { CONSTANTS } from './game/types/common';
import {
  SystemPacketType,
  type JoinRoomPacket,
  type ServerPacket,
  type PlayerData,
} from '../../common/src/packets';
import { GameType } from '../../common/src/config.ts';

import './App.css';
import { socketManager } from './network/socket';
// import { use } from 'matter';

function AppContent() {
  const testPlayerCount = 4;
  const { pause } = useBGMContext();
  const { playSFX } = useSFXContext();

  // todo 제거 예정
  const { nickname, color, setUserInfo } = useUser();

  // const [currentScreen, setCurrentScreen] = useState<
  //   'landing' | 'lobby' | 'game' | 'flappybird'
  // >('landing');
  const screen = useGameStore((s) => s.screen);

  const [gameReady, setGameReady] = useState(false);
  const isGameStarted = useGameStore((s) => s.isGameStarted);
  const setGameStarted = useGameStore((s) => s.setGameStarted);
  const gameRef = useRef<Phaser.Game | null>(null);

  // 플래피버드 관련 상태 // todo 이거 왜 여기? 플레이로 통일
  const [flappyScore, setFlappyScore] = useState(0); // 팀 점수
  const [flappyGameEnded, setFlappyGameEnded] = useState(false); // 플래피버드 게임 종료 여부
  const [flappyFinalData, setFlappyFinalData] = useState<{
    finalScore: number;
    reason: string;
    players: PlayerData[];
  } | null>(null);

  // players: prefer server-provided players (from zustand store), fallback to currentPlayer
  const players = useGameStore((s) => s.players);
  const setPlayers = useGameStore((s) => s.setPlayers);

  // 현재 게임 타입 및 프리셋 설정 (로비에서 받아옴)
  const currentGameType = useGameStore((s) => s.selectedGameType || undefined);
  const [flappyPreset, setFlappyPreset] = useState<
    FlappyBirdGamePreset | undefined
  >(undefined);

  // 게임 컨테이너 재마운트를 위한 key
  const [gameKey, setGameKey] = useState(0);

  const handleGameReady = useCallback((game: Phaser.Game) => {
    console.log('Phaser game is ready!', game);
    gameRef.current = game;
    setGameReady(true);
  }, []);

  // 플래피버드 점수 업데이트 핸들러
  const handleFlappyScoreUpdate = useCallback((score: number) => {
    setFlappyScore(score);
  }, []);

  // 플래피버드 게임 종료 핸들러
  const handleFlappyGameEnd = useCallback(
    (data: {
      finalScore: number;
      reason: string;
      players: PlayerData[];
    }) => {
      setFlappyFinalData(data);
      setFlappyGameEnded(true);
      playSFX('appleGameEnd'); // 동일한 사운드 사용
      pause(); // 게임 종료 시 BGM 중지
    },
    [playSFX, pause],
  );

  const handleReplay = useCallback(() => {
    console.log('[App] handleReplay 호출됨');

    // 서버에 리플레이 요청 전송
    const replayReq: ServerPacket = {
      type: SystemPacketType.REPLAY_REQ,
    };
    socketManager.send(replayReq);
    console.log('[App] REPLAY_REQ sent');

    // 게임 상태 초기화 (dropCellEventQueue 포함)
    useGameStore.getState().resetGameState();

    // 상태 초기화
    setGameStarted(true);
    setFlappyGameEnded(false);
    setFlappyScore(0);
    setFlappyFinalData(null);
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));

    // 게임 컨테이너 key 증가로 강제 재마운트
    setGameKey((prev) => prev + 1);

    // 게임 인스턴스 완전 파괴
    if (gameRef.current) {
      try {
        console.log('[App] 게임 인스턴스 파괴 시작');
        gameRef.current.destroy(true);
        gameRef.current = null;
        console.log('[App] 게임 인스턴스 파괴 완료');
      } catch (error) {
        console.error('[App] 게임 파괴 중 오류:', error);
        gameRef.current = null;
      }
    }

    console.log('[App] handleReplay 완료 - 게임이 다시 마운트됨');
  }, [setGameStarted, setPlayers]);

  const handleLobby = useCallback(() => {
    // 서버에 로비 복귀 요청 전송
    const lobbyReq: ServerPacket = {
      type: SystemPacketType.RETURN_TO_THE_LOBBY_REQ,
    };
    socketManager.send(lobbyReq);
    console.log('[App] RETURN_TO_THE_LOBBY_REQ sent');

    // 게임 상태 초기화 (dropCellEventQueue 포함)
    useGameStore.getState().resetGameState();

    setGameStarted(true);
    setFlappyGameEnded(false);
    setFlappyScore(0);
    setFlappyFinalData(null);
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    useGameStore.getState().setScreen('lobby');
    // setCurrentScreen('lobby');

    // 게임 인스턴스 파괴
    if (gameRef.current) {
      try {
        gameRef.current.destroy(true);
        gameRef.current = null;
      } catch (error) {
        console.error('[App] 로비 복귀 시 게임 파괴 중 오류:', error);
        gameRef.current = null;
      }
    }
  }, [setGameStarted, setPlayers]);

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

    const joinRoomPacket: JoinRoomPacket = {
      type: SystemPacketType.JOIN_ROOM,
      roomId: 'HARDCODED_ROOM_1',
      playerName: inputNickname,
    };
    socketManager.send(joinRoomPacket);
    console.log('JOIN_ROOM sent: ', joinRoomPacket);
  };

  const handleGameStart = (gameType: string, preset: unknown) => {
    // 게임 상태 초기화 (이전 게임의 dropCellEventQueue 등 정리)
    useGameStore.getState().resetGameState();

    // 새 게임 시작 시 key 변경
    setGameKey((prev) => prev + 1);

    // 플래피버드 프리셋만 로컬에서 관리 (사과게임은 gameStore.gameConfig 사용)
    if (gameType === 'flappy') {
      setFlappyPreset(preset as FlappyBirdGamePreset);
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
    }
  }, [isGameStarted, pause]);

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
          {currentGameType === GameType.FLAPPY_BIRD && (
            <PlayerCard
              key="team-score"
              name="Team Score"
              score={flappyScore}
              color="#209cee" // 메인 커러
            />
          )}

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
        {isGameStarted && !flappyGameEnded && currentGameType && (
          <GameContainer
            key={gameKey}
            gameType={currentGameType}
            playerCount={players.length}
            players={players}
            flappyPreset={flappyPreset}
            onScoreUpdate={handleFlappyScoreUpdate}
            onFlappyGameEnd={handleFlappyGameEnd}
            onGameReady={handleGameReady}
          />
        )}
        {/* 사과게임 결과 모달 */}
        {!isGameStarted && (
          <GameResult
            onReplay={handleReplay}
            onLobby={handleLobby}
            title="APPLE GAME TOGETHER"
            ratio={
              (window as Window & { __GAME_RATIO?: number }).__GAME_RATIO || 1
            }
          />
        )}
        {/* 플래피버드 결과 모달 */}
        {flappyGameEnded && flappyFinalData && (
          <FlappyBirdResult
            finalScore={flappyFinalData.finalScore}
            reason={
              flappyFinalData.reason as 'pipe_collision' | 'ground_collision'
            }
            onReplay={handleReplay}
            onLobby={handleLobby}
            ratio={
              (window as Window & { __GAME_RATIO?: number }).__GAME_RATIO || 1
            }
          />
        )}
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
