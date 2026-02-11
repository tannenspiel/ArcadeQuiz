/**
 * PlayerAnimationSync - Ручная синхронизация анимаций игрока
 *
 * Physics спрайт игрока не обновляет анимации автоматически.
 * Синхронизирует анимацию для состояния DAMAGED.
 *
 * ПРИМЕЧАНИЕ: APPLYING_KEY не синхронизируется, так как для него
 * используется отдельный спрайт-оверлей (applyKeyAnimationSprite).
 *
 * Исходный код: MainScene.ts строки 2362-2457
 */

import type MainScene from '../MainScene';
import type { Player } from '../../entities/Player';
import { PlayerState } from '../../entities/Player';
import { AnimationSyncer } from './AnimationSyncManager';

export class PlayerAnimationSync implements AnimationSyncer {
    private readonly DAMAGE_TEXTURE_KEY = 'character_damaged';
    private readonly DAMAGE_ANIM_KEY = 'character_damaged';
    // NOTE: APPLYING_KEY не синхронизируется - используется отдельный спрайт-оверлей

    constructor(private scene: MainScene) {}

    update(delta: number): void {
        const player = (this.scene as any).player;
        if (!player) {
            return;
        }

        const playerSprite = player.getSprite();
        if (!playerSprite || !playerSprite.active) {
            return;
        }

        // Проверяем состояние игрока (критично для physics спрайтов!)
        const playerState = player.getState();

        if (playerState === PlayerState.DAMAGED) {
            this.syncDamageAnimation(playerSprite, delta);
        }
        // ПРИМЕЧАНИЕ: APPLYING_KEY не синхронизируется здесь,
        // так как для него используется отдельный спрайт-оверлей (applyKeyAnimationSprite)
        // который управляется через Phaser систему анимаций
    }

    /**
     * Синхронизирует анимацию урона персонажа
     */
    private syncDamageAnimation(playerSprite: any, delta: number): void {
        // Получаем анимацию урона
        const anim = (this.scene as any).anims.get(this.DAMAGE_ANIM_KEY);
        if (!anim) {
            if (Math.random() < 0.01) {
            }
            return;
        }

        // Проверяем frames
        const frames = anim.frames;
        if (!frames || !Array.isArray(frames) || frames.length === 0) {
            if (Math.random() < 0.01) {
            }
            return;
        }

        const gameLoop = (this.scene as any).game.loop;
        const actualDelta = gameLoop ? gameLoop.delta : delta;

        // Инициализация таймеров
        if ((playerSprite as any)._damageAnimationInitialized !== true) {
            (playerSprite as any)._damageAnimationTimer = 0;
            (playerSprite as any)._damageAnimationFrameIndex = 0;
            const frameRate = anim.frameRate || 12;
            (playerSprite as any)._damageAnimationInterval = 1000 / frameRate;
            (playerSprite as any)._damageAnimationInitialized = true;
        }

        // Обновляем таймер
        (playerSprite as any)._damageAnimationTimer += actualDelta;

        // Переключаем кадр по таймеру
        if ((playerSprite as any)._damageAnimationTimer >= (playerSprite as any)._damageAnimationInterval) {
            (playerSprite as any)._damageAnimationTimer = 0;

            // Для анимации урона (repeat: 0) - переходим к следующему кадру
            const maxFrameIndex = frames.length - 1;
            if ((playerSprite as any)._damageAnimationFrameIndex < maxFrameIndex) {
                (playerSprite as any)._damageAnimationFrameIndex++;
            } else {
                // Достигли последнего кадра - останавливаемся
                (playerSprite as any)._damageAnimationFrameIndex = maxFrameIndex;
            }

            // Применяем кадр
            this.applyDamageFrame(playerSprite, frames);

            // Если достигли последнего кадра, планируем событие завершения
            if ((playerSprite as any)._damageAnimationFrameIndex === maxFrameIndex) {
                this.scheduleCompletionEvent(playerSprite, anim);
            }
        }
    }

    /**
     * Применяет кадр анимации урона к спрайту игрока
     */
    private applyDamageFrame(playerSprite: any, frames: any[]): void {
        const animFrame = frames[(playerSprite as any)._damageAnimationFrameIndex];
        if (!animFrame || !animFrame.frame) {
            return;
        }

        const animFrameObj = animFrame.frame;
        const frameIndex = this.extractFrameIndex(animFrameObj);

        if (frameIndex !== undefined) {
            playerSprite.setFrame(frameIndex);

            // Логируем редко (5% случаев)
            if (Math.random() < 0.05) {
            }
        } else {
        }
    }

    /**
     * Извлекает индекс кадра из объекта кадра анимации
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
     * Планирует событие завершения анимации урона
     * (вызывает animationcomplete после задержки)
     */
    private scheduleCompletionEvent(playerSprite: any, anim: any): void {
        const interval = (playerSprite as any)._damageAnimationInterval || 100;

        (this.scene as any).time.delayedCall(interval, () => {
            if (playerSprite.anims && playerSprite.anims.currentAnim && playerSprite.anims.currentAnim.key === anim.key) {
                playerSprite.emit('animationcomplete', anim);
            }
        });
    }
}
