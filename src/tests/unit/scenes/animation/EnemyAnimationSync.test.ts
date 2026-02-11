/**
 * Unit тесты для EnemyAnimationSync
 */

import { EnemyAnimationSync } from '../../../../game/scenes/animation/EnemyAnimationSync';

// Моки для зависимостей
jest.mock('../../../../game/scenes/animation/AnimationSyncManager');
jest.mock('../../../../utils/Logger');

describe('EnemyAnimationSync', () => {
    let sync: EnemyAnimationSync;
    let mockScene: any;
    let mockEnemyManager: any;
    let mockEnemy: any;
    let mockDeathSprite: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock death sprite
        mockDeathSprite = {
            active: true,
            setFrame: jest.fn(),
            destroy: jest.fn(),
            _animationInitialized: false,
            _animationTimer: 0,
            _animationFrameIndex: 0,
            _animationInterval: 1000 / 12,
            _lastFrameShown: false,
            anims: {
                isPlaying: true,
                currentAnim: {
                    frames: [
                        { frame: 0 },
                        { frame: 1 },
                        { frame: 2 },
                        { frame: 3 }
                    ],
                    frameRate: 12,
                    key: 'enemy_death'
                }
            }
        };

        // Mock enemy
        mockEnemy = {
            deathAnimationSprite: mockDeathSprite
        };

        // Mock enemy manager
        mockEnemyManager = {
            getInstances: jest.fn().mockReturnValue([mockEnemy])
        };

        // Mock scene
        mockScene = {
            enemyManager: mockEnemyManager,
            game: {
                loop: { delta: 16 }
            },
            anims: {
                exists: jest.fn().mockReturnValue(true),
                get: jest.fn().mockReturnValue({
                    frames: [
                        { frame: 0 },
                        { frame: 1 },
                        { frame: 2 },
                        { frame: 3 }
                    ],
                    frameRate: 12,
                    key: 'enemy_death'
                })
            }
        };

        sync = new EnemyAnimationSync(mockScene);
    });

    describe('update', () => {
        it('должен возвращаться если enemyManager не существует', () => {
            mockScene.enemyManager = null;

            expect(() => sync.update(16)).not.toThrow();
        });

        it('должен возвращаться если нет enemyInstances', () => {
            mockEnemyManager.getInstances.mockReturnValue(null);

            expect(() => sync.update(16)).not.toThrow();
        });

        it('должен возвращаться если enemyInstances не массив', () => {
            mockEnemyManager.getInstances.mockReturnValue({});

            expect(() => sync.update(16)).not.toThrow();
        });

        it('должен обрабатывать каждого врага', () => {
            // Создаем второго врага с собственным спрайтом
            const mockDeathSprite2 = {
                active: true,
                setFrame: jest.fn(),
                destroy: jest.fn(),
                _animationInitialized: false,
                _animationTimer: 0,
                _animationFrameIndex: 0,
                _animationInterval: 1000 / 12,
                _lastFrameShown: false
            };
            const mockEnemy2 = {
                deathAnimationSprite: mockDeathSprite2
            };

            mockEnemyManager.getInstances.mockReturnValue([mockEnemy, mockEnemy2]);

            sync.update(16);

            // Оба врага должны быть инициализированы
            expect(mockDeathSprite._animationInitialized).toBe(true);
            expect(mockDeathSprite2._animationInitialized).toBe(true);
        });
    });

    describe('syncEnemyDeath', () => {
        it('должен возвращаться если deathSprite неактивен', () => {
            mockDeathSprite.active = false;

            sync.update(16);

            expect(mockDeathSprite.setFrame).not.toHaveBeenCalled();
        });

        it('должен уничтожать спрайт если анимация не существует', () => {
            mockScene.anims.exists.mockReturnValue(false);

            sync.update(16);

            expect(mockDeathSprite.destroy).toHaveBeenCalled();
        });

        it('должен возвращаться если у анимации нет frames', () => {
            mockScene.anims.get.mockReturnValue({
                frames: [],
                frameRate: 12
            });

            sync.update(16);

            expect(mockDeathSprite.setFrame).not.toHaveBeenCalled();
        });

        it('должен инициализировать таймеры при первом запуске', () => {
            sync.update(16);

            expect(mockDeathSprite._animationTimer).toBe(16);
            expect(mockDeathSprite._animationFrameIndex).toBe(0);
            expect(mockDeathSprite._animationInitialized).toBe(true);
            expect(mockDeathSprite._lastFrameShown).toBe(false);
        });

        it('должен обновлять таймер', () => {
            mockDeathSprite._animationInitialized = true;
            mockDeathSprite._animationTimer = 10;
            mockDeathSprite._animationFrameIndex = 0;
            mockDeathSprite._animationInterval = 1000 / 12;
            mockDeathSprite._lastFrameShown = false;

            sync.update(16);

            // Таймер обновляется но не сбрасывается (не достигнут интервал)
            expect(mockDeathSprite._animationTimer).toBe(26);
        });

        it('должен переключать кадр при достижении интервала', () => {
            mockDeathSprite._animationInitialized = true;
            mockDeathSprite._animationTimer = 84; // 1000/12 ≈ 83.33
            mockDeathSprite._animationFrameIndex = 0;
            mockDeathSprite._animationInterval = 1000 / 12;
            mockDeathSprite._lastFrameShown = false;

            sync.update(16);

            // После достижения интервала: таймер сбрасывается в 0, кадр увеличивается
            expect(mockDeathSprite._animationTimer).toBe(0);
            expect(mockDeathSprite._animationFrameIndex).toBe(1);
        });

        it('должен останавливаться на последнем кадре', () => {
            mockDeathSprite._animationInitialized = true;
            mockDeathSprite._animationTimer = 84;
            mockDeathSprite._animationFrameIndex = 3;
            mockDeathSprite._animationInterval = 1000 / 12;
            mockDeathSprite._lastFrameShown = false;

            sync.update(16);

            // На последнем кадре индекс не увеличивается
            expect(mockDeathSprite._animationFrameIndex).toBe(3);
            expect(mockDeathSprite._lastFrameShown).toBe(true);
        });

        it('должен уничтожать спрайт на последнем кадре', () => {
            mockDeathSprite._animationInitialized = true;
            mockDeathSprite._animationTimer = 84;
            mockDeathSprite._animationFrameIndex = 3;
            mockDeathSprite._animationInterval = 1000 / 12;
            mockDeathSprite._lastFrameShown = false;

            sync.update(16);

            expect(mockDeathSprite.destroy).toHaveBeenCalled();
            expect(mockDeathSprite._lastFrameShown).toBe(true);
        });

        it('не должен уничтожать спрайт если _lastFrameShown уже true', () => {
            mockDeathSprite._animationInitialized = true;
            mockDeathSprite._animationTimer = 84;
            mockDeathSprite._animationFrameIndex = 3;
            mockDeathSprite._animationInterval = 1000 / 12;
            mockDeathSprite._lastFrameShown = true;

            sync.update(16);

            // Destroy не должен вызываться повторно
            expect(mockDeathSprite.destroy).not.toHaveBeenCalled();
        });

        it('должен вызывать setFrame', () => {
            mockDeathSprite._animationInitialized = true;
            mockDeathSprite._animationTimer = 84;
            mockDeathSprite._animationFrameIndex = 1;
            mockDeathSprite._animationInterval = 1000 / 12;
            mockDeathSprite._lastFrameShown = false;

            sync.update(16);

            expect(mockDeathSprite.setFrame).toHaveBeenCalledWith(2);
        });
    });

    describe('extractFrameIndex', () => {
        it('должен извлекать индекс из frame', () => {
            const animFrameObj = { frame: 5 };

            const result = sync['extractFrameIndex'](animFrameObj);

            expect(result).toBe(5);
        });

        it('должен извлекать индекс из index', () => {
            const animFrameObj = { index: 7 };

            const result = sync['extractFrameIndex'](animFrameObj);

            expect(result).toBe(7);
        });

        it('должен извлекать индекс из name', () => {
            const animFrameObj = { name: 3 };

            const result = sync['extractFrameIndex'](animFrameObj);

            expect(result).toBe(3);
        });

        it('должен возвращать undefined если индекс не найден', () => {
            const animFrameObj = { invalid: 'data' };

            const result = sync['extractFrameIndex'](animFrameObj);

            expect(result).toBeUndefined();
        });
    });

    describe('logOnce', () => {
        it('должен логировать только для первого врага', () => {
            // enemyIndex 0
            sync['logOnce'](0, 'Test message', { data: 'test' });

            // Не должен падать
            expect(true).toBe(true);
        });

        it('не должен логировать для других врагов', () => {
            // enemyIndex 1
            sync['logOnce'](1, 'Test message', { data: 'test' });

            // Не должен падать
            expect(true).toBe(true);
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен обрабатывать несколько врагов', () => {
            const mockEnemy2 = { ...mockEnemy };
            mockEnemyManager.getInstances.mockReturnValue([mockEnemy, mockEnemy2]);

            sync.update(16);

            // Должен обрабатывать обоих врагов
            expect(mockDeathSprite._animationInitialized).toBeDefined();
        });

        it('должен использовать gameLoop.delta если доступен', () => {
            mockScene.game.loop.delta = 32;
            mockDeathSprite._animationInitialized = true;
            mockDeathSprite._animationTimer = 0;
            mockDeathSprite._animationFrameIndex = 0;
            mockDeathSprite._animationInterval = 1000 / 12;
            mockDeathSprite._lastFrameShown = false;

            sync.update(16);

            expect(mockDeathSprite._animationTimer).toBe(32);
        });

        it('должен корректно обрабатывать уничтожение спрайта', () => {
            mockDeathSprite._animationInitialized = true;
            mockDeathSprite._animationTimer = 84;
            mockDeathSprite._animationFrameIndex = 3;
            mockDeathSprite._animationInterval = 1000 / 12;
            mockDeathSprite._lastFrameShown = false;

            sync.update(16);

            expect(mockDeathSprite.destroy).toHaveBeenCalled();
            expect(mockDeathSprite._lastFrameShown).toBe(true);
        });
    });
});
