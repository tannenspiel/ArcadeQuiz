import Phaser from 'phaser';
import { GameState } from '../../core/GameState';
import { ScoreSystem } from '../../systems/ScoreSystem';
import { HealthSystem } from '../../systems/HealthSystem';
import { AudioManager } from '../../systems/AudioManager';
import { CollisionSystem } from '../../systems/CollisionSystem';
import { Player } from '../../entities/Player';
import { ParsedQuestion } from '../../../types/questionTypes';
import { logger } from '../../../utils/Logger';
import { PENALTY } from '../../../constants/scoreConstants';

/**
 * Callbacks for operations that require MainScene
 */
export interface KeyQuizCallbacks {
    flashPlayerGetKey: () => void;
    resumeGame: () => void;
    updateHUD: () => void;
    handleGameOver: (result: 'win' | 'lose') => void;
}

/**
 * Dependencies for KeyQuizHandler
 */
export interface KeyQuizDependencies {
    scene: Phaser.Scene;
    gameState: GameState;
    scoreSystem: ScoreSystem;
    healthSystem: HealthSystem;
    audioManager: AudioManager;
    collisionSystem: CollisionSystem;
    player: Player;
    answeredQuestions: Set<string>;
}

/**
 * Handles quiz logic for keys (correct/wrong/close)
 */
export class KeyQuizHandler {
    private currentKeySprite: Phaser.Physics.Arcade.Sprite | null = null;
    private currentKeyId: string | null = null;

    constructor(
        private deps: KeyQuizDependencies,
        private callbacks: KeyQuizCallbacks
    ) { }

    /**
     * Sets the current key being processed
     */
    public setCurrentKey(sprite: Phaser.Physics.Arcade.Sprite | null, keyId: string | null): void {
        logger.log('QUIZ_KEY', `KeyQuizHandler.setCurrentKey called with keyId: ${keyId}`);
        this.currentKeySprite = sprite;
        this.currentKeyId = keyId;
    }

    /**
     * Gets the current key sprite
     */
    public getCurrentKeySprite(): Phaser.Physics.Arcade.Sprite | null {
        return this.currentKeySprite;
    }

    /**
     * Gets the current key ID
     */
    public getCurrentKeyId(): string | null {
        return this.currentKeyId;
    }

    /**
     * Handles correct answer on key quiz
     */
    public handleCorrect(questionData?: ParsedQuestion): void {
        logger.log('QUIZ_KEY', '🟢 KeyQuizHandler.handleCorrect called');
        logger.log('QUIZ_KEY', `  currentKeySprite: ${this.currentKeySprite?.active}, currentKeyId: ${this.currentKeyId}`);

        // Destroy key sprite
        if (this.currentKeySprite) {
            logger.log('QUIZ_KEY', `  Destroying key sprite at: ${this.currentKeySprite.x}, ${this.currentKeySprite.y}`);
            this.currentKeySprite.destroy();
            this.currentKeySprite = null;
        }

        // Clear processing key
        if (this.currentKeyId) {
            logger.log('QUIZ_KEY', '  Clearing processing key:', this.currentKeyId);
            const collisionSystem = (this.deps.scene as any).collisionSystem;
            collisionSystem?.clearProcessingKey(this.currentKeyId);
            this.currentKeyId = null;
        }

        // Determine uniqueness for scoring
        let isUnique = true;
        if (questionData && questionData.questionText) {
            if (this.deps.answeredQuestions.has(questionData.questionText)) {
                isUnique = false;
            } else {
                this.deps.answeredQuestions.add(questionData.questionText);
            }
        }

        this.deps.gameState.addKey();
        this.deps.scoreSystem.addKeyScore(isUnique);

        // Play success sound
        this.deps.audioManager.playSuccessKey();

        // Flash player and animate getting key
        this.callbacks.flashPlayerGetKey();
        this.deps.player.getKey();

        this.callbacks.resumeGame();
        this.callbacks.updateHUD();
    }

    /**
     * Handles wrong answer on key quiz
     * ✅ v4 - Обновлён штраф: -5 очков за неправильный ответ
     */
    public handleWrong(damage: number = 1): void {
        logger.log('QUIZ_KEY', `🔴 KeyQuizHandler.handleWrong called with damage: ${damage}`);
        logger.log('QUIZ_KEY', `  currentKeySprite: ${this.currentKeySprite?.active}, currentKeyId: ${this.currentKeyId}`);

        const isAlive = this.deps.healthSystem.takeDamage(damage);

        // ✅ v4: Штраф -5 очков за неправильный ответ
        this.deps.scoreSystem.removeScore(Math.abs(PENALTY.QUIZ_KEY_WRONG));

        // ✅ v4: Дополнительно -1 ключ, если ключей > 0
        const currentKeys = this.deps.gameState.getKeys();
        if (currentKeys > 0) {
            this.deps.gameState.removeKey();
            logger.log('QUIZ_KEY', `  Removed 1 key (was ${currentKeys}, now ${currentKeys - 1})`);
        }

        this.callbacks.updateHUD();

        // If no lives left, show game over
        if (!isAlive) {
            logger.log('QUIZ_KEY', '❌ Game Over: No lives left after wrong answer');

            // Destroy key
            if (this.currentKeySprite) {
                logger.log('QUIZ_KEY', '  Destroying key sprite (game over)');
                this.currentKeySprite.destroy();
                this.currentKeySprite = null;
            }

            // Clear processing key
            if (this.currentKeySprite) {
                // Ensure we clear the specific key ID associated with this sprite if known
                // But currentKeyId is separate
            }

            if (this.currentKeyId) {
                logger.log('QUIZ_KEY', '  Clearing processing key (game over):', this.currentKeyId);
                // ✅ FIX: Access collisionSystem dynamically from scene to avoid stale dependency issues
                const collisionSystem = (this.deps.scene as any).collisionSystem;
                if (collisionSystem) {
                    collisionSystem.clearProcessingKey(this.currentKeyId);
                } else {
                    // Fallback to injected dependency if scene access fails (unlikely)
                    this.deps.collisionSystem?.clearProcessingKey(this.currentKeyId);
                }
                this.currentKeyId = null;
            }

            // Exit quiz state
            this.deps.player.exitQuiz();

            // Transition to death state
            this.deps.player.setState('DEAD' as any);
            this.deps.audioManager.playCharacterDead();

            // Show game over after delay
            this.deps.scene.time.delayedCall(1000, () => {
                this.callbacks.handleGameOver('lose');
            });
        } else {
            logger.log('QUIZ_KEY', '  Player still alive - keeping quiz state active (waiting for user to close modal or retry)');
            // ✅ FIX: Не выходим из состояния квиза и не очищаем ключ.
            // Игрок должен либо закрыть окно крестиком, либо выбрать другой ответ (если механика позволит).
            // Модальное окно остается открытым, input блокирован для движения.
        }
    }

    /**
     * Handles closing key quiz modal
     */
    public handleClose(): void {
        if (this.currentKeySprite) {
            this.currentKeySprite.destroy();
            this.currentKeySprite = null;
        }

        // Clear processing key
        if (this.currentKeyId) {
            logger.log('QUIZ_KEY', '  Clearing processing key:', this.currentKeyId);
            const collisionSystem = (this.deps.scene as any).collisionSystem;
            collisionSystem?.clearProcessingKey(this.currentKeyId);
            this.currentKeyId = null;
        }

        this.callbacks.resumeGame();
    }
}
