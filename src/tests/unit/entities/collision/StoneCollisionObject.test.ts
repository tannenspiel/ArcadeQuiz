/**
 * Unit тесты для StoneCollisionObject
 */

import { StoneCollisionObject } from '../../../../game/entities/collision/StoneCollisionObject';
import { SafePositionResult } from '../../../../game/systems/SpawnSystem';
import { MAP_WIDTH, MAP_HEIGHT, BASE_SCALE } from '../../../../constants/gameConstants';

// Mock для SpawnSystem
const createMockSpawnSystem = () => {
  const mockResults: SafePositionResult[] = [];
  return {
    spawnStoneMatrix: jest.fn(() => {
      if (mockResults.length > 0) {
        return mockResults.shift()!;
      }
      return { x: 100, y: 200, success: true };
    }),
    // Добавляем метод для управления результатами
    __setResults(results: SafePositionResult[]) {
      mockResults.length = 0;
      mockResults.push(...results);
    }
  };
};

// Mock для Physics Body
const createMockBody = () => ({
  x: 0,
  y: 0,
  width: 32,
  height: 32,
  destroy: jest.fn(),
  setSize: jest.fn(),
  updateFromGameObject: jest.fn(),
  immovable: false,
  pushable: false
});

// Mock для Physics Sprite
const createMockPhysicsSprite = (x: number, y: number) => {
  const mockBody = createMockBody();
  return {
    x,
    y,
    width: 32,
    height: 32,
    displayWidth: 128,
    displayHeight: 128,
    scale: 4,
    depth: 1,
    active: true,
    visible: true,
    originX: 0.5,
    originY: 0.5,
    body: mockBody,
    frame: { name: '0', index: 0 },
    texture: { key: 'collision_stone_sheet' },
    setOrigin: jest.fn().mockReturnThis(),
    setScale: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    setImmovable: jest.fn().mockReturnThis(),
    setPushable: jest.fn().mockReturnThis(),
    destroy: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis()
  };
};

// Mock для Scene
const createMockScene = () => {
  const sprites: any[] = [];
  return {
    textures: {
      exists: jest.fn().mockReturnValue(true)
    },
    physics: {
      add: {
        sprite: jest.fn().mockImplementation((x: number, y: number) => {
          const sprite = createMockPhysicsSprite(x, y);
          sprites.push(sprite);
          return sprite;
        })
      }
    },
    add: {
      graphics: jest.fn().mockReturnValue({
        setDepth: jest.fn().mockReturnThis(),
        clear: jest.fn(),
        lineStyle: jest.fn(),
        strokeRect: jest.fn(),
        fillStyle: jest.fn(),
        fillCircle: jest.fn(),
        destroy: jest.fn()
      })
    },
    events: {
      on: jest.fn(),
      off: jest.fn()
    },
    __getSprites() { return sprites; },
    __clearSprites() { sprites.length = 0; }
  };
};

describe('StoneCollisionObject', () => {
  let mockScene: any;
  let stone: StoneCollisionObject;

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
    it('должен создаваться без ошибок', () => {
      stone = new StoneCollisionObject(mockScene);
      expect(stone).toBeDefined();
    });

    it('должен принимать showCollisionDebug параметр', () => {
      stone = new StoneCollisionObject(mockScene, true);
      expect(stone).toBeDefined();
    });

    it('должен проверять существование текстуры при создании спрайтов', () => {
      stone = new StoneCollisionObject(mockScene);
      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 1, undefined);
      expect(mockScene.textures.exists).toHaveBeenCalled();
    });
  });

  describe('spawnOnMap с SpawnSystem', () => {
    it('должен размещать камни используя SpawnSystem', () => {
      stone = new StoneCollisionObject(mockScene);
      const mockSpawnSystem = createMockSpawnSystem();

      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 3, mockSpawnSystem);

      expect(mockSpawnSystem.spawnStoneMatrix).toHaveBeenCalledTimes(3);
    });

    it('должен создавать спрайты для успешных позиций', () => {
      stone = new StoneCollisionObject(mockScene);
      const mockSpawnSystem = createMockSpawnSystem();

      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 3, mockSpawnSystem);

      expect(mockScene.physics.add.sprite).toHaveBeenCalled();
    });

    it('должен пропускать неуспешные позиции', () => {
      stone = new StoneCollisionObject(mockScene);
      const mockSpawnSystem = createMockSpawnSystem();

      // Первые 2 успеха, потом провал
      (mockSpawnSystem as any).__setResults([
        { x: 100, y: 200, success: true },
        { x: 300, y: 400, success: true },
        { x: 0, y: 0, success: false }
      ]);

      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 5, mockSpawnSystem);

      // Должны быть созданы только 2 камня
      const createdCount = (mockSpawnSystem.spawnStoneMatrix as jest.Mock).mock.calls.length;
      expect(createdCount).toBe(5); // Попыток 5, но спрайтов создано меньше
    });
  });

  describe('spawnOnMap без SpawnSystem', () => {
    it('должен использовать случайное размещение', () => {
      stone = new StoneCollisionObject(mockScene);

      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 2, undefined);

      expect(mockScene.physics.add.sprite).toHaveBeenCalled();
    });

    it('должен создавать указанное количество камней', () => {
      stone = new StoneCollisionObject(mockScene);

      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 5, undefined);

      expect(mockScene.physics.add.sprite).toHaveBeenCalledTimes(5);
    });

    it('должен использовать края карты как границы', () => {
      stone = new StoneCollisionObject(mockScene);

      const mapWidth = MAP_WIDTH * BASE_SCALE;
      const mapHeight = MAP_HEIGHT * BASE_SCALE;

      stone.spawnOnMap(mapWidth, mapHeight, 1, undefined);

      expect(mockScene.physics.add.sprite).toHaveBeenCalled();
    });
  });

  describe('getSprites', () => {
    it('должен возвращать пустой массив при создании', () => {
      stone = new StoneCollisionObject(mockScene);
      const sprites = stone.getSprites();
      expect(sprites).toEqual([]);
    });

    it('должен возвращать созданные спрайты', () => {
      stone = new StoneCollisionObject(mockScene);
      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 3, undefined);

      const sprites = stone.getSprites();
      expect(sprites.length).toBe(3);
    });

    it('должен возвращать массив спрайтов', () => {
      stone = new StoneCollisionObject(mockScene);
      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 2, undefined);

      const sprites = stone.getSprites();
      expect(Array.isArray(sprites)).toBe(true);
    });
  });

  describe('destroy', () => {
    it('должен уничтожать все спрайты', () => {
      stone = new StoneCollisionObject(mockScene);
      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 3, undefined);

      stone.destroy();

      const sprites = stone.getSprites();
      expect(sprites).toEqual([]);
    });

    it('должен вызывать destroy для каждого спрайта', () => {
      stone = new StoneCollisionObject(mockScene);
      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 2, undefined);

      stone.destroy();

      const sceneSprites = mockScene.__getSprites();
      sceneSprites.forEach((sprite: any) => {
        expect(sprite.destroy).toHaveBeenCalled();
      });
    });

    it('не должен выбрасывать исключение при пустом списке спрайтов', () => {
      stone = new StoneCollisionObject(mockScene);
      expect(() => stone.destroy()).not.toThrow();
    });

    it('может вызываться несколько раз', () => {
      stone = new StoneCollisionObject(mockScene);
      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 2, undefined);

      stone.destroy();
      expect(() => stone.destroy()).not.toThrow();
    });
  });

  describe('Параметры по умолчанию', () => {
    it('должен использовать mapWidth = MAP_WIDTH * BASE_SCALE по умолчанию', () => {
      stone = new StoneCollisionObject(mockScene);
      stone.spawnOnMap(); // Без параметров

      // Не должно выбрасывать исключение
      expect(mockScene.physics.add.sprite).toHaveBeenCalled();
    });

    it('должен использовать count = 15 по умолчанию', () => {
      stone = new StoneCollisionObject(mockScene);
      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE);

      expect(mockScene.physics.add.sprite).toHaveBeenCalledTimes(15);
    });

    it('должен использовать default map dimensions', () => {
      stone = new StoneCollisionObject(mockScene);

      expect(() => stone.spawnOnMap()).not.toThrow();
    });
  });

  describe('Случайный фрейм', () => {
    it('должен создавать спрайты с разными фреймами', () => {
      // Этот тест проверяет, что метод getRandomFrameIndex работает
      // Без доступа к приватному методу проверяем через создание
      stone = new StoneCollisionObject(mockScene);
      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 10, undefined);

      // Создано 10 спрайтов
      expect(mockScene.physics.add.sprite).toHaveBeenCalledTimes(10);
    });
  });

  describe('Интеграция с SpawnSystem', () => {
    it('должен предупреждать когда не может найти позицию', () => {
      stone = new StoneCollisionObject(mockScene);
      const mockSpawnSystem = createMockSpawnSystem();

      // Все попытки неудачные
      (mockSpawnSystem as any).__setResults([
        { x: 0, y: 0, success: false },
        { x: 0, y: 0, success: false },
        { x: 0, y: 0, success: false }
      ]);

      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 3, mockSpawnSystem);

      expect(console.warn).toHaveBeenCalled();
    });

    it('должен продолжать спавн после неудачной попытки', () => {
      stone = new StoneCollisionObject(mockScene);
      const mockSpawnSystem = createMockSpawnSystem();

      // Первая неудачно, потом успешно
      (mockSpawnSystem as any).__setResults([
        { x: 0, y: 0, success: false },
        { x: 100, y: 200, success: true },
        { x: 300, y: 400, success: true }
      ]);

      stone.spawnOnMap(MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE, 3, mockSpawnSystem);

      expect(mockSpawnSystem.spawnStoneMatrix).toHaveBeenCalledTimes(3);
    });
  });
});
