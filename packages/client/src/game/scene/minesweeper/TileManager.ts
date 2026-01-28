import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config/gameConfig';
import { TileState } from '../../types/minesweeper.types';

// 타일 데이터 인터페이스 (로컬 렌더링용)
export interface TileRenderData {
  row: number;
  col: number;
  isMine: boolean;
  adjacentMines: number;
  state: TileState;
}

// 타일 매니저 설정
export interface TileManagerConfig {
  gridCols: number;
  gridRows: number;
  mineCount: number;
}

export default class TileManager {
  private scene: Phaser.Scene;
  private gameContainer: Phaser.GameObjects.Container;

  // 그리드 설정
  private gridCols: number;
  private gridRows: number;
  private mineCount: number;

  // 타일 관련
  private tileSize: number = 0;
  private tiles: TileRenderData[][] = [];
  private tileSprites: Phaser.GameObjects.Image[][] = [];
  private tileTexts: Phaser.GameObjects.Text[][] = [];
  private mineSprites: (Phaser.GameObjects.Image | null)[][] = [];
  private flagSprites: (Phaser.GameObjects.Image | null)[][] = [];

  // 디버그 모드
  private debugMode: boolean = false;
  private debugOverlays: Phaser.GameObjects.Container[] = [];

  // 그리드 시작 위치 (중앙 정렬용)
  private gridStartX: number = 0;
  private gridStartY: number = 0;

  // 플레이어 색상 매핑
  private playerColors: Map<string, string> = new Map();

  constructor(
    scene: Phaser.Scene,
    gameContainer: Phaser.GameObjects.Container,
    config: TileManagerConfig,
  ) {
    this.scene = scene;
    this.gameContainer = gameContainer;
    this.gridCols = config.gridCols;
    this.gridRows = config.gridRows;
    this.mineCount = config.mineCount;
  }

  /**
   * 타일맵 초기화 (크기 계산, 데이터 생성, 스프라이트 생성)
   */
  public initialize(): void {
    this.calculateTileSize();
    this.initializeTiles();
    this.createTileSprites();

    console.log(
      `[TileManager] 초기화 완료: ${this.gridCols}x${this.gridRows} 그리드, 지뢰 ${this.mineCount}개`,
    );
  }

  /**
   * 플레이어 색상 설정
   */
  public setPlayerColors(players: { id: string; color: string }[]): void {
    console.log('[TileManager] setPlayerColors 호출됨, players:', players);
    this.playerColors.clear();
    for (const player of players) {
      this.playerColors.set(player.id, player.color);
    }
  }

  /**
   * 타일 크기 계산 (화면을 가득 채우도록)
   */
  private calculateTileSize(): void {
    const ratio = window.__GAME_RATIO || 1;

    // 타이머를 위한 공간 확보 (오른쪽에 80px 여유 공간)
    const timerReservedSpace = 40 * ratio;
    const availableWidth = GAME_WIDTH * ratio - timerReservedSpace;
    const availableHeight = GAME_HEIGHT * ratio;

    // 그리드에 맞는 타일 크기 계산
    const tileWidth = availableWidth / this.gridCols;
    const tileHeight = availableHeight / this.gridRows;

    // 정사각형 타일 유지 (더 작은 쪽에 맞춤)
    this.tileSize = Math.floor(Math.min(tileWidth, tileHeight));

    // 그리드 시작 위치 계산 (축소된 가로 공간 내에서 중앙 정렬)
    const gridWidth = this.gridCols * this.tileSize;
    const gridHeight = this.gridRows * this.tileSize;
    this.gridStartX = (availableWidth - gridWidth) / 2;
    this.gridStartY = (availableHeight - gridHeight) / 2;

    console.log(`[TileManager] 타일 크기: ${this.tileSize}px`);
  }

  /**
   * 타일 데이터 초기화 및 지뢰 배치
   */
  private initializeTiles(): void {
    this.tiles = [];

    // 모든 타일 초기화
    for (let row = 0; row < this.gridRows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.gridCols; col++) {
        this.tiles[row][col] = {
          row,
          col,
          isMine: false,
          adjacentMines: 0,
          state: TileState.HIDDEN,
        };
      }
    }
  }

  /**
   * 타일 스프라이트 생성
   */
  private createTileSprites(): void {
    this.tileSprites = [];
    this.tileTexts = [];
    this.mineSprites = [];
    this.flagSprites = [];

    for (let row = 0; row < this.gridRows; row++) {
      this.tileSprites[row] = [];
      this.tileTexts[row] = [];
      this.mineSprites[row] = [];
      this.flagSprites[row] = [];

      for (let col = 0; col < this.gridCols; col++) {
        const x = this.gridStartX + col * this.tileSize + this.tileSize / 2;
        const y = this.gridStartY + row * this.tileSize + this.tileSize / 2;

        // 타일 배경 (이미지 스프라이트)
        const tile = this.scene.add.image(x, y, 'TileClosed');
        tile.setDisplaySize(this.tileSize - 2, this.tileSize - 2);
        tile.setData('row', row);
        tile.setData('col', col);

        this.tileSprites[row][col] = tile;
        this.gameContainer.add(tile);

        // 타일 텍스트 (숫자 표시용)
        const text = this.scene.add.text(x, y, '', {
          fontSize: `${Math.floor(this.tileSize * 0.8)}px`,
          fontFamily: 'NeoDunggeunmo',
          color: '#ffffff',
        });
        text.setOrigin(0.5, 0.5);
        text.setVisible(false);

        this.tileTexts[row][col] = text;
        this.gameContainer.add(text);

        // 지뢰 스프라이트 (처음에는 null)
        this.mineSprites[row][col] = null;
        // 깃발 스프라이트 (처음에는 null)
        this.flagSprites[row][col] = null;
      }
    }
  }

  /**
   * 화면 좌표로 타일 위치 가져오기
   */
  public getTileAtPosition(
    x: number,
    y: number,
  ): { row: number; col: number } | null {
    // 그리드 영역 밖이면 null
    if (
      x < this.gridStartX ||
      x >= this.gridStartX + this.gridCols * this.tileSize ||
      y < this.gridStartY ||
      y >= this.gridStartY + this.gridRows * this.tileSize
    ) {
      return null;
    }

    const col = Math.floor((x - this.gridStartX) / this.tileSize);
    const row = Math.floor((y - this.gridStartY) / this.tileSize);

    // 범위 체크
    if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) {
      return null;
    }

    return { row, col };
  }

  /**
   * 서버에서 받은 타일 데이터로 동기화
   */
  public syncTilesFromServer(serverTiles: any[][]): void {
    if (!serverTiles || serverTiles.length === 0) {
      console.warn('[TileManager] 서버 타일 데이터가 비어있습니다');
      return;
    }

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        if (serverTiles[row] && serverTiles[row][col]) {
          const serverTile = serverTiles[row][col];
          this.tiles[row][col].isMine = serverTile.isMine;
          this.tiles[row][col].adjacentMines = serverTile.adjacentMines;
          this.tiles[row][col].state = serverTile.state;
        }
      }
    }

    console.log('[TileManager] 서버 타일 데이터 동기화 완료');
  }

  /**
   * 순차적 타일 열기 애니메이션 (거리별로 파동 효과)
   * @param tiles 거리 정보가 포함된 타일 업데이트 배열
   * @param delayMs 거리당 딜레이 (기본 50ms)
   */
  public revealTilesSequentially(
    tiles: Array<{
      row: number;
      col: number;
      state: TileState;
      adjacentMines?: number;
      isMine?: boolean;
      flaggedBy?: string | null;
      distance: number;
    }>,
    delayMs: number = 50,
  ): void {
    // 거리별로 그룹화
    const tilesByDistance: Map<number, typeof tiles> = new Map();

    for (const tile of tiles) {
      if (!tilesByDistance.has(tile.distance)) {
        tilesByDistance.set(tile.distance, []);
      }
      tilesByDistance.get(tile.distance)!.push(tile);
    }

    // 거리 순서대로 정렬
    const distances = Array.from(tilesByDistance.keys()).sort((a, b) => a - b);

    // 거리별로 순차적으로 타일 열기
    distances.forEach((distance, index) => {
      setTimeout(() => {
        const tilesAtDistance = tilesByDistance.get(distance)!;
        for (const tile of tilesAtDistance) {
          this.updateTileState(
            tile.row,
            tile.col,
            tile.state,
            tile.adjacentMines,
            tile.isMine,
            tile.flaggedBy,
          );
        }

        // 각 거리 단계마다 사운드 이벤트 발생
        this.scene.events.emit('minesweeperTileReveal');
      }, index * delayMs);
    });

    console.log(
      `[TileManager] 순차 애니메이션 시작: ${tiles.length}개 타일, ${distances.length}단계, ${delayMs}ms 간격`,
    );
  }

  /**
   * 타일 상태 업데이트 (서버에서 받은 데이터로 시각적 업데이트)
   */
  public updateTileState(
    row: number,
    col: number,
    state: TileState,
    adjacentMines?: number,
    isMine?: boolean,
    flaggedBy?: string | null,
  ): void {
    if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) {
      return;
    }

    const tile = this.tiles[row][col];
    const sprite = this.tileSprites[row][col];
    const text = this.tileTexts[row][col];

    if (!tile || !sprite || !text) return;

    tile.state = state;
    if (adjacentMines !== undefined) tile.adjacentMines = adjacentMines;
    if (isMine !== undefined) tile.isMine = isMine;

    // 상태에 따른 시각적 업데이트
    switch (state) {
      case TileState.REVEALED:
        sprite.setTexture('TileOpened');
        // 깃발 스프라이트 숨기기
        if (this.flagSprites[row][col]) {
          this.flagSprites[row][col]!.setVisible(false);
        }
        if (tile.isMine) {
          // 지뢰 이미지 표시
          sprite.setTint(0xe74c3c); // 빨간색 틴트
          text.setVisible(false);
          // 지뢰 스프라이트 생성 또는 표시
          if (!this.mineSprites[row][col]) {
            const x = this.gridStartX + col * this.tileSize + this.tileSize / 2;
            const y = this.gridStartY + row * this.tileSize + this.tileSize / 2;
            const mineSprite = this.scene.add.image(x, y, 'mine');
            mineSprite.setDisplaySize(this.tileSize * 0.8, this.tileSize * 0.8);
            this.mineSprites[row][col] = mineSprite;
            this.gameContainer.add(mineSprite);
          } else {
            this.mineSprites[row][col]!.setVisible(true);
          }
        } else {
          // 빈 타일 또는 숫자 표시
          sprite.clearTint();
          // 지뢰 스프라이트 숨기기
          if (this.mineSprites[row][col]) {
            this.mineSprites[row][col]!.setVisible(false);
          }
          if (tile.adjacentMines > 0) {
            text.setText(tile.adjacentMines.toString());
            text.setStyle({
              color: this.getNumberColor(tile.adjacentMines),
            });
            text.setVisible(true);
          } else {
            text.setVisible(false);
          }
        }
        break;

      case TileState.FLAGGED:
        // 플레이어별 색상으로 깃발 표시
        sprite.setTexture('TileClosed');
        sprite.clearTint();
        text.setVisible(false);
        // 깃발 스프라이트 생성 또는 표시
        if (!this.flagSprites[row][col]) {
          const x = this.gridStartX + col * this.tileSize + this.tileSize / 2;
          const y = this.gridStartY + row * this.tileSize + this.tileSize / 2;
          const flagSprite = this.scene.add.image(x, y, 'flag_other');
          flagSprite.setDisplaySize(this.tileSize * 0.8, this.tileSize * 0.8);
          // 플레이어 색상 틴트 적용
          if (flaggedBy && this.playerColors.has(flaggedBy)) {
            const colorStr = this.playerColors.get(flaggedBy)!;
            const flagColor = parseInt(colorStr.replace('#', ''), 16);
            flagSprite.setTint(flagColor);
          }
          this.flagSprites[row][col] = flagSprite;
          this.gameContainer.add(flagSprite);
        } else {
          this.flagSprites[row][col]!.setVisible(true);
          // 플레이어 색상 틴트 업데이트
          if (flaggedBy && this.playerColors.has(flaggedBy)) {
            const colorStr = this.playerColors.get(flaggedBy)!;
            const flagColor = parseInt(colorStr.replace('#', ''), 16);
            this.flagSprites[row][col]!.setTint(flagColor);
          }
        }
        // 지뢰 스프라이트 숨기기
        if (this.mineSprites[row][col]) {
          this.mineSprites[row][col]!.setVisible(false);
        }
        break;

      case TileState.HIDDEN:
      default:
        sprite.setTexture('TileClosed');
        sprite.clearTint();
        text.setVisible(false);
        // 지뢰 스프라이트 숨기기
        if (this.mineSprites[row][col]) {
          this.mineSprites[row][col]!.setVisible(false);
        }
        // 깃발 스프라이트 숨기기
        if (this.flagSprites[row][col]) {
          this.flagSprites[row][col]!.setVisible(false);
        }
        break;
    }
  }

  /**
   * 숫자별 색상 반환
   */
  private getNumberColor(num: number): string {
    const colors: Record<number, string> = {
      1: '#3498db', // 파란색
      2: '#27ae60', // 초록색
      3: '#e74c3c', // 빨간색
      4: '#9b59b6', // 보라색
      5: '#e67e22', // 주황색
      6: '#1abc9c', // 청록색
      7: '#2c3e50', // 검정
      8: '#7f8c8d', // 회색
    };
    return colors[num] || '#ffffff';
  }

  /**
   * 타일 데이터 가져오기
   */
  public getTile(row: number, col: number): TileRenderData | null {
    if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) {
      return null;
    }
    return this.tiles[row][col];
  }

  /**
   * 타일 스프라이트 가져오기
   */
  public getTileSprite(
    row: number,
    col: number,
  ): Phaser.GameObjects.Image | null {
    if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) {
      return null;
    }
    return this.tileSprites[row][col];
  }

  /**
   * 모든 타일 데이터 가져오기
   */
  public getAllTiles(): TileRenderData[][] {
    return this.tiles;
  }

  /**
   * 그리드 크기 정보
   */
  public getGridSize(): { cols: number; rows: number } {
    return { cols: this.gridCols, rows: this.gridRows };
  }

  /**
   * 타일 크기 가져오기
   */
  public getTileSize(): number {
    return this.tileSize;
  }

  /**
   * 지뢰 개수 가져오기
   */
  public getMineCount(): number {
    return this.mineCount;
  }

  /**
   * 타일맵 리셋
   */
  public reset(): void {
    // 기존 스프라이트 제거
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        this.tileSprites[row][col]?.destroy();
        this.tileTexts[row][col]?.destroy();
        this.mineSprites[row][col]?.destroy();
        this.flagSprites[row][col]?.destroy();
      }
    }

    // 다시 초기화
    this.initializeTiles();
    this.createTileSprites();

    console.log('[TileManager] 리셋 완료');
  }

  /**
   * 디버그 모드 토글
   * @param debugTiles 디버그용 서버 내부 타일 데이터 (지뢰 정보 포함)
   */
  public toggleDebugMode(
    debugTiles?: { isMine: boolean; adjacentMines: number }[][],
  ): void {
    this.debugMode = !this.debugMode;

    if (this.debugMode) {
      this.createDebugOverlays(debugTiles);
      console.log('[TileManager] 디버그 모드 활성화');
    } else {
      this.clearDebugOverlays();
      console.log('[TileManager] 디버그 모드 비활성화');
    }
  }

  /**
   * 디버그 오버레이 생성 (모든 타일 정보 표시)
   * @param debugTiles 디버그용 서버 내부 타일 데이터 (지뢰 정보 포함)
   */
  private createDebugOverlays(
    debugTiles?: { isMine: boolean; adjacentMines: number }[][],
  ): void {
    this.clearDebugOverlays();

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const tile = this.tiles[row][col];

        // HIDDEN 상태인 타일만 디버그 정보 표시
        if (tile.state !== TileState.HIDDEN) {
          continue;
        }

        // 디버그용 타일 데이터 사용 (없으면 로컬 데이터 사용)
        const debugTile = debugTiles?.[row]?.[col] ?? tile;
        const isMine = debugTile.isMine;
        const adjacentMines = debugTile.adjacentMines;

        const x = this.gridStartX + col * this.tileSize + this.tileSize / 2;
        const y = this.gridStartY + row * this.tileSize + this.tileSize / 2;

        const container = this.scene.add.container(x, y);

        // 반투명 오버레이
        const overlay = this.scene.add.rectangle(
          0,
          0,
          this.tileSize - 2,
          this.tileSize - 2,
          isMine ? 0xe74c3c : 0x3498db,
          0.3,
        );
        container.add(overlay);

        // 디버그 텍스트
        let debugText = '';
        if (isMine) {
          debugText = '💣';
        } else if (adjacentMines > 0) {
          debugText = adjacentMines.toString();
        }

        if (debugText) {
          const text = this.scene.add.text(0, 0, debugText, {
            fontSize: `${Math.floor(this.tileSize * 0.5)}px`,
            fontFamily: 'NeoDunggeunmo',
            color: isMine ? '#ffffff' : this.getNumberColor(adjacentMines),
          });
          text.setOrigin(0.5, 0.5);
          text.setAlpha(0.7);
          container.add(text);
        }

        this.debugOverlays.push(container);
        this.gameContainer.add(container);
      }
    }
  }

  /**
   * 디버그 오버레이 제거
   */
  private clearDebugOverlays(): void {
    for (const overlay of this.debugOverlays) {
      overlay.destroy();
    }
    this.debugOverlays = [];
  }

  /**
   * 디버그 모드 상태 확인
   */
  public isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * 정리
   */
  public destroy(): void {
    // 디버그 오버레이 정리
    this.clearDebugOverlays();

    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        this.tileSprites[row][col]?.destroy();
        this.tileTexts[row][col]?.destroy();
        this.mineSprites[row][col]?.destroy();
        this.flagSprites[row][col]?.destroy();
      }
    }

    this.tiles = [];
    this.tileSprites = [];
    this.tileTexts = [];
    this.mineSprites = [];
    this.flagSprites = [];

    console.log('[TileManager] 정리 완료');
  }
}
