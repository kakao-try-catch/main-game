import { useState } from 'react';
import { PhaserGame } from './game/GameContainer';
import './App.css';
import PlayerCard from './components/PlayerCard';

function App() {
  const [gameReady, setGameReady] = useState(false);

  const handleGameReady = (game: Phaser.Game) => {
    console.log('Phaser game is ready!', game);
    setGameReady(true);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>My Phaser Game</h1>
        {gameReady && <p>게임이 준비되었습니다!</p>}
      </header>
      <PlayerCard/>
      <main className="game-container">
        <PhaserGame onGameReady={handleGameReady} />
      </main>
    </div>
  );
}

export default App;
