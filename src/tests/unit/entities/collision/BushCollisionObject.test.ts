
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { BushCollisionObject } from '../../../../game/entities/collision/BushCollisionObject';
import { createMockScene } from '../../../helpers/mocks';
import { KEYS, BASE_SCALE, ACTOR_SIZES, COLLISION_CONFIG } from '../../../../constants/gameConstants';

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

describe('BushCollisionObject', () => {
    let scene: any;
    let bushCollisionObject: BushCollisionObject;
    let mockSpawnSystem: any;

    beforeEach(() => {
        scene = createMockScene();

        // Mock physics.add.sprite to return a mock sprite with body
        const mockBody = {
            setSize: jest.fn(),
            updateFromGameObject: jest.fn(),
            width: 0,
            height: 0,
            x: 0,
            y: 0
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
            x: 0,
            y: 0,
            displayWidth: 32,
            displayHeight: 32,
            destroy: jest.fn(),
            frame: { name: '0' }
        };

        scene.physics.add.sprite = jest.fn().mockReturnValue(mockSprite);

        // Add textures mock
        scene.textures = {
            exists: jest.fn().mockReturnValue(true)
        };

        // Add graphics mock
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

        mockSpawnSystem = {
            spawnBushMatrix: jest.fn()
        };

        bushCollisionObject = new BushCollisionObject(scene, false);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('spawnOnMap', () => {
        it('should use SpawnSystem when provided', () => {
            const count = 3;
            mockSpawnSystem.spawnBushMatrix.mockReturnValue({ success: true, x: 100, y: 100 });

            bushCollisionObject.spawnOnMap(1000, 1000, count, mockSpawnSystem);

            expect(mockSpawnSystem.spawnBushMatrix).toHaveBeenCalledTimes(count);
            expect(scene.physics.add.sprite).toHaveBeenCalledTimes(count);
        });

        it('should skip spawning if SpawnSystem returns failure', () => {
            const count = 3;
            // First success, remaining fail
            mockSpawnSystem.spawnBushMatrix
                .mockReturnValueOnce({ success: true, x: 100, y: 100 })
                .mockReturnValue({ success: false });

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

            bushCollisionObject.spawnOnMap(1000, 1000, count, mockSpawnSystem);

            expect(mockSpawnSystem.spawnBushMatrix).toHaveBeenCalledTimes(count);
            expect(scene.physics.add.sprite).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should fallback to random spawning if SpawnSystem is not provided', () => {
            const count = 5;
            const phaser = require('phaser');
            const mathSpy = jest.spyOn(phaser.Math, 'Between');

            bushCollisionObject.spawnOnMap(1000, 1000, count);

            expect(mockSpawnSystem.spawnBushMatrix).not.toHaveBeenCalled();
            expect(mathSpy).toHaveBeenCalled();
            expect(scene.physics.add.sprite).toHaveBeenCalledTimes(count);
        });
    });

    describe('Physics Configuration', () => {
        it('should configure physics body with correct offsets', () => {
            bushCollisionObject.spawnOnMap(1000, 1000, 1);

            const mockSprite = scene.physics.add.sprite.mock.results[0].value;
            const mockBody = mockSprite.body;

            // Expected body size calculation:
            // finalScale = BASE_SCALE * ACTOR_SIZES.BUSH
            // offsetInBasePixels = COLLISION_CONFIG.BUSH_COLLISION_OFFSET / finalScale
            // bodyWidth = frameWidth - (offsetInBasePixels * 2)

            const finalScale = BASE_SCALE * ACTOR_SIZES.BUSH;
            const offsetInBasePixels = COLLISION_CONFIG.BUSH_COLLISION_OFFSET / finalScale;
            // frameWidth is 32
            const expectedWidth = Math.max(1, 32 - (offsetInBasePixels * 2));
            const expectedHeight = Math.max(1, 32 - (offsetInBasePixels * 2));

            expect(mockBody.setSize).toHaveBeenCalledWith(expectedWidth, expectedHeight);
            expect(mockBody.updateFromGameObject).toHaveBeenCalled();
            expect(mockSprite.setImmovable).toHaveBeenCalledWith(true);
            expect(mockSprite.setPushable).toHaveBeenCalledWith(false);
        });
    });

    describe('Debug Visualization', () => {
        it('should not create debug graphics implies showCollisionDebug is false', () => {
            // Re-create with debug disabled
            bushCollisionObject = new BushCollisionObject(scene, false);
            bushCollisionObject.spawnOnMap(100, 100, 1);

            expect(scene.add.graphics).not.toHaveBeenCalled();
        });

        it('should create debug graphics if showCollisionDebug is true', () => {
            // Re-create with debug enabled
            bushCollisionObject = new BushCollisionObject(scene, true);
            bushCollisionObject.spawnOnMap(100, 100, 1);

            expect(scene.add.graphics).toHaveBeenCalled();
        });
    });
});
