import { useState, useCallback, useRef, useEffect } from 'react';
import { PhaserGame } from './game/GameContainer';
import { BGMProvider, useBGMContext } from './contexts/BGMContext';
import { SFXProvider, useSFXContext } from './contexts/SFXContext';
import { UserProvider, useUser } from './contexts/UserContext';

import PlayerCard from './components/PlayerCard';
import GameResult from './game/utils/game-result/GameResult';
import SocketCounter from './components/SocketCounter';
import SoundSetting from './components/SoundSetting';
import LandingPage from './components/LandingPage';
import Lobby from './components/Lobby';
import type { AppleGamePreset } from './game/types/GamePreset';

import './App.css';

interface PlayerData {
  id: string;
  name: string;
  score: number;
  color: string;
}

function AppContent() {
  const testPlayerCount = 2;
  const { pause } = useBGMContext();
  const { playSFX } = useSFXContext();

  // 현재 유저 정보 (서버에서 받아올 예정)

  const { nickname, color, setUserInfo } = useUser();

  // ⭐ 수정: 'landing' → 'game' (플래피버드 바로 시작)
  const [currentScreen, setCurrentScreen] = useState<
    'landing' | 'lobby' | 'game'
  >('game');

  // 현재 유저 정보 (서버에서 받아올 예정)
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    playerIndex: number;
    name: string;
    isHost: boolean;
  }>({
    id: 'id_1',
    playerIndex: 0,
    name: nickname || '1P',
    isHost: false, // 방장 여부는 서버/방 생성 로직에서 결정됨
  });

  const [gameReady, setGameReady] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState<
    (PlayerData & { playerIndex: number })[]
  >([]);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([
    { id: 'id_1', name: nickname || '1P', score: 0, color: color || '#209cee' },
    { id: 'id_2', name: '2P', score: 0, color: '#e76e55' },
    { id: 'id_3', name: '3P', score: 0, color: '#92cc41' },
    { id: 'id_4', name: '4P', score: 0, color: '#f2d024' },
  ]);

  // 프리셋 설정 (로비에서 받아옴)
  const [currentPreset, setCurrentPreset] = useState<
    AppleGamePreset | undefined
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

  const handleStart = (inputNickname: string) => {
    const userColor = '#209cee'; // 처음 유저는 파란색
    setUserInfo(inputNickname, userColor, true);
    setCurrentUser((prev) => ({ ...prev, name: inputNickname }));
    setPlayers((prev) =>
      prev.map((player, index) =>
        index === 0
          ? { ...player, name: inputNickname, color: userColor }
          : player,
      ),
    );
    setCurrentScreen('lobby');
  };

  const handleGameStart = (preset: AppleGamePreset) => {
    setCurrentPreset(preset);
    setCurrentScreen('game');
  };

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
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <header
        className="App-header"
        style={{ width: '100%', textAlign: 'center', margin: '8px 0 0 0' }}
      >
        {gameReady && (
          <p
            style={{
              fontFamily: 'NeoDunggeunmo',
              fontSize: '18px',
              textAlign: 'center',
              margin: 0,
            }}
          >
            마우스로 사과를 드래그 하여 범위 내 사과 속 숫자의 합이 10이 되도록
            하세요
          </p>
        )}
      </header>

      <SocketCounter />

      <div
        style={{
          ...playerListStyle,
          alignSelf: 'center',
          justifyContent: 'center',
          marginLeft: `0px`,
          position: 'relative',
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

      <main
        className="game-container"
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {/* ⭐ 수정: currentPreset 조건 제거 (플래피버드는 프리셋 불필요) */}
        {!gameEnded && (
          <PhaserGame
            playerCount={testPlayerCount}
            players={players.slice(0, testPlayerCount)}
            currentPlayerIndex={currentUser.playerIndex}
            preset={currentPreset}
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
  gap: '12px',
  marginTop: '8px', // UI 간격 조정
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
