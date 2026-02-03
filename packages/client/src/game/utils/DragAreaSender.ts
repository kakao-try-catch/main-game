import Phaser from 'phaser';
import { socketManager } from '../../network/socket';
import { AppleGamePacketType } from '../../../../common/src/packets';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

interface NormalizedRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * 드래그 영역을 서버로 전송하는 클래스
 * - 100ms 간격으로 전송
 * - 연속 3회 동일한 영역이면 전송 스킵
 */
export class DragAreaSender {
  private lastSentRect: NormalizedRect | null = null;
  private duplicateCount: number = 0;
  private sendInterval: ReturnType<typeof setInterval> | null = null;
  private pendingRect: NormalizedRect | null = null;

  private static readonly SEND_INTERVAL_MS = 200;
  private static readonly MAX_DUPLICATE_COUNT = 3;
  private static readonly EPSILON = 0.001; // 부동소수점 비교 허용 오차

  constructor() {
    this.startSendLoop();
  }

  /** 드래그 영역 업데이트 (onDrag에서 호출) */
  public updateDragArea(rect: Phaser.Geom.Rectangle): void {
    const ratio = window.__GAME_RATIO || 1;

    // 정규화 좌표(0~1)로 변환
    this.pendingRect = {
      startX: rect.x / (GAME_WIDTH * ratio),
      startY: rect.y / (GAME_HEIGHT * ratio),
      endX: (rect.x + rect.width) / (GAME_WIDTH * ratio),
      endY: (rect.y + rect.height) / (GAME_HEIGHT * ratio),
    };
  }

  /** 드래그 종료 시 호출 */
  public clearDragArea(): void {
    this.pendingRect = null;
    this.lastSentRect = null;
    this.duplicateCount = 0;
  }

  private startSendLoop(): void {
    this.sendInterval = setInterval(() => {
      this.trySendDragArea();
    }, DragAreaSender.SEND_INTERVAL_MS);
  }

  private trySendDragArea(): void {
    if (!this.pendingRect) return;

    // 중복 체크 - 3번 이상 동일하면 전송 스킵
    if (this.isSameRect(this.pendingRect, this.lastSentRect)) {
      this.duplicateCount++;
      // if (this.duplicateCount >= DragAreaSender.MAX_DUPLICATE_COUNT) {
      //   return;
      // }
    } else {
      this.duplicateCount = 0;
    }

    // 패킷 전송
    socketManager.send({
      type: AppleGamePacketType.DRAWING_DRAG_AREA,
      startX: this.pendingRect.startX,
      startY: this.pendingRect.startY,
      endX: this.pendingRect.endX,
      endY: this.pendingRect.endY,
    });

    this.lastSentRect = { ...this.pendingRect };
  }

  private isSameRect(a: NormalizedRect, b: NormalizedRect | null): boolean {
    if (!b) return false;
    const epsilon = DragAreaSender.EPSILON;
    return (
      Math.abs(a.startX - b.startX) < epsilon &&
      Math.abs(a.startY - b.startY) < epsilon &&
      Math.abs(a.endX - b.endX) < epsilon &&
      Math.abs(a.endY - b.endY) < epsilon
    );
  }

  public destroy(): void {
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
    this.pendingRect = null;
    this.lastSentRect = null;
  }
}
