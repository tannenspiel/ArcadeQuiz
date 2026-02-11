/**
 * PortalCollisionHandler - Обработка столкновений игрока с порталами
 *
 * Объединяет логику для solid collision, overlap entry, и byMask handlers.
 * Исходный код: MainScene.ts строки 891-925, 2576-2758
 */

import type { AbstractPortal } from '../../entities/portals/AbstractPortal';
import { PlayerState } from '../../entities/Player';
import type MainScene from '../MainScene';
import { EVENTS, GamePhase } from '../../../constants/gameConstants';
import { logger } from '../../../utils/Logger';
import { PENALTY } from '../../../constants/scoreConstants';

// AB-тестирование constants
const AB_TESTING = {
    ENABLE_PORTAL_CONFIRMATION: true // TODO: вынести в config
};

export class PortalCollisionHandler {
    constructor(private scene: MainScene) { }

    /**
     * Обрабатывает solid collision с порталом (депозит ключей)
     * ⚠️ НОВОЕ: Работает только в KEY Phase
     * Вызывается когда игрок стоит на портале
     */
    handleSolidCollision(portal: AbstractPortal): void {
        const isOracleActivated = this.scene.isOracleActivated;
        if (!isOracleActivated) return;

        // ⚠️ НОВОЕ: Portals only work in KEY Phase
        const gameState = (this.scene as any).gameState;
        const currentPhase = gameState.getGamePhase();
        if (currentPhase !== GamePhase.KEY) {
            return; // Skip portal interaction in COIN phase
        }

        const isOpen = portal.isOpen();
        const now = this.scene.time.now;
        const audioManager = this.scene.audioManager;
        const player = this.scene.player;

        // ✅ Разрешаем депозит ключей во время активации
        if (!isOpen && now - this.scene.lastDepositTime > 500) {
            const keyCount = gameState.getKeys();
            const storedKeys = portal.getStoredKeys();

            if (keyCount > 0 && storedKeys < 3) {
                // ✅ Try to deposit key first
                if (portal.depositKey()) {
                    gameState.removeKey();
                    this.scene.lastDepositTime = now;

                    // Воспроизводим звук применения ключа к порталу
                    audioManager.playApplyKey();

                    // ✅ Проигрываем анимацию применения ключа
                    player.playApplyKeyAnimation();
                } else {
                    logger.log('COLLISION_PORTAL', '🔒 MainScene: Portal rejected key solid collision (busy or full)');
                }

                this.scene.hudManager.update();
            }
        }
    }

    /**
     * Обрабатывает overlap entry в портал (вход в портал)
     * Показывает модальное окно подтверждения входа
     */
    async handleOverlapEntry(portal: AbstractPortal): Promise<void> {
        const portalState = portal.getState();
        const storedKeys = portal.getStoredKeys();
        const now = this.scene.time.now;
        const pendingPortal = this.scene.pendingPortal;
        const portalModalCooldown = this.scene.portalModalCooldown;

        logger.log('COLLISION_PORTAL', '🔵 handlePortalOverlapEntry called:', {
            isOpen: portal.isOpen(),
            isActivating: portal.isActivating(),
            mustExit: portal.mustExit(),
            hasPendingPortal: !!pendingPortal,
            portalState: portalState,
            storedKeys: storedKeys,
            portalId: portal.getConfig().id,
            cooldownActive: now < portalModalCooldown,
            cooldownRemaining: Math.max(0, portalModalCooldown - now)
        });

        // ✅ Проверка cooldown
        if (now < portalModalCooldown) {
            logger.log('COLLISION_PORTAL', '🔵 handlePortalOverlapEntry: Early return (cooldown active)', {
                cooldownRemaining: portalModalCooldown - now
            });
            return;
        }

        if (portal.isActivating() || portal.mustExit()) {
            logger.log('COLLISION_PORTAL', '🔵 handlePortalOverlapEntry: Early return (portal not ready or mustExit)');
            return;
        }

        // ✅ Не открываем модальное окно, если уже есть pendingPortal
        if (pendingPortal) {
            logger.log('COLLISION_PORTAL', '🔵 handlePortalOverlapEntry: Early return (pendingPortal exists)');
            return;
        }

        // ✅ КРИТИЧНО: Устанавливаем mustExit ПЕРЕД открытием модального окна
        portal.setMustExit();

        // ✅ AB-ТЕСТИРОВАНИЕ: Мгновенный вход без подтверждения
        if (AB_TESTING && AB_TESTING.ENABLE_PORTAL_CONFIRMATION === false) {
            logger.log('COLLISION_PORTAL', '🔵 handlePortalOverlapEntry: IMMEADIATE ENTRY (AB-Test)');

            portal.setMustExit();
            this.scene.pendingPortal = portal;
            this.scene.collisionSystem.disablePortalOverlap();

            const player = this.scene.player;
            player.enterPortal();
            player.stop();
            this.scene.physics.pause();
            if (this.scene.input.keyboard) this.scene.input.keyboard.enabled = false;

            this.handleEntry(portal);
            return;
        }

        // ✅ Сначала устанавливаем pendingPortal
        this.scene.pendingPortal = portal;

        // ✅ Отключаем overlap коллайдер
        this.scene.collisionSystem.disablePortalOverlap();

        // ✅ Используем машину состояний для входа в портал
        const player = this.scene.player;
        player.enterPortal();

        // Пауза игры
        player.stop();
        this.scene.physics.pause();

        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.enabled = false;
        }

        // ✅ ВАЖНО: Включаем input для модального окна
        this.scene.input.enabled = true;
        this.scene.input.setTopOnly(false);

        // ✅ ИСПОЛЬЗУЕМ НОВЫЙ PORTAL MODAL via Events
        // ✅ Загружаем случайный глобальный вопрос для портала, если его нет
        const loadAndShowPortalModal = async (portal: AbstractPortal) => {
            let currentGlobalQuestionData = this.scene.currentGlobalQuestionData;

            if (!currentGlobalQuestionData) {
                logger.log('PORTAL', 'PortalCollisionHandler: No global question loaded, fetching random one...');
                const currentLevel = this.scene.levelManager.getCurrentLevel();
                currentGlobalQuestionData = await this.scene.quizManager.getRandomGlobalQuestion(currentLevel);
                this.scene.currentGlobalQuestionData = currentGlobalQuestionData;
                logger.log('PORTAL', 'PortalCollisionHandler: Global question loaded:', currentGlobalQuestionData?.questionText?.substring(0, 30) + '...');
            }

            const eventBus = this.scene.uiManager.eventBus;
            eventBus.emit(EVENTS.PORTAL_ENTER, {
                portal,
                globalQuestion: currentGlobalQuestionData
            });
        };

        loadAndShowPortalModal(portal);
    }

    /**
     * Обрабатывает overlap byMask (поиск ближайшего портала)
     * Используется для Tiled Map масок порталов
     */
    handleOverlapByMask(_playerSprite: any, tileBody: any): void {
        const player = this.scene.player;
        const portalInstances = this.scene.portalInstances;

        if (!player || !portalInstances.length) return;

        // Используем центр зоны для поиска ближайшего портала
        const zoneX = tileBody.x;
        const zoneY = tileBody.y;

        let nearestPortal: AbstractPortal | null = null;
        let minDist = Infinity;

        for (const portal of portalInstances) {
            // Используем getX()/getY()
            const dist = Phaser.Math.Distance.Between(zoneX, zoneY, portal.getX(), portal.getY());

            // Находим ближайший портал
            if (dist < minDist) {
                minDist = dist;
                nearestPortal = portal;
            }
        }

        // Если нашли портал, обрабатываем взаимодействие
        if (nearestPortal) {
            // ✅ Уменьшаем радиус срабатывания до 50 пикселей
            if (minDist < 50) {
                // 🔥 КРИТИЧНО: Сначала проверяем, нужно ли депозитить ключ (как в CollisionSystem)
                const now = this.scene.time.now;
                if (nearestPortal.isActivating() && now - this.scene.lastDepositTime > 500) {
                    if ((this.scene as any).gameState.getKeys() > 0) {
                        logger.log('PORTAL', `PortalCollisionHandler (Tiled): Depositing key into portal ${nearestPortal.getConfig().id}`);
                        this.scene.lastDepositTime = now;

                        // ✅ Try to deposit key first
                        if (nearestPortal.depositKey()) {
                            // Only remove key if deposit was successful
                            const success = (this.scene as any).gameState.removeKey();
                            if (success) {
                                (this.scene as any).updateHUD(); // Обновляем UI
                                this.scene.player.applyKey(); // Анимация игрока
                            }
                        } else {
                            logger.log('PORTAL', 'PortalCollisionHandler (Tiled): Portal rejected key (busy or full)');
                        }
                    } else {
                        logger.log('PORTAL', 'PortalCollisionHandler (Tiled): Portal needs key, but player has none');
                    }
                } else {
                    // Иначе обрабатываем вход (если открыт)
                    this.handleOverlapEntry(nearestPortal);
                }
            }
        }
    }

    /**
     * Обрабатывает результат входа в портал
     * Вызывается после подтверждения в модальном окне
     */
    handleEntry(portal: AbstractPortal): void {
        logger.log('COLLISION_PORTAL', '🔵 MainScene.handlePortalEntry: Called with portal:', {
            portalId: portal.getConfig().id,
            isCorrect: portal.getConfig().isCorrect,
            answerText: portal.getConfig().answerText
        });

        const config = portal.getConfig();
        const scoreSystem = this.scene.scoreSystem;
        const audioManager = this.scene.audioManager;
        const player = this.scene.player;

        if (config.isCorrect) {
            logger.log('COLLISION_PORTAL', '✅ PortalModal: Correct portal - WIN!');
            scoreSystem.addPortalScore();
            this.scene.gameOverHandler.handleGameOver('win');
        } else {
            logger.log('COLLISION_PORTAL', '❌ PortalModal: Wrong portal - IMMEDIATE GAME OVER (lose)');

            // ✅ v4: Штраф -10 очков за неправильный портал
            scoreSystem.removeScore(Math.abs(PENALTY.QUIZ_PORTAL_WRONG));

            // ✅ Выходим из состояния портала
            player.exitPortal();

            // ✅ Переходим в состояние смерти
            player.setState(PlayerState.DEAD);

            // ✅ Воспроизводим звук смерти персонажа
            audioManager.playCharacterDead();

            // Показываем Game Over с задержкой
            this.scene.time.delayedCall(1000, () => {
                this.scene.gameOverHandler.handleGameOver('lose');
            });
        }
    }
}
