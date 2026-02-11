/**
 * Unit тесты для LevelManager
 */

import { LevelManager } from '../../../game/core/LevelManager';
import { AssetLoader } from '../../../game/core/AssetLoader';
import { LevelConfig } from '../../../types/levelTypes';
import { EnemyType } from '../../../types/enemyTypes';
import { LevelAssetKeys } from '../../../constants/gameConstants';

// Моки
jest.mock('../../../game/core/AssetLoader');

describe('LevelManager', () => {
  let mockAssetLoader: jest.Mocked<AssetLoader>;
  let levelManager: LevelManager;

  const mockLevelConfig: LevelConfig = {
    levelNumber: 1,
    enemySpawn: {
      initialCount: {
        randomWalker: 5,
        chaser: 3
      },
      periodicSpawnDelay: 6000,
      maxEnemies: 15,
      enabledTypes: [EnemyType.RANDOM_WALKER, EnemyType.CHASER]
    },
    enemySpeed: {
      randomWalker: 80,
      chaser: 45
    },
    itemSpawn: {
      hearts: {
        initial: 5,
        max: 10,
        spawnDelay: 24000
      },
      keys: {
        initial: 8,
        max: 12,
        spawnDelay: 24000
      },
      coins: {
        initial: 5,
        max: 10,
        spawnDelay: 15000
      }
    }
  };

  beforeEach(() => {
    mockAssetLoader = {
      loadJSON: jest.fn(),
      getJSON: jest.fn() // Добавляем мок для getJSON
    } as any;

    levelManager = new LevelManager(mockAssetLoader);
  });

  describe('Управление уровнем', () => {
    it('должен инициализироваться с уровнем 1', () => {
      expect(levelManager.getCurrentLevel()).toBe(1);
    });

    it('должен устанавливать текущий уровень', () => {
      levelManager.setCurrentLevel(5);
      expect(levelManager.getCurrentLevel()).toBe(5);
    });

    it('должен переходить на следующий уровень', async () => {
      // Mock getJSON instead of loadJSON
      (mockAssetLoader.getJSON as jest.Mock).mockReturnValue(mockLevelConfig);

      await levelManager.nextLevel();

      expect(levelManager.getCurrentLevel()).toBe(2);
    });

    it('должен сбрасывать на первый уровень', () => {
      levelManager.setCurrentLevel(5);
      levelManager.reset();

      expect(levelManager.getCurrentLevel()).toBe(1);
    });
  });

  describe('Загрузка конфигов', () => {
    it('должен возвращать конфиг уровня из кеша Phaser (getJSON)', async () => {
      // Setup successful cache hit
      (mockAssetLoader.getJSON as jest.Mock).mockReturnValue(mockLevelConfig);

      const config = await levelManager.loadLevelConfig(1);

      // Verify call to AssetLoader
      expect(mockAssetLoader.getJSON).toHaveBeenCalledWith(LevelAssetKeys.getLevelConfig(1));

      expect(config.levelNumber).toBe(1);
      expect(config).toHaveProperty('enemySpawn');
    });

    it('должен кэшировать загруженные конфиги внутри менеджера', async () => {
      (mockAssetLoader.getJSON as jest.Mock).mockReturnValue(mockLevelConfig);

      // Первый вызов идет в AssetLoader
      await levelManager.loadLevelConfig(1);

      // Второй вызов берет из внутреннего Map
      await levelManager.loadLevelConfig(1);

      expect(mockAssetLoader.getJSON).toHaveBeenCalledTimes(1);
    });

    it('должен возвращать дефолтный конфиг при отсутствии в кеше', async () => {
      // Setup cache miss
      (mockAssetLoader.getJSON as jest.Mock).mockReturnValue(null);

      const config = await levelManager.loadLevelConfig(999);

      // Default config structure check
      expect(config.levelNumber).toBe(999);
      expect(config.enemySpawn).toBeDefined();
    });

    it('должен валидировать и исправлять битые конфиги', async () => {
      // Partial config (missing enemySpawn)
      const brokenConfig = { levelNumber: 1, itemSpawn: {} };
      (mockAssetLoader.getJSON as jest.Mock).mockReturnValue(brokenConfig);

      const config = await levelManager.loadLevelConfig(1);

      // Should have merged with default
      expect(config.enemySpawn).toBeDefined();
      // Should still preserve what was valid (though we merged defaults which might match)
      expect(config.levelNumber).toBe(1);
    });

    it('должен получать конфиг текущего уровня', async () => {
      // Setup for level 2
      levelManager.setCurrentLevel(2);
      const mockConfigL2 = { ...mockLevelConfig, levelNumber: 2 };
      (mockAssetLoader.getJSON as jest.Mock).mockReturnValue(mockConfigL2);

      const config = await levelManager.getCurrentLevelConfig();

      expect(mockAssetLoader.getJSON).toHaveBeenCalledWith(LevelAssetKeys.getLevelConfig(2));
      expect(config.levelNumber).toBe(2);
    });
  });

  describe('Конфиги спавна', () => {
    beforeEach(async () => {
      // Setup getJSON mock to return actual level1 config values
      (mockAssetLoader.getJSON as jest.Mock).mockReturnValue({
        levelNumber: 1,
        enemySpawn: {
          initialCount: {
            randomWalker: 1,
            chaser: 1,
            flam: 1
          },
          periodicSpawnDelay: 6000,
          maxEnemies: 2,
          enabledTypes: ['randomWalker', 'chaser', 'flam']
        },
        enemySpeed: {
          randomWalker: 80,
          chaser: 30,
          flam: 60
        },
        itemSpawn: {
          hearts: {
            initial: 8,
            max: 10,
            spawnDelay: 24000
          },
          keys: {
            initial: 15,
            max: 15,
            spawnDelay: 24000
          },
          coins: {
            initial: 12,
            max: 18,
            spawnDelay: 10000
          }
        }
      });
      await levelManager.loadLevelConfig(1);
    });

    it('должен получать конфиг спавна врагов', async () => {
      const spawnConfig = await levelManager.getEnemySpawnConfig();

      // Значения из level1.config.json
      expect(spawnConfig.initialCount).toEqual({
        randomWalker: 1,
        chaser: 1,
        flam: 1
      });
      expect(spawnConfig.maxEnemies).toBe(2);
    });

    it('должен получать конфиг скорости врагов', async () => {
      const speedConfig = await levelManager.getEnemySpeedConfig();

      // Значения из level1.config.json
      expect(speedConfig.randomWalker).toBe(80);
      expect(speedConfig.chaser).toBe(30);
      expect(speedConfig.flam).toBe(60);
    });

    it('должен получать конфиг спавна предметов', async () => {
      const itemConfig = await levelManager.getItemSpawnConfig();

      // Значения из level1.config.json
      expect(itemConfig.hearts.initial).toBe(8);
      expect(itemConfig.keys.initial).toBe(15);
    });
  });

  describe('Множитель сложности', () => {
    it('должен возвращать 1.0 для уровня 1', () => {
      levelManager.setCurrentLevel(1);
      expect(levelManager.getDifficultyMultiplier()).toBe(1.0);
    });

    it('должен увеличивать множитель на 0.1 за уровень', () => {
      levelManager.setCurrentLevel(2);
      expect(levelManager.getDifficultyMultiplier()).toBe(1.1);

      levelManager.setCurrentLevel(5);
      expect(levelManager.getDifficultyMultiplier()).toBe(1.4);
    });
  });

  describe('Определение типа врага', () => {
    const spawnConfig = {
      initialCount: {
        randomWalker: 5,
        chaser: 3
      },
      periodicSpawnDelay: 6000,
      maxEnemies: 15,
      enabledTypes: [EnemyType.RANDOM_WALKER, EnemyType.CHASER]
    };

    it('должен определять тип врага на основе initialCount', () => {
      // Мокируем Math.random для предсказуемости
      // randomWalker: 5, chaser: 3 -> пропорции: 5/8 = 0.625, 3/8 = 0.375
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.3); // Меньше 0.625, должен вернуть RANDOM_WALKER

      const type = levelManager.determineEnemyType(spawnConfig);
      expect(type).toBe(EnemyType.RANDOM_WALKER);

      Math.random = originalRandom;
    });

    it('должен возвращать CHASER при большом значении random', () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.8); // Больше 0.625, должен вернуть CHASER

      const type = levelManager.determineEnemyType(spawnConfig);
      expect(type).toBe(EnemyType.CHASER);

      Math.random = originalRandom;
    });

    it('должен возвращать fallback тип, если нужный тип не включен', () => {
      const configWithoutRandomWalker = {
        ...spawnConfig,
        enabledTypes: [EnemyType.CHASER]
      };

      const type = levelManager.determineEnemyType(configWithoutRandomWalker);
      expect(type).toBe(EnemyType.CHASER);
    });
  });
});


