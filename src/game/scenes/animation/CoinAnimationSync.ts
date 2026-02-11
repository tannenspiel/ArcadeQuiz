/**
 * CoinAnimationSync - Ручная синхронизация анимаций монеток
 *
 * Physics спрайты монеток не обновляют анимации автоматически.
 * Этот класс вручную переключает кадры по таймеру.
 *
 * Pattern follows KeyAnimationSync for consistency.
 */

import type MainScene from '../MainScene';
import { AnimationSyncer } from './AnimationSyncManager';

interface AnimationFrame {
    frame?: { index?: number; name?: string };
    index?: number;
    name?: string;
}

/**
 * Type guard для проверки наличия index
 */
function hasFrameIndex(obj: AnimationFrame): obj is AnimationFrame & { index: number } {
    return obj.index !== undefined || obj.frame?.index !== undefined;
}

/**
 * Type guard для проверки наличия name
 */
function hasFrameName(obj: AnimationFrame): obj is AnimationFrame & { name: string } {
    return obj.name !== undefined || obj.frame?.name !== undefined;
}

/**
 * CoinAnimationSync - синхронизирует анимации всех монеток в coinsGroup
 *
 * Physics спрайты в Phaser 3 не обновляют анимации автоматически
 * при paused physics или в certain conditions. Этот класс решает эту проблему.
 */
export class CoinAnimationSync implements AnimationSyncer {
    constructor(private scene: MainScene) { }

    update(delta: number): void {
        const coins = (this.scene as any).coins; // ✅ FIX: Use 'coins' directly to match MainScene property
        if (!coins || !coins.getChildren) {
            return;
        }

        const gameLoop = (this.scene as any).game.loop;
        if (!gameLoop) return;

        coins.getChildren().forEach((coin: any) => {
            this.syncSprite(coin, delta);
        });
    }

    private syncSprite(coin: any, delta: number): void {
        if (!coin || !coin.active || !coin.anims || !coin.anims.isPlaying) {
            return;
        }

        const anim = coin.anims.currentAnim;
        if (!anim || !anim.frames || anim.frames.length === 0) {
            return;
        }

        // Инициализируем таймеры при первом запуске
        if (coin._animationInitialized !== true) {
            coin._animationTimer = 0;
            coin._animationFrameIndex = 0;
            const frameRate = anim.frameRate || 8;
            coin._animationInterval = 1000 / frameRate;
            coin._animationInitialized = true;
        }

        // Обновляем таймер
        coin._animationTimer += delta;

        // Переключаем кадр по таймеру
        if (coin._animationTimer >= coin._animationInterval) {
            coin._animationTimer = 0;
            coin._animationFrameIndex = (coin._animationFrameIndex + 1) % anim.frames.length;

            // Получаем кадр из анимации
            const animFrame = anim.frames[coin._animationFrameIndex];
            if (!animFrame || !animFrame.frame) {
                return;
            }

            const animFrameObj = animFrame.frame;
            const frameIndex = this.extractFrameIndex(animFrameObj);

            if (frameIndex !== undefined) {
                coin.setFrame(frameIndex);
            }
        }
    }

    /**
     * Извлекает индекс кадра из объекта кадра анимации
     */
    private extractFrameIndex(animFrameObj: any): number | undefined {
        // Обрабатываем {key: "...", frame: 0}
        if (animFrameObj && typeof animFrameObj === 'object' && animFrameObj.frame !== undefined) {
            return animFrameObj.frame;
        }

        // Проверяем index
        if (animFrameObj?.index !== undefined) {
            return animFrameObj.index;
        }

        // Проверяем name (пробуем преобразовать в число)
        if (animFrameObj?.name !== undefined) {
            const nameAsNum = parseInt(String(animFrameObj.name), 10);
            if (!isNaN(nameAsNum)) {
                return nameAsNum;
            }
        }

        // Если сам объект - число
        if (typeof animFrameObj === 'number') {
            return animFrameObj;
        }

        return undefined;
    }
}
