import { MockSocket } from '../network/MockSocket';
import {
  TileState,
  type TileData,
  type PlayerScoreData,
  type MineSweeperConfig,
  type PlayerId,
  DEFAULT_MINESWEEPER_CONFIG,
} from '../types/minesweeper.types';

/**
 * MineSweeperMockCore - 지뢰찾기 서버 역할을 대신하는 로컬 게임 로직
 * 실제 서버 개발 완료 시 이 로직을 서버로 이전할 수 있습니다.
 */
export class MineSweeperMockCore {
  private socket: MockSocket;
  private config: MineSweeperConfig;
  private tiles: TileData[][] = [];
  private players: Map<PlayerId, PlayerScoreData> = new Map();

  constructor(socket: MockSocket) {
    this.socket = socket;
    this.socket.setServerCore(this);
    this.config = { ...DEFAULT_MINESWEEPER_CONFIG };

    console.log('[MineSweeperMockCore] 초기화됨');
  }

  /**
   * 플레이어 수 설정
   */
  setPlayerCount(count: number): void {
    this.players.clear();
    for (let i = 0; i < count; i++) {
      const playerId = `player_${i}` as PlayerId;
      this.players.set(playerId, {
        playerId: playerId,
        playerName: `Player ${i + 1}`,
        playerColor: '#ffffff',
        score: 0,
        tilesRevealed: 0,
        minesHit: 0,
        flagsPlaced: 0,
      });
    }
    console.log(`[MineSweeperMockCore] 플레이어 ${count}명 설정 완료`);
  }

  /**
   * 게임 설정 업데이트
   */
  setConfig(config: Partial<MineSweeperConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[MineSweeperMockCore] 설정 업데이트:', this.config);
  }

  /**
   * 게임 초기화
   */
  initialize(): void {
    // 타일 초기화
    this.initializeTiles();

    // 지뢰 배치
    this.placeMines();

    // 인접 지뢰 개수 계산
    this.calculateAdjacentMines();

    // 게임 초기화 이벤트 전송
    this.socket.triggerEvent('game_init', {
      config: this.config,
      tiles: this.tiles,
      players: Array.from(this.players.values()),
      timestamp: Date.now(),
    });

    console.log(
      `[MineSweeperMockCore] 게임 초기화 완료: ${this.config.gridCols}x${this.config.gridRows}, 지뢰 ${this.config.mineCount}개`,
    );
  }

  /**
   * 타일 초기화
   */
  private initializeTiles(): void {
    this.tiles = [];

    for (let row = 0; row < this.config.gridRows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.config.gridCols; col++) {
        this.tiles[row][col] = {
          row,
          col,
          isMine: false,
          adjacentMines: 0,
          state: TileState.HIDDEN,
          revealedBy: null,
          flaggedBy: null,
        };
      }
    }
  }

  /**
   * 랜덤 지뢰 배치
   */
  private placeMines(): void {
    let minesPlaced = 0;
    const totalTiles = this.config.gridRows * this.config.gridCols;
    const maxMines = Math.min(this.config.mineCount, totalTiles - 1);

    while (minesPlaced < maxMines) {
      const row = Math.floor(Math.random() * this.config.gridRows);
      const col = Math.floor(Math.random() * this.config.gridCols);

      if (!this.tiles[row][col].isMine) {
        this.tiles[row][col].isMine = true;
        minesPlaced++;
      }
    }

    console.log(`[MineSweeperMockCore] 지뢰 ${minesPlaced}개 배치 완료`);
  }

  /**
   * 인접 지뢰 개수 계산
   */
  private calculateAdjacentMines(): void {
    for (let row = 0; row < this.config.gridRows; row++) {
      for (let col = 0; col < this.config.gridCols; col++) {
        if (!this.tiles[row][col].isMine) {
          let count = 0;

          // 8방향 체크
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;

              const newRow = row + dr;
              const newCol = col + dc;

              if (
                newRow >= 0 &&
                newRow < this.config.gridRows &&
                newCol >= 0 &&
                newCol < this.config.gridCols &&
                this.tiles[newRow][newCol].isMine
              ) {
                count++;
              }
            }
          }

          this.tiles[row][col].adjacentMines = count;
        }
      }
    }

    console.log('[MineSweeperMockCore] 인접 지뢰 개수 계산 완료');
  }

  /**
   * 타일 데이터 가져오기 (클라이언트 동기화용)
   */
  getTiles(): TileData[][] {
    return this.tiles;
  }

  /**
   * 설정 가져오기
   */
  getConfig(): MineSweeperConfig {
    return this.config;
  }

  /**
   * 정리
   */
  destroy(): void {
    this.tiles = [];
    this.players.clear();
    console.log('[MineSweeperMockCore] 정리 완료');
  }
}
