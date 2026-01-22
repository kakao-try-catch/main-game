import { useState, useCallback, useRef, useEffect } from 'react';
import { GameContainer } from './game/GameContainer';
import { BGMProvider, useBGMContext } from './contexts/BGMContext';
import { SFXProvider, useSFXContext } from './contexts/SFXContext';
import { UserProvider, useUser } from './contexts/UserContext';

import PlayerCard from './components/PlayerCard';
import GameResult from './game/utils/game-result/GameResult';
import FlappyBirdResult from './game/utils/game-result/FlappyBirdResult';
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
    'landing' | 'lobby' | 'game' | 'flappybird'
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

  // 플래피버드 관련 상태
  const [flappyScore, setFlappyScore] = useState(0); // 팀 점수
  const [flappyGameEnded, setFlappyGameEnded] = useState(false); // 플래피버드 게임 종료 여부
  const [flappyFinalData, setFlappyFinalData] = useState<{
    finalScore: number;
    reason: string;
    players: PlayerResultData[];
  } | null>(null);

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

  // 게임 컨테이너 재마운트를 위한 key
  const [gameKey, setGameKey] = useState(0);

  // 점수 증가 함수
  const handleAppleScored = useCallback(
    (points: number) => {
      try {
        setPlayers((prevPlayers) =>
          prevPlayers.map((player) =>
            player.id === currentUser.id
              ? { ...player, score: player.score + points }
              : player,
          ),
        );
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

  // 플래피버드 점수 업데이트 핸들러
  const handleFlappyScoreUpdate = useCallback((score: number) => {
    setFlappyScore(score);
  }, []);

  // 플래피버드 게임 종료 핸들러
  const handleFlappyGameEnd = useCallback(
    (data: {
      finalScore: number;
      reason: string;
      players: PlayerResultData[];
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

    // 상태 초기화
    setGameEnded(false);
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
  }, []);

  const handleLobby = useCallback(() => {
    setGameEnded(false);
    setFlappyGameEnded(false);
    setFlappyScore(0);
    setFlappyFinalData(null);
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    setCurrentScreen('lobby');

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

    const joinRoomPacket: {
      type: SystemPacketType.JOIN_ROOM;
      playerId: string;
      roomId: string;
      playerName: string;
    } = {
      type: SystemPacketType.JOIN_ROOM,
      playerId: socketManager.getId() ?? '',
      roomId: 'HARDCODED_ROOM_1',
      playerName: inputNickname,
    };
    socketManager.send(joinRoomPacket);
    console.log('JOIN_ROOM sent: ', joinRoomPacket);
    // 얘는 클라측에서 ROOM_UPDATE를 받았을 때 type이 0이면 동작함.
    setCurrentScreen('lobby'); // todo 일단 프론트가 작업할 수 있도록 주석 처리 풀어둚.
  };

  const handleGameStart = (gameType: string, preset: unknown) => {
    setCurrentGameType(gameType as GameType);

    // 새 게임 시작 시 key 변경
    setGameKey((prev) => prev + 1);

    if (gameType === 'apple') {
      setApplePreset(preset as AppleGamePreset);
    } else if (gameType === 'flappy') {
      setFlappyPreset(preset as FlappyBirdGamePreset);
    }

    const gameStartReq: {
      type: SystemPacketType.GAME_START_REQ;
    } = {
      type: SystemPacketType.GAME_START_REQ,
    };
    socketManager.send(gameStartReq);
    console.log('GAME_START_REQ sent: ', gameStartReq);

    setCurrentScreen('game');
  };

  // 소켓 연결부
  useEffect(() => {
    console.log('서버와의 연결 시도');
    socketManager.connect('http://localhost:3000'); // 비동기 처리 필요?
    // todo game_config_update
    // todo ready_scene
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
          {/* 사과게임: 4개 플레이어카드 */}
          {currentGameType === 'apple' &&
            players
              .slice(0, testPlayerCount)
              .map((player) => (
                <PlayerCard
                  key={player.id}
                  name={player.name}
                  score={player.score}
                  color={player.color}
                />
              ))}

          {/* 플래피버드: 팀 점수 카드 1개 */}
          {currentGameType === 'flappy' && (
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
        {!gameEnded && !flappyGameEnded && currentGameType && (
          <GameContainer
            key={gameKey}
            gameType={currentGameType}
            playerCount={players.length}
            players={players}
            currentPlayerIndex={currentUser.playerIndex}
            applePreset={applePreset}
            flappyPreset={flappyPreset}
            onAppleScored={handleAppleScored}
            onGameEnd={handleGameEnd}
            onScoreUpdate={handleFlappyScoreUpdate}
            onFlappyGameEnd={handleFlappyGameEnd}
            onGameReady={handleGameReady}
          />
        )}
        {/* 사과게임 결과 모달 */}
        {gameEnded && (
          <GameResult
            players={finalPlayers}
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
