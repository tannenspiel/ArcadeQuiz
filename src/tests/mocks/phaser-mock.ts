/**
 * Proper Phaser mock that works with default import
 * Supports class inheritance (extends Phaser.GameObjects.Container, etc.)
 *
 * NOTE: Individual test files that override this mock must include
 * GameObjects.Container and other classes for inheritance support.
 */

// Mock base classes
class MockGameObject {
    constructor(scene: any, x: number, y: number) {
        // Mock constructor
    }
    setDepth(depth: number) { return this; }
    setOrigin(x: number, y: number) { return this; }
    setPosition(x: number, y: number) { return this; }
    setSize(width: number, height: number) { return this; }
    setScrollFactor(x: number, y?: number) { return this; }
    setInteractive(config?: any) { return this; }
    setStrokeStyle(color?: number, thickness?: number) { return this; }
    setVisible(visible: boolean) { return this; }
    setResolution(width: number, height: number) { return this; }
    setFontSize(size: number) { return this; }
    on(event: string, callback: Function) { return this; }
    destroy() { return this; }
}

class MockContainer extends MockGameObject {
    private children: any[] = [];
    add(child: any) {
        this.children.push(child);
        return child;
    }
    getChildren() { return this.children; }
    getByName(name: string) {
        return this.children.find(c => c.name === name);
    }
    clear() { this.children = []; }
}

class MockSprite extends MockGameObject {
    texture?: any;
    frame?: any;
    setActive(active: boolean) { this.active = active; return this; }
    active: boolean = true;
}

class MockText extends MockGameObject {
    setText(text: string) { return this; }
    setTextBounds(x?: number, y?: number, width?: number, height?: number) { return this; }
}

class MockImage extends MockGameObject {
    setTexture(key: string) { return this; }
}

// Mock Scene
class MockScene {
    constructor(config: any) { /* noop */ }
    add = {
        text: jest.fn(function() { return new MockText(new MockScene({}), 0, 0); }),
        container: jest.fn(function() { return new MockContainer(new MockScene({}), 0, 0); }),
        sprite: jest.fn(function() { return new MockSprite(new MockScene({}), 0, 0); }),
        image: jest.fn(function() { return new MockImage(new MockScene({}), 0, 0); }),
        rectangle: jest.fn(function() { return new MockGameObject(new MockScene({}), 0, 0); }),
        zone: jest.fn(function() { return new MockGameObject(new MockScene({}), 0, 0); }),
    };
    input = {
        keyboard: {
            createCursor: jest.fn(function() { return { on: jest.fn() }; }),
        },
        enabled: true,
    };
    sys = {
        settings: { active: true },
        scale: { grid: { size: 64 } },
    };
    time = {
        delayedCall: jest.fn(function() { return { destroy: jest.fn() }; }),
        addEvent: jest.fn(function() { return { destroy: jest.fn() }; }),
    };
    events = {
        on: jest.fn(function() { return {}; }),
        off: jest.fn(),
        emit: jest.fn(),
        once: jest.fn(),
    };
    load = {
        image: jest.fn(function() { return { start: jest.fn() }; }),
        spritesheet: jest.fn(function() { return { start: jest.fn() }; }),
        atlas: jest.fn(function() { return { start: jest.fn() }; }),
    };
    _cameras = {
        getMain: jest.fn(function() { return { width: 1280, height: 720 }; }),
    };
    get cameras() { return this._cameras; }
}

// Mock Physics
class MockArcadePhysics {
    add = {
        collider: jest.fn(),
        overlap: jest.fn(),
        sprite: jest.fn(function() { return { enable: jest.fn(), refresh: jest.fn() }; }),
        group: jest.fn(function() { return { createMultiple: jest.fn(), get: jest.fn() }; }),
    };
}

// Mock animations
const mockAnims = {
    play: jest.fn().mockReturnThis(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    isPlaying: false,
    currentAnim: undefined,
    getFrame: jest.fn(),
    getLastFrame: jest.fn(),
    getNextFrame: jest.fn(),
    getTotalFrames: jest.fn(),
    update: jest.fn()
};

// Mock Physics.Arcade.Sprite (needed for AbstractItem extends Phaser.Physics.Arcade.Sprite)
class MockArcadeSprite extends MockGameObject {
    constructor(scene: any, x: number, y: number, texture?: string, frame?: string | number) {
        super(scene, x, y);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.texture = texture ? { key: texture } : { key: 'test' };
        this.frame = frame;
    }

    x: number = 0;
    y: number = 0;
    z: number = 0;
    width: number = 16;
    height: number = 16;
    scale: number = 1;
    displayWidth: number = 16;
    displayHeight: number = 16;
    originX: number = 0.5;
    originY: number = 0.5;
    frame?: any;
    texture: any = { key: 'test' };
    active: boolean = true;
    visible: boolean = true;
    alpha: number = 1;
    depth: number = 0;
    blendMode: number = 0;
    flipX: boolean = false;
    flipY: boolean = false;
    body: any = {
        x: 0,
        y: 0,
        width: 32,
        height: 32,
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        maxVelocity: { x: 10000, y: 10000 },
        drag: { x: 0, y: 0 },
        bounce: { x: 0, y: 0 },
        friction: { x: 0, y: 0 },
        gravityScale: 1,
        mass: 1,
        immovable: false,
        pushable: false,
        enable: jest.fn(),
        disable: jest.fn(),
        setCollideWorldBounds: jest.fn(),
        setBounce: jest.fn(),
        setSize: jest.fn(),
        setOffset: jest.fn(),
        stop: jest.fn(),
        setVelocity: jest.fn(),
        setVelocityX: jest.fn(),
        setVelocityY: jest.fn(),
        checkCollision: { none: false, up: true, down: true, left: true, right: true },
        touching: { none: true, up: false, down: false, left: false, right: false },
        embedded: false,
        blocked: { none: true, up: false, down: false, left: false, right: false },
    };
    anims = mockAnims;
    scene?: any;
    parentContainer?: any;

    // Physics methods
    setImmovable(value: boolean) { this.body.immovable = value; return this; }
    setPushable(value: boolean) { this.body.pushable = value; return this; }
    setCollideWorldBounds(value?: boolean) { return this; }
    setVelocity(x?: number, y?: number) { return this; }
    setVelocityX(x: number) { return this; }
    setVelocityY(y: number) { return this; }
    setAcceleration(x?: number, y?: number) { return this; }
    setAccelerationX(x: number) { return this; }
    setAccelerationY(y: number) { return this; }
    setMaxVelocity(x: number, y?: number) { return this; }
    setBounce(x?: number, y?: number) { return this; }
    setDrag(x?: number, y?: number) { return this; }
    setGravity(x?: number, y?: number) { return this; }
    setGravityY(y: number) { return this; }
    setFriction(x?: number, y?: number) { return this; }
    setMass(value: number) { return this; }
    setOffset(x: number, y?: number) { return this; }
    disableBody(disableBody?: boolean, disableMesh?: boolean) { return this; }
    enableBody(reset?: boolean, x?: number, y?: number, enableGameObject?: boolean) { return this; }
    refreshBody() { return this; }
    stopVelocity() { return this; }
    setAngularVelocity(value: number) { return this; }

    // GameObject methods
    setActive(active: boolean) { this.active = active; return this; }
    setTexture(key: string, frame?: string | number) { return this; }
    setFrame(frame: string | number) { return this; }
    setTint(color: number) { return this; }
    clearTint() { return this; }
    setScale(x: number, y?: number) {
        this.scale = x;
        this.displayWidth = this.width * x;
        this.displayHeight = this.height * (y ?? x);
        return this;
    }
    setAlpha(value: number) { this.alpha = value; return this; }
    setBlendMode(mode: number) { this.blendMode = mode; return this; }
    setScrollFactor(x: number, y?: number) { return this; }
    setDisplaySize(width: number, height: number) {
        this.displayWidth = width;
        this.displayHeight = height;
        return this;
    }
    setName(name: string) { return this; }
    setState(state: string | number) { return this; }

    // Position methods
    setX(x: number) { this.x = x; return this; }
    setY(y: number) { this.y = y; return this; }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
    setOrigin(x: number, y?: number) {
        this.originX = x;
        this.originY = y ?? x;
        return this;
    }

    // Size methods
    setSize(width: number, height?: number) {
        this.width = width;
        this.height = height ?? width;
        return this;
    }
    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        return this;
    }

    // Display methods
    getCenter(output?: any) { return { x: this.x, y: this.y }; }
    getTopLeft(output?: any) { return { x: this.x - this.width/2, y: this.y - this.height/2 }; }
    getTopRight(output?: any) { return { x: this.x + this.width/2, y: this.y - this.height/2 }; }
    getBottomLeft(output?: any) { return { x: this.x - this.width/2, y: this.y + this.height/2 }; }
    getBottomRight(output?: any) { return { x: this.x + this.width/2, y: this.y + this.height/2 }; }
    getBounds(output?: any) { return { x: this.x, y: this.y, width: this.width, height: this.height }; }

    setVisible(visible: boolean) { this.visible = visible; return this; }

    // Animation methods
    play(key: string, ignoreIfPlaying?: boolean, startFrame?: number) { return this; }
    pause() { return this; }
    resume() { return this; }
    stop() { return this; }

    // Event methods
    on(event: string, callback: Function, context?: any) { return this; }
    off(event: string, callback?: Function, context?: any) { return this; }
    once(event: string, callback: Function, context?: any) { return this; }
    emit(event: string, ...args: any[]) { return this; }
    listenerCount(event: string) { return 0; }
    removeAllListeners(event?: string) { return this; }

    // Interactive methods
    setInteractive(config?: any) { return this; }
    disableInteractive() { return this; }
    removeInteractive() { return this; }

    // Container methods
    getByName(name: string) { return undefined; }
    getType() { return 'Sprite'; }

    // Lifecycle
    destroy(fromScene?: boolean) {
        this.active = false;
        return this;
    }
    preUpdate(time: number, delta: number) { }
    update(time: number, delta: number) { }
    postUpdate(time: number, delta: number) { }
}

// Mock EventEmitter
class MockEventEmitter {
    on() { return this; }
    off() { return this; }
    emit() { return this; }
    once() { return this; }
    removeAllListeners() { /* noop */ }
}

// Mock Phaser.Math
class MockMath {
    static Between(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    static FloatBetween(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }
    static Random() {
        return Math.random();
    }
    static Max() {
        return Math.max;
    }
    static Min() {
        return Math.min;
    }
    static Distance = {
        Between: (x1: number, y1: number, x2: number, y2: number) => {
            // Euclidean distance calculation
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        }
    };
}

// Main Phaser mock
const PhaserMock = {
    BlendModes: {
        NORMAL: 0,
        ADD: 1,
        MULTIPLY: 2,
        SCREEN: 3,
        OVERLAY: 4,
        DARKEN: 5,
        LIGHTEN: 6,
        COLOR_DODGE: 7,
        COLOR_BURN: 8,
        HARD_LIGHT: 9,
        SOFT_LIGHT: 10,
        DIFFERENCE: 11,
        EXCLUSION: 12,
        HUE: 13,
        SATURATION: 14,
        COLOR: 15,
        LUMINOSITY: 16,
        ERASE: 17,
        SOURCE_IN: 18,
        SOURCE_OUT: 19,
        SOURCE_ATOP: 20,
        DESTINATION_IN: 21,
        DESTINATION_OUT: 22,
        DESTINATION_ATOP: 23,
        LIGHTER: 24,
        COPY: 25,
        NOR: 26
    },
    Math: MockMath,
    Scene: MockScene,
    Game: class MockGame {},
    Physics: {
        Arcade: {
            Sprite: MockArcadeSprite,  // ⚠️ ADDED: Needed for AbstractItem extends Phaser.Physics.Arcade.Sprite
            ArcadePhysics: MockArcadePhysics,
        }
    },
    Events: {
        EventEmitter: MockEventEmitter,
    },
    GameObjects: {
        Container: MockContainer,
        Sprite: MockSprite,
        Text: MockText,
        Image: MockImage,
        Rectangle: MockGameObject,
        Zone: MockGameObject,
    },
    Textures: {
        Texture: class MockTexture {},
    },
};

export default PhaserMock;
export const Phaser = PhaserMock;
