import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { useGameStore, type DragAreaData } from '../../store/gameStore';

interface PlayerDragState {
  current: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
  target: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
  graphics: Phaser.GameObjects.Graphics;
  color: number;
  lastUpdateTime: number;
}

/**
 * 다른 플레이어의 드래그 영역을 렌더링하는 클래스
 * - lerp 보간으로 부드러운 애니메이션
 * - 500ms 타임아웃 시 페이드 아웃
 */
export class OtherPlayerDragRenderer {
  private scene: Phaser.Scene;
  private container?: Phaser.GameObjects.Container;
  private playerStates: Map<number, PlayerDragState> = new Map();
  private updateEvent?: Phaser.Time.TimerEvent;
  private unsubscribe?: () => void;

  private static readonly INTERPOLATION_SPEED = 0.15; // lerp 계수
  private static readonly FADE_TIMEOUT_MS = 500; // 패킷 미수신 시 페이드 아웃

  constructor(
    scene: Phaser.Scene,
    container?: Phaser.GameObjects.Container,
    private playerIndexMap?: Map<number, number>,
  ) {
    this.scene = scene;
    this.container = container;
    this.startUpdateLoop();
    this.subscribeToStore();
  }

  /** gameStore 구독 */
  private subscribeToStore(): void {
    this.unsubscribe = useGameStore.subscribe(
      (state) => state.otherPlayerDrags,
      (drags) => {
        drags.forEach((data) => {
          this.updatePlayerDrag(data);
        });
      },
    );
  }

  /** UPDATE_DRAG_AREA 패킷 수신 시 호출 */
  public updatePlayerDrag(data: DragAreaData): void {
    const ratio = window.__GAME_RATIO || 1;

    // 정규화 좌표를 실제 좌표로 변환
    const denormalized = {
      startX: data.startX * GAME_WIDTH * ratio,
      startY: data.startY * GAME_HEIGHT * ratio,
      endX: data.endX * GAME_WIDTH * ratio,
      endY: data.endY * GAME_HEIGHT * ratio,
    };

    let state = this.playerStates.get(data.playerIndex);

    if (!state) {
      // 새 플레이어 - Graphics 생성
      const graphics = this.scene.add.graphics();
      graphics.setDepth(999); // 사과 위에 표시

      if (this.container) {
        this.container.add(graphics);
      }

      const players = useGameStore.getState().players;
      const player = players[data.playerIndex];
      const colorHex = parseInt(player.color.replace('#', ''), 16);

      state = {
        current: { ...denormalized },
        target: { ...denormalized },
        graphics,
        color: colorHex,
        lastUpdateTime: Date.now(),
      };

      this.playerStates.set(data.playerIndex, state);
    } else {
      // 기존 플레이어 - target 업데이트
      state.target = { ...denormalized };
      state.lastUpdateTime = Date.now();
    }
  }

  /** 플레이어 드래그 종료 (또는 타임아웃) */
  public removePlayerDrag(playerIndex: number): void {
    const state = this.playerStates.get(playerIndex);
    if (state) {
      state.graphics.destroy();
      this.playerStates.delete(playerIndex);
    }
  }

  private startUpdateLoop(): void {
    this.updateEvent = this.scene.time.addEvent({
      delay: 16, // ~60fps
      callback: this.update,
      callbackScope: this,
      loop: true,
    });
  }

  private update(): void {
    const now = Date.now();

    this.playerStates.forEach((state, playerIndex) => {
      // 타임아웃 체크
      if (
        now - state.lastUpdateTime >
        OtherPlayerDragRenderer.FADE_TIMEOUT_MS
      ) {
        this.removePlayerDrag(playerIndex);
        return;
      }

      // Lerp 보간
      // todo speed 라
      const speed = OtherPlayerDragRenderer.INTERPOLATION_SPEED;
      state.current.startX = this.lerp(
        state.current.startX,
        state.target.startX,
        speed,
      );
      state.current.startY = this.lerp(
        state.current.startY,
        state.target.startY,
        speed,
      );
      state.current.endX = this.lerp(
        state.current.endX,
        state.target.endX,
        speed,
      );
      state.current.endY = this.lerp(
        state.current.endY,
        state.target.endY,
        speed,
      );

      // 렌더링
      this.renderDragArea(state);
    });
  }

  private lerp(current: number, target: number, speed: number): number {
    return current + (target - current) * speed;
  }

  private renderDragArea(state: PlayerDragState): void {
    const { graphics, current, color } = state;

    const x = Math.min(current.startX, current.endX);
    const y = Math.min(current.startY, current.endY);
    const width = Math.abs(current.endX - current.startX);
    const height = Math.abs(current.endY - current.startY);

    graphics.clear();
    graphics.fillStyle(color, 0.2); // 반투명 채우기
    graphics.fillRect(x, y, width, height);
    graphics.lineStyle(2, color, 0.6);
    graphics.strokeRect(x, y, width, height);
  }

  /** 플레이어 인덱스 맵 업데이트 */
  public setPlayerIndexMap(map: Map<number, number>): void {
    this.playerIndexMap = map;
  }

  public destroy(): void {
    this.updateEvent?.destroy();
    this.unsubscribe?.();
    this.playerStates.forEach((state) => state.graphics.destroy());
    this.playerStates.clear();
  }
}
