/**
 * Unit тесты для SpawnSystem
 */

import { SpawnSystem } from '../../../game/systems/SpawnSystem';
import { LevelManager } from '../../../game/core/LevelManager';
import { EnemyType } from '../../../types/enemyTypes';
import { BASE_SCALE, ACTOR_SIZES, MAP_WIDTH, MAP_HEIGHT } from '../../../constants/gameConstants';
import Phaser from 'phaser';

// Моки
jest.mock('../../../game/core/LevelManager');
jest.mock('../../../game/entities/enemies/EnemyRandomWalker');
jest.mock('../../../game/entities/enemies/EnemyChaser');
jest.mock('../../../game/entities/enemies/EnemyFlam');

// Мокаем Phaser.Math.Between
jest.mock('phaser', () => ({
  Math: {
    Between: jest.fn((min, max) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }),
    Distance: {
      Between: jest.fn((x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
      })
    }
  },
  Utils: {
    Array: {
      Shuffle: jest.fn((array: any[]) => {
        // Простая реализация перемешивания для тестов
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      })
    }
  },
  // ⚠️ ADDED: Physics.Arcade.Sprite needed for AbstractItem extends Phaser.Physics.Arcade.Sprite
  Physics: {
    Arcade: {
      Sprite: class MockArcadeSprite {},
    }
  }
}));

describe('SpawnSystem', () => {
  let mockScene: Phaser.Scene;
  let mockLevelManager: jest.Mocked<LevelManager>;
  let spawnSystem: SpawnSystem;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleLog: typeof console.log;

  const mockSpawnConfig = {
    initialCount: {
      randomWalker: 5,
      chaser: 3
    },
    periodicSpawnDelay: 6000,
    maxEnemies: 15,
    enabledTypes: [EnemyType.RANDOM_WALKER, EnemyType.CHASER]
  };

  const mockSpeedConfig = {
    randomWalker: 80,
    chaser: 45
  };

  const mockItemConfig = {
    hearts: {
      initial: 5,
      max: 10,
      spawnDelay: 24000
    },
    keys: {
      initial: 8,
      max: 12,
      spawnDelay: 24000
    }
  };

  beforeEach(() => {
    // Отключаем логи в тестах
    originalConsoleWarn = console.warn;
    originalConsoleLog = console.log;
    console.warn = jest.fn();
    console.log = jest.fn();

    // Сбрасываем мок рандома перед каждым тестом
    (Phaser.Math.Between as jest.Mock).mockImplementation((min, max) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    });

    mockScene = {
      textures: {
        exists: jest.fn().mockReturnValue(false)
      },
      physics: {
        add: {
          group: jest.fn()
        }
      },
      time: {
        now: 0,
        delayedCall: jest.fn((delay: number, callback: () => void) => {
          // Вызываем callback синхронно для тестов
          setTimeout(() => callback(), 0);
          return { remove: jest.fn() } as any;
        })
      },
      anims: {
        exists: jest.fn().mockReturnValue(true)
      },
      sys: {
        settings: {
          active: true
        }
      }
    } as any;

    mockLevelManager = {
      getEnemySpawnConfig: jest.fn().mockResolvedValue(mockSpawnConfig),
      getEnemySpeedConfig: jest.fn().mockResolvedValue(mockSpeedConfig),
      getEnemyHealthConfig: jest.fn().mockResolvedValue(undefined),
      getEnemyBehaviorConfigForType: jest.fn().mockResolvedValue(undefined),
      getItemSpawnConfig: jest.fn().mockResolvedValue(mockItemConfig),
      determineEnemyType: jest.fn().mockReturnValue(EnemyType.RANDOM_WALKER),
      getCurrentLevel: jest.fn().mockReturnValue(1)
    } as any;

    const mockQuizManager = {
      getUniqueMiniQuiz: jest.fn().mockResolvedValue({
        questionText: 'Test question',
        answers: ['A', 'B', 'C', 'D'],
        correctAnswer: 0
      })
    } as any;

    spawnSystem = new SpawnSystem(mockScene, mockLevelManager, mockQuizManager);
  });

  afterEach(() => {
    // Восстанавливаем консоль
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  });

  describe('Матричное позиционирование', () => {
    it('должен инициализировать матрицу правильного размера', () => {
      // @ts-ignore - доступ к приватному свойству для теста
      const matrix = spawnSystem.spawnMatrix;
      expect(matrix).toBeDefined();

      // Используем публичный метод для проверки размеров
      const size = matrix.getMatrixSize();
      expect(size.cols).toBeGreaterThan(0);
      expect(size.rows).toBeGreaterThan(0);
    });

    it('должен конвертировать мировые координаты в ячейки корректно', () => {
      const testX = 100;
      const testY = 100;
      const cell = spawnSystem.worldToCell(testX, testY);

      expect(cell.col).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeGreaterThanOrEqual(0);

      // Обратная проверка (примерно)
      const aligned = spawnSystem.alignToCell(testX, testY);
      const cellFromAligned = spawnSystem.worldToCell(aligned.x, aligned.y);
      expect(cellFromAligned).toEqual(cell);
    });
  });

  describe('Спавн ключевых объектов (Матрица)', () => {
    it('должен успешно спавнить Оракула в центре', () => {
      const pos = spawnSystem.spawnOracleMatrix();
      expect(pos.x).toBeDefined();
      expect(pos.y).toBeDefined();

      // Проверяем, что оракул занял место в матрице
      // @ts-ignore
      const matrix = spawnSystem.spawnMatrix;
      const cell = spawnSystem.worldToCell(pos.x, pos.y);
      // Оракул занимает 2x4 (или около того), проверим центральную точку
      expect(matrix.isRectFree(cell.col, cell.row, 1, 1)).toBe(false);
      expect(matrix.getCellType(cell.col, cell.row)).toBe('permanent');
    });

    it('должен спавнить Игрока рядом с Оракулом', () => {
      const oraclePos = spawnSystem.spawnOracleMatrix();
      const playerPos = spawnSystem.spawnPlayerMatrix(oraclePos.x, oraclePos.y);

      expect(playerPos.x).toBeDefined();
      expect(playerPos.y).toBeDefined();

      // Должен быть ниже оракула
      expect(playerPos.y).toBeGreaterThan(oraclePos.y);

      // @ts-ignore
      const matrix = spawnSystem.spawnMatrix;
      const cell = spawnSystem.worldToCell(playerPos.x, playerPos.y);
      // Игрок 'player' тип
      expect(matrix.getCellType(cell.col, cell.row)).toBe('player');
    });

    it('должен спавнить Порталы вокруг центра', () => {
      // Оракул занимает центр
      const oraclePos = spawnSystem.spawnOracleMatrix();

      // Спавним портал
      const radius = 300;
      const result = spawnSystem.spawnPortalMatrix(oraclePos.x, oraclePos.y, radius, 0);

      expect(result.success).toBe(true);
      expect(result.x).toBeDefined();
      expect(result.y).toBeDefined();

      // @ts-ignore
      const matrix = spawnSystem.spawnMatrix;
      const cell = spawnSystem.worldToCell(result.x, result.y);
      expect(matrix.getCellType(cell.col, cell.row)).toBe('permanent');
    });
  });

  describe('Спавн предметов и врагов (Матрица)', () => {
    it('должен находить свободное место для врага', () => {
      const result = spawnSystem.spawnEnemyMatrix();
      expect(result.success).toBe(true);

      // @ts-ignore
      const matrix = spawnSystem.spawnMatrix;
      const cell = spawnSystem.worldToCell(result.x, result.y);
      expect(matrix.getCellType(cell.col, cell.row)).toBe('enemy');
    });

    it('должен находить место для ключа', () => {
      const result = spawnSystem.spawnKeyMatrix();
      expect(result.success).toBe(true);
      // @ts-ignore
      const matrix = spawnSystem.spawnMatrix;
      const cell = spawnSystem.worldToCell(result.x, result.y);
      expect(matrix.getCellType(cell.col, cell.row)).toBe('item');
    });

    it('должен находить место для сердца', () => {
      const result = spawnSystem.spawnHeartMatrix();
      expect(result.success).toBe(true);
      // @ts-ignore
      const matrix = spawnSystem.spawnMatrix;
      const cell = spawnSystem.worldToCell(result.x, result.y);
      expect(matrix.getCellType(cell.col, cell.row)).toBe('item');
    });
  });

  describe('Сценарии спавна (Интеграция)', () => {
    let mockEnemyGroup: Phaser.Physics.Arcade.Group;
    let mockChaserGroup: Phaser.Physics.Arcade.Group;
    let mockHeartsGroup: Phaser.Physics.Arcade.Group;
    let mockRunesGroup: Phaser.Physics.Arcade.Group;

    beforeEach(() => {
      mockEnemyGroup = {
        countActive: jest.fn().mockReturnValue(0),
        add: jest.fn(),
        getChildren: jest.fn().mockReturnValue([]),
        scene: mockScene
      } as any;
      mockChaserGroup = {
        countActive: jest.fn().mockReturnValue(0),
        add: jest.fn(),
        getChildren: jest.fn().mockReturnValue([]),
        scene: mockScene
      } as any;
      mockHeartsGroup = {
        countActive: jest.fn().mockReturnValue(0),
        create: jest.fn().mockReturnValue({ setScale: jest.fn(), setDepth: jest.fn() }),
        getChildren: jest.fn().mockReturnValue([]),
        scene: mockScene
      } as any;
      mockRunesGroup = {
        countActive: jest.fn().mockReturnValue(0),
        create: jest.fn().mockReturnValue({
          setScale: jest.fn(),
          setDepth: jest.fn(),
          play: jest.fn(),
          getData: jest.fn().mockReturnValue(undefined),
          setData: jest.fn()
        }),
        getChildren: jest.fn().mockReturnValue([]),
        scene: mockScene
      } as any;
    });

    it('spawnInitialEnemies должен вызывать spawnEnemyMatrix и добавлять врагов', async () => {
      await spawnSystem.spawnInitialEnemies(mockEnemyGroup, mockChaserGroup);

      // Ждем выполнения отложенных вызовов
      await new Promise(resolve => setTimeout(resolve, 100));

      const totalEnemies = (mockSpawnConfig.initialCount?.randomWalker || 0) +
        (mockSpawnConfig.initialCount?.chaser || 0);

      if (totalEnemies > 0) {
        expect(mockEnemyGroup.add).toHaveBeenCalled(); // или mockChaserGroup.add
      }
    });

    it('spawnItems должен спавнить указанное количество предметов', async () => {
      // Add gameState to mockScene for game phase
      (mockScene as any).gameState = {
        getGamePhase: jest.fn().mockReturnValue('key')
      };

      // Update itemConfig to have keys instead of runes
      const updatedItemConfig = {
        hearts: mockItemConfig.hearts,
        keys: mockItemConfig.keys, // Changed from runes to keys
        coins: { initial: 0, max: 3, spawnDelay: 24000 }
      };

      // Mock getItemSpawnConfig to return updated config
      (mockLevelManager.getItemSpawnConfig as jest.Mock).mockResolvedValue(updatedItemConfig);

      // Add mock coinsGroup
      const mockCoinsGroup = {
        countActive: jest.fn().mockReturnValue(0),
        add: jest.fn(),
        getChildren: jest.fn().mockReturnValue([]),
        scene: mockScene
      } as any;

      await spawnSystem.spawnItems(mockHeartsGroup, mockRunesGroup, mockCoinsGroup);

      expect(mockHeartsGroup.create).toHaveBeenCalledTimes(updatedItemConfig.hearts.initial);
      expect(mockRunesGroup.create).toHaveBeenCalledTimes(updatedItemConfig.keys.initial);
    });

    it('spawnEnemy не должен спавнить сверх лимита', async () => {
      // Mock 100 active enemies in the group
      const activeEnemies = Array(100).fill(null).map(() => ({ active: true }));
      mockEnemyGroup.getChildren = jest.fn().mockReturnValue(activeEnemies);
      mockChaserGroup.getChildren = jest.fn().mockReturnValue([]);

      await spawnSystem.spawnEnemy(mockEnemyGroup, mockChaserGroup);

      expect(mockEnemyGroup.add).not.toHaveBeenCalled();
      expect(mockChaserGroup.add).not.toHaveBeenCalled();
    });
  });
});
