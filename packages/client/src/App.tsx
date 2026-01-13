import { useState } from 'react';
import { PhaserGame } from './game/GameContainer';
import './App.css';

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
      
      <main className="game-container">
        <PhaserGame onGameReady={handleGameReady} />
      </main>

      <footer className="game-controls">
        <button onClick={() => console.log('Button clicked')}>
          테스트 버튼
        </button>
      </footer>
    </div>
  );
}

export default App;
