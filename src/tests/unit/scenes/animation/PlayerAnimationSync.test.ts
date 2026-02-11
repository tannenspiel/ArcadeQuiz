/**
 * Unit тесты для PlayerAnimationSync
 */

import { PlayerAnimationSync } from '../../../../game/scenes/animation/PlayerAnimationSync';
import { PlayerState } from '../../../../game/entities/Player';

// Моки для зависимостей
jest.mock('../../../../game/scenes/animation/AnimationSyncManager');

describe('PlayerAnimationSync', () => {
    let sync: PlayerAnimationSync;
    let mockScene: any;
    let mockPlayer: any;
    let mockPlayerSprite: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock player sprite
        mockPlayerSprite = {
            active: true,
            setFrame: jest.fn(),
            emit: jest.fn()
        };

        // Mock player
        mockPlayer = {
            getSprite: jest.fn().mockReturnValue(mockPlayerSprite),
            getState: jest.fn().mockReturnValue(PlayerState.IDLE)
        };

        // Mock scene
        mockScene = {
            player: mockPlayer,
            game: {
                loop: { delta: 16 }
            },
            time: {
                delayedCall: jest.fn((delay, callback) => {
                    if (callback) callback();
                    return { destroy: jest.fn() };
                })
            },
            anims: {
                get: jest.fn().mockReturnValue({
                    frames: [
                        { frame: 0 },
                        { frame: 1 },
                        { frame: 2 }
                    ],
                    frameRate: 12,
                    key: 'character_damaged'
                })
            }
        };

        sync = new PlayerAnimationSync(mockScene);
    });

    describe('update', () => {
        it('должен возвращаться если player не существует', () => {
            mockScene.player = null;

            expect(() => sync.update(16)).not.toThrow();
        });

        it('должен возвращаться если спрайт неактивен', () => {
            mockPlayerSprite.active = false;

            sync.update(16);

            expect(mockPlayerSprite.setFrame).not.toHaveBeenCalled();
        });

        it('должен синхронизировать DAMAGED состояние', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.DAMAGED);
            mockPlayerSprite._damageAnimationInitialized = false;

            sync.update(16);

            expect(mockPlayerSprite._damageAnimationInitialized).toBe(true);
        });

        it('не должен синхронизировать другие состояния', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.IDLE);

            sync.update(16);

            expect(mockPlayerSprite.setFrame).not.toHaveBeenCalled();
        });
    });

    describe('syncDamageAnimation', () => {
        it('должен возвращаться если анимация не существует', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.DAMAGED);
            mockScene.anims.get.mockReturnValue(null);

            sync.update(16);

            expect(mockPlayerSprite.setFrame).not.toHaveBeenCalled();
        });

        it('должен возвращаться если нет frames', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.DAMAGED);
            mockScene.anims.get.mockReturnValue({
                frames: [],
                frameRate: 12
            });

            sync.update(16);

            expect(mockPlayerSprite.setFrame).not.toHaveBeenCalled();
        });

        it('должен инициализировать таймеры при первом запуске', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.DAMAGED);
            mockPlayerSprite._damageAnimationInitialized = false;

            sync.update(16);

            expect(mockPlayerSprite._damageAnimationTimer).toBe(16);
            expect(mockPlayerSprite._damageAnimationFrameIndex).toBe(0);
            expect(mockPlayerSprite._damageAnimationInitialized).toBe(true);
        });

        it('должен обновлять таймер', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.DAMAGED);
            mockPlayerSprite._damageAnimationInitialized = true;
            mockPlayerSprite._damageAnimationTimer = 10;
            mockPlayerSprite._damageAnimationFrameIndex = 0;
            mockPlayerSprite._damageAnimationInterval = 1000 / 12;

            sync.update(16);

            // Таймер обновляется но не сбрасывается (не достигнут интервал)
            expect(mockPlayerSprite._damageAnimationTimer).toBe(26);
        });

        it('должен переключать кадр при достижении интервала', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.DAMAGED);
            mockPlayerSprite._damageAnimationInitialized = true;
            mockPlayerSprite._damageAnimationTimer = 84; // 1000/12 ≈ 83.33
            mockPlayerSprite._damageAnimationFrameIndex = 0;
            mockPlayerSprite._damageAnimationInterval = 1000 / 12;

            sync.update(16);

            // После достижения интервала: таймер сбрасывается в 0, кадр увеличивается
            expect(mockPlayerSprite._damageAnimationTimer).toBe(0);
            expect(mockPlayerSprite._damageAnimationFrameIndex).toBe(1);
        });

        it('должен останавливаться на последнем кадре', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.DAMAGED);
            mockPlayerSprite._damageAnimationInitialized = true;
            mockPlayerSprite._damageAnimationTimer = 84;
            mockPlayerSprite._damageAnimationFrameIndex = 2;
            mockPlayerSprite._damageAnimationInterval = 1000 / 12;

            sync.update(16);

            // На последнем кадре индекс не увеличивается
            expect(mockPlayerSprite._damageAnimationFrameIndex).toBe(2);
            expect(mockPlayerSprite._damageAnimationTimer).toBe(0);
        });

        it('должен вызывать setFrame', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.DAMAGED);
            mockPlayerSprite._damageAnimationInitialized = true;
            mockPlayerSprite._damageAnimationTimer = 84;
            mockPlayerSprite._damageAnimationFrameIndex = 1;
            mockPlayerSprite._damageAnimationInterval = 1000 / 12;

            sync.update(16);

            expect(mockPlayerSprite.setFrame).toHaveBeenCalledWith(2);
        });

        it('должен вызывать animationcomplete на последнем кадре', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.DAMAGED);
            mockPlayerSprite._damageAnimationInitialized = true;
            mockPlayerSprite._damageAnimationTimer = 84;
            mockPlayerSprite._damageAnimationFrameIndex = 2;
            mockPlayerSprite._damageAnimationInterval = 1000 / 12;

            sync.update(16);

            expect(mockScene.time.delayedCall).toHaveBeenCalled();
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

    describe('Интеграционные сценарии', () => {
        it('должен использовать gameLoop.delta если доступен', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.DAMAGED);
            mockScene.game.loop.delta = 32;
            mockPlayerSprite._damageAnimationInitialized = true;
            mockPlayerSprite._damageAnimationTimer = 0;
            mockPlayerSprite._damageAnimationFrameIndex = 0;
            mockPlayerSprite._damageAnimationInterval = 1000 / 12;

            sync.update(16);

            expect(mockPlayerSprite._damageAnimationTimer).toBe(32);
        });

        it('должен работать с событием animationcomplete', () => {
            mockPlayer.getState.mockReturnValue(PlayerState.DAMAGED);
            mockPlayerSprite._damageAnimationInitialized = true;
            mockPlayerSprite._damageAnimationTimer = 84;
            mockPlayerSprite._damageAnimationFrameIndex = 2;
            mockPlayerSprite._damageAnimationInterval = 1000 / 12;

            sync.update(16);

            expect(mockScene.time.delayedCall).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Function)
            );
        });
    });
});
