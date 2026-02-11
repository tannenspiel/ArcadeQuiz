/**
 * Unit тесты для EnemySpawner
 */

import { EnemySpawner } from '../../../../game/scenes/enemy/EnemySpawner';

// Моки для зависимостей
jest.mock('../../../../game/systems/SpawnSystem');
jest.mock('../../../../game/core/LevelManager');

describe('EnemySpawner', () => {
    let spawner: EnemySpawner;
    let mockScene: any;
    let mockSpawnSystem: any;
    let mockLevelManager: any;
    let mockEnemiesGroup: any;
    let mockChasersGroup: any;
    let mockHeartsGroup: any;
    let mockKeysGroup: any;
    let mockCoinsGroup: any; // ⚠️ НОВОЕ: Coins group mock
    let mockGetPlayerPosition: jest.Mock;
    let mockOnEnemySpawned: jest.Mock;
    let mockUpdateEnemyInstances: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock groups
        mockEnemiesGroup = {
            add: jest.fn()
        };

        mockChasersGroup = {
            add: jest.fn()
        };

        mockHeartsGroup = {};

        mockKeysGroup = {};

        mockCoinsGroup = {}; // ⚠️ НОВОЕ: Coins group mock

        // Mock spawn system
        mockSpawnSystem = {
            spawnInitialEnemies: jest.fn().mockResolvedValue(undefined),
            spawnEnemy: jest.fn().mockResolvedValue(undefined),
            spawnPeriodicItems: jest.fn().mockResolvedValue(undefined)
        };

        // Mock level manager
        mockLevelManager = {
            getEnemySpawnConfig: jest.fn().mockResolvedValue({
                periodicSpawnDelay: 5000
            }),
            getItemSpawnConfig: jest.fn().mockResolvedValue({
                keys: {
                    spawnDelay: 3000
                }
            })
        };

        // Mock scene with time
        const mockTime = {
            addEvent: jest.fn()
        };

        mockScene = {
            sys: {
                settings: {
                    active: true
                }
            },
            time: mockTime
        };

        // Mock callbacks
        mockGetPlayerPosition = jest.fn().mockReturnValue({ x: 100, y: 200 });
        mockOnEnemySpawned = jest.fn();
        mockUpdateEnemyInstances = jest.fn();

        spawner = new EnemySpawner(
            mockScene,
            mockSpawnSystem,
            mockLevelManager,
            mockEnemiesGroup,
            mockChasersGroup,
            mockHeartsGroup,
            mockKeysGroup,
            mockCoinsGroup, // ⚠️ НОВОЕ: Pass coins group mock
            mockGetPlayerPosition,
            mockOnEnemySpawned,
            mockUpdateEnemyInstances
        );
    });

    describe('constructor', () => {
        it('должен создать экземпляр EnemySpawner', () => {
            expect(spawner).toBeInstanceOf(EnemySpawner);
        });

        it('должен сохранить зависимости', () => {
            expect(spawner['scene']).toBe(mockScene);
            expect(spawner['spawnSystem']).toBe(mockSpawnSystem);
            expect(spawner['levelManager']).toBe(mockLevelManager);
        });
    });

    describe('spawnInitialEnemies', () => {
        it('должен получить позицию игрока', async () => {
            await spawner.spawnInitialEnemies();

            expect(mockGetPlayerPosition).toHaveBeenCalled();
        });

        it('должен вызвать spawnInitialEnemies из SpawnSystem', async () => {
            await spawner.spawnInitialEnemies();

            expect(mockSpawnSystem.spawnInitialEnemies).toHaveBeenCalledWith(
                mockEnemiesGroup,
                mockChasersGroup,
                100,
                200,
                expect.any(Function)
            );
        });

        it('должен обновить список экземпляров врагов', async () => {
            await spawner.spawnInitialEnemies();

            expect(mockUpdateEnemyInstances).toHaveBeenCalled();
        });
    });

    describe('setupPeriodicEvents', () => {
        it('должен получить конфигурацию спавна врагов', async () => {
            await spawner.setupPeriodicEvents();

            expect(mockLevelManager.getEnemySpawnConfig).toHaveBeenCalled();
        });

        it('должен получить конфигурацию спавна предметов', async () => {
            await spawner.setupPeriodicEvents();

            expect(mockLevelManager.getItemSpawnConfig).toHaveBeenCalled();
        });

        it('должен создать периодическое событие для спавна врагов', async () => {
            await spawner.setupPeriodicEvents();

            expect(mockScene.time.addEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    delay: 5000,
                    loop: true
                })
            );
        });

        it('должен создать периодическое событие для спавна предметов', async () => {
            await spawner.setupPeriodicEvents();

            expect(mockScene.time.addEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    delay: 3000,
                    loop: true
                })
            );
        });

        it('должен создать два периодических события', async () => {
            await spawner.setupPeriodicEvents();

            expect(mockScene.time.addEvent).toHaveBeenCalledTimes(2);
        });

        it('должен передать правильный callbackScope', async () => {
            await spawner.setupPeriodicEvents();

            expect(mockScene.time.addEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    callbackScope: spawner
                })
            );
        });
    });

    describe('Периодический спавн врагов', () => {
        let periodicCallback: Function;

        beforeEach(async () => {
            await spawner.setupPeriodicEvents();

            // Получаем callback из первого вызова addEvent (периодический спавн врагов)
            periodicCallback = mockScene.time.addEvent.mock.calls[0][0].callback;
        });

        it('должен проверять активность сцены перед спавном', async () => {
            mockScene.sys.settings.active = false;

            await periodicCallback();

            expect(mockSpawnSystem.spawnEnemy).not.toHaveBeenCalled();
        });

        it('должен получать позицию игрока при спавне', async () => {
            await periodicCallback();

            expect(mockGetPlayerPosition).toHaveBeenCalled();
        });

        it('должен спавнить врага через SpawnSystem', async () => {
            await periodicCallback();

            expect(mockSpawnSystem.spawnEnemy).toHaveBeenCalledWith(
                mockEnemiesGroup,
                mockChasersGroup,
                100,
                200
            );
        });

        it('должен обновлять список экземпляров после спавна', async () => {
            await periodicCallback();

            expect(mockUpdateEnemyInstances).toHaveBeenCalled();
        });
    });

    describe('Периодический спавн предметов', () => {
        let itemsCallback: Function;

        beforeEach(async () => {
            await spawner.setupPeriodicEvents();

            // Получаем callback из второго вызова addEvent (периодический спавн предметов)
            itemsCallback = mockScene.time.addEvent.mock.calls[1][0].callback;
        });

        it('должен получать позицию игрока при спавне', async () => {
            await itemsCallback();

            expect(mockGetPlayerPosition).toHaveBeenCalled();
        });

        it('должен спавнить предметы через SpawnSystem', async () => {
            await itemsCallback();

            expect(mockSpawnSystem.spawnPeriodicItems).toHaveBeenCalledWith(
                mockHeartsGroup,
                mockKeysGroup,
                mockCoinsGroup,
                100,
                200
            );
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно обрабатывать начальный спавн', async () => {
            const mockEnemy = {
                getSprite: jest.fn().mockReturnValue({ active: true })
            };

            mockSpawnSystem.spawnInitialEnemies.mockImplementation(async (
                _enemiesGroup: any,
                _chasersGroup: any,
                _playerX: number,
                _playerY: number,
                callback: Function
            ) => {
                // Симулируем вызов callback для каждого созданного врага
                callback(mockEnemy);
            });

            await spawner.spawnInitialEnemies();

            expect(mockOnEnemySpawned).toHaveBeenCalledWith(mockEnemy);
            expect(mockUpdateEnemyInstances).toHaveBeenCalled();
        });

        it('должен корректно обрабатывать периодические события', async () => {
            await spawner.setupPeriodicEvents();

            const enemyCallback = mockScene.time.addEvent.mock.calls[0][0].callback;
            const itemsCallback = mockScene.time.addEvent.mock.calls[1][0].callback;

            // Проверяем, что оба callback корректно работают
            await enemyCallback();
            await itemsCallback();

            expect(mockSpawnSystem.spawnEnemy).toHaveBeenCalled();
            expect(mockSpawnSystem.spawnPeriodicItems).toHaveBeenCalled();
        });

        it('должен использовать задержки из конфигурации уровня', async () => {
            mockLevelManager.getEnemySpawnConfig.mockResolvedValue({
                periodicSpawnDelay: 8000
            });

            mockLevelManager.getItemSpawnConfig.mockResolvedValue({
                keys: {
                    spawnDelay: 5000
                }
            });

            await spawner.setupPeriodicEvents();

            expect(mockScene.time.addEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    delay: 8000
                })
            );

            expect(mockScene.time.addEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    delay: 5000
                })
            );
        });
    });
});
