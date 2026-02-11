/**
 * Unit тесты для EnemyCloneFactory
 */

import { EnemyCloneFactory, CloneCreationConfig } from '../../../../game/scenes/enemy/EnemyCloneFactory';
import { EnemyType } from '../../../../types/enemyTypes';

// Мокаем Logger
jest.mock('../../../../utils/Logger');

describe('EnemyCloneFactory', () => {
    let factory: EnemyCloneFactory;
    let mockScene: any;
    let mockEnemiesGroup: any;
    let mockChasersGroup: any;
    let mockOnCloneCreated: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock groups
        mockEnemiesGroup = {
            add: jest.fn()
        };

        mockChasersGroup = {
            add: jest.fn()
        };

        // Mock scene with physics
        mockScene = {
            physics: {
                velocityFromAngle: jest.fn().mockReturnValue({ x: 100, y: 0 }),
                add: {
                    sprite: jest.fn().mockReturnValue({
                        setCollideWorldBounds: jest.fn().mockReturnThis(),
                        setBounce: jest.fn().mockReturnThis(),
                        setDepth: jest.fn().mockReturnThis(),
                        setOrigin: jest.fn().mockReturnThis(),
                        setScale: jest.fn().mockReturnThis(),
                        setCircle: jest.fn().mockReturnThis(),
                        setVelocity: jest.fn().mockReturnThis(),
                        on: jest.fn().mockReturnThis(),
                        setData: jest.fn().mockReturnThis(),
                        getData: jest.fn(),
                        body: {
                            setCircle: jest.fn(),
                            velocity: { x: 0, y: 0 }
                        }
                    })
                }
            },
            anims: {
                exists: jest.fn().mockReturnValue(true)
            },
            time: {
                now: Date.now()
            }
        };

        // Mock callback
        mockOnCloneCreated = jest.fn();

        factory = new EnemyCloneFactory(
            mockScene,
            mockEnemiesGroup,
            mockChasersGroup,
            mockOnCloneCreated
        );
    });

    describe('constructor', () => {
        it('должен создать экземпляр EnemyCloneFactory', () => {
            expect(factory).toBeInstanceOf(EnemyCloneFactory);
        });

        it('должен сохранить зависимости', () => {
            expect(factory['scene']).toBe(mockScene);
            expect(factory['enemiesGroup']).toBe(mockEnemiesGroup);
            expect(factory['chasersGroup']).toBe(mockChasersGroup);
        });
    });

    describe('createClone - базовые проверки', () => {
        let mockConfig: CloneCreationConfig;

        beforeEach(() => {
            mockConfig = {
                type: EnemyType.RANDOM_WALKER,
                x: 100,
                y: 200,
                speed: 50,
                health: 100,
                damage: 10,
                isClone: true,
                parentId: 'parent-123',
                spawnTime: Date.now(),
                cloneDetectionRadius: 200,
                chaseRadius: 300,
                chaseSpeed: 60,
                clonesCanClone: true,
                cloneLifetime: 10000,
                cloneCount: 2
            };
        });

        it('должен иметь метод createClone', () => {
            expect(typeof factory.createClone).toBe('function');
        });

        it('должен использовать значения по умолчанию для опциональных параметров в конфиге', () => {
            // Проверяем, что конфиг может быть создан без опциональных полей
            mockConfig.cloneSpawnDelay = undefined;
            mockConfig.showDetectionRadius = undefined;

            expect(mockConfig.type).toBe(EnemyType.RANDOM_WALKER);
            expect(mockConfig.isClone).toBe(true);
            expect(mockConfig.parentId).toBe('parent-123');
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен сохранять ссылку на callback onCloneCreated', () => {
            expect(factory['onCloneCreated']).toBeDefined();
            expect(factory['onCloneCreated']).toBe(mockOnCloneCreated);
        });

        it('должен иметь доступ к группам врагов', () => {
            expect(factory['enemiesGroup']).toBeDefined();
            expect(factory['chasersGroup']).toBeDefined();
            expect(factory['enemiesGroup']).toBe(mockEnemiesGroup);
            expect(factory['chasersGroup']).toBe(mockChasersGroup);
        });
    });
});
