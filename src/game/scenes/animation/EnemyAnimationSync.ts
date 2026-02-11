/**
 * EnemyAnimationSync - Ручная синхронизация анимации смерти врагов
 *
 * Death спрайты врагов не обновляют анимацию автоматически.
 * После завершения анимации спрайт уничтожается.
 *
 * Исходный код: MainScene.ts строки 2631-2759
 */

import type MainScene from '../MainScene';
import type { AbstractEnemy } from '../../entities/enemies/AbstractEnemy';
import { logger } from '../../../utils/Logger';
import { AnimationSyncer } from './AnimationSyncManager';

export class EnemyAnimationSync implements AnimationSyncer {
    private readonly DEATH_ANIM_KEY = 'enemy_death';

    constructor(private scene: MainScene) { }

    update(delta: number): void {
        // ✅ Fix: Access enemyInstances via EnemyManager
        // In the new architecture, MainScene delegates enemy management to EnemyManager
        if (!this.scene.enemyManager) {
            return;
        }

        const enemyInstances = this.scene.enemyManager.getInstances();
        if (!enemyInstances || !Array.isArray(enemyInstances)) {
            return;
        }

        enemyInstances.forEach((enemy: AbstractEnemy, index: number) => {
            this.syncEnemyDeath(enemy, index, delta);
        });
    }

    /**
     * Синхронизирует анимацию смерти конкретного врага
     */
    private syncEnemyDeath(enemy: AbstractEnemy, enemyIndex: number, delta: number): void {
        const deathSprite = (enemy as any).deathAnimationSprite;
        if (!deathSprite || !deathSprite.active) {
            return;
        }

        // Проверяем существование анимации смерти
        if (!(this.scene as any).anims.exists(this.DEATH_ANIM_KEY)) {
            // Анимация не существует - уничтожаем спрайт
            this.logOnce(enemyIndex, 'Animation enemy_death not found, destroying sprite', {
                enemyIndex,
            });
            deathSprite.destroy();
            (enemy as any).deathAnimationSprite = undefined;
            return;
        }

        // Получаем анимацию
        const anim = (this.scene as any).anims.get(this.DEATH_ANIM_KEY);
        if (!anim || !anim.frames || anim.frames.length === 0) {
            this.logOnce(enemyIndex, 'Sprite active but animation not found or has no frames', {
                enemyIndex,
                spriteActive: deathSprite.active,
                hasAnims: !!deathSprite.anims,
                hasCurrentAnim: !!deathSprite.anims?.currentAnim
            });
            return;
        }

        this.syncDeathAnimation(deathSprite, anim, enemyIndex, delta);
    }

    /**
     * Синхронизирует анимацию смерти
     * ✅ Unified logic with Player.ts (syncAnimationFrame)
     */
    private syncDeathAnimation(deathSprite: any, anim: any, enemyIndex: number, delta: number): void {
        // ✅ Use game loop delta for more accurate syncing if available
        const gameLoop = (this.scene as any).game.loop;
        const actualDelta = gameLoop ? gameLoop.delta : delta;

        // Инициализация
        if ((deathSprite as any)._animationInitialized !== true) {
            (deathSprite as any)._animationTimer = 0;
            (deathSprite as any)._animationFrameIndex = 0;
            (deathSprite as any)._lastFrameShown = false;
            const frameRate = anim.frameRate || 12;
            (deathSprite as any)._animationInterval = 1000 / frameRate;
            (deathSprite as any)._animationInitialized = true;

            this.logOnce(enemyIndex, 'Initializing frame sync', {
                enemyIndex,
                frameRate,
                animationInterval: (deathSprite as any)._animationInterval,
                totalFrames: anim.frames.length
            });
        }

        (deathSprite as any)._animationTimer += actualDelta;

        // Переключаем кадр по таймеру
        if ((deathSprite as any)._animationTimer >= (deathSprite as any)._animationInterval) {
            (deathSprite as any)._animationTimer = 0;

            const maxFrameIndex = anim.frames.length - 1;
            const oldFrameIndex = (deathSprite as any)._animationFrameIndex;

            // Переходим к следующему кадру
            if ((deathSprite as any)._animationFrameIndex < maxFrameIndex) {
                (deathSprite as any)._animationFrameIndex++;
            }

            // Логируем изменение кадра (только для первого врага)
            if (enemyIndex === 0 && oldFrameIndex !== (deathSprite as any)._animationFrameIndex) {
                // Uncomment for detailed debugging if needed
                /*
                logger.log('ENEMY_ANIMATION_SYNC', 'Frame updated', {
                    enemyIndex,
                    oldFrameIndex,
                    newFrameIndex: (deathSprite as any)._animationFrameIndex,
                    maxFrameIndex,
                    reachedLastFrame: (deathSprite as any)._animationFrameIndex >= maxFrameIndex
                });
                */
            }

            // Применяем кадр
            this.applyFrame(deathSprite, anim, enemyIndex);

            // Проверяем последний кадр
            // ✅ Robust check: if we reached or exceeded the last frame
            const reachedLastFrame = (deathSprite as any)._animationFrameIndex >= maxFrameIndex;

            if (reachedLastFrame && !(deathSprite as any)._lastFrameShown) {
                (deathSprite as any)._lastFrameShown = true;

                this.logOnce(enemyIndex, 'Last frame reached, destroying sprite', {
                    enemyIndex,
                    frameIndex: (deathSprite as any)._animationFrameIndex,
                    maxFrameIndex
                });

                // Уничтожаем спрайт
                if (deathSprite && deathSprite.active) {
                    deathSprite.destroy();
                    // Ссылка будет очищена через enemyInstance.update() или при следующей проверке
                }
            }
        }
    }

    /**
     * Применяет кадр к death спрайту
     */
    private applyFrame(deathSprite: any, anim: any, enemyIndex: number): void {
        const currentFrameIndex = Math.min((deathSprite as any)._animationFrameIndex, anim.frames.length - 1);
        const animFrame = anim.frames[currentFrameIndex];

        if (!animFrame || !animFrame.frame) {
            return;
        }

        const animFrameObj = animFrame.frame;
        // ✅ Use unified extraction logic
        const frameIndex = this.extractFrameIndex(animFrameObj);

        if (frameIndex !== undefined) {
            deathSprite.setFrame(frameIndex);
        }
    }

    /**
     * Извлекает индекс кадра из объекта кадра анимации
     * ✅ Unified with Player.ts logic
     */
    private extractFrameIndex(animFrameObj: any): number | undefined {
        // Проверяем frame в объекте
        if (animFrameObj && typeof animFrameObj === 'object' && (animFrameObj as any).frame !== undefined) {
            return (animFrameObj as any).frame;
        }

        // Проверяем index
        if ((animFrameObj as any)?.index !== undefined) {
            return (animFrameObj as any).index;
        }

        // Проверяем name
        if (animFrameObj?.name !== undefined) {
            const nameAsNum = parseInt(String(animFrameObj.name), 10);
            if (!isNaN(nameAsNum)) {
                return nameAsNum;
            }
        }

        // Проверяем, если сам объект - число
        if (typeof animFrameObj === 'number') {
            return animFrameObj;
        }

        return undefined;
    }

    /**
     * Логирует сообщение только один раз (для enemyIndex === 0)
     * Избегает засорения логов при множественных врагах
     */
    private logOnce(enemyIndex: number, message: string, data: any): void {
        if (enemyIndex === 0) {
            logger.log('ENEMY_ANIMATION_SYNC', message, data);
        }
    }
}
