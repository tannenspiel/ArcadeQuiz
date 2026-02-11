/**
 * GameOverHandler - Управление состояниями Game Over (победа/поражение)
 *
 * Отвечает за:
 * - Обработку окончания игры (win/lose)
 * - Перезапуск игры с полной очисткой всех объектов
 * - Показ победного экрана
 * - Полный рестарт на уровень 1
 */

import Phaser from 'phaser';
import { EventBus } from '../../EventBus';
import { EVENTS } from '../../../constants/gameConstants';
import { GameOverType } from '../../ui/GameOverModal';
import type { Player } from '../../entities/Player';
import type { Oracle } from '../../entities/Oracle';
import type { AbstractEnemy } from '../../entities/enemies/AbstractEnemy';
import type { AudioManager } from '../../systems/AudioManager';
import type { ScoreSystem } from '../../systems/ScoreSystem';
import type { HealthSystem } from '../../systems/HealthSystem';
import type { LevelManager } from '../../core/LevelManager';
import type { QuizManager } from '../../systems/QuizManager';
import type { GameState } from '../../core/GameState';
import type { UIManager } from '../../ui/UIManager';
import type { DebugOverlay } from '../../ui/DebugOverlay';
import type { GrassBackgroundSprite } from '../../entities/background/GrassBackgroundSprite';
import type { BushCollisionObject } from '../../entities/collision/BushCollisionObject';
import type { StoneCollisionObject } from '../../entities/collision/StoneCollisionObject';
import { PlayerState } from '../../../types/playerTypes';
import { logger } from '../../../utils/Logger';
import { MAX_LEVELS } from '../../../constants/gameConstants';

/**
 * Dependencies for GameOverHandler
 */
export interface GameOverDependencies {
    scene: Phaser.Scene;
    player: Player;
    audioManager: AudioManager;
    physics: Phaser.Physics.Arcade.ArcadePhysics;
    input: Phaser.Input.InputPlugin;
    time: Phaser.Time.Clock;
    game: Phaser.Game;
    scale: Phaser.Scale.ScaleManager;
    levelManager: LevelManager;
    scoreSystem: ScoreSystem;
    healthSystem: HealthSystem;
    gameState: GameState;
    quizManager: QuizManager;
}

// Импорты для cleanup objects
// GrassBackgroundSprite и BushCollisionObject удалены как неиспользуемые


/**
 * Objects for cleanup during restart
 */
export interface GameOverCleanupObjects {
    debugOverlay?: DebugOverlay;
    globalQuestionText?: Phaser.GameObjects.Text | null;
    globalQuestionImage?: Phaser.GameObjects.Image | null;
    floatingTextPool: Phaser.GameObjects.Text[];
    playerFlashGetKeySprites: Phaser.GameObjects.Sprite[];
    enemyInstances: AbstractEnemy[];
    portalInstances: any[];
    enemies: Phaser.Physics.Arcade.Group;
    chasers: Phaser.Physics.Arcade.Group;
    hearts: Phaser.Physics.Arcade.Group;
    keys: Phaser.Physics.Arcade.Group;
    portals: Phaser.Physics.Arcade.Group;
    oracle: Oracle;

    grassBackground?: GrassBackgroundSprite;
    bushCollisionObjects?: BushCollisionObject; // Single object with destroy() method
    stoneCollisionObjects?: StoneCollisionObject; // Single object with destroy() method
}

/**
 * Callbacks for operations that require MainScene
 */
export interface GameOverCallbacks {
    // Registry operations
    getRegistry: () => Phaser.Data.DataManager;

    // Game state to reset
    getAnsweredQuestions: () => Set<string>;
    setAnsweredQuestions: (value: Set<string>) => void;
    // ✅ НОВОЕ: Отслеживание уникальности утверждений монеток
    getAnsweredCoinStatements: () => Set<string>;
    setAnsweredCoinStatements: (value: Set<string>) => void;
    getIsOracleActivated: () => boolean;
    setIsOracleActivated: (value: boolean) => void;
    getLastDepositTime: () => number;
    setLastDepositTime: (value: number) => void;
    getPendingPortal: () => any;
    setPendingPortal: (value: any) => void;
    getPortalModalCooldown: () => number;
    setPortalModalCooldown: (value: number) => void;
    getCurrentGlobalQuestionData: () => any;
    setCurrentGlobalQuestionData: (value: any) => void;
    getCurrentMiniQuizData: () => any;
    setCurrentMiniQuizData: (value: any) => void;
    getLastEnemyCollisionTime: () => number;
    setLastEnemyCollisionTime: (value: number) => void;
    getLastFullWarningTime: () => number;
    setLastFullWarningTime: (value: number) => void;

    // Tiled map state to reset
    getTiledPortalsConfig: () => any[];
    setTiledPortalsConfig: (value: any[]) => void;
    getCurrentOverlapData: () => any;
    setCurrentOverlapData: (value: any) => void;
    getTiledMapInfo: () => any;
    setTiledMapInfo: (value: any) => void;

    // Flash timers to clear
    getPlayerFlashLoseKeyInterval: () => Phaser.Time.TimerEvent | null;
    setPlayerFlashLoseKeyInterval: (value: Phaser.Time.TimerEvent | null) => void;
    getPlayerFlashGetKeyInterval: () => Phaser.Time.TimerEvent | null;
    setPlayerFlashGetKeyInterval: (value: Phaser.Time.TimerEvent | null) => void;
    getPlayerFlashGetKeyPositionTimer: () => Phaser.Time.TimerEvent | null;
    setPlayerFlashGetKeyPositionTimer: (value: Phaser.Time.TimerEvent | null) => void;

    // UI operations
    showGameWinModal: (score: number, feedbackText: string, onRestart: () => void) => void;
    getUiManager: () => UIManager;

    // Additional cleanup
    destroyDebugOverlay: () => void;
    destroyGlobalQuestionObjects: () => void;
    destroyGrassBackground: () => void;
    destroyBushCollisionObjects: () => void;
    destroyStoneCollisionObjects: () => void;
}

/**
 * Manages game over states and game restart logic
 */
export class GameOverHandler {
    constructor(
        private deps: GameOverDependencies,
        private cleanupObjects: GameOverCleanupObjects,
        private callbacks: GameOverCallbacks
    ) { }

    /**
     * Handle game over (win or lose)
     */
    public handleGameOver(result: 'win' | 'lose'): void {
        logger.log('GAME_OVER', '🎮 GameOverHandler: handleGameOver called with result:', result);

        const playerSprite = this.deps.player.getSprite();

        if (result === 'lose' && this.deps.player.getState() !== PlayerState.DEAD) {
            this.deps.player.setState(PlayerState.DEAD);
            this.deps.audioManager.playCharacterDead();
        }

        this.deps.audioManager.stopMusic();
        this.deps.physics.pause();
        if (this.deps.input.keyboard) {
            this.deps.input.keyboard.enabled = false;
        }

        let gameOverType: GameOverType;
        if (result === 'win') {
            const currentLevel = this.deps.levelManager.getCurrentLevel();
            logger.log('GAME_OVER', `🔍 GameOver check: currentLevel=${currentLevel}, MAX_LEVELS=${MAX_LEVELS}`);
            if (currentLevel >= MAX_LEVELS) {
                logger.log('GAME_OVER', `✅ WIN_GAME (currentLevel ${currentLevel} >= MAX_LEVELS ${MAX_LEVELS})`);
                gameOverType = GameOverType.WIN_GAME;
            } else {
                logger.log('GAME_OVER', `✅ WIN_LEVEL (currentLevel ${currentLevel} < MAX_LEVELS ${MAX_LEVELS})`);
                gameOverType = GameOverType.WIN_LEVEL;
            }
            this.deps.audioManager.playWinMusic();
        } else {
            gameOverType = GameOverType.LOSE;
            this.deps.audioManager.playGameOverMusic();
        }

        const score = this.deps.scoreSystem.getScore();
        this.deps.gameState.setGameOver(result);

        this.deps.time.delayedCall(1000, async () => {
            let feedbackText = '';

            if (result === 'win') {
                const maxScore = gameOverType === GameOverType.WIN_GAME
                    ? this.deps.scoreSystem.getTotalMaxPossibleScore()
                    : this.deps.scoreSystem.getMaxPossibleScore();

                const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                const currentLevel = this.deps.levelManager.getCurrentLevel();

                feedbackText = await this.deps.quizManager.getTieredWinMessage(
                    currentLevel,
                    percentage,
                    gameOverType === GameOverType.WIN_GAME ? 'game' : 'level'
                );
            }

            if (gameOverType === GameOverType.WIN_GAME) {
                this.handleGameWin(score, feedbackText);
            } else {
                EventBus.emit(EVENTS.GAME_OVER, {
                    result: result,
                    score: score,
                    feedbackText: feedbackText
                });
            }
            logger.log('GAME_OVER', '🎮 GameOverHandler: End of game/level UI displayed');
        });
    }

    /**
     * Show game win modal
     */
    public handleGameWin(score: number, feedbackText: string): void {
        logger.log('GAME_OVER', '🏆 GameOverHandler: Showing Game Win Screen with score:', score);
        this.callbacks.showGameWinModal(
            score,
            feedbackText,
            () => this.handleFullGameRestart()
        );
    }

    /**
     * Full game restart (back to level 1)
     */
    public handleFullGameRestart(): void {
        logger.log('GAME_OVER', '🔄 GameOverHandler: Full Game Restart Requested');
        this.deps.levelManager.setCurrentLevel(1);
        const registry = this.callbacks.getRegistry();
        registry.set('currentLevel', 1);
        registry.set('score', 0);
        this.restartGame(true); // resetLevel = true
    }

    /**
     * Restart scene WITHOUT resetting level (for next level transition)
     * Score и currentLevel сохраняются в registry перед вызовом этого метода
     */
    public restartScene(): void {
        logger.log('GAME_OVER', '🔄 GameOverHandler: Restarting scene (keeping current level)...');
        this.restartGame(false); // resetLevel = false - НЕ сбрасываем уровень!
    }

    /**
     * Restart the game scene with full cleanup
     * This is a very long method (~200 lines) because it carefully cleans up all game objects
     * @param resetLevel - если false, НЕ сбрасывает уровень (для перехода на следующий уровень)
     */
    public restartGame(resetLevel: boolean = true): void {
        logger.log('GAME_OVER', `🔄 GameOverHandler: Restarting game... (resetLevel=${resetLevel})`);

        // Stop audio
        if (this.deps.audioManager) {
            this.deps.audioManager.stopMusic();
            this.deps.audioManager.destroy();
            // ✅ Сбрасываем состояние звука при полном рестарте игры (resetLevel = true)
            if (resetLevel && typeof this.deps.audioManager.resetMutedState === 'function') {
                this.deps.audioManager.resetMutedState();
            }
        }
        if (this.deps.scene.sound) {
            this.deps.scene.sound.stopAll();
        }

        // Remove resize listener - handled by EventBusManager
        // this.deps.scale.off('resize', this.callbacks.handlePhaserResize, this);

        // Remove resize listener - handled by EventBusManager
        // this.deps.scale.off('resize', this.callbacks.handlePhaserResize, this);

        // Cleanup global question objects

        if (this.cleanupObjects.globalQuestionText) {
            try {
                this.cleanupObjects.globalQuestionText.destroy();
            } catch (e) {
                console.warn('⚠️ Error destroying globalQuestionText:', e);
            }
        }
        if (this.cleanupObjects.globalQuestionImage) {
            try {
                this.cleanupObjects.globalQuestionImage.destroy();
            } catch (e) {
                console.warn('⚠️ Error destroying globalQuestionImage:', e);
            }
        }

        // Cleanup floating text pool
        this.cleanupObjects.floatingTextPool.forEach(t => {
            if (t && typeof t.destroy === 'function') {
                try {
                    t.destroy();
                } catch (e) {
                    console.warn('⚠️ Error destroying floating text:', e);
                }
            }
        });
        this.cleanupObjects.floatingTextPool = [];

        // Cleanup debug overlay
        if (this.cleanupObjects.debugOverlay) {
            try {
                this.cleanupObjects.debugOverlay.destroy();
            } catch (e) {
                console.warn('⚠️ Error destroying debugOverlay:', e);
            }
        }

        // Reset all systems
        if (this.deps.healthSystem) this.deps.healthSystem.reset();
        // ✅ НЕ сбрасываем score при переходе на следующий уровень (score уже сохранён в registry)
        if (resetLevel && this.deps.scoreSystem) this.deps.scoreSystem.reset();
        if (this.deps.gameState) this.deps.gameState.reset();
        // ✅ Сбрасываем уровень только если resetLevel = true
        if (resetLevel && this.deps.levelManager) this.deps.levelManager.reset();
        if (this.deps.player) this.deps.player.reset();

        // Clear game state
        this.callbacks.setAnsweredQuestions(new Set());
        this.callbacks.setAnsweredCoinStatements(new Set());  // ✅ НОВОЕ
        this.callbacks.setIsOracleActivated(false);
        this.callbacks.setLastDepositTime(0);
        this.callbacks.setPendingPortal(null);
        this.callbacks.setPortalModalCooldown(0);
        this.callbacks.setCurrentGlobalQuestionData(null);
        this.callbacks.setCurrentMiniQuizData(null);
        this.callbacks.setLastEnemyCollisionTime(0);
        this.callbacks.setLastFullWarningTime(0);

        // Cleanup flash timers
        const flashLoseKey = this.callbacks.getPlayerFlashLoseKeyInterval();
        if (flashLoseKey) {
            flashLoseKey.destroy();
            this.callbacks.setPlayerFlashLoseKeyInterval(null);
        }
        const flashGetKey = this.callbacks.getPlayerFlashGetKeyInterval();
        if (flashGetKey) {
            flashGetKey.destroy();
            this.callbacks.setPlayerFlashGetKeyInterval(null);
        }
        const flashGetPosition = this.callbacks.getPlayerFlashGetKeyPositionTimer();
        if (flashGetPosition) {
            flashGetPosition.destroy();
            this.callbacks.setPlayerFlashGetKeyPositionTimer(null);
        }

        // Cleanup flash sprites
        if (this.cleanupObjects.playerFlashGetKeySprites && this.cleanupObjects.playerFlashGetKeySprites.length > 0) {
            this.cleanupObjects.playerFlashGetKeySprites.forEach(sprite => {
                if (sprite && typeof sprite.destroy === 'function') {
                    try {
                        sprite.destroy();
                    } catch (e) {
                        console.warn('⚠️ Error destroying flash key sprite:', e);
                    }
                }
            });
            this.cleanupObjects.playerFlashGetKeySprites = [];
        }

        // Clear Tiled map state
        this.callbacks.setTiledPortalsConfig([]);
        this.callbacks.setCurrentOverlapData(null);
        this.callbacks.setTiledMapInfo(undefined);
        logger.log('GAME_OVER', '🔄 GameOverHandler: Tiled Map state cleared');

        // Cleanup enemy instances
        if (this.cleanupObjects.enemyInstances && this.cleanupObjects.enemyInstances.length > 0) {
            logger.log('GAME_OVER', `🔄 GameOverHandler: Destroying ${this.cleanupObjects.enemyInstances.length} enemy instances`);
            this.cleanupObjects.enemyInstances.forEach(enemy => {
                if (enemy && typeof enemy.destroy === 'function') {
                    try {
                        enemy.destroy();
                    } catch (e) {
                        console.warn('⚠️ Error destroying enemy instance:', e);
                    }
                }
            });
            this.cleanupObjects.enemyInstances = [];
        }

        // Clear physics groups
        if (this.cleanupObjects.enemies) this.cleanupObjects.enemies.clear(true, true);
        if (this.cleanupObjects.chasers) this.cleanupObjects.chasers.clear(true, true);
        if (this.cleanupObjects.hearts) this.cleanupObjects.hearts.clear(true, true);
        if (this.cleanupObjects.keys) this.cleanupObjects.keys.clear(true, true);

        // Cleanup portal instances
        if (this.cleanupObjects.portalInstances && this.cleanupObjects.portalInstances.length > 0) {
            this.cleanupObjects.portalInstances.forEach(portal => {
                if (portal && typeof portal.destroy === 'function') {
                    try {
                        portal.destroy();
                    } catch (e) {
                        console.warn('⚠️ Error destroying portal:', e);
                    }
                }
            });
            this.cleanupObjects.portalInstances = [];
        }

        // Clear portals group
        if (this.cleanupObjects.portals) {
            try {
                this.cleanupObjects.portals.clear(true, true);
            } catch (e) {
                console.warn('⚠️ Error clearing portals group:', e);
            }
        }

        // Reset oracle
        if (this.cleanupObjects.oracle) this.cleanupObjects.oracle.reset();



        // Resume physics and scene
        if (this.deps.physics.world && this.deps.physics.world.isPaused) {
            logger.log('GAME_OVER', '🔄 GameOverHandler: Resuming physics before restart');
            this.deps.physics.resume();
        }

        if (this.deps.scene.scene.isPaused()) {
            logger.log('GAME_OVER', '🔄 GameOverHandler: Resuming scene before restart');
            this.deps.scene.scene.resume();
        }

        // Enable input
        if (this.deps.input) {
            this.deps.input.enabled = true;
            if (this.deps.input.keyboard) {
                this.deps.input.keyboard.enabled = true;
                this.deps.input.keyboard.resetKeys();
            }
        }

        // Restart scene
        logger.log('GAME_OVER', '🔄 GameOverHandler: Restarting scene');

        // ✅ Try using scene.restart() which should preserve physics
        // This is cleaner than stop/start and may prevent "physics.add is null" errors
        try {
            this.deps.scene.scene.restart();
            logger.log('GAME_OVER', '✅ GameOverHandler: Scene restarted successfully');
        } catch (error) {
            console.error('❌ GameOverHandler: scene.restart() failed, falling back to stop/start:', error);
            // Fallback to old stop/start method
            const game = this.deps.game;
            this.deps.scene.scene.stop('MainScene');
            requestAnimationFrame(() => {
                logger.log('GAME_OVER', '🔄 GameOverHandler: Starting MainScene via game.scene.start() (fallback)');
                game.scene.start('MainScene');
            });
        }
    }
}
