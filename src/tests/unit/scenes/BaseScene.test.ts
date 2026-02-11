
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { BaseScene } from '../../../game/scenes/BaseScene';
import { createMockScene } from '../../helpers/mocks';
import { MAP_WIDTH, MAP_HEIGHT, BASE_SCALE } from '../../../constants/gameConstants';

// Mock dependencies
jest.mock('../../../game/systems/AnimationManager');
jest.mock('../../../game/core/AssetLoader');
jest.mock('../../../game/core/LevelManager');
jest.mock('../../../game/core/GameState');
jest.mock('../../../utils/Logger');

describe('BaseScene', () => {
    let scene: BaseScene;
    let mockSceneComponents: any;

    beforeEach(() => {
        jest.clearAllMocks();
        scene = new BaseScene('TestScene');
        mockSceneComponents = createMockScene();

        // ⚠️ FIXED: Use Object.defineProperty instead of Object.assign to avoid readonly property errors
        // Object.assign tries to overwrite getter properties like 'cameras'
        Object.keys(mockSceneComponents).forEach(key => {
            Object.defineProperty(scene, key, {
                value: mockSceneComponents[key],
                writable: true,
                configurable: true,
            });
        });
    });

    it('should be created', () => {
        expect(scene).toBeDefined();
    });

    describe('initBaseSystems', () => {
        it('should initialize core systems', () => {
            (scene as any).initBaseSystems();

            // Check if properties are initialized
            expect((scene as any).assetLoader).toBeDefined();
            expect((scene as any).levelManager).toBeDefined();
            expect((scene as any).gameState).toBeDefined();
        });
    });

    describe('setupPhysics', () => {
        it('should set physics world bounds', () => {
            (scene as any).setupPhysics();

            const expectedWidth = MAP_WIDTH * BASE_SCALE;
            const expectedHeight = MAP_HEIGHT * BASE_SCALE;

            expect(scene.physics.world.setBounds).toHaveBeenCalledWith(0, 0, expectedWidth, expectedHeight);
        });

        it('should warn and return if physics world is missing', () => {
            // Remove physics world mock
            (scene as any).physics = undefined;
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

            (scene as any).setupPhysics();

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('setupCamera', () => {
        it('should set camera bounds to default map size if no bounds provided', () => {
            (scene as any).setupCamera();

            const expectedWidth = MAP_WIDTH * BASE_SCALE;
            const expectedHeight = MAP_HEIGHT * BASE_SCALE;

            expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(0, 0, expectedWidth, expectedHeight);
        });

        it('should set camera bounds to provided values', () => {
            const customBounds = { x: 10, y: 20, width: 100, height: 200 };
            (scene as any).setupCamera(customBounds);

            expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(
                customBounds.x, customBounds.y, customBounds.width, customBounds.height
            );
        });
    });

    describe('getCameraWorldSize', () => {
        it('should calculate correct world size based on zoom', () => {
            scene.scale = {
                gameSize: { width: 1280, height: 720 }
            } as any;
            (scene.cameras.main as any).zoom = 2;

            const result = (scene as any).getCameraWorldSize();

            expect(result.width).toBe(640); // 1280 / 2
            expect(result.height).toBe(360); // 720 / 2
        });
    });
});
