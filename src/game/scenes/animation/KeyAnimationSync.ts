/**
 * KeyAnimationSync - Ручная синхронизация анимаций ключей
 *
 * Physics спрайты ключей не обновляют анимации автоматически.
 * Этот класс вручную переключает кадры по таймеру.
 *
 * Исходный код: MainScene.ts строки 2116-2183
 */

import type MainScene from '../MainScene';
import type Phaser from 'phaser';
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

export class KeyAnimationSync implements AnimationSyncer {
    constructor(private scene: MainScene) {}

    update(delta: number): void {
        const keys = (this.scene as any).keys;
        if (!keys || !keys.getChildren) {
            return;
        }

        const gameLoop = (this.scene as any).game.loop;
        if (!gameLoop) return;

        keys.getChildren().forEach((rune: any) => {
            this.syncSprite(rune, delta);
        });
    }

    private syncSprite(rune: any, delta: number): void {
        if (!rune || !rune.active || !rune.anims || !rune.anims.isPlaying) {
            return;
        }

        const anim = rune.anims.currentAnim;
        if (!anim || !anim.frames || anim.frames.length === 0) {
            return;
        }

        // Инициализируем таймеры при первом запуске
        if (rune._animationInitialized !== true) {
            rune._animationTimer = 0;
            rune._animationFrameIndex = 0;
            const frameRate = anim.frameRate || 8;
            rune._animationInterval = 1000 / frameRate;
            rune._animationInitialized = true;
            // Debug log removed for performance
        }

        // Обновляем таймер
        rune._animationTimer += delta;

        // Переключаем кадр по таймеру
        if (rune._animationTimer >= rune._animationInterval) {
            rune._animationTimer = 0;
            rune._animationFrameIndex = (rune._animationFrameIndex + 1) % anim.frames.length;

            // Получаем кадр из анимации
            const animFrame = anim.frames[rune._animationFrameIndex];
            if (!animFrame || !animFrame.frame) {
                return;
            }

            const animFrameObj = animFrame.frame;
            const frameIndex = this.extractFrameIndex(animFrameObj);

            if (frameIndex !== undefined) {
                rune.setFrame(frameIndex);
                // Debug log removed for performance (was causing lag on PC)
            }
            // frameIndex === undefined silently ignored
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
