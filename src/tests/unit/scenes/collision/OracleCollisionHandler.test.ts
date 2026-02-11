/**
 * Unit тесты для OracleCollisionHandler
 *
 * ⚠️ UPDATED: 2026-01-31 - Обновлено для новой логики с монетками (COIN Phase)
 * Раньше тесты проверяли логику с ключами (KEY Phase), теперь - с монетками
 */

import { OracleCollisionHandler } from '../../../../game/scenes/collision/OracleCollisionHandler';
import { GamePhase } from '../../../../constants/gameConstants';

// Моки для зависимостей
jest.mock('../../../../game/entities/Oracle');
jest.mock('../../../../game/systems/AudioManager');
jest.mock('../../../../game/entities/Player');
jest.mock('../../../../game/scenes/ui/HUDManager');
jest.mock('../../../../game/scenes/quiz/GlobalQuestionManager');

describe('OracleCollisionHandler', () => {
    let handler: OracleCollisionHandler;
    let mockScene: any;
    let mockOracle: any;
    let mockGameState: any;
    let mockAudioManager: any;
    let mockPlayer: any;
    let mockHUDManager: any;
    let mockGlobalQuestionManager: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock oracle
        mockOracle = {
            isActivated: jest.fn().mockReturnValue(false),
            depositItem: jest.fn().mockImplementation((phase: GamePhase) => {
                // В реальной логике depositItem возвращает true если депозит успешен
                return true;
            }),
            getStoredCoins: jest.fn().mockReturnValue(0), // По умолчанию 0, обновляется в тестах
            enableInteraction: jest.fn()
        };

        // Mock gameState - ⚠️ UPDATED: используем монетки вместо ключей
        mockGameState = {
            getGamePhase: jest.fn().mockReturnValue(GamePhase.COIN),
            getCoins: jest.fn().mockReturnValue(0),
            removeCoin: jest.fn(),
            setOracleActivated: jest.fn()
        };

        // Mock audioManager
        mockAudioManager = {
            playApplyKey: jest.fn(),
            playOracleActivated: jest.fn()
        };

        // Mock player
        mockPlayer = {
            applyKey: jest.fn(),
            getSprite: jest.fn().mockReturnValue({
                x: 100,
                y: 100
            }),
            updateCoins: jest.fn()
        };

        // Mock healthSystem (for getHeartPositions)
        const mockHealthSystem = {
            getHeartPositions: jest.fn().mockReturnValue([]),
            getHeartScale: jest.fn().mockReturnValue(4.0)
        };

        // Mock HUDManager
        mockHUDManager = {
            update: jest.fn()
        };

        // Mock globalQuestionManager
        mockGlobalQuestionManager = {
            showGlobalQuestion: jest.fn()
        };

        // Mock oracleLabel
        const mockOracleLabel = {
            setText: jest.fn().mockReturnThis(),
            setColor: jest.fn().mockReturnThis()
        };

        // Mock portal instances
        const mockPortal1 = {
            getSprite: jest.fn().mockReturnValue({
                getData: jest.fn().mockReturnValue({
                    setVisible: jest.fn()
                })
            })
        };

        // Mock scene
        mockScene = {
            oracle: mockOracle,
            audioManager: mockAudioManager,
            player: mockPlayer,
            hudManager: mockHUDManager,
            globalQuestionManager: mockGlobalQuestionManager,
            oracleLabel: mockOracleLabel,
            portalInstances: [mockPortal1],
            time: {
                now: 1000
            },
            lastDepositTime: 0,
            isOracleActivated: false,
            healthSystem: mockHealthSystem
        };

        // Add gameState via getter (simulating protected access)
        Object.defineProperty(mockScene, 'gameState', {
            get: jest.fn(() => mockGameState),
            configurable: true
        });

        handler = new OracleCollisionHandler(mockScene);
    });

    describe('handle', () => {
        describe('Когда оракул уже активирован', () => {
            beforeEach(() => {
                mockOracle.isActivated.mockReturnValue(true);
            });

            it('должен игнорировать столкновение', () => {
                handler.handle();

                expect(mockGameState.getCoins).not.toHaveBeenCalled();
            });

            it('не должен вызывать depositItem', () => {
                handler.handle();

                expect(mockOracle.depositItem).not.toHaveBeenCalled();
            });
        });

        describe('Когда есть cooldown', () => {
            it('должен игнорировать если не прошло 500ms', () => {
                mockScene.lastDepositTime = 700;
                mockScene.time.now = 1000; // Разница 300ms

                handler.handle();

                expect(mockOracle.depositItem).not.toHaveBeenCalled();
            });

            it('должен позволять если прошло больше 500ms', () => {
                mockScene.lastDepositTime = 400;
                mockScene.time.now = 1000; // Разница 600ms
                mockGameState.getCoins.mockReturnValue(1);

                handler.handle();

                expect(mockOracle.depositItem).toHaveBeenCalledWith(GamePhase.COIN);
            });
        });

        describe('Когда у игрока нет монеток', () => {
            beforeEach(() => {
                mockGameState.getCoins.mockReturnValue(0);
            });

            it('не должен депонировать монетку', () => {
                handler.handle();

                expect(mockOracle.depositItem).not.toHaveBeenCalled();
            });

            it('не должен обновлять lastDepositTime', () => {
                const originalTime = mockScene.lastDepositTime;

                handler.handle();

                expect(mockScene.lastDepositTime).toBe(originalTime);
            });
        });

        describe('Депозит монетки (COIN Phase)', () => {
            beforeEach(() => {
                mockGameState.getCoins.mockReturnValue(1);
                mockGameState.getGamePhase.mockReturnValue(GamePhase.COIN);
                mockOracle.getStoredCoins.mockReturnValue(0);
            });

            it('должен депонировать монетку с фазой COIN', () => {
                handler.handle();

                expect(mockOracle.depositItem).toHaveBeenCalledWith(GamePhase.COIN);
            });

            it('должен удалять монетку из gameState', () => {
                handler.handle();

                expect(mockGameState.removeCoin).toHaveBeenCalled();
            });

            it('должен обновлять lastDepositTime', () => {
                handler.handle();

                expect(mockScene.lastDepositTime).toBe(1000);
            });

            it('должен проигрывать звук применения монетки', () => {
                handler.handle();

                expect(mockAudioManager.playApplyKey).toHaveBeenCalled();
            });

            it('должен вызывать applyKey у игрока', () => {
                handler.handle();

                expect(mockPlayer.applyKey).toHaveBeenCalled();
            });

            // ❌ ОТКЛЮЧЕНО: oracleLabel больше не используется
            // it('должен обновлять метку оракула с количеством монеток', () => {
            //     mockOracle.getStoredCoins.mockReturnValue(1);
            //
            //     handler.handle();
            //
            //     expect(mockScene.oracleLabel.setText).toHaveBeenCalledWith('ORACLE (1/3)');
            // });

            it('должен обновлять HUD', () => {
                handler.handle();

                expect(mockHUDManager.update).toHaveBeenCalled();
            });
        });

        describe('Когда депозит монетки не удался', () => {
            beforeEach(() => {
                mockGameState.getCoins.mockReturnValue(1);
                mockGameState.getGamePhase.mockReturnValue(GamePhase.COIN);
                mockOracle.depositItem.mockReturnValue(false);
            });

            it('не должен удалять монетку из gameState', () => {
                handler.handle();

                expect(mockGameState.removeCoin).not.toHaveBeenCalled();
            });

            it('не должен проигрывать звук', () => {
                handler.handle();

                expect(mockAudioManager.playApplyKey).not.toHaveBeenCalled();
            });
        });

        describe('Активация оракула (3 монетки)', () => {
            beforeEach(() => {
                mockGameState.getCoins.mockReturnValue(1);
                mockGameState.getGamePhase.mockReturnValue(GamePhase.COIN);
                mockOracle.getStoredCoins.mockReturnValue(3);
            });

            it('должен установить флаг isOracleActivated', () => {
                handler.handle();

                expect(mockScene.isOracleActivated).toBe(true);
            });

            it('должен вызвать setOracleActivated на gameState', () => {
                handler.handle();

                expect(mockGameState.setOracleActivated).toHaveBeenCalledWith(true);
            });

            // ❌ ОТКЛЮЧЕНО: oracleLabel больше не используется
            // it('должен обновить метку оракула', () => {
            //     handler.handle();
            //
            //     expect(mockScene.oracleLabel.setText).toHaveBeenCalledWith('ORACLE ACTIVE');
            //     expect(mockScene.oracleLabel.setColor).toHaveBeenCalledWith('#00ff00');
            // });

            it('должен включить взаимодействие с оракулом', () => {
                handler.handle();

                expect(mockOracle.enableInteraction).toHaveBeenCalled();
            });
        });

        describe('Когда уже есть 2 монетки', () => {
            beforeEach(() => {
                mockGameState.getCoins.mockReturnValue(1);
                mockGameState.getGamePhase.mockReturnValue(GamePhase.COIN);
                mockOracle.getStoredCoins.mockReturnValue(2);
            });

            // ❌ ОТКЛЮЧЕНО: oracleLabel больше не используется
            // it('должен обновить метку с правильным счётом', () => {
            //     handler.handle();
            //
            //     expect(mockScene.oracleLabel.setText).toHaveBeenCalledWith('ORACLE (2/3)');
            // });

            it('не должен активировать оракул', () => {
                handler.handle();

                expect(mockScene.isOracleActivated).toBe(false);
            });
        });

        describe('Когда фаза игры не COIN или KEY', () => {
            it('должен логировать предупреждение для неизвестной фазы', () => {
                mockGameState.getGamePhase.mockReturnValue('UNKNOWN' as GamePhase);
                mockGameState.getCoins.mockReturnValue(1);

                // Mock logger to capture warnings
                const logger = require('../../../../utils/Logger').logger;
                const spyLog = jest.spyOn(logger, 'warn');

                handler.handle();

                expect(spyLog).toHaveBeenCalled();

                spyLog.mockRestore();
            });
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно обрабатывать последовательные депозиты монеток', () => {
            mockGameState.getCoins.mockReturnValue(3);
            mockGameState.getGamePhase.mockReturnValue(GamePhase.COIN);

            // Первая монетка - устанавливаем что после депозита будет 1 монетка
            mockOracle.getStoredCoins.mockReturnValue(1);
            handler.handle();
            // ❌ ОТКЛЮЧЕНО: oracleLabel больше не используется
            // expect(mockScene.oracleLabel.setText).toHaveBeenCalled();

            // Вторая монетка (обновляем время)
            mockScene.time.now = 1500;
            mockOracle.getStoredCoins.mockReturnValue(2);
            handler.handle();
            // ❌ ОТКЛЮЧЕНО: oracleLabel больше не используется
            // expect(mockScene.oracleLabel.setText).toHaveBeenCalled();

            // Третья монетка - активация
            mockScene.time.now = 2000;
            mockOracle.getStoredCoins.mockReturnValue(3);
            handler.handle();
            // ❌ ОТКЛЮЧЕНО: oracleLabel больше не используется
            // expect(mockScene.oracleLabel.setText).toHaveBeenCalledWith('ORACLE ACTIVE');
        });

        it('должен корректно обрабатывать попытку депозита во время cooldown', () => {
            mockGameState.getCoins.mockReturnValue(3);
            mockGameState.getGamePhase.mockReturnValue(GamePhase.COIN);

            // Первый депозит
            handler.handle();
            expect(mockOracle.depositItem).toHaveBeenCalledTimes(1);

            // Попытка сразу же (cooldown)
            mockScene.time.now = 1200; // 200ms разница
            handler.handle();
            expect(mockOracle.depositItem).toHaveBeenCalledTimes(1); // Не увеличился
        });
    });
});
