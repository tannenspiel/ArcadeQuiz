/**
 * Unit тесты для ItemCollisionHandler
 */

import { ItemCollisionHandler } from '../../../../game/scenes/collision/ItemCollisionHandler';
import { PlayerState } from '../../../../game/entities/Player';
import { EVENTS, GamePhase } from '../../../../constants/gameConstants';

// Mock EventBus for the scene
jest.mock('../../../../game/EventBus', () => ({
    EventBus: {
        emit: jest.fn()
    }
}));

describe('ItemCollisionHandler', () => {
    let handler: ItemCollisionHandler;
    let mockScene: any;
    let mockHeart: any;
    let mockKey: any;
    let mockGameState: any;  // ⚠️ Вынесен на уровень describe для доступа в новых тестах

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock heart
        mockHeart = {
            active: true,
            destroy: jest.fn()
        };

        // Mock key
        mockKey = {
            active: true,
            x: 100,
            y: 200,
            getData: jest.fn().mockReturnValue(null),
            lastTouchTime: 0
        };

        // Mock scene dependencies
        const mockHealthSystem = {
            getHealth: jest.fn().mockReturnValue(2),
            addHealth: jest.fn()
        };

        const mockAudioManager = {
            playPickupLife: jest.fn(),
            playPickupKey: jest.fn()
        };

        const mockCollisionSystem = {
            clearProcessingKey: jest.fn()
        };

        // ⚠️ UPDATED: Используем переменную на уровне describe
        mockGameState = {
            getKeys: jest.fn().mockReturnValue(0),
            getState: jest.fn().mockReturnValue({ maxKeys: 3 }),
            addKey: jest.fn(),
            // ⚠️ NEW: 2026-01-31 - Добавлены методы для quiz state и game phase
            getGamePhase: jest.fn().mockReturnValue(GamePhase.KEY),
            isQuizActive: jest.fn().mockReturnValue(false),
            setQuizActive: jest.fn(),
            getCoins: jest.fn().mockReturnValue(0),
            getMaxCoins: jest.fn().mockReturnValue(3)
        };

        const mockPlayer = {
            getState: jest.fn().mockReturnValue(PlayerState.IDLE),
            enterQuiz: jest.fn(),
            stop: jest.fn(),
            getX: jest.fn().mockReturnValue(100),
            getY: jest.fn().mockReturnValue(200)
        };

        const mockLevelManager = {
            getCurrentLevel: jest.fn().mockReturnValue(1)
        };

        const mockQuizManager = {
            getRandomMiniQuiz: jest.fn().mockResolvedValue({
                questionText: 'Test question',
                correctAnswer: 'Correct',
                wrongAnswers: ['Wrong1', 'Wrong2']
            })
        };

        const mockEffectsManager = {
            showFloatingText: jest.fn()
        };

        const mockKeyQuizHandler = {
            setCurrentKey: jest.fn()
        };

        const mockUIManager = {
            eventBus: {
                emit: jest.fn()
            }
        };

        // Mock scene
        mockScene = {
            sys: {
                settings: {
                    active: true
                }
            },
            time: {
                now: 1000
            },
            physics: {
                pause: jest.fn()
            },
            input: {
                keyboard: {
                    enabled: true,
                    resetKeys: jest.fn()
                },
                enabled: true,
                setTopOnly: jest.fn()
            },
            data: {
                set: jest.fn()
            }
        };

        // Add scene properties via getters
        Object.defineProperty(mockScene, 'healthSystem', {
            get: jest.fn().mockReturnValue(mockHealthSystem),
            configurable: true
        });
        Object.defineProperty(mockScene, 'audioManager', {
            get: jest.fn().mockReturnValue(mockAudioManager),
            configurable: true
        });
        Object.defineProperty(mockScene, 'collisionSystem', {
            get: jest.fn().mockReturnValue(mockCollisionSystem),
            configurable: true
        });
        Object.defineProperty(mockScene, 'gameState', {
            get: jest.fn().mockReturnValue(mockGameState),
            configurable: true
        });
        Object.defineProperty(mockScene, 'player', {
            get: jest.fn().mockReturnValue(mockPlayer),
            configurable: true
        });
        Object.defineProperty(mockScene, 'levelManager', {
            get: jest.fn().mockReturnValue(mockLevelManager),
            configurable: true
        });
        Object.defineProperty(mockScene, 'quizManager', {
            get: jest.fn().mockReturnValue(mockQuizManager),
            configurable: true
        });
        Object.defineProperty(mockScene, 'effectsManager', {
            get: jest.fn().mockReturnValue(mockEffectsManager),
            configurable: true
        });
        Object.defineProperty(mockScene, 'keyQuizHandler', {
            get: jest.fn().mockReturnValue(mockKeyQuizHandler),
            configurable: true
        });
        Object.defineProperty(mockScene, 'uiManager', {
            get: jest.fn().mockReturnValue(mockUIManager),
            configurable: true
        });
        Object.defineProperty(mockScene, 'lastFullWarningTime', {
            get: jest.fn(() => (mockScene as any)._lastFullWarningTime || 0),
            set: jest.fn(function(value) { (mockScene as any)._lastFullWarningTime = value; }),
            configurable: true
        });
        (mockScene as any)._lastFullWarningTime = 0;
        Object.defineProperty(mockScene, 'updateHUD', {
            value: jest.fn(),
            writable: true,
            configurable: true
        });

        handler = new ItemCollisionHandler(mockScene);
    });

    describe('Подбор сердечка (handleHeart)', () => {
        it('должен игнорировать если сцена неактивна', () => {
            mockScene.sys.settings.active = false;

            handler.handleHeart(mockHeart);

            expect(mockHeart.destroy).not.toHaveBeenCalled();
        });

        it('должен добавлять здоровье если HP меньше MAX_HEALTH', () => {
            mockScene.healthSystem.getHealth.mockReturnValue(2);

            handler.handleHeart(mockHeart);

            expect(mockScene.healthSystem.addHealth).toHaveBeenCalledWith(1);
        });

        it('должен уничтожать сердечко после подбора', () => {
            handler.handleHeart(mockHeart);

            expect(mockHeart.destroy).toHaveBeenCalled();
        });

        it('должен проигрывать звук подбора жизни', () => {
            handler.handleHeart(mockHeart);

            expect(mockScene.audioManager.playPickupLife).toHaveBeenCalled();
        });

        it('должен обновлять HUD', () => {
            handler.handleHeart(mockHeart);

            expect(mockScene.updateHUD).toHaveBeenCalled();
        });

        it('НЕ должен добавлять здоровье если HP = MAX_HEALTH', () => {
            mockScene.healthSystem.getHealth.mockReturnValue(3);

            handler.handleHeart(mockHeart);

            expect(mockScene.healthSystem.addHealth).not.toHaveBeenCalled();
            expect(mockHeart.destroy).not.toHaveBeenCalled();
        });

        it('НЕ должен подбирать неактивное сердечко', () => {
            mockHeart.active = false;

            handler.handleHeart(mockHeart);

            expect(mockScene.healthSystem.addHealth).not.toHaveBeenCalled();
            expect(mockHeart.destroy).not.toHaveBeenCalled();
        });
    });

    describe('Подбор ключа (handleKey)', () => {
        it('должен игнорировать если сцена неактивна', async () => {
            mockScene.sys.settings.active = false;

            await handler.handleKey(mockKey);

            expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
        });

        it('должен игнорировать если ключ неактивен', async () => {
            mockKey.active = false;

            await handler.handleKey(mockKey);

            expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
        });

        it('должен игнорировать если ключ отсутствует', async () => {
            await handler.handleKey(null as any);

            expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
        });

        describe('Debounce ключа', () => {
            it('должен игнорировать повторные коллизии в течение 500ms', async () => {
                mockKey.lastTouchTime = 900; // 100ms назад
                mockScene.time.now = 1000;

                await handler.handleKey(mockKey);

                expect(mockScene.collisionSystem.clearProcessingKey).toHaveBeenCalled();
                expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
            });

            it('должен разрешать коллизию после 500ms', async () => {
                mockKey.lastTouchTime = 400; // 600ms назад
                mockScene.time.now = 1000;

                await handler.handleKey(mockKey);

                expect(mockScene.audioManager.playPickupKey).toHaveBeenCalled();
            });

            it('должен сохранять время последнего касания', async () => {
                await handler.handleKey(mockKey);

                expect((mockKey as any).lastTouchTime).toBe(1000);
            });
        });

        describe('Лимит максимального количества ключей', () => {
            beforeEach(() => {
                mockScene.gameState.getKeys.mockReturnValue(3); // maxKeys = 3
                mockScene.lastFullWarningTime = 0;
            });

            it('должен показывать "BAG FULL!" при заполненном инвентаре', async () => {
                mockScene.time.now = 2000; // > 1000 с последнего предупреждения

                await handler.handleKey(mockKey);

                expect(mockScene.effectsManager.showFloatingText).toHaveBeenCalledWith(
                    100,
                    150, // player.getY() - 50
                    'BAG FULL!',
                    0xff9900
                );
            });

            it('должен обновлять lastFullWarningTime', async () => {
                mockScene.time.now = 2000;

                await handler.handleKey(mockKey);

                expect(mockScene.lastFullWarningTime).toBe(2000);
            });

            it('должен очищать processing key', async () => {
                await handler.handleKey(mockKey);

                expect(mockScene.collisionSystem.clearProcessingKey).toHaveBeenCalled();
            });

            it('НЕ должен показывать предупреждение чаще чем раз в секунду', async () => {
                mockScene.time.now = 1500; // < 1000 с последнего предупреждения
                (mockScene as any)._lastFullWarningTime = 1000; // Было 500мс назад

                await handler.handleKey(mockKey);

                expect(mockScene.effectsManager.showFloatingText).not.toHaveBeenCalled();
            });

            it('НЕ должен проигрывать звук подбора при полном инвентаре', async () => {
                await handler.handleKey(mockKey);

                expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
            });
        });

        describe('Проверка состояния игрока', () => {
            it('должен игнорировать если игрок в состоянии LOSING_KEY', async () => {
                mockScene.player.getState.mockReturnValue(PlayerState.LOSING_KEY);

                await handler.handleKey(mockKey);

                expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
                expect(mockScene.collisionSystem.clearProcessingKey).toHaveBeenCalled();
            });
        });

        describe('Успешный подбор ключа', () => {
            beforeEach(() => {
                mockScene.gameState.getKeys.mockReturnValue(1); // < maxKeys (3)
            });

            it('должен проигрывать звук подбора ключа', async () => {
                await handler.handleKey(mockKey);

                expect(mockScene.audioManager.playPickupKey).toHaveBeenCalled();
            });

            it('должен переводить игрока в состояние викторины', async () => {
                await handler.handleKey(mockKey);

                expect(mockScene.player.enterQuiz).toHaveBeenCalled();
            });

            it('должен останавливать игрока', async () => {
                await handler.handleKey(mockKey);

                expect(mockScene.player.stop).toHaveBeenCalled();
            });

            it('должен ставить физику на паузу', async () => {
                await handler.handleKey(mockKey);

                expect(mockScene.physics.pause).toHaveBeenCalled();
            });

            it('должен отключать клавиатуру', async () => {
                await handler.handleKey(mockKey);

                expect(mockScene.input.keyboard.enabled).toBe(false);
                expect(mockScene.input.keyboard.resetKeys).toHaveBeenCalled();
            });

            it('должен включать input для UI', async () => {
                await handler.handleKey(mockKey);

                expect(mockScene.input.enabled).toBe(true);
                expect(mockScene.input.setTopOnly).toHaveBeenCalledWith(false);
            });

            it('должен сохранять ссылку на ключ', async () => {
                await handler.handleKey(mockKey);

                expect((mockScene as any).currentKeySprite).toBe(mockKey);
                expect((mockScene as any).currentKeyId).toBe('key-100-200');
            });

            it('должен устанавливать ключ в KeyQuizHandler', async () => {
                await handler.handleKey(mockKey);

                expect(mockScene.keyQuizHandler.setCurrentKey).toHaveBeenCalledWith(mockKey, 'key-100-200');
            });

            it('должен сохранять текущий уровень в data', async () => {
                await handler.handleKey(mockKey);

                expect(mockScene.data.set).toHaveBeenCalledWith('currentLevel', 1);
            });
        });

        describe('Загрузка вопроса', () => {
            beforeEach(() => {
                mockScene.gameState.getKeys.mockReturnValue(1);
            });

            it('должен использовать предзаполненные данные вопроса если есть', async () => {
                const questionData = { questionText: 'Pre-assigned question' };
                mockKey.getData.mockReturnValue(questionData);

                await handler.handleKey(mockKey);

                expect((mockScene as any).currentMiniQuizData).toBe(questionData);
                expect(mockScene.quizManager.getRandomMiniQuiz).not.toHaveBeenCalled();
            });

            it('должен загружать случайный вопрос если нет предзаполненных', async () => {
                mockKey.getData.mockReturnValue(null);

                await handler.handleKey(mockKey);

                expect(mockScene.quizManager.getRandomMiniQuiz).toHaveBeenCalledWith(1);
            });

            it('должен отправлять событие SHOW_KEY_QUIZ через UIManager', async () => {
                await handler.handleKey(mockKey);

                expect(mockScene.uiManager.eventBus.emit).toHaveBeenCalledWith(
                    EVENTS.SHOW_KEY_QUIZ,
                    {
                        question: expect.objectContaining({
                            questionText: expect.any(String)
                        })
                    }
                );
            });

            describe('Fallback при ошибке загрузки', () => {
                it('должен использовать fallback вопрос при ошибке загрузки', async () => {
                    mockScene.quizManager.getRandomMiniQuiz.mockRejectedValue(new Error('Load failed'));

                    await handler.handleKey(mockKey);

                    expect(mockScene.uiManager.eventBus.emit).toHaveBeenCalledWith(
                        EVENTS.SHOW_KEY_QUIZ,
                        {
                            question: expect.objectContaining({
                                questionText: expect.any(String)
                            })
                        }
                    );
                });
            });
        });
    });

    // ⚠️ NEW: 2026-01-31 - Добавлены тесты для монеток (COIN Phase)
    describe('Подбор монетки (handleCoinPhase)', () => {
        let mockCoin: any;
        let originalDateNow: () => number;

        beforeEach(() => {
            // Mock coin
            mockCoin = {
                active: true,
                x: 100,
                y: 200,
                lastTouchTime: 0
            };

            // Устанавливаем COIN фазу - переопределяем mock значения
            mockGameState.getGamePhase.mockReturnValue(GamePhase.COIN);
            mockGameState.getCoins.mockReturnValue(0);
            mockGameState.getMaxCoins.mockReturnValue(3);
            mockGameState.isQuizActive.mockReturnValue(false);

            // Добавляем mock для playPickupCoin если он есть
            mockScene.audioManager.playPickupCoin = jest.fn();

            // Mock Date.now() для предсказуемого lastFullWarningTime
            originalDateNow = Date.now;
            Date.now = jest.fn(() => mockScene.time.now) as any;
        });

        afterEach(() => {
            // Восстанавливаем Date.now()
            Date.now = originalDateNow;
        });

        it('должен игнорировать если сцена неактивна', async () => {
            mockScene.sys.settings.active = false;

            await handler.handleKey(mockCoin);

            expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
        });

        it('должен игнорировать если викторина уже активна', async () => {
            mockGameState.isQuizActive.mockReturnValue(true);

            await handler.handleKey(mockCoin);

            expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
            expect(mockScene.collisionSystem.clearProcessingKey).toHaveBeenCalled();
        });

        it('должен игнорировать если монетка неактивна', async () => {
            mockCoin.active = false;

            await handler.handleKey(mockCoin);

            expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
        });

        it('должен игнорировать если монетка отсутствует', async () => {
            await handler.handleKey(null as any);

            expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
        });

        describe('Debounce монетки', () => {
            beforeEach(() => {
                // Сбрасываем lastTouchTime перед каждым тестом
                mockCoin.lastTouchTime = 0;
            });

            it('должен игнорировать повторные коллизии в течение 500ms', async () => {
                mockCoin.lastTouchTime = 900; // 100ms назад
                mockScene.time.now = 1000;

                await handler.handleKey(mockCoin);

                expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
            });

            it('должен разрешать коллизию после 500ms', async () => {
                mockCoin.lastTouchTime = 400; // 600ms назад
                mockScene.time.now = 1000;

                await handler.handleKey(mockCoin);

                // ⚠️ Проверяем playPickupCoin т.к. мы его замокали
                // Код использует: playPickupCoin ? playPickupCoin() : playPickupKey()
                expect(mockScene.audioManager.playPickupCoin).toHaveBeenCalled();
            });

            it('должен сохранять время последнего касания', async () => {
                await handler.handleKey(mockCoin);

                expect(mockCoin.lastTouchTime).toBe(1000);
            });
        });

        describe('Лимит максимального количества монеток', () => {
            beforeEach(() => {
                mockGameState.getCoins.mockReturnValue(3); // maxCoins = 3
                (mockScene as any).lastFullWarningTime = 0;
            });

            it('должен показывать "COINS FULL!" при заполненном инвентаре', async () => {
                mockScene.time.now = 2000; // > 1000 с последнего предупреждения

                await handler.handleKey(mockCoin);

                expect(mockScene.effectsManager.showFloatingText).toHaveBeenCalledWith(
                    100,
                    150, // player.getY() - 50
                    'COINS FULL!',
                    0xff9900
                );
            });

            it('должен обновлять lastFullWarningTime', async () => {
                mockScene.time.now = 2000;

                await handler.handleKey(mockCoin);

                expect((mockScene as any).lastFullWarningTime).toBe(2000);
            });

            it('НЕ должен показывать предупреждение чаще чем раз в секунду', async () => {
                mockScene.time.now = 1500; // < 1000 с последнего предупреждения
                (mockScene as any)._lastFullWarningTime = 1000;

                await handler.handleKey(mockCoin);

                expect(mockScene.effectsManager.showFloatingText).not.toHaveBeenCalled();
            });

            it('НЕ должен проигрывать звук подбора при полном инвентаре', async () => {
                await handler.handleKey(mockCoin);

                expect(mockScene.audioManager.playPickupKey).not.toHaveBeenCalled();
            });
        });

        describe('Успешный подбор монетки', () => {
            beforeEach(() => {
                mockGameState.getCoins.mockReturnValue(1); // < maxCoins (3)
                mockCoin.lastTouchTime = 0; // Сбрасываем для debounce
                mockCoin.active = true; // Убеждаемся что монетка активна
            });

            it('должен устанавливать quiz state', async () => {
                await handler.handleKey(mockCoin);

                expect(mockGameState.setQuizActive).toHaveBeenCalledWith(true, 'coin');
            });

            it('должен проигрывать звук подбора монетки', async () => {
                await handler.handleKey(mockCoin);

                // ⚠️ Проверяем playPickupCoin т.к. мы его замокали
                // Код использует: playPickupCoin ? playPickupCoin() : playPickupKey()
                expect(mockScene.audioManager.playPickupCoin).toHaveBeenCalled();
            });

            it('должен переводить игрока в состояние викторины', async () => {
                await handler.handleKey(mockCoin);

                expect(mockScene.player.enterQuiz).toHaveBeenCalled();
            });

            it('должен останавливать игрока', async () => {
                await handler.handleKey(mockCoin);

                expect(mockScene.player.stop).toHaveBeenCalled();
            });

            it('должен ставить физику на паузу', async () => {
                await handler.handleKey(mockCoin);

                expect(mockScene.physics.pause).toHaveBeenCalled();
            });

            it('должен отключать клавиатуру', async () => {
                await handler.handleKey(mockCoin);

                expect(mockScene.input.keyboard.enabled).toBe(false);
                expect(mockScene.input.keyboard.resetKeys).toHaveBeenCalled();
            });

            it('должен включать input для UI', async () => {
                await handler.handleKey(mockCoin);

                expect(mockScene.input.enabled).toBe(true);
                expect(mockScene.input.setTopOnly).toHaveBeenCalledWith(false);
            });

            it('должен устанавливать монетку в CoinQuizHandler', async () => {
                const mockCoinQuizHandler = {
                    setCurrentCoin: jest.fn()
                };
                Object.defineProperty(mockScene, 'coinQuizHandler', {
                    get: jest.fn().mockReturnValue(mockCoinQuizHandler),
                    configurable: true
                });

                await handler.handleKey(mockCoin);

                expect(mockCoinQuizHandler.setCurrentCoin).toHaveBeenCalledWith(mockCoin);
            });

            it('должен отправлять событие SHOW_COIN_QUIZ через UIManager', async () => {
                await handler.handleKey(mockCoin);

                expect(mockScene.uiManager.eventBus.emit).toHaveBeenCalledWith(
                    EVENTS.SHOW_COIN_QUIZ,
                    { coinSprite: mockCoin }
                );
            });
        });
    });
});
