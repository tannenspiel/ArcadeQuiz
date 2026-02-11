/**
 * Система спавна объектов
 * Использует LevelManager для параметров
 */

import Phaser from 'phaser';
import { LevelManager } from '../core/LevelManager';
import { EnemyType, EnemySpawnData } from '../../types/enemyTypes';
import { EnemyRandomWalker } from '../entities/enemies/EnemyRandomWalker';
import { EnemyChaser } from '../entities/enemies/EnemyChaser';
import { EnemyFlam } from '../entities/enemies/EnemyFlam';
import { Coin } from '../entities/items/Coin';
import { AbstractEnemy } from '../entities/enemies/AbstractEnemy';
import { MAP_WIDTH, MAP_HEIGHT, MAP_CENTER_X, MAP_CENTER_Y, KEYS, ACTOR_SIZES, BASE_SCALE, DEPTHS } from '../../constants/gameConstants';
import { SpawnMatrix } from './SpawnMatrix';
import { QuizManager } from './QuizManager';
import { logger } from '../../utils/Logger';
// DEBUG_CONFIG больше не используется - настройки отладки берутся из конфига уровня

/**
 * Результат поиска безопасной позиции
 */
export interface SafePositionResult {
  x: number;
  y: number;
  success: boolean; // true если позиция найдена, false если не найдена
}

export class SpawnSystem {
  private scene: Phaser.Scene;
  private levelManager: LevelManager;
  private quizManager: QuizManager; // ✅ Добавлено
  private spawnMatrix: SpawnMatrix; // ✅ Матрица для безопасного спавна

  constructor(scene: Phaser.Scene, levelManager: LevelManager, quizManager: QuizManager) {
    this.scene = scene;
    this.levelManager = levelManager;
    this.quizManager = quizManager;
    this.spawnMatrix = new SpawnMatrix();
  }

  /**
   * ✅ НОВАЯ МАТРИЧНАЯ СИСТЕМА: Получить безопасную позицию через матрицу
   * @param width Ширина объекта в ячейках
   * @param height Высота объекта в ячейках
   * @param ignoreEnemies Если true, игнорирует врагов (для спавна врагов поверх предметов)
   * @returns Позиция в мировых координатах или null
   */
  public getSafePositionMatrix(
    width: number,
    height: number,
    ignoreEnemies: boolean = false
  ): SafePositionResult {
    const cellPos = this.spawnMatrix.findFreeRect(width, height, ignoreEnemies);
    if (!cellPos) {
      return { x: 0, y: 0, success: false };
    }

    // ✅ ИСПРАВЛЕНО: Вычисляем центр блока напрямую (для корректного выравнивания multi-cell объектов)
    const matrixSize = this.spawnMatrix.getMatrixSize();
    const cellSize = matrixSize.cellSize; // 64 пикселя
    const blockWidth = width * cellSize;
    const blockHeight = height * cellSize;
    const blockLeft = cellPos.col * cellSize; // Левый верхний угол блока
    const blockTop = cellPos.row * cellSize;
    const blockCenterX = blockLeft + blockWidth / 2; // Центр блока по X
    const blockCenterY = blockTop + blockHeight / 2; // Центр блока по Y

    return { x: blockCenterX, y: blockCenterY, success: true };
  }

  /**
   * ✅ НОВАЯ МАТРИЧНАЯ СИСТЕМА: Занять позицию в матрице
   * @param x Мировые координаты X
   * @param y Мировые координаты Y
   * @param width Ширина объекта в ячейках
   * @param height Высота объекта в ячейках
   * @param type Тип занятости ('permanent' | 'item' | 'enemy')
   */
  public occupyPositionMatrix(
    x: number,
    y: number,
    width: number,
    height: number,
    type: 'permanent' | 'item' | 'enemy' | 'player'
  ): void {
    const cell = this.spawnMatrix.worldToCell(x, y);
    // Выравниваем по левому верхнему углу блока
    const offsetCol = cell.col - Math.floor(width / 2);
    const offsetRow = cell.row - Math.floor(height / 2);
    this.spawnMatrix.occupyRect(offsetCol, offsetRow, width, height, type);
  }

  /**
   * ✅ НОВАЯ МАТРИЧНАЯ СИСТЕМА: Выровнять координаты по ячейкам
   */
  public alignToCell(x: number, y: number): { x: number; y: number } {
    return this.spawnMatrix.alignToCell(x, y);
  }

  /**
   * ✅ Конвертация мировых координат в индексы ячеек
   */
  public worldToCell(x: number, y: number): { col: number; row: number } {
    return this.spawnMatrix.worldToCell(x, y);
  }

  /**
   * ✅ Проверка, свободен ли прямоугольник ячеек
   */
  public isRectFree(col: number, row: number, width: number, height: number, ignoreEnemies: boolean = false): boolean {
    return this.spawnMatrix.isRectFree(col, row, width, height, ignoreEnemies);
  }

  /**
   * ✅ Занять прямоугольник ячеек
   */
  public occupyRect(col: number, row: number, width: number, height: number, type: 'permanent' | 'item' | 'enemy' | 'player'): void {
    this.spawnMatrix.occupyRect(col, row, width, height, type);
  }

  /**
   * ✅ Занять блок ячеек для портала из Tiled Map
   * Используется для порталов с фиксированным положением из Tiled Map
   * @param worldX Мировые координаты X (центр портала)
   * @param worldY Мировые координаты Y (центр портала)
   * @param widthInCells Ширина в ячейках (для новых порталов: 2)
   * @param heightInCells Высота в ячейках (для новых порталов: 3)
   */
  public occupyTiledPortal(
    worldX: number,
    worldY: number,
    widthInCells: number,
    heightInCells: number
  ): void {
    // Конвертируем мировые координаты в ячейки
    const cell = this.spawnMatrix.worldToCell(worldX, worldY);

    // Вычисляем левый верхний угол блока ячеек
    let offsetCol = cell.col - Math.floor(widthInCells / 2);
    let offsetRow = cell.row - Math.floor(heightInCells / 2);

    // Получаем размеры матрицы для проверки границ
    const matrixSize = this.spawnMatrix.getMatrixSize();

    // Проверяем и корректируем границы
    if (offsetCol < 0) {
      offsetCol = 0;
    }
    if (offsetRow < 0) {
      offsetRow = 0;
    }
    if (offsetCol + widthInCells > matrixSize.cols) {
      offsetCol = matrixSize.cols - widthInCells;
    }
    if (offsetRow + heightInCells > matrixSize.rows) {
      offsetRow = matrixSize.rows - heightInCells;
    }

    // Проверяем, что после коррекции координаты все еще валидны
    if (offsetCol < 0 || offsetRow < 0 ||
      offsetCol + widthInCells > matrixSize.cols ||
      offsetRow + heightInCells > matrixSize.rows) {
      console.warn(`⚠️ SpawnSystem.occupyTiledPortal: Не удалось разместить портал в матрице (worldX: ${worldX}, worldY: ${worldY}, offsetCol: ${offsetCol}, offsetRow: ${offsetRow})`);
      return;
    }

    // Занимаем блок ячеек как постоянный объект
    this.spawnMatrix.occupyRect(offsetCol, offsetRow, widthInCells, heightInCells, 'permanent');

    // ⚠️ НОВОЕ: Добавляем запретную зону вокруг портала (2 ряда для кустов/камней)
    this.spawnMatrix.addForbiddenZone(offsetCol, offsetRow, widthInCells, heightInCells, 2);
  }

  /**
   * ✅ НОВАЯ МАТРИЧНАЯ СИСТЕМА: Спавн оракула (2×4 ячейки, центр карты)
   */
  public spawnOracleMatrix(): { x: number; y: number } {
    // Оракул в центре карты
    const centerX = MAP_CENTER_X; // 1024
    const centerY = MAP_CENTER_Y; // 1024

    // ✅ Вычисляем ячейку центра карты напрямую (без alignToCell)
    // worldToCell(1024, 1024) = (floor(1024/64), floor(1024/64)) = (16, 16)
    const centerCell = this.spawnMatrix.worldToCell(centerX, centerY);

    // ✅ Оракул занимает 2×4 ячейки (128×256 пикселей)
    // Для блока 2×4 ячеек: центр блока = (offsetCol + 1, offsetRow + 2)
    // Чтобы центр блока был в (centerCell.col, centerCell.row): 
    // offsetCol = centerCell.col - 1, offsetRow = centerCell.row - 2
    const offsetCol = centerCell.col - 1; // Смещаем на 1 ячейку влево (2 ячейки шириной, центр в centerCell.col)
    const offsetRow = centerCell.row - 2; // Смещаем на 2 ячейки вверх (4 ячейки высотой, центр в centerCell.row)

    // ✅ Проверяем границы перед занятием
    const matrixSize = this.spawnMatrix.getMatrixSize();
    if (offsetCol < 0 || offsetRow < 0 || offsetCol + 2 > matrixSize.cols || offsetRow + 4 > matrixSize.rows) {
      console.warn(`⚠️ SpawnSystem.spawnOracleMatrix: Оракул выходит за границы матрицы (offsetCol: ${offsetCol}, offsetRow: ${offsetRow}, matrix: ${matrixSize.cols}x${matrixSize.rows})`);
      // Fallback: используем безопасные значения
      const safeOffsetCol = Math.max(0, Math.min(offsetCol, matrixSize.cols - 2));
      const safeOffsetRow = Math.max(0, Math.min(offsetRow, matrixSize.rows - 4));
      this.spawnMatrix.occupyRect(safeOffsetCol, safeOffsetRow, 2, 4, 'permanent');

      // Вычисляем центр блока для возврата
      const cellSize = matrixSize.cellSize;
      const blockLeft = safeOffsetCol * cellSize;
      const blockTop = safeOffsetRow * cellSize;
      return {
        x: blockLeft + (2 * cellSize) / 2,
        y: blockTop + (4 * cellSize) / 2
      };
    }

    this.spawnMatrix.occupyRect(offsetCol, offsetRow, 2, 4, 'permanent');

    // ⚠️ НОВОЕ: Добавляем запретную зону вокруг Оракула (2 ряда для кустов/камней)
    this.spawnMatrix.addForbiddenZone(offsetCol, offsetRow, 2, 4, 2);

    // ✅ Логируем для отладки
    logger.log('SPAWN_SYSTEM', `SpawnSystem.spawnOracleMatrix: Оракул размещен в матрице:`, {
      centerCell: { col: centerCell.col, row: centerCell.row },
      offset: { col: offsetCol, row: offsetRow },
      occupiedCells: {
        cols: [offsetCol, offsetCol + 1],
        rows: [offsetRow, offsetRow + 1, offsetRow + 2, offsetRow + 3]
      },
      blockSize: '2×4 ячеек (128×256 пикселей)'
    });

    // ✅ ИСПРАВЛЕНО: Возвращаем центр блока 2×4 ячеек, а не центр ячейки
    // matrixSize уже объявлена выше в проверке границ
    const cellSize = matrixSize.cellSize; // 64 пикселей
    const blockWidth = 2 * cellSize; // 128 пикселей
    const blockHeight = 4 * cellSize; // 256 пикселей
    const blockLeft = offsetCol * cellSize; // Левый верхний угол блока
    const blockTop = offsetRow * cellSize;
    const blockCenterX = blockLeft + blockWidth / 2; // Центр блока по X
    const blockCenterY = blockTop + blockHeight / 2; // Центр блока по Y

    logger.log('SPAWN_SYSTEM', `SpawnSystem.spawnOracleMatrix: Центр блока вычислен:`, {
      blockLeft, blockTop, blockCenterX, blockCenterY,
      expectedCenter: { x: centerX, y: centerY }
    });

    return { x: blockCenterX, y: blockCenterY };
  }

  /**
   * ✅ НОВАЯ МАТРИЧНАЯ СИСТЕМА: Спавн персонажа (1×1 ячейка, под оракулом)
   */
  public spawnPlayerMatrix(oracleX: number, oracleY: number): { x: number; y: number } {
    // Персонаж под оракулом (смещение вниз на 2 ячейки от центра оракула)
    const playerX = oracleX;
    const playerY = oracleY + 128; // 2 ячейки * 64 = 128 пикселей

    // Выравниваем по ячейкам
    const aligned = this.spawnMatrix.alignToCell(playerX, playerY);

    // Персонаж занимает 1×1 ячейку
    const cell = this.spawnMatrix.worldToCell(aligned.x, aligned.y);
    this.spawnMatrix.occupyRect(cell.col, cell.row, 1, 1, 'player');

    // ✅ Логируем для отладки (чтобы понять, почему появляется 5-я строка)
    logger.log('SPAWN_SYSTEM', `SpawnSystem.spawnPlayerMatrix: Игрок размещен в матрице:`, {
      oraclePos: { x: oracleX, y: oracleY },
      playerAligned: { x: aligned.x, y: aligned.y },
      playerCell: { col: cell.col, row: cell.row },
      note: 'Игрок занимает 1×1 ячейку под Оракулом (это не часть Оракула!)'
    });

    return aligned;
  }

  /**
   * ✅ НОВАЯ МАТРИЧНАЯ СИСТЕМА: Спавн портала (4×3 ячейки, на окружности)
   */
  public spawnPortalMatrix(
    centerX: number,
    centerY: number,
    radius: number,
    angleOffset: number = 0
  ): SafePositionResult {
    // Порталы занимают 4×3 ячейки (256×184 пикселей)
    const cellPos = this.spawnMatrix.findFreeRectOnCircle(
      centerX,
      centerY,
      radius,
      4, // width в ячейках
      3, // height в ячейках
      angleOffset
    );

    if (!cellPos) {
      return { x: 0, y: 0, success: false };
    }

    // ✅ ИСПРАВЛЕНО: Конвертируем в мировые координаты (центр блока)
    // Центр блока 4×3 ячеек: левый верхний угол + половина размера блока
    const matrixSize = this.spawnMatrix.getMatrixSize();
    const cellSize = matrixSize.cellSize; // 64 пикселей
    const blockWidth = 4 * cellSize; // 256 пикселей
    const blockHeight = 3 * cellSize; // 192 пикселей
    const blockLeft = cellPos.col * cellSize; // Левый верхний угол блока
    const blockTop = cellPos.row * cellSize;
    const blockCenterX = blockLeft + blockWidth / 2; // Центр блока по X
    const blockCenterY = blockTop + blockHeight / 2; // Центр блока по Y
    const worldPos = { x: blockCenterX, y: blockCenterY };

    // Занимаем ячейки
    this.spawnMatrix.occupyRect(cellPos.col, cellPos.row, 4, 3, 'permanent');

    // ⚠️ НОВОЕ: Добавляем запретную зону вокруг портала (2 ряда для кустов/камней)
    this.spawnMatrix.addForbiddenZone(cellPos.col, cellPos.row, 4, 3, 2);

    return { x: worldPos.x, y: worldPos.y, success: true };
  }

  /**
   * ✅ НОВАЯ МАТРИЧНАЯ СИСТЕМА: Спавн куста (2×2 ячейки)
   */
  public spawnBushMatrix(): SafePositionResult {
    // Кусты занимают 2×2 ячейки (128×128 пикселей)
    const cellPos = this.spawnMatrix.findFreeRect(2, 2, false);

    if (!cellPos) {
      return { x: 0, y: 0, success: false };
    }

    // ✅ ИСПРАВЛЕНО: Вычисляем центр 2×2 блока напрямую
    // Для блока 2×2 ячеек: левый верхний угол блока + половина размера блока
    const matrixSize = this.spawnMatrix.getMatrixSize();
    const cellSize = matrixSize.cellSize; // 64 пикселей
    const blockWidth = 2 * cellSize; // 128 пикселей
    const blockHeight = 2 * cellSize; // 128 пикселей
    const blockLeft = cellPos.col * cellSize; // Левый верхний угол блока
    const blockTop = cellPos.row * cellSize;
    const blockCenterX = blockLeft + blockWidth / 2; // Центр блока по X
    const blockCenterY = blockTop + blockHeight / 2; // Центр блока по Y

    // Занимаем ячейки
    this.spawnMatrix.occupyRect(cellPos.col, cellPos.row, 2, 2, 'permanent');

    return { x: blockCenterX, y: blockCenterY, success: true };
  }

  /**
   * ✅ НОВАЯ МАТРИЧНАЯ СИСТЕМА: Спавн камня (2×2 ячейки)
   */
  public spawnStoneMatrix(): SafePositionResult {
    // Камни занимают 2×2 ячейки (128×128 пикселей)
    const cellPos = this.spawnMatrix.findFreeRect(2, 2, false);

    if (!cellPos) {
      return { x: 0, y: 0, success: false };
    }

    // ✅ ИСПРАВЛЕНО: Вычисляем центр 2×2 блока напрямую
    // Для блока 2×2 ячеек: левый верхний угол блока + половина размера блока
    const matrixSize = this.spawnMatrix.getMatrixSize();
    const cellSize = matrixSize.cellSize; // 64 пикселей
    const blockWidth = 2 * cellSize; // 128 пикселей
    const blockHeight = 2 * cellSize; // 128 пикселей
    const blockLeft = cellPos.col * cellSize; // Левый верхний угол блока
    const blockTop = cellPos.row * cellSize;
    const blockCenterX = blockLeft + blockWidth / 2; // Центр блока по X
    const blockCenterY = blockTop + blockHeight / 2; // Центр блока по Y

    // Занимаем ячейки
    this.spawnMatrix.occupyRect(cellPos.col, cellPos.row, 2, 2, 'permanent');

    return { x: blockCenterX, y: blockCenterY, success: true };
  }

  /**
   * ✅ НОВАЯ МАТРИЧНАЯ СИСТЕМА: Спавн сердечка (1×1 ячейка)
   */
  public spawnHeartMatrix(): SafePositionResult {
    // Сердечки занимают 1×1 ячейку (64×64 пикселей)
    // НЕ игнорируем врагов - сердечки не могут спавниться поверх ничего
    const cellPos = this.spawnMatrix.findFreeRect(1, 1, false);

    if (!cellPos) {
      return { x: 0, y: 0, success: false };
    }

    // Конвертируем в мировые координаты
    const worldPos = this.spawnMatrix.cellToWorld(cellPos.col, cellPos.row);

    // Занимаем ячейку
    this.spawnMatrix.occupyRect(cellPos.col, cellPos.row, 1, 1, 'item');

    return { x: worldPos.x, y: worldPos.y, success: true };
  }

  /**
   * ✅ НОВАЯ МАТРИЧНАЯ СИСТЕМА: Спавн ключа (1×1 ячейка)
   */
  public spawnKeyMatrix(): SafePositionResult {
    // Ключи занимают 1×1 ячейку (64×64 пикселей)
    // НЕ игнорируем врагов - ключи не могут спавниться поверх ничего
    const cellPos = this.spawnMatrix.findFreeRect(1, 1, false);

    if (!cellPos) {
      return { x: 0, y: 0, success: false };
    }

    // Конвертируем в мировые координаты
    const worldPos = this.spawnMatrix.cellToWorld(cellPos.col, cellPos.row);

    // Занимаем ячейку
    this.spawnMatrix.occupyRect(cellPos.col, cellPos.row, 1, 1, 'item');

    return { x: worldPos.x, y: worldPos.y, success: true };
  }

  /**
   * ⚠️ НОВОЕ: Спавн монетки (1×1 ячейка)
   */
  public spawnCoinMatrix(): SafePositionResult {
    // Монетки занимают 1×1 ячейку (64×64 пикселей)
    // НЕ игнорируем врагов - монетки не могут спавниться поверх ничего
    const cellPos = this.spawnMatrix.findFreeRect(1, 1, false);

    if (!cellPos) {
      return { x: 0, y: 0, success: false };
    }

    // Конвертируем в мировые координаты
    const worldPos = this.spawnMatrix.cellToWorld(cellPos.col, cellPos.row);

    // Занимаем ячейку
    this.spawnMatrix.occupyRect(cellPos.col, cellPos.row, 1, 1, 'item');

    return { x: worldPos.x, y: worldPos.y, success: true };
  }

  /**
   * ✅ НОВАЯ МАТРИЧНАЯ СИСТЕМА: Спавн врага (1×1 ячейка, может поверх предметов)
   */
  public spawnEnemyMatrix(): SafePositionResult {
    // Враги занимают 1×1 ячейку (64×64 пикселей)
    // Игнорируем врагов - враги могут спавниться поверх предметов и друг на друге
    const cellPos = this.spawnMatrix.findFreeRect(1, 1, true);

    if (!cellPos) {
      return { x: 0, y: 0, success: false };
    }

    // Конвертируем в мировые координаты
    const worldPos = this.spawnMatrix.cellToWorld(cellPos.col, cellPos.row);

    // Занимаем ячейку (враги могут перезаписывать предметы)
    this.spawnMatrix.occupyRect(cellPos.col, cellPos.row, 1, 1, 'enemy');

    return { x: worldPos.x, y: worldPos.y, success: true };
  }



  /**
   * Спавн врага
   * ✅ Использует матричную систему для безопасного размещения
   */
  public async spawnEnemy(
    enemyGroup: Phaser.Physics.Arcade.Group,
    chaserGroup: Phaser.Physics.Arcade.Group,
    playerX?: number,
    playerY?: number
  ): Promise<void> {
    const spawnConfig = await this.levelManager.getEnemySpawnConfig();
    const speedConfig = await this.levelManager.getEnemySpeedConfig();
    const healthConfig = await this.levelManager.getEnemyHealthConfig();

    // ✅ Проверяем, активна ли сцена после await
    if (!this.scene.sys.settings.active || !enemyGroup.scene) {
      return;
    }

    // ✅ Проверяем maxEnemies (null = не контролировать)
    if (spawnConfig.maxEnemies !== null) {
      const totalEnemies = enemyGroup.getChildren().filter(e => e.active).length + chaserGroup.getChildren().filter(e => e.active).length;
      if (totalEnemies >= spawnConfig.maxEnemies) return;
    }

    // ✅ Используем матричную систему для поиска позиции
    const posResult = this.spawnEnemyMatrix();
    if (!posResult.success) {
      console.warn(`⚠️ SpawnSystem.spawnEnemy: Не удалось найти безопасную позицию для врага. Пропускаем спавн.`);
      return;
    }
    const pos = posResult;
    // ✅ Определяем тип ОДИН РАЗ и используем его для получения правильного конфига
    const enemyType = this.levelManager.determineEnemyType(spawnConfig);
    const behaviorConfig = await this.levelManager.getEnemyBehaviorConfigForType(enemyType);

    let enemy: AbstractEnemy;

    if (enemyType === EnemyType.RANDOM_WALKER) {
      const enemyConfig = {
        type: EnemyType.RANDOM_WALKER,
        speed: speedConfig.randomWalker,
        x: pos.x,
        y: pos.y,
        health: healthConfig?.randomWalker,
        cloneDetectionRadius: behaviorConfig?.cloneDetectionRadius ?? 0,
        chaseRadius: behaviorConfig?.chaseRadius ?? 0,
        chaseSpeed: behaviorConfig?.chaseSpeed ?? 0,
        clonesCanClone: behaviorConfig?.clonesCanClone ?? false,
        cloneLifetime: behaviorConfig?.cloneLifetime ?? 0,
        cloneCount: behaviorConfig?.cloneCount ?? 0,
        cloneSpawnDelay: behaviorConfig?.cloneSpawnDelay ?? 0,
        showDetectionRadius: behaviorConfig?.showDetectionRadius ?? false
      };

      // ✅ Логируем настройки для отладки
      logger.log('SPAWN_SYSTEM', `Creating RANDOM_WALKER with config:`, {
        enemyType,
        chaseRadius: enemyConfig.chaseRadius,
        cloneDetectionRadius: enemyConfig.cloneDetectionRadius,
        cloneCount: enemyConfig.cloneCount,
        behaviorConfig: behaviorConfig
      });

      enemy = new EnemyRandomWalker(this.scene, enemyConfig as any);
      enemyGroup.add(enemy.getSprite());
      // ✅ Мигание и звук при спавне
      enemy.startCloneBlinkAnimation();
      enemy.playSpawnSound();
      // ✅ Позиция уже занята в матрице через spawnEnemyMatrix()
    } else if (enemyType === EnemyType.CHASER) {
      const enemyConfig = {
        type: EnemyType.CHASER,
        speed: speedConfig.chaser,
        x: pos.x,
        y: pos.y,
        health: healthConfig?.chaser,
        cloneDetectionRadius: behaviorConfig?.cloneDetectionRadius ?? 0,
        chaseRadius: behaviorConfig?.chaseRadius ?? 0,
        chaseSpeed: behaviorConfig?.chaseSpeed ?? 0,
        clonesCanClone: behaviorConfig?.clonesCanClone ?? false,
        cloneLifetime: behaviorConfig?.cloneLifetime ?? 0,
        cloneCount: behaviorConfig?.cloneCount ?? 0,
        cloneSpawnDelay: behaviorConfig?.cloneSpawnDelay ?? 0,
        showDetectionRadius: behaviorConfig?.showDetectionRadius ?? false
      };

      // ✅ Логируем настройки для отладки
      logger.log('SPAWN_SYSTEM', `Creating CHASER with config:`, {
        enemyType,
        chaseRadius: enemyConfig.chaseRadius,
        cloneDetectionRadius: enemyConfig.cloneDetectionRadius,
        cloneCount: enemyConfig.cloneCount,
        behaviorConfig: behaviorConfig
      });

      enemy = new EnemyChaser(this.scene, enemyConfig as any);
      chaserGroup.add(enemy.getSprite());
      // ✅ Мигание и звук при спавне
      enemy.startCloneBlinkAnimation();
      enemy.playSpawnSound();
      // ✅ Позиция уже занята в матрице через spawnEnemyMatrix()
    } else if (enemyType === EnemyType.FLAM) {
      const enemyConfig = {
        type: EnemyType.FLAM,
        speed: speedConfig.flam || speedConfig.chaser || speedConfig.randomWalker,
        x: pos.x,
        y: pos.y,
        health: healthConfig?.flam,
        cloneDetectionRadius: behaviorConfig?.cloneDetectionRadius ?? 0,
        chaseRadius: behaviorConfig?.chaseRadius ?? 0,
        chaseSpeed: behaviorConfig?.chaseSpeed ?? 0,
        clonesCanClone: behaviorConfig?.clonesCanClone ?? false,
        cloneLifetime: behaviorConfig?.cloneLifetime ?? 0,
        cloneCount: behaviorConfig?.cloneCount ?? 0,
        cloneSpawnDelay: behaviorConfig?.cloneSpawnDelay ?? 0,
        showDetectionRadius: behaviorConfig?.showDetectionRadius ?? false
      };

      // ✅ Логируем настройки для отладки
      logger.log('SPAWN_SYSTEM', `Creating FLAM with config:`, {
        enemyType,
        chaseRadius: enemyConfig.chaseRadius,
        cloneDetectionRadius: enemyConfig.cloneDetectionRadius,
        cloneCount: enemyConfig.cloneCount,
        behaviorConfig: behaviorConfig
      });

      enemy = new EnemyFlam(this.scene, enemyConfig as any);
      chaserGroup.add(enemy.getSprite());
      // ✅ Мигание и звук при спавне
      enemy.startCloneBlinkAnimation();
      enemy.playSpawnSound();
      // ✅ Позиция уже занята в матрице через spawnEnemyMatrix()
    }
  }

  /**
   * Спавн начальных врагов
   * Теперь использует абсолютные значения для каждого типа
   * Спавнит врагов по таймеру с интервалом из конфига
   */
  public async spawnInitialEnemies(
    enemyGroup: Phaser.Physics.Arcade.Group,
    chaserGroup: Phaser.Physics.Arcade.Group,
    playerX?: number,
    playerY?: number,
    onEnemyCreated?: (enemy: AbstractEnemy) => void
  ): Promise<void> {
    const spawnConfig = await this.levelManager.getEnemySpawnConfig();
    const speedConfig = await this.levelManager.getEnemySpeedConfig();
    const healthConfig = await this.levelManager.getEnemyHealthConfig();

    // ✅ Используем абсолютные значения для каждого типа
    const initialCounts = spawnConfig.initialCount || {};
    const counts = {
      randomWalker: initialCounts.randomWalker ?? 0,
      chaser: initialCounts.chaser ?? 0,
      flam: initialCounts.flam ?? 0
    };

    // ✅ Интервал между спавном начальных врагов (по умолчанию 200мс)
    const spawnDelay = spawnConfig.initialSpawnDelay ?? 200;
    let spawnIndex = 0;
    const totalEnemies = counts.randomWalker + counts.chaser + counts.flam;

    // Функция для спавна одного врага
    const spawnNextEnemy = async () => {
      if (spawnIndex >= totalEnemies) return;

      let enemy: AbstractEnemy | null = null;
      let behaviorConfig: any;

      // Определяем тип врага по индексу
      if (spawnIndex < counts.randomWalker) {
        // Спавним randomWalker
        const i = spawnIndex;
        // ✅ Используем матричную систему для поиска позиции
        const posResult = this.spawnEnemyMatrix();
        if (!posResult.success) {
          console.warn(`⚠️ SpawnSystem.spawnInitialEnemies: Не удалось найти безопасную позицию для RANDOM_WALKER ${spawnIndex + 1}. Пропускаем.`);
          spawnIndex++;
          if (spawnIndex < totalEnemies) {
            this.scene.time.delayedCall(spawnDelay, spawnNextEnemy);
          }
          return;
        }
        const pos = posResult;
        behaviorConfig = await this.levelManager.getEnemyBehaviorConfigForType(EnemyType.RANDOM_WALKER);

        enemy = new EnemyRandomWalker(this.scene, {
          type: EnemyType.RANDOM_WALKER,
          speed: speedConfig.randomWalker,
          x: pos.x,
          y: pos.y,
          health: healthConfig?.randomWalker,
          cloneDetectionRadius: behaviorConfig?.cloneDetectionRadius ?? 0,
          chaseRadius: behaviorConfig?.chaseRadius ?? 0,
          chaseSpeed: behaviorConfig?.chaseSpeed ?? 0,
          clonesCanClone: behaviorConfig?.clonesCanClone ?? false,
          cloneLifetime: behaviorConfig?.cloneLifetime ?? 0,
          cloneCount: behaviorConfig?.cloneCount ?? 0,
          cloneSpawnDelay: behaviorConfig?.cloneSpawnDelay ?? 0,
          showDetectionRadius: behaviorConfig?.showDetectionRadius ?? false
        } as any);
        enemyGroup.add(enemy.getSprite());
        // ✅ Позиция уже занята в матрице через spawnEnemyMatrix()
      } else if (spawnIndex < counts.randomWalker + counts.chaser) {
        // Спавним chaser
        const i = spawnIndex - counts.randomWalker;
        // ✅ Используем матричную систему для поиска позиции
        const posResult = this.spawnEnemyMatrix();
        if (!posResult.success) {
          console.warn(`⚠️ SpawnSystem.spawnInitialEnemies: Не удалось найти безопасную позицию для CHASER ${spawnIndex + 1}. Пропускаем.`);
          spawnIndex++;
          if (spawnIndex < totalEnemies) {
            this.scene.time.delayedCall(spawnDelay, spawnNextEnemy);
          }
          return;
        }
        const pos = posResult;
        behaviorConfig = await this.levelManager.getEnemyBehaviorConfigForType(EnemyType.CHASER);

        enemy = new EnemyChaser(this.scene, {
          type: EnemyType.CHASER,
          speed: speedConfig.chaser,
          x: pos.x,
          y: pos.y,
          health: healthConfig?.chaser,
          cloneDetectionRadius: behaviorConfig?.cloneDetectionRadius ?? 0,
          chaseRadius: behaviorConfig?.chaseRadius ?? 0,
          chaseSpeed: behaviorConfig?.chaseSpeed ?? 0,
          clonesCanClone: behaviorConfig?.clonesCanClone ?? false,
          cloneLifetime: behaviorConfig?.cloneLifetime ?? 0,
          cloneCount: behaviorConfig?.cloneCount ?? 0,
          cloneSpawnDelay: behaviorConfig?.cloneSpawnDelay ?? 0,
          showDetectionRadius: behaviorConfig?.showDetectionRadius ?? false
        } as any);
        chaserGroup.add(enemy.getSprite());
        // ✅ Позиция уже занята в матрице через spawnEnemyMatrix()
      } else {
        // Спавним flam
        const i = spawnIndex - counts.randomWalker - counts.chaser;
        // ✅ Используем матричную систему для поиска позиции
        const posResult = this.spawnEnemyMatrix();
        if (!posResult.success) {
          console.warn(`⚠️ SpawnSystem.spawnInitialEnemies: Не удалось найти безопасную позицию для FLAM ${spawnIndex + 1}. Пропускаем.`);
          spawnIndex++;
          if (spawnIndex < totalEnemies) {
            this.scene.time.delayedCall(spawnDelay, spawnNextEnemy);
          }
          return;
        }
        const pos = posResult;
        behaviorConfig = await this.levelManager.getEnemyBehaviorConfigForType(EnemyType.FLAM);

        enemy = new EnemyFlam(this.scene, {
          type: EnemyType.FLAM,
          speed: speedConfig.flam || speedConfig.chaser || speedConfig.randomWalker,
          x: pos.x,
          y: pos.y,
          health: healthConfig?.flam,
          cloneDetectionRadius: behaviorConfig?.cloneDetectionRadius ?? 0,
          chaseRadius: behaviorConfig?.chaseRadius ?? 0,
          chaseSpeed: behaviorConfig?.chaseSpeed ?? 0,
          clonesCanClone: behaviorConfig?.clonesCanClone ?? false,
          cloneLifetime: behaviorConfig?.cloneLifetime ?? 0,
          cloneCount: behaviorConfig?.cloneCount ?? 0,
          cloneSpawnDelay: behaviorConfig?.cloneSpawnDelay ?? 0,
          showDetectionRadius: behaviorConfig?.showDetectionRadius ?? false
        } as any);
        chaserGroup.add(enemy.getSprite());
        // ✅ Позиция уже занята в матрице через spawnEnemyMatrix()
      }

      if (enemy) {
        // ✅ Мигание и звук при спавне
        enemy.startCloneBlinkAnimation();
        enemy.playSpawnSound();
        // ✅ Вызываем callback для немедленного обновления enemyInstances и вызова update()
        if (onEnemyCreated) {
          onEnemyCreated(enemy);
        }
      }

      spawnIndex++;

      // Спавним следующего врага с задержкой
      if (spawnIndex < totalEnemies) {
        this.scene.time.delayedCall(spawnDelay, spawnNextEnemy);
      }
    };

    // Запускаем спавн первого врага
    spawnNextEnemy();
  }

  /**
   * Спавн предметов (сердца и ключи/монетки)
   * ⚠️ НОВОЕ: Поддержка двух фаз - COIN (монетки) и KEY (ключи)
   * ✅ Использует матричную систему для безопасного размещения
   */
  public async spawnItems(
    heartsGroup: Phaser.Physics.Arcade.Group,
    keysGroup: Phaser.Physics.Arcade.Group,
    coinsGroup: Phaser.Physics.Arcade.Group, // ⚠️ НОВОЕ
    playerX?: number,
    playerY?: number
  ): Promise<void> {
    const itemConfig = await this.levelManager.getItemSpawnConfig();
    const gameState = (this.scene as any).gameState;
    const currentPhase = gameState?.getGamePhase();

    // Спавн сердец (используем PNG текстуру если доступна, иначе fallback)
    const heartKey = this.scene.textures.exists('heart_icon') ? 'heart_icon' : KEYS.HEART;
    let heartsSpawned = 0;
    for (let i = 0; i < itemConfig.hearts.initial; i++) {
      const posResult = this.spawnHeartMatrix();
      if (!posResult.success) {
        console.warn(`⚠️ SpawnSystem.spawnItems: Не удалось найти безопасную позицию для сердечка ${i + 1}/${itemConfig.hearts.initial}. Пропускаем.`);
        continue;
      }
      const heart = heartsGroup.create(posResult.x, posResult.y, heartKey);
      heart.setScale(BASE_SCALE * ACTOR_SIZES.HEART);
      heart.setDepth(DEPTHS.WORLD.SPAWNED_ITEM);
      heartsSpawned++;
    }
    if (heartsSpawned < itemConfig.hearts.initial) {
      console.warn(`⚠️ SpawnSystem.spawnItems: Создано только ${heartsSpawned} из ${itemConfig.hearts.initial} сердечек.`);
    }

    // ... inside spawnItems ...
    // ⚠️ НОВОЕ: Спавн монеток в COIN Phase
    if (currentPhase === 'coin' && itemConfig.coins) {
      let coinsSpawned = 0;

      for (let i = 0; i < itemConfig.coins.initial; i++) {
        const posResult = this.spawnCoinMatrix();
        if (!posResult.success) {
          console.warn(`⚠️ SpawnSystem.spawnItems: Не удалось найти безопасную позицию для монетки ${i + 1}/${itemConfig.coins.initial}. Пропускаем.`);
          continue;
        }

        // ✅ CRITICAL FIX: Use Coin class instead of generic create
        const coin = new Coin(this.scene as any, posResult.x, posResult.y);
        coinsGroup.add(coin);

        // Coin class handles scaling, depth, and animation internally
        (coin as any).isProcessing = false;

        coinsSpawned++;
      }
      if (coinsSpawned < itemConfig.coins.initial) {
        console.warn(`⚠️ SpawnSystem.spawnItems: Создано только ${coinsSpawned} из ${itemConfig.coins.initial} монеток.`);
      }
    }

    // ... inside spawnPeriodicItems ...
    // ⚠️ НОВОЕ: Спавн монеток если нужно (COIN Phase)
    if (currentPhase === 'coin' && itemConfig.coins && coinsGroup.getChildren().filter(c => c.active).length < itemConfig.coins.max) {
      const posResult = this.spawnCoinMatrix();
      if (!posResult.success) {
        console.warn(`⚠️ SpawnSystem.spawnPeriodicItems: Не удалось найти безопасную позицию для периодической монетки. Пропускаем.`);
      } else {
        // ✅ CRITICAL FIX: Use Coin class instead of generic create
        const coin = new Coin(this.scene as any, posResult.x, posResult.y);
        coinsGroup.add(coin);

        // Coin class handles scaling, depth, and animation internally
        (coin as any).isProcessing = false;

        console.log('🪙 Periodic Coin created at:', { x: coin.x, y: coin.y });
      }
    }

    // Спавн ключей в KEY Phase (используем спрайтшит Key_64x16.png с анимацией)
    if (currentPhase === 'key') {
      const keyKey = this.scene.textures.exists('key_sheet') ? 'key_sheet' : KEYS.KEY;
      const currentLevel = this.levelManager.getCurrentLevel();
      let keysSpawned = 0;

      for (let i = 0; i < itemConfig.keys.initial; i++) {
        const posResult = this.spawnKeyMatrix();
        if (!posResult.success) {
          console.warn(`⚠️ SpawnSystem.spawnItems: Не удалось найти безопасную позицию для ключа ${i + 1}/${itemConfig.keys.initial}. Пропускаем.`);
          continue;
        }
        const key = keysGroup.create(posResult.x, posResult.y, keyKey);

        // ✅ ПРЕДЗАПОЛНЕНИЕ УНИКАЛЬНЫМИ ВОПРОСАМИ
        const existingQuizzes = keysGroup.getChildren()
          .map((k: any) => k.getData('questionData')?.questionText)
          .filter(text => !!text);

        const questionData = await this.quizManager.getUniqueMiniQuiz(currentLevel, existingQuizzes);
        key.setData('questionData', questionData);

        (key as any).isProcessing = false;
        const keyScale = BASE_SCALE * ACTOR_SIZES.KEY;
        key.setScale(keyScale);
        key.setDepth(DEPTHS.WORLD.SPAWNED_ITEM);
        logger.log('SPAWN_SYSTEM', `Created key at (${posResult.x}, ${posResult.y}) with scale ${keyScale}`);

        if (this.scene.anims?.exists && this.scene.anims.exists('key_idle')) {
          logger.log('SPAWN_SYSTEM', `Playing animation 'key_idle' on key`);
          key.play('key_idle');
        } else {
          console.warn(`⚠️ SpawnSystem: Animation 'key_idle' does not exist!`);
        }
        keysSpawned++;
      }
      if (keysSpawned < itemConfig.keys.initial) {
        console.warn(`⚠️ SpawnSystem.spawnItems: Создано только ${keysSpawned} из ${itemConfig.keys.initial} ключей.`);
      }
    }
  }

  /**
   * Периодический спавн предметов
   * ⚠️ НОВОЕ: Поддержка coinsGroup
   * ✅ Использует матричную систему для безопасного размещения
   */
  public async spawnPeriodicItems(
    heartsGroup: Phaser.Physics.Arcade.Group,
    keysGroup: Phaser.Physics.Arcade.Group,
    coinsGroup: Phaser.Physics.Arcade.Group, // ⚠️ НОВОЕ
    playerX?: number,
    playerY?: number
  ): Promise<void> {
    const heartKey = this.scene.textures.exists('heart_icon') ? 'heart_icon' : KEYS.HEART;
    const itemConfig = await this.levelManager.getItemSpawnConfig();
    const gameState = (this.scene as any).gameState;
    const currentPhase = gameState?.getGamePhase();

    // Спавн сердец если нужно
    if (this.scene.sys.settings.active && heartsGroup.scene && heartsGroup.getChildren().filter(c => c.active).length < itemConfig.hearts.max) {
      const posResult = this.spawnHeartMatrix();
      if (!posResult.success) {
        console.warn(`⚠️ SpawnSystem.spawnPeriodicItems: Не удалось найти безопасную позицию для периодического сердечка. Пропускаем.`);
      } else {
        const heart = heartsGroup.create(posResult.x, posResult.y, heartKey);
        // ✅ Используем индивидуальный размер для сердечек
        heart.setScale(BASE_SCALE * ACTOR_SIZES.HEART);
        // ✅ Устанавливаем depth выше травы (1), но ниже порталов (5)
        heart.setDepth(DEPTHS.WORLD.SPAWNED_ITEM);
      }
    }

    // ⚠️ НОВОЕ: Спавн монеток если нужно (COIN Phase)
    if (currentPhase === 'coin' && itemConfig.coins && coinsGroup.getChildren().filter(c => c.active).length < itemConfig.coins.max) {
      const posResult = this.spawnCoinMatrix();
      if (!posResult.success) {
        console.warn(`⚠️ SpawnSystem.spawnPeriodicItems: Не удалось найти безопасную позицию для периодической монетки. Пропускаем.`);
      } else {
        // ✅ CRITICAL FIX: Use Coin class instead of generic create
        const coin = new Coin(this.scene as any, posResult.x, posResult.y);
        coinsGroup.add(coin);

        // Coin class handles scaling, depth, and animation internally
        (coin as any).isProcessing = false;

        console.log('🪙 Periodic Coin created at:', { x: coin.x, y: coin.y, depth: coin.depth });
      }
    }

    // Спавн ключей если нужно (KEY Phase)
    if (currentPhase === 'key' && keysGroup.getChildren().filter(c => c.active).length < itemConfig.keys.max) {
      const posResult = this.spawnKeyMatrix();
      if (!posResult.success) {
        console.warn(`⚠️ SpawnSystem.spawnPeriodicItems: Не удалось найти безопасную позицию для периодического ключа. Пропускаем.`);
      } else {
        const keyKey = this.scene.textures.exists('key_sheet') ? 'key_sheet' : KEYS.KEY;
        const key = keysGroup.create(posResult.x, posResult.y, keyKey);

        const currentLevel = this.levelManager.getCurrentLevel();
        const existingQuizzes = keysGroup.getChildren()
          .map((k: any) => k.getData('questionData')?.questionText)
          .filter(text => !!text);

        const questionData = await this.quizManager.getUniqueMiniQuiz(currentLevel, existingQuizzes);
        key.setData('questionData', questionData);

        (key as any).isProcessing = false;
        const keyScale = BASE_SCALE * ACTOR_SIZES.KEY;
        key.setScale(keyScale);
        key.setDepth(DEPTHS.WORLD.SPAWNED_ITEM);
        logger.log('SPAWN_SYSTEM', `Created periodic key at (${posResult.x}, ${posResult.y}) with scale ${keyScale}`);
        // ✅ Запускаем анимацию, если спрайтшит загружен
        if (this.scene.anims?.exists && this.scene.anims.exists('key_idle')) {
          logger.log('SPAWN_SYSTEM', `Playing animation 'key_idle' on periodic key`);
          key.play('key_idle');
        } else {
          console.warn(`⚠️ SpawnSystem: Animation 'key_idle' does not exist for periodic key!`);
        }
      }
    }
  }

  /**
   * Очистить занятые зоны
   * ✅ Также очищает матрицу
   */
  /**
   * Очистить занятые зоны
   * ✅ Также очищает матрицу
   */
  public clearOccupiedZones(): void {
    this.spawnMatrix.clear(); // ✅ Очищаем матрицу (заново занимаем постоянные объекты при спавне)
  }

  /**
   * ⚠️ НОВОЕ: Очистить запретные зоны (для кустов/камней)
   * Вызывается при создании нового мира для предотвращения накопления запретных зон
   */
  public clearForbiddenZones(): void {
    this.spawnMatrix.clearForbiddenZones();
  }
}



