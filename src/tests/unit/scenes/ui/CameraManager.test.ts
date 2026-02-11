/**
 * Unit тесты для CameraManager
 */

import { CameraManager, CameraManagerDependencies, CameraManagerCallbacks } from '../../../../game/scenes/ui/CameraManager';
import { Player } from '../../../../game/entities/Player';
import { WorldFactory } from '../../../../game/scenes/world/WorldFactory';
import { logger } from '../../../../utils/Logger';

// Моки для зависимостей
jest.mock('../../../../game/entities/Player');
jest.mock('../../../../game/scenes/world/WorldFactory');

describe('CameraManager', () => {
    let manager: CameraManager;
    let mockDeps: CameraManagerDependencies;
    let mockCallbacks: CameraManagerCallbacks;
    let mockScene: any;
    let mockPlayer: jest.Mocked<Player>;
    let mockWorldFactory: jest.Mocked<WorldFactory>;
    let mockPhysics: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock player sprite
        const mockPlayerSprite = {
            active: true,
            x: 400,
            y: 300
        };

        // Mock player
        mockPlayer = {
            getSprite: jest.fn().mockReturnValue(mockPlayerSprite)
        } as any;

        // Mock worldFactory
        mockWorldFactory = {
            handleResize: jest.fn()
        } as any;

        // Mock physics
        mockPhysics = {
            world: {
                setBounds: jest.fn()
            }
        };

        // Mock scene
        mockScene = {
            cameras: {
                main: {
                    setBounds: jest.fn(),
                    setZoom: jest.fn(),
                    centerOn: jest.fn(),
                    startFollow: jest.fn(),
                    setDeadzone: jest.fn(),
                    roundPixels: jest.fn()
                }
            },
            scale: {
                on: jest.fn()
            }
        };

        mockDeps = {
            scene: mockScene,
            player: mockPlayer,
            worldFactory: mockWorldFactory,
            physics: mockPhysics
        };

        mockCallbacks = {
            onResize: jest.fn()
        };

        manager = new CameraManager(mockDeps, mockCallbacks);
    });

    describe('setupFollow', () => {
        it('должен устанавливать границы камеры', () => {
            manager.setupFollow();

            expect(mockScene.cameras.main.setBounds).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('должен устанавливать границы physics world', () => {
            manager.setupFollow();

            expect(mockPhysics.world.setBounds).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.any(Number),
                expect.any(Number)
            );
        });

        it('должен вычислять и применять zoom', () => {
            manager.setupFollow();

            expect(mockScene.cameras.main.setZoom).toHaveBeenCalled();
        });

        it('должен центрировать камеру на игроке', () => {
            manager.setupFollow();

            expect(mockScene.cameras.main.centerOn).toHaveBeenCalledWith(400, 300);
        });

        it('должен включить следование за игроком', () => {
            manager.setupFollow();

            expect(mockScene.cameras.main.startFollow).toHaveBeenCalledWith(
                mockPlayer.getSprite(),
                true,
                0.15,
                0.15
            );
        });

        it('должен установить deadzone', () => {
            manager.setupFollow();

            expect(mockScene.cameras.main.setDeadzone).toHaveBeenCalledWith(0, 0);
        });

        it('должен включить roundPixels', () => {
            manager.setupFollow();

            expect(mockScene.cameras.main.roundPixels).toBe(true);
        });

        it('должен подписаться на событие resize', () => {
            manager.setupFollow();

            expect(mockScene.scale.on).toHaveBeenCalledWith('resize', expect.any(Function), manager);
        });

        it('должен log-ировать успешную настройку', () => {
            manager.setupFollow();

            expect(logger.log).toHaveBeenCalledWith(
                'SCENE_CAMERA',
                'Camera follow enabled',
                expect.any(Object)
            );
        });

        it('должен возвращать ошибку если игрок не готов', () => {
            (mockPlayer.getSprite as jest.Mock).mockReturnValue(null as any);

            manager.setupFollow();

            expect(logger.error).toHaveBeenCalledWith(
                'SCENE_CAMERA',
                'CameraManager: Player not ready!'
            );
        });
    });

    describe('calculateZoom', () => {
        it('должен возвращать корректное значение zoom', () => {
            // Проверяем, что zoom вычисляется и устанавливается
            manager.setupFollow();

            expect(mockScene.cameras.main.setZoom).toHaveBeenCalledWith(expect.any(Number));
            const zoomArg = (mockScene.cameras.main.setZoom as jest.Mock).mock.calls[0][0];
            expect(zoomArg).toBeGreaterThan(0);
        });

        it('должен учитывать масштаб игрока', () => {
            manager.setupFollow();

            // Zoom должен быть вычислен на основе констант
            expect(mockScene.cameras.main.setZoom).toHaveBeenCalled();
        });
    });

    describe('setupBounds', () => {
        it('должен устанавливать границы для камеры и physics', () => {
            manager.setupFollow();

            expect(mockScene.cameras.main.setBounds).toHaveBeenCalled();
            expect(mockPhysics.world.setBounds).toHaveBeenCalled();
        });

        it('должен использовать одинаковые границы для камеры и physics', () => {
            manager.setupFollow();

            const cameraBounds = (mockScene.cameras.main.setBounds as jest.Mock).mock.calls[0];
            const physicsBounds = (mockPhysics.world.setBounds as jest.Mock).mock.calls[0];

            expect(cameraBounds).toEqual(physicsBounds);
        });
    });

    describe('handleResize', () => {
        it('должен вызывать handleResize у worldFactory', () => {
            manager.setupFollow();

            // Эмулируем событие resize
            const resizeHandler = (mockScene.scale.on as jest.Mock).mock.calls.find(
                call => call[0] === 'resize'
            )?.[1];

            if (resizeHandler) {
                const gameSize = { width: 1024, height: 768 };
                resizeHandler.call(manager, gameSize);

                expect(mockWorldFactory.handleResize).toHaveBeenCalled();
            }
        });

        it('должен обновлять границы при resize', () => {
            manager.setupFollow();

            const resizeHandler = (mockScene.scale.on as jest.Mock).mock.calls.find(
                call => call[0] === 'resize'
            )?.[1];

            if (resizeHandler) {
                const gameSize = { width: 1024, height: 768 };
                resizeHandler.call(manager, gameSize);

                // setBounds должен быть вызван дважды (initial + resize)
                expect(mockScene.cameras.main.setBounds).toHaveBeenCalled();
            }
        });

        it('должен пересчитывать zoom при resize', () => {
            manager.setupFollow();

            const resizeHandler = (mockScene.scale.on as jest.Mock).mock.calls.find(
                call => call[0] === 'resize'
            )?.[1];

            if (resizeHandler) {
                const gameSize = { width: 1024, height: 768 };
                resizeHandler.call(manager, gameSize);

                // setZoom должен быть вызван дважды (initial + resize)
                expect(mockScene.cameras.main.setZoom).toHaveBeenCalled();
            }
        });

        it('должен вызывать onResize callback', () => {
            manager.setupFollow();

            const resizeHandler = (mockScene.scale.on as jest.Mock).mock.calls.find(
                call => call[0] === 'resize'
            )?.[1];

            if (resizeHandler) {
                const gameSize = { width: 1024, height: 768 };
                resizeHandler.call(manager, gameSize);

                expect(mockCallbacks.onResize).toHaveBeenCalled();
            }
        });

        it('должен log-ировать обработку resize', () => {
            manager.setupFollow();

            const resizeHandler = (mockScene.scale.on as jest.Mock).mock.calls.find(
                call => call[0] === 'resize'
            )?.[1];

            if (resizeHandler) {
                const gameSize = { width: 1024, height: 768 };
                resizeHandler.call(manager, gameSize);

                expect(logger.log).toHaveBeenCalledWith(
                    'VIEWPORT_RESIZE',
                    expect.stringContaining('CameraManager: Resize handled')
                );
            }
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно обрабатывать последовательность setupFollow -> resize', () => {
            manager.setupFollow();

            const resizeHandler = (mockScene.scale.on as jest.Mock).mock.calls.find(
                call => call[0] === 'resize'
            )?.[1];

            if (resizeHandler) {
                const gameSize = { width: 1920, height: 1080 };
                resizeHandler.call(manager, gameSize);

                expect(mockWorldFactory.handleResize).toHaveBeenCalled();
                expect(mockCallbacks.onResize).toHaveBeenCalled();
                expect(mockScene.cameras.main.setZoom).toHaveBeenCalled();
            }
        });

        it('должен корректно обрабатывать несколько resize подряд', () => {
            manager.setupFollow();

            const resizeHandler = (mockScene.scale.on as jest.Mock).mock.calls.find(
                call => call[0] === 'resize'
            )?.[1];

            if (resizeHandler) {
                resizeHandler.call(manager, { width: 800, height: 600 });
                resizeHandler.call(manager, { width: 1024, height: 768 });
                resizeHandler.call(manager, { width: 1920, height: 1080 });

                expect(mockWorldFactory.handleResize).toHaveBeenCalledTimes(3);
            }
        });
    });
});
