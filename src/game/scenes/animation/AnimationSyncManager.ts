/**
 * AnimationSyncManager - Централизованная синхронизация анимаций physics спрайтов
 *
 * Выносит ~500 строк ручной синхронизации из MainScene.update()
 *
 * Проблема: Physics спрайты в Phaser 3 не обновляют анимации автоматически
 * при paused physics или в certain conditions. Этот модуль решает эту проблему.
 */

import type MainScene from '../MainScene';

/**
 * Интерфейс для синхронизатора анимаций
 */
export interface AnimationSyncer {
    /**
     * Вызывается каждый кадр из update()
     * @param delta - время в миллисекундах с последнего кадра
     */
    update(delta: number): void;
}

/**
 * AnimationSyncManager - управляет всеми синхронизаторами анимаций
 */
export class AnimationSyncManager {
    private syncers: AnimationSyncer[] = [];

    /**
     * Регистрирует синхронизатор
     */
    register(syncer: AnimationSyncer): void {
        this.syncers.push(syncer);
    }

    /**
     * Обновляет все синхронизаторы (вызывается из MainScene.update)
     */
    update(delta: number): void {
        for (const syncer of this.syncers) {
            syncer.update(delta);
        }
    }

    /**
     * Очищает все синхронизаторы
     */
    destroy(): void {
        this.syncers = [];
    }
}
