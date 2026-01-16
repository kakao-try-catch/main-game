import {
  SystemPacketType,
  GamePacketType,
  type ServerPacket,
} from "../../../common/src/packets.ts";
import { useGameStore } from "../store/gameStore.ts";

export const handleServerPacket = (packet: ServerPacket) => {
  const store = useGameStore.getState();

  switch (packet.type) {
    // --- System Logic ---
    case SystemPacketType.UPDATE_NUMBER:
      store.setCount(packet.number);
      break;

    case SystemPacketType.JOIN_ROOM:
      console.log(`Player ${packet.playerId} joined ${packet.roomId}`);
      break;

    // --- Game Logic ---
    case GamePacketType.SET_FIELD:
      // store.setApples(packet.apples);
      break;

    case GamePacketType.DROP_CELL_INDEX:
      // 누군가 사과를 땄을 때 스토어 업데이트
      // store.removeApples(packet.indices);
      // store.updateScore(packet.winnerId, packet.totalScore);
      break;

    case GamePacketType.TIME_END:
      // 게임 종료 처리 (결과창 띄우기 등)
      break;

    // 클라이언트가 보낸 패킷이 루프백으로 수신되는 경우 등 예외 처리
    default:
      console.warn("Unprocessed packet type:", packet);
  }
};
