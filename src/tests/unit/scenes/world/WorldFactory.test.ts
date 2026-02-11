/**
 * Unit тесты для WorldFactory
 */

import { WorldFactory } from '../../../../game/scenes/world/WorldFactory';
import { MAP_WIDTH, MAP_HEIGHT, MAP_CENTER_X, MAP_CENTER_Y, BASE_SCALE } from '../../../../constants/gameConstants';

describe('WorldFactory', () => {
    let factory: WorldFactory;
    let mockScene: any;
    let mockDeps: any;
    let mockPhysics: any;
    let mockAdd: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock physics
        mockPhysics = {
            world: {
                setBounds: jest.fn()
            }
        };

        // Mock add (GameObjectFactory)
        mockAdd = {
            image: jest.fn().mockReturnValue({
                setScale: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                setOrigin: jest.fn().mockReturnThis()
            }),
            tileSprite: jest.fn().mockReturnValue({
                setTileScale: jest.fn().mockReturnThis(),
                setScale: jest.fn().mockReturnThis(),
                setOrigin: jest.fn().mockReturnThis(),
                setTilePosition: jest.fn().mockReturnThis(),
                setScrollFactor: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                setVisible: jest.fn().mockReturnThis(),
                setActive: jest.fn().mockReturnThis()
            }),
            rectangle: jest.fn().mockReturnValue({
                setStrokeStyle: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis()
            })
        };

        // Mock spawn system
        const mockSpawnSystem = {
            clearOccupiedZones: jest.fn(),
            clearForbiddenZones: jest.fn()
        };

        // Mock level manager
        const mockLevelManager = {
            getLevelConfig: jest.fn().mockResolvedValue({
                useTiledMap: false
            }),
            getCurrentLevel: jest.fn().mockReturnValue(1)
        };

        // Mock world generator
        const mockWorldGenerator = {
            generate: jest.fn().mockResolvedValue(undefined)
        };

        // Mock scene
        mockScene = {
            textures: {
                exists: jest.fn().mockReturnValue(true)
            },
            sys: {
                settings: {
                    active: true
                }
            }
        };

        mockDeps = {
            spawnSystem: mockSpawnSystem,
            levelManager: mockLevelManager,
            worldGenerator: mockWorldGenerator,
            physics: mockPhysics,
            add: mockAdd
        };

        factory = new WorldFactory(mockScene, mockDeps);
    });

    describe('constructor', () => {
        it('должен создать экземпляр WorldFactory', () => {
            expect(factory).toBeInstanceOf(WorldFactory);
        });

        it('должен сохранить зависимости', () => {
            expect(factory['deps']).toBeDefined();
            expect(factory['deps'].spawnSystem).toBeDefined();
            expect(factory['deps'].levelManager).toBeDefined();
        });
    });

    describe('create', () => {
        it('должен очистить занятые зоны перед созданием мира', async () => {
            await factory.create();

            expect(mockDeps.spawnSystem.clearOccupiedZones).toHaveBeenCalled();
        });

        it('должен установить границы физического мира', async () => {
            await factory.create();

            const expectedWidth = MAP_WIDTH * BASE_SCALE;
            const expectedHeight = MAP_HEIGHT * BASE_SCALE;

            expect(mockPhysics.world.setBounds).toHaveBeenCalledWith(0, 0, expectedWidth, expectedHeight);
        });

        it('должен корректно обрабатывать отсутствие physics.world', async () => {
            // Симулируем ситуацию при рестарте сцены, когда physics.world = null
            mockPhysics.world = null;

            // Не должен выбрасывать ошибку
            await expect(factory.create()).resolves.not.toThrow();
        });

        it('должен получить конфигурацию уровня', async () => {
            await factory.create();

            expect(mockDeps.levelManager.getLevelConfig).toHaveBeenCalled();
        });

        it('должен создать случайный мир когда useTiledMap=false', async () => {
            mockDeps.levelManager.getLevelConfig.mockResolvedValue({
                useTiledMap: false
            });

            await factory.create();

            expect(mockDeps.worldGenerator.generate).not.toHaveBeenCalled();
        });

        it('должен создать Tiled мир когда useTiledMap=true', async () => {
            mockDeps.levelManager.getLevelConfig.mockResolvedValue({
                useTiledMap: true,
                tiledMapKey: 'level1_json'
            });

            await factory.create();

            expect(mockDeps.worldGenerator.generate).toHaveBeenCalledWith('level1_json', MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE);
        });
    });

    describe('createExtendedBackground', () => {
        it('должен создать расширенный фон', () => {
            factory.createExtendedBackground();

            expect(mockAdd.tileSprite).toHaveBeenCalledWith(
                MAP_CENTER_X,
                MAP_CENTER_Y,
                MAP_WIDTH * 2,
                MAP_HEIGHT,
                expect.any(String)
            );
        });

        it('должен установить правильные свойства для тайлового спрайта', () => {
            factory.createExtendedBackground();

            const mockTileSprite = mockAdd.tileSprite.mock.results[0].value;

            expect(mockTileSprite.setTileScale).toHaveBeenCalledWith(1, 1);
            expect(mockTileSprite.setScale).toHaveBeenCalledWith(BASE_SCALE, BASE_SCALE);
            expect(mockTileSprite.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
            expect(mockTileSprite.setTilePosition).toHaveBeenCalledWith(0, 0);
            expect(mockTileSprite.setScrollFactor).toHaveBeenCalledWith(1, 1);
            expect(mockTileSprite.setDepth).toHaveBeenCalledWith(-200);
        });

        it('должен уничтожить старый фон перед созданием нового', () => {
            const mockOldBackground = {
                destroy: jest.fn()
            } as any;
            factory['mapBackgroundTileSprite'] = mockOldBackground;

            factory.createExtendedBackground();

            expect(mockOldBackground.destroy).toHaveBeenCalled();
        });
    });

    describe('handleResize', () => {
        it('должен пересоздать расширенный фон при изменении размера', () => {
            factory.handleResize();

            expect(mockAdd.tileSprite).toHaveBeenCalled();
        });
    });

    describe('destroy', () => {
        it('должен уничтожить расширенный фон', () => {
            const mockBackground = {
                destroy: jest.fn()
            } as any;
            factory['mapBackgroundTileSprite'] = mockBackground;

            factory.destroy();

            expect(mockBackground.destroy).toHaveBeenCalled();
            expect(factory['mapBackgroundTileSprite']).toBeNull();
        });

        it('должен корректно обрабатывать отсутствие фона', () => {
            factory['mapBackgroundTileSprite'] = null;

            expect(() => factory.destroy()).not.toThrow();
        });
    });

    describe('createRandomWorld', () => {
        it('должен создать основной фон карты', async () => {
            mockDeps.levelManager.getLevelConfig.mockResolvedValue({
                useTiledMap: false
            });

            await factory.create();

            expect(mockAdd.image).toHaveBeenCalledWith(MAP_CENTER_X, MAP_CENTER_Y, 'map_bg_standard_l1');
        });

        it('должен установить правильную глубину для основного фона', async () => {
            mockDeps.levelManager.getLevelConfig.mockResolvedValue({
                useTiledMap: false
            });

            await factory.create();

            const mapBackground = mockAdd.image.mock.results[0].value;
            expect(mapBackground.setDepth).toHaveBeenCalledWith(-200);
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно создавать мир в Tiled режиме', async () => {
            mockDeps.levelManager.getLevelConfig.mockResolvedValue({
                useTiledMap: true,
                tiledMapKey: 'test_level_json'
            });

            await factory.create();

            expect(mockDeps.worldGenerator.generate).toHaveBeenCalled();
            expect(mockAdd.tileSprite).toHaveBeenCalled(); // Extended background created even in Tiled mode
        });

        it('должен корректно создавать мир в Random режиме', async () => {
            mockDeps.levelManager.getLevelConfig.mockResolvedValue({
                useTiledMap: false
            });

            await factory.create();

            expect(mockAdd.image).toHaveBeenCalled();
            expect(mockAdd.rectangle).toHaveBeenCalled();
        });
    });
});
