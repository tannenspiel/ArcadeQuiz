/**
 * PortalAnimationSync - Ручная синхронизация анимаций порталов
 *
 * Physics спрайты порталов не обновляют анимации автоматически.
 * Поддерживает различные состояния портала (BASE, ACTIVATING, ACTIVATED, INTERACTION).
 *
 * Исходный код: MainScene.ts строки 2186-2292, 2570-2628
 */

import type MainScene from '../MainScene';
import { PortalState } from '../../../types/portalTypes';
import type { AbstractPortal } from '../../entities/portals/AbstractPortal';
import { AnimationSyncer } from './AnimationSyncManager';

export class PortalAnimationSync implements AnimationSyncer {
    constructor(private scene: MainScene) { }

    update(delta: number): void {
        // Подход 1: Синхронизация через portals group
        this.syncPortalsGroup(delta);

        // Подход 2: Синхронизация через portalInstances (более надежный)
        this.syncPortalInstances(delta);
    }

    /**
     * Синхронизация через group.getChildren()
     * Исходный код: строки 2186-2292
     */
    private syncPortalsGroup(delta: number): void {
        const portals = (this.scene as any).portals;
        if (!portals || !portals.getChildren) {
            return;
        }

        portals.getChildren().forEach((portalSprite: any) => {
            this.syncPortalSprite(portalSprite, delta);
        });
    }

    /**
     * Синхронизация через portalInstances массив
     * Исходный код: строки 2570-2628
     * Использует while loop для отлова пропущенных кадров при лагах
     */
    private syncPortalInstances(delta: number): void {
        const portals = (this.scene as any).portalInstances;
        if (!portals || !Array.isArray(portals)) {
            return;
        }

        portals.forEach((portal: AbstractPortal) => {
            const sprite = portal.getSprite();
            if (!sprite || !sprite.active || !sprite.anims || !sprite.anims.isPlaying) {
                return;
            }

            // Синхронизируем только если установлен флаг ручной синхронизации
            if (!(sprite as any)._needsManualSync) {
                return;
            }

            this.syncPortalSpriteWithLoop(sprite, delta);
        });
    }

    /**
     * Базовая синхронизация спрайта портала
     */
    private syncPortalSprite(portalSprite: any, delta: number): void {
        const portal = portalSprite.getData('portal') as AbstractPortal;
        if (!portal || !portalSprite || !portalSprite.active) {
            return;
        }

        // Проверяем состояние портала
        const state = portal.getState();
        const isBase = state === PortalState.BASE;
        const isActivating = state === PortalState.ACTIVATING;
        const isActivated = state === PortalState.ACTIVATED;
        const isInteraction = state === PortalState.INTERACTION;

        // Пропускаем, если анимация не нужна
        if (!isBase && !isActivating && !isActivated && !isInteraction) {
            return;
        }

        // Для базового состояния проверяем, что это не статичная текстура
        if (isBase && (portal as any).useTiledMapTextures) {
            return;
        }

        if (!portalSprite.anims || !portalSprite.anims.currentAnim) {
            return;
        }

        const anim = portalSprite.anims.currentAnim;
        if (!anim || !anim.frames || anim.frames.length === 0) {
            return;
        }

        // Если ручная синхронизация не нужна и анимация играет нативно
        if (!(portalSprite as any)._needsManualSync && portalSprite.anims.isPlaying) {
            return;
        }

        this.syncAnimationFrame(portalSprite, anim, delta);
    }

    /**
     * Синхронизация с while loop для отлова пропущенных кадров
     * Используется при лагах для корректного отображения анимации
     */
    private syncPortalSpriteWithLoop(sprite: any, delta: number): void {
        const anim = sprite.anims.currentAnim;
        if (!anim || !anim.frames || anim.frames.length === 0) {
            return;
        }

        const gameLoop = (this.scene as any).game.loop;
        const actualDelta = gameLoop ? gameLoop.delta : delta;

        // Инициализация
        if ((sprite as any)._animationInitialized !== true) {
            (sprite as any)._animationTimer = 0;
            (sprite as any)._animationFrameIndex = 0;
            const frameRate = anim.frameRate || 10;
            (sprite as any)._animationInterval = 1000 / frameRate;
            (sprite as any)._animationInitialized = true;
        }

        (sprite as any)._animationTimer += actualDelta;

        // While loop для отлова пропущенных кадров (robust sync)
        let safetyCounter = 0;
        while (
            (sprite as any)._animationTimer >= (sprite as any)._animationInterval &&
            safetyCounter < 5
        ) {
            (sprite as any)._animationTimer -= (sprite as any)._animationInterval;
            safetyCounter++;

            const isLooping = anim.repeat === -1;
            const maxFrameIndex = anim.frames.length - 1;
            const currentIndex = (sprite as any)._animationFrameIndex;

            if (isLooping) {
                // Зацикленная анимация
                (sprite as any)._animationFrameIndex = (currentIndex + 1) % anim.frames.length;
            } else {
                // Одноразовая анимация (ACTIVATING)
                if (currentIndex < maxFrameIndex) {
                    (sprite as any)._animationFrameIndex++;
                } else {
                    // Достигли последнего кадра
                    (sprite as any)._animationFrameIndex = maxFrameIndex;
                    (sprite as any)._needsManualSync = false;
                    sprite.emit('animationcomplete', anim, anim.frames[(sprite as any)._animationFrameIndex]);
                    break; // Выходим из while loop
                }
            }
        }

        // Применяем кадр
        this.applyFrame(sprite, anim);
    }

    /**
     * Синхронизация отдельного кадра (без while loop)
     */
    private syncAnimationFrame(sprite: any, anim: any, delta: number): void {
        if (sprite._animationInitialized !== true) {
            sprite._animationTimer = 0;
            sprite._animationFrameIndex = 0;
            const frameRate = anim.frameRate || 8;
            sprite._animationInterval = 1000 / frameRate;
            sprite._animationInitialized = true;
        }

        sprite._animationTimer += delta;

        if (sprite._animationTimer >= sprite._animationInterval) {
            sprite._animationTimer = 0;
            const nextIndex = sprite._animationFrameIndex + 1;
            const isLooping = anim.repeat === -1;

            if (nextIndex >= anim.frames.length) {
                if (isLooping) {
                    sprite._animationFrameIndex = 0;
                } else {
                    sprite._animationFrameIndex = anim.frames.length - 1;
                    sprite._needsManualSync = false;
                    sprite.emit('animationcomplete', anim, anim.frames[sprite._animationFrameIndex]);
                }
            } else {
                sprite._animationFrameIndex = nextIndex;
            }

            this.applyFrame(sprite, anim);
        }
    }

    /**
     * Применяет кадр к спрайту
     */
    private applyFrame(sprite: any, anim: any): void {
        const animFrame = anim.frames[sprite._animationFrameIndex];
        if (!animFrame) return;

        const animFrameObj = animFrame.frame;
        let frameIndex: number | undefined;

        if (animFrameObj !== undefined) {
            if ((animFrameObj as any).index !== undefined) {
                frameIndex = (animFrameObj as any).index;
            } else if (animFrameObj?.name !== undefined) {
                const nameAsNum = parseInt(String(animFrameObj.name), 10);
                if (!isNaN(nameAsNum)) {
                    frameIndex = nameAsNum;
                }
            } else if (typeof animFrameObj === 'number') {
                frameIndex = animFrameObj;
            }
        }

        if (frameIndex !== undefined) {
            sprite.setFrame(frameIndex);
        }
    }
}
