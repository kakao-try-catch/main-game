import { GameConfig } from "../../../../common/src/config";

export interface GameInstance {
  // Lifecycle
  initialize(config: GameConfig): void;
  start(): void;
  stop(): void;
  destroy(): void;

  // Player actions (game-specific packets)
  // todo 패킷 자체는 serverHandler 에서 각 라우팅을 해서 핸들링을 하되 거기서 session 것을 호출하도록?
  handlePacket(socketId: string, playerIndex: number, packet: any): void;
}
