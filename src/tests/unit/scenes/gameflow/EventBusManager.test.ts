/**
 * Unit тесты для EventBusManager
 */

import { EventBusManager } from '../../../../game/scenes/gameflow/EventBusManager';
import { EventBus } from '../../../../game/EventBus';
import { EVENTS } from '../../../../constants/gameConstants';
import type { AbstractPortal } from '../../../../game/entities/portals/AbstractPortal';

// Mock EventBus
jest.mock('../../../../game/EventBus', () => {
    const mockEventEmitter = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        once: jest.fn()
    };
    return {
        EventBus: mockEventEmitter
    };
});

// Mock Phaser Scene
const mockScene = {
    // Mock scene object
} as any;

describe('EventBusManager', () => {
    let mockDeps: any;
    let mockCallbacks: any;
    let manager: EventBusManager;

    // Mock AbstractPortal
    const mockPortal: Partial<AbstractPortal> = {
        getConfig: jest.fn().mockReturnValue({ id: 1 })
    } as any;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Mock dependencies
        mockDeps = {
            scene: mockScene,
            events: {
                once: jest.fn()
            },
            scale: {
                on: jest.fn(),
                off: jest.fn()
            }
        };

        // Mock callbacks
        mockCallbacks = {
            onPortalEnterConfirmed: jest.fn(),
            onPortalEnterCancelled: jest.fn(),
            onKeyQuizCompleted: jest.fn(),
            onCoinQuizCompleted: jest.fn(), // ⚠️ NEW: Coin mechanic
            onQuizCompleted: jest.fn(),
            onGamePhaseChanged: jest.fn(), // ⚠️ NEW: Game phase changes
            onRestartGame: jest.fn(),
            onNextLevel: jest.fn(),
            onViewportUpdate: jest.fn(),
            handleWindowResize: jest.fn(),
            handleOrientationChange: jest.fn(),
            handlePhaserResize: jest.fn(),
            onOracleActivated: jest.fn(), // ⚠️ NEW: Oracle activation
            resumeGame: jest.fn()
        };

        // Create manager instance
        manager = new EventBusManager(mockDeps, mockCallbacks);
    });

    describe('Инициализация', () => {
        it('должен создаваться с зависимостями и колбэками', () => {
            expect(manager).toBeInstanceOf(EventBusManager);
        });

        it('должен возвращать текущий размер окна', () => {
            const size = manager.getWindowSize();
            expect(size).toEqual({
                width: window.innerWidth,
                height: window.innerHeight
            });
        });

        it('должен обновлять размер окна', () => {
            manager.updateWindowSize(800, 600);
            const size = manager.getWindowSize();
            expect(size).toEqual({ width: 800, height: 600 });
        });
    });

    describe('Настройка EventBus', () => {
        it('должен регистрировать обработчики событий при setupEventBus', () => {
            manager.setupEventBus();

            // Проверяем, что EventBus.on был вызван для всех событий
            expect(EventBus.on).toHaveBeenCalledWith(EVENTS.PORTAL_ENTER_CONFIRMED, expect.any(Function));
            expect(EventBus.on).toHaveBeenCalledWith(EVENTS.PORTAL_ENTER_CANCELLED, expect.any(Function));
            expect(EventBus.on).toHaveBeenCalledWith(EVENTS.KEY_QUIZ_COMPLETED, expect.any(Function));
            expect(EventBus.on).toHaveBeenCalledWith(EVENTS.COIN_QUIZ_COMPLETED, expect.any(Function)); // ⚠️ NEW
            expect(EventBus.on).toHaveBeenCalledWith(EVENTS.GAME_PHASE_CHANGED, expect.any(Function)); // ⚠️ NEW
            expect(EventBus.on).toHaveBeenCalledWith(EVENTS.ORACLE_ACTIVATED, expect.any(Function)); // ⚠️ NEW
            expect(EventBus.on).toHaveBeenCalledWith(EVENTS.RESTART_GAME, expect.any(Function));
            expect(EventBus.on).toHaveBeenCalledWith(EVENTS.NEXT_LEVEL, expect.any(Function));
            expect(EventBus.on).toHaveBeenCalledWith('quiz-completed', expect.any(Function));
            expect(EventBus.on).toHaveBeenCalledWith('restart-game', expect.any(Function));
            expect(EventBus.on).toHaveBeenCalledWith('viewport-update', expect.any(Function));
        });

        it('должен предотвращать дублирующую подписку', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            manager.setupEventBus();
            manager.setupEventBus(); // Второй вызов

            expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ EventBusManager: Already setup, skipping duplicate subscriptions');
            // EventBus.on должен быть вызван только один раз для каждого события (11 событий: 8 original + 3 new)
            expect(EventBus.on).toHaveBeenCalledTimes(11);

            consoleWarnSpy.mockRestore();
        });

        it('должен настраивать cleanup при shutdown события сцены', () => {
            manager.setupEventBus();

            expect(mockDeps.events.once).toHaveBeenCalledWith('shutdown', expect.any(Function));
            expect(mockDeps.events.once).toHaveBeenCalledWith('destroy', expect.any(Function));
        });
    });

    describe('Обработка событий порталов', () => {
        beforeEach(() => {
            manager.setupEventBus();
        });

        it('должен вызывать onPortalEnterConfirmed при получении PORTAL_ENTER_CONFIRMED', () => {
            // Получаем последний вызов EventBus.on для PORTAL_ENTER_CONFIRMED
            const portalCalls = (EventBus.on as jest.Mock).mock.calls.filter(
                call => call[0] === EVENTS.PORTAL_ENTER_CONFIRMED
            );
            const handler = portalCalls[0][1];

            // Эмулируем событие
            handler({ portal: mockPortal });

            expect(mockCallbacks.onPortalEnterConfirmed).toHaveBeenCalledWith({ portal: mockPortal });
        });

        it('должен вызывать onPortalEnterCancelled при получении PORTAL_ENTER_CANCELLED', () => {
            // Получаем последний вызов EventBus.on для PORTAL_ENTER_CANCELLED
            const portalCalls = (EventBus.on as jest.Mock).mock.calls.filter(
                call => call[0] === EVENTS.PORTAL_ENTER_CANCELLED
            );
            const handler = portalCalls[0][1];

            // Эмулируем событие
            handler();

            expect(mockCallbacks.onPortalEnterCancelled).toHaveBeenCalled();
        });
    });

    describe('Обработка событий викторин', () => {
        beforeEach(() => {
            manager.setupEventBus();
        });

        it('должен вызывать onKeyQuizCompleted при получении KEY_QUIZ_COMPLETED', () => {
            // Получаем последний вызов EventBus.on для KEY_QUIZ_COMPLETED
            const quizCalls = (EventBus.on as jest.Mock).mock.calls.filter(
                call => call[0] === EVENTS.KEY_QUIZ_COMPLETED
            );
            const handler = quizCalls[0][1];

            const data = { result: 'correct' as const, damage: 0 };
            handler(data);

            expect(mockCallbacks.onKeyQuizCompleted).toHaveBeenCalledWith(data);
        });

        it('должен вызывать onQuizCompleted при получении legacy quiz-completed', () => {
            // Получаем последний вызов EventBus.on для 'quiz-completed'
            const quizCalls = (EventBus.on as jest.Mock).mock.calls.filter(
                call => call[0] === 'quiz-completed'
            );
            const handler = quizCalls[0][1];

            const data = { correct: true, context: 'key-quiz' };
            handler(data);

            expect(mockCallbacks.onQuizCompleted).toHaveBeenCalledWith(data);
        });
    });

    describe('Обработка игровых событий', () => {
        beforeEach(() => {
            manager.setupEventBus();
        });

        it('должен вызывать onRestartGame при получении RESTART_GAME', () => {
            const restartCalls = (EventBus.on as jest.Mock).mock.calls.filter(
                call => call[0] === EVENTS.RESTART_GAME
            );
            const handler = restartCalls[0][1];

            handler();

            expect(mockCallbacks.onRestartGame).toHaveBeenCalled();
        });

        it('должен вызывать onNextLevel при получении NEXT_LEVEL', () => {
            const nextLevelCalls = (EventBus.on as jest.Mock).mock.calls.filter(
                call => call[0] === EVENTS.NEXT_LEVEL
            );
            const handler = nextLevelCalls[0][1];

            handler();

            expect(mockCallbacks.onNextLevel).toHaveBeenCalled();
        });

        it('должен вызывать onViewportUpdate при получении viewport-update', () => {
            const viewportCalls = (EventBus.on as jest.Mock).mock.calls.filter(
                call => call[0] === 'viewport-update'
            );
            const handler = viewportCalls[0][1];

            const data = { realWidth: 800, realHeight: 600 };
            handler(data);

            expect(mockCallbacks.onViewportUpdate).toHaveBeenCalledWith(data);
        });
    });

    describe('Настройка window event listeners', () => {
        // Сохраняем оригинальные методы window
        let originalAddEventListener: typeof window.addEventListener;
        let originalRemoveEventListener: typeof window.removeEventListener;

        beforeAll(() => {
            originalAddEventListener = window.addEventListener;
            originalRemoveEventListener = window.removeEventListener;
        });

        afterAll(() => {
            window.addEventListener = originalAddEventListener;
            window.removeEventListener = originalRemoveEventListener;
        });

        beforeEach(() => {
            // Мокаем window.addEventListener
            window.addEventListener = jest.fn();
        });

        it('должен регистрировать обработчики window событий', () => {
            manager.setupEventListeners();

            expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
            expect(window.addEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function));
            expect(mockDeps.scale.on).toHaveBeenCalledWith('resize', expect.any(Function));
        });
    });

    describe('Управление resize timeout', () => {
        it('должен устанавливать resize timeout', () => {
            const mockTimeout = {} as NodeJS.Timeout;
            manager.setResizeTimeout(mockTimeout);

            // Нет простого способа проверить приватное поле, но можно проверить через clearResizeTimeout
            manager.clearResizeTimeout();
        });

        it('должен очищать предыдущий timeout при установке нового', () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            const mockTimeout1 = {} as NodeJS.Timeout;
            const mockTimeout2 = {} as NodeJS.Timeout;

            manager.setResizeTimeout(mockTimeout1);
            manager.setResizeTimeout(mockTimeout2);

            expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeout1);

            clearTimeoutSpy.mockRestore();
        });

        it('должен очищать resize timeout', () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

            const mockTimeout = {} as NodeJS.Timeout;
            manager.setResizeTimeout(mockTimeout);
            manager.clearResizeTimeout();

            expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeout);

            clearTimeoutSpy.mockRestore();
        });
    });

    describe('Cleanup', () => {
        beforeEach(() => {
            manager.setupEventBus();
            // Clear mock calls to isolate cleanup tests
            (EventBus.on as jest.Mock).mockClear();
            (EventBus.off as jest.Mock).mockClear();
        });

        it('должен вызывать forceCleanup напрямую', () => {
            manager.forceCleanup();

            // Проверяем, что EventBus.off был вызван для всех событий
            expect(EventBus.off).toHaveBeenCalledWith(EVENTS.PORTAL_ENTER_CONFIRMED, expect.any(Function));
            expect(EventBus.off).toHaveBeenCalledWith(EVENTS.PORTAL_ENTER_CANCELLED, expect.any(Function));
            expect(EventBus.off).toHaveBeenCalledWith(EVENTS.KEY_QUIZ_COMPLETED, expect.any(Function));
            expect(EventBus.off).toHaveBeenCalledWith(EVENTS.COIN_QUIZ_COMPLETED, expect.any(Function)); // ⚠️ NEW
            expect(EventBus.off).toHaveBeenCalledWith(EVENTS.GAME_PHASE_CHANGED, expect.any(Function)); // ⚠️ NEW
            expect(EventBus.off).toHaveBeenCalledWith(EVENTS.ORACLE_ACTIVATED, expect.any(Function)); // ⚠️ NEW
            expect(EventBus.off).toHaveBeenCalledWith(EVENTS.RESTART_GAME, expect.any(Function));
            expect(EventBus.off).toHaveBeenCalledWith(EVENTS.NEXT_LEVEL, expect.any(Function));
            expect(EventBus.off).toHaveBeenCalledWith('quiz-completed', expect.any(Function));
            expect(EventBus.off).toHaveBeenCalledWith('restart-game', expect.any(Function));
            expect(EventBus.off).toHaveBeenCalledWith('viewport-update', expect.any(Function));
        });

        it('должен очищать Phaser scale listener', () => {
            const boundHandler = jest.fn();
            (manager as any).boundHandlePhaserResize = boundHandler;

            manager.forceCleanup();

            expect(mockDeps.scale.off).toHaveBeenCalledWith('resize', boundHandler);
        });

        it('должен очищать resize timeout', () => {
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            const mockTimeout = {} as NodeJS.Timeout;
            manager.setResizeTimeout(mockTimeout);

            manager.forceCleanup();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });
    });

    describe('Повторная настройка после cleanup', () => {
        it('должен позволять повторную setupEventBus после forceCleanup', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            manager.setupEventBus();
            manager.forceCleanup();
            manager.setupEventBus(); // Не должен выдавать предупреждение

            expect(consoleWarnSpy).not.toHaveBeenCalled();

            consoleWarnSpy.mockRestore();
        });
    });
});
