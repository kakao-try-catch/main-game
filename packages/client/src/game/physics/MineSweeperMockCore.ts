import { MockSocket } from '../network/MockSocket';
import {
  TileState,
  type TileData,
  type PlayerScoreData,
  type MineSweeperConfig,
  type PlayerId,
  type RevealTileRequest,
  type ToggleFlagRequest,
  DEFAULT_MINESWEEPER_CONFIG,
} from '../types/minesweeper.types';
import { CONSTANTS } from '../types/common';

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
        playerColor: CONSTANTS.PLAYER_COLORS[i] || '#ffffff',
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
   * 클라이언트 이벤트 처리 (MockSocket.emit()에서 호출됨)
   */
  handleClientEvent(
    event: string,
    data: RevealTileRequest | ToggleFlagRequest,
  ): void {
    switch (event) {
      case 'reveal_tile': {
        const req = data as RevealTileRequest;
        this.handleTileReveal(req.playerId, req.row, req.col);
        break;
      }
      case 'toggle_flag': {
        const req = data as ToggleFlagRequest;
        this.handleFlagToggle(req.playerId, req.row, req.col);
        break;
      }
      default:
        console.log(`[MineSweeperMockCore] 알 수 없는 이벤트: ${event}`);
    }
  }

  /**
   * 타일 데이터 가져오기 (클라이언트 동기화용)
   */
  getTiles(): TileData[][] {
    return this.tiles;
  }

  /**
   * 타일 열기 처리 (좌클릭)
   */
  handleTileReveal(playerId: PlayerId, row: number, col: number): void {
    // 유효성 검사
    if (
      row < 0 ||
      row >= this.config.gridRows ||
      col < 0 ||
      col >= this.config.gridCols
    ) {
      console.warn(`[MineSweeperMockCore] 잘못된 타일 좌표: (${row}, ${col})`);
      return;
    }

    const tile = this.tiles[row][col];

    // 이미 열린 타일은 무시
    if (tile.state === TileState.REVEALED) {
      return;
    }

    // 타일 열기
    const tileUpdate = this.revealTile(row, col, playerId);

    // 타일 업데이트 이벤트 전송
    this.socket.triggerEvent('tile_update', {
      tiles: [tileUpdate],
      timestamp: Date.now(),
    });

    console.log(
      `[MineSweeperMockCore] 타일 열림: (${row}, ${col}) by ${playerId}`,
    );
  }

  /**
   * 깃발 토글 처리 (우클릭)
   */
  handleFlagToggle(playerId: PlayerId, row: number, col: number): void {
    // 유효성 검사
    if (
      row < 0 ||
      row >= this.config.gridRows ||
      col < 0 ||
      col >= this.config.gridCols
    ) {
      console.warn(`[MineSweeperMockCore] 잘못된 타일 좌표: (${row}, ${col})`);
      return;
    }

    const tile = this.tiles[row][col];

    // 이미 열린 타일은 깃발 설치 불가
    if (tile.state === TileState.REVEALED) {
      console.warn(
        `[MineSweeperMockCore] 이미 열린 타일에는 깃발을 설치할 수 없습니다: (${row}, ${col})`,
      );
      return;
    }

    let newState: TileState;
    let flaggedBy: PlayerId | null = null;

    if (tile.state === TileState.HIDDEN) {
      // HIDDEN -> FLAGGED (깃발 설치)
      newState = TileState.FLAGGED;
      flaggedBy = playerId;

      // 플레이어 통계 업데이트
      const player = this.players.get(playerId);
      if (player) {
        player.flagsPlaced++;
      }

      console.log(
        `[MineSweeperMockCore] 깃발 설치: (${row}, ${col}) by ${playerId}`,
      );
    } else if (tile.state === TileState.FLAGGED) {
      // 다른 플레이어의 깃발인지 확인
      if (tile.flaggedBy !== playerId) {
        console.warn(
          `[MineSweeperMockCore] 다른 플레이어의 깃발은 제거할 수 없습니다: (${row}, ${col})`,
        );
        return;
      }

      // FLAGGED -> HIDDEN (깃발 제거)
      newState = TileState.HIDDEN;
      flaggedBy = null;

      // 플레이어 통계 업데이트
      const player = this.players.get(playerId);
      if (player) {
        player.flagsPlaced--;
      }

      console.log(
        `[MineSweeperMockCore] 깃발 제거: (${row}, ${col}) by ${playerId}`,
      );
    } else {
      return;
    }

    // 타일 상태 업데이트
    tile.state = newState;
    tile.flaggedBy = flaggedBy;

    console.log(
      `[MineSweeperMockCore] tile_update 전송 - flaggedBy: ${flaggedBy}, state: ${newState}`,
    );

    // 타일 업데이트 이벤트 전송
    this.socket.triggerEvent('tile_update', {
      tiles: [
        {
          row,
          col,
          state: newState,
          isMine: tile.isMine,
          adjacentMines: tile.adjacentMines,
          flaggedBy,
        },
      ],
      timestamp: Date.now(),
    });
  }

  /**
   * 타일 열기 (내부 메서드)
   */
  private revealTile(
    row: number,
    col: number,
    playerId: PlayerId,
  ): {
    row: number;
    col: number;
    state: TileState;
    isMine: boolean;
    adjacentMines: number;
    revealedBy: PlayerId;
    flaggedBy: PlayerId | null;
  } {
    const tile = this.tiles[row][col];

    // 깃발 정보 저장 (상태 변경 전에)
    const originalFlagger = tile.flaggedBy;

    // 타일 상태 업데이트
    tile.state = TileState.REVEALED;
    tile.revealedBy = playerId;
    tile.flaggedBy = null; // 깃발 제거

    // 플레이어 통계 업데이트
    const player = this.players.get(playerId);
    if (player) {
      player.tilesRevealed++;

      // 깃발이 있었다면 해당 플레이어의 깃발 카운트 감소
      if (originalFlagger) {
        const flaggerPlayer = this.players.get(originalFlagger);
        if (flaggerPlayer) {
          flaggerPlayer.flagsPlaced--;
        }
      }

      if (tile.isMine) {
        // 지뢰를 밟은 경우
        player.minesHit++;
        player.score += this.config.minePenalty;
        console.log(
          `[MineSweeperMockCore] ${playerId}가 지뢰를 밟았습니다! 점수: ${player.score}`,
        );
      } else {
        // 안전한 타일을 연 경우
        player.score += this.config.tileRevealScore;
      }

      // 최소 점수 제한
      if (player.score < this.config.minScore) {
        player.score = this.config.minScore;
      }
    }

    return {
      row,
      col,
      state: TileState.REVEALED,
      isMine: tile.isMine,
      adjacentMines: tile.adjacentMines,
      revealedBy: playerId,
      flaggedBy: null,
    };
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
