
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import LoadingScene from '../../../game/scenes/LoadingScene';
import { createMockScene } from '../../helpers/mocks';
import { KEYS } from '../../../constants/gameConstants';

// Mock dependencies
jest.mock('../../../game/systems/AnimationManager');
jest.mock('../../../game/core/AssetLoader');
jest.mock('../../../game/core/LevelManager');
jest.mock('../../../game/core/GameState');
jest.mock('../../../utils/Logger');

describe('LoadingScene', () => {
    let scene: LoadingScene;
    let mockSceneComponents: any;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create scene instance
        scene = new LoadingScene();

        // Setup mock components using helper
        mockSceneComponents = createMockScene();
        // Use Object.defineProperty instead of Object.assign for readonly properties
        Object.keys(mockSceneComponents).forEach(key => {
            Object.defineProperty(scene, key, {
                value: mockSceneComponents[key],
                writable: true,
                configurable: true,
            });
        });

        // Mock scale properties used in createLoadingUI
        scene.scale = {
            width: 1280,
            height: 720,
            gameSize: { width: 1280, height: 720 }
        } as any;

        // Mock cameras.main for screen dimensions
        scene.cameras = {
            main: {
                width: 1280,
                height: 720
            }
        } as any;

        // Mock add factory methods
        scene.add.rectangle = jest.fn().mockReturnValue({ setOrigin: jest.fn().mockReturnThis() }) as any;
        scene.add.text = jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setText: jest.fn().mockReturnThis()
        }) as any;

        // Mock load methods
        scene.load.image = jest.fn().mockReturnThis() as any;
        scene.load.spritesheet = jest.fn().mockReturnThis() as any;
        scene.load.audio = jest.fn().mockReturnThis() as any; // ✅ Added for audio loading
        scene.load.json = jest.fn().mockReturnThis() as any;
        scene.load.on = jest.fn().mockReturnThis() as any;
        scene.load.start = jest.fn().mockReturnThis() as any;
        scene.load.once = jest.fn().mockReturnThis() as any; // Important for 'complete' handler

        // Mock make.graphics for texture generation
        scene.make = {
            graphics: jest.fn().mockReturnValue({
                fillStyle: jest.fn(),
                fillRect: jest.fn(),
                lineStyle: jest.fn(),
                strokeRect: jest.fn(),
                fillCircle: jest.fn(),
                strokeCircle: jest.fn(),
                generateTexture: jest.fn(),
                clear: jest.fn(),
            })
        } as any;

        // Mock time.delayedCall
        scene.time.delayedCall = jest.fn() as any;

        // Mock scene.scene.start and scene.scene.launch for scene transitions
        scene.scene = {
            start: jest.fn(),
            launch: jest.fn()
        } as any;
    });

    it('should be defined', () => {
        expect(scene).toBeDefined();
    });

    describe('preload', () => {
        it('should initialize systems and start loading', () => {
            // Spy on private/protected methods by casting to any
            const initSystemsSpy = jest.spyOn(scene as any, 'initBaseSystems');
            const createUISpy = jest.spyOn(scene as any, 'createLoadingUI');
            const startLoadingSpy = jest.spyOn(scene as any, 'startLoading');

            scene.preload();

            expect(initSystemsSpy).toHaveBeenCalled();
            expect(createUISpy).toHaveBeenCalled();
            expect(startLoadingSpy).toHaveBeenCalled();
        });
    });

    describe('createLoadingUI', () => {
        it('should create background and progress bars', () => {
            // Call private method
            (scene as any).createLoadingUI();

            // Check background creation
            expect(scene.add.rectangle).toHaveBeenCalledWith(
                640, 360, 1280, 720, expect.any(Number)
            );

            // Check text creation (title, loadingText, progressText)
            expect(scene.add.text).toHaveBeenCalledTimes(3);
        });
    });

    describe('startLoading', () => {
        it('should load textures and spritesheets', () => {
            (scene as any).startLoading();

            expect(scene.make.graphics).toHaveBeenCalled(); // Texture generation

            // Static assets
            expect(scene.load.spritesheet).toHaveBeenCalledWith(KEYS.BG_GRASS_SHEET, expect.stringContaining('Bg.Grass.64x64.png'), expect.any(Object));
            expect(scene.load.spritesheet).toHaveBeenCalledWith(KEYS.COLLISION_BUSH_SHEET, expect.stringContaining('Bush'), expect.any(Object));
            expect(scene.load.image).toHaveBeenCalledWith(KEYS.ORACLE, expect.stringContaining('Oracle.Base'));

            // Dynamic Level Assets Loop (MAX_LEVELS = 2)
            // Level 1
            expect(scene.load.image).toHaveBeenCalledWith('map_bg_standard_l1', expect.stringContaining('Level1'));
            // NOTE: Level configs are loaded via dynamic import in loadLevelConfigs(), not via this.load.json()

            // Level 2
            expect(scene.load.image).toHaveBeenCalledWith('map_bg_standard_l2', expect.stringContaining('Level2'));
            // NOTE: Level configs are loaded via dynamic import in loadLevelConfigs(), not via this.load.json()
        });

        it('should setup progress event handler', () => {
            (scene as any).startLoading();

            expect(scene.load.on).toHaveBeenCalledWith('progress', expect.any(Function));
        });

        it('should setup complete event handler', () => {
            (scene as any).startLoading();

            expect(scene.load.once).toHaveBeenCalledWith('complete', expect.any(Function));
            expect(scene.load.start).toHaveBeenCalled();
        });

        it('should handle load complete', async () => {
            (scene as any).startLoading();

            const completeCalls = (scene.load.once as jest.Mock).mock.calls;
            const completeHandler = completeCalls.find(call => call[0] === 'complete')?.[1] as Function;

            // Setup dependency mocks that are called inside the handler
            (scene as any).loadLevelConfigs = jest.fn().mockResolvedValue(undefined);
            (scene as any).loadLevelQuestions = jest.fn().mockResolvedValue(undefined);

            // Execute handler
            await completeHandler();

            expect((scene as any).loadLevelConfigs).toHaveBeenCalled();
            expect((scene as any).loadLevelQuestions).toHaveBeenCalled();
            // Note: setTimeout is called in the handler but we can't easily test it
            // since it happens after the async operations complete
            // The setTimeout callback handles DOM cleanup and scene transition
        });

        it('should handle load error for heart texture', () => {
            // Тест проверяет что обработчик ошибок注册рируется
            (scene as any).startLoading();

            const errorCalls = (scene.load.once as jest.Mock).mock.calls;
            const errorHandler = errorCalls.find(call => call[0] === 'loaderror');

            expect(errorHandler).toBeDefined();
        });
    });

    describe('setProgress', () => {
        it('should update progress bar width', () => {
            const mockProgressBar = { width: 0 };
            (scene as any).progressBar = mockProgressBar;

            scene.setProgress(50, 'Loading...');

            expect(mockProgressBar.width).toBe(200); // BAR_WIDTH * 50% = 200
        });

        it('should clamp progress to 0-100 range', () => {
            const mockProgressBar = { width: 0 };
            (scene as any).progressBar = mockProgressBar;

            scene.setProgress(150, 'Over 100%');
            expect(mockProgressBar.width).toBe(400); // BAR_WIDTH * 100% = 400

            scene.setProgress(-10, 'Negative');
            expect(mockProgressBar.width).toBe(0);
        });

        it('should not update when isFinishing is true', () => {
            (scene as any).isFinishing = true;
            const mockProgressBar = { width: 0 };
            (scene as any).progressBar = mockProgressBar;

            scene.setProgress(50, 'Loading...');

            expect(mockProgressBar.width).toBe(0);
        });

        it('should update DOM loading text', () => {
            const mockDomText = { textContent: '' };
            (scene as any).domLoadingText = mockDomText;

            scene.setProgress(25, 'Test text');

            expect(mockDomText.textContent).toBe('Test text');
        });

        it('should update DOM progress text', () => {
            const mockProgressText = { textContent: '' };
            (scene as any).domProgressText = mockProgressText;

            scene.setProgress(75, 'Loading');

            expect(mockProgressText.textContent).toBe('75%');
        });
    });

    describe('finishLoading', () => {
        it('should call setProgress method', () => {
            const freshScene = new LoadingScene();
            freshScene.setProgress = jest.fn();

            freshScene.finishLoading();

            expect(freshScene.setProgress).toHaveBeenCalledWith(100, 'Готово!');
        });

        it('should be callable without errors', () => {
            const freshScene = new LoadingScene();
            expect(() => freshScene.finishLoading()).not.toThrow();
        });
    });

    describe('generateBaseTextures', () => {
        it('should generate base textures', () => {
            const mockGraphics = {
                fillStyle: jest.fn().mockReturnThis(),
                fillRect: jest.fn().mockReturnThis(),
                lineStyle: jest.fn().mockReturnThis(),
                strokeRect: jest.fn().mockReturnThis(),
                fillCircle: jest.fn().mockReturnThis(),
                strokeCircle: jest.fn().mockReturnThis(),
                generateTexture: jest.fn().mockReturnThis(),
                clear: jest.fn().mockReturnThis(),
            };

            scene.make = { graphics: jest.fn().mockReturnValue(mockGraphics) } as any;

            (scene as any).generateBaseTextures();

            expect(mockGraphics.generateTexture).toHaveBeenCalled();
        });

        it('should create TILE texture', () => {
            const mockGraphics = {
                fillStyle: jest.fn().mockReturnThis(),
                fillRect: jest.fn().mockReturnThis(),
                lineStyle: jest.fn().mockReturnThis(),
                strokeRect: jest.fn().mockReturnThis(),
                fillCircle: jest.fn().mockReturnThis(),
                strokeCircle: jest.fn().mockReturnThis(),
                generateTexture: jest.fn().mockReturnThis(),
                clear: jest.fn().mockReturnThis(),
            };

            scene.make = { graphics: jest.fn().mockReturnValue(mockGraphics) } as any;

            (scene as any).generateBaseTextures();

            expect(mockGraphics.generateTexture).toHaveBeenCalledWith(KEYS.TILE, 16, 16);
        });
    });

    describe('createDOMTextOverlay', () => {
        it('should create DOM overlay elements', () => {
            const createElementSpy = jest.spyOn(document, 'createElement');
            const appendChildSpy = jest.spyOn(document.body, 'appendChild');

            (scene as any).createDOMTextOverlay();

            expect(createElementSpy).toHaveBeenCalledWith('div');
            expect(appendChildSpy).toHaveBeenCalled();
        });

        it('should remove existing overlays before creating new one', () => {
            const mockOverlay = document.createElement('div');
            mockOverlay.setAttribute('data-loading-overlay', 'true');
            document.body.appendChild(mockOverlay);

            const removeChildSpy = jest.spyOn(document.body, 'removeChild');

            (scene as any).createDOMTextOverlay();

            expect(removeChildSpy).toHaveBeenCalledWith(mockOverlay);
        });
    });

    describe('setupEventBusListeners', () => {
        it('should subscribe to progress events', () => {
            const EventBus = require('../../../game/EventBus').EventBus;
            const onSpy = jest.spyOn(EventBus, 'on');

            (scene as any).setupEventBusListeners();

            expect(onSpy).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should be defined and callable', () => {
            expect(() => scene.update()).not.toThrow();
        });
    });

    describe('create', () => {
        it('should bring LoadingScene to top', () => {
            scene.scene = {
                bringToTop: jest.fn()
            } as any;

            scene.create();

            expect(scene.scene.bringToTop).toHaveBeenCalled();
        });
    });
});
