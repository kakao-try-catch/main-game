import { PacketType, GamePacket } from "../../shared/types/game.packets";

function handleClientPacket(playerId: string, packet: GamePacket) {
    switch (packet.type) {
        case PacketType.DRAWING_DRAG_AREA:
            // 1. 단순 브로드캐스팅: "A가 여기 드래그 중이다"라고 전달 (나 제외)
            broadcastToOthers(playerId, {
                type: PacketType.UPDATE_DRAG_AREA,
                playerId: playerId,
                ...packet // startX, startY, endX, endY 포함
            });
            break;

        case PacketType.CONFIRM_DRAG_AREA:
            // 2. 사과 제거 판정 로직 호출
            processAppleSelection(playerId, packet.indices);
            break;

        // 나머지 패킷 처리...
    }
}

function processAppleSelection(playerId: string, indices: number[]) {
    const room = getRoomByPlayer(playerId);
    
    // [검증 1] 인덱스 유효성 및 중복 제거 확인
    // 요청한 인덱스 중 하나라도 이미 제거된 상태라면 무시
    const isAlreadyTaken = indices.some(idx => room.removedIndices.has(idx));
    if (isAlreadyTaken) {
        console.log(`[Reject] Player ${playerId} requested already removed apples.`);
        return; // 아무 패킷도 보내지 않음 (클라이언트 타임아웃 유도)
    }

    // [검증 2] 합계가 10인지 확인
    const sum = indices.reduce((acc, idx) => acc + room.apples[idx], 0);
    if (sum !== 10) {
        console.log(`[Reject] Sum is not 10. Player: ${playerId}, Sum: ${sum}`);
        return; // 무시
    }

    // [확정] 검증 통과 시 상태 업데이트
    indices.forEach(idx => room.removedIndices.add(idx)); // 서버 DB/메모리에 기록
    
    const currentScore = (room.scores.get(playerId) || 0) + indices.length;
    room.scores.set(playerId, currentScore);

    // [전송] 모든 플레이어에게 결과 브로드캐스팅
    broadcastToAll({
        type: PacketType.DROP_CELL_INDEX,
        winnerId: playerId,
        indices: indices,
        totalScore: currentScore
    });
}