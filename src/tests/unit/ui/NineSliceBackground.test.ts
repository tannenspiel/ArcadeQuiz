
import { NineSliceBackground } from '../../../game/ui/NineSliceBackground';
import { BASE_SCALE } from '../../../constants/gameConstants';

// Mock Phaser module locally
jest.mock('phaser', () => {
    return {
        GameObjects: {
            Container: class Container {
                scene: any;
                x = 0; y = 0;
                constructor(scene: any, x?: number, y?: number, children?: any[]) {
                    this.scene = scene;
                    this.x = x || 0;
                    this.y = y || 0;
                }
                add() { }
                each(cb: any) { if (cb) cb({ x: 0, y: 0, setTint: jest.fn(), clearTint: jest.fn() }); }
                setScrollFactor() { }
                setInteractive() { }
                removeAll() { }
                getBounds() { return { width: 100, height: 100 }; }
                setAlpha() { }
                setTint() { }
                clearTint() { }
            },
            Image: class Image {
                setOrigin() { return this; }
                setScale() { return this; }
            },
        },
        Geom: {
            Rectangle: class Rectangle {
                static Contains() { }
                constructor(_x?: number, _y?: number, _w?: number, _h?: number) { }
            }
        }
    };
});

describe('NineSliceBackground', () => {
    let mockScene: any;
    let nineSliceBg: NineSliceBackground;

    beforeEach(() => {
        mockScene = {
            add: {
                existing: jest.fn(),
                image: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setScale: jest.fn().mockReturnThis(),
                }),
                tileSprite: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setTileScale: jest.fn().mockReturnThis(),
                })
            }
        };
    });

    it('should create background with correct dimensions', () => {
        const x = 100;
        const y = 100;
        const width = 200;
        const height = 150;

        nineSliceBg = new NineSliceBackground(mockScene, x, y, width, height);

        expect(mockScene.add.existing).toHaveBeenCalledWith(nineSliceBg);

        // Should create 4 corners
        expect(mockScene.add.image).toHaveBeenCalledTimes(4);

        // Should create 5 borders/center (Top, Bottom, Left, Right, Center)
        expect(mockScene.add.tileSprite).toHaveBeenCalledTimes(5);
    });

    it('should handle small dimensions correctly', () => {
        // Dimensions smaller than 2 * tileSize (16px)
        const width = 10;
        const height = 10;

        nineSliceBg = new NineSliceBackground(mockScene, 100, 100, width, height);

        // Check if logger.warn was called with 'too small' message
        expect(require('../../../utils/Logger').logger.warn).toHaveBeenCalledWith(
            'MODAL_SIZE',
            expect.stringContaining('too small')
        );
    });

    it('should resize correctly', () => {
        nineSliceBg = new NineSliceBackground(mockScene, 0, 0, 100, 100);

        // Mock removeAll
        nineSliceBg.removeAll = jest.fn();

        nineSliceBg.resize(200, 200);

        expect(nineSliceBg.removeAll).toHaveBeenCalledWith(true);
        // Expect re-creation logic to run (add.image/tileSprite called again)
        // Initial 4+5 calls + New 4+5 calls = 18 total
        expect(mockScene.add.image).toHaveBeenCalledTimes(8); // 4 * 2
        expect(mockScene.add.tileSprite).toHaveBeenCalledTimes(10); // 5 * 2
    });

    it('should set tint correctly', () => {
        nineSliceBg = new NineSliceBackground(mockScene, 0, 0, 100, 100);

        const mockChild = { setTint: jest.fn() };
        nineSliceBg.add(mockChild as any);

        // Mock 'each' method of Container (since we are not using real Phaser)
        // We need to implement 'each' behavior manually or mock it.
        // Since NineSliceBackground extends Container, and we don't hold a reference to children in a simple array in the mock...
        // We can just spy on the 'each' method if it exists, or better, we rely on implementation detail that setTint calls 'each'.

        // However, since we are mocking Phaser, 'super' calls might not work as expected effectively unless we mock the prototype or use a real object.
        // Ideally, we mock 'each' on the instance.
        nineSliceBg.each = jest.fn((callback: Function) => {
            callback(mockChild);
            return nineSliceBg;
        }) as any;

        nineSliceBg.setTint(0xff0000);

        expect(mockChild.setTint).toHaveBeenCalledWith(0xff0000);
    });

    it('should setup interactive', () => {
        nineSliceBg = new NineSliceBackground(mockScene, 0, 0, 100, 100);

        // Mock getBounds
        nineSliceBg.getBounds = jest.fn().mockReturnValue({ width: 100, height: 100 });
        nineSliceBg.setInteractive = jest.fn();

        nineSliceBg.setupInteractive();

        expect(nineSliceBg.setInteractive).toHaveBeenCalled();
    });
});
