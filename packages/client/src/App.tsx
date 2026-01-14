import { useState, useCallback } from 'react';
import { PhaserGame } from './game/GameContainer';
import PlayerCard from './components/PlayerCard';
import './App.css';

interface PlayerData {
  id: string;
  name: string;
  score: number;
  color: string;
}

function App() {
  const testPlayerCount = 1;

  const testCurrentUserId = "id_1";

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
    handleAddScore(testCurrentUserId, points);
  }, [testCurrentUserId]);

  const handleGameReady = useCallback((game: Phaser.Game) => {
    console.log('Phaser game is ready!', game);
    setGameReady(true);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {gameReady && <p style={{fontFamily: 'NeoDunggeunmo', fontSize: '24px'}}>
          마우스로 사과를 드래그 하여 범위 내 사과 속 숫자의 합이 10이 되도록 하세요
        </p>}
      </header>

      <div style={playerListStyle}>
        {players.slice(0, testPlayerCount).map((player) => (
          <PlayerCard key={player.id} name={player.name} score={player.score} color={player.color} />
        ))}
      </div>

      <main className="game-container">
        <PhaserGame
            playerCount={players.length}
            players={players}
            currentPlayerIndex={0}  // 게임에 전달
        />
      </main>
    </div>
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