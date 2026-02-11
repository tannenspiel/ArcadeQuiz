
import { AnimationManager } from '../../../game/systems/AnimationManager';
import { ASSETS_BASE_PATH } from '../../../config/gameConfig';
import { SpritesheetLayout } from '../../../types/animationTypes';

describe('AnimationManager', () => {
    let animationManager: AnimationManager;
    let mockScene: any;

    beforeEach(() => {
        mockScene = {
            load: {
                spritesheet: jest.fn()
            },
            textures: {
                exists: jest.fn(),
                get: jest.fn()
            },
            anims: {
                exists: jest.fn(),
                create: jest.fn(),
                generateFrameNumbers: jest.fn(),
                get: jest.fn()
            }
        };

        animationManager = new AnimationManager(mockScene);
    });

    describe('loadSpritesheet', () => {
        it('should load spritesheet correctly', () => {
            const config = {
                key: 'test_key',
                path: 'test.png',
                frameWidth: 32,
                frameHeight: 32,
                frameCount: 10,
                layout: SpritesheetLayout.HORIZONTAL
            };

            animationManager.loadSpritesheet(config);

            expect(mockScene.load.spritesheet).toHaveBeenCalledWith(
                'test_key',
                `${ASSETS_BASE_PATH}/images/test.png`,
                {
                    frameWidth: 32,
                    frameHeight: 32,
                    endFrame: 9
                }
            );
        });

        it('should not load if already loaded', () => {
            const config = {
                key: 'test_key',
                path: 'test.png',
                frameWidth: 32,
                frameHeight: 32,
                layout: SpritesheetLayout.HORIZONTAL
            };

            // First load
            animationManager.loadSpritesheet(config);
            // Second load
            animationManager.loadSpritesheet(config);

            expect(mockScene.load.spritesheet).toHaveBeenCalledTimes(1);
        });
    });

    describe('createAnimations', () => {
        it('should create animations if texture exists', () => {
            const animConfig = {
                key: 'anim_1',
                frames: [0, 1, 2],
                frameRate: 10,
                repeat: -1
            };

            mockScene.textures.exists.mockReturnValue(true);
            mockScene.textures.get.mockReturnValue({ frameTotal: 10 });
            mockScene.anims.exists.mockReturnValue(false);
            mockScene.anims.generateFrameNumbers.mockReturnValue([{ key: 'test', frame: 0 }, { key: 'test', frame: 1 }]);
            mockScene.anims.get.mockReturnValue({ frames: [{}, {}] });

            animationManager.createAnimations('sheet_key', [animConfig]);

            expect(mockScene.anims.create).toHaveBeenCalledWith(expect.objectContaining({
                key: 'anim_1',
                frameRate: 10,
                repeat: -1
            }));
        });

        it('should skip if texture does not exist', () => {
            mockScene.textures.exists.mockReturnValue(false);

            animationManager.createAnimations('sheet_key', [{ key: 'anim', frames: [] }]);

            expect(mockScene.anims.create).not.toHaveBeenCalled();
        });

        it('should skip if animation already exists', () => {
            mockScene.textures.exists.mockReturnValue(true);
            mockScene.textures.get.mockReturnValue({ frameTotal: 10 });
            mockScene.anims.exists.mockReturnValue(true);

            animationManager.createAnimations('sheet_key', [{ key: 'anim', frames: [] }]);

            expect(mockScene.anims.create).not.toHaveBeenCalled();
        });

        it('should validate frame indices', () => {
            const animConfig = {
                key: 'anim_1',
                frames: [0, 999], // 999 is invalid
                frameRate: 10
            };

            mockScene.textures.exists.mockReturnValue(true);
            mockScene.textures.get.mockReturnValue({ frameTotal: 10 }); // Total 10 frames

            animationManager.createAnimations('sheet_key', [animConfig]);

            expect(mockScene.anims.create).not.toHaveBeenCalled();
            // Should verify that error was logged, but console is not mocked here by default
        });
    });

    describe('Helpers', () => {
        it('generateHorizontalFrames should work', () => {
            const frames = AnimationManager.generateHorizontalFrames(0, 3);
            expect(frames).toEqual([0, 1, 2, 3]);
        });

        it('generateGridDirectionFrames should work', () => {
            // Down: 0, 4, 8, 12 (cols=4)
            const frames = AnimationManager.generateGridDirectionFrames('down', 4, 4);
            expect(frames).toEqual([0, 4, 8, 12]);

            // Right: 3, 7, 11, 15
            const framesRight = AnimationManager.generateGridDirectionFrames('right', 4, 4);
            expect(framesRight).toEqual([3, 7, 11, 15]);
        });
    });
});
