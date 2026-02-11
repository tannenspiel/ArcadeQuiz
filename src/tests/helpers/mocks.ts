/**
 * Mock helpers for Phaser objects in tests
 *
 * Provides typed mock objects for common Phaser types to avoid
 * TypeScript compilation errors in tests.
 */

import Phaser from 'phaser';
import { jest } from '@jest/globals';  // ⚠️ ADDED: For jest.fn() mocks

/**
 * Creates a mock Phaser.Scene with all required properties
 */
export function createMockScene(): Partial<Phaser.Scene> {
  return {
    sys: {
      settings: { active: true },
      queueDepthSort: () => { },
      events: { once: () => { }, on: () => { }, off: () => { }, emit: () => { }, removeAllListeners: () => { } },
    } as any,
    game: {
      config: {},
      events: { once: () => { }, on: () => { }, off: () => { }, emit: () => { }, removeAllListeners: () => { } },
    } as any,
    cache: {
      tilemap: { add: () => { }, exists: () => false, get: () => null, remove: () => { } },
    } as any,
    registry: {
      get: () => null,
      set: () => { },
      has: () => false,
      remove: () => { },
      destroy: () => { },
    } as any,
    physics: {
      world: {
        bounds: { x: 0, y: 0, width: 1920, height: 1280 },
        colliders: [],
        enable: () => { },
        disable: () => { },
        setBounds: jest.fn(),  // ⚠️ ADDED: Needed for BaseScene.setupPhysics tests
      },
      add: {
        collider: () => { },
        overlap: () => { },
        existing: () => { },
      },
    } as any,
    add: {
      image: () => ({} as any),
      sprite: () => ({} as any),
      text: () => ({} as any),
      rectangle: () => ({} as any),
    } as any,
    time: {
      now: 0,
      delayedCall: () => ({} as any),
      addEvent: () => ({} as any),
    } as any,
    textures: {
      exists: () => false,
      get: () => null
    } as any,
    cameras: {
      main: {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        centerOn: () => { },
        setBounds: jest.fn(),  // ⚠️ ADDED: Needed for BaseScene.setupCamera tests
        setZoom: jest.fn(),
      },
    } as any,
    input: {
      keyboard: { addKey: () => { }, createCursorKeys: () => ({}) },
      mouse: { x: 0, y: 0 },
    } as any,
    load: {
      image: () => ({} as any),
      spritesheet: () => ({} as any),
      tilemapTiledJSON: () => ({} as any),
    } as any,
    anims: {
      create: () => { },
      get: () => null,
      play: () => { },
      stop: () => { },
    } as any,
    events: {
      once: () => { },
      on: () => { },
      off: () => { },
      emit: () => { },
      removeAllListeners: () => { },
    } as any,
    scene: {
      start: () => { },
      stop: () => { },
      sleep: () => { },
      wake: () => { },
      get: () => ({} as any),
    } as any,
  };
}

/**
 * Creates a mock Phaser.GameObjects.Sprite
 */
export function createMockSprite(props?: Partial<Phaser.GameObjects.Sprite>): Partial<Phaser.GameObjects.Sprite> {
  return {
    active: true,
    x: 0,
    y: 0,
    width: 32,
    height: 32,
    scale: 1,
    alpha: 1,
    visible: true,
    depth: 0,
    rotation: 0,
    destroy: jest.fn(),
    setTexture: jest.fn(),
    setFrame: jest.fn(),
    setPosition: jest.fn(),
    setOrigin: jest.fn(),
    setScale: jest.fn(),
    setAlpha: jest.fn(),
    setVisible: jest.fn(),
    setDepth: jest.fn(),
    setRotation: jest.fn(),
    setInteractive: jest.fn(),
    once: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    update: jest.fn(),
    // preUpdate: jest.fn(),  // Not in Partial<Sprite> type
    body: null,
    anims: {
      play: jest.fn(),
      stop: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
    } as any,
    ...props,
  };
}

/**
 * Creates a mock Phaser.Time.TimerEvent
 */
export function createMockTimerEvent(): Partial<Phaser.Time.TimerEvent> {
  return {
    delay: 0,
    repeat: 0,
    repeatCount: 0,
    loop: false,
    paused: false,
    timeScale: 1,
    elapsed: 0,
    // destroyed: false,  // Not in Partial<TimerEvent> type
    destroy: jest.fn(),
    // pause, resume, reset, remove not in Partial<TimerEvent> type
  };
}

/**
 * Creates a mock Phaser.GameObjects.TileSprite
 */
export function createMockTileSprite(): Partial<Phaser.GameObjects.TileSprite> {
  return {
    active: true,
    x: 0,
    y: 0,
    width: 64,
    height: 64,
    tilePositionX: 0,
    tilePositionY: 0,
    tileScaleX: 1,
    tileScaleY: 1,
    destroy: jest.fn(),
    setTilePosition: jest.fn(),
    setTileScale: jest.fn(),
    ...createMockSprite(),
  } as any;
}

/**
 * Creates a mock BushCollisionObject
 */
export function createMockBushCollisionObject(): any {
  return {
    spawnOnMap: jest.fn(),
    scene: null,
    sprites: [],
    config: {},
    destroy: jest.fn(),
  };
}

/**
 * Creates a mock Phaser.Physics.Arcade.Sprite (SpriteWithDynamicBody)
 */
export function createMockPhysicsSprite(): Partial<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody> {
  return {
    ...createMockSprite(),
    body: {
      x: 0,
      y: 0,
      width: 32,
      height: 32,
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      maxVelocity: { x: 0, y: 0 },
      drag: { x: 0, y: 0 },
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
      setAcceleration: jest.fn(),
      setAccelerationX: jest.fn(),
      setAccelerationY: jest.fn(),
    } as any,
  } as any;
}

/**
 * Creates a mock for ParsedQuestion type
 */
export function createMockParsedQuestion(overrides?: Partial<any>): any {
  return {
    type: 'multiple-choice',
    questionText: 'Test question?',
    correctAnswer: 'Correct',
    wrongAnswers: ['Wrong 1', 'Wrong 2', 'Wrong 3'],
    allAnswers: ['Correct', 'Wrong 1', 'Wrong 2', 'Wrong 3'],
    feedbacks: ['Good job!', 'Try again', 'Try again', 'Try again'],
    wrongFeedbacks: ['Try again', 'Try again', 'Try again'],
    ...overrides,
  };
}

/**
 * Creates a mock GameState object
 */
export function createMockGameState(): any {
  return {
    health: 3,
    maxHealth: 3,
    keys: 0,
    maxKeys: 3,
    oracleActivated: false,
    getHealth: () => 3,
    setHealth: jest.fn(),
    addHealth: jest.fn(),
    takeDamage: jest.fn(),
    getKeys: () => 0,
    setKeys: jest.fn(),
    addKey: jest.fn(),
    reset: jest.fn(),
    // Mobile-specific methods
    // ... possibly others

    // Coin & Phase methods (Added 2026-01-31)
    getCoins: () => 0,
    setCoins: jest.fn(),
    addCoin: jest.fn(),
    removeCoin: jest.fn(),
    getMaxCoins: () => 3,

    getGamePhase: () => 'coin',
    setGamePhase: jest.fn(),

    isQuizActive: () => false,
    setQuizActive: jest.fn(),
    getQuizType: () => null,

    // Base methods
    getState: () => ({
      health: 3,
      keys: 0,
      oracleActivated: false,
      currentPhase: 'coin',
      coins: 0,
      maxCoins: 3,
      isQuizActive: false,
      quizType: null
    }),
  };
}
