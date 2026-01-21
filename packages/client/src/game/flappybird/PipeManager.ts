import Phaser from 'phaser';
import PipePrefab from './PipePrefab';
import type { PipeData } from '../types/flappybird.types';

/**
 * 파이프 관리 매니저
 * 서버로부터 받은 파이프 데이터를 기반으로 렌더링합니다.
 */
export default class PipeManager {
    private scene: Phaser.Scene;
    private pipeObjects: Map<string, PipePrefab> = new Map();
    private screenHeight: number;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.screenHeight = scene.cameras.main.height;
    }

    /**
     * 서버로부터 받은 파이프 데이터로 업데이트합니다.
     */
    updateFromServer(serverPipes: PipeData[]): void {
        const serverPipeIds = new Set(serverPipes.map(p => p.id));

        // 서버에 없는 파이프 제거
        for (const [id, pipeObj] of this.pipeObjects.entries()) {
            if (!serverPipeIds.has(id)) {
                pipeObj.destroy();
                this.pipeObjects.delete(id);
            }
        }

        // 서버 파이프 데이터로 업데이트 또는 생성
        for (const pipeData of serverPipes) {
            let pipeObj = this.pipeObjects.get(pipeData.id);

            if (!pipeObj) {
                pipeObj = this.createPipeFromData(pipeData);
                this.pipeObjects.set(pipeData.id, pipeObj);
            } else {
                this.updatePipeFromData(pipeObj, pipeData);
            }
        }
    }

    private createPipeFromData(pipeData: PipeData): PipePrefab {
        const pipe = new PipePrefab(this.scene, pipeData.x, 0);
        this.scene.add.existing(pipe);
        this.setPipeGap(pipe, pipeData);
        return pipe;
    }

    private updatePipeFromData(pipe: PipePrefab, pipeData: PipeData): void {
        pipe.x = pipeData.x;
    }

    private setPipeGap(pipe: PipePrefab, pipeData: PipeData): void {
        pipe.setFromServerData(pipeData.gapY, pipeData.gap, pipeData.width, this.screenHeight);
    }

    destroy(): void {
        for (const pipe of this.pipeObjects.values()) {
            pipe.destroy();
        }
        this.pipeObjects.clear();
    }

    getPipes(): PipePrefab[] {
        return Array.from(this.pipeObjects.values());
    }
}
