import {
  GamePacketType,
  type GamePacket,
} from "../../../common/src/game.packets.ts";

export const handleGamePacket = (packet: GamePacket) => {
  switch (packet.type) {
    case GamePacketType.SET_FIELD:
      // setApples(packet.apples);
      // renderAppleBoard(packet.apples);
      console.log("SET_FIELD packet received:", packet.apples);
      break;

    case GamePacketType.DROP_CELL_INDEX:
      // 서버에서 확정 패킷이 오면 점수를 반영하고 사과를 제거
      //handleAppleDrop(packet.winnerId, packet.indices, packet.totalScore);
      console.log("DROP_CELL_INDEX packet received:", packet);
      // removeApples(packet.indices, packet.winnerId);
      // updateScore(packet.winnerId, packet.totalScore);
      break;

    case GamePacketType.SET_TIME:
      // setTime(packet.limitTime);
      console.log("SET_TIME packet received:", packet.limitTime);
      break;

    case GamePacketType.UPDATE_DRAG_AREA:
      // 다른 플레이어의 드래그 박스 좌표 업데이트
      // updateOtherPlayerDrag(
      //   packet.playerId,
      //   packet.startX,
      //   packet.startY,
      //   packet.endX,
      //   packet.endY
      // );
      console.log("UPDATE_DRAG_AREA packet received:", packet);
      break;

    // ... 나머지 패킷들
    case GamePacketType.TIME_END:
      // showResultWindow(packet.results);
      console.log("TIME_END packet received:", packet.results);
      break;

    // ... 나머지 패킷 처리

    default:
      // const _exhaustiveCheck: never = packet;
      console.error("Unknown packet type received");
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
