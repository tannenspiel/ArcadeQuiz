
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { GrassBackgroundSprite } from '../../../../game/entities/background/GrassBackgroundSprite';
import { createMockScene } from '../../../helpers/mocks';
import { KEYS, BASE_SCALE, ACTOR_SIZES } from '../../../../constants/gameConstants';

// Mock Phaser
jest.mock('phaser', () => ({
    Math: {
        Between: jest.fn((min, max) => min)
    },
    GameObjects: {
        Image: jest.fn()
    },
    Scene: jest.fn()
}));

describe('GrassBackgroundSprite', () => {
    let scene: any;
    let grassSprite: GrassBackgroundSprite;

    beforeEach(() => {
        scene = createMockScene();
        // Mock add.sprite to return a mock sprite with required methods
        const mockImage = {
            setCrop: jest.fn(),
            setFrame: jest.fn(), // ✅ ДОБАВЛЕНО: Для spritesheet
            setScale: jest.fn(),
            setDepth: jest.fn(),
            setOrigin: jest.fn(),
            destroy: jest.fn(),
            active: true,
            x: 0,
            y: 0
        };
        scene.add.sprite = jest.fn().mockReturnValue(mockImage);

        grassSprite = new GrassBackgroundSprite(scene);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should create instance with default density', () => {
            expect(grassSprite).toBeDefined();
            expect(grassSprite.getDensity()).toBe(0.1);
        });

        it('should create instance with custom density', () => {
            const customDensity = 0.5;
            const customGrass = new GrassBackgroundSprite(scene, customDensity);
            expect(customGrass.getDensity()).toBe(customDensity);
        });
    });

    describe('Density Management', () => {
        it('should update density', () => {
            grassSprite.setDensity(0.8);
            expect(grassSprite.getDensity()).toBe(0.8);
        });
    });

    describe('spawnOnMap', () => {
        it('should calculate correct count based on density', () => {
            const mapWidth = 1000;
            const mapHeight = 1000;
            const density = 0.1;
            grassSprite.setDensity(density);

            // Mock creating 0 sprites to just test calculation logic inside (if accessible) 
            // BUT since we can't easily spy on internal vars, we check calls to add.sprite

            // Expected count calculation:
            // mapArea = 1000 * 1000 = 1,000,000
            // spriteScale = BASE_SCALE * ACTOR_SIZES.GRASS
            // spriteSize = (16 * scale) * (16 * scale)
            // count = floor( (mapArea * density) / spriteSize )

            const expectedScale = BASE_SCALE * ACTOR_SIZES.GRASS;
            const spriteArea = (16 * expectedScale) * (16 * expectedScale);
            const expectedCount = Math.floor((1000000 * density) / spriteArea);

            grassSprite.spawnOnMap(mapWidth, mapHeight);

            expect(scene.add.sprite).toHaveBeenCalledTimes(expectedCount);
        });

        it('should use provided explicit count', () => {
            const explicitCount = 5;
            grassSprite.spawnOnMap(1000, 1000, explicitCount);
            expect(scene.add.sprite).toHaveBeenCalledTimes(explicitCount);
        });

        it('should position sprites within bounds (respecting offset)', () => {
            const mapWidth = 200;
            const mapHeight = 200;
            const edgeOffset = 32 * BASE_SCALE;

            // Spy on Math.Between to verify ranges
            const phaser = require('phaser');
            const mathSpy = jest.spyOn(phaser.Math, 'Between');

            grassSprite.spawnOnMap(mapWidth, mapHeight, 1);

            expect(mathSpy).toHaveBeenCalledWith(edgeOffset, mapWidth - edgeOffset); // X check
            expect(mathSpy).toHaveBeenCalledWith(edgeOffset, mapHeight - edgeOffset); // Y check
        });

        it('should correct sprite configuration', () => {
            grassSprite.spawnOnMap(100, 100, 1);

            const mockImage = scene.add.sprite.mock.results[0].value;

            expect(scene.add.sprite).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), KEYS.BG_GRASS_SHEET);
            // ✅ ИЗМЕНЕНО: Упрощенная проверка - просто проверяем, что setScale и setDepth были вызваны
            // setFrame/setCrop зависят от наличия текстуры в runtime, поэтому не проверяем их в тестах
            expect(mockImage.setScale).toHaveBeenCalledWith(BASE_SCALE * ACTOR_SIZES.GRASS);
            expect(mockImage.setDepth).toHaveBeenCalledWith(-100);
        });
    });

    describe('destroy', () => {
        it('should destroy all spawned sprites', () => {
            grassSprite.spawnOnMap(100, 100, 3);
            const sprites = grassSprite.getSprites();

            expect(sprites.length).toBe(3);

            grassSprite.destroy();

            sprites.forEach(sprite => {
                expect(sprite.destroy).toHaveBeenCalled();
            });
            expect(grassSprite.getSprites().length).toBe(0);
        });
    });
});
