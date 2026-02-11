/**
 * CoinQuizHandler - Handles quiz logic for coins (correct/wrong)
 *
 * **Flow:**
 * - Correct answer: +score (unique: 5, repeat: 2), +coin, play sound, resume game
 * - Wrong answer: -life, no coin, play damage sound, resume game
 * - Emits COIN_QUIZ_COMPLETED event after handling
 *
 * Pattern follows KeyQuizHandler for consistency.
 */

import Phaser from 'phaser';
import { GameState } from '../../core/GameState';
import { ScoreSystem } from '../../systems/ScoreSystem';
import { HealthSystem } from '../../systems/HealthSystem';
import { AudioManager } from '../../systems/AudioManager';
import { logger } from '../../../utils/Logger';
import { SOUND_KEYS, EVENTS, KEYS, DEPTHS } from '../../../constants/gameConstants';
import { PENALTY } from '../../../constants/scoreConstants';

/**
 * Callbacks for operations that require MainScene
 */
export interface CoinQuizCallbacks {
    resumeGame: () => void;
    updateHUD: () => void;
}

/**
 * Dependencies for CoinQuizHandler
 */
export interface CoinQuizDependencies {
    scene: Phaser.Scene;
    gameState: GameState;
    scoreSystem: ScoreSystem;
    healthSystem: HealthSystem;
    audioManager: AudioManager;
    answeredCoinStatements: Set<string>;  // ✅ НОВОЕ: Отслеживание уникальности утверждений
}

/**
 * Handles quiz logic for coins (correct/wrong)
 */
import { Coin } from '../../entities/items/Coin';

// ...

export class CoinQuizHandler {
    private currentCoinSprite: Coin | null = null;

    constructor(
        private deps: CoinQuizDependencies,
        private callbacks: CoinQuizCallbacks
    ) { }

    /**
     * Sets the current coin being processed
     */
    public setCurrentCoin(sprite: Coin | null): void {
        this.currentCoinSprite = sprite;
    }

    /**
     * Gets the current coin sprite
     */
    public getCurrentCoinSprite(): Coin | null {
        return this.currentCoinSprite;
    }

    /**
     * Handles correct answer on coin quiz
     * ✅ v2 - Обновленная система очков с уникальностью
     * Result: +score (unique: 5, repeat: 2), +coin, continue
     * @param statementText Текст истинного утверждения для отслеживания уникальности
     */
    public handleCorrect(statementText: string): void {
        logger.log('QUIZ_COIN', '🟢 CoinQuizHandler.handleCorrect called', {
            hasCoinSprite: !!this.currentCoinSprite,
            statementText: statementText.substring(0, 30) + '...'
        });

        // ✅ НОВОЕ: Определяем уникальность утверждения (аналогично ключам)
        let isUnique = true;
        if (statementText && this.deps.answeredCoinStatements.has(statementText)) {
            isUnique = false;
            logger.log('QUIZ_COIN', '  Statement already answered, using repeat points');
        } else if (statementText) {
            this.deps.answeredCoinStatements.add(statementText);
            logger.log('QUIZ_COIN', '  ✅ New statement, adding to answered set');
        }

        // ✅ НОВОЕ: Добавляем очки с учетом уникальности (5 за уникальную, 2 за повторную)
        this.deps.scoreSystem.addCoinScore(isUnique);
        const pointsEarned = isUnique ? 5 : 2;

        // Add coin to game state
        this.deps.gameState.addCoin();

        // ✅ Обновляем мон acreтки над игроком
        const player = (this.deps.scene as any).player;
        if (player && typeof player.updateCoins === 'function') {
            const currentCoins = this.deps.gameState.getCoins();
            const playerSprite = player.getSprite();
            const heartPositions = this.deps.healthSystem.getHeartPositions(playerSprite.x, playerSprite.y);
            const heartScale = 4.0; // Совпадает с HealthSystem.getHeartScale()
            player.updateCoins(currentCoins, heartPositions, KEYS.COIN_HEART, heartScale);
        }

        // Play success coin sound (успешное взятие монетки)
        this.deps.audioManager.playSuccessCoin();

        // ✅ NEW: Trigger Player's "Get Key" animation (Win animation)
        if (player && typeof player.getKey === 'function') {
            logger.log('QUIZ_COIN', 'Triggering Player Win Animation (getKey)');
            player.getKey();
        }

        // ✅ NEW: Destroy coin immediately (No coin death animation)
        if (this.currentCoinSprite) {
            logger.log('QUIZ_COIN', '  Destroying coin immediately');
            this.currentCoinSprite.destroy();
            this.currentCoinSprite = null;
        }

        // Update HUD
        this.callbacks.updateHUD();

        logger.log('QUIZ_COIN', `✅ Correct answer handled - +${pointsEarned} points (${isUnique ? 'unique' : 'repeat'}), +1 coin`);

        // Resume game (physics)
        this.callbacks.resumeGame();
    }

    /**
     * Handles wrong answer on coin quiz
     * ✅ v3 - Добавлен штраф очков: -3 за неправильный ответ
     * * Result: -1 life, -3 points, no coin, continue
     */
    public handleWrong(): void {
        logger.log('QUIZ_COIN', '🔴 CoinQuizHandler.handleWrong called', {
            hasCoinSprite: !!this.currentCoinSprite
        });

        // Remove life
        const isAlive = this.deps.healthSystem.takeDamage(1);

        // ✅ v4: Штраф -3 очка за неправильный ответ
        this.deps.scoreSystem.removeScore(Math.abs(PENALTY.QUIZ_COIN_WRONG));

        // Play damage sound
        this.deps.audioManager.playSound(SOUND_KEYS.DAMAGE);

        if (!isAlive) {
            logger.log('QUIZ_COIN', '💀 Player died from coin quiz!');
            // Trigger Game Over explicitly
            // Using "as any" to access gameOverHandler if not in dependencies interface, 
            // but ideally it should be in dependencies.
            const scene = this.deps.scene as any;
            if (scene.gameOverHandler) {
                scene.gameOverHandler.handleGameOver('lose'); // 'lose' string or GameOverType.LOSE
            }
            return; // Stop further processing
        }

        // ✅ NEW: Destroy coin immediately (No death animation)
        if (this.currentCoinSprite) {
            logger.log('QUIZ_COIN', '  Wrong answer - destroying coin immediately');
            this.currentCoinSprite.destroy();
            this.currentCoinSprite = null;
        }

        // Update HUD
        this.callbacks.updateHUD();

        logger.log('QUIZ_COIN', '❌ Wrong answer handled -1 life, no coin');

        // Resume game (physics)
        this.callbacks.resumeGame();
    }

    /**
     * Handles quiz timeout or close (treat as wrong answer)
     */
    public handleClose(): void {
        logger.log('QUIZ_COIN', '🟡 CoinQuizHandler.handleClose called - treating as wrong');
        this.handleWrong();
    }

    /**
     * Reset handler state
     */
    public reset(): void {
        logger.log('QUIZ_COIN', 'CoinQuizHandler reset');
        this.currentCoinSprite = null;
    }
}
