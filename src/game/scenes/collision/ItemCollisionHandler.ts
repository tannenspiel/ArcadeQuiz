/**
 * ItemCollisionHandler - Обработка столкновений игрока с предметами
 *
 * Объединяет логику для Heart и Key collision handlers.
 * ⚠️ НОВОЕ: Поддержка двух фаз - COIN (монетки) и KEY (ключи)
 * Исходный код: MainScene.ts строки 2231-2390
 */

import type { ParsedQuestion, QuestionType } from '../../../types/questionTypes';
import { QuestionType as Qt } from '../../../types/questionTypes';
import { EVENTS, GamePhase } from '../../../constants/gameConstants';
import type MainScene from '../MainScene';
import { logger } from '../../../utils/Logger';
import { PlayerState } from '../../entities/Player';

const MAX_HEALTH = 3;

export class ItemCollisionHandler {
    constructor(private scene: MainScene) {
        // Empty constructor
    }

    /**
     * Обрабатывает столкновение с сердечком (восстановление здоровья)
     */
    handleHeart(heart: Phaser.Physics.Arcade.Sprite): void {
        if (!this.scene['sys']?.settings?.active) return;

        const healthSystem = (this.scene as any).healthSystem;
        const audioManager = (this.scene as any).audioManager;

        const health = healthSystem.getHealth();

        // ✅ Calculate ID to clear from processingKeys
        const heartId = `heart-${Math.round(heart.x)}-${Math.round(heart.y)}`;
        const collisionSystem = (this.scene as any).collisionSystem;

        if (health < MAX_HEALTH && heart && heart.active) {
            healthSystem.addHealth(1);
            heart.destroy();
            audioManager.playPickupLife();
            (this.scene as any).updateHUD();
        }

        // ✅ ALWAYS clear processing key, whether picked up (destroyed) or not (full health)
        // This ensures:
        // 1. If destroyed: cleans up processingKeys (avoids stale keys)
        // 2. If full health: allows picking up later when health drops (CollisionSystem handles debounce via wasInRange)
        if (collisionSystem && typeof collisionSystem.clearProcessingKey === 'function') {
            collisionSystem.clearProcessingKey(heartId);
        }
    }

    /**
     * Обрабатывает столкновение с ключом/монеткой (запуск викторины)
     * ⚠️ НОВОЕ: Поведение зависит от текущей фазы игры:
     * - COIN Phase: запускает CoinBubbleQuiz
     * - KEY Phase: запускает KeyQuestionModal
     *
     * Этот метод очень большой (~150 строк) и управляет всем процессом викторины
     */
    async handleKey(key: Phaser.Physics.Arcade.Sprite): Promise<boolean> {
        if (!this.scene['sys']?.settings?.active || !key || !key.active) return false;

        const collisionSystem = (this.scene as any).collisionSystem;
        const gameState = (this.scene as any).gameState;

        // ⚠️ НОВОЕ: Quiz state protection - prevent simultaneous quizzes
        if (gameState.isQuizActive()) {
            logger.log('COLLISION_ITEM', '⚠️ Quiz already active, ignoring item collision');
            // ✅ FIX: Manually clear processing key because CollisionSystem ignores Promise return
            const keyId = `key-${Math.round(key.x)}-${Math.round(key.y)}`;
            if (collisionSystem && typeof collisionSystem.clearProcessingKey === 'function') {
                collisionSystem.clearProcessingKey(keyId);
            }
            return false;
        }

        // ⚠️ НОВОЕ: Check game phase and route accordingly
        const currentPhase = gameState.getGamePhase();
        if (currentPhase === GamePhase.COIN) {
            return await this.handleCoinPhase(key);
        } else if (currentPhase === GamePhase.KEY) {
            return await this.handleKeyPhase(key);
        }

        return false;
    }

    /**
     * ⚠️ НОВОЕ: Обработка COIN Phase - запуск CoinBubbleQuiz
     */
    private async handleCoinPhase(coin: Phaser.Physics.Arcade.Sprite): Promise<boolean> {
        const gameState = (this.scene as any).gameState;
        const audioManager = (this.scene as any).audioManager;
        const player = (this.scene as any).player;

        const coinId = `coin-${Math.round(coin.x)}-${Math.round(coin.y)}`;
        logger.log('COLLISION_ITEM', `🪙 ItemCollisionHandler.handleCoinPhase called for coin: ${coinId}, active: ${coin.active}`);

        // ✅ Save coinId for cleanup in resumeGame()
        (this.scene as any).currentCoinId = coinId;

        // ✅ ROBUST DEBOUNCE
        const now = this.scene['time'].now;
        const lastTouch = (coin as any).lastTouchTime || 0;

        if (now - lastTouch < 500) {
            logger.log('COLLISION_ITEM', '🪙 Coin debounce active, ignoring');
            return false;
        }

        logger.log('COLLISION_ITEM', '🪙 Coin Collision Validated. Processing...');
        (coin as any).lastTouchTime = now;

        // ⚠️ НОВОЕ: Check coin limit
        const coinCount = gameState.getCoins();
        const maxCoins = gameState.getMaxCoins();
        // player variable already exists in scope

        if (coinCount >= maxCoins) {
            // Check warning cooldown
            if (Date.now() - ((this.scene as any).lastFullWarningTime || 0) > 1000) {
                const effectsManager = (this.scene as any).effectsManager;
                if (effectsManager) {
                    effectsManager.showFloatingText(
                        player.getX(),
                        player.getY() - 50,
                        "COINS FULL!",
                        0xff9900
                    );
                }
                (this.scene as any).lastFullWarningTime = Date.now();
            }
            // ✅ FIX: Manually clear processing key because CollisionSystem ignores return value
            const collisionSystem = (this.scene as any).collisionSystem;
            if (collisionSystem && typeof collisionSystem.clearProcessingKey === 'function') {
                collisionSystem.clearProcessingKey(coinId);
            }
            return false;
        }

        // ⚠️ НОВОЕ: Set quiz state
        gameState.setQuizActive(true, 'coin');

        // Воспроизводим звук подбора монетки (пересечение на карте)
        audioManager.playPickupCoin();

        // ✅ Используем машину состояний для перехода в состояние вопроса
        player.enterQuiz();
        player.stop();

        // Останавливаем физику
        this.scene['physics'].pause();

        // ✅ Отключаем клавиатуру
        if (this.scene['input'].keyboard) {
            this.scene['input'].keyboard.enabled = false;
            this.scene['input'].keyboard.resetKeys();
        }

        // ВАЖНО: Включаем pointer input для бабблов
        this.scene['input'].enabled = true;
        this.scene['input'].setTopOnly(false);

        // ✅ Set in CoinQuizHandler
        const coinQuizHandler = (this.scene as any).coinQuizHandler;
        if (coinQuizHandler) {
            coinQuizHandler.setCurrentCoin(coin);
        }

        // Emit SHOW_COIN_QUIZ event через UIManager
        const eventBus = (this.scene as any).uiManager.eventBus;
        eventBus.emit(EVENTS.SHOW_COIN_QUIZ, { coinSprite: coin });
        logger.log('COLLISION_ITEM', 'MainScene: SHOW_COIN_QUIZ event emitted');

        return true;
    }

    /**
     * ⚠️ НОВОЕ: Обработка KEY Phase - запуск KeyQuestionModal (исходная логика)
     */
    private async handleKeyPhase(key: Phaser.Physics.Arcade.Sprite): Promise<boolean> {
        const gameState = (this.scene as any).gameState;
        const audioManager = (this.scene as any).audioManager;
        const player = (this.scene as any).player;

        const keyId = `key-${Math.round(key.x)}-${Math.round(key.y)}`;
        logger.log('COLLISION_ITEM', `🔑 ItemCollisionHandler.handleKeyPhase called for key: ${keyId}, active: ${key.active}`);

        // ✅ ROBUST DEBOUNCE
        const now = this.scene['time'].now;
        const lastTouch = (key as any).lastTouchTime || 0;

        if (now - lastTouch < 500) {
            logger.log('COLLISION_ITEM', '🔑 Key debounce active, ignoring');
            // ✅ FIX: Manually clear processing key
            const collisionSystem = (this.scene as any).collisionSystem;
            if (collisionSystem && typeof collisionSystem.clearProcessingKey === 'function') {
                collisionSystem.clearProcessingKey(keyId);
            }
            return false;
        }

        logger.log('COLLISION_ITEM', '🔑 Key Collision Validated. Processing...');
        (key as any).lastTouchTime = now;

        // ⚠️ НОВОЕ: Set quiz state
        gameState.setQuizActive(true, 'key');

        const keyCount = gameState.getKeys();
        const maxKeys = gameState.getState().maxKeys;

        if (keyCount >= maxKeys) {
            if (now - (this.scene as any).lastFullWarningTime > 1000) {
                const effectsManager = (this.scene as any).effectsManager;
                if (effectsManager) {
                    effectsManager.showFloatingText(
                        player.getX(),
                        player.getY() - 50,
                        "BAG FULL!",
                        0xff9900
                    );
                }
                (this.scene as any).lastFullWarningTime = now;
            }
            gameState.setQuizActive(false);
            // ✅ FIX: Manually clear processing key
            const collisionSystem = (this.scene as any).collisionSystem;
            if (collisionSystem && typeof collisionSystem.clearProcessingKey === 'function') {
                collisionSystem.clearProcessingKey(keyId);
            }
            return false;
        }

        // ✅ Check for state lock
        if (player.getState() === PlayerState.LOSING_KEY) {
            gameState.setQuizActive(false);
            // ✅ FIX: Manually clear processing key
            const collisionSystem = (this.scene as any).collisionSystem;
            if (collisionSystem && typeof collisionSystem.clearProcessingKey === 'function') {
                collisionSystem.clearProcessingKey(keyId);
            }
            return false;
        }

        // Воспроизводим звук подбора ключа
        audioManager.playPickupKey();

        // ✅ Используем машину состояний для перехода в состояние вопроса
        player.enterQuiz();
        player.stop();

        // Останавливаем физику, но не сцену полностью
        this.scene['physics'].pause();

        // ✅ Отключаем клавиатуру
        if (this.scene['input'].keyboard) {
            this.scene['input'].keyboard.enabled = false;
            this.scene['input'].keyboard.resetKeys();
        }

        // ВАЖНО: Включаем pointer input для модального окна
        this.scene['input'].enabled = true;
        this.scene['input'].setTopOnly(false);

        // Сохраняем ссылку на ключ и его ID
        (this.scene as any).currentKeySprite = key;
        (this.scene as any).currentKeyId = keyId;

        // ✅ Step 6: Also set in KeyQuizHandler
        const keyQuizHandler = (this.scene as any).keyQuizHandler;
        if (keyQuizHandler) {
            keyQuizHandler.setCurrentKey(key, keyId);
        }

        // Загружаем мини-квиз
        try {
            const levelManager = (this.scene as any).levelManager;
            const currentLevel = levelManager.getCurrentLevel();
            this.scene['data'].set('currentLevel', currentLevel);
            logger.log('COLLISION_ITEM', 'MainScene: Loading quiz for level:', currentLevel);

            // ✅ ИСПОЛЬЗУЕМ ПРЕДЗАПОЛНЕННЫЕ ДАННЫЕ ВОПРОСА
            let questionData = key.getData('questionData');

            if (!questionData) {
                logger.log('COLLISION_ITEM', 'ℹ️ MainScene: Key has no pre-assigned question, picking random');
                const quizManager = (this.scene as any).quizManager;
                questionData = await quizManager.getRandomMiniQuiz(currentLevel);
            } else {
                logger.log('COLLISION_ITEM', '✅ MainScene: Using unique pre-assigned question:', questionData.questionText);
            }

            logger.log('COLLISION_ITEM', 'MainScene: Quiz data loaded:', questionData);

            // ✅ Сохраняем данные вопроса
            (this.scene as any).currentMiniQuizData = questionData;

            // ВАЖНО: Включаем input для UI элементов
            this.scene['input'].enabled = true;
            this.scene['input'].setTopOnly(false);

            // Emit SHOW_KEY_QUIZ event через UIManager
            const eventBus = (this.scene as any).uiManager.eventBus;
            eventBus.emit(EVENTS.SHOW_KEY_QUIZ, { question: questionData });
            logger.log('COLLISION_ITEM', 'MainScene: SHOW_KEY_QUIZ event emitted');
            return true;

        } catch (error) {
            console.error('MainScene: Failed to load quiz question:', error);

            // Fallback: используем вопросы по умолчанию
            const fallbackQuestions = [
                { question: "2 + 2 = ?", correctAnswer: "4", wrongAnswers: ["3", "5"], feedbacks: ["Правильно!"], wrongFeedbacks: ["Неверно"] },
                { question: "Grass color?", correctAnswer: "Green", wrongAnswers: ["Red", "Blue"], feedbacks: ["Правильно!"], wrongFeedbacks: ["Неверно"] }
            ];
            const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];

            // Конвертируем в ParsedQuestion формат
            const parsedQuestion: ParsedQuestion = {
                type: Qt.TEXT_ONLY,
                questionText: randomQuestion.question,
                image: undefined,
                correctAnswer: randomQuestion.correctAnswer,
                wrongAnswers: randomQuestion.wrongAnswers,
                allAnswers: [randomQuestion.correctAnswer, ...randomQuestion.wrongAnswers].sort(() => Math.random() - 0.5),
                feedbacks: randomQuestion.feedbacks,
                wrongFeedbacks: randomQuestion.wrongFeedbacks
            };

            const currentLevel = (this.scene as any).levelManager.getCurrentLevel();
            this.scene['data'].set('currentLevel', currentLevel);

            this.scene['input'].enabled = true;
            this.scene['input'].setTopOnly(false);

            const eventBus = (this.scene as any).uiManager.eventBus;
            eventBus.emit(EVENTS.SHOW_KEY_QUIZ, { question: parsedQuestion });
            return true;
        }
    }
}
