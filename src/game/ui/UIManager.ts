
import Phaser from 'phaser';
import { PortalModal } from './PortalModal';
import { KeyQuestionModal } from './KeyQuestionModal';
import { GameOverModal, GameOverType } from './GameOverModal';
import { CoinBubbleQuiz } from './CoinBubbleQuiz';
import { EVENTS, PHASER_SCENE_EVENTS } from '../../constants/gameConstants';
import { AbstractPortal } from '../entities/portals/AbstractPortal';
import { logger } from '../../utils/Logger';
import { ParsedQuestion } from '../../types/questionTypes';

export class UIManager {
    private scene: Phaser.Scene;
    public eventBus: Phaser.Events.EventEmitter;

    private currentPortalModal: PortalModal | null = null;
    private currentKeyModal: KeyQuestionModal | null = null;
    private currentCoinBubbleQuiz: CoinBubbleQuiz | null = null;
    private gameOverModal: GameOverModal | null = null;

    constructor(scene: Phaser.Scene, eventBus: Phaser.Events.EventEmitter) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.initializeListeners();
    }

    private initializeListeners(): void {
        this.eventBus.on(EVENTS.PORTAL_ENTER, this.handlePortalEnterRequest, this);
        this.eventBus.on(EVENTS.SHOW_KEY_QUIZ, this.handleShowKeyQuiz, this);
        this.eventBus.on(EVENTS.SHOW_COIN_QUIZ, this.handleShowCoinQuiz, this);
        this.eventBus.on(EVENTS.GAME_OVER, this.handleGameOver, this);

        // Очистка при завершении сцены
        this.scene.events.once(PHASER_SCENE_EVENTS.SHUTDOWN, this.destroy, this);
    }

    private handlePortalEnterRequest(data: { portal: AbstractPortal, globalQuestion?: ParsedQuestion }): void {
        const { portal, globalQuestion } = data;

        // Закрываем существующее модальное окно, если есть
        if (this.currentPortalModal) {
            this.currentPortalModal.destroy();
            this.currentPortalModal = null;
        }

        // Включаем input для модального окна
        if (this.scene.input) {
            this.scene.input.enabled = true;
            this.scene.input.setTopOnly(false);
        }

        this.currentPortalModal = new PortalModal(this.scene, {
            portalConfig: portal.getConfig(),
            globalQuestion: globalQuestion,
            onEnter: () => {
                this.eventBus.emit(EVENTS.PORTAL_ENTER_CONFIRMED, { portal });
                this.currentPortalModal = null;
            },
            onCancel: () => {
                this.eventBus.emit(EVENTS.PORTAL_ENTER_CANCELLED, { portal });
                this.currentPortalModal = null;
            }
        });
    }

    private handleShowKeyQuiz(data: { question: ParsedQuestion }): void {
        logger.log('MODAL_UI', 'UIManager: handleShowKeyQuiz called');
        // Закрываем существующее, если есть
        if (this.currentKeyModal) {
            this.currentKeyModal.destroy();
            this.currentKeyModal = null;
        }

        // Включаем input
        if (this.scene.input) {
            this.scene.input.enabled = true;
            this.scene.input.setTopOnly(false);
        }

        this.currentKeyModal = new KeyQuestionModal(this.scene, {
            question: data.question,
            onCorrectAnswer: () => {
                logger.log('MODAL_UI', 'UIManager: onCorrectAnswer called - emitting KEY_QUIZ_COMPLETED with result=correct');
                this.eventBus.emit(EVENTS.KEY_QUIZ_COMPLETED, { result: 'correct' });
                // ✅ UIManager сам управляет закрытием через destroy() в handleGameOver
            },
            onWrongAnswer: (damage: number) => {
                logger.log('MODAL_UI', `UIManager: onWrongAnswer called - emitting KEY_QUIZ_COMPLETED with result=wrong, damage=${damage}`);
                this.eventBus.emit(EVENTS.KEY_QUIZ_COMPLETED, { result: 'wrong', damage });
                // ✅ НЕ устанавливаем currentKeyModal = null - модальное окно должно остаться открытым
                // this.currentKeyModal = null; // ❌
            },
            onClose: () => {
                logger.log('MODAL_UI', 'UIManager: onClose called - emitting KEY_QUIZ_COMPLETED with result=closed');
                this.eventBus.emit(EVENTS.KEY_QUIZ_COMPLETED, { result: 'closed' });
                // ✅ UIManager будет управлять закрытием модального окна
                // this.currentKeyModal = null; // ❌
            }
        });
    }

    private handleShowCoinQuiz(data: { coinSprite: Phaser.Physics.Arcade.Sprite }): void {
        logger.log('MODAL_UI', 'UIManager: handleShowCoinQuiz called', {
            hasCoinSprite: !!data.coinSprite,
            coinPosition: data.coinSprite ? { x: data.coinSprite.x, y: data.coinSprite.y } : null
        });

        // Закрываем существующий квиз, если есть
        if (this.currentCoinBubbleQuiz) {
            logger.log('MODAL_UI', 'UIManager: Closing existing CoinBubbleQuiz');
            this.currentCoinBubbleQuiz.destroy();
            this.currentCoinBubbleQuiz = null;
        }

        // Включаем input
        if (this.scene.input) {
            this.scene.input.enabled = true;
            this.scene.input.setTopOnly(false);
        }

        this.currentCoinBubbleQuiz = new CoinBubbleQuiz(this.scene, {
            coinSprite: data.coinSprite,
            onCorrect: (statementText: string) => {
                logger.log('MODAL_UI', 'UIManager: CoinBubbleQuiz onCorrect called - emitting COIN_QUIZ_COMPLETED with result=correct', {
                    statementText: statementText.substring(0, 30) + '...'
                });
                // ✅ НОВОЕ: Передаем текст утверждения для отслеживания уникальности
                this.eventBus.emit(EVENTS.COIN_QUIZ_COMPLETED, { result: 'correct', statementText });
                // CoinBubbleQuiz сам управляет своим уничтожением после ответа
            },
            onWrong: () => {
                logger.log('MODAL_UI', 'UIManager: CoinBubbleQuiz onWrong called - emitting COIN_QUIZ_COMPLETED with result=wrong');
                this.eventBus.emit(EVENTS.COIN_QUIZ_COMPLETED, { result: 'wrong' });
                // CoinBubbleQuiz сам управляет своим уничтожением после ответа
            }
        });

        logger.log('MODAL_UI', 'UIManager: CoinBubbleQuiz created successfully');
    }

    private handleGameOver(data: { result: 'win' | 'lose', score: number, feedbackText?: string }): void {
        logger.log('MODAL_UI', 'UIManager: handleGameOver called', {
            result: data.result,
            score: data.score,
            currentKeyModal: !!this.currentKeyModal,
            currentPortalModal: !!this.currentPortalModal,
            currentCoinBubbleQuiz: !!this.currentCoinBubbleQuiz,
            gameOverModal: !!this.gameOverModal
        });

        // Закрываем все открытые модальные окна перед показом Game Over
        if (this.currentKeyModal) {
            logger.log('MODAL_UI', 'UIManager: Closing currentKeyModal due to Game Over');
            try {
                this.currentKeyModal.destroy();
            } catch (e) {
                logger.warn('MODAL_UI', 'UIManager: Error destroying currentKeyModal', e);
            }
            this.currentKeyModal = null;
        }
        if (this.currentPortalModal) {
            logger.log('MODAL_UI', 'UIManager: Closing currentPortalModal');
            this.currentPortalModal.destroy();
            this.currentPortalModal = null;
        }
        if (this.currentCoinBubbleQuiz) {
            logger.log('MODAL_UI', 'UIManager: Closing currentCoinBubbleQuiz due to Game Over');
            this.currentCoinBubbleQuiz.destroy();
            this.currentCoinBubbleQuiz = null;
        }
        if (this.gameOverModal) {
            logger.log('MODAL_UI', 'UIManager: Closing gameOverModal');
            this.gameOverModal.destroy();
        }

        // Включаем input
        if (this.scene.input) {
            this.scene.input.enabled = true;
            this.scene.input.setTopOnly(false);
        }

        const type = data.result === 'win' ? GameOverType.WIN_LEVEL : GameOverType.LOSE;

        this.gameOverModal = new GameOverModal(this.scene, {
            type: type,
            score: data.score,
            feedbackText: data.feedbackText,
            onRestart: () => {
                this.eventBus.emit(EVENTS.RESTART_GAME);
                this.gameOverModal = null;
            },
            onNextLevel: () => {
                logger.log('MODAL_UI', 'UIManager: Emitting NEXT_LEVEL event');
                this.eventBus.emit(EVENTS.NEXT_LEVEL);
                this.gameOverModal = null;
            }
        });
    }

    public showGameWinModal(score: number, feedbackText: string, onRestart: () => void): void {
        // Закрываем все открытые модальные окна перед показом Win Game
        if (this.currentKeyModal) {
            this.currentKeyModal.destroy();
            this.currentKeyModal = null;
        }
        if (this.currentPortalModal) {
            this.currentPortalModal.destroy();
            this.currentPortalModal = null;
        }
        if (this.currentCoinBubbleQuiz) {
            this.currentCoinBubbleQuiz.destroy();
            this.currentCoinBubbleQuiz = null;
        }
        if (this.gameOverModal) {
            this.gameOverModal.destroy();
        }

        // Включаем input
        if (this.scene.input) {
            this.scene.input.enabled = true;
            this.scene.input.setTopOnly(false);
        }

        this.gameOverModal = new GameOverModal(this.scene, {
            type: GameOverType.WIN_GAME,
            score: score,
            feedbackText: feedbackText,
            onRestart: () => {
                onRestart();
                this.gameOverModal = null;
            }
        });
    }

    public destroy(): void {
        if (this.currentPortalModal) this.currentPortalModal.destroy();
        if (this.currentKeyModal) this.currentKeyModal.destroy();
        if (this.currentCoinBubbleQuiz) this.currentCoinBubbleQuiz.destroy();
        if (this.gameOverModal) this.gameOverModal.destroy();

        this.eventBus.off(EVENTS.PORTAL_ENTER, this.handlePortalEnterRequest, this);
        this.eventBus.off(EVENTS.SHOW_KEY_QUIZ, this.handleShowKeyQuiz, this);
        this.eventBus.off(EVENTS.SHOW_COIN_QUIZ, this.handleShowCoinQuiz, this);
        this.eventBus.off(EVENTS.GAME_OVER, this.handleGameOver, this);
    }
}
