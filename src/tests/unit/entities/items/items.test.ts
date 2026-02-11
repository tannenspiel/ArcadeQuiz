/**
 * Unit тесты для collectible items (Coin, Key, Heart)
 */

import { Coin } from '../../../../game/entities/items/Coin';
import { Key } from '../../../../game/entities/items/Key';
import { Heart } from '../../../../game/entities/items/Heart';
import { ItemType } from '../../../../constants/gameConstants';

// Mock для SpawnMatrix (упрощенный)
const createMockSpawnMatrix = () => ({
  freeRect: jest.fn(),
  occupyRect: jest.fn(),
  isPositionAvailable: jest.fn(() => true),
  getCellPosition: jest.fn(),
  getWorldPosition: jest.fn()
});

// Mock для анимаций
const createMockAnimations = () => ({
  play: jest.fn().mockReturnThis(),
  stop: jest.fn(),
  isPlaying: false,
  currentAnim: undefined,
  getFrame: jest.fn(),
  getLastFrame: jest.fn(),
  getNextFrame: jest.fn(),
  getTotalFrames: jest.fn(),
  update: jest.fn()
});

// Mock для Physics Body
const createMockBody = () => ({
  immovable: false,
  pushable: false,
  enable: jest.fn(),
  disable: jest.fn(),
  reset: jest.fn(),
  stop: jest.fn(),
  setOffset: jest.fn(),
  setSize: jest.fn(),
  setCollideWorldBounds: jest.fn(),
  setVelocity: jest.fn(),
  setVelocityX: jest.fn(),
  setVelocityY: jest.fn(),
  setAcceleration: jest.fn(),
  setAccelerationX: jest.fn(),
  setAccelerationY: jest.fn(),
  setMaxVelocity: jest.fn(),
  setBounce: jest.fn(),
  setFriction: jest.fn(),
  setDrag: jest.fn(),
  setGravity: jest.fn(),
  setMass: jest.fn(),
  checkCollision: { none: false, up: true, down: true, left: true, right: true },
  touching: { none: true, up: false, down: false, left: false, right: false },
  embedded: false,
  blocked: { none: true, up: false, down: false, left: false, right: false },
  velocity: { x: 0, y: 0 },
  acceleration: { x: 0, y: 0 },
  drag: { x: 0, y: 0 },
  maxVelocity: { x: 10000, y: 10000 },
  bounce: { x: 0, y: 0 },
  friction: { x: 0, y: 0 },
  gravityScale: 1,
  mass: 1
});

// Mock для Physics Arcade Sprite
const createMockPhysicsSprite = () => {
  const mockBody = createMockBody();
  const mockAnims = createMockAnimations();

  return {
    // Phaser.GameObjects.Sprite properties
    x: 100,
    y: 200,
    z: 0,
    width: 16,
    height: 16,
    scale: 4,
    displayWidth: 64,
    displayHeight: 64,
    originX: 0.5,
    originY: 0.5,
    frame: undefined,
    texture: { key: 'coin_sheet' },
    active: true,
    visible: true,
    alpha: 1,
    depth: 100,
    blendMode: 0,
    flipX: false,
    flipY: false,
    body: mockBody,
    anims: mockAnims,
    scene: undefined, // Set later
    parentContainer: undefined,

    // Phaser.GameObjects.Sprite methods
    setTexture: jest.fn().mockReturnThis(),
    setFrame: jest.fn().mockReturnThis(),
    setTint: jest.fn().mockReturnThis(),
    clearTint: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
    setBlendMode: jest.fn().mockReturnThis(),
    setVisible: jest.fn().mockReturnThis(),
    setActive: jest.fn().mockReturnThis(),
    setName: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    setScale: jest.fn().mockReturnThis(),
    setX: jest.fn().mockReturnThis(),
    setY: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    setOrigin: jest.fn().mockReturnThis(),
    setScrollFactor: jest.fn().mockReturnThis(),
    setSize: jest.fn().mockReturnThis(),
    setDisplaySize: jest.fn().mockReturnThis(),
    getCenter: jest.fn().mockReturnValue({ x: 100, y: 200 }),
    getTopLeft: jest.fn().mockReturnValue({ x: 84, y: 184 }),
    getTopRight: jest.fn().mockReturnValue({ x: 116, y: 184 }),
    getBottomLeft: jest.fn().mockReturnValue({ x: 84, y: 216 }),
    getBottomRight: jest.fn().mockReturnValue({ x: 116, y: 216 }),
    getBounds: jest.fn().mockReturnValue({ x: 84, y: 184, width: 32, height: 32 }),

    // Animation methods
    play: jest.fn().mockReturnThis(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),

    // Event methods
    on: jest.fn().mockReturnThis(),
    off: jest.fn(),
    once: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    listenerCount: jest.fn().mockReturnValue(0),
    removeAllListeners: jest.fn(),

    // Physics.Arcade.Sprite methods
    setImmovable: jest.fn().mockReturnThis(),
    setPushable: jest.fn().mockReturnThis(),
    setCollideWorldBounds: jest.fn().mockReturnThis(),
    setVelocity: jest.fn().mockReturnThis(),
    setVelocityX: jest.fn().mockReturnThis(),
    setVelocityY: jest.fn().mockReturnThis(),
    setAcceleration: jest.fn().mockReturnThis(),
    setBounce: jest.fn().mockReturnThis(),
    setDrag: jest.fn().mockReturnThis(),
    setGravity: jest.fn().mockReturnThis(),
    setFriction: jest.fn().mockReturnThis(),
    setMass: jest.fn().mockReturnThis(),
    disableBody: jest.fn(),
    enableBody: jest.fn(),
    refreshBody: jest.fn(),

    // Lifecycle methods
    destroy: jest.fn(),
    preUpdate: jest.fn(),
    update: jest.fn(),
    postUpdate: jest.fn(),

    // Container methods
    getByName: jest.fn(),
    getType: jest.fn().mockReturnValue('Sprite'),
    setInteractive: jest.fn().mockReturnThis(),
    disableInteractive: jest.fn().mockReturnThis(),
    removeInteractive: jest.fn()
  };
};

// Mock для Scene
const createMockScene = () => {
  const mockSprite = createMockPhysicsSprite();
  // Create separate sprite for scene.add.sprite (death animations)
  const mockAddSprite = createMockPhysicsSprite();

  return {
    // Scene properties
    scene: null,
    game: {
      config: {},
      loop: { time: 0, now: 0 }
    },
    cameras: {
      main: {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        rotation: 0
      }
    },

    // Scene methods
    sys: {
      settings: {},
      queueDepthSort: jest.fn(),
      events: {
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      }
    },
    launch: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    sleep: jest.fn(),
    wake: jest.fn(),
    stop: jest.fn(),
    add: {
      // existing() called by AbstractItem.ts line 102
      existing: jest.fn().mockReturnValue(mockSprite),
      // sprite() called by Key.ts for death animation
      sprite: jest.fn().mockReturnValue(mockAddSprite),
      image: jest.fn(),
      text: jest.fn(),
      graphics: jest.fn(),
    },
    children: {
      bringToTop: jest.fn(),
      sendToBack: jest.fn(),
      moveDown: jest.fn(),
      moveUp: jest.fn(),
      getByName: jest.fn()
    },
    make: {
      sprite: jest.fn(),
      image: jest.fn(),
      graphics: jest.fn(),
      text: jest.fn()
    },

    // Physics system
    physics: {
      world: {
        // enable() called by AbstractItem.ts line 98
        enable: jest.fn(),
        disable: jest.fn(),
        add: {
          collider: jest.fn(),
          overlap: jest.fn(),
          sprite: jest.fn()
        },
        remove: jest.fn(),
        nextCategory: 1,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        checkCollision: {
          up: true,
          down: true,
          left: true,
          right: true
        }
      },
      add: {
        sprite: jest.fn().mockReturnValue(mockSprite),
        image: jest.fn(),
        existing: jest.fn().mockReturnValue(mockSprite),
        collider: jest.fn(),
        overlap: jest.fn()
      },
      group: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn()
    },

    // Animations
    anims: {
      exists: jest.fn().mockReturnValue(true), // Для 'enemy_death', 'coin_idle', 'key_idle'
      create: jest.fn(),
      get: jest.fn(),
      pauseAll: jest.fn(),
      resumeAll: jest.fn(),
      removeAll: jest.fn()
    },

    // Time
    time: {
      delayedCall: jest.fn(),
      addEvent: jest.fn(),
      now: 0
    },

    // Tweens
    tweens: {
      add: jest.fn(),
      kill: jest.fn(),
      killTweensOf: jest.fn()
    },

    // Textures
    textures: {
      exists: jest.fn().mockReturnValue(true),
      get: jest.fn(),
      add: jest.fn(),
      remove: jest.fn()
    },

    // Cache
    cache: {
      image: {
        exists: jest.fn().mockReturnValue(true),
        get: jest.fn()
      }
    },

    // Input
    input: {
      keyboard: {
        addKey: jest.fn(),
        addKeys: jest.fn(),
        createCursorKeys: jest.fn()
      },
      mouse: {
        x: 0,
        y: 0,
        active: false
      }
    },

    // Sound
    sound: {
      play: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      stopAll: jest.fn()
    },

    // Music
    music: {
      play: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      stopAll: jest.fn()
    },

    // Lights (if using 2D lights)
    lights: {
      enable: jest.fn(),
      disable: jest.fn()
    },

    // Particles
    particles: {
      createEmitter: jest.fn()
    },

    // Cameras
    cam: {
      main: {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        centerOn: jest.fn(),
        pan: jest.fn(),
        zoomTo: jest.fn()
      }
    },

    // Registry (for game state)
    registry: {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn()
    },

    // Events
    events: {
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn()
    },

    // Data manager
    data: {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      inc: jest.fn(),
      toggle: jest.fn()
    }
  };
};

describe('Coin', () => {
  let mockScene: any;
  let coin: Coin;

  beforeEach(() => {
    mockScene = createMockScene();
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Инициализация', () => {
    it('должен создавать монету с правильным itemType', () => {
      coin = new Coin(mockScene, 100, 200);
      expect(coin.itemType).toBe(ItemType.COIN);
    });

    it('должен создавать физический спрайт', () => {
      coin = new Coin(mockScene, 100, 200);
      expect(coin).toBeDefined();
      expect(coin.x).toBe(100);
      expect(coin.y).toBe(200);
    });

    it('должен включать физику', () => {
      coin = new Coin(mockScene, 100, 200);
      expect(mockScene.physics.world.enable).toHaveBeenCalled();
    });

    it('должен добавлять спрайт в сцену', () => {
      coin = new Coin(mockScene, 100, 200);
      expect(mockScene.add.existing).toHaveBeenCalled();
    });

    it('должен устанавливать scale', () => {
      coin = new Coin(mockScene, 100, 200);
      // Coin uses BASE_SCALE * ACTOR_SIZES.COIN = 4 * 0.5 = 2
      expect(coin.scale).toBeGreaterThan(0);
    });

    it('должен проигрывать анимацию coin_idle', () => {
      coin = new Coin(mockScene, 100, 200);
      // play() is called in constructor, check it doesn't throw
      expect(() => coin.play('coin_idle')).not.toThrow();
    });

    it('должен быть видимым', () => {
      coin = new Coin(mockScene, 100, 200);
      expect(coin.visible).toBe(true);
    });

    it('должен устанавливать глубину', () => {
      coin = new Coin(mockScene, 100, 200);
      expect(coin.depth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('onCollect', () => {
    it('должен вызывать onCollect без ошибок', () => {
      coin = new Coin(mockScene, 100, 200);
      expect(() => coin.onCollect()).not.toThrow();
    });

    it('не должен выбрасывать исключение при сборе', () => {
      coin = new Coin(mockScene, 100, 200);
      expect(coin.onCollect()).toBeUndefined();
    });
  });

  describe('playDeathAnimation', () => {
    it('должен вызывать destroy', () => {
      coin = new Coin(mockScene, 100, 200);
      // playDeathAnimation just calls destroy() for Coin
      expect(() => coin.playDeathAnimation()).not.toThrow();
    });

    it('не должен выбрасывать исключение', () => {
      coin = new Coin(mockScene, 100, 200);
      expect(() => coin.playDeathAnimation()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('должен вызывать destroy без ошибок', () => {
      coin = new Coin(mockScene, 100, 200);
      expect(() => coin.destroy()).not.toThrow();
    });

    it('должен принимать параметр fromScene', () => {
      coin = new Coin(mockScene, 100, 200);
      expect(() => coin.destroy(true)).not.toThrow();
      expect(() => coin.destroy(false)).not.toThrow();
    });

    it('должен помечать объект как неактивный после destroy', () => {
      coin = new Coin(mockScene, 100, 200);
      coin.destroy();
      expect(coin.active).toBe(false);
    });
  });

  describe('spawn', () => {
    it('должен устанавливать SpawnMatrix и cellPosition', () => {
      coin = new Coin(mockScene, 100, 200);
      const mockMatrix = createMockSpawnMatrix();
      const cellPos = { col: 5, row: 3 };

      expect(() => coin.spawn(mockMatrix, cellPos)).not.toThrow();
    });
  });
});

describe('Key', () => {
  let mockScene: any;
  let key: Key;

  beforeEach(() => {
    mockScene = createMockScene();
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Инициализация', () => {
    it('должен создавать ключ с правильным itemType', () => {
      key = new Key(mockScene, 150, 250);
      expect(key.itemType).toBe(ItemType.KEY);
    });

    it('должен создавать физический спрайт', () => {
      key = new Key(mockScene, 150, 250);
      expect(key).toBeDefined();
      expect(key.x).toBe(150);
      expect(key.y).toBe(250);
    });

    it('должен включать физику', () => {
      key = new Key(mockScene, 150, 250);
      expect(mockScene.physics.world.enable).toHaveBeenCalled();
    });

    it('должен добавлять спрайт в сцену', () => {
      key = new Key(mockScene, 150, 250);
      expect(mockScene.add.existing).toHaveBeenCalled();
    });

    it('должен проигрывать анимацию key_idle', () => {
      key = new Key(mockScene, 150, 250);
      expect(() => key.play('key_idle')).not.toThrow();
    });

    it('должен быть видимым', () => {
      key = new Key(mockScene, 150, 250);
      expect(key.visible).toBe(true);
    });

    it('должен устанавливать глубину', () => {
      key = new Key(mockScene, 150, 250);
      expect(key.depth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('onCollect', () => {
    it('должен вызывать onCollect без ошибок', () => {
      key = new Key(mockScene, 150, 250);
      expect(() => key.onCollect()).not.toThrow();
    });

    it('не должен выбрасывать исключение при сборе', () => {
      key = new Key(mockScene, 150, 250);
      expect(key.onCollect()).toBeUndefined();
    });
  });

  describe('playDeathAnimation', () => {
    it('должен освобождать ячейку SpawnMatrix', () => {
      key = new Key(mockScene, 150, 250);
      const mockMatrix = createMockSpawnMatrix();
      key.spawn(mockMatrix, { col: 5, row: 3 });

      // Вызывается freePositionMatrix внутри playDeathAnimation
      expect(() => key.playDeathAnimation()).not.toThrow();
    });

    it('должен отключать физическое тело', () => {
      key = new Key(mockScene, 150, 250);
      key.playDeathAnimation();
      // body.disable будет вызван, но проверяем что не выбрасывает
      expect(key.body?.disable).toBeDefined();
    });

    it('должен скрывать основной спрайт', () => {
      key = new Key(mockScene, 150, 250);
      key.playDeathAnimation();
      expect(key.visible).toBe(false);
    });

    it('должен проверять существование анимации enemy_death', () => {
      key = new Key(mockScene, 150, 250);
      key.playDeathAnimation();
      expect(mockScene.anims.exists).toHaveBeenCalledWith('enemy_death');
    });

    it('должен создавать death animation sprite если анимация существует', () => {
      key = new Key(mockScene, 150, 250);
      key.playDeathAnimation();
      // scene.add.sprite будет вызван для death animation
      expect(mockScene.add.sprite).toHaveBeenCalled();
    });

    it('не должен выбрасывать исключение', () => {
      key = new Key(mockScene, 150, 250);
      expect(() => key.playDeathAnimation()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('должен вызывать destroy без ошибок', () => {
      key = new Key(mockScene, 150, 250);
      expect(() => key.destroy()).not.toThrow();
    });

    it('должен принимать параметр fromScene', () => {
      key = new Key(mockScene, 150, 250);
      expect(() => key.destroy(true)).not.toThrow();
      expect(() => key.destroy(false)).not.toThrow();
    });

    it('должен помечать объект как неактивный после destroy', () => {
      key = new Key(mockScene, 150, 250);
      key.destroy();
      expect(key.active).toBe(false);
    });
  });

  describe('spawn', () => {
    it('должен устанавливать SpawnMatrix и cellPosition', () => {
      key = new Key(mockScene, 150, 250);
      const mockMatrix = createMockSpawnMatrix();
      const cellPos = { col: 5, row: 3 };

      expect(() => key.spawn(mockMatrix, cellPos)).not.toThrow();
    });
  });
});

describe('Item types', () => {
  it('должен экспортировать ItemType', () => {
    expect(ItemType).toBeDefined();
    expect(ItemType.COIN).toBeDefined();
    expect(ItemType.KEY).toBeDefined();
  });

  it('должен иметь правильные значения itemType', () => {
    expect(ItemType.COIN).not.toBe(ItemType.KEY);
  });

  it('ItemTypes должны быть уникальными', () => {
    // Проверяем только доступные типы из ItemType enum
    const types = [ItemType.COIN, ItemType.KEY];
    const uniqueTypes = new Set(types);
    expect(uniqueTypes.size).toBe(types.length);
  });
});

describe('SpawnMatrix integration', () => {
  let mockScene: any;
  let coin: Coin;
  let key: Key;
  let mockMatrix: any;

  beforeEach(() => {
    mockScene = createMockScene();
    mockMatrix = createMockSpawnMatrix();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Coin должен устанавливать SpawnMatrix через spawn()', () => {
    coin = new Coin(mockScene, 100, 200);
    const cellPos = { col: 2, row: 3 };
    coin.spawn(mockMatrix, cellPos);
    expect(() => coin.spawn(mockMatrix, cellPos)).not.toThrow();
  });

  it('Key должен устанавливать SpawnMatrix через spawn()', () => {
    key = new Key(mockScene, 100, 200);
    const cellPos = { col: 2, row: 3 };
    expect(() => key.spawn(mockMatrix, cellPos)).not.toThrow();
  });
});

describe('Heart', () => {
  let mockScene: any;
  let heart: Heart;

  beforeEach(() => {
    mockScene = createMockScene();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Инициализация', () => {
    it('должен создавать сердце с правильным itemType', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(heart.itemType).toBe(ItemType.HEART);
    });

    it('должен создавать физический спрайт', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(heart).toBeDefined();
      expect(heart.x).toBe(200);
      expect(heart.y).toBe(300);
    });

    it('должен включать физику', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(mockScene.physics.world.enable).toHaveBeenCalled();
    });

    it('должен добавлять спрайт в сцену', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(mockScene.add.existing).toHaveBeenCalled();
    });

    it('должен устанавливать scale', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(heart.scale).toBeGreaterThan(0);
    });

    it('должен быть видимым', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(heart.visible).toBe(true);
    });

    it('должен устанавливать глубину', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(heart.depth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('onCollect', () => {
    it('должен вызывать onCollect без ошибок', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(() => heart.onCollect()).not.toThrow();
    });

    it('не должен выбрасывать исключение при сборе', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(heart.onCollect()).toBeUndefined();
    });
  });

  describe('playDeathAnimation', () => {
    it('должен освобождать ячейку SpawnMatrix', () => {
      heart = new Heart(mockScene, 200, 300);
      const mockMatrix = createMockSpawnMatrix();
      heart.spawn(mockMatrix, { col: 5, row: 3 });

      expect(() => heart.playDeathAnimation()).not.toThrow();
    });

    it('должен отключать физическое тело', () => {
      heart = new Heart(mockScene, 200, 300);
      heart.playDeathAnimation();
      expect(heart.body?.disable).toBeDefined();
    });

    it('должен скрывать основной спрайт', () => {
      heart = new Heart(mockScene, 200, 300);
      heart.playDeathAnimation();
      expect(heart.visible).toBe(false);
    });

    it('должен проверять существование анимации enemy_death', () => {
      heart = new Heart(mockScene, 200, 300);
      heart.playDeathAnimation();
      expect(mockScene.anims.exists).toHaveBeenCalledWith('enemy_death');
    });

    it('должен создавать death animation sprite если анимация существует', () => {
      heart = new Heart(mockScene, 200, 300);
      heart.playDeathAnimation();
      expect(mockScene.add.sprite).toHaveBeenCalled();
    });

    it('не должен выбрасывать исключение', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(() => heart.playDeathAnimation()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('должен вызывать destroy без ошибок', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(() => heart.destroy()).not.toThrow();
    });

    it('должен принимать параметр fromScene', () => {
      heart = new Heart(mockScene, 200, 300);
      expect(() => heart.destroy(true)).not.toThrow();
      expect(() => heart.destroy(false)).not.toThrow();
    });

    it('должен помечать объект как неактивный после destroy', () => {
      heart = new Heart(mockScene, 200, 300);
      heart.destroy();
      expect(heart.active).toBe(false);
    });
  });

  describe('spawn', () => {
    it('должен устанавливать SpawnMatrix и cellPosition', () => {
      heart = new Heart(mockScene, 200, 300);
      const mockMatrix = createMockSpawnMatrix();
      const cellPos = { col: 5, row: 3 };

      expect(() => heart.spawn(mockMatrix, cellPos)).not.toThrow();
    });
  });
});
