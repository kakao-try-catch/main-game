import Phaser from 'phaser';
import applePrefab from './ApplePrefab';
import TimerPrefab from '../../utils/TimerPrefab';
import TimerSystem from '../../utils/TimerSystem';
import { attachDragSelection } from '../../utils/dragSelection';
import { socketManager } from '../../../network/socket';
import { GamePacketType } from '../../../../../common/src/packets';
import type { PlayerData } from '../../types/common';
import { hexStringToNumber, adjustBrightness } from '../../utils/colorUtils';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config/gameConfig';
import { getMyPlayerData, useGameStore } from '../../../store/gameStore';
import { DragAreaSender } from '../../utils/DragAreaSender';
import { OtherPlayerDragRenderer } from '../../utils/OtherPlayerDragRenderer';

// Declare the global property for TypeScript
declare global {
  interface Window {
    __GAME_RATIO?: number;
  }
}

/** 사과 게임 설정 */
interface AppleGameRenderConfig {
  baseX: number; // 시작 X 좌표 (91)
  baseY: number; // 시작 Y 좌표 (91)
  spacingX: number; // X 간격 (73px)
  spacingY: number; // Y 간격 (74px)

  gridCols: number; // 가로 사과 개수 (17)
  gridRows: number; // 세로 사과 개수 (10)
  ratio: number; // 스케일 비율

  // minNumber: number; // 최소 숫자 (1)
  // maxNumber: number; // 최대 숫자 (9)
  totalTime: number; // 전체 게임 시간 (110초) // todo 얘도 필요없음
  playerCount: number; // 플레이어 수 (1~4) // todo 얘도
}

const DEFAULT_CONFIG: AppleGameRenderConfig = {
  gridCols: 17,
  gridRows: 10,
  baseX: 91,
  baseY: 91,
  spacingX: 73,
  spacingY: 74,
  // minNumber: 1,
  // maxNumber: 9,
  totalTime: 110,
  playerCount: 4,
  ratio: 1,
};

export default class AppleGameManager {
  private container: Phaser.GameObjects.Container | null = null;
  private readonly scene: Phaser.Scene;
  private readonly config: AppleGameRenderConfig;

  // 현재 유저의 플레이어 인덱스
  private currentPlayerIndex: number = 0;

  // 전체 사과 리스트
  private apples: applePrefab[] = [];

  // 사과 인덱스 맵 (사과 -> 인덱스)
  private appleIndexMap: Map<applePrefab, number> = new Map();

  // 현재 선택된 사과들 (합이 10일시 이걸 apples에서 삭제함)
  private selectedApples: Set<applePrefab> = new Set();

  // 타이머 관련
  private timerPrefab!: TimerPrefab;
  private timerSystem!: TimerSystem;

  // 드래그 선택 해제용
  private detachDrag?: () => void;

  // 드래그 영역 서버 전송용 (멀티플레이)
  private dragAreaSender?: DragAreaSender;

  // 타 플레이어 드래그 영역 렌더링용 (멀티플레이)
  private otherPlayerDragRenderer?: OtherPlayerDragRenderer;

  // 플레이어 데이터
  private players: PlayerData[] = [];

  // 기본 플레이어 색상 (1P 파란색 기준)
  private static readonly DEFAULT_COLORS = [
    '#209cee', // 1P 파란색
    '#e76e55', // 2P 빨간색
    '#92cc41', // 3P 초록색
    '#f2d024', // 4P 노란색
  ];

  // 프레임 밝기 조절 값 (기본 플레이어 색상 대비)
  private static readonly FRAME_BRIGHTNESS_ADJUSTMENT: number = 15;

  // 현재 플레이어 색상 (0x 형식) - 1P 파란색 기본값
  private currentPlayerColor: number = 0x209cee;
  private currentFrameColor: number = adjustBrightness(
    '#209cee',
    AppleGameManager.FRAME_BRIGHTNESS_ADJUSTMENT,
  );

  constructor(
    scene: Phaser.Scene,
    timer: TimerPrefab | undefined,
    container?: Phaser.GameObjects.Container,
    config: Partial<AppleGameRenderConfig> = {},
  ) {
    this.scene = scene;
    this.container = container ?? null;
    // ratio 우선순위: config.ratio > window.__GAME_RATIO > 1
    const ratio = config.ratio ?? window.__GAME_RATIO ?? 1;
    const gridCols = config.gridCols ?? DEFAULT_CONFIG.gridCols;
    const gridRows = config.gridRows ?? DEFAULT_CONFIG.gridRows;

    // config에서 제공된 값 사용, 없으면 기준값에 비율 곱
    const baseX = config.baseX ?? 91 * ratio;
    const baseY = config.baseY ?? 91 * ratio;
    const spacingX = config.spacingX ?? 73 * ratio;
    const spacingY = config.spacingY ?? 74 * ratio;

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      gridCols,
      gridRows,
      baseX,
      baseY,
      spacingX,
      spacingY,
      ratio,
    };
    // 타이머바의 세로 길이를 Phaser 캔버스의 세로 길이에서 margin을 빼서 계산
    const canvasWidth =
      (scene.sys.game.config.width as number) || window.innerWidth;
    const canvasHeight =
      (scene.sys.game.config.height as number) || window.innerHeight;
    const timerRatio = this.config.ratio;
    const timerBarMarginTop = 50 * timerRatio; // px, 상하 여백 증가
    const timerBarMarginBottom = 50 * timerRatio; // px, 상하 여백 증가
    const timerBarCanvasHeight =
      canvasHeight - timerBarMarginTop - timerBarMarginBottom;
    const timerBarWidth = 22 * timerRatio;
    const timerBarMarginRight = 30 * timerRatio; // 오른쪽 마진
    // x좌표: 캔버스 오른쪽 끝에서 마진과 타이머 바 width의 절반만큼 뺀 위치
    const timerBarX = canvasWidth - timerBarMarginRight - timerBarWidth / 2;
    console.log('[DEBUG] 캔버스 width:', canvasWidth, 'timerBarX:', timerBarX);

    // TimerPrefab의 x, y, barHeight를 명확히 지정 (origin이 (0.5, 1)이므로 y를 아래로 내림)
    const timerBarY = timerBarMarginTop + timerBarCanvasHeight;
    this.timerPrefab =
      timer ??
      new TimerPrefab(scene, timerBarX, timerBarY, timerBarCanvasHeight);
    // 타이머를 컨테이너 또는 씬에 추가하여 화면에 보이게 함
    if (this.container) {
      this.container.add(this.timerPrefab);
    } else {
      this.scene.add.existing(this.timerPrefab);
    }
  }

  /** 게임 설정 업데이트 (프리셋 적용) */
  updateGameConfig(config: Partial<AppleGameRenderConfig>): void {
    // 설정 업데이트
    Object.assign(this.config, config);
    console.log('🎮 게임 설정 업데이트:', config);
  }

  /** 사과 그리드 생성 (서버 데이터 또는 랜덤 생성) */
  private createApples(appleNumbers?: number[]): void {
    const { gridCols, gridRows, baseX, baseY, spacingX, spacingY, ratio } =
      this.config;

    // 그리드 크기에 따라 사과 스케일 조정
    // todo 여기서 계산할 필요가 없는 것. 상수라서 그냥 따로 빼면 됨. ratio 결정될 때 만들면 됨.
    let appleScale = ratio;
    if (gridCols >= 30 || gridRows >= 15) {
      appleScale = ratio * 0.7; // L 크기(30x15): 70% 크기
    } else if (gridCols === 20 && gridRows === 10) {
      appleScale = ratio * 1.05; // M 크기(20x10): 105% 크기
    } else if (gridCols <= 16 && gridRows <= 8) {
      appleScale = ratio * 1.1; // S 크기(16x8): 110% 크기
    }

    // 기존 사과 정리
    this.apples.forEach((apple) => apple.destroy());
    this.apples = [];
    this.appleIndexMap.clear();

    let index = 0;
    for (let col = 0; col < gridCols; col++) {
      for (let row = 0; row < gridRows; row++) {
        const x = baseX + col * spacingX;
        const y = baseY + row * spacingY;
        const apple = new applePrefab(this.scene, x, y, appleScale);
        // todo ?? 왜 이렇게 함
        if (this.container) {
          this.container.add(apple);
        } else {
          this.scene.add.existing(apple);
        }
        // 서버에서 받은 숫자 사용, 없으면 -1
        // todo 애초에 appleNumbers 못 받으면 시작 못 하게 하기
        const num = appleNumbers?.[index] ?? -1;
        apple.setNumber(num);
        this.apples.push(apple);
        this.appleIndexMap.set(apple, index);
        index++;
      }
    }

    console.log(`🍎 사과 ${this.apples.length}개 생성 완료`);
  }

  /** 서버 데이터로 게임 초기화 (멀티플레이용) */
  public initWithServerData(
    apples: number[],
    currentPlayerIndex: number,
  ): void {
    this.createApples(apples);
    this.setCurrentPlayerIndex(currentPlayerIndex);
    this.setupDragSelection();
    this.subscribeToDropCellEvents();

    // 멀티플레이용 드래그 영역 전송 활성화
    this.dragAreaSender = new DragAreaSender();

    // 멀티플레이용 타 플레이어 드래그 영역 렌더링 활성화
    this.otherPlayerDragRenderer = new OtherPlayerDragRenderer(
      this.scene,
      this.container ?? undefined,
    );

    console.log('🎮 서버 데이터로 게임 초기화 완료');
  }

  /** 지정된 시간으로 타이머 시작 (멀티플레이용) */
  public startTimerWithDuration(seconds: number): void {
    this.timerSystem = new TimerSystem(this.scene, this.timerPrefab, this);

    // 서버 시작 시간 가져오기
    const serverStartTime = useGameStore.getState().serverStartTime;
    this.timerSystem.start(seconds, serverStartTime || undefined);
    console.log(`⏱️ 타이머 시작: ${seconds}초`);
  }

  /** DROP_CELL_INDEX 이벤트 구독 */
  private unsubscribeDropCell?: () => void;
  private lastProcessedQueueLength: number = 0;

  private subscribeToDropCellEvents(): void {
    // 이전 구독 해제
    this.unsubscribeDropCell?.();

    // 새 게임 시작 시 카운터 초기화
    this.lastProcessedQueueLength = 0;

    // 먼저 로딩 중에 누적된 이벤트들 처리
    this.processPendingDropCellEvents();

    // 새로운 이벤트 구독 (큐 길이 변화 감지)
    this.unsubscribeDropCell = useGameStore.subscribe(
      (state) => state.dropCellEventQueue,
      (queue) => {
        // 새로 추가된 이벤트만 처리
        if (queue.length > this.lastProcessedQueueLength) {
          const newEvents = queue.slice(this.lastProcessedQueueLength);
          newEvents.forEach((event) => {
            const myId = socketManager.getId();
            const isMe = event.winnerId === myId;
            this.handleDropCell(event.indices, isMe);
          });
          this.lastProcessedQueueLength = queue.length;
        }
      },
    );
  }

  /** 로딩 중 누적된 DROP_CELL_INDEX 이벤트 처리 */
  private processPendingDropCellEvents(): void {
    const queue = useGameStore.getState().dropCellEventQueue;
    if (queue.length === 0) return;

    console.log(
      `🍎 로딩 중 누적된 ${queue.length}개의 DROP_CELL_INDEX 이벤트 처리`,
    );

    queue.forEach((event) => {
      const myId = socketManager.getId();
      const isMe = event.winnerId === myId;
      this.handleDropCell(event.indices, isMe);
    });

    // 처리된 이벤트 수 기록 (새 이벤트와 구분하기 위함)
    this.lastProcessedQueueLength = queue.length;
  }

  /** 사과 제거 처리 */
  private handleDropCell(indices: number[], isMe: boolean): void {
    indices.forEach((index) => {
      const apple = this.getAppleByIndex(index);
      if (apple && apple.active) {
        if (isMe) {
          // 내가 딴 사과 - 이미 선택 상태이므로 애니메이션만 (이미 처리됨)
          // 서버 확인 후 추가 처리가 필요하면 여기서
        } else {
          // 다른 플레이어가 딴 사과 - 블랙홀 효과
          apple.playBlackholeDestroy();
        }
      }
    });

    // 사과 리스트 정리
    this.apples = this.apples.filter((apple) => apple.active);
    console.log(`🍎 사과 제거 완료. 남은 사과: ${this.apples.length}개`);
  }

  /** 인덱스로 사과 찾기 */
  public getAppleByIndex(index: number): applePrefab | undefined {
    for (const [apple, idx] of this.appleIndexMap.entries()) {
      if (idx === index) return apple;
    }
    return undefined;
  }

  /**
   * 드래그 좌표를 0~1 범위로 정규화하여 서버 전송/동기화에 사용하기 위한 헬퍼입니다.
   *
   * 현재 이 프로젝트 내부 코드에서는 직접 호출하지 않지만,
   * 외부 모듈(예: 서버 통신 로직, 리플레이/분석 도구 등)에서
   * AppleGameManager.normalizeRect 를 사용할 수 있도록 남겨 둔 유틸리티 메소드입니다.
   */
  public static normalizeRect(rect: Phaser.Geom.Rectangle): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    const ratio = window.__GAME_RATIO || 1;
    // 항상 기준 해상도(GAME_WIDTH x GAME_HEIGHT)로 정규화
    return {
      x: rect.x / (GAME_WIDTH * ratio),
      y: rect.y / (GAME_HEIGHT * ratio),
      w: rect.width / (GAME_WIDTH * ratio),
      h: rect.height / (GAME_HEIGHT * ratio),
    };
  }

  /** 드래그 선택 박스 초기화 */
  private setupDragSelection(): void {
    this.detachDrag?.();

    const color = getMyPlayerData()?.color;
    const colorHex = hexStringToNumber(color ?? '#209cee');

    this.detachDrag = attachDragSelection(this.scene, {
      fillColor: colorHex,
      lineColor: colorHex,
      onDrag: (rect) => this.onDragUpdate(rect),
      onDragEnd: (rect) => this.onDragEnd(rect),
    });
  }

  /** 드래그 중 호출 - 선택 영역 업데이트 */
  private onDragUpdate(rect: Phaser.Geom.Rectangle): void {
    // 이전 선택 해제
    this.selectedApples.forEach((apple) => apple.setFrameVisible(false));
    this.selectedApples.clear();

    const color = getMyPlayerData()?.color;
    const frameColor = adjustBrightness(
      color ?? '#209cee',
      AppleGameManager.FRAME_BRIGHTNESS_ADJUSTMENT,
    );

    // 새로운 선택 영역 내 사과들 프레임 표시
    for (const apple of this.apples) {
      if (apple.isInRect(rect)) {
        apple.setFrameColor(frameColor);
        apple.setFrameVisible(true);
        this.selectedApples.add(apple);
      }
    }

    // 멀티플레이: 드래그 영역 서버로 전송
    this.dragAreaSender?.updateDragArea(rect);
  }

  /** 드래그 종료 시 호출 */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onDragEnd(_rect: Phaser.Geom.Rectangle): void {
    // 선택된 사과들의 숫자 합 계산
    let sum = 0;
    this.selectedApples.forEach((apple) => {
      sum += apple.getNumber();
    });

    console.log(`선택된 사과 수: ${this.selectedApples.size}, 합계: ${sum}`);

    // 합이 10이면 CONFIRM_DRAG_AREA 패킷 전송
    if (sum === 10) {
      // 선택된 사과들의 인덱스 수집
      const indices: number[] = [];
      this.selectedApples.forEach((apple) => {
        const index = this.appleIndexMap.get(apple);
        if (index !== undefined) {
          indices.push(index);
        }
      });

      // 패킷 전송
      socketManager.send({
        type: GamePacketType.CONFIRM_DRAG_AREA,
        indices,
      });

      console.log('📤 CONFIRM_DRAG_AREA 패킷 전송:', indices);

      const score = this.selectedApples.size;

      this.selectedApples.forEach((apple) => {
        apple.playFallAndDestroy();
      });
      // 삭제된 사과들을 리스트에서 한 번에 필터링
      this.apples = this.apples.filter((apple) => apple.active);

      // 점수 이벤트 발생
      this.scene.events.emit('appleScored', { points: score });
    } else {
      // 프레임 숨기기 (삭제하지 않은 경우에만)
      this.selectedApples.forEach((apple) => apple.setFrameVisible(false));
    }

    this.selectedApples.clear();

    // 멀티플레이: 드래그 영역 클리어
    this.dragAreaSender?.clearDragArea();
  }

  /** 타이머 시작 */
  private startTimer(): void {
    this.timerSystem = new TimerSystem(this.scene, this.timerPrefab, this);
    this.timerSystem.start(this.config.totalTime);
  }

  public gameEnd(): void {
    // 드래그 선택 비활성화
    this.detachDrag?.();
    // React로 게임 종료 이벤트 전달
    // const { players } = useGameStore.getState();
    // this.scene.events.emit('gameEnd', { players: players });
    // console.log('🎮 게임 종료! React로 이벤트 전달', players);
  }

  /** 현재 플레이어 인덱스 업데이트 */
  setCurrentPlayerIndex(index: number): void {
    // this.currentPlayerIndex = index;
    // this.updatePlayerColors();
    // 드래그 선택 색상 업데이트를 위해 재설정
    this.setupDragSelection();
    console.log(`🎮 현재 플레이어: ${index ?? -1}번`);
  }

  /** 플레이어 색상 업데이트 */
  private static readonly FRAME_BRIGHTNESS_OFFSET = 15;

  // todo 애초에 이거 색상 그리는 거 자체가 여기서 처리가 안 될 걸???
  private updatePlayerColors(): void {
    // todo 플레이어를 여기서 뽑아올 거 아님
    const player = this.players[this.currentPlayerIndex];
    // 플레이어 데이터가 없으면 기본 색상 사용
    // todo color 여기서 관리할 거 아님
    const colorHex =
      player?.color ??
      AppleGameManager.DEFAULT_COLORS[this.currentPlayerIndex] ??
      '#209cee';

    this.currentPlayerColor = hexStringToNumber(colorHex);
    this.currentFrameColor = adjustBrightness(
      colorHex,
      AppleGameManager.FRAME_BRIGHTNESS_OFFSET,
    );
    console.log(
      `🎨 플레이어 색상: ${colorHex}, 프레임: 0x${this.currentFrameColor.toString(16)}`,
    );
  }

  /** 플레이어 수 반환 */
  getPlayerCount(): number {
    return this.config.playerCount;
  }

  /** 플레이어 데이터 반환 */
  getPlayers(): PlayerData[] {
    return this.players;
  }

  /** 플레이어 데이터 업데이트 (React에서 호출) */
  updatePlayerData(playerCount: number, players: PlayerData[]): void {
    this.config.playerCount = playerCount;
    this.players = players;
    // this.updatePlayerColors();
    // 드래그 선택 색상 업데이트
    this.setupDragSelection();
    console.log(`👥 플레이어 데이터 업데이트: ${playerCount}명`, players);
  }

  /** 전체 사과 리스트 반환 */
  getApples(): applePrefab[] {
    return this.apples;
  }

  /** 현재 선택된 사과들 반환 */
  getSelectedApples(): applePrefab[] {
    return Array.from(this.selectedApples);
  }

  /** 특정 사각형 범위 안의 사과들 반환 */
  getApplesInRect(rect: Phaser.Geom.Rectangle): applePrefab[] {
    return this.apples.filter((apple) => apple.isInRect(rect));
  }

  /** 타이머 시스템 반환 */
  getTimerSystem(): TimerSystem {
    return this.timerSystem;
  }

  /** 정리 */
  destroy(): void {
    this.detachDrag?.();
    this.unsubscribeDropCell?.();
    this.dragAreaSender?.destroy();
    this.otherPlayerDragRenderer?.destroy();
    this.timerSystem?.destroy();
    this.apples.forEach((apple) => apple.destroy());
    this.apples = [];
    this.selectedApples.clear();
  }
}
