/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef } from "react";
import { PhaserGame } from "./game/GameContainer";
import { BGMProvider } from "./contexts/BGMContext";

import PlayerCard from "./components/PlayerCard";
import GameResult from "./game/utils/game-result/GameResult";
import SocketCounter from "./components/SocketCounter";
import SoundSetting from "./components/SoundSetting";
import LandingPage from "./components/LandingPage";
import Lobby from "./components/Lobby";

import "./App.css";

interface PlayerData {
  id: string;
  name: string;
  score: number;
  color: string;
}

function App() {
  const testPlayerCount = 4;
  const [currentScreen, setCurrentScreen] = useState<
    "landing" | "lobby" | "game"
  >("landing");
  const [userNickname, setUserNickname] = useState("");

  // 현재 유저 정보 (서버에서 받아올 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    playerIndex: number;
    name: string;
    isHost: boolean;
  }>({
    id: "id_1",
    playerIndex: 0,
    name: "1P",
    isHost: true, // 첫 유저는 방장
  });

  const [gameReady, setGameReady] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState<
    (PlayerData & { playerIndex: number })[]
  >([]);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([
    { id: "id_1", name: "1P", score: 0, color: "#209cee" },
    { id: "id_2", name: "2P", score: 0, color: "#e76e55" },
    { id: "id_3", name: "3P", score: 0, color: "#92cc41" },
    { id: "id_4", name: "4P", score: 0, color: "#f2d024" },
  ]);

  // 점수 증가 함수
  const handleAddScore = (playerId: string, pointsToAdd: number) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === playerId
          ? { ...player, score: player.score + pointsToAdd }
          : player
      )
    );
  };

  const handleAppleScored = useCallback(
    (points: number) => {
      handleAddScore(currentUser.id, points);
    },
    [currentUser.id]
  );

  const handleGameReady = useCallback((game: Phaser.Game) => {
    console.log("Phaser game is ready!", game);
    gameRef.current = game;
    setGameReady(true);
  }, []);

  const handleGameEnd = useCallback(
    (endPlayers: (PlayerData & { playerIndex: number })[]) => {
      setFinalPlayers(endPlayers);
      setGameEnded(true);
    },
    []
  );

  const handleReplay = useCallback(() => {
    setGameEnded(false);
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
  }, []);

  const handleLobby = useCallback(() => {
    setGameEnded(false);
    setCurrentScreen("lobby");
  }, []);

  const handleStart = (nickname: string) => {
    setUserNickname(nickname);
    setCurrentUser((prev) => ({ ...prev, name: nickname }));
    setCurrentScreen("lobby");
  };

  const handleGameStart = () => {
    setCurrentScreen("game");
  };

  // 랜딩 페이지 표시
  if (currentScreen === "landing") {
    return <LandingPage onStart={handleStart} />;
  }

  // 로비 표시
  if (currentScreen === "lobby") {
    return (
      <Lobby
        currentPlayer={{
          id: currentUser.id,
          name: currentUser.name,
          color: "#209cee",
          isHost: currentUser.isHost,
        }}
        onGameStart={handleGameStart}
      />
    );
  }

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw' }}>
      <header className="App-header" style={{ width: '100%', textAlign: 'center', margin: '24px 0 0 0' }}>
        {gameReady && <p style={{fontFamily: 'NeoDunggeunmo', fontSize: '24px', textAlign: 'center', margin: 0}}>
          마우스로 사과를 드래그 하여 범위 내 사과 속 숫자의 합이 10이 되도록 하세요
        </p>}
      </header>

      <BGMProvider>
        <SoundSetting gameReady={gameReady} />
      </BGMProvider>

      <SocketCounter />
      
      <div
        style={{
          ...playerListStyle,
          alignSelf: 'center',
          justifyContent: 'center',
          marginLeft: `0px`,
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
      </div>

      <main className="game-container" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
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
            ratio={(window as any).__APPLE_GAME_RATIO || 1}
          />
        )}
      </main>
    </div>
  );
}

const playerListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '16px', 
  marginTop: '20px', // UI 간격 조정
  alignSelf: 'center',
  justifyContent: 'center',
};

export default App;
