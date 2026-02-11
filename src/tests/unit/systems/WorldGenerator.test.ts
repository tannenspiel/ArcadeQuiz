

import { WorldGenerator, IWorldGeneratorScene } from '../../../game/systems/WorldGenerator';
import { SpawnSystem } from '../../../game/systems/SpawnSystem';
// ... imports

// Mock Phaser module locally
jest.mock('phaser', () => {
    const FakePhaser = {
        GameObjects: {
            Container: class Container {
                constructor(_scene: any, _x?: number, _y?: number, _children?: any[]) { }
                add() { }
                each() { }
                setScrollFactor() { }
                setInteractive() { }
                resize() { }
                removeAll() { }
                getBounds() { return { width: 0, height: 0 }; }
            },
            Image: class Image { },
            Text: class Text { },
            Graphics: class Graphics { },
        },
        Physics: {
            Arcade: {
                Sprite: class Sprite {
                    body = { setSize: jest.fn(), width: 0, height: 0 };
                },
                StaticGroup: class StaticGroup {
                    add() { }
                },
                Body: class Body {
                    setSize() { }
                }
            }
        },
        Scene: class Scene { },
        Events: {
            EventEmitter: class EventEmitter {
                emit() { return true; }
                on() { return this; }
                off() { return this; }
                once() { return this; }
            }
        },
        Geom: {
            Rectangle: class Rectangle {
                static Contains() { }
                constructor(_x?: number, _y?: number, _w?: number, _h?: number) { }
            }
        },
        Input: {
            Events: {}
        }
    };
    return FakePhaser;
});

// ... imports continue
import { QuizManager } from '../../../game/systems/QuizManager';
import { LevelManager } from '../../../game/core/LevelManager';
import { Player } from '../../../game/entities/Player';
import { Oracle } from '../../../game/entities/Oracle';
import { StandardPortal } from '../../../game/entities/portals/StandardPortal';
import { KEYS, BASE_SCALE, TILEMAP_CONSTANTS } from '../../../constants/gameConstants';

// Mocks
jest.mock('../../../game/entities/Oracle');
jest.mock('../../../game/entities/portals/StandardPortal');
jest.mock('../../../game/entities/Player');

describe('WorldGenerator', () => {
    let worldGenerator: WorldGenerator;
    let mockScene: jest.Mocked<IWorldGeneratorScene>;
    let mockSpawnSystem: jest.Mocked<SpawnSystem>;
    let mockQuizManager: jest.Mocked<QuizManager>;
    let mockLevelManager: jest.Mocked<LevelManager>;

    beforeEach(() => {
        // Mock SpawnSystem
        mockSpawnSystem = {
            occupyPositionMatrix: jest.fn(),
            occupyTiledPortal: jest.fn(),
            spawnOracleMatrix: jest.fn(),
            spawnItems: jest.fn(),
        } as any;

        // Mock QuizManager
        mockQuizManager = {
            getRandomGlobalQuestion: jest.fn().mockResolvedValue({
                questionText: 'Test Question',
                correctAnswer: 'Correct',
                wrongAnswers: ['Wrong1', 'Wrong2', 'Wrong3']
            }),
        } as any;

        // Mock LevelManager
        mockLevelManager = {
            getCurrentLevel: jest.fn().mockReturnValue(1),
        } as any;

        // Mock Scene
        mockScene = {
            add: {
                image: jest.fn().mockReturnValue({ setScale: jest.fn(), setDepth: jest.fn() }),
                text: jest.fn().mockReturnValue({ setOrigin: jest.fn() }),
                graphics: jest.fn().mockReturnValue({ setDepth: jest.fn() }),
                rectangle: jest.fn().mockReturnValue({ setOrigin: jest.fn() }),
            },
            physics: {
                add: {
                    staticGroup: jest.fn().mockReturnValue({ add: jest.fn() }),
                    existing: jest.fn(),
                    collider: jest.fn(),
                    overlap: jest.fn(),
                }
            },
            tiledOverlapBodies: undefined, // Инициализация для теста
            tiledMapCollisionBodies: undefined, // Инициализация для теста
            assetLoader: {
                loadJSON: jest.fn(),
            },
            spawnSystem: mockSpawnSystem,
            quizManager: mockQuizManager,
            levelManager: mockLevelManager,

            // Groups
            enemies: { add: jest.fn() } as any,
            chasers: { add: jest.fn() } as any,
            hearts: { add: jest.fn() } as any,
            keys: { add: jest.fn() } as any,
            portals: { add: jest.fn() } as any,

            // Entities & Data
            player: {
                getSprite: jest.fn().mockReturnValue({}),
                getPosition: jest.fn().mockReturnValue({ x: 100, y: 100 })
            } as any,
            portalInstances: [],
            tiledPortalsConfig: [],

            // Methods
            createPlayer: jest.fn(),
            handlePortalOverlapByMask: jest.fn(),
            createCollisionObjects: jest.fn(),

        } as any;

        worldGenerator = new WorldGenerator(mockScene);

        // Reset mocks implementation
        (StandardPortal as jest.Mock).mockClear();
        (Oracle as jest.Mock).mockClear();
        (Oracle as jest.Mock).mockImplementation(() => ({
            getSprite: jest.fn().mockReturnValue({ body: { setSize: jest.fn(), width: 32, height: 64 } }),
            createQuestionBubble: jest.fn(),
            updateBubblePosition: jest.fn(),
        }));
        (StandardPortal as jest.Mock).mockImplementation(() => ({
            getSprite: jest.fn().mockReturnValue({}),
            addCollisionBody: jest.fn(),
        }));
    });

    it('should generate world from tiled map', async () => {
        // Mock Map Data
        const mockMapData = {
            width: 10,
            height: 10,
            tilewidth: 8,
            tileheight: 8,
            layers: [
                {
                    name: 'Collision Mask',
                    data: new Array(100).fill(0).map((_, i) => i === 0 ? 1 : 0), // One collision tile at index 0
                    width: 10,
                    height: 10
                },
                {
                    name: 'InteractiveObjects',
                    type: 'objectgroup',
                    objects: [
                        { type: 'Oracle', x: 50, y: 50, width: 32, height: 64 },
                        { type: 'Portal', x: 200, y: 200, width: 32, height: 48, properties: [{ name: 'portalId', value: 1 }] }
                    ]
                }
            ]
        };

        (mockScene.assetLoader.loadJSON as jest.Mock).mockResolvedValue(mockMapData);

        await worldGenerator.generate('test_map_key', 800, 600);

        // Verify Background Loading
        expect(mockScene.add.image).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'map_bg_tiled_base_l1');
        expect(mockScene.add.image).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'map_bg_tiled_struct_l1');
        expect(mockScene.add.image).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'map_bg_tiled_overlay_l1');

        // Verify JSON Loading
        expect(mockScene.assetLoader.loadJSON).toHaveBeenCalledWith('level_maps/Level1_map.json');

        // Verify Collision Creation
        expect(mockScene.physics.add.staticGroup).toHaveBeenCalled();
        // Should create collision for tile at index 0 (0,0)
        expect(mockSpawnSystem.occupyPositionMatrix).toHaveBeenCalled();

        // После рефакторинга: WorldGenerator не создаёт Oracle напрямую,
        // только сохраняет конфиг в scene.tiledOracleConfig
        expect(mockScene.tiledOracleConfig).toBeDefined();
        // Координаты рассчитываются как center = (obj.x + obj.width/2) * BASE_SCALE
        // Oracle: x=50, width=32 -> centerX=66 -> worldX=66*4=264
        expect(mockScene.tiledOracleConfig?.x).toBe((50 + 32/2) * BASE_SCALE); // 264
        expect(mockScene.tiledOracleConfig?.y).toBe((50 + 64/2) * BASE_SCALE); // 328
        expect(mockSpawnSystem.spawnOracleMatrix).toHaveBeenCalled();

        // После рефакторинга: WorldGenerator не создаёт Portal напрямую,
        // только сохраняет конфиги в scene.tiledPortalsConfig
        expect(mockScene.tiledPortalsConfig).toHaveLength(1);
        expect(mockScene.tiledPortalsConfig[0].id).toBe(1);
        // Portal: x=200, width=32 -> centerX=216 -> worldX=216*4=864
        expect(mockScene.tiledPortalsConfig[0].x).toBe((200 + 32/2) * BASE_SCALE); // 864
        expect(mockScene.tiledPortalsConfig[0].y).toBe((200 + 48/2) * BASE_SCALE); // 896

        // Verify Player Creation (теперь вынесено за пределы WorldGenerator)
        // expect(mockScene.createPlayer).toHaveBeenCalled();

        // Verify Items Spawn (теперь вынесено за пределы WorldGenerator)
        // expect(mockSpawnSystem.spawnItems).toHaveBeenCalled();
    });

    it('should handle overlap mask', async () => {
        const mockMapData = {
            width: 10,
            height: 10,
            tilewidth: 8,
            tileheight: 8,
            layers: [
                {
                    name: 'Collision Mask',
                    data: [1, 1], // Two collision tiles
                    width: 2,
                    height: 1
                },
                {
                    name: 'Overlap Mask',
                    data: [0, TILEMAP_CONSTANTS.OVERLAP_TILE_GID], // Second tile is overlap mask
                    width: 2,
                    height: 1
                }
            ]
        };
        (mockScene.assetLoader.loadJSON as jest.Mock).mockResolvedValue(mockMapData);

        await worldGenerator.generate('key', 100, 100);

        // First tile (index 0) is standard collision, NOT overlap, so it should occupy matrix
        // The implementation iterates:
        // Tile 0: Collision=1, Overlap=0 -> Occupy
        // Tile 1: Collision=1, Overlap=GID -> Skip Occupy (Override)

        // Verify Occupy called for first tile
        expect(mockSpawnSystem.occupyPositionMatrix).toHaveBeenCalledTimes(1);

        // После рефакторинга: overlap тела создаются через physics.add.existing()
        // В данной проверке мы убеждаемся, что группа tiledOverlapBodies была создана
        expect(mockScene.tiledOverlapBodies).toBeDefined();
    });
});
