// 방 관리 로직을 여기에 구현하세요
// 예: export class RoomManager { }

// 서버 메모리 상의 게임 방 상태 예시
interface GameRoom {
    apples: number[]; // 초기 생성된 사과 숫자들 [9, 1, 4, 6, ...]
    removedIndices: Set<number>; // 이미 제거된 사과 인덱스 저장
    scores: Map<string, number>; // 플레이어별 점수
    // ... 기타 상태
}