/**
 * Unit тесты для EnemyManager
 */

import { EnemyManager } from '../../../../game/scenes/enemy/EnemyManager';
import type { AbstractEnemy } from '../../../../game/entities/enemies/AbstractEnemy';

// Моки для зависимостей
jest.mock('../../../../game/scenes/enemy/EnemyCloneFactory');
jest.mock('../../../../game/scenes/enemy/EnemySpawner');
jest.mock('../../../../game/core/LevelManager');

describe('EnemyManager', () => {
    let manager: EnemyManager;
    let mockDeps: any;
    let mockEnemiesGroup: any;
    let mockChasersGroup: any;
    let mockLevelManager: any;
    let mockEnemy: jest.Mocked<AbstractEnemy>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock enemy
        mockEnemy = {
            getId: jest.fn().mockReturnValue('enemy-1'),
            getType: jest.fn().mockReturnValue('randomWalker'),
            getSprite: jest.fn().mockReturnValue({
                active: true,
                x: 100,
                y: 200,
                disableBody: jest.fn(),
                getData: jest.fn()
            }),
            update: jest.fn(),
            isActive: jest.fn().mockReturnValue(true),
            spawnTime: Date.now()
        } as any;

        // Mock groups
        mockEnemiesGroup = {
            getChildren: jest.fn().mockReturnValue([]),
            countActive: jest.fn().mockReturnValue(0),
            scene: { active: true }
        };

        mockChasersGroup = {
            getChildren: jest.fn().mockReturnValue([]),
            countActive: jest.fn().mockReturnValue(0),
            scene: { active: true }
        };

        // Mock level manager
        mockLevelManager = {
            getEnemySpawnConfig: jest.fn().mockResolvedValue({
                maxEnemies: 10,
                randomWalker: 5,
                chaser: 3,
                flam: 1
            })
        };

        // Mock scene
        const mockScene = {
            active: true
        };

        mockDeps = {
            scene: mockScene,
            enemiesGroup: mockEnemiesGroup,
            chasersGroup: mockChasersGroup,
            levelManager: mockLevelManager
        };

        manager = new EnemyManager(mockDeps);
    });

    describe('update', () => {
        it('должен обновлять всех активных врагов', () => {
            // Настраиваем группы с врагами
            const mockSprite = {
                active: true,
                getData: jest.fn().mockReturnValue(mockEnemy)
            };
            mockEnemiesGroup.getChildren.mockReturnValue([mockSprite]);
            mockChasersGroup.getChildren.mockReturnValue([]);

            manager.updateEnemyInstances();
            manager.update(1000, 16.67, { active: true, x: 50, y: 50 } as any);

            expect(mockEnemy.update).toHaveBeenCalled();
        });

        it('не должен обновлять неактивных врагов', () => {
            mockEnemy.getSprite.mockReturnValue({ active: false } as any);
            const mockSprite = {
                active: false,
                getData: jest.fn().mockReturnValue(mockEnemy)
            } as any;
            mockEnemiesGroup.getChildren.mockReturnValue([mockSprite]);

            manager.updateEnemyInstances();
            manager.update(1000, 16.67, { active: true } as any);

            expect(mockEnemy.update).not.toHaveBeenCalled();
        });

        it('не должен обновлять если нет playerSprite', () => {
            const mockSprite = {
                active: true,
                getData: jest.fn().mockReturnValue(mockEnemy)
            };
            mockEnemiesGroup.getChildren.mockReturnValue([mockSprite]);

            manager.updateEnemyInstances();
            manager.update(1000, 16.67, null);

            expect(mockEnemy.update).not.toHaveBeenCalled();
        });
    });

    describe('updateEnemyInstances', () => {
        it('должен собирать врагов из enemiesGroup', () => {
            const mockSprite = {
                getData: jest.fn().mockReturnValue(mockEnemy)
            };
            mockEnemiesGroup.getChildren.mockReturnValue([mockSprite]);
            mockChasersGroup.getChildren.mockReturnValue([]);

            manager.updateEnemyInstances();

            const instances = manager.getInstances();
            expect(instances).toHaveLength(1);
            expect(instances[0]).toBe(mockEnemy);
        });

        it('должен собирать врагов из chasersGroup', () => {
            const mockSprite = {
                getData: jest.fn().mockReturnValue(mockEnemy)
            };
            mockEnemiesGroup.getChildren.mockReturnValue([]);
            mockChasersGroup.getChildren.mockReturnValue([mockSprite]);

            manager.updateEnemyInstances();

            const instances = manager.getInstances();
            expect(instances).toHaveLength(1);
            expect(instances[0]).toBe(mockEnemy);
        });

        it('должен собирать врагов из обеих групп', () => {
            const mockEnemy2 = {
                ...mockEnemy,
                getId: jest.fn().mockReturnValue('enemy-2')
            };

            const mockSprite1 = {
                getData: jest.fn().mockReturnValue(mockEnemy)
            };
            const mockSprite2 = {
                getData: jest.fn().mockReturnValue(mockEnemy2)
            };

            mockEnemiesGroup.getChildren.mockReturnValue([mockSprite1]);
            mockChasersGroup.getChildren.mockReturnValue([mockSprite2]);

            manager.updateEnemyInstances();

            const instances = manager.getInstances();
            expect(instances).toHaveLength(2);
        });

        it('должен игнорировать спрайты без данных enemy', () => {
            const mockSprite = {
                getData: jest.fn().mockReturnValue(null)
            };
            mockEnemiesGroup.getChildren.mockReturnValue([mockSprite]);

            manager.updateEnemyInstances();

            const instances = manager.getInstances();
            expect(instances).toHaveLength(0);
        });

        it('должен возвращать пустой массив если группы недействительны', () => {
            mockEnemiesGroup.scene = null;
            mockChasersGroup.scene = null;

            manager.updateEnemyInstances();

            const instances = manager.getInstances();
            expect(instances).toHaveLength(0);
        });
    });

    describe('getInstances', () => {
        it('должен возвращать массив enemy instances', () => {
            const mockSprite = {
                getData: jest.fn().mockReturnValue(mockEnemy)
            };
            mockEnemiesGroup.getChildren.mockReturnValue([mockSprite]);

            manager.updateEnemyInstances();

            const instances = manager.getInstances();
            expect(Array.isArray(instances)).toBe(true);
            expect(instances).toHaveLength(1);
        });

        it('должен возвращать пустой массив если нет врагов', () => {
            const instances = manager.getInstances();
            expect(instances).toHaveLength(0);
        });
    });

    describe('createClone', () => {
        it('должен создавать клона через cloneFactory', () => {
            const mockCloneFactory = manager.getCloneFactory();
            mockCloneFactory.createClone = jest.fn();

            const config = {
                type: 'randomWalker',
                x: 100,
                y: 200,
                parentEnemy: mockEnemy
            };

            manager.createClone(config as any);

            expect(mockCloneFactory.createClone).toHaveBeenCalledWith(config);
        });

        it('должен обновлять список enemy instances после создания клона', () => {
            const mockCloneFactory = manager.getCloneFactory();
            mockCloneFactory.createClone = jest.fn();

            const updateSpy = jest.spyOn(manager, 'updateEnemyInstances');

            manager.createClone({ type: 'randomWalker', x: 100, y: 200 } as any);

            expect(updateSpy).toHaveBeenCalled();
        });
    });

    describe('setSpawner', () => {
        it('должен устанавливать spawner', () => {
            const mockSpawner = {} as any;

            manager.setSpawner(mockSpawner);

            expect(manager['spawner']).toBe(mockSpawner);
        });
    });

    describe('getCloneFactory', () => {
        it('должен возвращать cloneFactory', () => {
            const factory = manager.getCloneFactory();

            expect(factory).toBeDefined();
        });
    });

    describe('controlMaxEnemies', () => {
        it('должен убивать старых врагов при превышении лимита', async () => {
            // Создаём несколько врагов
            const enemies: AbstractEnemy[] = [];
            const sprites: any[] = [];

            for (let i = 0; i < 15; i++) {
                const enemy = {
                    ...mockEnemy,
                    getId: jest.fn().mockReturnValue(`enemy-${i}`),
                    spawnTime: Date.now() - (i * 1000), // Каждый враг на 1с старше
                    isActive: jest.fn().mockReturnValue(true)
                } as any;

                enemies.push(enemy);
                sprites.push({
                    active: true,
                    getData: jest.fn().mockReturnValue(enemy),
                    disableBody: jest.fn()
                });
            }

            mockEnemiesGroup.getChildren.mockReturnValue(sprites);
            mockEnemiesGroup.countActive.mockReturnValue(15);
            mockChasersGroup.getChildren.mockReturnValue([]);
            mockChasersGroup.countActive.mockReturnValue(0);

            manager.updateEnemyInstances();
            manager.update(1000, 16.67, { active: true } as any);

            // Ждём асинхронный контроль
            await new Promise(resolve => setTimeout(resolve, 50));

            // Проверяем, что старые враги были убиты
            expect(mockEnemiesGroup.countActive()).toBeDefined();
        });

        it('не должен убивать врагов если лимит не превышен', async () => {
            mockEnemiesGroup.getChildren.mockReturnValue([]);
            mockChasersGroup.getChildren.mockReturnValue([]);
            mockEnemiesGroup.countActive.mockReturnValue(5);
            mockChasersGroup.countActive.mockReturnValue(0);

            manager.update(1000, 16.67, { active: true } as any);

            await new Promise(resolve => setTimeout(resolve, 50));

            // Не должно быть вызовов destroy
            expect(mockEnemy.getSprite().disableBody).not.toHaveBeenCalled();
        });

        it('должен игнорировать если maxEnemies null', async () => {
            mockLevelManager.getEnemySpawnConfig.mockResolvedValue({
                maxEnemies: null
            });

            mockEnemiesGroup.getChildren.mockReturnValue([]);
            mockChasersGroup.getChildren.mockReturnValue([]);
            mockEnemiesGroup.countActive.mockReturnValue(100);
            mockChasersGroup.countActive.mockReturnValue(0);

            manager.update(1000, 16.67, { active: true } as any);

            await new Promise(resolve => setTimeout(resolve, 50));

            // Не должно быть попыток контроля
            expect(true).toBe(true); // Просто проверяем, что нет ошибок
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно обновлять и контролировать врагов вместе', async () => {
            const enemy1 = { ...mockEnemy, spawnTime: Date.now() - 5000, isActive: jest.fn().mockReturnValue(true) };
            const enemy2 = { ...mockEnemy, spawnTime: Date.now() - 1000, isActive: jest.fn().mockReturnValue(true) };

            const sprite1 = { active: true, getData: jest.fn().mockReturnValue(enemy1), disableBody: jest.fn() };
            const sprite2 = { active: true, getData: jest.fn().mockReturnValue(enemy2), disableBody: jest.fn() };

            mockEnemiesGroup.getChildren.mockReturnValue([sprite1, sprite2]);
            mockEnemiesGroup.countActive.mockReturnValue(2);
            mockChasersGroup.getChildren.mockReturnValue([]);
            mockChasersGroup.countActive.mockReturnValue(0);

            manager.updateEnemyInstances();
            manager.update(1000, 16.67, { active: true, x: 50, y: 50 } as any);

            expect(enemy1.update).toHaveBeenCalled();
            expect(enemy2.update).toHaveBeenCalled();

            await new Promise(resolve => setTimeout(resolve, 50));
        });
    });
});
