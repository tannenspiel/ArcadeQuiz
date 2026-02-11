/**
 * Unit тесты для GameOverHandler
 */

import { GameOverHandler } from '../../../../game/scenes/gameflow/GameOverHandler';
import { EventBus } from '../../../../game/EventBus';
import { EVENTS } from '../../../../constants/gameConstants';
import { GameOverType } from '../../../../game/ui/GameOverModal';

// Mock EventBus
jest.mock('../../../../game/EventBus', () => {
    const mockEventEmitter = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
    };
    return {
        EventBus: mockEventEmitter
    };
});

describe('GameOverHandler', () => {
    let mockDeps: any;
    let mockCleanupObjects: any;
    let mockCallbacks: any;
    let handler: GameOverHandler;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock dependencies
        mockDeps = {
            scene: {
                scene: {
                    restart: jest.fn(),
                    stop: jest.fn(),
                    start: jest.fn(),
                    isPaused: jest.fn().mockReturnValue(false),
                    resume: jest.fn()
                },
                sound: {
                    stopAll: jest.fn()
                }
            },
            player: {
                getSprite: jest.fn().mockReturnValue({}),
                setState: jest.fn(),
                getState: jest.fn().mockReturnValue('ALIVE'),
                reset: jest.fn()
            },
            audioManager: {
                stopMusic: jest.fn(),
                playCharacterDead: jest.fn(),
                playWinMusic: jest.fn(),
                playGameOverMusic: jest.fn(),
                destroy: jest.fn()
            },
            physics: {
                pause: jest.fn(),
                resume: jest.fn(),
                world: {
                    isPaused: false
                }
            },
            input: {
                enabled: true,
                keyboard: {
                    enabled: true,
                    resetKeys: jest.fn()
                }
            },
            time: {
                delayedCall: jest.fn((delay, callback) => {
                    // Создаём promise для callback и ждем его завершения
                    const promise = (async () => {
                        if (callback) await callback();
                    })();
                    return { destroy: jest.fn(), __promise: promise };
                })
            },
            game: {
                scene: {
                    start: jest.fn()
                }
            },
            scale: {
                on: jest.fn(),
                off: jest.fn()
            },
            levelManager: {
                getCurrentLevel: jest.fn().mockReturnValue(1),
                setCurrentLevel: jest.fn(),
                reset: jest.fn()
            },
            scoreSystem: {
                getScore: jest.fn().mockReturnValue(100),
                getMaxPossibleScore: jest.fn().mockReturnValue(200),
                getTotalMaxPossibleScore: jest.fn().mockReturnValue(400),
                reset: jest.fn()
            },
            healthSystem: {
                reset: jest.fn()
            },
            gameState: {
                setGameOver: jest.fn(),
                reset: jest.fn()
            },
            quizManager: {
                getTieredWinMessage: jest.fn().mockResolvedValue('Отличный результат!')
            }
        };

        // Mock cleanup objects
        mockCleanupObjects = {
            debugOverlay: {
                destroy: jest.fn()
            },
            globalQuestionText: null,
            globalQuestionImage: null,
            floatingTextPool: [],
            playerFlashGetKeySprites: [],
            enemyInstances: [],
            portalInstances: [],
            enemies: {
                clear: jest.fn()
            },
            chasers: {
                clear: jest.fn()
            },
            hearts: {
                clear: jest.fn()
            },
            keys: {
                clear: jest.fn()
            },
            portals: {
                clear: jest.fn()
            },
            oracle: {
                reset: jest.fn()
            },
            oracleLabel: {
                setText: jest.fn().mockReturnThis(),
                setColor: jest.fn().mockReturnThis()
            }
        };

        // Mock callbacks
        const mockRegistry = {
            set: jest.fn()
        };

        mockCallbacks = {
            getRegistry: jest.fn().mockReturnValue(mockRegistry),
            getAnsweredQuestions: jest.fn().mockReturnValue(new Set()),
            setAnsweredQuestions: jest.fn(),
            getAnsweredCoinStatements: jest.fn().mockReturnValue(new Set()), // ✅ Добавлено
            setAnsweredCoinStatements: jest.fn(), // ✅ Добавлено
            getIsOracleActivated: jest.fn().mockReturnValue(false),
            setIsOracleActivated: jest.fn(),
            getLastDepositTime: jest.fn().mockReturnValue(0),
            setLastDepositTime: jest.fn(),
            getPendingPortal: jest.fn().mockReturnValue(null),
            setPendingPortal: jest.fn(),
            getPortalModalCooldown: jest.fn().mockReturnValue(0),
            setPortalModalCooldown: jest.fn(),
            getCurrentGlobalQuestionData: jest.fn().mockReturnValue(null),
            setCurrentGlobalQuestionData: jest.fn(),
            getCurrentMiniQuizData: jest.fn().mockReturnValue(null),
            setCurrentMiniQuizData: jest.fn(),
            getLastEnemyCollisionTime: jest.fn().mockReturnValue(0),
            setLastEnemyCollisionTime: jest.fn(),
            getLastFullWarningTime: jest.fn().mockReturnValue(0),
            setLastFullWarningTime: jest.fn(),
            getTiledPortalsConfig: jest.fn().mockReturnValue([]),
            setTiledPortalsConfig: jest.fn(),
            getCurrentOverlapData: jest.fn().mockReturnValue(null),
            setCurrentOverlapData: jest.fn(),
            getTiledMapInfo: jest.fn().mockReturnValue(undefined),
            setTiledMapInfo: jest.fn(),
            getPlayerFlashLoseKeyInterval: jest.fn().mockReturnValue(null),
            setPlayerFlashLoseKeyInterval: jest.fn(),
            getPlayerFlashGetKeyInterval: jest.fn().mockReturnValue(null),
            setPlayerFlashGetKeyInterval: jest.fn(),
            getPlayerFlashGetKeyPositionTimer: jest.fn().mockReturnValue(null),
            setPlayerFlashGetKeyPositionTimer: jest.fn(),
            showGameWinModal: jest.fn(),
            getUiManager: jest.fn(),
            destroyDebugOverlay: jest.fn(),
            destroyGlobalQuestionObjects: jest.fn()
        };

        handler = new GameOverHandler(mockDeps, mockCleanupObjects, mockCallbacks);
    });

    describe('Инициализация', () => {
        it('должен создаваться с зависимостями', () => {
            expect(handler).toBeInstanceOf(GameOverHandler);
        });
    });

    describe('Обработка Game Over (поражение)', () => {
        it('должен устанавливать состояние DEAD игроку при поражении', () => {
            mockDeps.player.getState.mockReturnValue('ALIVE');
            handler.handleGameOver('lose');

            expect(mockDeps.player.setState).toHaveBeenCalledWith('dead');
            expect(mockDeps.audioManager.playCharacterDead).toHaveBeenCalled();
        });

        it('не должен устанавливать dead если игрок уже мёртв', () => {
            mockDeps.player.getState.mockReturnValue('dead');
            handler.handleGameOver('lose');

            expect(mockDeps.player.setState).not.toHaveBeenCalled();
        });

        it('должен останавливать музыку и физику при поражении', () => {
            handler.handleGameOver('lose');

            expect(mockDeps.audioManager.stopMusic).toHaveBeenCalled();
            expect(mockDeps.physics.pause).toHaveBeenCalled();
            expect(mockDeps.input.keyboard.enabled).toBe(false);
        });

        it('должен проигрывать музыку Game Over', () => {
            handler.handleGameOver('lose');

            expect(mockDeps.audioManager.playGameOverMusic).toHaveBeenCalled();
        });

        it('должен устанавливать состояние gameOver в gameState', () => {
            handler.handleGameOver('lose');

            expect(mockDeps.gameState.setGameOver).toHaveBeenCalledWith('lose');
        });

        it('должен отправлять событие GAME_OVER', () => {
            handler.handleGameOver('lose');

            expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.GAME_OVER, {
                result: 'lose',
                score: 100,
                feedbackText: ''
            });
        });
    });

    describe('Обработка победы на уровне', () => {
        beforeEach(() => {
            mockDeps.levelManager.getCurrentLevel.mockReturnValue(1);
        });

        it('должен проигрывать музыку победы', () => {
            handler.handleGameOver('win');

            expect(mockDeps.audioManager.playWinMusic).toHaveBeenCalled();
        });

        it('должен отправлять событие GAME_OVER для победы на уровне', async () => {
            handler.handleGameOver('win');
            // Ждём завершения async callback из delayedCall
            const timer = mockDeps.time.delayedCall.mock.results[0].value;
            await timer.__promise;

            expect(EventBus.emit).toHaveBeenCalledWith(EVENTS.GAME_OVER, {
                result: 'win',
                score: 100,
                feedbackText: expect.any(String)
            });
        });

        it('должен получать tiered win message', async () => {
            handler.handleGameOver('win');
            const timer = mockDeps.time.delayedCall.mock.results[0].value;
            await timer.__promise;

            expect(mockDeps.quizManager.getTieredWinMessage).toHaveBeenCalledWith(
                1,
                expect.any(Number), // percentage
                'level'
            );
        });
    });

    describe('Обработка победы в игре', () => {
        beforeEach(() => {
            mockDeps.levelManager.getCurrentLevel.mockReturnValue(3); // MAX_LEVELS
        });

        it('должен показывать модальное окно победы', async () => {
            handler.handleGameOver('win');
            const timer = mockDeps.time.delayedCall.mock.results[0].value;
            await timer.__promise;

            expect(mockCallbacks.showGameWinModal).toHaveBeenCalledWith(
                100,
                expect.any(String),
                expect.any(Function)
            );
        });

        it('должен использовать getTotalMaxPossibleScore для победы в игре', async () => {
            handler.handleGameOver('win');
            const timer = mockDeps.time.delayedCall.mock.results[0].value;
            await timer.__promise;

            expect(mockDeps.scoreSystem.getTotalMaxPossibleScore).toHaveBeenCalled();
        });
    });

    describe('Показ победного экрана', () => {
        it('должен вызывать showGameWinModal с правильными параметрами', () => {
            handler.handleGameWin(150, 'Превосходно!');

            expect(mockCallbacks.showGameWinModal).toHaveBeenCalledWith(
                150,
                'Превосходно!',
                expect.any(Function)
            );
        });
    });

    describe('Полный рестарт игры', () => {
        it('должен устанавливать уровень 1', () => {
            handler.handleFullGameRestart();

            expect(mockDeps.levelManager.setCurrentLevel).toHaveBeenCalledWith(1);
        });

        it('должен сохранять уровень и счёт в registry', () => {
            const mockRegistry = mockCallbacks.getRegistry();
            handler.handleFullGameRestart();

            expect(mockRegistry.set).toHaveBeenCalledWith('currentLevel', 1);
            expect(mockRegistry.set).toHaveBeenCalledWith('score', 0);
        });

        it('должен вызывать restartGame с resetLevel=true', () => {
            const restartSpy = jest.spyOn(handler as any, 'restartGame');
            handler.handleFullGameRestart();

            expect(restartSpy).toHaveBeenCalledWith(true);
        });
    });

    describe('Рестарт сцены', () => {
        it('должен вызывать restartGame с resetLevel=false', () => {
            const restartSpy = jest.spyOn(handler as any, 'restartGame');
            handler.restartScene();

            expect(restartSpy).toHaveBeenCalledWith(false);
        });
    });

    describe('Рестарт игры', () => {
        it('должен останавливать аудио', () => {
            (handler as any).restartGame(true);

            expect(mockDeps.audioManager.stopMusic).toHaveBeenCalled();
            expect(mockDeps.audioManager.destroy).toHaveBeenCalled();
            expect(mockDeps.scene.sound.stopAll).toHaveBeenCalled();
        });

        it('должен сбрасывать системы при resetLevel=true', () => {
            (handler as any).restartGame(true);

            expect(mockDeps.healthSystem.reset).toHaveBeenCalled();
            expect(mockDeps.scoreSystem.reset).toHaveBeenCalled();
            expect(mockDeps.gameState.reset).toHaveBeenCalled();
            expect(mockDeps.levelManager.reset).toHaveBeenCalled();
            expect(mockDeps.player.reset).toHaveBeenCalled();
        });

        it('не должен сбрасывать score и level при resetLevel=false', () => {
            (handler as any).restartGame(false);

            expect(mockDeps.scoreSystem.reset).not.toHaveBeenCalled();
            expect(mockDeps.levelManager.reset).not.toHaveBeenCalled();
        });

        it('должен очищать game state callbacks', () => {
            (handler as any).restartGame(true);

            expect(mockCallbacks.setAnsweredQuestions).toHaveBeenCalledWith(new Set());
            expect(mockCallbacks.setIsOracleActivated).toHaveBeenCalledWith(false);
            expect(mockCallbacks.setLastDepositTime).toHaveBeenCalledWith(0);
        });

        it('должен очищать группы физики', () => {
            (handler as any).restartGame(true);

            expect(mockCleanupObjects.enemies.clear).toHaveBeenCalledWith(true, true);
            expect(mockCleanupObjects.chasers.clear).toHaveBeenCalledWith(true, true);
            expect(mockCleanupObjects.hearts.clear).toHaveBeenCalledWith(true, true);
            expect(mockCleanupObjects.keys.clear).toHaveBeenCalledWith(true, true);
        });

        it('должен сбрасывать оракул', () => {
            (handler as any).restartGame(true);

            expect(mockCleanupObjects.oracle.reset).toHaveBeenCalled();
            // ❌ ОТКЛЮЧЕНО: oracleLabel больше не используется
            // expect(mockCleanupObjects.oracleLabel.setText).toHaveBeenCalledWith('ORACLE (0/3)');
            // expect(mockCleanupObjects.oracleLabel.setColor).toHaveBeenCalledWith('#ff0066');
        });

        it('должен возобновлять физику перед рестартом', () => {
            mockDeps.physics.world.isPaused = true;
            (handler as any).restartGame(true);

            expect(mockDeps.physics.resume).toHaveBeenCalled();
        });

        it('должен включать input перед рестартом', () => {
            mockDeps.input.enabled = false;
            (handler as any).restartGame(true);

            expect(mockDeps.input.enabled).toBe(true);
            expect(mockDeps.input.keyboard.enabled).toBe(true);
        });

        it('должен перезапускать сцену', () => {
            (handler as any).restartGame(true);

            expect(mockDeps.scene.scene.restart).toHaveBeenCalled();
        });
    });

    describe('Cleanup объектов', () => {
        it('должен уничтожать debug overlay', () => {
            mockCleanupObjects.debugOverlay = { destroy: jest.fn() };
            (handler as any).restartGame(true);

            expect(mockCleanupObjects.debugOverlay.destroy).toHaveBeenCalled();
        });

        it('должен очищать floating text pool', () => {
            const mockText1 = { destroy: jest.fn() };
            const mockText2 = { destroy: jest.fn() };
            mockCleanupObjects.floatingTextPool = [mockText1, mockText2];

            (handler as any).restartGame(true);

            expect(mockText1.destroy).toHaveBeenCalled();
            expect(mockText2.destroy).toHaveBeenCalled();
            expect(mockCleanupObjects.floatingTextPool).toEqual([]);
        });

        it('должен уничтожать enemy instances', () => {
            const mockEnemy1 = { destroy: jest.fn() };
            const mockEnemy2 = { destroy: jest.fn() };
            mockCleanupObjects.enemyInstances = [mockEnemy1, mockEnemy2];

            (handler as any).restartGame(true);

            expect(mockEnemy1.destroy).toHaveBeenCalled();
            expect(mockEnemy2.destroy).toHaveBeenCalled();
            expect(mockCleanupObjects.enemyInstances).toEqual([]);
        });

        it('должен уничтожать portal instances', () => {
            const mockPortal1 = { destroy: jest.fn() };
            const mockPortal2 = { destroy: jest.fn() };
            mockCleanupObjects.portalInstances = [mockPortal1, mockPortal2];

            (handler as any).restartGame(true);

            expect(mockPortal1.destroy).toHaveBeenCalled();
            expect(mockPortal2.destroy).toHaveBeenCalled();
            expect(mockCleanupObjects.portalInstances).toEqual([]);
        });
    });

    describe('Cleanup таймеров', () => {
        it('должен очищать flash таймеры', () => {
            const mockTimer1 = { destroy: jest.fn() };
            const mockTimer2 = { destroy: jest.fn() };
            const mockTimer3 = { destroy: jest.fn() };

            mockCallbacks.getPlayerFlashLoseKeyInterval.mockReturnValue(mockTimer1);
            mockCallbacks.getPlayerFlashGetKeyInterval.mockReturnValue(mockTimer2);
            mockCallbacks.getPlayerFlashGetKeyPositionTimer.mockReturnValue(mockTimer3);

            (handler as any).restartGame(true);

            expect(mockTimer1.destroy).toHaveBeenCalled();
            expect(mockTimer2.destroy).toHaveBeenCalled();
            expect(mockTimer3.destroy).toHaveBeenCalled();

            expect(mockCallbacks.setPlayerFlashLoseKeyInterval).toHaveBeenCalledWith(null);
            expect(mockCallbacks.setPlayerFlashGetKeyInterval).toHaveBeenCalledWith(null);
            expect(mockCallbacks.setPlayerFlashGetKeyPositionTimer).toHaveBeenCalledWith(null);
        });
    });

    describe('Сброс состояния Tiled Map', () => {
        it('должен очищать состояние Tiled Map', () => {
            (handler as any).restartGame(true);

            expect(mockCallbacks.setTiledPortalsConfig).toHaveBeenCalledWith([]);
            expect(mockCallbacks.setCurrentOverlapData).toHaveBeenCalledWith(null);
            expect(mockCallbacks.setTiledMapInfo).toHaveBeenCalledWith(undefined);
        });
    });
});
