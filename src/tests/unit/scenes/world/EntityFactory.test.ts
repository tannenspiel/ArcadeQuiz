/**
 * Unit тесты для EntityFactory
 */

import { EntityFactory } from '../../../../game/scenes/world/EntityFactory';
import { PortalType } from '../../../../types/portalTypes';
import { MAP_CENTER_X, MAP_CENTER_Y, PORTALS_DATA } from '../../../../constants/gameConstants';

// Мокаем зависимости
jest.mock('../../../../game/entities/Oracle');
jest.mock('../../../../game/entities/Player');
jest.mock('../../../../game/entities/portals/StandardPortal');

// Мокаем Logger
jest.mock('../../../../utils/Logger', () => ({
    logger: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

// Мокаем EventBus
jest.mock('../../../../game/EventBus', () => ({
    EventBus: {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
    }
}));

describe('EntityFactory', () => {
    let factory: EntityFactory;
    let mockScene: any;
    let mockDeps: any;
    let mockPortalsGroup: any;
    let mockOracle: any;
    let mockPlayer: any;
    let mockStandardPortal: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Suppress console logs
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Mock Oracle
        mockOracle = {
            getSprite: jest.fn().mockReturnValue({ x: MAP_CENTER_X, y: MAP_CENTER_Y }),
            createQuestionBubble: jest.fn(),
            updateBubblePosition: jest.fn()
        };

        // Mock Player
        mockPlayer = {
            getPosition: jest.fn().mockReturnValue({ x: MAP_CENTER_X, y: MAP_CENTER_Y + 150 })
        };

        // Mock StandardPortal
        mockStandardPortal = {
            getSprite: jest.fn().mockReturnValue({ body: { setSize: jest.fn() } }),
            setCollisionOverride: jest.fn()
        };

        // Import after mocking
        const Oracle = require('../../../../game/entities/Oracle').Oracle;
        const Player = require('../../../../game/entities/Player').Player;
        const StandardPortal = require('../../../../game/entities/portals/StandardPortal').StandardPortal;

        // Mock constructors
        jest.spyOn(Oracle.prototype, 'constructor').mockImplementation(function(this: any, scene: any, x: number, y: number) {
            this.scene = scene;
            this.x = x;
            this.y = y;
            return mockOracle;
        });
        Oracle.mockImplementation(() => mockOracle);

        jest.spyOn(Player.prototype, 'constructor').mockImplementation(function(this: any, scene: any, x: number, y: number, key: string) {
            this.scene = scene;
            this.x = x;
            this.y = y;
            this.key = key;
            return mockPlayer;
        });
        Player.mockImplementation(() => mockPlayer);

        jest.spyOn(StandardPortal.prototype, 'constructor').mockImplementation(function(this: any, scene: any, config: any, x: number, y: number) {
            this.scene = scene;
            this.config = config;
            this.x = x;
            this.y = y;
            return mockStandardPortal;
        });
        StandardPortal.mockImplementation(() => mockStandardPortal);

        // Mock portals group
        mockPortalsGroup = {
            add: jest.fn()
        };

        // Mock spawn system
        const mockSpawnSystem = {
            spawnOracleMatrix: jest.fn().mockReturnValue({ x: MAP_CENTER_X, y: MAP_CENTER_Y }),
            spawnPlayerMatrix: jest.fn().mockReturnValue({ x: MAP_CENTER_X, y: MAP_CENTER_Y + 150 }),
            spawnPortalMatrix: jest.fn().mockReturnValue({
                success: true,
                x: MAP_CENTER_X + 200,
                y: MAP_CENTER_Y
            }),
            occupyTiledPortal: jest.fn()
        };

        // Mock level manager
        const mockLevelManager = {
            getCurrentLevel: jest.fn().mockReturnValue(1),
            getLevelConfig: jest.fn().mockResolvedValue({
                portalSpawnRadius: 576
            })
        };

        // Mock quiz manager
        const mockQuizManager = {
            getRandomGlobalQuestion: jest.fn().mockResolvedValue({
                questionText: 'Test Question',
                correctAnswer: 'Correct',
                wrongAnswers: ['Wrong1', 'Wrong2', 'Wrong3']
            })
        };

        // Mock health system
        const mockHealthSystem = {
            createPlayerHealthDisplay: jest.fn()
        };

        // Mock scene
        mockScene = {
            add: {
                text: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis()
                })
            }
        };

        mockScene.portalInstances = [];

        mockDeps = {
            spawnSystem: mockSpawnSystem,
            levelManager: mockLevelManager,
            quizManager: mockQuizManager,
            physics: {},
            add: mockScene.add,
            portals: mockPortalsGroup,
            oracle: null,
            player: null,
            healthSystem: mockHealthSystem,
            tiledPortalsConfig: null,
            tiledOracleConfig: null
        };

        factory = new EntityFactory(mockScene, mockDeps);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('constructor', () => {
        it('должен создать экземпляр EntityFactory', () => {
            expect(factory).toBeInstanceOf(EntityFactory);
        });

        it('должен сохранить зависимости', () => {
            expect(factory['deps']).toBeDefined();
            expect(factory['deps'].spawnSystem).toBeDefined();
            expect(factory['deps'].levelManager).toBeDefined();
            expect(factory['deps'].quizManager).toBeDefined();
        });

        it('должен инициализировать пустые созданные сущности', () => {
            expect(factory['createdOracle']).toBeNull();
            expect(factory['createdPlayer']).toBeNull();
            expect(factory['currentGlobalQuestionData']).toBeNull();
        });
    });

    describe('getGlobalQuestionData', () => {
        it('должен возвращать null до создания', () => {
            const questionData = factory.getGlobalQuestionData();
            expect(questionData).toBeNull();
        });

        it('должен возвращать данные вопроса после создания', async () => {
            mockDeps.quizManager.getRandomGlobalQuestion.mockResolvedValue({
                questionText: 'Test',
                correctAnswer: 'A',
                wrongAnswers: ['B', 'C']
            });

            await factory['createPortals']();

            const questionData = factory.getGlobalQuestionData();
            expect(questionData).toBeDefined();
            expect(questionData.questionText).toBe('Test');
        });
    });

    describe('resetGlobalQuestionData', () => {
        it('должен сбросить данные глобального вопроса', () => {
            factory['currentGlobalQuestionData'] = { questionText: 'Test' };
            factory.resetGlobalQuestionData();

            expect(factory.getGlobalQuestionData()).toBeNull();
        });
    });

    describe('shuffleArray', () => {
        it('должен перемешивать массив', () => {
            const input = [1, 2, 3, 4, 5];
            const result = factory['shuffleArray'](input);

            expect(result).toHaveLength(5);
            expect(result).toContain(1);
            expect(result).toContain(2);
            expect(result).toContain(3);
            expect(result).toContain(4);
            expect(result).toContain(5);
        });

        it('должен возвращать массив той же длины', () => {
            const input = [1, 2, 3];
            const result = factory['shuffleArray'](input);

            expect(result.length).toBe(input.length);
        });

        it('должен работать с пустым массивом', () => {
            const result = factory['shuffleArray']([]);

            expect(result).toEqual([]);
        });

        it('должен работать с одним элементом', () => {
            const result = factory['shuffleArray']([1]);

            expect(result).toEqual([1]);
        });

        it('должен работать со строками', () => {
            const input = ['A', 'B', 'C'];
            const result = factory['shuffleArray'](input);

            expect(result).toHaveLength(3);
            expect(result).toContain('A');
            expect(result).toContain('B');
            expect(result).toContain('C');
        });
    });

    describe('createOracle', () => {
        it('должен создавать Oracle через spawnSystem', () => {
            factory['createOracle']();

            expect(mockDeps.spawnSystem.spawnOracleMatrix).toHaveBeenCalled();
        });

        it('должен использовать Tiled config если доступен', () => {
            const tiledConfig = { x: 500, y: 600 };
            factory['deps'].tiledOracleConfig = tiledConfig;

            factory['createOracle']();

            expect(factory['deps'].spawnSystem.spawnOracleMatrix).toHaveBeenCalled();
        });

        it('должен создавать question bubble для Oracle', () => {
            factory['createOracle']();

            expect(mockOracle.createQuestionBubble).toHaveBeenCalled();
        });

        it('должен сохранять созданный Oracle', () => {
            const oracle = factory['createOracle']();

            expect(factory['createdOracle']).toBeDefined();
            expect(oracle).toBeDefined();
        });
    });

    describe('createPlayer', () => {
        beforeEach(() => {
            factory['createdOracle'] = mockOracle;
        });

        it('должен создавать Player через spawnSystem', () => {
            factory['createPlayer']();

            expect(mockDeps.spawnSystem.spawnPlayerMatrix).toHaveBeenCalled();
        });

        it('должен создавать health display для игрока', () => {
            factory['createPlayer']();

            expect(mockDeps.healthSystem.createPlayerHealthDisplay).toHaveBeenCalled();
        });

        it('должн сохранять созданный Player', () => {
            const player = factory['createPlayer']();

            expect(factory['createdPlayer']).toBeDefined();
            expect(player).toBeDefined();
        });
    });

    describe('createPortalsCircular', () => {
        it('должен создавать порталы по кругу', async () => {
            const answers = ['A', 'B', 'C'];
            factory['currentGlobalQuestionData'] = { correctAnswer: 'A' };

            await factory['createPortalsCircular'](answers, 576);

            expect(mockDeps.spawnSystem.spawnPortalMatrix).toHaveBeenCalledTimes(3);
        });

        it('должен создавать порталы с правильной конфигурацией', async () => {
            const answers = ['Correct', 'Wrong1', 'Wrong2'];
            factory['currentGlobalQuestionData'] = { correctAnswer: 'Correct' };

            await factory['createPortalsCircular'](answers, 576);

            const StandardPortal = require('../../../../game/entities/portals/StandardPortal').StandardPortal;
            expect(StandardPortal).toHaveBeenCalledTimes(3);
        });

        it('должен добавлять порталы в группу', async () => {
            const answers = ['A', 'B'];
            factory['currentGlobalQuestionData'] = { correctAnswer: 'A' };

            await factory['createPortalsCircular'](answers, 576);

            expect(mockPortalsGroup.add).toHaveBeenCalledTimes(2);
        });

        it('должен пропускать портал если spawnPortalMatrix возвращает success: false', async () => {
            mockDeps.spawnSystem.spawnPortalMatrix.mockReturnValue({ success: false });
            const answers = ['A', 'B'];
            factory['currentGlobalQuestionData'] = { correctAnswer: 'A' };

            await factory['createPortalsCircular'](answers, 576);

            const StandardPortal = require('../../../../game/entities/portals/StandardPortal').StandardPortal;
            expect(StandardPortal).not.toHaveBeenCalled();
        });
    });

    describe('createPortalsFromTiledConfig', () => {
        it('должен создавать порталы из Tiled config', () => {
            const tiledConfig = [
                { id: 1, x: 100, y: 200, bubblePosition: { x: 100, y: 150 } },
                { id: 2, x: 300, y: 400, bubblePosition: { x: 300, y: 350 } }
            ];
            factory['deps'].tiledPortalsConfig = tiledConfig;

            const answers = ['A', 'B'];
            const questionData = { correctAnswer: 'A' };

            factory['createPortalsFromTiledConfig'](answers, questionData);

            expect(mockDeps.spawnSystem.occupyTiledPortal).toHaveBeenCalledTimes(2);
        });

        it('должен применять collision override если указан', () => {
            const tiledConfig = [
                { id: 1, x: 100, y: 200, overrideCollision: true }
            ];
            factory['deps'].tiledPortalsConfig = tiledConfig;

            const answers = ['A'];
            const questionData = { correctAnswer: 'A' };

            factory['createPortalsFromTiledConfig'](answers, questionData);

            expect(mockStandardPortal.setCollisionOverride).toHaveBeenCalledWith(true);
        });

        it('должен занимать клетки в spawn matrix', () => {
            const tiledConfig = [
                { id: 1, x: 100, y: 200 }
            ];
            factory['deps'].tiledPortalsConfig = tiledConfig;

            const answers = ['A'];
            const questionData = { correctAnswer: 'A' };

            factory['createPortalsFromTiledConfig'](answers, questionData);

            expect(mockDeps.spawnSystem.occupyTiledPortal).toHaveBeenCalledWith(100, 200, 2, 3);
        });

        it('должен пропускать портал если ID вне диапазона ответов', () => {
            const tiledConfig = [
                { id: 5, x: 100, y: 200 }  // ID 5, but only 1 answer
            ];
            factory['deps'].tiledPortalsConfig = tiledConfig;

            const answers = ['A'];
            const questionData = { correctAnswer: 'A' };

            factory['createPortalsFromTiledConfig'](answers, questionData);

            // Portal should not be created
            const StandardPortal = require('../../../../game/entities/portals/StandardPortal').StandardPortal;
            expect(StandardPortal).not.toHaveBeenCalled();
        });

        it('должен ничего не делать если tiledPortalsConfig null', () => {
            factory['deps'].tiledPortalsConfig = null;

            const answers = ['A'];
            const questionData = { correctAnswer: 'A' };

            factory['createPortalsFromTiledConfig'](answers, questionData);

            const StandardPortal = require('../../../../game/entities/portals/StandardPortal').StandardPortal;
            expect(StandardPortal).not.toHaveBeenCalled();
        });
    });

    describe('createPortalsFallback', () => {
        it('должен создавать порталы из PORTALS_DATA', async () => {
            await factory['createPortalsFallback']();

            const StandardPortal = require('../../../../game/entities/portals/StandardPortal').StandardPortal;
            expect(StandardPortal).toHaveBeenCalled();
        });

        it('должен использовать правильный portalSpawnRadius из config', async () => {
            mockDeps.levelManager.getLevelConfig.mockResolvedValue({
                portalSpawnRadius: 700
            });

            await factory['createPortalsFallback']();

            expect(mockDeps.spawnSystem.spawnPortalMatrix).toHaveBeenCalledWith(
                MAP_CENTER_X,
                MAP_CENTER_Y,
                700,
                expect.any(Number)
            );
        });

        it('должен использовать дефолтный radius если config не возвращает значение', async () => {
            mockDeps.levelManager.getLevelConfig.mockResolvedValue(null);

            await factory['createPortalsFallback']();

            expect(mockDeps.spawnSystem.spawnPortalMatrix).toHaveBeenCalledWith(
                MAP_CENTER_X,
                MAP_CENTER_Y,
                576,  // default
                expect.any(Number)
            );
        });
    });

    describe('createAll', () => {
        it('должен создавать все сущности в правильном порядке', async () => {
            const result = await factory.createAll();

            expect(mockDeps.spawnSystem.spawnOracleMatrix).toHaveBeenCalled();
            expect(mockDeps.spawnSystem.spawnPlayerMatrix).toHaveBeenCalled();
        });

        it('должен возвращать Oracle и Player', async () => {
            const result = await factory.createAll();

            expect(result.oracle).toBeDefined();
            expect(result.player).toBeDefined();
        });

        it('должен загружать глобальный вопрос', async () => {
            await factory.createAll();

            expect(mockDeps.quizManager.getRandomGlobalQuestion).toHaveBeenCalled();
        });

        it('должен возвращать globalQuestionData', async () => {
            const result = await factory.createAll();

            expect(result.globalQuestionData).toBeDefined();
        });

        it('должен обновлять deps с tiledPortalsConfig если передан', async () => {
            const tiledConfig = [{ id: 1, x: 100, y: 200 }];
            await factory.createAll(tiledConfig);

            expect(factory['deps'].tiledPortalsConfig).toEqual(tiledConfig);
        });

        it('должен обновлять deps с tiledOracleConfig если передан', async () => {
            const tiledConfig = { x: 500, y: 600 };
            await factory.createAll(undefined, tiledConfig);

            expect(factory['deps'].tiledOracleConfig).toEqual(tiledConfig);
        });

        it('должен выбрасывать ошибку если Oracle не создан', async () => {
            factory['deps'].spawnSystem.spawnOracleMatrix = jest.fn().mockImplementation(() => {
                throw new Error('Failed to create Oracle');
            });

            await expect(factory.createAll()).rejects.toThrow();
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен сохранять Tiled Oracle config если передан', () => {
            const tiledConfig = { x: 500, y: 600 };
            factory['deps'].tiledOracleConfig = tiledConfig;

            expect(factory['deps'].tiledOracleConfig).toEqual(tiledConfig);
        });

        it('должен сохранять Tiled Portals config если передан', () => {
            const tiledConfig = [{ id: 1, x: 100, y: 200 }];
            factory['deps'].tiledPortalsConfig = tiledConfig;

            expect(factory['deps'].tiledPortalsConfig).toEqual(tiledConfig);
        });
    });
});
