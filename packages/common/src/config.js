// ========== GAME TYPE ==========
export var GameType;
(function (GameType) {
    GameType["APPLE_GAME"] = "APPLE_GAME";
    GameType["FLAPPY_BIRD"] = "FLAPPY_BIRD";
    GameType["MINESWEEPER"] = "MINESWEEPER";
})(GameType || (GameType = {}));
// ========== APPLE GAME CONFIG =========
export var MapSize;
(function (MapSize) {
    MapSize["SMALL"] = "SMALL";
    MapSize["MEDIUM"] = "MEDIUM";
    MapSize["LARGE"] = "LARGE";
})(MapSize || (MapSize = {}));
// MEDIUM 맵 기준 기본 설정 (통신용)
export const DEFAULT_APPLE_GAME_RENDER_CONFIG = {
    gridCols: 20,
    gridRows: 10,
    minNumber: 1,
    maxNumber: 9,
    totalTime: 110,
    includeZero: false,
};
export const DEFAULT_APPLE_GAME_CONFIG_REQ = {
    mapSize: MapSize.MEDIUM,
    time: DEFAULT_APPLE_GAME_RENDER_CONFIG.totalTime,
    generation: 0,
    zero: DEFAULT_APPLE_GAME_RENDER_CONFIG.includeZero,
};
/** 플래피버드 물리 상수 (서버/클라이언트 공유) */
export const FLAPPY_PHYSICS = {
    // 중력 및 새 크기
    GRAVITY_Y: 0.05, // 원래 1
    BIRD_WIDTH: 72,
    BIRD_HEIGHT: 53,
    FLAP_VELOCITY: -0.5, // 원래 -10
    FLAP_VERTICAL_JITTER_RATIO: 0.2,
    // 게임 영역
    GAME_WIDTH: 1440,
    GAME_HEIGHT: 900,
    FLAPPY_GROUND_Y: 800,
    GAME_CENTER_X: 720,
    // 충돌 카테고리 (Matter.js)
    CATEGORY_BIRD: 0x0001,
    CATEGORY_PIPE: 0x0002,
    CATEGORY_GROUND: 0x0004,
};
/** 프리셋을 실제 게임 설정으로 변환하는 헬퍼 함수 */
export function resolveFlappyBirdPreset(preset) {
    // 1. 파이프 속도 결정 (main 브랜치 기준: 1.5)
    let pipeSpeed;
    switch (preset.pipeSpeed) {
        case 'slow':
            pipeSpeed = 1.5;
            break;
        case 'normal':
            pipeSpeed = 2.0;
            break;
        case 'fast':
            pipeSpeed = 2.5;
            break;
        case 'manual':
            pipeSpeed = preset.manualSpeed ?? 2.0;
            break;
    }
    // 2. 파이프 좌우 간격 결정 (main 브랜치 기준: 400)
    let pipeSpacing;
    switch (preset.pipeSpacing) {
        case 'narrow':
            pipeSpacing = 300;
            break;
        case 'normal':
            pipeSpacing = 600;
            break;
        case 'wide':
            pipeSpacing = 800;
            break;
        case 'manual':
            pipeSpacing = preset.manualSpacing ?? 400;
            break;
    }
    // 3. 파이프 상하 간격 (통과 공간) 결정 (main 브랜치 기준: 200)
    let pipeGap;
    switch (preset.pipeGap) {
        case 'narrow':
            pipeGap = 200;
            break;
        case 'normal':
            pipeGap = 250;
            break;
        case 'wide':
            pipeGap = 300;
            break;
    }
    // 4. 파이프 넓이 (두께) 결정 (main 브랜치 기준: 120)
    let pipeWidth;
    switch (preset.pipeWidth) {
        case 'narrow':
            pipeWidth = 80;
            break;
        case 'normal':
            pipeWidth = 120;
            break;
        case 'wide':
            pipeWidth = 160;
            break;
    }
    // 5. 점프 시 전진력 결정 (pipeSpeed에 비례)
    // normal(2.0) 기준 0.3 + 0~0.7 = 0.3 ~ 1.0 범위
    const speedRatio = pipeSpeed / 2.0; // normal 기준
    const flapBoostBase = 0.5 * speedRatio;
    const flapBoostRandom = 0.5 * speedRatio;
    // 6. 밧줄 길이 결정 (main 브랜치 기준: 100)
    let ropeLength;
    switch (preset.ropeLength ?? 'normal') {
        case 'short':
            ropeLength = 80;
            break;
        case 'normal':
            ropeLength = 100;
            break;
        case 'long':
            ropeLength = 140;
            break;
    }
    return {
        pipeSpeed,
        pipeSpacing,
        pipeGap,
        pipeWidth,
        ropeLength,
        flapBoostBase,
        flapBoostRandom,
        connectAll: preset.connectAll ?? false,
    };
}
export const MAP_SIZE_TO_GRID = {
    [MapSize.SMALL]: { cols: 16, rows: 8 },
    [MapSize.MEDIUM]: { cols: 20, rows: 10 },
    [MapSize.LARGE]: { cols: 30, rows: 15 },
};
// AppleGameConfig -> AppleGameRenderConfig 변환
export function resolveAppleGameConfig(cfg) {
    const grid = MAP_SIZE_TO_GRID[cfg.mapSize] ?? MAP_SIZE_TO_GRID[MapSize.MEDIUM];
    const maxNumber = cfg.generation === 1 ? 5 : 9;
    return {
        gridCols: grid.cols,
        gridRows: grid.rows,
        minNumber: cfg.zero ? 0 : 1,
        maxNumber,
        totalTime: cfg.time,
        includeZero: cfg.zero,
    };
}
export function sanitizeTime(rawTime) {
    const timeNum = typeof rawTime === 'number' && isFinite(rawTime)
        ? rawTime
        : DEFAULT_APPLE_GAME_RENDER_CONFIG.totalTime;
    return Math.max(10, Math.min(300, Math.floor(timeNum)));
}
export function getDefaultConfig(gameType) {
    switch (gameType) {
        case GameType.APPLE_GAME:
            return { ...DEFAULT_APPLE_GAME_RENDER_CONFIG };
        case GameType.FLAPPY_BIRD:
            return {
                pipeSpeed: 'normal',
                pipeSpacing: 'normal',
                pipeGap: 'normal',
                pipeWidth: 'normal',
                ropeLength: 'normal',
                connectAll: false,
            };
        case GameType.MINESWEEPER:
            throw new Error('MINESWEEPER config not implemented');
    }
}
export function sanitizeForApple(existingCfg, raw) {
    const defaults = DEFAULT_APPLE_GAME_RENDER_CONFIG;
    // gridCols: 유효한 숫자인지 검증
    let gridCols;
    if (typeof raw?.gridCols === 'number' &&
        raw.gridCols > 0 &&
        raw.gridCols <= 40) {
        gridCols = Math.floor(raw.gridCols);
    }
    else {
        gridCols = existingCfg?.gridCols ?? defaults.gridCols;
    }
    // gridRows: 유효한 숫자인지 검증
    let gridRows;
    if (typeof raw?.gridRows === 'number' &&
        raw.gridRows > 0 &&
        raw.gridRows <= 20) {
        gridRows = Math.floor(raw.gridRows);
    }
    else {
        gridRows = existingCfg?.gridRows ?? defaults.gridRows;
    }
    // minNumber: 0 또는 1
    const minNumber = raw?.minNumber === 0 ? 0 : (existingCfg?.minNumber ?? defaults.minNumber);
    // maxNumber: 5 또는 9
    let maxNumber;
    if (raw?.maxNumber === 5 || raw?.maxNumber === 9) {
        maxNumber = raw.maxNumber;
    }
    else {
        maxNumber = existingCfg?.maxNumber ?? defaults.maxNumber;
    }
    // totalTime: sanitizeTime 사용
    const totalTime = typeof raw?.totalTime === 'number' && isFinite(raw.totalTime)
        ? sanitizeTime(raw.totalTime)
        : (existingCfg?.totalTime ?? defaults.totalTime);
    // includeZero: boolean
    const includeZero = typeof raw?.includeZero === 'boolean'
        ? raw.includeZero
        : (existingCfg?.includeZero ?? defaults.includeZero);
    return {
        gridCols,
        gridRows,
        minNumber,
        maxNumber,
        totalTime,
        includeZero,
    };
}
//# sourceMappingURL=config.js.map