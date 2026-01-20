import {
  SystemPacketType,
  GamePacketType,
  type ServerPacket,
} from "../../../common/src/packets.ts";
import { useDebugStore, useAppleGameStore } from "../store/store.ts";

export const handleServerPacket = (packet: ServerPacket) => {
  const appleGameStore = useAppleGameStore.getState();

  switch (packet.type) {
    // --- System Logic ---
    case SystemPacketType.UPDATE_NUMBER:
      const debugStore = useDebugStore.getState();
      debugStore.setCount(packet.number);
      break;

    case SystemPacketType.JOIN_ROOM:
      console.log(`Player ${packet.playerId} joined ${packet.roomId}`);
      break;

    case SystemPacketType.ROOM_UPDATE:
      // store.setPlayerNames(packet.playerNames);
      console.log("ROOM_UPDATE packet received:", packet.players, packet.updateType);
      break;

    case SystemPacketType.SYSTEM_MESSAGE:
      console.log("SYSTEM_MESSAGE packet received:", packet.message);
      break;

    // --- Game Logic ---
    case GamePacketType.SET_FIELD:
      // store.setApples(packet.apples);
      // renderAppleBoard(packet.apples);
      console.log("SET_FIELD packet received:", packet.apples);
      break;

    case GamePacketType.DROP_CELL_INDEX:
      // 서버에서 확정 패킷이 오면 점수를 반영하고 사과를 제거
      console.log("DROP_CELL_INDEX packet received:", packet);
      //handleAppleDrop(packet.winnerId, packet.indices, packet.totalScore);
      // TODO: 사과 제거 로직 (store에 removeApples 등이 필요할 수 있음)
      // store.removeApples(packet.indices, packet.winnerId);
      // 점수 업데이트 (누적 점수라고 가정)
      // packet에 totalScore가 있다면 사용
      // appleGameStore.updateScore(packet.winnerId, packet.totalScore); 
      break;

    case GamePacketType.SET_TIME:
      // store.setTime(packet.limitTime);
      console.log("SET_TIME packet received:", packet.limitTime);
      break;

    case GamePacketType.UPDATE_DRAG_AREA:
      // 다른 플레이어의 드래그 박스 좌표 업데이트
      // updateOtherPlayerDrag(packet.playerId, packet.startX, packet.startY, packet.endX, packet.endY);
      console.log("UPDATE_DRAG_AREA packet received:", packet);
      break;

    case GamePacketType.TIME_END:
      // 게임 종료 처리
      // showResultWindow(packet.results);
      console.log("TIME_END packet received:", packet.results);
      // appleGameStore.setGameStatus('ended'); // 예시
      break;

    // 클라이언트가 보낸 패킷이 루프백으로 수신되는 경우 등 예외 처리
    default:
      console.warn("Unprocessed packet type:", packet);
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
