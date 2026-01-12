import Phaser from 'phaser';

export interface DragSelectionOptions {
  fillColor?: number;
  fillAlpha?: number;
  lineColor?: number;
  lineAlpha?: number;
  lineWidth?: number;
  log?: boolean;
  logThrottleMs?: number;
}

/**
 * Attach drag-to-select behavior to a scene.
 * Returns a detach() function to remove listeners and graphics.
 */
export function attachDragSelection(
  scene: Phaser.Scene,
  opts: DragSelectionOptions = {}
) {
  const {
    fillColor = 0xfff200,
    fillAlpha = 0.4,
    lineColor = 0xfff200,
    lineAlpha = 0.8,
    lineWidth = 6,
    log = true,
    logThrottleMs = 50,
  } = opts;

  const graphics = scene.add.graphics();
  graphics.setDepth(10000);

  // 스타일은 한 번만 설정
  graphics.fillStyle(fillColor, fillAlpha);
  graphics.lineStyle(lineWidth, lineColor, lineAlpha);

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let lastLogTime = 0;

  function onDown(pointer: Phaser.Input.Pointer) {
    startX = pointer.worldX;
    startY = pointer.worldY;
    dragging = true;

    if (log) {
      console.log(`drag start: (${startX.toFixed(1)}, ${startY.toFixed(1)})`);
    }
  }

  function onMove(pointer: Phaser.Input.Pointer) {
    if (!dragging) return;

    const curX = pointer.worldX;
    const curY = pointer.worldY;

    // 쓰로틀링된 로그
    if (log) {
      const now = performance.now();
      if (now - lastLogTime >= logThrottleMs) {
        lastLogTime = now;
        console.log(
          `drag: start=(${startX.toFixed(1)}, ${startY.toFixed(1)}) current=(${curX.toFixed(1)}, ${curY.toFixed(1)})`
        );
      }
    }

    // 좌표 계산 최적화
    let x: number, y: number, w: number, h: number;
    if (startX < curX) {
      x = startX;
      w = curX - startX;
    } else {
      x = curX;
      w = startX - curX;
    }
    if (startY < curY) {
      y = startY;
      h = curY - startY;
    } else {
      y = curY;
      h = startY - curY;
    }

    graphics.clear();
    // 스타일 재설정 (clear 후 필요)
    graphics.fillStyle(fillColor, fillAlpha);
    graphics.lineStyle(lineWidth, lineColor, lineAlpha);
    graphics.fillRect(x, y, w, h);
    graphics.strokeRect(x, y, w, h);
  }

  function onUp(pointer: Phaser.Input.Pointer) {
    if (!dragging) return;

    if (log) {
      console.log(
        `drag end: start=(${startX.toFixed(1)}, ${startY.toFixed(1)}) end=(${pointer.worldX.toFixed(1)}, ${pointer.worldY.toFixed(1)})`
      );
    }

    dragging = false;
    graphics.clear();
  }

  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', onUp);
  scene.input.on('pointerupoutside', onUp);

  function detach() {
    scene.input.off('pointerdown', onDown);
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerup', onUp);
    scene.input.off('pointerupoutside', onUp);
    graphics.destroy();
  }

  scene.events.once('shutdown', detach);

  return detach;
}