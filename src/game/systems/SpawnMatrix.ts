/**
 * Матрица занятости ячеек для безопасного спавна
 * Карта 2048×2048 разделена на ячейки 64×64 (итого 32×32 ячейки)
 */

import { MAP_WIDTH, MAP_HEIGHT, BASE_SCALE } from '../../constants/gameConstants';

// Типы занятости ячеек
export type CellOccupancyType = 'free' | 'permanent' | 'item' | 'enemy' | 'player';

// Размер ячейки в виртуальных пикселях
const CELL_SIZE = 64; // 64×64 пикселей

// Размеры матрицы (количество ячеек)
const MATRIX_COLS = (MAP_WIDTH * BASE_SCALE) / CELL_SIZE; // 32
const MATRIX_ROWS = (MAP_HEIGHT * BASE_SCALE) / CELL_SIZE; // 32

export interface CellPosition {
  col: number;
  row: number;
}

export interface WorldPosition {
  x: number;
  y: number;
}

export class SpawnMatrix {
  private matrix: CellOccupancyType[][];
  private readonly cols: number;
  private readonly rows: number;
  private readonly cellSize: number;
  // ⚠️ НОВОЕ: Запретные зоны (для кустов, камней - не должны спавниться рядом с Оракулом и порталами)
  private forbiddenZones: Array<{ col: number; row: number; width: number; height: number }> = [];

  constructor() {
    this.cols = MATRIX_COLS;
    this.rows = MATRIX_ROWS;
    this.cellSize = CELL_SIZE;

    // Инициализация матрицы - все ячейки свободны
    this.matrix = [];
    for (let row = 0; row < this.rows; row++) {
      this.matrix[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.matrix[row][col] = 'free';
      }
    }
  }

  /**
   * Конвертация мировых координат в индексы ячеек
   */
  public worldToCell(x: number, y: number): CellPosition {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return {
      col: Math.max(0, Math.min(col, this.cols - 1)),
      row: Math.max(0, Math.min(row, this.rows - 1))
    };
  }

  /**
   * Конвертация индексов ячеек в мировые координаты (центр ячейки)
   */
  public cellToWorld(col: number, row: number): WorldPosition {
    const x = col * this.cellSize + this.cellSize / 2;
    const y = row * this.cellSize + this.cellSize / 2;
    return { x, y };
  }

  /**
   * Выровнять координаты по центру ячейки
   */
  public alignToCell(x: number, y: number): WorldPosition {
    const cell = this.worldToCell(x, y);
    return this.cellToWorld(cell.col, cell.row);
  }

  /**
   * Проверить, свободен ли прямоугольник ячеек
   * @param col Левая колонка
   * @param row Верхняя строка
   * @param width Ширина в ячейках
   * @param height Высота в ячейках
   * @param ignoreEnemies Если true, игнорирует ячейки с врагами (для спавна врагов поверх предметов)
   */
  public isRectFree(
    col: number,
    row: number,
    width: number,
    height: number,
    ignoreEnemies: boolean = false
  ): boolean {
    // Проверка границ
    if (col < 0 || row < 0 || col + width > this.cols || row + height > this.rows) {
      return false;
    }

    // ⚠️ НОВОЕ: Проверка запретных зон (для кустов/камней вокруг Оракула и порталов)
    if (this.isInForbiddenZone(col, row, width, height)) {
      return false;
    }

    // Проверка каждой ячейки в прямоугольнике
    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        const cellType = this.matrix[r][c];

        if (cellType === 'permanent' || cellType === 'item' || cellType === 'player') {
          return false; // Постоянные объекты, предметы и игрок блокируют всё
        }

        if (!ignoreEnemies && cellType === 'enemy') {
          return false; // Враги блокируют, если не игнорируем их
        }
      }
    }

    return true;
  }

  /**
   * Занять прямоугольник ячеек
   * @param col Левая колонка
   * @param row Верхняя строка
   * @param width Ширина в ячейках
   * @param height Высота в ячейках
   * @param type Тип занятости
   */
  public occupyRect(
    col: number,
    row: number,
    width: number,
    height: number,
    type: 'permanent' | 'item' | 'enemy' | 'player'
  ): void {
    // Проверка границ
    if (col < 0 || row < 0 || col + width > this.cols || row + height > this.rows) {
      console.warn(`⚠️ SpawnMatrix.occupyRect: Выход за границы матрицы (col: ${col}, row: ${row}, width: ${width}, height: ${height})`);
      return;
    }

    // Занимаем каждую ячейку в прямоугольнике
    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        // Враги могут перезаписывать предметы, но не постоянные объекты и игрока
        if (type === 'enemy' && (this.matrix[r][c] === 'permanent' || this.matrix[r][c] === 'player')) {
          continue; // Не перезаписываем постоянные объекты и игрока
        }
        this.matrix[r][c] = type;
      }
    }
  }

  /**
   * ⚠️ НОВОЕ: Добавить запретную зону (для кустов/камней вокруг Оракула и порталов)
   * @param col Левая колонка
   * @param row Верхняя строка
   * @param width Ширина в ячейках
   * @param height Высота в ячейках
   * @param margin Дополнительный отступ (в ячейках) - для создания "буферной зоны"
   */
  public addForbiddenZone(
    col: number,
    row: number,
    width: number,
    height: number,
    margin: number = 2 // 2 ряда по умолчанию
  ): void {
    // Добавляем зону с отступом
    const zone = {
      col: Math.max(0, col - margin),
      row: Math.max(0, row - margin),
      width: width + margin * 2,
      height: height + margin * 2
    };

    // Корректируем границы, чтобы не выйти за пределы матрицы
    zone.col = Math.max(0, zone.col);
    zone.row = Math.max(0, zone.row);
    zone.width = Math.min(this.cols - zone.col, zone.width);
    zone.height = Math.min(this.rows - zone.row, zone.height);

    this.forbiddenZones.push(zone);
  }

  /**
   * ⚠️ НОВОЕ: Проверить, попадает ли прямоугольник в запретную зону
   */
  private isInForbiddenZone(col: number, row: number, width: number, height: number): boolean {
    for (const zone of this.forbiddenZones) {
      // Проверяем пересечение двух прямоугольников
      const col1 = Math.max(col, zone.col);
      const col2 = Math.min(col + width, zone.col + zone.width);
      const row1 = Math.max(row, zone.row);
      const row2 = Math.min(row + height, zone.row + zone.height);

      if (col1 < col2 && row1 < row2) {
        return true; // Есть пересечение с запретной зоной
      }
    }
    return false;
  }

  /**
   * ⚠️ НОВОЕ: Очистить все запретные зоны (вызывать при сбросе уровня)
   */
  public clearForbiddenZones(): void {
    this.forbiddenZones = [];
  }

  /**
   * ✅ Атомарная операция: проверить и занять прямоугольник ячеек
   * Возвращает true, если ячейка была свободна и успешно занята, false - если уже занята
   * @param col Левая колонка
   * @param row Верхняя строка
   * @param width Ширина в ячейках
   * @param height Высота в ячейках
   * @param type Тип занятости
   * @param ignoreEnemies Если true, игнорирует ячейки с врагами
   */
  public tryOccupyRect(
    col: number,
    row: number,
    width: number,
    height: number,
    type: 'permanent' | 'item' | 'enemy' | 'player',
    ignoreEnemies: boolean = false
  ): boolean {
    // Проверка границ
    if (col < 0 || row < 0 || col + width > this.cols || row + height > this.rows) {
      return false;
    }

    // ✅ Атомарная проверка: проверяем, свободна ли ячейка
    if (!this.isRectFree(col, row, width, height, ignoreEnemies)) {
      return false; // Ячейка уже занята
    }

    // ✅ Если свободна - занимаем её
    this.occupyRect(col, row, width, height, type);
    return true;
  }

  /**
   * Найти свободный прямоугольник ячеек
   * @param width Ширина в ячейках
   * @param height Высота в ячейках
   * @param ignoreEnemies Если true, игнорирует ячейки с врагами
   * @param maxAttempts Максимальное количество попыток
   * @returns Позиция ячейки или null, если не найдено
   */
  public findFreeRect(
    width: number,
    height: number,
    ignoreEnemies: boolean = false,
    maxAttempts: number = 1000
  ): CellPosition | null {
    // Создаем список всех возможных позиций и перемешиваем
    const positions: CellPosition[] = [];
    for (let row = 0; row <= this.rows - height; row++) {
      for (let col = 0; col <= this.cols - width; col++) {
        positions.push({ col, row });
      }
    }

    // Перемешиваем для случайного порядка
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Проверяем каждую позицию
    let attempts = 0;
    for (const pos of positions) {
      if (attempts >= maxAttempts) {
        break;
      }
      attempts++;

      if (this.isRectFree(pos.col, pos.row, width, height, ignoreEnemies)) {
        return pos;
      }
    }

    return null;
  }

  /**
   * Найти свободную позицию на окружности (для порталов)
   * @param centerX Центр окружности (мировые координаты)
   * @param centerY Центр окружности (мировые координаты)
   * @param radius Радиус окружности
   * @param width Ширина объекта в ячейках
   * @param height Высота объекта в ячейках
   * @param angleOffset Начальный угол смещения (для размещения нескольких порталов)
   * @param maxAttempts Максимальное количество попыток
   * @returns Позиция ячейки или null, если не найдено
   */
  public findFreeRectOnCircle(
    centerX: number,
    centerY: number,
    radius: number,
    width: number,
    height: number,
    angleOffset: number = 0,
    maxAttempts: number = 100
  ): CellPosition | null {
    // Пробуем разные углы на окружности
    const angleStep = (2 * Math.PI) / maxAttempts;
    
    for (let i = 0; i < maxAttempts; i++) {
      const angle = angleOffset + i * angleStep;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      // Конвертируем в ячейки (левый верхний угол прямоугольника)
      const cell = this.worldToCell(x, y);
      // Смещаем на половину размера объекта, чтобы центр был в нужной позиции
      const offsetCol = cell.col - Math.floor(width / 2);
      const offsetRow = cell.row - Math.floor(height / 2);
      
      // Проверяем границы
      if (offsetCol >= 0 && offsetRow >= 0 && 
          offsetCol + width <= this.cols && offsetRow + height <= this.rows) {
        if (this.isRectFree(offsetCol, offsetRow, width, height, false)) {
          return { col: offsetCol, row: offsetRow };
        }
      }
    }

    return null;
  }

  /**
   * Освободить прямоугольник ячеек (для предметов, которые были подняты)
   * @param col Левая колонка
   * @param row Верхняя строка
   * @param width Ширина в ячейках
   * @param height Высота в ячейках
   * @param type Тип занятости, который нужно освободить ('item' | 'enemy')
   */
  public freeRect(
    col: number,
    row: number,
    width: number,
    height: number,
    type: 'item' | 'enemy'
  ): void {
    // Проверка границ
    if (col < 0 || row < 0 || col + width > this.cols || row + height > this.rows) {
      console.warn(`⚠️ SpawnMatrix.freeRect: Выход за границы матрицы (col: ${col}, row: ${row}, width: ${width}, height: ${height})`);
      return;
    }

    // Освобождаем каждую ячейку в прямоугольнике (только если тип совпадает)
    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        if (this.matrix[r][c] === type) {
          this.matrix[r][c] = 'free';
        }
      }
    }
  }

  /**
   * Очистить матрицу (для перезапуска уровня)
   */
  public clear(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.matrix[row][col] = 'free';
      }
    }
  }

  /**
   * Получить тип занятости ячейки (для отладки)
   */
  public getCellType(col: number, row: number): CellOccupancyType {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) {
      return 'free';
    }
    return this.matrix[row][col];
  }

  /**
   * Получить размеры матрицы (для отладки)
   */
  public getMatrixSize(): { cols: number; rows: number; cellSize: number } {
    return {
      cols: this.cols,
      rows: this.rows,
      cellSize: this.cellSize
    };
  }

  /**
   * Получить копию матрицы (для отладки и визуализации)
   */
  public getMatrix(): CellOccupancyType[][] {
    // Возвращаем копию матрицы, чтобы нельзя было изменить оригинал
    return this.matrix.map(row => [...row]);
  }
}

















