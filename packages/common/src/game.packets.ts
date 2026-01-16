export enum PacketType {
    SET_FIELD = "SET_FIELD",
    SET_TIME = "SET_TIME",
    UPDATE_DRAG_AREA = "UPDATE_DRAG_AREA",
    DROP_CELL_INDEX = "DROP_CELL_INDEX",
    TIME_END = "TIME_END",
    CONFIRM_DRAG_AREA = "CONFIRM_DRAG_AREA",
    DRAWING_DRAG_AREA = "DRAWING_DRAG_AREA"
}

// 공통 데이터 타입
type PlayerId = string;
type AppleIndex = number;

// --- ClientBound (Server -> Client) ---

interface SetFieldPacket {
    type: "SET_FIELD";
    apples: number[]; // 0~9 숫자가 담긴 배열
}

interface SetTimePacket {
    type: "SET_TIME";
    limitTime: number;
}

interface UpdateDragAreaPacket {
    type: "UPDATE_DRAG_AREA";
    playerId: PlayerId;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

interface DropCellIndexPacket {
    type: "DROP_CELL_INDEX";
    winnerId: PlayerId;
    indices: AppleIndex[];
    totalScore: number; // Snapshot 방식
}

interface TimeEndPacket {
    type: "TIME_END";
    results: {
        rank: number;
        playerId: PlayerId;
        score: number;
    }[];
}

// --- ServerBound (Client -> Server) ---

interface ConfirmDragAreaPacket {
    type: "CONFIRM_DRAG_AREA";
    indices: AppleIndex[];
}

interface DrawingDragAreaPacket {
    type: "DRAWING_DRAG_AREA";
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

// 전체 패킷 타입 합치기
export type GamePacket = 
    | SetFieldPacket | SetTimePacket | UpdateDragAreaPacket 
    | DropCellIndexPacket | TimeEndPacket | ConfirmDragAreaPacket 
    | DrawingDragAreaPacket;