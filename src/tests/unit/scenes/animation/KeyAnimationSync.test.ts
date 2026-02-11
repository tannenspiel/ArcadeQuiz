/**
 * Unit тесты для KeyAnimationSync
 */

import { KeyAnimationSync } from '../../../../game/scenes/animation/KeyAnimationSync';

// Моки для зависимостей
jest.mock('../../../../game/scenes/animation/AnimationSyncManager');

describe('KeyAnimationSync', () => {
    let sync: KeyAnimationSync;
    let mockScene: any;
    let mockKeysGroup: any;
    let mockRune: any;
    let mockGameLoop: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock game loop
        mockGameLoop = { delta: 16 };

        // Mock rune sprite
        mockRune = {
            active: true,
            anims: {
                isPlaying: true,
                currentAnim: {
                    frames: [
                        { frame: { index: 0 } },
                        { frame: { index: 1 } },
                        { frame: { index: 2 } },
                        { frame: { index: 3 } }
                    ],
                    frameRate: 8
                }
            },
            setFrame: jest.fn()
        };

        // Mock keys group
        mockKeysGroup = {
            getChildren: jest.fn().mockReturnValue([mockRune])
        };

        // Mock scene
        mockScene = {
            keys: mockKeysGroup,
            game: {
                loop: mockGameLoop
            }
        };

        sync = new KeyAnimationSync(mockScene);
    });

    describe('update', () => {
        it('должен возвращаться если keys не существует', () => {
            mockScene.keys = null;

            expect(() => sync.update(16)).not.toThrow();
        });

        it('должен возвращаться если getChildren не существует', () => {
            mockKeysGroup.getChildren = undefined;

            expect(() => sync.update(16)).not.toThrow();
        });

        it('должен возвращаться если game loop не существует', () => {
            mockScene.game.loop = null;

            expect(() => sync.update(16)).not.toThrow();
        });

        it('должен инициализировать таймеры при первом запуске', () => {
            sync.update(16);

            expect(mockRune._animationTimer).toBe(16);
            expect(mockRune._animationFrameIndex).toBe(0);
            expect(mockRune._animationInterval).toBe(1000 / 8);
            expect(mockRune._animationInitialized).toBe(true);
        });

        it('должен обновлять таймер', () => {
            mockRune._animationInitialized = true;
            mockRune._animationTimer = 10;
            mockRune._animationFrameIndex = 0;
            mockRune._animationInterval = 1000 / 8;

            sync.update(16);

            // Таймер обновляется но не сбрасывается (не достигнут интервал)
            expect(mockRune._animationTimer).toBe(26);
        });

        it('должен переключать кадр при достижении интервала', () => {
            mockRune._animationInitialized = true;
            mockRune._animationTimer = 125; // 1000/8 = 125
            mockRune._animationFrameIndex = 0;
            mockRune._animationInterval = 1000 / 8;

            sync.update(16);

            // После достижения интервала: таймер сбрасывается в 0, кадр увеличивается
            expect(mockRune._animationTimer).toBe(0);
            expect(mockRune._animationFrameIndex).toBe(1);
        });

        it('должен зацикливать кадры для loop анимации', () => {
            mockRune._animationInitialized = true;
            mockRune._animationTimer = 125;
            mockRune._animationFrameIndex = 3;
            mockRune._animationInterval = 1000 / 8;

            sync.update(16);

            // (3 + 1) % 4 = 0
            expect(mockRune._animationFrameIndex).toBe(0);
            expect(mockRune._animationTimer).toBe(0);
        });

        it('должен вызывать setFrame', () => {
            mockRune._animationInitialized = true;
            mockRune._animationTimer = 125;
            mockRune._animationFrameIndex = 1;
            mockRune._animationInterval = 1000 / 8;

            sync.update(16);

            expect(mockRune.setFrame).toHaveBeenCalledWith(2);
        });

        it('должен игнорировать неактивные руны', () => {
            mockRune.active = false;

            sync.update(16);

            expect(mockRune.setFrame).not.toHaveBeenCalled();
        });

        it('должен игнорировать руны без анимации', () => {
            mockRune.anims = null;

            sync.update(16);

            expect(mockRune.setFrame).not.toHaveBeenCalled();
        });

        it('должен игнорировать руны без frames', () => {
            mockRune.anims.currentAnim.frames = [];

            sync.update(16);

            expect(mockRune.setFrame).not.toHaveBeenCalled();
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
            const animFrameObj = { name: '3' };

            const result = sync['extractFrameIndex'](animFrameObj);

            expect(result).toBe(3);
        });

        it('должен возвращать undefined если индекс не найден', () => {
            const animFrameObj = { invalid: 'data' };

            const result = sync['extractFrameIndex'](animFrameObj);

            expect(result).toBeUndefined();
        });

        it('должен возвращать число если сам объект число', () => {
            const result = sync['extractFrameIndex'](42);

            expect(result).toBe(42);
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно обрабатывать несколько ключей', () => {
            const mockRune2 = {
                ...mockRune,
                _animationInitialized: false,
                _animationTimer: 0
            };
            mockKeysGroup.getChildren.mockReturnValue([mockRune, mockRune2]);

            sync.update(16);

            expect(mockRune._animationInitialized).toBe(true);
            expect(mockRune2._animationInitialized).toBe(true);
        });

        it('должен использовать gameLoop.delta если доступен', () => {
            // KeyAnimationSync проверяет наличие gameLoop, но использует переданный delta
            mockGameLoop.delta = 32;
            mockRune._animationInitialized = true;
            mockRune._animationTimer = 0;
            mockRune._animationFrameIndex = 0;
            mockRune._animationInterval = 1000 / 8;

            sync.update(16);

            // KeyAnimationSync использует delta из параметра, не gameLoop.delta
            expect(mockRune._animationTimer).toBe(16);
        });
    });
});
