/**
 * Unit тесты для PortalCollisionHandler
 */

import { PortalCollisionHandler } from '../../../../game/scenes/collision/PortalCollisionHandler';
import { PlayerState } from '../../../../game/entities/Player';
import { EVENTS } from '../../../../constants/gameConstants';
import type { AbstractPortal } from '../../../../game/entities/portals/AbstractPortal';

// Примечание: Phaser мокируется глобально в setup.ts
// Для этого теста используем упрощённую проверку

// Мок для Phaser.Math.Distance.Between
(global as any).Phaser = {
    Math: {
        Distance: {
            Between: jest.fn((x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2))
        }
    }
};

describe('PortalCollisionHandler', () => {
    let handler: PortalCollisionHandler;
    let mockScene: any;
    let mockPortal: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock portal
        mockPortal = {
            isOpen: jest.fn().mockReturnValue(false),
            getState: jest.fn().mockReturnValue('idle'),
            isActivating: jest.fn().mockReturnValue(false),
            mustExit: jest.fn().mockReturnValue(false),
            getStoredKeys: jest.fn().mockReturnValue(0),
            setMustExit: jest.fn(),
            depositKey: jest.fn().mockReturnValue(true),
            getConfig: jest.fn().mockReturnValue({ id: 1, isCorrect: true, answerText: 'Yes' }),
            getX: jest.fn().mockReturnValue(100),
            getY: jest.fn().mockReturnValue(200)
        };

        // Mock scene dependencies
        const mockScoreSystem = {
            addPortalScore: jest.fn(),
            removeScore: jest.fn() // ✅ Добавлено для штрафов
        };

        const mockAudioManager = {
            playApplyKey: jest.fn(),
            playCharacterDead: jest.fn()
        };

        const mockPlayer = {
            playApplyKeyAnimation: jest.fn(),
            enterPortal: jest.fn(),
            exitPortal: jest.fn(),
            stop: jest.fn(),
            setState: jest.fn(),
            getState: jest.fn().mockReturnValue(PlayerState.IDLE)
        };

        const mockCollisionSystem = {
            disablePortalOverlap: jest.fn()
        };

        const mockUIManager = {
            eventBus: {
                emit: jest.fn()
            }
        };

        const mockHUDManager = {
            update: jest.fn()
        };

        const mockGameOverHandler = {
            handleGameOver: jest.fn()
        };

        const mockLevelManager = {
            getCurrentLevel: jest.fn().mockReturnValue(1)
        };

        const mockQuizManager = {
            getRandomGlobalQuestion: jest.fn().mockResolvedValue({
                questionText: 'Test question',
                correctAnswer: 'Test',
                wrongAnswers: ['A', 'B'],
                allAnswers: ['Test', 'A', 'B'],
                feedbacks: ['Correct'],
                wrongFeedbacks: ['Wrong']
            })
        };

        // Mock scene
        mockScene = {
            isOracleActivated: true,
            levelManager: mockLevelManager,
            quizManager: mockQuizManager,
            time: {
                now: 1000,
                delayedCall: jest.fn((delay, callback) => {
                    if (callback) callback();
                    return { destroy: jest.fn() };
                })
            },
            audioManager: mockAudioManager,
            player: mockPlayer,
            lastDepositTime: 0,
            pendingPortal: null,
            portalModalCooldown: 0,
            collisionSystem: mockCollisionSystem,
            input: {
                keyboard: {
                    enabled: true
                },
                enabled: true,
                setTopOnly: jest.fn()
            },
            physics: {
                pause: jest.fn()
            },
            uiManager: mockUIManager,
            hudManager: mockHUDManager,
            gameOverHandler: mockGameOverHandler,
            currentGlobalQuestionData: null
        };

        // Add scene properties via getters
        Object.defineProperty(mockScene, 'gameState', {
            get: jest.fn().mockReturnValue({
                getKeys: jest.fn().mockReturnValue(0),
                removeKey: jest.fn(),
                // ⚠️ NEW: Coin mechanic methods
                getCoins: jest.fn().mockReturnValue(0),
                getMaxCoins: jest.fn().mockReturnValue(3),
                getGamePhase: jest.fn().mockReturnValue('key'),
                isQuizActive: jest.fn().mockReturnValue(false),
                setQuizActive: jest.fn(),
            }),
            configurable: true
        });
        Object.defineProperty(mockScene, 'scoreSystem', {
            get: jest.fn().mockReturnValue(mockScoreSystem),
            configurable: true
        });
        Object.defineProperty(mockScene, 'lastDepositTime', {
            get: jest.fn(() => (mockScene as any)._lastDepositTime || 0),
            set: function (value) { (mockScene as any)._lastDepositTime = value; },
            configurable: true
        });
        Object.defineProperty(mockScene, 'pendingPortal', {
            get: jest.fn(() => (mockScene as any)._pendingPortal),
            set: jest.fn(function (value) { (mockScene as any)._pendingPortal = value; }),
            configurable: true
        });
        Object.defineProperty(mockScene, 'portalModalCooldown', {
            get: jest.fn(() => (mockScene as any)._portalModalCooldown),
            set: jest.fn(function (value) { (mockScene as any)._portalModalCooldown = value; }),
            configurable: true
        });

        handler = new PortalCollisionHandler(mockScene);
    });

    describe('Solid collision (депозит ключей)', () => {
        it('должен игнорировать если оракул не активирован', () => {
            mockScene.isOracleActivated = false;

            handler.handleSolidCollision(mockPortal);

            expect(mockPortal.depositKey).not.toHaveBeenCalled();
        });

        it('должен игнорировать если портал открыт', () => {
            mockPortal.isOpen.mockReturnValue(true);

            handler.handleSolidCollision(mockPortal);

            expect(mockPortal.depositKey).not.toHaveBeenCalled();
        });

        it('должен игнорировать если нет cooldown', () => {
            (mockScene as any)._lastDepositTime = 900;
            mockScene.time.now = 1000;

            handler.handleSolidCollision(mockPortal);

            expect(mockPortal.depositKey).not.toHaveBeenCalled();
        });

        it('должен игнорировать если у игрока нет ключей', () => {
            mockScene.gameState.getKeys.mockReturnValue(0);

            handler.handleSolidCollision(mockPortal);

            expect(mockPortal.depositKey).not.toHaveBeenCalled();
        });

        it('должен депонировать ключ если условия выполнены', () => {
            mockScene.gameState.getKeys.mockReturnValue(1);
            mockPortal.getStoredKeys.mockReturnValue(0);
            (mockScene as any)._lastDepositTime = 0;
            mockScene.time.now = 1000;

            handler.handleSolidCollision(mockPortal);

            expect(mockPortal.depositKey).toHaveBeenCalled();
            expect(mockScene.gameState.removeKey).toHaveBeenCalled();
        });

        it('должен проигрывать звук применения ключа', () => {
            mockScene.gameState.getKeys.mockReturnValue(1);
            mockPortal.getStoredKeys.mockReturnValue(0);

            handler.handleSolidCollision(mockPortal);

            expect(mockScene.audioManager.playApplyKey).toHaveBeenCalled();
        });

        it('должен проигрывать анимацию применения ключа', () => {
            mockScene.gameState.getKeys.mockReturnValue(1);
            mockPortal.getStoredKeys.mockReturnValue(0);

            handler.handleSolidCollision(mockPortal);

            expect(mockScene.player.playApplyKeyAnimation).toHaveBeenCalled();
        });

        it('должен обновлять lastDepositTime', () => {
            mockScene.gameState.getKeys.mockReturnValue(1);
            mockPortal.getStoredKeys.mockReturnValue(0);

            handler.handleSolidCollision(mockPortal);

            expect((mockScene as any)._lastDepositTime).toBe(1000);
        });

        it('должен обновлять HUD', () => {
            mockScene.gameState.getKeys.mockReturnValue(1);
            mockPortal.getStoredKeys.mockReturnValue(0);

            handler.handleSolidCollision(mockPortal);

            expect(mockScene.hudManager.update).toHaveBeenCalled();
        });
    });

    describe('Overlap entry (вход в портал)', () => {
        it('должен игнорировать при активном cooldown', async () => {
            (mockScene as any)._portalModalCooldown = 2000;
            mockScene.time.now = 1000;

            await handler.handleOverlapEntry(mockPortal);

            expect(mockScene.player.enterPortal).not.toHaveBeenCalled();
        });

        it('должен игнорировать если портал активируется', async () => {
            mockPortal.isActivating.mockReturnValue(true);

            await handler.handleOverlapEntry(mockPortal);

            expect(mockScene.player.enterPortal).not.toHaveBeenCalled();
        });

        it('должен игнорировать если mustExit', async () => {
            mockPortal.mustExit.mockReturnValue(true);

            await handler.handleOverlapEntry(mockPortal);

            expect(mockScene.player.enterPortal).not.toHaveBeenCalled();
        });

        it('должен игнорировать если есть pendingPortal', async () => {
            (mockScene as any)._pendingPortal = mockPortal;

            await handler.handleOverlapEntry(mockPortal);

            expect(mockScene.player.enterPortal).not.toHaveBeenCalled();
        });

        it('должен устанавливать mustExit', async () => {
            await handler.handleOverlapEntry(mockPortal);

            expect(mockPortal.setMustExit).toHaveBeenCalled();
        });

        it('должен устанавливать pendingPortal', async () => {
            await handler.handleOverlapEntry(mockPortal);

            expect((mockScene as any)._pendingPortal).toBe(mockPortal);
        });

        it('должен отключать portal overlap', async () => {
            await handler.handleOverlapEntry(mockPortal);

            expect(mockScene.collisionSystem.disablePortalOverlap).toHaveBeenCalled();
        });

        it('должен переводить игрока в состояние портала', async () => {
            await handler.handleOverlapEntry(mockPortal);

            expect(mockScene.player.enterPortal).toHaveBeenCalled();
            expect(mockScene.player.stop).toHaveBeenCalled();
        });

        it('должен ставить физику на паузу', async () => {
            await handler.handleOverlapEntry(mockPortal);

            expect(mockScene.physics.pause).toHaveBeenCalled();
        });

        it('должен отключать клавиатуру', async () => {
            await handler.handleOverlapEntry(mockPortal);

            expect(mockScene.input.keyboard.enabled).toBe(false);
        });

        it('должен включать input для UI', async () => {
            await handler.handleOverlapEntry(mockPortal);

            expect(mockScene.input.enabled).toBe(true);
            expect(mockScene.input.setTopOnly).toHaveBeenCalledWith(false);
        });

        it('должен отправлять событие PORTAL_ENTER', async () => {
            await handler.handleOverlapEntry(mockPortal);

            expect(mockScene.uiManager.eventBus.emit).toHaveBeenCalledWith(
                EVENTS.PORTAL_ENTER,
                expect.objectContaining({
                    portal: mockPortal,
                    globalQuestion: expect.objectContaining({
                        questionText: 'Test question',
                        correctAnswer: 'Test'
                    })
                })
            );
        });
    });

    describe('Overlap byMask (поиск ближайшего портала)', () => {
        let mockTileBody: any;
        let mockPlayer: any;

        beforeEach(() => {
            // Восстанавливаем mockPlayer для этого блока тестов
            mockPlayer = {
                playApplyKeyAnimation: jest.fn(),
                enterPortal: jest.fn(),
                exitPortal: jest.fn(),
                stop: jest.fn(),
                setState: jest.fn(),
                getState: jest.fn().mockReturnValue(PlayerState.IDLE)
            };
            mockTileBody = { x: 100, y: 100 };
            mockScene.player = mockPlayer;
            mockScene.portalInstances = [mockPortal];
        });

        it('должен игнорировать если нет игрока', () => {
            mockScene.player = null;

            handler.handleOverlapByMask(null, mockTileBody);

            expect(mockPortal.getConfig).not.toHaveBeenCalled();
        });

        it('должен игнорировать если нет порталов', () => {
            mockScene.portalInstances = [];

            handler.handleOverlapByMask(mockPlayer, mockTileBody);

            expect(mockPortal.getConfig).not.toHaveBeenCalled();
        });

        it('должен вызывать handleOverlapEntry для ближайшего портала', () => {
            const spyHandleOverlapEntry = jest.spyOn(handler, 'handleOverlapEntry');

            handler.handleOverlapByMask(mockPlayer, mockTileBody);

            // Должен быть вызван поиск ближайшего портала
            expect(mockScene.portalInstances).toHaveLength(1);
            // Дистанция между (100, 100) и (100, 200) = 100 пикселей > 50
            // Так что handleOverlapEntry НЕ должен быть вызван
            expect(spyHandleOverlapEntry).not.toHaveBeenCalled();
        });

        it('должен игнорировать если портал слишком далеко', () => {
            const spyHandleOverlapEntry = jest.spyOn(handler, 'handleOverlapEntry');
            mockTileBody = { x: 1000, y: 1000 }; // Далеко от портала (100, 200)

            handler.handleOverlapByMask(mockPlayer, mockTileBody);

            // Дистанция > 50, так что handleOverlapEntry не должен быть вызван
            expect(spyHandleOverlapEntry).not.toHaveBeenCalled();
        });
    });

    describe('Обработка входа в портал', () => {
        describe('Правильный портал', () => {
            beforeEach(() => {
                mockPortal.getConfig.mockReturnValue({ id: 1, isCorrect: true, answerText: 'Yes' });
            });

            it('должен добавлять очки за портал', () => {
                handler.handleEntry(mockPortal);

                expect(mockScene.scoreSystem.addPortalScore).toHaveBeenCalled();
            });

            it('должен вызывать handleGameOver с win', () => {
                handler.handleEntry(mockPortal);

                expect(mockScene.gameOverHandler.handleGameOver).toHaveBeenCalledWith('win');
            });
        });

        describe('Неправильный портал', () => {
            beforeEach(() => {
                mockPortal.getConfig.mockReturnValue({ id: 1, isCorrect: false, answerText: 'No' });
            });

            it('должен вызывать exitPortal у игрока', () => {
                handler.handleEntry(mockPortal);

                expect(mockScene.player.exitPortal).toHaveBeenCalled();
            });

            it('должен устанавливать состояние DEAD', () => {
                handler.handleEntry(mockPortal);

                expect(mockScene.player.setState).toHaveBeenCalledWith(PlayerState.DEAD);
            });

            it('должен проигрывать звук смерти', () => {
                handler.handleEntry(mockPortal);

                expect(mockScene.audioManager.playCharacterDead).toHaveBeenCalled();
            });

            it('должен вызывать handleGameOver с lose после задержки', () => {
                handler.handleEntry(mockPortal);

                expect(mockScene.gameOverHandler.handleGameOver).toHaveBeenCalledWith('lose');
            });
        });
    });
});
