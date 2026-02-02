export declare enum GameType {
    APPLE_GAME = "APPLE_GAME",
    FLAPPY_BIRD = "FLAPPY_BIRD",
    MINESWEEPER = "MINESWEEPER"
}
export declare enum MapSize {
    SMALL = "SMALL",
    MEDIUM = "MEDIUM",
    LARGE = "LARGE"
}
export interface AppleGameRenderConfig {
    gridCols: number;
    gridRows: number;
    minNumber: number;
    maxNumber: number;
    totalTime: number;
    includeZero: boolean;
}
export declare const DEFAULT_APPLE_GAME_RENDER_CONFIG: AppleGameRenderConfig;
export interface AppleGameConfigRequest {
    mapSize: MapSize;
    time: number;
    generation: number;
    zero: boolean;
}
export declare const DEFAULT_APPLE_GAME_CONFIG_REQ: AppleGameConfigRequest;
export type PipeSpeedPreset = 'slow' | 'normal' | 'fast' | 'manual';
export type PipeSpacingPreset = 'narrow' | 'normal' | 'wide' | 'manual';
export type PipeGapPreset = 'narrow' | 'normal' | 'wide';
export type PipeWidthPreset = 'narrow' | 'normal' | 'wide';
export type RopeLengthPreset = 'short' | 'normal' | 'long';
/** 플래피버드 게임 프리셋 설정 */
export interface FlappyBirdGamePreset {
    /** 파이프 속도 (이동 속도) */
    pipeSpeed: PipeSpeedPreset;
    /** 수동 설정 시 속도 */
    manualSpeed?: number;
    /** 파이프 좌우 간격 */
    pipeSpacing: PipeSpacingPreset;
    /** 수동 설정 시 간격 (픽셀) */
    manualSpacing?: number;
    /** 파이프 상하 간격 (통과 공간) */
    pipeGap: PipeGapPreset;
    /** 파이프 넓이 (두께) */
    pipeWidth: PipeWidthPreset;
    /** 밧줄 길이 */
    ropeLength?: RopeLengthPreset;
    /** 모두 묶기 (3인 이상일 때 폐쇄형 도형으로 연결) */
    connectAll?: boolean;
}
export interface ResolvedFlappyBirdConfig {
    pipeSpeed: number;
    pipeSpacing: number;
    pipeGap: number;
    pipeWidth: number;
    ropeLength: number;
    flapBoostBase: number;
    flapBoostRandom: number;
    connectAll: boolean;
}
/** 플래피버드 물리 상수 (서버/클라이언트 공유) */
export declare const FLAPPY_PHYSICS: {
    readonly GRAVITY_Y: 0.05;
    readonly BIRD_WIDTH: 72;
    readonly BIRD_HEIGHT: 53;
    readonly FLAP_VELOCITY: -0.5;
    readonly FLAP_VERTICAL_JITTER_RATIO: 0.2;
    readonly GAME_WIDTH: 1440;
    readonly GAME_HEIGHT: 900;
    readonly FLAPPY_GROUND_Y: 800;
    readonly GAME_CENTER_X: 720;
    readonly CATEGORY_BIRD: 1;
    readonly CATEGORY_PIPE: 2;
    readonly CATEGORY_GROUND: 4;
};
/** 프리셋을 실제 게임 설정으로 변환하는 헬퍼 함수 */
export declare function resolveFlappyBirdPreset(preset: FlappyBirdGamePreset): ResolvedFlappyBirdConfig;
export type GameConfig = AppleGameRenderConfig | FlappyBirdGamePreset;
export declare const MAP_SIZE_TO_GRID: {
    readonly SMALL: {
        readonly cols: 16;
        readonly rows: 8;
    };
    readonly MEDIUM: {
        readonly cols: 20;
        readonly rows: 10;
    };
    readonly LARGE: {
        readonly cols: 30;
        readonly rows: 15;
    };
};
export declare function resolveAppleGameConfig(cfg: AppleGameConfigRequest): AppleGameRenderConfig;
export declare function sanitizeTime(rawTime: any): number;
export declare function getDefaultConfig(gameType: GameType): GameConfig;
export declare function sanitizeForApple(existingCfg: AppleGameRenderConfig | undefined, raw: any): AppleGameRenderConfig;
//# sourceMappingURL=config.d.ts.map