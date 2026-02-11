/**
 * Отладочный UI и сетка матрицы спавна
 * Управляет отображением отладочной информации и визуализацией матрицы спавна
 */

import Phaser from 'phaser';
import { DEBUG_OVERLAY_ENABLED, DEBUG_VISUAL_GRID_ENABLED, DEBUG_SPAWN_GRID_ENABLED } from '../../config/gameConfig';
import { logSystem } from '../../config/gameConfig';
import { MAP_WIDTH, MAP_HEIGHT, BASE_SCALE, DEPTHS } from '../../constants/gameConstants';
import { CellOccupancyType } from '../systems/SpawnMatrix';
import { Player } from '../entities/Player';
import { AbstractEnemy } from '../entities/enemies/AbstractEnemy';
import { EnemyType } from '../../types/enemyTypes';
import { SpawnSystem } from '../systems/SpawnSystem';
import { GameState } from '../core/GameState';
import { logger } from '../../utils/Logger';

/**
 * Интерфейс для доступа к игровым данным
 */
interface DebugOverlayDependencies {
    getPlayer: () => Player | null;
    getGameState: () => GameState;
    getSpawnSystem: () => SpawnSystem | null;
    getEnemyInstances: () => AbstractEnemy[];
    getMaxKeys: () => number;
    getHeartsGroup: () => Phaser.Physics.Arcade.Group | null;
    getKeysGroup: () => Phaser.Physics.Arcade.Group | null;
    getCoinsGroup: () => Phaser.Physics.Arcade.Group | null;
    getScore: () => number;
    getMaxPossibleScore: () => number;
    getTotalMaxPossibleScore: () => number;
    getCurrentLevel: () => number;          // ⚠️ НОВОЕ
    getCurrentConfigKey: () => string;      // ⚠️ НОВОЕ
}

/**
 * Цветовые блоки для debug overlay
 */
interface DebugBlock {
    name: string;
    color: string;
    lineCount: number;  // Количество строк в этом блоке
    textObject?: Phaser.GameObjects.Text;
    yOffset: number;
}

/**
 * Класс для управления отладочным UI и сеткой матрицы спавна
 */
export class DebugOverlay {
    private debugTexts: Map<string, Phaser.GameObjects.Text> = new Map();
    private debugUpdateCounter: number = 0;
    private spawnMatrixGrid!: Phaser.GameObjects.Graphics;

    // Конфигурация цветовых блоков
    private static readonly LINE_HEIGHT = 20;
    private static readonly BLOCK_GAP = 8;

    private readonly debugBlocks: DebugBlock[] = [
        { name: 'engine', color: '#00ffff', lineCount: 3, yOffset: 0 },    // Cyan: FPS, Player, Camera (3 строки)
        { name: 'level', color: '#ffffff', lineCount: 2, yOffset: 0 },     // White: Level Info (2 строки) ⚠️ НОВОЕ
        { name: 'score', color: '#ffff00', lineCount: 3, yOffset: 0 },     // Yellow: Score info (3 строки)
        { name: 'keys', color: '#00ff00', lineCount: 2, yOffset: 0 },      // Green: Keys (2 строки)
        { name: 'coins', color: '#ffaa00', lineCount: 2, yOffset: 0 },     // Orange: Coins (2 строки)
        { name: 'hearts', color: '#ff66ff', lineCount: 1, yOffset: 0 },    // Pink: Hearts (1 строка)
        { name: 'enemies', color: '#ff6666', lineCount: 4, yOffset: 0 }    // Red: Enemies (4 строки)
    ];

    constructor(
        private scene: Phaser.Scene,
        private deps: DebugOverlayDependencies
    ) { }

    /**
     * Создание отладочного UI
     */
    public create(): void {
        if (!DEBUG_OVERLAY_ENABLED) {
            return;
        }

        this.createDebugUI();
    }

    /**
     * Создание отладочной сетки матрицы спавна
     * Вызывается отдельно после создания всех игровых объектов
     */
    public createSpawnMatrixGrid(): void {
        if (!DEBUG_VISUAL_GRID_ENABLED) {
            return;
        }

        this.createSpawnMatrixGridInternal();
    }

    /**
     * Обновление отладочного UI
     */
    public update(): void {
        if (!DEBUG_OVERLAY_ENABLED) {
            return;
        }

        this.updateDebugUI();
    }

    /**
     * Уничтожение всех элементов отладочного UI
     */
    public destroy(): void {
        this.debugTexts.forEach(text => {
            if (text && text.active) {
                text.destroy();
            }
        });
        this.debugTexts.clear();

        if (this.spawnMatrixGrid && this.spawnMatrixGrid.active) {
            this.spawnMatrixGrid.destroy();
        }
    }

    /**
     * Вспомогательный метод для расчета координат с учетом зума камеры
     * Переводит желаемые экранные координаты (например, 20, 20) в координаты мира,
     * которые при текущем зуме окажутся в нужном месте.
     */
    private getZoomCompensatedPosition(targetX: number, targetY: number): { x: number, y: number } {
        const cam = this.scene.cameras.main;
        const zoom = cam.zoom;

        // ✅ ИСПРАВЛЕНО: Используем фиксированную высоту (1280) вместо адаптивной ширины
        // Это гарантирует, что центр всегда в одном месте относительно видимого canvas
        const BASE_GAME_HEIGHT = 1280; // Фиксированная высота виртуального экрана
        const centerX = cam.width / 2;  // Центр по X (адаптивный, но это нормально для горизонтального позиционирования)
        const centerY = BASE_GAME_HEIGHT / 2; // ✅ Фиксированный центр по Y (640) для стабильности

        // Формула обратной проекции относительно центра камеры
        // Для X используем адаптивный центр (для широких экранов это нормально)
        // Для Y используем фиксированный центр (640) для стабильности на всех экранах
        const x = centerX + (targetX - centerX) / zoom;
        const y = centerY + (targetY - centerY) / zoom;

        return { x, y };
    }

    /**
     * Создание отладочного UI
     * ✅ Мультицветные блоки для разных категорий информации
     */
    private createDebugUI(): void {
        // Удаляем старые текстовые объекты, если были
        this.debugTexts.forEach(text => {
            if (text && text.active) {
                text.destroy();
            }
        });
        this.debugTexts.clear();

        const zoom = this.scene.cameras.main.zoom;
        const targetScreenX = 20;
        let currentY = 20;

        // Создаём текстовый объект для каждого цветового блока
        this.debugBlocks.forEach(block => {
            const pos = this.getZoomCompensatedPosition(targetScreenX, currentY);
            const text = this.scene.add.text(pos.x, pos.y, '', {
                fontSize: '16px',
                fontFamily: 'monospace',
                color: block.color,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: { x: 4, y: 2 }
            })
                .setScrollFactor(0)
                .setOrigin(0, 0)
                .setDepth(DEPTHS.SCREEN.DEBUG_OVERLAY)
                .setVisible(true)
                .setActive(true)
                .setScale(1 / zoom);

            this.debugTexts.set(block.name, text);
            block.yOffset = currentY;
            block.textObject = text;

            // Смещаем позицию для следующего блока на основе количества строк
            currentY += block.lineCount * DebugOverlay.LINE_HEIGHT + DebugOverlay.BLOCK_GAP;
        });

        logger.log('DEBUG_OVERLAY', `Debug UI created with ${this.debugTexts.size} colored blocks. Zoom: ${zoom}`);
    }

    /**
     * Обновление отладочного UI
     * ✅ Мультицветные блоки обновляются отдельно
     */
    private updateDebugUI(): void {
        const player = this.deps.getPlayer();
        const gameState = this.deps.getGameState();

        if (!player || !gameState) return;

        // Проверяем, что все текстовые объекты активны
        let allActive = true;
        this.debugTexts.forEach(text => {
            if (!text || !text.active) {
                allActive = false;
            }
        });

        if (!allActive) {
            logger.warn('DEBUG_OVERLAY', 'Some debug texts are not active or destroyed.');
            return;
        }

        this.debugUpdateCounter++;

        // ✅ ВАЖНО: Обновляем позицию КАЖДЫЙ кадр для всех текстовых объектов
        const cam = this.scene.cameras.main;
        const targetScreenX = 20;
        let currentY = 20;

        this.debugBlocks.forEach(block => {
            const text = this.debugTexts.get(block.name);
            if (text) {
                const pos = this.getZoomCompensatedPosition(targetScreenX, currentY);
                text.setPosition(pos.x, pos.y);
                text.setScale(1 / cam.zoom);
                block.yOffset = currentY;
                // Смещаем позицию для следующего блока на основе количества строк
                currentY += block.lineCount * DebugOverlay.LINE_HEIGHT + DebugOverlay.BLOCK_GAP;
            }
        });

        // ✅ Обновляем сетку матрицы чаще (каждые 10 кадров)
        if (this.debugUpdateCounter % 10 === 0) {
            this.updateSpawnMatrixGrid();
        }

        // ✅ Обновляем текст каждые 30 кадров (0.5 сек при 60 FPS)
        if (this.debugUpdateCounter % 30 !== 0) {
            return;
        }

        // ✅ Обновляем сетку матрицы при обновлении debug UI
        this.updateSpawnMatrixGrid();

        const playerPos = player.getPosition();

        // ✅ Проверяем enemyInstances перед фильтрацией
        const enemyInstances = this.deps.getEnemyInstances();
        const activeEnemies = enemyInstances && Array.isArray(enemyInstances)
            ? enemyInstances.filter(e => e && e.getSprite && e.getSprite().active && e.isActive())
            : [];

        // ✅ Подсчитываем врагов по типам и их жизни
        const enemyStats = {
            randomWalker: { count: 0, totalHealth: 0 },
            chaser: { count: 0, totalHealth: 0 },
            flam: { count: 0, totalHealth: 0 }
        };

        activeEnemies.forEach(enemy => {
            const type = enemy.getType();
            const health = enemy.getHealth();

            if (type === EnemyType.RANDOM_WALKER) {
                enemyStats.randomWalker.count++;
                enemyStats.randomWalker.totalHealth += health;
            } else if (type === EnemyType.CHASER) {
                enemyStats.chaser.count++;
                enemyStats.chaser.totalHealth += health;
            } else if (type === EnemyType.FLAM) {
                enemyStats.flam.count++;
                enemyStats.flam.totalHealth += health;
            }
        });

        // ✅ Подсчитываем количество сердечек, ключей и монеток в сцене
        const heartsGroup = this.deps.getHeartsGroup();
        const keysGroup = this.deps.getKeysGroup();
        const coinsGroup = this.deps.getCoinsGroup();
        const heartsCount = heartsGroup ? heartsGroup.countActive(true) : 0;
        const keysCount = keysGroup ? keysGroup.countActive(true) : 0;
        const coinsCount = coinsGroup ? coinsGroup.countActive(true) : 0;

        const fps = this.scene.game.loop.actualFps;

        // ✅ Формируем содержимое для каждого блока отдельно
        const blockContents: Record<string, string[]> = {
            engine: [
                `FPS: ${fps.toFixed(1)}`,
                `Player: ${playerPos.x | 0}x${playerPos.y | 0}`,
                `Camera: ${cam.scrollX | 0}x${cam.scrollY | 0}`
            ],
            level: [
                `Level: ${this.deps.getCurrentLevel()}`,
                `Config: ${this.deps.getCurrentConfigKey()}`
            ],
            score: [
                `Score: ${this.deps.getScore()}`,
                `Max Possible (Level): ${this.deps.getMaxPossibleScore()}`,
                `Max Possible (Total): ${this.deps.getTotalMaxPossibleScore()}`
            ],
            keys: [
                `Keys Collected: ${gameState.getKeys()}/${this.deps.getMaxKeys()}`,
                `Keys on Map: ${keysCount}`
            ],
            coins: [
                `Coins Collected: ${gameState.getCoins()}/3`,
                `Coins on Map: ${coinsCount}`
            ],
            hearts: [
                `Hearts on Map: ${heartsCount}`
            ],
            enemies: [
                `Enemies: ${activeEnemies.length}`,
                `  Beast: ${enemyStats.randomWalker.count} (HP: ${enemyStats.randomWalker.totalHealth})`,
                `  Dragon: ${enemyStats.chaser.count} (HP: ${enemyStats.chaser.totalHealth})`,
                `  Flam: ${enemyStats.flam.count} (HP: ${enemyStats.flam.totalHealth})`
            ]
        };

        // ✅ Обновляем каждый текстовый объект своим содержимым
        this.debugBlocks.forEach(block => {
            const text = this.debugTexts.get(block.name);
            const content = blockContents[block.name];
            if (text && content && text.setText) {
                text.setText(content.join('\n'));
            }
        });
    }

    /**
     * ✅ Создание отладочной сетки матрицы спавна
     * Показывает ячейки 64×64 пикселей и их занятость
     */
    private createSpawnMatrixGridInternal(): void {
        // ✅ Проверяем, что spawnSystem инициализирован
        const spawnSystem = this.deps.getSpawnSystem();
        if (!spawnSystem) {
            logger.warn('DEBUG_OVERLAY', 'SpawnSystem not available for debug grid');
            return;
        }

        // Получаем доступ к матрице через spawnSystem
        const spawnMatrix = (spawnSystem as any).spawnMatrix;
        if (!spawnMatrix) {
            logger.warn('DEBUG_OVERLAY', 'SpawnMatrix not available for debug grid');
            return;
        }

        logger.log('DEBUG_OVERLAY', 'Creating spawn matrix grid...');

        const matrixSize = spawnMatrix.getMatrixSize();
        const CELL_SIZE = matrixSize.cellSize; // 64 пикселей
        const COLS = matrixSize.cols; // 32
        const ROWS = matrixSize.rows; // 32

        const mapWidthScaled = MAP_WIDTH * BASE_SCALE; // 2048
        const mapHeightScaled = MAP_HEIGHT * BASE_SCALE; // 2048

        logger.log('DEBUG_OVERLAY', `Spawn matrix grid: Matrix size ${COLS}x${ROWS}, Cell size ${CELL_SIZE}`);
        logger.log('DEBUG_OVERLAY', `Spawn matrix grid - Map size: ${mapWidthScaled}x${mapHeightScaled}`);

        // Создаем Graphics объект для отрисовки сетки
        this.spawnMatrixGrid = this.scene.add.graphics();
        this.spawnMatrixGrid.setDepth(DEPTHS.SCREEN.SPAWN_MATRIX_GRID); // ✅ Сетка - третий слой (после фона -200 и травы -100), но ниже порталов (0) и всех игровых объектов
        this.spawnMatrixGrid.setScrollFactor(1); // ✅ Двигается с камерой
        this.spawnMatrixGrid.setVisible(true); // ✅ Явно делаем видимым
        this.spawnMatrixGrid.setActive(true); // ✅ Явно делаем активным

        logger.log('DEBUG_OVERLAY', 'Spawn matrix grid Graphics object created');
        logger.log('DEBUG_OVERLAY', `Spawn matrix grid - Depth: ${this.spawnMatrixGrid.depth}, Visible: ${this.spawnMatrixGrid.visible}, Active: ${this.spawnMatrixGrid.active}`);

        // Обновляем сетку
        this.updateSpawnMatrixGrid();

        logger.log('DEBUG_OVERLAY', 'Spawn matrix grid created and updated');
    }

    /**
     * ✅ Обновление отладочной сетки матрицы спавна
     * Отрисовывает линии сетки и закрашивает занятые ячейки
     */
    private updateSpawnMatrixGrid(): void {
        if (!this.spawnMatrixGrid || !DEBUG_VISUAL_GRID_ENABLED) {
            if (DEBUG_SPAWN_GRID_ENABLED && !DEBUG_VISUAL_GRID_ENABLED) {
                logger.log('DEBUG_OVERLAY', 'Spawn matrix grid update skipped: DEBUG_VISUAL_GRID_ENABLED is false');
            }
            return;
        }

        const spawnSystem = this.deps.getSpawnSystem();
        if (!spawnSystem) {
            logger.warn('DEBUG_OVERLAY', 'SpawnSystem not available for grid update');
            return;
        }

        const spawnMatrix = (spawnSystem as any).spawnMatrix;
        if (!spawnMatrix) {
            logger.warn('DEBUG_OVERLAY', 'SpawnMatrix not available for grid update');
            return;
        }

        const matrixSize = spawnMatrix.getMatrixSize();
        const CELL_SIZE = matrixSize.cellSize; // 64 пикселей
        const COLS = matrixSize.cols; // 32
        const ROWS = matrixSize.rows; // 32

        const mapWidthScaled = MAP_WIDTH * BASE_SCALE; // 2048
        const mapHeightScaled = MAP_HEIGHT * BASE_SCALE; // 2048

        // Очищаем предыдущую отрисовку
        this.spawnMatrixGrid.clear();

        // Получаем текущее состояние матрицы
        const matrix = spawnMatrix.getMatrix();

        // Цвета для разных типов занятости
        const COLORS: Record<CellOccupancyType, number> = {
            free: 0x00ff00,      // Зеленый - свободно
            permanent: 0xff0000, // Красный - постоянные объекты (порталы, оракул, кусты)
            item: 0xffff00,     // Желтый - предметы (ключи, сердечки)
            enemy: 0x0000ff,    // Синий - враги
            player: 0xff00ff    // Пурпурный/Маджента - игрок
        };

        // Отрисовываем заливку для занятых ячеек
        // ✅ ВАЖНО: Рисуем от левого верхнего угла ячейки (col * CELL_SIZE, row * CELL_SIZE)
        // Ячейки в матрице индексируются от (0,0) в левом верхнем углу карты
        // Матрица: matrix[row][col] - строка, затем колонка
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cellType: CellOccupancyType = matrix[row][col];
                if (cellType !== 'free') {
                    // ✅ Позиция ячейки - левый верхний угол (col * CELL_SIZE, row * CELL_SIZE)
                    // Это соответствует тому, как объекты занимают ячейки в occupyRect
                    const x = col * CELL_SIZE;
                    const y = row * CELL_SIZE;
                    const alpha = (cellType === 'permanent' || cellType === 'player') ? 0.5 : 0.3; // Постоянные объекты и игрок более заметны

                    this.spawnMatrixGrid.fillStyle(COLORS[cellType], alpha);
                    this.spawnMatrixGrid.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                }
            }
        }

        // Отрисовываем линии сетки (более заметные для отладки)
        this.spawnMatrixGrid.lineStyle(1, 0xffffff, 0.5); // Белые линии с большей прозрачностью

        // Вертикальные линии
        for (let col = 0; col <= COLS; col++) {
            const x = col * CELL_SIZE;
            this.spawnMatrixGrid.moveTo(x, 0);
            this.spawnMatrixGrid.lineTo(x, mapHeightScaled);
        }

        // Горизонтальные линии
        for (let row = 0; row <= ROWS; row++) {
            const y = row * CELL_SIZE;
            this.spawnMatrixGrid.moveTo(0, y);
            this.spawnMatrixGrid.lineTo(mapWidthScaled, y);
        }

        // Отрисовываем границы карты
        this.spawnMatrixGrid.lineStyle(2, 0x00ffff, 0.8); // Голубые границы карты (более заметные)
        this.spawnMatrixGrid.strokeRect(0, 0, mapWidthScaled, mapHeightScaled);

        const occupiedCount = matrix.flat().filter((c: CellOccupancyType) => c !== 'free').length;

        // ✅ Детальные логи сетки (через logSystem - управляется DEBUG_SYSTEMS)
        logSystem(`Spawn matrix grid updated - drawn ${COLS * ROWS} cells, ${occupiedCount} occupied`);

        // Отладочная информация для проверки смещения (только при VERBOSE)
        if (occupiedCount > 0 && DEBUG_SPAWN_GRID_ENABLED) {
            // Находим первую занятую ячейку для примера
            for (let row = 0; row < ROWS; row++) {
                for (let col = 0; col < COLS; col++) {
                    if (matrix[row][col] === 'permanent') {
                        const cellX = col * CELL_SIZE;
                        const cellY = row * CELL_SIZE;
                        const cellCenterX = cellX + CELL_SIZE / 2;
                        const cellCenterY = cellY + CELL_SIZE / 2;
                        logger.log('DEBUG_OVERLAY', `Permanent cell at (${col}, ${row}): top-left=(${cellX}, ${cellY}), center=(${cellCenterX}, ${cellCenterY})`);
                        break;
                    }
                }
            }
        }
    }
}

// Trigger rebuild
