/**
 * LevelTransitionHandler - Управление переходами между уровнями
 *
 * Отвечает за:
 * - Переход на следующий уровень
 * - Проверку конца игры (MAX_LEVELS)
 * - Сохранение score в registry между уровнями
 */

import type { LevelManager } from '../../core/LevelManager';
import type { ScoreSystem } from '../../systems/ScoreSystem';
import { logger } from '../../../utils/Logger';

import { MAX_LEVELS } from '../../../constants/gameConstants';

/**
 * Dependencies for LevelTransitionHandler
 */
export interface LevelTransitionDependencies {
    levelManager: LevelManager;
    scoreSystem: ScoreSystem;
    registry: Phaser.Data.DataManager;
}

/**
 * Callbacks for operations that require MainScene
 */
export interface LevelTransitionCallbacks {
    /** Перезапуск игры с сохранением текущего уровня (для перехода на следующий уровень) */
    restartScene: () => void;
    /** Полный перезапуск игры на уровень 1 */
    restartGame: () => void;
    /** Показ победного экрана */
    handleGameWin: (score: number, feedbackText: string) => void;
}

/**
 * Manages level transitions and game completion
 */
export class LevelTransitionHandler {
    constructor(
        private deps: LevelTransitionDependencies,
        private callbacks: LevelTransitionCallbacks
    ) { }

    /**
     * Handle transition to next level
     */
    public async handleNextLevel(): Promise<void> {
        logger.log('LEVEL_TRANSITION', '🔄 LevelTransitionHandler: Handling Next Level transition...');

        // Check if game is complete
        const currentLevel = this.deps.levelManager.getCurrentLevel();
        if (currentLevel >= MAX_LEVELS) {
            logger.log('LEVEL_TRANSITION', '🏆 LevelTransitionHandler: Game Completed! Max level reached.');
            const score = this.deps.scoreSystem ? this.deps.scoreSystem.getScore() : 0;
            this.callbacks.handleGameWin(score, ''); // feedbackText will be generated
            return;
        }

        try {
            // PERSISTENCE: Save current score before transition
            const currentScore = this.deps.scoreSystem ? this.deps.scoreSystem.getScore() : 0;
            this.deps.registry.set('score', currentScore);
            logger.log('LEVEL_TRANSITION', `✅ LevelTransitionHandler: Score saved to registry: ${currentScore}`);

            // Move to next level via LevelManager
            await this.deps.levelManager.nextLevel();

            // PERSISTENCE: Save new level to Registry
            const newLevel = this.deps.levelManager.getCurrentLevel();
            this.deps.registry.set('currentLevel', newLevel);
            logger.log('LEVEL_TRANSITION', `✅ LevelTransitionHandler: Level saved to registry. Current level is now: ${newLevel}`);

            // Restart scene with new level (WITHOUT resetting to level 1)
            this.callbacks.restartScene();
        } catch (error) {
            console.error('❌ LevelTransitionHandler: Failed to transition to next level:', error);
        }
    }
}
