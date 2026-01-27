import {
  SystemPacketType,
  GamePacketType,
  type ServerPacket,
  type RoomUpdatePacket,
  type GameConfigUpdatePacket,
} from '../../../common/src/packets.ts';
import { GameType } from '../../../common/src/config.ts';
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
    case SystemPacketType.JOIN_ROOM:
      console.log(`Player ${packet.playerId} joined ${packet.roomId}`);
      break;

    case SystemPacketType.ROOM_UPDATE: {
      // update global store (clientHandler runs outside React)
      const roomPacket = packet as RoomUpdatePacket;
      useGameStore.getState().setPlayers(roomPacket.players || []);
      useGameStore.getState().setMyselfIndex(roomPacket.yourIndex);
      // 얘는 클라측에서 ROOM_UPDATE를 받았을 때 type이 0이면 동작함.
      if (useGameStore.getState().screen !== 'lobby') {
        useGameStore.getState().setScreen('lobby');
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

    case SystemPacketType.SYSTEM_MESSAGE:
      console.log('SYSTEM_MESSAGE packet received:', packet.message);
      break;

    case SystemPacketType.UPDATE_SCORE: {
      const store = useGameStore.getState();
      // scoreboard 배열의 인덱스가 플레이어 순서와 일치해야 함. 게임 중엔 안 바뀜?
      // todo 이거 검증 필요함.
      store.setPlayers((prev) =>
        prev.map((player, index) => ({
          ...player,
          reportCard: packet.scoreboard[index] ?? player.reportCard,
        })),
      );
      sfxManager.play('appleDrop');
      console.log('UPDATE_SCORE packet received:', packet.scoreboard);
      break;
    }

    case SystemPacketType.READY_SCENE:
      useGameStore.getState().setScreen('game');
      switch (packet.selectedGameType) {
        // 다른 게임 타입이 추가되면 여기에 케이스 추가
        case GameType.APPLE_GAME:
          break;
        case GameType.FLAPPY_BIRD:
          break;
        case GameType.MINESWEEPER:
          break;
      }
      console.log('READY_SCENE packet received', packet);
      break;

    // --- Game Logic ---
    case GamePacketType.SET_FIELD: {
      const store = useGameStore.getState();
      store.setAppleField(packet.apples);
      store.setGameStarted(true); // todo 이건 여기서 할 게 아니지 않음?
      console.log('SET_FIELD packet received:', packet.apples.length, 'apples');
      break;
    }

    case GamePacketType.DROP_CELL_INDEX: {
      const store = useGameStore.getState();
      const { winnerId, indices, totalScore } = packet;

      // 사과 제거 이벤트 발생 (AppleGameManager에서 처리)
      store.setDropCellEvent({ winnerId, indices, totalScore });

      console.log(
        'DROP_CELL_INDEX packet received:',
        winnerId,
        indices,
        totalScore,
      );
      break;
    }

    case GamePacketType.SET_TIME: {
      const store = useGameStore.getState();
      store.setGameTime(packet.limitTime);
      console.log('SET_TIME packet received:', packet.limitTime);
      break;
    }

    case GamePacketType.UPDATE_DRAG_AREA: {
      const store = useGameStore.getState();
      store.updateOtherPlayerDrag({
        playerId: packet.playerId,
        startX: packet.startX,
        startY: packet.startY,
        endX: packet.endX,
        endY: packet.endY,
      });
      break;
    }

    case GamePacketType.TIME_END: {
      const store = useGameStore.getState();
      store.setGameResults(packet.results);
      store.setGameStarted(false);
      sfxManager.play('appleGameEnd');
      bgmManager.pause(); // 게임 종료 시 BGM 중지
      console.log('TIME_END packet received:', packet.results);
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
