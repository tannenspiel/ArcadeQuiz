/**
 * OracleCollisionHandler - Обработка столкновений игрока с оракулом
 *
 * Исходный код: MainScene.ts строки 2493-2572
 * ⚠️ НОВОЕ: Поддержка двух фаз - COIN (монетки) и KEY (ключи)
 */

import type MainScene from '../MainScene';
import { GamePhase, EVENTS, KEYS } from '../../../constants/gameConstants';
import { logger } from '../../../utils/Logger';
import { EventBus } from '../../EventBus';

// Константа для цвета активированного оракула
const ORACLE_LABEL_ACTIVE_COLOR = '#00ff00';
const DEBUG_UI_ENABLED = false;

export class OracleCollisionHandler {
    constructor(private scene: MainScene) { }

    /**
     * Обрабатывает столкновение с оракулом
     * - COIN Phase: принимает монетки
     * - KEY Phase: принимает ключи
     * - Когда все 3 предмета собраны - активирует оракул
     */
    handle(): void {
        logger.log('ORACLE', '🎯 OracleCollisionHandler.handle: Called');
        const oracle = this.scene.oracle;
        const gameState = (this.scene as any).gameState;
        const audioManager = this.scene.audioManager;
        const player = this.scene.player;

        // ✅ Проверяем, не активирован ли уже оракул
        if (oracle.isActivated()) {
            logger.log('ORACLE', '⚠️ OracleCollisionHandler.handle: Oracle already activated, skipping');
            return;
        }

        const now = this.scene.time.now;
        if (now - this.scene.lastDepositTime < 500) {
            logger.log('ORACLE', '⚠️ OracleCollisionHandler.handle: Debounce active, skipping');
            return;
        }

        // ⚠️ НОВОЕ: Проверяем текущую фазу игры
        const currentPhase = gameState.getGamePhase();
        logger.log('ORACLE', `🎯 OracleCollisionHandler.handle: Current phase: ${currentPhase}`);

        if (currentPhase === GamePhase.COIN) {
            logger.log('ORACLE', '🪙 OracleCollisionHandler.handle: COIN Phase - calling handleCoinPhase');
            // COIN Phase: принимаем монетки
            this.handleCoinPhase(oracle, gameState, audioManager, player, now);
        } else if (currentPhase === GamePhase.KEY) {
            logger.log('ORACLE', '🔑 OracleCollisionHandler.handle: KEY Phase - calling handleKeyPhase');
            // KEY Phase: принимаем ключи
            // ✅ ЗАЩИТНАЯ ПРОВЕРКА: проверяем существование метода перед вызовом
            if (typeof (this as any).handleKeyPhase === 'function') {
                this.handleKeyPhase(oracle, gameState, audioManager, player, now);
            } else {
                logger.error('ORACLE', '❌ OracleCollisionHandler.handle: handleKeyPhase method not found!');
            }
        } else {
            logger.warn('ORACLE', `❌ OracleCollisionHandler.handle: Unknown phase: ${currentPhase}`);
        }
    }

    /**
     * ⚠️ НОВОЕ: Обработка COIN Phase - депозит монеток в оракул
     */
    private handleCoinPhase(
        oracle: any,
        gameState: any,
        audioManager: any,
        player: any,
        now: number
    ): void {
        logger.log('ORACLE', '🪙 handleCoinPhase: Called');
        const coinCount = gameState.getCoins();
        logger.log('ORACLE', `🪙 handleCoinPhase: Player has ${coinCount} coins`);

        if (coinCount > 0) {
            logger.log('ORACLE', '🪙 handleCoinPhase: Player has coins, attempting deposit');
            const itemDeposited = oracle.depositItem(GamePhase.COIN);
            logger.log('ORACLE', `🪙 handleCoinPhase: depositItem returned: ${itemDeposited}`);

            if (itemDeposited) {
                gameState.removeCoin();

                // ✅ Обновляем мон acreтки над игроком (после передачи одной оракулу)
                const currentCoins = gameState.getCoins();
                const playerSprite = player.getSprite();
                const heartPositions = this.scene.healthSystem.getHeartPositions(playerSprite.x, playerSprite.y);
                const heartScale = 4.0; // Совпадает с HealthSystem.getHeartScale()
                player.updateCoins(currentCoins, heartPositions, KEYS.COIN_HEART, heartScale);

                this.scene.lastDepositTime = now;

                // Воспроизводим звук применения монетки к оракулу
                audioManager.playApplyKey();

                // ✅ Используем машину состояний для применения предмета
                player.applyKey();

                // ✅ Обновляем метку оракула (если она существует)
                const storedCoins = oracle.getStoredCoins();
                logger.log('ORACLE', `🪙 handleCoinPhase: Oracle now has ${storedCoins}/3 coins`);
                // ❌ ОТКЛЮЧЕНО: oracleLabel больше не используется
                // if (this.scene.oracleLabel) {
                //     this.scene.oracleLabel.setText(`ORACLE (${storedCoins}/3)`);
                // }
                this.scene.hudManager.update();

                // ✅ Если все монетки собраны, активируем оракул
                logger.log('ORACLE', `🪙 handleCoinPhase: Checking if Oracle should activate (${storedCoins} >= 3)`);
                if (storedCoins >= 3) {
                    logger.log('ORACLE', '🔥 handleCoinPhase: ACTIVATING ORACLE!');
                    this.scene.isOracleActivated = true;
                    gameState.setOracleActivated(true);
                    // ❌ ОТКЛЮЧЕНО: oracleLabel больше не используется
                    // if (this.scene.oracleLabel) {
                    //     this.scene.oracleLabel.setText('ORACLE ACTIVE').setColor(ORACLE_LABEL_ACTIVE_COLOR);
                    // }

                    // ✅ Настраиваем обработчик кликов по Оракулу
                    // Это также переводит Оракул в состояние ACTIVATED, 
                    // которое само проигрывает звук и эмитит событие ORACLE_ACTIVATED
                    oracle.enableInteraction();

                    if (DEBUG_UI_ENABLED) {
                        this.scene.hudManager.update();
                    }
                } else {
                    logger.log('ORACLE', `⚠️ handleCoinPhase: Not enough coins yet (${storedCoins}/3)`);
                }
            } else {
                logger.log('ORACLE', '❌ handleCoinPhase: depositItem returned false (Oracle rejected coin)');
            }
        } else {
            logger.log('ORACLE', '❌ handleCoinPhase: Player has no coins');
        }
    }

    /**
     * ⚠️ НОВОЕ: Обработка KEY Phase - депозит ключей в оракул
     */
    private handleKeyPhase(
        oracle: any,
        gameState: any,
        audioManager: any,
        player: any,
        now: number
    ): void {
        logger.log('ORACLE', '🔑 handleKeyPhase: Called');
        const keyCount = gameState.getKeys();
        logger.log('ORACLE', `🔑 handleKeyPhase: Player has ${keyCount} keys`);

        if (keyCount > 0) {
            logger.log('ORACLE', '🔑 handleKeyPhase: Player has keys, attempting deposit');
            const itemDeposited = oracle.depositItem(GamePhase.KEY);
            logger.log('ORACLE', `🔑 handleKeyPhase: depositItem returned: ${itemDeposited}`);

            if (itemDeposited) {
                gameState.removeKey();

                this.scene.lastDepositTime = now;

                // Воспроизводим звук применения ключа к оракулу
                audioManager.playApplyKey();

                // ✅ Используем машину состояний для применения предмета
                player.applyKey();

                // ✅ Обновляем HUD (ключи отображаются только там)
                this.scene.hudManager.update();

                // ✅ Получаем количество хранимых ключей
                const storedKeys = oracle.getStoredKeys();
                logger.log('ORACLE', `🔑 handleKeyPhase: Oracle now has ${storedKeys}/3 keys`);

                // ✅ Если все ключи собраны, активируем оракул
                logger.log('ORACLE', `🔑 handleKeyPhase: Checking if Oracle should activate (${storedKeys} >= 3)`);
                if (storedKeys >= 3) {
                    logger.log('ORACLE', '🔥 handleKeyPhase: ACTIVATING ORACLE!');
                    this.scene.isOracleActivated = true;
                    gameState.setOracleActivated(true);

                    // ✅ Настраиваем обработчик кликов по Оракулу
                    oracle.enableInteraction();

                    if (DEBUG_UI_ENABLED) {
                        this.scene.hudManager.update();
                    }
                } else {
                    logger.log('ORACLE', `⚠️ handleKeyPhase: Not enough keys yet (${storedKeys}/3)`);
                }
            } else {
                logger.log('ORACLE', '❌ handleKeyPhase: depositItem returned false (Oracle rejected key)');
            }
        } else {
            logger.log('ORACLE', '❌ handleKeyPhase: Player has no keys');
        }
    }

}
