/**
 * Управление уровнями и сложностью
 * Загружает конфиги уровней и предоставляет параметры для спавна
 */

import { LevelConfig, EnemySpawnConfig, EnemySpeedConfig, EnemyHealthConfig, ItemSpawnConfig, LevelBackgroundSpritesConfig, LevelCollisionObjectsConfig, EnemyBehaviorConfigs, EnemyBehaviorConfig } from '../../types/levelTypes';
import { MAX_LEVELS, LevelAssetKeys } from '../../constants/gameConstants';
import { EnemyType } from '../../types/enemyTypes';
import { AssetLoader } from './AssetLoader';
import { logger } from '../../utils/Logger';

export class LevelManager {
  private currentLevel: number = 1;
  private levelConfigs: Map<number, LevelConfig> = new Map();
  private assetLoader: AssetLoader;

  constructor(assetLoader: AssetLoader) {
    this.assetLoader = assetLoader;
  }

  /**
   * Загрузить конфиг уровня
   */
  public async loadLevelConfig(levelNumber: number): Promise<LevelConfig> {
    // 1. Проверяем кеш менеджера
    if (this.levelConfigs.has(levelNumber)) {
      return Promise.resolve(this.levelConfigs.get(levelNumber)!);
    }

    // 2. Проверяем кеш Phaser (динамически загруженные JSON)
    const configKey = LevelAssetKeys.getLevelConfig(levelNumber);
    const loadedConfig = this.assetLoader.getJSON(configKey);

    if (loadedConfig) {
      // ✅ VALIDATION: Проверяем структуру JSON
      if (!loadedConfig.enemySpawn || !loadedConfig.itemSpawn || !loadedConfig.levelConfig) {
        logger.warn('LEVEL', `⚠️ Level config for level ${levelNumber} is incomplete (missing sections). Merging with default.`);

        // Simple shallow merge fallback
        const defaultConfig = this.getDefaultLevelConfig(levelNumber);
        const mergedConfig = { ...defaultConfig, ...loadedConfig };

        this.levelConfigs.set(levelNumber, mergedConfig as LevelConfig);
        return Promise.resolve(mergedConfig as LevelConfig);
      }

      // Config is valid
      this.levelConfigs.set(levelNumber, loadedConfig as LevelConfig);
      return Promise.resolve(loadedConfig as LevelConfig);
    }

    // 3. Fallback: Если конфиг не найден, возвращаем дефолтный
    logger.warn('LEVEL', `⚠️ Config for level ${levelNumber} not found in cache. Using default fallback.`);
    const defaultConfig = this.getDefaultLevelConfig(levelNumber);
    this.levelConfigs.set(levelNumber, defaultConfig);
    return Promise.resolve(defaultConfig);
  }

  /**
   * Установить текущий уровень
   */
  public setCurrentLevel(levelNumber: number): void {
    this.currentLevel = levelNumber;
  }

  /**
   * Получить текущий уровень
   */
  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  /**
   * Получить ключ конфига текущего уровня (для отладки)
   */
  public getCurrentConfigKey(): string {
    return LevelAssetKeys.getLevelConfig(this.currentLevel);
  }

  /**
   * Получить конфиг текущего уровня
   */
  public async getCurrentLevelConfig(): Promise<LevelConfig> {
    return await this.loadLevelConfig(this.currentLevel);
  }

  /**
   * Получить конфиг спавна врагов для текущего уровня
   */
  public async getEnemySpawnConfig(): Promise<EnemySpawnConfig> {
    const config = await this.getCurrentLevelConfig();
    return config.enemySpawn;
  }

  /**
   * Получить конфиг скорости врагов для текущего уровня
   */
  public async getEnemySpeedConfig(): Promise<EnemySpeedConfig> {
    const config = await this.getCurrentLevelConfig();
    return config.enemySpeed;
  }

  /**
   * Получить конфиг жизней врагов для текущего уровня
   */
  public async getEnemyHealthConfig(): Promise<EnemyHealthConfig | undefined> {
    const config = await this.getCurrentLevelConfig();
    return config.enemyHealth;
  }

  /**
   * Получить конфиг поведения врагов для текущего уровня
   */
  public async getEnemyBehaviorConfig(): Promise<EnemyBehaviorConfigs | undefined> {
    const config = await this.getCurrentLevelConfig();
    return config.enemyBehavior;
  }

  /**
   * Получить конфиг поведения для конкретного типа врага
   */
  public async getEnemyBehaviorConfigForType(enemyType: EnemyType): Promise<EnemyBehaviorConfig | undefined> {
    const behaviorConfigs = await this.getEnemyBehaviorConfig();
    if (!behaviorConfigs) return undefined;

    switch (enemyType) {
      case EnemyType.RANDOM_WALKER:
        return behaviorConfigs.randomWalker;
      case EnemyType.CHASER:
        return behaviorConfigs.chaser;
      case EnemyType.FLAM:
        return behaviorConfigs.flam;
      default:
        return undefined;
    }
  }

  /**
   * Получить конфиг спавна предметов для текущего уровня
   */
  public async getItemSpawnConfig(): Promise<ItemSpawnConfig> {
    const config = await this.getCurrentLevelConfig();
    return config.itemSpawn;
  }

  /**
   * Получить конфиг фоновых спрайтов для текущего уровня
   */
  public async getBackgroundSpriteConfig(): Promise<LevelBackgroundSpritesConfig | undefined> {
    const config = await this.getCurrentLevelConfig();
    return config.backgroundSprites;
  }

  /**
   * Получить конфиг объектов коллизии для текущего уровня
   */
  public async getCollisionObjectConfig(): Promise<LevelCollisionObjectsConfig | undefined> {
    const config = await this.getCurrentLevelConfig();
    return config.collisionObjects;
  }

  /**
   * Получить конфиг уровня (levelConfig) для текущего уровня
   */
  public async getLevelConfig(): Promise<{ useTiledMap?: boolean; tiledMapKey?: string; portalSpawnRadius?: number; maxInventoryKeys?: number } | undefined> {
    const config = await this.getCurrentLevelConfig();
    return config.levelConfig;
  }

  /**
   * Получить множитель сложности для уровня
   */
  public getDifficultyMultiplier(): number {
    // Базовый множитель: 1.0 для уровня 1, увеличивается на 0.1 за уровень
    return 1.0 + (this.currentLevel - 1) * 0.1;
  }

  /**
   * Определить тип врага на основе initialCount (абсолютные значения)
   * Используется для периодического спавна врагов
   */
  public determineEnemyType(spawnConfig: EnemySpawnConfig): EnemyType {
    // ✅ Используем initialCount для определения вероятности спавна каждого типа
    if (spawnConfig.initialCount) {
      const counts = {
        randomWalker: spawnConfig.initialCount.randomWalker || 0,
        chaser: spawnConfig.initialCount.chaser || 0,
        flam: spawnConfig.initialCount.flam || 0
      };

      const total = counts.randomWalker + counts.chaser + counts.flam;

      if (total === 0) {
        // Fallback на первый доступный тип, если все количества равны 0
        return spawnConfig.enabledTypes[0] || EnemyType.RANDOM_WALKER;
      }

      // Используем пропорции из initialCount для определения вероятности
      const random = Math.random();
      const normalizedRandomWalker = counts.randomWalker / total;
      const normalizedChaser = counts.chaser / total;

      // Определяем тип на основе случайного значения
      if (random < normalizedRandomWalker && spawnConfig.enabledTypes.includes(EnemyType.RANDOM_WALKER)) {
        return EnemyType.RANDOM_WALKER;
      } else if (random < normalizedRandomWalker + normalizedChaser && spawnConfig.enabledTypes.includes(EnemyType.CHASER)) {
        return EnemyType.CHASER;
      } else if (spawnConfig.enabledTypes.includes(EnemyType.FLAM)) {
        return EnemyType.FLAM;
      } else {
        // Fallback на первый доступный тип
        return spawnConfig.enabledTypes[0] || EnemyType.RANDOM_WALKER;
      }
    }

    // ✅ Fallback: если initialCount не задан, используем равномерное распределение по enabledTypes
    if (spawnConfig.enabledTypes.length === 0) {
      return EnemyType.RANDOM_WALKER;
    }

    // Равномерное распределение между доступными типами
    const random = Math.random();
    const typeIndex = Math.floor(random * spawnConfig.enabledTypes.length);
    return spawnConfig.enabledTypes[typeIndex];
  }

  /**
   * Перейти на следующий уровень
   */
  public async nextLevel(): Promise<LevelConfig> {
    this.currentLevel++;

    // ✅ Проверка на макс. уровень
    if (this.currentLevel > MAX_LEVELS) {
      logger.log('LEVEL', `LevelManager: Max level ${MAX_LEVELS} reached. Looping back to 1.`);
      this.currentLevel = 1;
    }

    return await this.getCurrentLevelConfig();
  }

  /**
   * Сбросить на первый уровень
   */
  public reset(): void {
    this.currentLevel = 1;
  }

  /**
   * Конфиг уровня по умолчанию (fallback)
   */
  private getDefaultLevelConfig(levelNumber: number): LevelConfig {
    return {
      levelNumber,
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
        randomWalker: 80, // ✅ Значение по умолчанию (fallback), обычно задается в level1.config.json
        chaser: 60, // ✅ Значение по умолчанию (fallback), обычно задается в level1.config.json
        flam: 60 // ✅ Значение по умолчанию для Flam (fallback), обычно задается в level1.config.json
      },
      enemyHealth: undefined, // По умолчанию используется DEFAULT_ENEMY_HEALTH из констант
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
        coins: {                  // ⚠️ НОВОЕ - конфигурация монеток по умолчанию
          initial: 10,
          max: 15,
          spawnDelay: 8000
        }
      }
    };
  }
}

