/**
 * OracleAnimationSync - Ручная синхронизация анимаций оракула
 *
 * Physics спрайт оракула не обновляет анимации автоматически.
 * Поддерживает анимации активации (repeat: 0) и активированного состояния (repeat: -1).
 * Использует while loop для отлова пропущенных кадров при лагах.
 *
 * Исходный код: MainScene.ts строки 2296-2360, 2460-2556
 */

import type MainScene from '../MainScene';
import type { Oracle } from '../../entities/Oracle';
import { AnimationSyncer } from './AnimationSyncManager';

export class OracleAnimationSync implements AnimationSyncer {
    constructor(private scene: MainScene) { }

    update(delta: number): void {
        const oracle = (this.scene as any).oracle;
        if (!oracle) {
            return;
        }

        const oracleSprite = oracle.getSprite();
        if (!oracleSprite || !oracleSprite.active) {
            return;
        }

        // Проверяем флаг ручной синхронизации
        if (!(oracleSprite as any)._needsManualSync) {
            return;
        }

        if (!oracleSprite.anims || !oracleSprite.anims.isPlaying) {
            return;
        }

        const anim = oracleSprite.anims.currentAnim;
        if (!anim || !anim.frames || anim.frames.length === 0) {
            return;
        }

        this.syncOracleAnimation(oracleSprite, anim, delta);
    }

    /**
     * Синхронизирует анимацию оракула с использованием while loop
     * для отлова пропущенных кадров при лагах
     */
    private syncOracleAnimation(oracleSprite: any, anim: any, delta: number): void {
        const gameLoop = (this.scene as any).game.loop;
        const actualDelta = gameLoop ? gameLoop.delta : delta;

        // Инициализация таймеров
        if ((oracleSprite as any)._animationInitialized !== true) {
            (oracleSprite as any)._animationTimer = 0;
            (oracleSprite as any)._animationFrameIndex = 0;
            const frameRate = anim.frameRate || 12;
            (oracleSprite as any)._animationInterval = 1000 / frameRate;
            (oracleSprite as any)._animationInitialized = true;
        }

        // Обновляем таймер
        (oracleSprite as any)._animationTimer += actualDelta;

        // While loop для отлова пропущенных кадров (robust sync)
        let safetyCounter = 0;
        while (
            (oracleSprite as any)._animationTimer >= (oracleSprite as any)._animationInterval &&
            safetyCounter < 5
        ) {
            (oracleSprite as any)._animationTimer -= (oracleSprite as any)._animationInterval;
            safetyCounter++;

            // Определяем тип анимации по флагу repeat
            const isLooping = anim.repeat === -1;  // ACTIVATED - зацикленная
            const isOneShot = anim.repeat === 0;     // ACTIVATING - одноразовая

            if (isOneShot) {
                // Анимация активации - переходим к следующему кадру
                if ((oracleSprite as any)._animationFrameIndex < anim.frames.length - 1) {
                    (oracleSprite as any)._animationFrameIndex++;
                } else {
                    // Достигли последнего кадра
                    (oracleSprite as any)._animationFrameIndex = anim.frames.length - 1;
                    // Force break для предотвращения лишних циклов
                    break;
                }
            } else if (isLooping) {
                // Анимация активированного состояния - зацикливаем
                (oracleSprite as any)._animationFrameIndex = ((oracleSprite as any)._animationFrameIndex + 1) % anim.frames.length;
            }
        }

        // Применяем кадр
        this.applyFrame(oracleSprite, anim);

        // Если достигли последнего кадра одноразовой анимации, вызываем событие завершения
        if (anim.repeat === 0 && (oracleSprite as any)._animationFrameIndex === anim.frames.length - 1) {
            this.scheduleCompletionEvent(oracleSprite, anim);
        }
    }

    /**
     * Применяет кадр к спрайту оракула
     */
    private applyFrame(oracleSprite: any, anim: any): void {
        const animFrame = anim.frames[(oracleSprite as any)._animationFrameIndex];
        if (!animFrame || !animFrame.frame) {
            return;
        }

        const animFrameObj = animFrame.frame;
        const frameIndex = this.extractFrameIndex(animFrameObj);

        if (frameIndex !== undefined) {
            oracleSprite.setFrame(frameIndex);

            // Логируем редко (5% случаев)
            if (Math.random() < 0.05) {
            }
        } else {
        }
    }

    /**
     * Извлекает индекс кадра из объекта кадра анимации
     * Поддерживает различные форматы: index, name (число/строка), сам объект
     */
    private extractFrameIndex(animFrameObj: any): number | undefined {
        // Проверяем index
        if (typeof (animFrameObj as any).index === 'number') {
            return (animFrameObj as any).index;
        }

        // Проверяем name (число)
        if (typeof animFrameObj.name === 'number') {
            return animFrameObj.name;
        }

        // Проверяем name (строка - для спрайтшитов "0", "1", ...)
        if (typeof animFrameObj.name === 'string') {
            const parsed = parseInt(animFrameObj.name, 10);
            if (!isNaN(parsed)) {
                return parsed;
            }
        }

        // Fallback: пробуем использовать сам объект
        if (typeof animFrameObj === 'number') {
            return animFrameObj;
        }

        return undefined;
    }

    /**
     * Планирует событие завершения анимации с задержкой
     * (чтобы последний кадр успел отобразиться)
     */
    private scheduleCompletionEvent(oracleSprite: any, anim: any): void {
        const interval = (oracleSprite as any)._animationInterval || 100;

        (this.scene as any).time.delayedCall(interval, () => {
            if (oracleSprite.anims && oracleSprite.anims.currentAnim && oracleSprite.anims.currentAnim.key === anim.key) {
                oracleSprite.emit('animationcomplete', anim);
            }
        });
    }
}
