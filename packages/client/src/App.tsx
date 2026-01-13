import { useState } from 'react';
import { PhaserGame } from './game/GameContainer';
import PlayerCard from './components/PlayerCard'; // PlayerCard 경로에 맞게 수정
import './App.css';

interface PlayerData {
  id: string;
  name: string;
  score: number;
  color: string;
}

function App() {
  const testPlayerCount =  1; // 테스트용 플레이어 수

  const [gameReady, setGameReady] = useState(false);

  const [players, setPlayers] = useState<PlayerData[]>([
    { id: "id_1", name: "1P", score: 0, color: "#209cee" },
    { id: "id_2", name: "2P", score: 0, color: "#e76e55" },
    { id: "id_3", name: "3P", score: 0, color: "#92cc41" }, 
    { id: "id_4", name: "4P", score: 0, color: "#f2d024" },
  ]);

  const handleGameReady = (game: Phaser.Game) => {
    console.log('Phaser game is ready!', game);
    setGameReady(true);
  };

  return (
    <div className="App">
      <header className="App-header">
        {gameReady && <p style={{fontFamily: 'NeoDunggeunmo', fontSize: '24px'}}>
          마우스로 사과를 드래그 하여 범위 내 사과 속 숫자의 합이 10이 되도록 하세요
        </p>}
      </header>

      <div style={playerListStyle}>
        {players.slice(0, testPlayerCount).map((player) => (
          <PlayerCard name={player.name} score={player.score} color={player.color} />
        ))}
      </div>

      <main className="game-container">
        <PhaserGame onGameReady={handleGameReady} />
      </main>
    </div>
  );
}

const playerListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '16px', 
  marginLeft: '32px',
  alignSelf: 'flex-start',
};

export default App;