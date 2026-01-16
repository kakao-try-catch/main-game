
import { useState, useCallback, useRef } from 'react';
import { PhaserGame } from './game/GameContainer';
import { SoundProvider, useSoundContext } from './contexts/SoundContext';

import PlayerCard from './components/PlayerCard';
import GameResult from './game/utils/game-result/GameResult';
import SocketCounter from './components/SocketCounter';
import SoundSetting from './components/SoundSetting';

import './App.css';

interface PlayerData {
  id: string;
  name: string;
  score: number;
  color: string;
}

function AppContent() {
  const testPlayerCount = 4;
  const { playSFX } = useSoundContext();

  // 현재 유저 정보 (서버에서 받아올 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    playerIndex: number;
    name: string;
  }>({
    id: "id_1",
    playerIndex: 0,
    name: "1P"
  });

  const [gameReady, setGameReady] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState<(PlayerData & { playerIndex: number })[]>([]);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([
    { id: "id_1", name: "1P", score: 0, color: "#209cee" },
    { id: "id_2", name: "2P", score: 0, color: "#e76e55" },
    { id: "id_3", name: "3P", score: 0, color: "#92cc41" },
    { id: "id_4", name: "4P", score: 0, color: "#f2d024" },
  ]);

  // 점수 증가 함수
  const handleAddScore = (playerId: string, pointsToAdd: number) => {
    setPlayers(prevPlayers =>
      prevPlayers.map(player =>
        player.id === playerId
          ? { ...player, score: player.score + pointsToAdd }
          : player
      )
    );
  };

  const handleAppleScored = useCallback((points: number) => {
    try {
      handleAddScore(currentUser.id, points);
      playSFX('appleDrop');
    } catch (error) {
      console.error('Apple scored handler error:', error);
    }
  }, [currentUser.id, playSFX]);


  const handleGameReady = useCallback((game: Phaser.Game) => {
    console.log('Phaser game is ready!', game);
    gameRef.current = game;
    setGameReady(true);
  }, []);

  const handleGameEnd = useCallback((endPlayers: (PlayerData & { playerIndex: number })[]) => {
    setFinalPlayers(endPlayers);
    setGameEnded(true);
    playSFX('gameEnd');
  }, []);

  const handleReplay = useCallback(() => {
    setGameEnded(false);
    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
  }, []);

  const handleLobby = useCallback(() => {
    setGameEnded(false);
  }, []);

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <header className="App-header" style={{ width: '100%', textAlign: 'left', marginLeft: 0 }}>
        {gameReady && <p style={{ fontFamily: 'NeoDunggeunmo', fontSize: '24px', textAlign: 'left', marginLeft: 0 }}>
          마우스로 사과를 드래그 하여 범위 내 사과 속 숫자의 합이 10이 되도록 하세요
        </p>}
      </header>

      <SocketCounter />

      <div style={{ ...playerListStyle, marginLeft: 0 }}>
        {players.slice(0, testPlayerCount).map((player) => (
          <PlayerCard key={player.id} name={player.name} score={player.score} color={player.color} />
        ))}
        <SoundSetting gameReady={gameReady} />
      </div>

      <main className="game-container" style={{ position: 'relative', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
        {!gameEnded && (
          <PhaserGame
            playerCount={players.length}
            players={players}
            currentPlayerIndex={currentUser.playerIndex}
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
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <SoundProvider>
      <AppContent />
    </SoundProvider>
  );
}

const playerListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '16px',
  marginLeft: '32px',
  marginTop: '20px', // UI 간격 조정
  alignSelf: 'flex-start',
};

export default App;