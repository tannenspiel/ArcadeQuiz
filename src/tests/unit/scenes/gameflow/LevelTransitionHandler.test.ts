/**
 * Unit тесты для LevelTransitionHandler
 */

import { LevelTransitionHandler } from '../../../../game/scenes/gameflow/LevelTransitionHandler';

describe('LevelTransitionHandler', () => {
    let handler: LevelTransitionHandler;
    let mockDeps: any;
    let mockCallbacks: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock dependencies
        mockDeps = {
            levelManager: {
                getCurrentLevel: jest.fn().mockReturnValue(1),
                nextLevel: jest.fn().mockResolvedValue(undefined)
            },
            scoreSystem: {
                getScore: jest.fn().mockReturnValue(100)
            },
            registry: {
                set: jest.fn()
            }
        };

        // Mock callbacks
        mockCallbacks = {
            restartScene: jest.fn(),
            restartGame: jest.fn(),
            handleGameWin: jest.fn()
        };

        handler = new LevelTransitionHandler(mockDeps, mockCallbacks);
    });

    describe('constructor', () => {
        it('должен создать экземпляр LevelTransitionHandler', () => {
            expect(handler).toBeInstanceOf(LevelTransitionHandler);
        });

        it('должен сохранить зависимости', () => {
            expect(handler['deps']).toBeDefined();
            expect(handler['deps'].levelManager).toBe(mockDeps.levelManager);
            expect(handler['deps'].scoreSystem).toBe(mockDeps.scoreSystem);
            expect(handler['deps'].registry).toBe(mockDeps.registry);
        });

        it('должен сохранить callbacks', () => {
            expect(handler['callbacks']).toBeDefined();
            expect(handler['callbacks'].restartScene).toBe(mockCallbacks.restartScene);
            expect(handler['callbacks'].handleGameWin).toBe(mockCallbacks.handleGameWin);
        });
    });

    describe('handleNextLevel - переход на следующий уровень', () => {
        it('должен получить текущий уровень', async () => {
            await handler.handleNextLevel();

            expect(mockDeps.levelManager.getCurrentLevel).toHaveBeenCalled();
        });

        it('должен сохранить текущий score в registry перед переходом', async () => {
            mockDeps.scoreSystem.getScore.mockReturnValue(250);

            await handler.handleNextLevel();

            expect(mockDeps.registry.set).toHaveBeenCalledWith('score', 250);
        });

        it('должен перейти на следующий уровень через LevelManager', async () => {
            await handler.handleNextLevel();

            expect(mockDeps.levelManager.nextLevel).toHaveBeenCalled();
        });

        it('должен сохранить новый уровень в registry', async () => {
            mockDeps.levelManager.getCurrentLevel
                .mockReturnValueOnce(1)  // Initial check
                .mockReturnValueOnce(2); // After nextLevel()

            await handler.handleNextLevel();

            expect(mockDeps.registry.set).toHaveBeenCalledWith('currentLevel', 2);
        });

        it('должен перезапустить сцену для применения нового уровня', async () => {
            await handler.handleNextLevel();

            expect(mockCallbacks.restartScene).toHaveBeenCalled();
        });

        it('должен корректно обрабатывать отсутствие scoreSystem', async () => {
            mockDeps.scoreSystem = null;

            await handler.handleNextLevel();

            expect(mockDeps.registry.set).toHaveBeenCalledWith('score', 0);
        });

        it('должен сохранять undefined если scoreSystem.getScore возвращает undefined', async () => {
            mockDeps.scoreSystem.getScore.mockReturnValue(undefined);

            await handler.handleNextLevel();

            expect(mockDeps.registry.set).toHaveBeenCalledWith('score', undefined);
        });
    });

    describe('handleNextLevel - завершение игры', () => {
        it('должен вызвать handleGameWin когда достигнут MAX_LEVELS', async () => {
            mockDeps.levelManager.getCurrentLevel.mockReturnValue(3); // MAX_LEVELS = 3
            mockDeps.scoreSystem.getScore.mockReturnValue(500);

            await handler.handleNextLevel();

            expect(mockCallbacks.handleGameWin).toHaveBeenCalledWith(500, '');
        });

        it('должен вызвать handleGameWin с score 0 если scoreSystem отсутствует', async () => {
            mockDeps.levelManager.getCurrentLevel.mockReturnValue(3); // MAX_LEVELS = 3
            mockDeps.scoreSystem = null;

            await handler.handleNextLevel();

            expect(mockCallbacks.handleGameWin).toHaveBeenCalledWith(0, '');
        });

        it('не должен вызывать nextLevel когда достигнут MAX_LEVELS', async () => {
            mockDeps.levelManager.getCurrentLevel.mockReturnValue(3); // MAX_LEVELS = 3

            await handler.handleNextLevel();

            expect(mockDeps.levelManager.nextLevel).not.toHaveBeenCalled();
        });

        it('не должен перезапускать сцену когда достигнут MAX_LEVELS', async () => {
            mockDeps.levelManager.getCurrentLevel.mockReturnValue(3); // MAX_LEVELS = 3

            await handler.handleNextLevel();

            expect(mockCallbacks.restartScene).not.toHaveBeenCalled();
        });

        it('должен вызывать handleGameWin когда текущий уровень больше или равен MAX_LEVELS', async () => {
            mockDeps.levelManager.getCurrentLevel.mockReturnValue(3); // MAX_LEVELS = 3
            mockDeps.scoreSystem.getScore.mockReturnValue(1000);

            await handler.handleNextLevel();

            expect(mockCallbacks.handleGameWin).toHaveBeenCalledWith(1000, '');
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно обрабатывать переход с уровня 1 на уровень 2', async () => {
            mockDeps.levelManager.getCurrentLevel
                .mockReturnValueOnce(1)
                .mockReturnValueOnce(2);
            mockDeps.scoreSystem.getScore.mockReturnValue(150);

            await handler.handleNextLevel();

            expect(mockDeps.registry.set).toHaveBeenCalledWith('score', 150);
            expect(mockDeps.levelManager.nextLevel).toHaveBeenCalled();
            expect(mockDeps.registry.set).toHaveBeenCalledWith('currentLevel', 2);
            expect(mockCallbacks.restartScene).toHaveBeenCalled();
        });

        it('должен корректно обрабатывать переход с уровня 2 на уровень 3', async () => {
            mockDeps.levelManager.getCurrentLevel
                .mockReturnValueOnce(2)
                .mockReturnValueOnce(3);
            mockDeps.scoreSystem.getScore.mockReturnValue(200);

            await handler.handleNextLevel();

            expect(mockDeps.registry.set).toHaveBeenCalledWith('score', 200);
            expect(mockDeps.levelManager.nextLevel).toHaveBeenCalled();
            expect(mockDeps.registry.set).toHaveBeenCalledWith('currentLevel', 3);
            expect(mockCallbacks.restartScene).toHaveBeenCalled();
        });

        it('должен корректно обрабатывать завершение игры на уровне 3 (MAX_LEVELS)', async () => {
            mockDeps.levelManager.getCurrentLevel.mockReturnValue(3);
            mockDeps.scoreSystem.getScore.mockReturnValue(999);

            await handler.handleNextLevel();

            expect(mockCallbacks.handleGameWin).toHaveBeenCalledWith(999, '');
            expect(mockDeps.levelManager.nextLevel).not.toHaveBeenCalled();
        });

        it('должен корректно обрабатывать ошибки при переходе уровня', async () => {
            mockDeps.levelManager.nextLevel.mockRejectedValue(new Error('Transition failed'));

            // Не должен выбрасывать ошибку наружу
            await expect(handler.handleNextLevel()).resolves.not.toThrow();
        });
    });
});
