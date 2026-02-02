import {
  SystemPacketType,
  AppleGamePacketType,
  type ServerPacket,
  type RoomUpdatePacket,
  type GameConfigUpdatePacket,
  FlappyBirdPacketType,
  MineSweeperPacketType,
} from '../../../common/src/packets.ts';
import type {
  MSGameInitPacket,
  MSTileUpdatePacket,
  MSScoreUpdatePacket,
  MSRemainingMinesPacket,
  MSGameEndPacket,
} from '../../../common/src/minesweeperPackets.ts';
import { GameType } from '../../../common/src/config.ts';
import type { PlayerData } from '../../../common/src/common-type.ts';
import { useGameStore } from '../store/gameStore';
import { sfxManager } from '../audio/sfx-manager.ts';
import { bgmManager } from '../audio/bgm-manager.ts';
//import { useDebugStore, useAppleGameStore } from "../store/store.ts";

export const handleServerPacket = (packet: ServerPacket) => {
  //const appleGameStore = useAppleGameStore.getState();

  switch (packet.type) {
    // --- System Logic ---
    case SystemPacketType.UPDATE_NUMBER:
      //const debugStore = useDebugStore.getState();
      //debugStore.setCount(packet.number);
      break;

    // todo 클라 핸들러는 이거 필요없는데?
    // JOIN_ROOM 패킷은 클라이언트가 서버로 보내는 것이므로 여기서 처리 불필요
    case SystemPacketType.JOIN_ROOM:
      console.log(`Player ${packet.playerId} joined ${packet.roomId}`);
      break;

    case SystemPacketType.ROOM_UPDATE: {
      // update global store (clientHandler runs outside React)
      const roomPacket = packet as RoomUpdatePacket;
      useGameStore.getState().setPlayers(roomPacket.players || []);
      useGameStore.getState().setMyselfIndex(roomPacket.yourIndex);
      useGameStore.getState().setRoomId(roomPacket.roomId);
      // 얘는 클라측에서 ROOM_UPDATE를 받았을 때 type이 0이면 동작함.
      if (useGameStore.getState().screen !== 'lobby') {
        useGameStore.getState().setScreen('lobby');
      }

      // URL에 /invite가 있으면 제거
      if (window.location.pathname.includes('/invite')) {
        const newUrl = window.location.pathname.replace(/\/invite.*$/, '');
        window.history.replaceState(null, '', newUrl || '/');
      }

      console.log(
        `ROOM_UPDATE packet received: , ${roomPacket.updateType}, ${roomPacket.yourIndex}`,
        roomPacket.players,
      );
      break;
    }

    case SystemPacketType.GAME_CONFIG_UPDATE: {
      // todo 굳이 형변환 안 해줘도 알아서 type narrow 해줄 거임.
      const cfgPacket = packet as GameConfigUpdatePacket;
      // store selected game type and config so UI can react
      useGameStore
        .getState()
        .setGameConfig(cfgPacket.selectedGameType, cfgPacket.gameConfig);
      console.log('GAME_CONFIG_UPDATE received:', cfgPacket);
      break;
    }

    case SystemPacketType.SYSTEM_MESSAGE: {
      console.log('SYSTEM_MESSAGE packet received:', packet.message);
      useGameStore.getState().setConnectionError({
        message: packet.message,
      });
      break;
    }

    case SystemPacketType.UPDATE_SCORE: {
      const store = useGameStore.getState();
      // scoreboard 배열의 인덱스가 플레이어 순서와 일치해야 함. 게임 중엔 안 바뀜?
      // todo 이거 검증 필요함.
      store.setPlayers((prev: PlayerData[]) =>
        prev.map((player: PlayerData, index: number) => ({
          ...player,
          reportCard: packet.scoreboard[index] ?? player.reportCard,
        })),
      );
      sfxManager.play('appleDrop');
      console.log('UPDATE_SCORE packet received:', packet.scoreboard);
      break;
    }

    case SystemPacketType.READY_SCENE: {
      const store = useGameStore.getState();
      // selectedGameType이 설정되지 않은 경우 (게스트가 로비에서 설정 안 받았을 때) 설정
      if (packet.selectedGameType) {
        store.setGameConfig(packet.selectedGameType, store.gameConfig ?? null);
      }
      store.setScreen('game');
      store.setGameStarted(true);
      // 게임 세션 ID 증가로 게임 컨테이너 재마운트 트리거
      store.incrementGameSession();
      // 게임 타입에 맞는 BGM 로드 (방장/비방장 모두 여기서 처리)
      switch (packet.selectedGameType) {
        case GameType.APPLE_GAME:
          bgmManager.loadBGM('appleGame');
          break;
        case GameType.FLAPPY_BIRD:
          bgmManager.loadBGM('flappyBird');
          break;
        case GameType.MINESWEEPER:
          bgmManager.loadBGM('minesweeper');
          break;
      }
      console.log('READY_SCENE packet received', packet);
      break;
    }

    case SystemPacketType.TIME_END: {
      const store = useGameStore.getState();
      store.setGameResults(packet.results);
      store.setGameStarted(false);
      sfxManager.play('appleGameEnd');
      bgmManager.pause(); // 게임 종료 시 BGM 중지
      console.log('TIME_END packet received:', packet.results);
      break;
    }

    case SystemPacketType.SET_TIME: {
      const store = useGameStore.getState();
      store.setGameTime(packet.limitTime);
      store.setServerStartTime(packet.serverStartTime);
      console.log(
        'SET_TIME packet received:',
        packet.limitTime,
        'serverStartTime:',
        packet.serverStartTime,
      );
      break;
    }

    // --- Game Logic ---
    case AppleGamePacketType.SET_FIELD: {
      const store = useGameStore.getState();
      // 게임 시작/리플레이 시 상태 초기화 (SET_FIELD가 새 게임의 시작 신호)
      store.clearDropCellEventQueue();
      store.setAppleField(packet.apples);
      console.log('SET_FIELD packet received:', packet.apples.length, 'apples');
      break;
    }

    // Apple 패킷
    case AppleGamePacketType.DROP_CELL_INDEX: {
      const store = useGameStore.getState();
      const { winnerIndex, indices, totalScore } = packet;

      // 사과 제거 이벤트를 큐에 추가 (AppleGameManager에서 처리)
      // 로딩 중에 도착한 이벤트도 누적되어 게임 초기화 시 처리됨
      store.addDropCellEvent({ winnerIndex, indices, totalScore });

      // winnerIndex에 해당하는 플레이어의 점수를 totalScore로 업데이트 (diff 방식)
      store.setPlayers((prev: PlayerData[]) =>
        prev.map((player: PlayerData, index: number) =>
          index === winnerIndex
            ? {
                ...player,
                reportCard: { ...player.reportCard, score: totalScore },
              }
            : player,
        ),
      );

      console.log(
        'DROP_CELL_INDEX packet received:',
        winnerIndex,
        indices,
        totalScore,
      );
      break;
    }

    case AppleGamePacketType.UPDATE_DRAG_AREA: {
      const store = useGameStore.getState();
      store.updateOtherPlayerDrag({
        playerIndex: packet.playerIndex,
        startX: packet.startX,
        startY: packet.startY,
        endX: packet.endX,
        endY: packet.endY,
      });
      break;
    }

    case SystemPacketType.RETURN_TO_THE_LOBBY: {
      const store = useGameStore.getState();
      store.setScreen('lobby');
      console.log('RETURN_TO_THE_LOBBY packet received: returning to lobby');
      break;
    }

    // Flappy 패킷
    case FlappyBirdPacketType.FLAPPY_WORLD_STATE: {
      const store = useGameStore.getState();
      store.setFlappyWorldState(
        packet.birds,
        packet.pipes,
        packet.tick,
        packet.cameraX,
      );
      break;
    }

    case FlappyBirdPacketType.FLAPPY_SCORE_UPDATE: {
      const store = useGameStore.getState();
      store.setFlappyScore(packet.score);
      console.log('FLAPPY_SCORE_UPDATE received:', packet.score);
      break;
    }

    case FlappyBirdPacketType.FLAPPY_GAME_OVER: {
      const store = useGameStore.getState();
      store.setFlappyGameOver({
        reason: packet.reason,
        collidedPlayerIndex: packet.collidedPlayerIndex,
        finalScore: packet.finalScore,
      });
      store.setGameStarted(false);
      console.log(
        'FLAPPY_GAME_OVER received:',
        packet.reason,
        'Player',
        packet.collidedPlayerIndex,
        'Score:',
        packet.finalScore,
      );
      break;
    }

    // Minesweeper 패킷
    case MineSweeperPacketType.MS_GAME_INIT: {
      console.log('MS_GAME_INIT received:', packet);
      handleMSGameInit(packet as MSGameInitPacket);
      break;
    }

    case MineSweeperPacketType.MS_TILE_UPDATE: {
      console.log('MS_TILE_UPDATE received:', packet);
      handleMSTileUpdate(packet as MSTileUpdatePacket);
      break;
    }

    case MineSweeperPacketType.MS_SCORE_UPDATE: {
      console.log('MS_SCORE_UPDATE received:', packet);
      handleMSScoreUpdate(packet as MSScoreUpdatePacket);
      break;
    }

    case MineSweeperPacketType.MS_REMAINING_MINES: {
      console.log('MS_REMAINING_MINES received:', packet);
      handleMSRemainingMines(packet as MSRemainingMinesPacket);
      break;
    }

    case MineSweeperPacketType.MS_GAME_END: {
      console.log('MS_GAME_END received:', packet);
      handleMSGameEnd(packet as MSGameEndPacket);
      break;
    }

    // 클라이언트가 보낸 패킷이 루프백으로 수신되는 경우 등 예외 처리
    default:
      console.warn('Unprocessed packet type:', packet);
  }
};

// function handleAppleDrop(
//   winnerId: string,
//   indices: number[],
//   totalScore: number
// ) {
//   const isMe = winnerId === myPlayerId;
//
//   if (isMe) {
//     // 1. 내가 성공한 경우: 투명했던 사과들을 리스트에서 완전히 제거
//     removeApplesWithAnimation(indices);
//     cancelTimeout(indices); // 해당 인덱스들에 걸린 타이머 해제
//   } else {
//     // 2. 남이 성공한 경우:
//     // 내가 투명화(Pending) 시켜놓은 사과가 포함되어 있다면 복구할 필요 없이 제거
//     removeApplesBlackholeEffect(indices);
//   }
//
//   // 3. 공통: 점수판 갱신
//   updateScoreUI(winnerId, totalScore);
// }

// ========== Minesweeper Handlers ==========

function handleMSGameInit(packet: MSGameInitPacket): void {
  // 게임 씬으로 이벤트 전달 (MineSweeperScene에서 수신)
  const event = new CustomEvent('ms:game_init', { detail: packet });
  window.dispatchEvent(event);
}

function handleMSTileUpdate(packet: MSTileUpdatePacket): void {
  const event = new CustomEvent('ms:tile_update', { detail: packet });
  window.dispatchEvent(event);
}

function handleMSScoreUpdate(packet: MSScoreUpdatePacket): void {
  const event = new CustomEvent('ms:score_update', { detail: packet });
  window.dispatchEvent(event);
}

function handleMSRemainingMines(packet: MSRemainingMinesPacket): void {
  const event = new CustomEvent('ms:remaining_mines', { detail: packet });
  window.dispatchEvent(event);
}

function handleMSGameEnd(packet: MSGameEndPacket): void {
  const event = new CustomEvent('ms:game_end', { detail: packet });
  window.dispatchEvent(event);
}
