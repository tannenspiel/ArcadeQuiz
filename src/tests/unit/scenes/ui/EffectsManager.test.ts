/**
 * Unit тесты для EffectsManager
 */

import { EffectsManager } from '../../../../game/scenes/ui/EffectsManager';
import { DEPTHS } from '../../../../constants/gameConstants';
import { Phaser } from '../../../../tests/mocks/phaser-mock';

// Мокаем Logger
jest.mock('../../../../utils/Logger', () => ({
    logger: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('EffectsManager', () => {
    let manager: EffectsManager;
    let mockDeps: any;
    let mockCallbacks: any;
    let mockPlayerSprite: any;
    let mockTextObject: any;
    let mockSpriteObject: any;
    let mockGraphicsObject: any;
    let capturedTimerCallbacks: any[] = [];

    beforeEach(() => {
        jest.clearAllMocks();
        capturedTimerCallbacks = [];

        // Suppress console logs
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        // Mock player sprite
        mockPlayerSprite = {
            active: true,
            x: 100,
            y: 200,
            alpha: 1,
            blendMode: Phaser.BlendModes.NORMAL,
            depth: 10,
            scaleX: 1,
            scaleY: 1,
            originX: 0.5,
            originY: 0.5,
            scrollFactorX: 1,
            scrollFactorY: 1,
            frame: { name: 'frame_0' },
            setBlendMode: jest.fn().mockImplementation(function(this: any, mode: number) {
                this.blendMode = mode;
                return this;
            }),
            setTint: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockImplementation(function(this: any, value: number) {
                this.alpha = value;
                return this;
            }),
            clearTint: jest.fn().mockReturnThis()
        };

        // Mock text object
        mockTextObject = {
            setOrigin: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setResolution: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        };

        // Mock sprite object
        mockSpriteObject = {
            setDepth: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setOrigin: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setBlendMode: jest.fn().mockReturnThis(),
            setTint: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setFrame: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            active: true,
            frame: { name: 'frame_0' }
        };

        // Mock graphics object
        mockGraphicsObject = {
            lineStyle: jest.fn().mockReturnThis(),
            strokeCircle: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        };

        // Mock player
        const mockPlayer = {
            getSprite: jest.fn().mockReturnValue(mockPlayerSprite)
        };

        // Mock scene
        const mockScene = {
            add: {
                text: jest.fn().mockReturnValue(mockTextObject),
                sprite: jest.fn().mockReturnValue(mockSpriteObject),
                graphics: jest.fn().mockReturnValue(mockGraphicsObject)
            },
            time: {
                addEvent: jest.fn().mockImplementation((config: any) => {
                    const mockTimer = {
                        destroy: jest.fn(),
                        callback: config.callback
                    };
                    capturedTimerCallbacks.push({
                        timer: mockTimer,
                        callback: config.callback,
                        delay: config.delay,
                        loop: config.loop
                    });
                    return mockTimer;
                })
            },
            cameras: {
                main: {
                    zoom: 1
                }
            }
        };

        // Mock tweens
        const mockTweens = {
            add: jest.fn().mockImplementation((config: any) => {
                // Simulate tween completion for destroy tests
                if (config.onComplete) {
                    setTimeout(() => config.onComplete(), 0);
                }
                return { destroy: jest.fn() };
            })
        };

        // Mock callbacks
        mockCallbacks = {
            onUpdateHUD: jest.fn(),
            getZoomCompensatedPosition: jest.fn().mockReturnValue({ x: 100, y: 200 })
        };

        mockDeps = {
            scene: mockScene,
            player: mockPlayer,
            tweens: mockTweens
        };

        manager = new EffectsManager(mockDeps, mockCallbacks);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('constructor', () => {
        it('должен создать экземпляр EffectsManager', () => {
            expect(manager).toBeInstanceOf(EffectsManager);
        });

        it('должен сохранить зависимости', () => {
            expect(manager['deps']).toBeDefined();
            expect(manager['deps'].scene).toBe(mockDeps.scene);
            expect(manager['deps'].player).toBe(mockDeps.player);
            expect(manager['deps'].tweens).toBe(mockDeps.tweens);
        });

        it('должен сохранить callbacks', () => {
            expect(manager['callbacks']).toBeDefined();
            expect(manager['callbacks'].onUpdateHUD).toBe(mockCallbacks.onUpdateHUD);
            expect(manager['callbacks'].getZoomCompensatedPosition).toBe(mockCallbacks.getZoomCompensatedPosition);
        });

        it('должен инициализировать timer intervals как null', () => {
            expect(manager['playerFlashLoseKeyInterval']).toBeNull();
            expect(manager['playerFlashGetKeyInterval']).toBeNull();
            expect(manager['playerFlashGetKeyPositionTimer']).toBeNull();
        });

        it('должен инициализировать sprites array как пустой', () => {
            expect(manager['playerFlashGetKeySprites']).toEqual([]);
        });
    });

    describe('showFloatingText', () => {
        it('должен создавать текстовый объект с правильными параметрами', () => {
            manager.showFloatingText(100, 200, 'Test', 0xffffff);

            expect(mockDeps.scene.add.text).toHaveBeenCalledWith(
                100,
                200,
                'Test',
                expect.objectContaining({
                    fontSize: '24px',
                    fontFamily: 'Nunito',
                    fontStyle: 'bold'
                })
            );
        });

        it('должен округлять координаты', () => {
            manager.showFloatingText(100.7, 200.3, 'Test', 0xffffff);

            expect(mockDeps.scene.add.text).toHaveBeenCalledWith(
                101,  // Math.round(100.7)
                200,  // Math.round(200.3)
                'Test',
                expect.any(Object)
            );
        });

        it('должен устанавливать правильный цвет', () => {
            manager.showFloatingText(100, 200, 'Test', 0xff0000);

            expect(mockDeps.scene.add.text).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.objectContaining({
                    color: '#ff0000'
                })
            );
        });

        it('должен устанавливать origin 0.5', () => {
            manager.showFloatingText(100, 200, 'Test', 0xffffff);

            expect(mockTextObject.setOrigin).toHaveBeenCalledWith(0.5);
        });

        it('должен устанавливать правильный depth', () => {
            manager.showFloatingText(100, 200, 'Test', 0xffffff);

            expect(mockTextObject.setDepth).toHaveBeenCalledWith(DEPTHS.SCREEN.EFFECTS);
        });

        it('должен устанавливать resolution 1', () => {
            manager.showFloatingText(100, 200, 'Test', 0xffffff);

            expect(mockTextObject.setResolution).toHaveBeenCalledWith(1);
        });

        it('должен компенсировать camera zoom', () => {
            mockDeps.scene.cameras.main.zoom = 2;
            manager.showFloatingText(100, 200, 'Test', 0xffffff);

            expect(mockTextObject.setScale).toHaveBeenCalledWith(0.5);  // 1 / 2
        });

        it('должен создавать tween для анимации текста', () => {
            manager.showFloatingText(100, 200, 'Test', 0xffffff);

            expect(mockDeps.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: mockTextObject,
                    alpha: 0,
                    y: 150,  // worldY - 50 = 200 - 50 = 150
                    duration: 1000
                })
            );
        });

        it('должен уничтожать текст после завершения tween', () => {
            let capturedOnComplete: (() => void) | null = null;
            mockDeps.tweens.add = jest.fn().mockImplementation((config: any) => {
                capturedOnComplete = config.onComplete;
                return { destroy: jest.fn() };
            });

            manager.showFloatingText(100, 200, 'Test', 0xffffff);

            // Manually call the tween's onComplete to simulate completion
            if (capturedOnComplete) capturedOnComplete();

            expect(mockTextObject.destroy).toHaveBeenCalled();
        });
    });

    describe('flashSprite', () => {
        it('должен устанавливать ADD blend mode', () => {
            const testSprite = {
                blendMode: Phaser.BlendModes.NORMAL,
                setBlendMode: jest.fn().mockReturnThis(),
                setTint: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis()
            };

            manager.flashSprite(testSprite as any);

            expect(testSprite.setBlendMode).toHaveBeenCalledWith(Phaser.BlendModes.ADD);
        });

        it('должен устанавливать tint', () => {
            const testSprite = {
                blendMode: Phaser.BlendModes.NORMAL,
                setBlendMode: jest.fn().mockReturnThis(),
                setTint: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis()
            };

            manager.flashSprite(testSprite as any, 0xff0000);

            expect(testSprite.setTint).toHaveBeenCalledWith(0xff0000);
        });

        it('должен использовать дефолтный цвет 0xffffff', () => {
            const testSprite = {
                blendMode: Phaser.BlendModes.NORMAL,
                setBlendMode: jest.fn().mockReturnThis(),
                setTint: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis()
            };

            manager.flashSprite(testSprite as any);

            expect(testSprite.setTint).toHaveBeenCalledWith(0xffffff);
        });

        it('должен создавать tween с yoyo', () => {
            const testSprite = {
                blendMode: Phaser.BlendModes.NORMAL,
                setBlendMode: jest.fn().mockReturnThis(),
                setTint: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis()
            };

            manager.flashSprite(testSprite as any);

            expect(mockDeps.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    alpha: 0.2,
                    duration: 100,
                    yoyo: true,
                    repeat: 4
                })
            );
        });

        it('должен восстанавливать оригинальный blend mode после завершения', () => {
            const testSprite = {
                blendMode: Phaser.BlendModes.NORMAL,
                setBlendMode: jest.fn().mockReturnThis(),
                setTint: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis(),
                clearTint: jest.fn().mockReturnThis()
            };

            let capturedOnComplete: (() => void) | null = null;
            mockDeps.tweens.add = jest.fn().mockImplementation((config: any) => {
                capturedOnComplete = config.onComplete;
                return { destroy: jest.fn() };
            });

            manager.flashSprite(testSprite as any);

            // Manually call the tween's onComplete to simulate completion
            if (capturedOnComplete) capturedOnComplete();

            expect(testSprite.setBlendMode).toHaveBeenCalledWith(Phaser.BlendModes.NORMAL);
        });

        it('должен вызывать clearTint после завершения', () => {
            const testSprite = {
                blendMode: Phaser.BlendModes.NORMAL,
                setBlendMode: jest.fn().mockReturnThis(),
                setTint: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis(),
                clearTint: jest.fn().mockReturnThis()
            };

            let capturedOnComplete: (() => void) | null = null;
            mockDeps.tweens.add = jest.fn().mockImplementation((config: any) => {
                capturedOnComplete = config.onComplete;
                return { destroy: jest.fn() };
            });

            manager.flashSprite(testSprite as any);

            // Manually call the tween's onComplete to simulate completion
            if (capturedOnComplete) capturedOnComplete();

            expect(testSprite.clearTint).toHaveBeenCalled();
        });

        it('должен вызывать onComplete callback если передан', () => {
            const testSprite = {
                blendMode: Phaser.BlendModes.NORMAL,
                setBlendMode: jest.fn().mockReturnThis(),
                setTint: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis(),
                clearTint: jest.fn().mockReturnThis()
            };

            const onComplete = jest.fn();
            let capturedOnComplete: (() => void) | null = null;
            mockDeps.tweens.add = jest.fn().mockImplementation((config: any) => {
                capturedOnComplete = config.onComplete;
                return { destroy: jest.fn() };
            });

            manager.flashSprite(testSprite as any, 0xffffff, 1000, onComplete);

            // Manually call the tween's onComplete to simulate completion
            if (capturedOnComplete) capturedOnComplete();

            expect(onComplete).toHaveBeenCalled();
        });
    });

    describe('flashPlayerLoseKey', () => {
        it('должен возвращаться рано если player sprite не активен', () => {
            mockDeps.player.getSprite.mockReturnValue({ active: false });

            manager.flashPlayerLoseKey();

            expect(mockDeps.scene.time.addEvent).not.toHaveBeenCalled();
        });

        it('должен возвращаться рано если player sprite null', () => {
            mockDeps.player.getSprite.mockReturnValue(null);

            manager.flashPlayerLoseKey();

            expect(mockDeps.scene.time.addEvent).not.toHaveBeenCalled();
        });

        it('должен уничтожать предыдущий интервал если существует', () => {
            const mockInterval = { destroy: jest.fn() };
            manager['playerFlashLoseKeyInterval'] = mockInterval as any;

            manager.flashPlayerLoseKey();

            expect(mockInterval.destroy).toHaveBeenCalled();
        });

        it('должен создавать timer interval с правильным delay', () => {
            manager.flashPlayerLoseKey();

            expect(mockDeps.scene.time.addEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    delay: 200,
                    loop: true
                })
            );
        });

        it('должен устанавливать красный tint при первой итерации', () => {
            manager.flashPlayerLoseKey();

            // Execute first callback
            capturedTimerCallbacks[0].callback();

            expect(mockPlayerSprite.setBlendMode).toHaveBeenCalledWith(Phaser.BlendModes.ADD);
            expect(mockPlayerSprite.setTint).toHaveBeenCalledWith(0xff0000);
            expect(mockPlayerSprite.setAlpha).toHaveBeenCalledWith(0.6);
        });

        it('должен чередовать tint при последующих итерациях', () => {
            manager.flashPlayerLoseKey();

            // First iteration - set red
            capturedTimerCallbacks[0].callback();
            expect(mockPlayerSprite.setTint).toHaveBeenCalledWith(0xff0000);

            // Second iteration - clear
            capturedTimerCallbacks[0].callback();
            expect(mockPlayerSprite.clearTint).toHaveBeenCalled();
        });

        it('должен завершаться после maxBlinks (10)', () => {
            manager.flashPlayerLoseKey();

            // Check that only one timer callback was captured
            expect(capturedTimerCallbacks.length).toBe(1);

            const callback = capturedTimerCallbacks[0].callback;

            // Execute 11 times (10 blinks + 1 restoration)
            for (let i = 0; i < 11; i++) {
                callback();
            }

            // After 11 calls:
            // - 10 blinks (each calls setBlendMode to toggle between ADD and original)
            // - 1 final call (when blinkCount >= 10) that restores original state
            // Total: 11 calls to setBlendMode
            expect(mockPlayerSprite.setBlendMode).toHaveBeenCalledTimes(11);
        });

        it('должен восстанавливать оригинальное состояние после завершения', () => {
            const originalAlpha = 0.8;
            const originalBlendMode = Phaser.BlendModes.MULTIPLY;
            mockPlayerSprite.alpha = originalAlpha;
            mockPlayerSprite.blendMode = originalBlendMode;

            manager.flashPlayerLoseKey();

            // Execute maxBlinks times
            for (let i = 0; i < 10; i++) {
                capturedTimerCallbacks[0].callback();
            }

            expect(mockPlayerSprite.setBlendMode).toHaveBeenCalledWith(originalBlendMode);
            expect(mockPlayerSprite.setAlpha).toHaveBeenCalledWith(originalAlpha);
        });
    });

    describe('flashPlayerGetKey', () => {
        it('должен возвращаться рано если player sprite не активен', () => {
            mockDeps.player.getSprite.mockReturnValue({ active: false });

            manager.flashPlayerGetKey();

            expect(mockDeps.scene.add.sprite).not.toHaveBeenCalled();
        });

        it('должен очищать предыдущие интервалы и спрайты', () => {
            const mockInterval = { destroy: jest.fn() };
            const mockSprite = { destroy: jest.fn(), active: true };
            manager['playerFlashGetKeyInterval'] = mockInterval as any;
            manager['playerFlashGetKeyPositionTimer'] = mockInterval as any;
            manager['playerFlashGetKeySprites'] = [mockSprite as any];

            manager.flashPlayerGetKey();

            expect(mockInterval.destroy).toHaveBeenCalledTimes(2);
            expect(mockSprite.destroy).toHaveBeenCalled();
            // After flashPlayerGetKey, new sprites are added (2 flash sprites)
            expect(manager['playerFlashGetKeySprites']).toHaveLength(2);
        });

        it('должен создавать два white flash sprites', () => {
            manager.flashPlayerGetKey();

            expect(mockDeps.scene.add.sprite).toHaveBeenCalledTimes(2);
        });

        it('должен устанавливать правильные свойства для flash sprites', () => {
            manager.flashPlayerGetKey();

            expect(mockSpriteObject.setDepth).toHaveBeenCalledWith(mockPlayerSprite.depth + 1);
            expect(mockSpriteObject.setScale).toHaveBeenCalledWith(1, 1);
            expect(mockSpriteObject.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
            expect(mockSpriteObject.setScrollFactor).toHaveBeenCalledWith(1, 1);
        });

        it('должен устанавливать ADD blend mode для flash sprites', () => {
            manager.flashPlayerGetKey();

            expect(mockSpriteObject.setBlendMode).toHaveBeenCalledWith(Phaser.BlendModes.ADD);
        });

        it('должен создавать position update timer', () => {
            manager.flashPlayerGetKey();

            const positionTimers = capturedTimerCallbacks.filter(t => t.delay === 16);
            expect(positionTimers).toHaveLength(1);
        });

        it('должен создавать flash interval timer', () => {
            manager.flashPlayerGetKey();

            const flashTimers = capturedTimerCallbacks.filter(t => t.delay === 100);
            expect(flashTimers).toHaveLength(1);
        });

        it('должен обновлять позицию flash sprites при вызове position update callback', () => {
            manager.flashPlayerGetKey();

            const positionTimer = capturedTimerCallbacks.find(t => t.delay === 16);
            expect(positionTimer).toBeDefined();

            // Change player position
            mockPlayerSprite.x = 150;
            mockPlayerSprite.y = 250;

            // Execute position update callback
            const result = positionTimer.callback();

            expect(mockSpriteObject.setPosition).toHaveBeenCalledWith(150, 250);
        });

        it('должен останавливать position update если sprite неактивен', () => {
            manager.flashPlayerGetKey();

            const positionTimer = capturedTimerCallbacks.find(t => t.delay === 16);
            mockPlayerSprite.active = false;

            const result = positionTimer.callback();

            expect(result).toBe(false);
        });

        it('должен чередовать видимость flash sprites', () => {
            manager.flashPlayerGetKey();

            const flashTimer = capturedTimerCallbacks.find(t => t.delay === 100);
            expect(flashTimer).toBeDefined();

            // Initially visible (flashCount = 1)
            // First callback hides (flashCount = 2, odd)
            flashTimer.callback();
            expect(mockSpriteObject.setVisible).toHaveBeenCalledWith(false);

            // Second callback shows (flashCount = 3, even)
            flashTimer.callback();
            expect(mockSpriteObject.setVisible).toHaveBeenCalledWith(true);
        });

        it('должен завершаться после maxFlashes (10)', () => {
            manager.flashPlayerGetKey();

            const flashTimer = capturedTimerCallbacks.find(t => t.delay === 100);

            // Execute 9 times (already started with 1)
            for (let i = 0; i < 9; i++) {
                flashTimer.callback();
            }

            // Check sprites are still being manipulated
            mockSpriteObject.setVisible.mockClear();
            flashTimer.callback();
            expect(mockSpriteObject.setVisible).not.toHaveBeenCalled();
        });

        it('должен уничтожать все ресурсы после завершения', () => {
            manager.flashPlayerGetKey();

            const flashTimer = capturedTimerCallbacks.find(t => t.delay === 100);

            // Execute maxFlashes times
            for (let i = 0; i < 10; i++) {
                flashTimer.callback();
            }

            expect(mockSpriteObject.destroy).toHaveBeenCalled();
            expect(manager['playerFlashGetKeySprites']).toEqual([]);
        });
    });

    describe('triggerRingLossEffect', () => {
        it('должен создавать graphics объект', () => {
            manager.triggerRingLossEffect(3);

            expect(mockDeps.scene.add.graphics).toHaveBeenCalled();
        });

        it('должен устанавливать line style', () => {
            manager.triggerRingLossEffect(2);

            expect(mockGraphicsObject.lineStyle).toHaveBeenCalledWith(4, 0x38a169, 1);
        });

        it('должен создавать круг с правильным radius', () => {
            manager.triggerRingLossEffect(3);

            // radius = 25 + (keyCount + 1) * 8 = 25 + 4 * 8 = 57
            expect(mockGraphicsObject.strokeCircle).toHaveBeenCalledWith(0, 0, 57);
        });

        it('должен вычислять radius для keyCount = 0', () => {
            manager.triggerRingLossEffect(0);

            // radius = 25 + (0 + 1) * 8 = 33
            expect(mockGraphicsObject.strokeCircle).toHaveBeenCalledWith(0, 0, 33);
        });

        it('должен устанавливать позицию кольца на позицию игрока', () => {
            manager.triggerRingLossEffect(2);

            expect(mockGraphicsObject.setPosition).toHaveBeenCalledWith(100, 200);
        });

        it('должен устанавливать depth кольца равным depth игрока', () => {
            manager.triggerRingLossEffect(2);

            expect(mockGraphicsObject.setDepth).toHaveBeenCalledWith(10);
        });

        it('должен создавать tween для анимации', () => {
            manager.triggerRingLossEffect(1);

            expect(mockDeps.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    alpha: 0,
                    scale: 1.2,
                    duration: 500
                })
            );
        });

        it('должен обновлять позицию кольца при onUpdate', () => {
            let onUpdateCallback: (() => void) | null = null;

            mockDeps.tweens.add = jest.fn().mockImplementation((config: any) => {
                onUpdateCallback = config.onUpdate;
                return { destroy: jest.fn() };
            });

            manager.triggerRingLossEffect(2);

            // Change player position
            mockPlayerSprite.x = 150;
            mockPlayerSprite.y = 250;

            // Execute onUpdate
            if (onUpdateCallback) onUpdateCallback();

            expect(mockGraphicsObject.setPosition).toHaveBeenCalledWith(150, 250);
        });

        it('должен уничтожать graphics после завершения tween', () => {
            let capturedOnComplete: (() => void) | null = null;
            mockDeps.tweens.add = jest.fn().mockImplementation((config: any) => {
                capturedOnComplete = config.onComplete;
                return { destroy: jest.fn() };
            });

            manager.triggerRingLossEffect(2);

            // Manually call the tween's onComplete to simulate completion
            if (capturedOnComplete) capturedOnComplete();

            expect(mockGraphicsObject.destroy).toHaveBeenCalled();
        });

        it('должен не обновлять позицию если sprite неактивен', () => {
            let onUpdateCallback: (() => void) | null = null;

            mockDeps.tweens.add = jest.fn().mockImplementation((config: any) => {
                onUpdateCallback = config.onUpdate;
                return { destroy: jest.fn() };
            });

            manager.triggerRingLossEffect(2);

            // Make sprite inactive
            mockPlayerSprite.active = false;

            // Execute onUpdate
            if (onUpdateCallback) onUpdateCallback();

            // Position should not be updated (only initial setPosition)
            expect(mockGraphicsObject.setPosition).toHaveBeenCalledTimes(1);
        });
    });

    describe('destroy', () => {
        it('должен уничтожать playerFlashLoseKeyInterval', () => {
            const mockInterval = { destroy: jest.fn() } as any;
            manager['playerFlashLoseKeyInterval'] = mockInterval;

            manager.destroy();

            expect(mockInterval.destroy).toHaveBeenCalled();
            expect(manager['playerFlashLoseKeyInterval']).toBeNull();
        });

        it('должен уничтожать playerFlashGetKeyInterval', () => {
            const mockInterval = { destroy: jest.fn() } as any;
            manager['playerFlashGetKeyInterval'] = mockInterval;

            manager.destroy();

            expect(mockInterval.destroy).toHaveBeenCalled();
            expect(manager['playerFlashGetKeyInterval']).toBeNull();
        });

        it('должен уничтожать playerFlashGetKeyPositionTimer', () => {
            const mockTimer = { destroy: jest.fn() } as any;
            manager['playerFlashGetKeyPositionTimer'] = mockTimer;

            manager.destroy();

            expect(mockTimer.destroy).toHaveBeenCalled();
            expect(manager['playerFlashGetKeyPositionTimer']).toBeNull();
        });

        it('должен уничтожать все sprites в playerFlashGetKeySprites', () => {
            const mockSprite1 = { destroy: jest.fn() } as any;
            const mockSprite2 = { destroy: jest.fn() } as any;
            manager['playerFlashGetKeySprites'] = [mockSprite1, mockSprite2];

            manager.destroy();

            expect(mockSprite1.destroy).toHaveBeenCalled();
            expect(mockSprite2.destroy).toHaveBeenCalled();
            expect(manager['playerFlashGetKeySprites']).toEqual([]);
        });

        it('должен корректно обрабатывать null sprites', () => {
            manager['playerFlashGetKeySprites'] = [null as any, { destroy: jest.fn() } as any, null as any];

            expect(() => manager.destroy()).not.toThrow();
        });

        it('должен вызывать destroy для всех sprites независимо от active статуса', () => {
            const activeSprite = { destroy: jest.fn(), active: true } as any;
            const inactiveSprite = { destroy: jest.fn(), active: false } as any;
            manager['playerFlashGetKeySprites'] = [activeSprite, inactiveSprite];

            manager.destroy();

            // Destroy calls destroy() on all sprites (using optional chaining ?.)
            expect(activeSprite.destroy).toHaveBeenCalled();
            expect(inactiveSprite.destroy).toHaveBeenCalled();
        });
    });

    describe('Интеграционные сценарии', () => {
        it('должен корректно инициализировать все состояния при создании', () => {
            const newManager = new EffectsManager(mockDeps, mockCallbacks);

            expect(newManager['playerFlashLoseKeyInterval']).toBeNull();
            expect(newManager['playerFlashGetKeyInterval']).toBeNull();
            expect(newManager['playerFlashGetKeyPositionTimer']).toBeNull();
            expect(newManager['playerFlashGetKeySprites']).toEqual([]);
        });

        it('должен корректно очищать все ресурсы при destroy', () => {
            const mockInterval = { destroy: jest.fn() } as any;
            const mockSprite = { destroy: jest.fn() } as any;

            manager['playerFlashLoseKeyInterval'] = mockInterval;
            manager['playerFlashGetKeyInterval'] = mockInterval;
            manager['playerFlashGetKeyPositionTimer'] = mockInterval;
            manager['playerFlashGetKeySprites'] = [mockSprite];

            manager.destroy();

            expect(manager['playerFlashLoseKeyInterval']).toBeNull();
            expect(manager['playerFlashGetKeyInterval']).toBeNull();
            expect(manager['playerFlashGetKeyPositionTimer']).toBeNull();
            expect(manager['playerFlashGetKeySprites']).toEqual([]);
        });

        it('должен обрабатывать множественные вызовы destroy без ошибок', () => {
            manager.destroy();
            expect(() => manager.destroy()).not.toThrow();
        });
    });
});
