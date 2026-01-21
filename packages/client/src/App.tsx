import { useState, useCallback, useRef, useEffect } from 'react';
import { GameContainer } from './game/GameContainer';
import { BGMProvider, useBGMContext } from './contexts/BGMContext';
import { SFXProvider, useSFXContext } from './contexts/SFXContext';
import { UserProvider, useUser } from './contexts/UserContext';

import PlayerCard from './components/PlayerCard';
import GameResult from './game/utils/game-result/GameResult';
import SoundSetting from './components/SoundSetting';
import LandingPage from './components/LandingPage';
import Lobby from './components/Lobby';
import type { AppleGamePreset } from './game/types/AppleGamePreset';
import type { FlappyBirdGamePreset } from './game/types/FlappyBirdGamePreset';
import type {
  PlayerData,
  PlayerResultData,
  GameType,
  CurrentUser,
} from './game/types/common';
import { CONSTANTS } from './game/types/common';
import { SystemPacketType } from '../../common/src/packets';

import './App.css';
import { socketManager } from './network/socket';

const { PLAYER_COLORS } = CONSTANTS;

function AppContent() {
  const testPlayerCount = 4;
  const { pause } = useBGMContext();
  const { playSFX } = useSFXContext();

  // 현재 유저 정보 (서버에서 받아올 예정)

  const { nickname, color, setUserInfo } = useUser();
  const [currentScreen, setCurrentScreen] = useState<
    'landing' | 'lobby' | 'game'
  >('landing');

  // 현재 유저 정보 (서버에서 받아올 예정)
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    id: 'id_1',
    playerIndex: 0,
    name: nickname || '1P',
    isHost: false, // 방장 여부는 서버/방 생성 로직에서 결정됨
  });

  const [gameReady, setGameReady] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState<PlayerResultData[]>([]);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([
    {
      id: 'id_1',
      name: nickname || '1P',
      score: 0,
      color: color || PLAYER_COLORS[0],
    },
    { id: 'id_2', name: '2P', score: 0, color: PLAYER_COLORS[1] },
    { id: 'id_3', name: '3P', score: 0, color: PLAYER_COLORS[2] },
    { id: 'id_4', name: '4P', score: 0, color: PLAYER_COLORS[3] },
  ]);

  // 현재 게임 타입 및 프리셋 설정 (로비에서 받아옴)
  const [currentGameType, setCurrentGameType] = useState<GameType | undefined>(
    undefined,
  );
  const [applePreset, setApplePreset] = useState<AppleGamePreset | undefined>(
    undefined,
  );
  const [flappyPreset, setFlappyPreset] = useState<
    FlappyBirdGamePreset | undefined
  >(undefined);

  // 점수 증가 함수
  const handleAddScore = (playerId: string, pointsToAdd: number) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === playerId
          ? { ...player, score: player.score + pointsToAdd }
          : player,
      ),
    );
  };

  const handleAppleScored = useCallback(
    (points: number) => {
      try {
        handleAddScore(currentUser.id, points);
        playSFX('appleDrop');
      } catch (error) {
        console.error('Apple scored handler error:', error);
      }
    },
    [currentUser.id, playSFX],
  );

  const handleGameReady = useCallback((game: Phaser.Game) => {
    console.log('Phaser game is ready!', game);
    gameRef.current = game;
    setGameReady(true);
  }, []);

  const handleGameEnd = useCallback(
    (endPlayers: (PlayerData & { playerIndex: number })[]) => {
      setFinalPlayers(endPlayers);
      setGameEnded(true);
      playSFX('appleGameEnd');
      pause(); // 게임 종료 시 BGM 중지
    },
    [playSFX, pause],
  );

  const handleReplay = useCallback(() => {
    setGameEnded(false);
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    setGameReady(false);
  }, []);

  const handleLobby = useCallback(() => {
    setGameEnded(false);
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    setCurrentScreen('lobby');
  }, []);

  // 닉네임 설정하고 시작 버튼 누를 때 동작
  const handleStart = (inputNickname: string) => {
    const userColor = PLAYER_COLORS[0]; // 처음 유저는 첫 번째 색상
    setUserInfo(inputNickname, userColor, true);
    setCurrentUser((prev) => ({ ...prev, name: inputNickname }));
    setPlayers((prev) =>
      prev.map((player, index) =>
        index === 0
          ? { ...player, name: inputNickname, color: userColor }
          : player,
      ),
    );

    const joinRoomPacket = {
      type: SystemPacketType.JOIN_ROOM,
      playerId: socketManager.getId() ?? '',
      roomId: 'HARDCODED_ROOM_1',
      playerName: inputNickname,
    } as const;
    socketManager.send(joinRoomPacket);
    console.log('JOIN_ROOM sent: ', joinRoomPacket);
    // 얘는 클라측에서 ROOM_UPDATE를 받았을 때 type이 0이면 동작함.
    setCurrentScreen('lobby'); // todo 일단 프론트가 작업할 수 있도록 주석 처리 풀어둚.
  };

  const handleGameStart = (gameType: string, preset: unknown) => {
    setCurrentGameType(gameType as GameType);

    if (gameType === 'apple') {
      setApplePreset(preset as AppleGamePreset);
    } else if (gameType === 'flappy') {
      setFlappyPreset(preset as FlappyBirdGamePreset);
    }

    setCurrentScreen('game');
  };

  // 소켓 연결부
  useEffect(() => {
    console.log('서버와의 연결 시도');
    socketManager.connect('http://localhost:3000'); // 비동기 처리 필요?

    // 테스트 종료(컴포넌트 제거) 시 연결을 완전히 끊고 싶다면 주석 해제
    return () => socketManager.disconnect();
  }, []);

  // BGM 제어: 게임 종료 시에만 정지 (로비에서는 정지하지 않음)
  useEffect(() => {
    if (gameEnded) {
      pause();
    }
  }, [gameEnded, pause]);

  // 랜딩 페이지 표시
  if (currentScreen === 'landing') {
    return <LandingPage onStart={handleStart} />;
  }

  // 로비 표시
  if (currentScreen === 'lobby') {
    return (
      <Lobby
        currentPlayer={{
          id: currentUser.id,
          name: currentUser.name,
          color: '#209cee',
          isHost: currentUser.isHost,
        }}
        onGameStart={handleGameStart}
      />
    );
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
          {players.slice(0, testPlayerCount).map((player) => (
            <PlayerCard
              key={player.id}
              name={player.name}
              score={player.score}
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
        {!gameEnded && currentGameType && (
          <GameContainer
            gameType={currentGameType}
            playerCount={players.length}
            players={players}
            currentPlayerIndex={currentUser.playerIndex}
            applePreset={applePreset}
            flappyPreset={flappyPreset}
            onAppleScored={handleAppleScored}
            onGameEnd={handleGameEnd}
            onGameReady={handleGameReady}
          />
        )}
        {gameEnded && (
          <GameResult
            players={finalPlayers}
            onReplay={handleReplay}
            onLobby={handleLobby}
            ratio={
              (window as Window & { __APPLE_GAME_RATIO?: number })
                .__APPLE_GAME_RATIO || 1
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
