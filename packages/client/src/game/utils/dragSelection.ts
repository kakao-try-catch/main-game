import Phaser from 'phaser';

export interface DragSelectionOptions {
    fillColor?: number;
    fillAlpha?: number;
    lineColor?: number;
    lineAlpha?: number;
    lineWidth?: number;
    onDrag?: (rect: Phaser.Geom.Rectangle) => void;
    onDragEnd?: (rect: Phaser.Geom.Rectangle) => void;
}

const DEFAULT_OPTIONS: Required<Omit<DragSelectionOptions, 'onDrag' | 'onDragEnd'>> = {
    fillColor: 0xffff00,
    fillAlpha: 0.4,
    lineColor: 0xffff00,
    lineAlpha: 0.8,
    lineWidth: 2,
};

export function attachDragSelection(
    scene: Phaser.Scene,
    options: DragSelectionOptions = {}
): () => void {
    const config = { ...DEFAULT_OPTIONS, ...options };

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    // 선택 영역 그래픽
    const graphics = scene.add.graphics();
    graphics.setDepth(1000);

    // 현재 선택 영역
    const selectionRect = new Phaser.Geom.Rectangle();

    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
        isDragging = true;
        startX = pointer.x;
        startY = pointer.y;
        graphics.clear();
    };

    const onPointerMove = (pointer: Phaser.Input.Pointer) => {
        if (!isDragging) return;

        const x = Math.min(startX, pointer.x);
        const y = Math.min(startY, pointer.y);
        const width = Math.abs(pointer.x - startX);
        const height = Math.abs(pointer.y - startY);

        // 선택 영역 업데이트
        selectionRect.setTo(x, y, width, height);

        // 그래픽 그리기
        graphics.clear();
        graphics.fillStyle(config.fillColor, config.fillAlpha);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(config.lineWidth, config.lineColor, config.lineAlpha);
        graphics.strokeRect(x, y, width, height);

        // 드래그 중 콜백 호출
        options.onDrag?.(selectionRect);
    };

    const onPointerUp = () => {
        if (!isDragging) return;
        isDragging = false;
        
        // 드래그 종료 콜백 호출
        options.onDragEnd?.(selectionRect);
        
        graphics.clear();
    };

    // 이벤트 등록
    scene.input.on('pointerdown', onPointerDown);
    scene.input.on('pointermove', onPointerMove);
    scene.input.on('pointerup', onPointerUp);

    // 해제 함수 반환
    return () => {
        scene.input.off('pointerdown', onPointerDown);
        scene.input.off('pointermove', onPointerMove);
        scene.input.off('pointerup', onPointerUp);
        graphics.destroy();
    };
}