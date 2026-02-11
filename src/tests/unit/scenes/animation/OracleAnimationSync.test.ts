/**
 * Unit тесты для OracleAnimationSync
 */

import { OracleAnimationSync } from '../../../../game/scenes/animation/OracleAnimationSync';

// Моки для зависимостей
jest.mock('../../../../game/scenes/animation/AnimationSyncManager');

describe('OracleAnimationSync', () => {
    let sync: OracleAnimationSync;
    let mockScene: any;
    let mockOracle: any;
    let mockOracleSprite: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock oracle sprite
        mockOracleSprite = {
            active: true,
            _needsManualSync: true,
            anims: {
                isPlaying: true,
                currentAnim: {
                    frames: [
                        { frame: { index: 0 } },
                        { frame: { index: 1 } }
                    ],
                    frameRate: 12,
                    repeat: -1, // Looping
                    key: 'oracle_anim'
                }
            },
            setFrame: jest.fn(),
            emit: jest.fn()
        };

        // Mock oracle
        mockOracle = {
            getSprite: jest.fn().mockReturnValue(mockOracleSprite)
        };

        // Mock scene
        mockScene = {
            oracle: mockOracle,
            game: {
                loop: { delta: 16 }
            },
            time: {
                delayedCall: jest.fn((delay, callback) => {
                    if (callback) callback();
                    return { destroy: jest.fn() };
                })
            }
        };

        sync = new OracleAnimationSync(mockScene);
    });

    describe('update', () => {
        it('должен возвращаться если oracle не существует', () => {
            mockScene.oracle = null;

            expect(() => sync.update(16)).not.toThrow();
        });

        it('должен возвращаться если спрайт неактивен', () => {
            mockOracleSprite.active = false;

            sync.update(16);

            expect(mockOracleSprite.setFrame).not.toHaveBeenCalled();
        });

        it('должен возвращаться если _needsManualSync false', () => {
            mockOracleSprite._needsManualSync = false;

            sync.update(16);

            expect(mockOracleSprite.setFrame).not.toHaveBeenCalled();
        });

        it('должен инициализировать таймеры при первом запуске', () => {
            sync.update(16);

            expect(mockOracleSprite._animationTimer).toBe(16);
            expect(mockOracleSprite._animationFrameIndex).toBe(0);
            expect(mockOracleSprite._animationInitialized).toBe(true);
        });

        it('должен обновлять таймер', () => {
            mockOracleSprite._animationInitialized = true;
            mockOracleSprite._animationTimer = 10;
            mockOracleSprite._animationFrameIndex = 0;
            mockOracleSprite._animationInterval = 1000 / 12;

            sync.update(16);

            // Таймер обновляется но не сбрасывается (не достигнут интервал)
            expect(mockOracleSprite._animationTimer).toBe(26);
        });

        it('должен зацикливать кадры для loop анимации', () => {
            mockOracleSprite._animationInitialized = true;
            mockOracleSprite._animationTimer = 84; // 1000/12 ≈ 83.33
            mockOracleSprite._animationFrameIndex = 1;
            mockOracleSprite._animationInterval = 1000 / 12;

            sync.update(16);

            // Таймер вычитает интервал: 84 + 16 - 83.33 ≈ 16.67, но после вычитания становится примерно 0
            // (1 + 1) % 2 = 0
            expect(mockOracleSprite._animationFrameIndex).toBe(0);
        });

        it('должен останавливаться на последнем кадре для oneshot', () => {
            mockOracleSprite.anims.currentAnim.repeat = 0; // Oneshot
            mockOracleSprite._animationInitialized = true;
            mockOracleSprite._animationTimer = 84;
            mockOracleSprite._animationFrameIndex = 0;
            mockOracleSprite._animationInterval = 1000 / 12;

            sync.update(16);

            // Переходим к следующему кадру
            expect(mockOracleSprite._animationFrameIndex).toBe(1);
        });

        it('должен вызывать setFrame', () => {
            mockOracleSprite._animationInitialized = true;
            mockOracleSprite._animationTimer = 84;
            mockOracleSprite._animationFrameIndex = 0;
            mockOracleSprite._animationInterval = 1000 / 12;

            sync.update(16);

            expect(mockOracleSprite.setFrame).toHaveBeenCalled();
        });

        it('должен вызывать animationcomplete для последнего кадра oneshot', () => {
            mockOracleSprite.anims.currentAnim.repeat = 0;
            mockOracleSprite._animationInitialized = true;
            mockOracleSprite._animationTimer = 84;
            mockOracleSprite._animationFrameIndex = 1;
            mockOracleSprite._animationInterval = 1000 / 12;

            sync.update(16);

            expect(mockScene.time.delayedCall).toHaveBeenCalled();
        });
    });

    describe('extractFrameIndex', () => {
        it('должен извлекать индекс из index', () => {
            const animFrameObj = { index: 5 };

            const result = sync['extractFrameIndex'](animFrameObj);

            expect(result).toBe(5);
        });

        it('должен извлекать индекс из name (число)', () => {
            const animFrameObj = { name: 7 };

            const result = sync['extractFrameIndex'](animFrameObj);

            expect(result).toBe(7);
        });

        it('должен извлекать индекс из name (строка)', () => {
            const animFrameObj = { name: '3' };

            const result = sync['extractFrameIndex'](animFrameObj);

            expect(result).toBe(3);
        });

        it('должен возвращать undefined если индекс не найден', () => {
            const animFrameObj = { invalid: 'data' };

            const result = sync['extractFrameIndex'](animFrameObj);

            expect(result).toBeUndefined();
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен использовать gameLoop.delta если доступен', () => {
            mockScene.game.loop.delta = 32;
            mockOracleSprite._animationInitialized = true;
            mockOracleSprite._animationTimer = 0;
            mockOracleSprite._animationFrameIndex = 0;
            mockOracleSprite._animationInterval = 1000 / 12;

            sync.update(16);

            expect(mockOracleSprite._animationTimer).toBe(32);
        });

        it('должен работать с событием animationcomplete', () => {
            mockOracleSprite.anims.currentAnim.repeat = 0;
            mockOracleSprite._animationInitialized = true;
            mockOracleSprite._animationTimer = 84;
            mockOracleSprite._animationFrameIndex = 1;
            mockOracleSprite._animationInterval = 1000 / 12;

            sync.update(16);

            expect(mockScene.time.delayedCall).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Function)
            );
        });
    });
});
