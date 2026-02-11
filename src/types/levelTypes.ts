/**
 * Типы для конфигурации уровней
 */

import { EnemyType } from './enemyTypes';
import type { BackgroundSpriteConfig } from '../game/entities/background/AbstractBackgroundSprite';
import type { CollisionObjectConfig } from '../game/entities/collision/AbstractCollisionObject';

export interface EnemySpawnConfig {
  initialCount: {                 // Начальное количество врагов по типам
    randomWalker?: number;
    chaser?: number;
    flam?: number;
  };
  initialSpawnDelay?: number;      // Интервал между спавном начальных врагов (мс)
  periodicSpawnDelay: number;     // Задержка периодического спавна (мс)
  maxEnemies: number;             // Максимальное количество врагов
  enabledTypes: EnemyType[];      // Какие типы врагов доступны на уровне
}

export interface EnemySpeedConfig {
  randomWalker: number;           // Скорость случайных блуждающих
  chaser: number;                 // Скорость преследующих
  flam?: number;                  // Скорость врага Flam
}

export interface EnemyHealthConfig {
  randomWalker?: number;          // Количество жизней случайных блуждающих
  chaser?: number;                // Количество жизней преследующих
  flam?: number;                   // Количество жизней врага Flam
}

export interface EnemyBehaviorConfig {
  chaseRadius?: number;           // Радиус преследования
  chaseSpeed?: number;            // Скорость преследования
  cloneDetectionRadius?: number;  // Радиус детекции игрока для клонирования
  cloneCount?: number;            // Количество клонов при клонировании
  cloneSpawnDelay?: number;       // Задержка между спавном каждого клона в мс
  cloneLifetime?: number;         // Время жизни клонов в мс (0 = бессмертные)
  clonesCanClone?: boolean;       // Могут ли клоны клонироваться
  showDetectionRadius?: boolean; // Показывать ли кольцо радиуса детекции для отладки
}

export interface EnemyBehaviorConfigs {
  randomWalker?: EnemyBehaviorConfig;
  chaser?: EnemyBehaviorConfig;
  flam?: EnemyBehaviorConfig;
}

export interface ItemSpawnConfig {
  hearts: {
    initial: number;              // Начальное количество сердец
    max: number;                  // Максимальное количество сердец
    spawnDelay: number;           // Задержка периодического спавна (мс)
  };
  keys: {
    initial: number;              // Начальное количество ключей
    max: number;                  // Максимальное количество ключей
    spawnDelay: number;           // Задержка периодического спавна (мс)
  };
  coins: {                        // ⚠️ НОВОЕ - конфигурация монеток
    initial: number;              // Начальное количество монеток на поле
    max: number;                  // Максимальное количество монеток
    spawnDelay: number;           // Задержка периодического спавна (мс)
  };
}

// Переэкспорт типов из других модулей
export type { BackgroundSpriteConfig } from '../game/entities/background/AbstractBackgroundSprite';
export type { CollisionObjectConfig } from '../game/entities/collision/AbstractCollisionObject';

// Типы для секций конфига уровня
export interface LevelBackgroundSpritesConfig {
  [key: string]: {
    count?: number;
    density?: number;
  };
}

export interface LevelCollisionObjectsConfig {
  [key: string]: {
    count?: number;
    showCollisionDebug?: boolean;
  };
}

export interface LevelConfig {
  levelNumber: number;
  enemySpawn: EnemySpawnConfig;
  enemySpeed: EnemySpeedConfig;
  enemyHealth?: EnemyHealthConfig;
  enemyBehavior?: EnemyBehaviorConfigs;
  itemSpawn: ItemSpawnConfig;
  backgroundSprites?: LevelBackgroundSpritesConfig;
  collisionObjects?: LevelCollisionObjectsConfig;
  levelConfig?: {
    useTiledMap?: boolean;
    tiledMapKey?: string;
    portalSpawnRadius?: number; // ✅ Радиус окружности для размещения порталов (в виртуальных пикселях)
    maxInventoryKeys?: number; // ✅ Максимальное количество ключей в инвентаре (по умолчанию 3)
  };
}

