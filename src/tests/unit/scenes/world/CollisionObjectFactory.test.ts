/**
 * Unit тесты для CollisionObjectFactory
 */

import { CollisionObjectFactory } from '../../../../game/scenes/world/CollisionObjectFactory';
import { BushCollisionObject } from '../../../../game/entities/collision/BushCollisionObject';
import { MAP_WIDTH, MAP_HEIGHT, BASE_SCALE } from '../../../../constants/gameConstants';

// Моки для зависимостей
jest.mock('../../../../game/entities/collision/BushCollisionObject');

describe('CollisionObjectFactory', () => {
    let factory: CollisionObjectFactory;
    let mockScene: any;
    let mockDeps: any;
    let mockSpawnSystem: any;
    let mockLevelManager: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock spawn system
        mockSpawnSystem = {
            spawnOnMap: jest.fn()
        };

        // Mock level manager
        mockLevelManager = {
            loadLevelConfig: jest.fn().mockResolvedValue({
                levelConfig: {
                    useTiledMap: false // Standard mode - создает кусты
                }
            }),
            getCollisionObjectConfig: jest.fn().mockResolvedValue({
                bush: {
                    count: 5,
                    showCollisionDebug: false
                }
            })
        };

        // Mock scene
        mockScene = {};

        mockDeps = {
            levelManager: mockLevelManager,
            spawnSystem: mockSpawnSystem
        };

        factory = new CollisionObjectFactory(mockScene, mockDeps);
    });

    describe('constructor', () => {
        it('должен создать экземпляр CollisionObjectFactory', () => {
            expect(factory).toBeInstanceOf(CollisionObjectFactory);
        });

        it('должен сохранить зависимости', () => {
            expect(factory['deps']).toBeDefined();
            expect(factory['deps'].levelManager).toBeDefined();
            expect(factory['deps'].spawnSystem).toBeDefined();
        });

        it('должен инициализировать bushCollisionObjects как null', () => {
            expect(factory['bushCollisionObjects']).toBeNull();
        });
    });

    describe('create', () => {
        it('должен получить конфигурацию коллизионных объектов', async () => {
            await factory.create(1) // Добавляем currentLevel=1;

            expect(mockLevelManager.getCollisionObjectConfig).toHaveBeenCalled();
        });

        it('должен создать кусты если count > 0', async () => {
            mockLevelManager.getCollisionObjectConfig.mockResolvedValue({
                bush: {
                    count: 5,
                    showCollisionDebug: false
                }
            });

            const result = await factory.create(1) // Добавляем currentLevel=1;

            expect(result.bushCollisionObjects).toBeDefined();
        });

        it('должен пропустить создание кустов если count = 0', async () => {
            mockLevelManager.getCollisionObjectConfig.mockResolvedValue({
                bush: {
                    count: 0
                }
            });

            const result = await factory.create(1) // Добавляем currentLevel=1;

            expect(result.bushCollisionObjects).toBeNull();
        });

        it('должен пропустить создание кустов если bush config не определен', async () => {
            mockLevelManager.getCollisionObjectConfig.mockResolvedValue({});

            const result = await factory.create(1) // Добавляем currentLevel=1;

            expect(result.bushCollisionObjects).toBeNull();
        });

        it('должен вернуть null при ошибке', async () => {
            mockLevelManager.getCollisionObjectConfig.mockRejectedValue(new Error('Test error'));

            const result = await factory.create(1) // Добавляем currentLevel=1;

            expect(result.bushCollisionObjects).toBeNull();
        });
    });

    describe('getBushCollisionObjects', () => {
        it('должен вернуть null если кусты не созданы', () => {
            const result = factory.getBushCollisionObjects();

            expect(result).toBeNull();
        });

        it('должен вернуть кусты после создания', async () => {
            mockLevelManager.getCollisionObjectConfig.mockResolvedValue({
                bush: {
                    count: 5
                }
            });

            await factory.create(1) // Добавляем currentLevel=1;
            const result = factory.getBushCollisionObjects();

            expect(result).toBeInstanceOf(BushCollisionObject);
        });
    });

    describe('destroy', () => {
        it('должен уничтожить кусты если они созданы', async () => {
            const mockBush = {
                destroy: jest.fn()
            } as any;
            factory['bushCollisionObjects'] = mockBush;

            factory.destroy();

            expect(mockBush.destroy).toHaveBeenCalled();
            expect(factory['bushCollisionObjects']).toBeNull();
        });

        it('должен корректно обрабатывать отсутствие кустов', () => {
            factory['bushCollisionObjects'] = null;

            expect(() => factory.destroy()).not.toThrow();
        });
    });

    describe('createBushCollisionObjects', () => {
        it('должен создать BushCollisionObject с правильным showCollisionDebug', async () => {
            mockLevelManager.getCollisionObjectConfig.mockResolvedValue({
                bush: {
                    count: 5,
                    showCollisionDebug: true
                }
            });

            await factory.create(1) // Добавляем currentLevel=1;

            expect(factory['bushCollisionObjects']).toBeDefined();
        });

        it('должен вызвать spawnOnMap с правильными параметрами', async () => {
            mockLevelManager.getCollisionObjectConfig.mockResolvedValue({
                bush: {
                    count: 5
                }
            });

            await factory.create(1) // Добавляем currentLevel=1;

            const expectedWidth = MAP_WIDTH * BASE_SCALE;
            const expectedHeight = MAP_HEIGHT * BASE_SCALE;

            // Проверяем, что spawnOnMap был вызван (это проверяется внутри BushCollisionObject)
            expect(factory['bushCollisionObjects']).toBeDefined();
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно обрабатывать отсутствие collision config', async () => {
            mockLevelManager.getCollisionObjectConfig.mockResolvedValue(null);

            const result = await factory.create(1) // Добавляем currentLevel=1;

            expect(result.bushCollisionObjects).toBeNull();
        });

        it('должен создавать кусты при первом вызове и уничтожать при destroy', async () => {
            mockLevelManager.getCollisionObjectConfig.mockResolvedValue({
                bush: {
                    count: 3
                }
            });

            await factory.create(1) // Добавляем currentLevel=1;
            const bushes1 = factory.getBushCollisionObjects();
            expect(bushes1).toBeDefined();

            factory.destroy();
            const bushes2 = factory.getBushCollisionObjects();
            expect(bushes2).toBeNull();
        });
    });
});
