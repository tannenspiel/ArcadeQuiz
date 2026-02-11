/**
 * Unit tests for CoinAnimationSync
 */

import { CoinAnimationSync } from '../../../../game/scenes/animation/CoinAnimationSync';
import { createMockScene, createMockSprite } from '../../../helpers/mocks';

// Mock AnimationSyncManager
jest.mock('../../../../game/scenes/animation/AnimationSyncManager', () => ({
    AnimationSyncer: jest.fn()
}));

describe('CoinAnimationSync', () => {
    let animationSync: CoinAnimationSync;
    let mockScene: any;
    let mockCoinsGroup: any;
    let mockCoin: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockScene = createMockScene();

        // Mock coins group
        mockCoinsGroup = {
            getChildren: jest.fn().mockReturnValue([])
        };
        mockScene.coins = mockCoinsGroup;

        // Mock game loop for safety check
        mockScene.game = {
            loop: {}
        };

        animationSync = new CoinAnimationSync(mockScene);
    });

    it('should be defined', () => {
        expect(animationSync).toBeDefined();
    });

    describe('update', () => {
        it('should return early if coins group is missing', () => {
            mockScene.coins = undefined;
            expect(() => animationSync.update(100)).not.toThrow();
        });

        it('should iterate over coins and sync them', () => {
            mockCoin = createMockSprite();
            // Add animation properties required for sync
            mockCoin.anims = {
                isPlaying: true,
                currentAnim: {
                    frames: [
                        { frame: { index: 0 } },
                        { frame: { index: 1 } }
                    ],
                    frameRate: 10
                }
            };
            mockCoin.active = true;
            mockCoin.setFrame = jest.fn();

            mockCoinsGroup.getChildren.mockReturnValue([mockCoin]);

            animationSync.update(16);

            // Should initialize on first run
            expect(mockCoin._animationInitialized).toBe(true);
            expect(mockCoin._animationTimer).toBe(16);
        });
    });

    describe('syncSprite logic', () => {
        beforeEach(() => {
            mockCoin = createMockSprite();
            mockCoin.active = true;
            mockCoin.setFrame = jest.fn();
            mockCoinsGroup.getChildren.mockReturnValue([mockCoin]);
        });

        it('should do nothing if coin is not active or not playing anims', () => {
            mockCoin.active = false;
            animationSync.update(16);
            expect(mockCoin._animationInitialized).toBeUndefined();

            mockCoin.active = true;
            mockCoin.anims = { isPlaying: false };
            animationSync.update(16);
            expect(mockCoin._animationInitialized).toBeUndefined();
        });

        it('should initialize animation properties on first run', () => {
            mockCoin.anims = {
                isPlaying: true,
                currentAnim: {
                    frames: [{ frame: { index: 0 } }],
                    frameRate: 10
                }
            };

            animationSync.update(16);

            expect(mockCoin._animationInitialized).toBe(true);
            expect(mockCoin._animationTimer).toBe(16);
            expect(mockCoin._animationFrameIndex).toBe(0);
            expect(mockCoin._animationInterval).toBe(100); // 1000 / 10
        });

        it('should not update frame if timer < interval', () => {
            mockCoin.anims = {
                isPlaying: true,
                currentAnim: {
                    frames: [
                        { frame: { index: 0 } },
                        { frame: { index: 1 } }
                    ],
                    frameRate: 10 // Interval = 100ms
                }
            };

            // First run initializes
            animationSync.update(50);
            expect(mockCoin.setFrame).not.toHaveBeenCalled();
            expect(mockCoin._animationTimer).toBe(50);
        });

        it('should update frame if timer >= interval', () => {
            mockCoin.anims = {
                isPlaying: true,
                currentAnim: {
                    frames: [
                        { frame: { index: 0 } },
                        { frame: { index: 1 } }
                    ],
                    frameRate: 10 // Interval = 100ms
                }
            };

            // Initialize
            animationSync.update(0);

            // Advance time past interval
            animationSync.update(110);

            // Timer is reset to 0 after interval is reached
            expect(mockCoin._animationTimer).toBe(0);

            expect(mockCoin.setFrame).toHaveBeenCalledWith(1);
        });

        it('should handle frame extraction from object with index', () => {
            mockCoin.anims = {
                isPlaying: true,
                currentAnim: {
                    frames: [
                        { frame: { index: 5 } }, // extractFrameIndex handles {frame: {index: 5}} ?
                        // No, extractFrameIndex takes anim.frames[i].frame
                        // The code: const animFrameObj = animFrame.frame;
                        // const frameIndex = this.extractFrameIndex(animFrameObj);

                        // If animFrameObj is { index: 5 }
                    ],
                    frameRate: 10
                }
            };
            // Note: in Phaser, frame object structure can vary.
            // The code handles: 
            // 1. animFrameObj.frame !== undefined
            // 2. animFrameObj.index !== undefined
            // 3. animFrameObj.name !== undefined
            // 4. typeof animFrameObj === 'number'

            // Let's test the 'index' path
            mockCoin.anims.currentAnim.frames = [
                { frame: { index: 5 } } // passed as animFrameObj
            ];

            animationSync.update(1000); // Trigger update
            expect(mockCoin.setFrame).toHaveBeenCalledWith(5);
        });

        it('should handle frame extraction from object with name', () => {
            mockCoin.anims = {
                isPlaying: true,
                currentAnim: {
                    frames: [
                        { frame: { name: '10' } }
                    ],
                    frameRate: 10
                }
            };

            animationSync.update(1000);
            expect(mockCoin.setFrame).toHaveBeenCalledWith(10);
        });

        it('should handle frame extraction from number', () => {
            mockCoin.anims = {
                isPlaying: true,
                currentAnim: {
                    frames: [
                        { frame: 7 }
                    ],
                    frameRate: 10
                }
            };

            animationSync.update(1000);
            expect(mockCoin.setFrame).toHaveBeenCalledWith(7);
        });
    });
});
