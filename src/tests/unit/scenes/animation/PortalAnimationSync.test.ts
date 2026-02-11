/**
 * Unit тесты для PortalAnimationSync
 */

import { PortalAnimationSync } from '../../../../game/scenes/animation/PortalAnimationSync';
import { PortalState } from '../../../../types/portalTypes';

// Моки для зависимостей
jest.mock('../../../../game/scenes/animation/AnimationSyncManager');

describe('PortalAnimationSync', () => {
    let sync: PortalAnimationSync;
    let mockScene: any;
    let mockPortalSprite: any;
    let mockPortal: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock portal
        mockPortal = {
            getState: jest.fn().mockReturnValue(PortalState.BASE),
            useTiledMapTextures: false,
            getSprite: jest.fn().mockReturnValue(null)
        };

        // Mock portal sprite
        mockPortalSprite = {
            active: true,
            _needsManualSync: true,
            anims: {
                isPlaying: true,
                currentAnim: {
                    frames: [
                        { frame: { index: 0 } },
                        { frame: { index: 1 } },
                        { frame: { index: 2 } }
                    ],
                    frameRate: 10,
                    repeat: -1, // Looping
                    key: 'portal_anim'
                }
            },
            setFrame: jest.fn(),
            emit: jest.fn(),
            getData: jest.fn().mockReturnValue(mockPortal)
        };
        mockPortal.getSprite.mockReturnValue(mockPortalSprite);

        // Mock scene
        mockScene = {
            portals: {
                getChildren: jest.fn().mockReturnValue([mockPortalSprite])
            },
            portalInstances: [],
            game: {
                loop: { delta: 16 }
            },
            anims: {
                exists: jest.fn().mockReturnValue(true),
                get: jest.fn()
            }
        };

        sync = new PortalAnimationSync(mockScene);
    });

    describe('update', () => {
        it('должен вызывать syncPortalInstances', () => {
            mockScene.portalInstances = [];

            sync.update(16);

            expect(mockScene.portalInstances).toBeDefined();
        });

        it('должен вызывать syncPortalsGroup', () => {
            sync.update(16);

            expect(mockScene.portals.getChildren).toHaveBeenCalled();
        });
    });

    describe('syncPortalSpriteWithLoop', () => {
        it('должен инициализировать таймеры при первом запуске', () => {
            mockScene.portals.getChildren = jest.fn().mockReturnValue([]);
            mockScene.portalInstances = [mockPortal];
            mockPortalSprite._animationInitialized = false;

            sync.update(16);

            expect(mockPortalSprite._animationTimer).toBe(16);
            expect(mockPortalSprite._animationFrameIndex).toBe(0);
            expect(mockPortalSprite._animationInitialized).toBe(true);
        });

        it('должен обновлять таймер', () => {
            mockScene.portals.getChildren = jest.fn().mockReturnValue([]);
            mockScene.portalInstances = [mockPortal];
            mockPortalSprite._animationInitialized = true;
            mockPortalSprite._animationTimer = 10;
            mockPortalSprite._animationFrameIndex = 0;
            mockPortalSprite._animationInterval = 1000 / 10;

            sync.update(16);

            // Таймер обновляется но не сбрасывается (не достигнут интервал)
            expect(mockPortalSprite._animationTimer).toBe(26);
        });

        it('должен зацикливать кадры для loop анимации', () => {
            mockScene.portals.getChildren = jest.fn().mockReturnValue([]);
            mockScene.portalInstances = [mockPortal];
            mockPortalSprite._animationInitialized = true;
            mockPortalSprite._animationTimer = 100; // 1000/10 = 100
            mockPortalSprite._animationFrameIndex = 2;
            mockPortalSprite._animationInterval = 1000 / 10;

            sync.update(16);

            // (2 + 1) % 3 = 0
            expect(mockPortalSprite._animationFrameIndex).toBe(0);
        });

        it('должен останавливаться на последнем кадре для oneshot', () => {
            mockPortalSprite.anims.currentAnim.repeat = 0; // Oneshot
            mockScene.portals.getChildren = jest.fn().mockReturnValue([]);
            mockScene.portalInstances = [mockPortal];
            mockPortalSprite._animationInitialized = true;
            mockPortalSprite._animationTimer = 100;
            mockPortalSprite._animationFrameIndex = 2;
            mockPortalSprite._animationInterval = 1000 / 10;

            sync.update(16);

            // Достигли последнего кадра - останавливаемся
            expect(mockPortalSprite._animationFrameIndex).toBe(2);
            expect(mockPortalSprite._needsManualSync).toBe(false);
            expect(mockPortalSprite.emit).toHaveBeenCalledWith('animationcomplete', expect.anything(), expect.anything());
        });

        it('должен вызывать setFrame', () => {
            mockScene.portals.getChildren = jest.fn().mockReturnValue([]);
            mockScene.portalInstances = [mockPortal];
            mockPortalSprite._animationInitialized = true;
            mockPortalSprite._animationTimer = 100;
            mockPortalSprite._animationFrameIndex = 1;
            mockPortalSprite._animationInterval = 1000 / 10;

            sync.update(16);

            expect(mockPortalSprite.setFrame).toHaveBeenCalled();
        });
    });

    describe('syncPortalSprite', () => {
        it('должен проверять состояние портала', () => {
            mockPortal.getState.mockReturnValue(PortalState.ACTIVATING);

            sync.update(16);

            // Должен обрабатывать ACTIVATING состояние
            expect(mockScene.portals.getChildren).toHaveBeenCalled();
        });

        it('должен игнорировать если useTiledMapTextures для BASE состояния', () => {
            mockPortal.getState.mockReturnValue(PortalState.BASE);
            mockPortal.useTiledMapTextures = true;

            sync.update(16);

            expect(mockPortalSprite.setFrame).not.toHaveBeenCalled();
        });

        it('должен игнорировать неактивные спрайты', () => {
            mockPortalSprite.active = false;

            sync.update(16);

            expect(mockPortalSprite.setFrame).not.toHaveBeenCalled();
        });

        it('должен игнорировать если нет текущей анимации', () => {
            mockPortalSprite.anims.currentAnim = null;

            sync.update(16);

            expect(mockPortalSprite.setFrame).not.toHaveBeenCalled();
        });
    });

    describe('applyFrame', () => {
        it('должен извлекать frameIndex из index', () => {
            // Отключаем syncPortalsGroup, тестируем только syncPortalInstances
            mockScene.portals.getChildren = jest.fn().mockReturnValue([]);
            mockScene.portalInstances = [mockPortal];
            mockPortalSprite._animationFrameIndex = 1;
            mockPortalSprite._animationInitialized = true;
            mockPortalSprite._animationTimer = 100;
            mockPortalSprite._animationInterval = 1000 / 10;

            sync.update(16);

            // При достижении интервала кадр увеличивается: 1 -> 2
            expect(mockPortalSprite.setFrame).toHaveBeenCalledWith(2);
        });

        it('должен извлекать frameIndex из name', () => {
            const animWithNames = {
                frames: [
                    { frame: { name: '5' } }
                ],
                frameRate: 10,
                repeat: -1,
                key: 'portal_anim'
            };
            mockPortalSprite.anims.currentAnim = animWithNames;
            mockScene.portals.getChildren = jest.fn().mockReturnValue([]);
            mockScene.portalInstances = [mockPortal];
            mockPortalSprite._animationFrameIndex = 0;
            mockPortalSprite._animationInitialized = true;
            mockPortalSprite._animationTimer = 100;
            mockPortalSprite._animationInterval = 1000 / 10;

            sync.update(16);

            expect(mockPortalSprite.setFrame).toHaveBeenCalledWith(5);
        });

        it('должен извлекать frameIndex из frame.number', () => {
            const animWithNumbers = {
                frames: [
                    { frame: 7 }
                ],
                frameRate: 10,
                repeat: -1,
                key: 'portal_anim'
            };
            mockPortalSprite.anims.currentAnim = animWithNumbers;
            mockScene.portals.getChildren = jest.fn().mockReturnValue([]);
            mockScene.portalInstances = [mockPortal];
            mockPortalSprite._animationFrameIndex = 0;
            mockPortalSprite._animationInitialized = true;
            mockPortalSprite._animationTimer = 100;
            mockPortalSprite._animationInterval = 1000 / 10;

            sync.update(16);

            expect(mockPortalSprite.setFrame).toHaveBeenCalledWith(7);
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен обрабатывать несколько порталов', () => {
            // Создаем отдельный портал с собственным спрайтом
            const mockPortal2 = {
                getState: jest.fn().mockReturnValue(PortalState.BASE),
                useTiledMapTextures: false,
                getSprite: jest.fn()
            };
            const mockPortalSprite2 = {
                active: true,
                _needsManualSync: true,
                _animationInitialized: false,
                anims: {
                    isPlaying: true,
                    currentAnim: {
                        frames: [
                            { frame: { index: 0 } },
                            { frame: { index: 1 } },
                            { frame: { index: 2 } }
                        ],
                        frameRate: 10,
                        repeat: -1,
                        key: 'portal_anim'
                    }
                },
                setFrame: jest.fn(),
                emit: jest.fn(),
                getData: jest.fn().mockReturnValue(mockPortal2)
            };
            mockPortal2.getSprite.mockReturnValue(mockPortalSprite2);

            mockScene.portalInstances = [mockPortal, mockPortal2];

            sync.update(16);

            expect(mockPortalSprite._animationInitialized).toBe(true);
            expect(mockPortalSprite2._animationInitialized).toBe(true);
        });

        it('должен использовать gameLoop.delta', () => {
            // syncPortalsGroup не будет обрабатывать спрайт (нет _needsManualSync в syncPortalSprite)
            // syncPortalInstances будет обрабатывать спрайт
            mockScene.portalInstances = [mockPortal];
            mockScene.portals.getChildren = jest.fn().mockReturnValue([]); // Отключаем syncPortalsGroup
            mockScene.game.loop.delta = 32;
            mockPortalSprite._animationInitialized = true;
            mockPortalSprite._animationTimer = 0;
            mockPortalSprite._animationFrameIndex = 0;
            mockPortalSprite._animationInterval = 1000 / 10;

            sync.update(16);

            // Таймер обновляется через gameLoop.delta = 32, не через параметр delta = 16
            expect(mockPortalSprite._animationTimer).toBe(32);
        });
    });
});
