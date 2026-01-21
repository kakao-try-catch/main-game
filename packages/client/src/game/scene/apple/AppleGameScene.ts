import Phaser from 'phaser';
import AppleGameManager from './AppleGameManager';
import type { AppleGamePreset } from '../../types/AppleGamePreset';
import { resolvePreset } from '../../types/AppleGamePreset';

// You can write more code here

/* START OF COMPILED CODE */

export default class AppleGameScene extends Phaser.Scene {
  constructor() {
    super('AppleGameScene');

    /* START-USER-CTR-CODE */
    // Write your code here.
    /* END-USER-CTR-CODE */
  }

  //이제 AppleGameScene.scene은 절대 연 다음에 저장하면 안됩니다. 그거 열어서 저장하면 이 코드 날아감 (원래 페이저 에디터가 그럼)

  editorCreate(): void {
    const ratio = window.__APPLE_GAME_RATIO || 1;
    // 게임 전체 컨테이너 생성 (0,0)
    this.gameContainer = this.add.container(0, 0);
    this.gameContainer.setSize(1380 * ratio, 862 * ratio);

    // 배경
    const background = this.add.rectangle(0, 0, 1380 * ratio, 862 * ratio);
    background.setOrigin(0, 0);
    background.isFilled = true;
    background.fillColor = 0xffffff;
    this.gameContainer.add(background);

    // margin, 사과 그리드, 타이머 바 위치 계산은 create()에서 동적으로 수행

    this.events.emit('scene-awake');
  }

  // private timer!: TimerPrefab;
  private gameManager!: AppleGameManager;
  private gameContainer!: Phaser.GameObjects.Container;
  private _appleGridConfig!: {
    baseX: number;
    spacingX: number;
    gridCols: number;
    gridRows: number;
    spacingY: number;
    baseY: number;
  };
  private isGameInitialized: boolean = false;
  private _currentPreset?: AppleGamePreset;

  /* START-USER-CODE */

  /** 프리셋에 따라 그리드 설정 계산 */
  private calculateGridConfig(gridCols: number, gridRows: number): void {
    const ratio = window.__APPLE_GAME_RATIO || 1;
    const canvasWidth = this.sys.game.canvas.width;
    const canvasHeight = this.sys.game.canvas.height;
    const margin = 20 * ratio;
    const timerBarWidth = 22 * ratio;
    const timerBarMarginRight = 30 * ratio;

    // 사과 크기 기본값
    const baseAppleSize = 50 * ratio;

    // 사용 가능한 영역 계산
    // 왼쪽 여백을 더 추가
    const extraLeftMargin = 50 * ratio; // 추가 왼쪽 여백
    const availableWidth =
      canvasWidth -
      timerBarWidth -
      timerBarMarginRight -
      2 * margin -
      extraLeftMargin;
    // 타이머와 동일한 상하 여백 사용 (50 * ratio)
    const verticalMargin = 50 * ratio;
    const availableHeight = canvasHeight - 2 * verticalMargin;

    // 그리드에 맞는 사과 크기와 간격 계산
    // 가로와 세로를 독립적으로 계산
    const maxAppleWidth = availableWidth / gridCols;
    const maxAppleHeight = availableHeight / gridRows;

    // 사과 크기 비율 (가로/세로 독립적)
    let sizeRatioX: number;
    let sizeRatioY: number;

    if (gridCols >= 20 || gridRows >= 15) {
      // 어려움: 가로 70%, 세로 60% (세로 간격 더 넓게)
      sizeRatioX = 0.7;
      sizeRatioY = 0.6;
    } else {
      // 기본/쉬움: 가로 90% (간격 좁게), 세로 70% (간격 넓게)
      sizeRatioX = 0.9;
      sizeRatioY = 0.7;
    }

    const appleWidthSpace = maxAppleWidth * sizeRatioX;
    const appleHeightSpace = maxAppleHeight * sizeRatioY;
    const appleSize = Math.min(
      appleWidthSpace,
      appleHeightSpace,
      baseAppleSize,
    );

    // 간격 계산 (가로는 좁게, 세로는 넓게)
    const spacingX =
      gridCols > 1 ? (availableWidth - appleSize) / (gridCols - 1) : 0;
    const spacingY =
      gridRows > 1 ? (availableHeight - appleSize) / (gridRows - 1) : 0;

    // 그리드 전체 너비 계산
    const totalGridWidth = (gridCols - 1) * spacingX + appleSize;

    // 왼쪽 정렬 (추가 여백 포함)
    const baseX =
      margin + extraLeftMargin + (availableWidth - totalGridWidth) / 2;
    const baseY = verticalMargin; // 타이머와 동일한 상단 여백

    this._appleGridConfig = {
      baseX,
      spacingX,
      gridCols,
      gridRows,
      spacingY,
      baseY,
    };

    console.log('🎯 그리드 설정 계산:', {
      gridCols,
      gridRows,
      appleSize: appleSize / ratio,
      spacingX: spacingX / ratio,
      spacingY: spacingY / ratio,
      totalGridWidth: totalGridWidth / ratio,
      availableWidth: availableWidth / ratio,
      availableHeight: availableHeight / ratio,
      baseX: baseX / ratio,
      centered: true,
    });
  }

  create() {
    this.editorCreate();

    // 기본 그리드 설정 (프리셋이 없을 경우)
    this.calculateGridConfig(17, 10);

    // AppleGameManager가 사과 생성, 드래그 선택, 타이머를 모두 관리
    // gameContainer를 넘겨서 사과도 이 컨테이너에 추가하도록 함
    this.gameManager = new AppleGameManager(
      this,
      undefined,
      this.gameContainer,
      {
        baseX: this._appleGridConfig.baseX,
        baseY: this._appleGridConfig.baseY,
        spacingX: this._appleGridConfig.spacingX,
        spacingY: this._appleGridConfig.spacingY,
        gridCols: this._appleGridConfig.gridCols,
        gridRows: this._appleGridConfig.gridRows,
      },
    );

    // React에서 플레이어 데이터 업데이트 수신 (먼저 등록)
    this.events.on(
      'updatePlayers',
      (data: {
        playerCount: number;
        players: { id: string; name: string; score: number; color: string }[];
        currentPlayerIndex: number;
        preset?: AppleGamePreset;
      }) => {
        console.log('📩 updatePlayers 이벤트 수신:', data);

        // 게임이 아직 초기화되지 않았으면 초기값 저장 후 초기화
        if (!this.isGameInitialized) {
          // 프리셋이 있으면 게임 설정 업데이트 (초기화 전에!)
          if (data.preset) {
            this._currentPreset = data.preset;
            const resolvedConfig = resolvePreset(data.preset);

            // 그리드 크기에 맞춰 레이아웃 재계산
            this.calculateGridConfig(
              resolvedConfig.gridCols,
              resolvedConfig.gridRows,
            );

            // AppleGameManager 설정 업데이트
            this.gameManager.updateGameConfig({
              ...resolvedConfig,
              baseX: this._appleGridConfig.baseX,
              baseY: this._appleGridConfig.baseY,
              spacingX: this._appleGridConfig.spacingX,
              spacingY: this._appleGridConfig.spacingY,
            });

            console.log(
              '🎮 프리셋 적용 (초기화 전):',
              data.preset,
              '→',
              resolvedConfig,
            );
          }

          this.gameManager.updatePlayerData(data.playerCount, data.players);
          this.gameManager.init(data.currentPlayerIndex);
          this.isGameInitialized = true;
        } else {
          // 이미 초기화된 경우 업데이트만
          this.gameManager.updatePlayerData(data.playerCount, data.players);
          this.gameManager.setCurrentPlayerIndex(data.currentPlayerIndex);

          // 프리셋 변경 시 경고 (게임 재시작 필요)
          if (data.preset) {
            console.warn('⚠️ 프리셋 변경은 게임 재시작 후 적용됩니다.');
          }
        }
      },
    );
  }

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here

// Named export to support `import { AppleGameScene } ...`
export { AppleGameScene };
