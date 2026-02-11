
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { AbstractCollisionObject, CollisionObjectConfig } from '../../../../game/entities/collision/AbstractCollisionObject';
import { createMockScene } from '../../../helpers/mocks';
import { BASE_SCALE, COLLISION_CONFIG } from '../../../../constants/gameConstants';

// Concrete implementation for testing
class TestCollisionObject extends AbstractCollisionObject {
    public spawnOnMap(mapWidth: number, mapHeight: number, count?: number, spawnSystem?: any): void {
        // Implementation for testing
    }

    public testCreateSprite(x: number, y: number, frameIndex: number) {
        return this.createSprite(x, y, frameIndex);
    }
}

// Mock Phaser
jest.mock('phaser', () => ({
    Math: {
        Between: jest.fn((min, max) => min)
    },
    Physics: {
        Arcade: {
            Sprite: jest.fn(),
            Group: jest.fn()
        }
    },
    Scene: jest.fn()
}));

describe('AbstractCollisionObject', () => {
    let scene: any;
    let testObject: TestCollisionObject;
    const config: CollisionObjectConfig = {
        textureKey: 'test-collision-texture',
        frameWidth: 32,
        frameHeight: 32,
        framesPerRow: 2,
        totalFrames: 2,
        depth: 5,
        scale: 1.5
    };

    beforeEach(() => {
        scene = createMockScene();

        const mockBody = {
            setSize: jest.fn(),
            updateFromGameObject: jest.fn(),
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            destroy: jest.fn()
        };

        const mockSprite = {
            setOrigin: jest.fn(),
            setScale: jest.fn(),
            setDepth: jest.fn(),
            setImmovable: jest.fn(),
            setPushable: jest.fn(),
            on: jest.fn(),
            body: mockBody,
            active: true,
            displayWidth: 32,
            displayHeight: 32,
            destroy: jest.fn(),
            frame: { name: '0' }
        };

        const mockGroup = {
            add: jest.fn()
        };

        scene.physics.add.sprite = jest.fn().mockReturnValue(mockSprite);
        scene.physics.add.group = jest.fn().mockReturnValue(mockGroup);
        scene.textures = {
            exists: jest.fn().mockReturnValue(true)
        };

        // Add graphics mock for debug visualization
        const mockGraphics = {
            setDepth: jest.fn(),
            clear: jest.fn(),
            lineStyle: jest.fn(),
            strokeRect: jest.fn(),
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            destroy: jest.fn()
        };
        scene.add.graphics = jest.fn().mockReturnValue(mockGraphics);

        testObject = new TestCollisionObject(scene, config);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createSprite', () => {
        it('should create and configure physics sprite', () => {
            const x = 100;
            const y = 200;
            const frameIndex = 1;

            testObject.testCreateSprite(x, y, frameIndex);

            expect(scene.physics.add.sprite).toHaveBeenCalledWith(x, y, config.textureKey, frameIndex);

            const mockSprite = scene.physics.add.sprite.mock.results[0].value;

            // Check sprite configuration
            expect(mockSprite.setScale).toHaveBeenCalledWith(config.scale);
            expect(mockSprite.setDepth).toHaveBeenCalledWith(config.depth);
            expect(mockSprite.setImmovable).toHaveBeenCalledWith(true);
            expect(mockSprite.setPushable).toHaveBeenCalledWith(false);

            // Check body configuration
            // bodyWidth = frameWidth - offsetInBasePixels*2
            // offsetInBasePixels = BUSH_COLLISION_OFFSET / scale
            // Let's assume BUSH_COLLISION_OFFSET is used (default logic in base class uses it for Bush-like logic? 
            // Wait, AbstractCollisionObject logic implementation:
            // const offsetInBasePixels = COLLISION_CONFIG.BUSH_COLLISION_OFFSET / finalScale;
            // It seems explicitly hardcoded to BUSH_COLLISION_OFFSET in the abstract class provided earlier (Step 205).

            const finalScale = config.scale!;
            const offsetInBasePixels = COLLISION_CONFIG.BUSH_COLLISION_OFFSET / finalScale;
            const expectedWidth = Math.max(1, config.frameWidth - (offsetInBasePixels * 2));
            const expectedHeight = Math.max(1, config.frameHeight - (offsetInBasePixels * 2));

            expect(mockSprite.body.setSize).toHaveBeenCalledWith(expectedWidth, expectedHeight);
        });

        it('should throw error if texture does not exist', () => {
            scene.textures.exists.mockReturnValue(false);
            expect(() => {
                testObject.testCreateSprite(0, 0, 0);
            }).toThrow();
        });
    });

    describe('getGroup', () => {
        it('should create a physics group and add sprites', () => {
            // Create some sprites first
            testObject.testCreateSprite(0, 0, 0);
            testObject.testCreateSprite(10, 10, 1);

            // Manually push to protected sprites array since Abstract doesn't do it automatically
            // But we need to verify getGroup adds them.
            // testObject.testCreateSprite returns sprite.
            const sprite1 = scene.physics.add.sprite.mock.results[0].value;
            const sprite2 = scene.physics.add.sprite.mock.results[1].value;

            (testObject as any).sprites.push(sprite1, sprite2);

            testObject.getGroup();

            expect(scene.physics.add.group).toHaveBeenCalled();
            const mockGroup = scene.physics.add.group.mock.results[0].value;

            expect(mockGroup.add).toHaveBeenCalledWith(sprite1);
            expect(mockGroup.add).toHaveBeenCalledWith(sprite2);
        });
    });

    describe('destroy', () => {
        it('should destroy all sprites', () => {
            const sprite1 = testObject.testCreateSprite(0, 0, 0);
            (testObject as any).sprites.push(sprite1);

            testObject.destroy();

            expect(sprite1.destroy).toHaveBeenCalled();
            expect((testObject as any).getSprites().length).toBe(0);
        });
    });
});
