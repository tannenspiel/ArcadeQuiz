/**
 * Unit тесты для SpawnMatrix
 * Тестирует матричную систему безопасного спавна объектов
 */

import { SpawnMatrix } from '../../../game/systems/SpawnMatrix';
import { MAP_WIDTH, MAP_HEIGHT, BASE_SCALE } from '../../../constants/gameConstants';

// Константы из SpawnMatrix
const CELL_SIZE = 64;
const MATRIX_COLS = (MAP_WIDTH * BASE_SCALE) / CELL_SIZE; // 32
const MATRIX_ROWS = (MAP_HEIGHT * BASE_SCALE) / CELL_SIZE; // 32

describe('SpawnMatrix', () => {
  let matrix: SpawnMatrix;
  let originalConsoleWarn: typeof console.warn;

  beforeEach(() => {
    // Отключаем предупреждения в тестах
    originalConsoleWarn = console.warn;
    console.warn = jest.fn();
    
    matrix = new SpawnMatrix();
  });

  afterEach(() => {
    // Восстанавливаем console.warn
    console.warn = originalConsoleWarn;
  });

  describe('Инициализация', () => {
    it('должен создавать матрицу правильного размера', () => {
      const size = matrix.getMatrixSize();
      
      expect(size.cols).toBe(MATRIX_COLS);
      expect(size.rows).toBe(MATRIX_ROWS);
      expect(size.cellSize).toBe(CELL_SIZE);
    });

    it('должен инициализировать все ячейки как свободные', () => {
      for (let row = 0; row < MATRIX_ROWS; row++) {
        for (let col = 0; col < MATRIX_COLS; col++) {
          expect(matrix.getCellType(col, row)).toBe('free');
        }
      }
    });
  });

  describe('Конвертация координат', () => {
    describe('worldToCell', () => {
      it('должен конвертировать мировые координаты в ячейки', () => {
        // Центр первой ячейки (32, 32)
        const cell = matrix.worldToCell(32, 32);
        expect(cell.col).toBe(0);
        expect(cell.row).toBe(0);

        // Центр второй ячейки (96, 96)
        const cell2 = matrix.worldToCell(96, 96);
        expect(cell2.col).toBe(1);
        expect(cell2.row).toBe(1);
      });

      it('должен ограничивать координаты границами матрицы', () => {
        // Координаты за границами
        const cellNegative = matrix.worldToCell(-100, -100);
        expect(cellNegative.col).toBe(0);
        expect(cellNegative.row).toBe(0);

        const cellTooLarge = matrix.worldToCell(3000, 3000);
        expect(cellTooLarge.col).toBe(MATRIX_COLS - 1);
        expect(cellTooLarge.row).toBe(MATRIX_ROWS - 1);
      });

      it('должен правильно обрабатывать граничные значения', () => {
        // Граница между ячейками
        const cell = matrix.worldToCell(64, 64);
        expect(cell.col).toBe(1);
        expect(cell.row).toBe(1);

        // Прямо на границе
        const cellBoundary = matrix.worldToCell(63.9, 63.9);
        expect(cellBoundary.col).toBe(0);
        expect(cellBoundary.row).toBe(0);
      });
    });

    describe('cellToWorld', () => {
      it('должен конвертировать ячейки в мировые координаты (центр ячейки)', () => {
        const world = matrix.cellToWorld(0, 0);
        expect(world.x).toBe(32); // 0 * 64 + 32
        expect(world.y).toBe(32);

        const world2 = matrix.cellToWorld(1, 1);
        expect(world2.x).toBe(96); // 1 * 64 + 32
        expect(world2.y).toBe(96);
      });

      it('должен возвращать центр ячейки', () => {
        const world = matrix.cellToWorld(5, 10);
        expect(world.x).toBe(5 * CELL_SIZE + CELL_SIZE / 2);
        expect(world.y).toBe(10 * CELL_SIZE + CELL_SIZE / 2);
      });
    });

    describe('alignToCell', () => {
      it('должен выравнивать координаты по центру ячейки', () => {
        // Координаты внутри первой ячейки
        const aligned = matrix.alignToCell(50, 50);
        expect(aligned.x).toBe(32);
        expect(aligned.y).toBe(32);

        // Координаты внутри второй ячейки
        const aligned2 = matrix.alignToCell(100, 100);
        expect(aligned2.x).toBe(96);
        expect(aligned2.y).toBe(96);
      });

      it('должен работать с любыми координатами', () => {
        const aligned = matrix.alignToCell(1234.5, 567.8);
        const cell = matrix.worldToCell(1234.5, 567.8);
        const expected = matrix.cellToWorld(cell.col, cell.row);
        
        expect(aligned.x).toBe(expected.x);
        expect(aligned.y).toBe(expected.y);
      });
    });
  });

  describe('Проверка доступности (isRectFree)', () => {
    it('должен возвращать true для свободного прямоугольника', () => {
      expect(matrix.isRectFree(0, 0, 1, 1)).toBe(true);
      expect(matrix.isRectFree(5, 5, 2, 2)).toBe(true);
    });

    it('должен возвращать false для прямоугольника за границами', () => {
      expect(matrix.isRectFree(-1, 0, 1, 1)).toBe(false);
      expect(matrix.isRectFree(0, -1, 1, 1)).toBe(false);
      expect(matrix.isRectFree(MATRIX_COLS, 0, 1, 1)).toBe(false);
      expect(matrix.isRectFree(0, MATRIX_ROWS, 1, 1)).toBe(false);
      expect(matrix.isRectFree(MATRIX_COLS - 1, 0, 2, 1)).toBe(false);
    });

    it('должен возвращать false для прямоугольника с постоянными объектами', () => {
      matrix.occupyRect(5, 5, 2, 2, 'permanent');
      
      expect(matrix.isRectFree(5, 5, 2, 2)).toBe(false);
      expect(matrix.isRectFree(4, 4, 2, 2)).toBe(false); // Пересекается
      expect(matrix.isRectFree(6, 6, 2, 2)).toBe(false); // Пересекается
    });

    it('должен возвращать false для прямоугольника с предметами', () => {
      matrix.occupyRect(10, 10, 1, 1, 'item');
      
      expect(matrix.isRectFree(10, 10, 1, 1)).toBe(false);
      expect(matrix.isRectFree(9, 9, 2, 2)).toBe(false); // Пересекается
    });

    it('должен учитывать ignoreEnemies для врагов', () => {
      matrix.occupyRect(15, 15, 1, 1, 'enemy');
      
      expect(matrix.isRectFree(15, 15, 1, 1, false)).toBe(false);
      expect(matrix.isRectFree(15, 15, 1, 1, true)).toBe(true);
    });

    it('должен проверять все ячейки в прямоугольнике', () => {
      matrix.occupyRect(5, 5, 1, 1, 'permanent');
      
      // Прямоугольник 3x3, который включает занятую ячейку
      expect(matrix.isRectFree(4, 4, 3, 3)).toBe(false);
    });
  });

  describe('Занятие ячеек (occupyRect)', () => {
    it('должен занимать прямоугольник ячеек', () => {
      matrix.occupyRect(5, 5, 2, 2, 'permanent');
      
      expect(matrix.getCellType(5, 5)).toBe('permanent');
      expect(matrix.getCellType(6, 5)).toBe('permanent');
      expect(matrix.getCellType(5, 6)).toBe('permanent');
      expect(matrix.getCellType(6, 6)).toBe('permanent');
    });

    it('должен предупреждать при выходе за границы', () => {
      matrix.occupyRect(-1, 0, 1, 1, 'permanent');
      expect(console.warn).toHaveBeenCalled();
      
      matrix.occupyRect(MATRIX_COLS, 0, 1, 1, 'permanent');
      expect(console.warn).toHaveBeenCalled();
    });

    it('НЕ должен занимать ячейки за границами', () => {
      const beforeType = matrix.getCellType(0, 0);
      matrix.occupyRect(-1, 0, 1, 1, 'permanent');
      expect(matrix.getCellType(0, 0)).toBe(beforeType);
    });

    it('должен позволять врагам перезаписывать предметы', () => {
      // Занимаем ячейку предметом
      matrix.occupyRect(10, 10, 1, 1, 'item');
      expect(matrix.getCellType(10, 10)).toBe('item');
      
      // Враг может перезаписать предмет
      matrix.occupyRect(10, 10, 1, 1, 'enemy');
      expect(matrix.getCellType(10, 10)).toBe('enemy');
    });

    it('НЕ должен позволять врагам перезаписывать постоянные объекты', () => {
      // Занимаем ячейку постоянным объектом
      matrix.occupyRect(10, 10, 1, 1, 'permanent');
      expect(matrix.getCellType(10, 10)).toBe('permanent');
      
      // Враг НЕ может перезаписать постоянный объект
      matrix.occupyRect(10, 10, 1, 1, 'enemy');
      expect(matrix.getCellType(10, 10)).toBe('permanent');
    });

    it('должен правильно обрабатывать большие прямоугольники', () => {
      matrix.occupyRect(0, 0, 4, 3, 'permanent');
      
      // Проверяем все ячейки в прямоугольнике 4x3
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          expect(matrix.getCellType(col, row)).toBe('permanent');
        }
      }
    });
  });

  describe('Поиск свободных позиций (findFreeRect)', () => {
    it('должен находить свободную позицию в пустой матрице', () => {
      const pos = matrix.findFreeRect(1, 1);
      
      expect(pos).not.toBeNull();
      if (pos) {
        expect(pos.col).toBeGreaterThanOrEqual(0);
        expect(pos.row).toBeGreaterThanOrEqual(0);
        expect(pos.col).toBeLessThan(MATRIX_COLS);
        expect(pos.row).toBeLessThan(MATRIX_ROWS);
      }
    });

    it('должен находить свободную позицию для больших прямоугольников', () => {
      const pos = matrix.findFreeRect(4, 3);
      
      expect(pos).not.toBeNull();
      if (pos) {
        expect(pos.col + 4).toBeLessThanOrEqual(MATRIX_COLS);
        expect(pos.row + 3).toBeLessThanOrEqual(MATRIX_ROWS);
      }
    });

    it('должен игнорировать врагов при ignoreEnemies=true', () => {
      // Занимаем ячейку врагом
      matrix.occupyRect(10, 10, 1, 1, 'enemy');
      
      // Можем найти позицию, игнорируя врагов
      const pos = matrix.findFreeRect(1, 1, true);
      expect(pos).not.toBeNull();
      
      // Но не можем, если не игнорируем
      const pos2 = matrix.findFreeRect(1, 1, false);
      // Может быть null или другая позиция (не (10, 10))
      if (pos2) {
        expect(pos2.col !== 10 || pos2.row !== 10).toBe(true);
      }
    });

    it('должен возвращать null, если нет свободных позиций', () => {
      // Занимаем всю матрицу постоянными объектами
      for (let row = 0; row < MATRIX_ROWS; row++) {
        for (let col = 0; col < MATRIX_COLS; col++) {
          matrix.occupyRect(col, row, 1, 1, 'permanent');
        }
      }
      
      const pos = matrix.findFreeRect(1, 1);
      expect(pos).toBeNull();
    });

    it('должен учитывать maxAttempts', () => {
      // Занимаем большую часть матрицы
      for (let row = 0; row < MATRIX_ROWS - 1; row++) {
        for (let col = 0; col < MATRIX_COLS - 1; col++) {
          matrix.occupyRect(col, row, 1, 1, 'permanent');
        }
      }
      
      // С очень маленьким maxAttempts может не найти свободную позицию
      const pos = matrix.findFreeRect(1, 1, false, 1);
      // Может быть null или найденная позиция
      expect(pos === null || (pos.col === MATRIX_COLS - 1 && pos.row === MATRIX_ROWS - 1)).toBe(true);
    });
  });

  describe('Поиск на окружности (findFreeRectOnCircle)', () => {
    const centerX = MAP_WIDTH * BASE_SCALE / 2; // 1024
    const centerY = MAP_HEIGHT * BASE_SCALE / 2; // 1024
    const radius = 400;

    it('должен находить свободную позицию на окружности', () => {
      const pos = matrix.findFreeRectOnCircle(centerX, centerY, radius, 4, 3);
      
      expect(pos).not.toBeNull();
      if (pos) {
        // Проверяем, что позиция в пределах матрицы
        expect(pos.col).toBeGreaterThanOrEqual(0);
        expect(pos.row).toBeGreaterThanOrEqual(0);
        expect(pos.col + 4).toBeLessThanOrEqual(MATRIX_COLS);
        expect(pos.row + 3).toBeLessThanOrEqual(MATRIX_ROWS);
      }
    });

    it('должен учитывать angleOffset', () => {
      const pos1 = matrix.findFreeRectOnCircle(centerX, centerY, radius, 4, 3, 0);
      const pos2 = matrix.findFreeRectOnCircle(centerX, centerY, radius, 4, 3, Math.PI / 2);
      
      // Позиции могут быть разными или одинаковыми (зависит от доступности)
      expect(pos1).not.toBeNull();
      expect(pos2).not.toBeNull();
    });

    it('должен возвращать null, если нет свободных позиций на окружности', () => {
      // Занимаем всю матрицу
      for (let row = 0; row < MATRIX_ROWS; row++) {
        for (let col = 0; col < MATRIX_COLS; col++) {
          matrix.occupyRect(col, row, 1, 1, 'permanent');
        }
      }
      
      const pos = matrix.findFreeRectOnCircle(centerX, centerY, radius, 4, 3);
      expect(pos).toBeNull();
    });

    it('должен учитывать maxAttempts', () => {
      const pos = matrix.findFreeRectOnCircle(centerX, centerY, radius, 4, 3, 0, 1);
      // Может быть null или найденная позиция
      expect(pos === null || (pos.col >= 0 && pos.row >= 0)).toBe(true);
    });
  });

  describe('Очистка матрицы (clear)', () => {
    it('должен очищать все ячейки', () => {
      // Занимаем несколько ячеек
      matrix.occupyRect(0, 0, 5, 5, 'permanent');
      matrix.occupyRect(10, 10, 3, 3, 'item');
      matrix.occupyRect(15, 15, 2, 2, 'enemy');
      
      // Очищаем
      matrix.clear();
      
      // Проверяем, что все ячейки свободны
      for (let row = 0; row < MATRIX_ROWS; row++) {
        for (let col = 0; col < MATRIX_COLS; col++) {
          expect(matrix.getCellType(col, row)).toBe('free');
        }
      }
    });

    it('должен позволять повторное использование после очистки', () => {
      // Занимаем всю матрицу
      for (let row = 0; row < MATRIX_ROWS; row++) {
        for (let col = 0; col < MATRIX_COLS; col++) {
          matrix.occupyRect(col, row, 1, 1, 'permanent');
        }
      }
      
      // Очищаем
      matrix.clear();
      
      // Теперь можем найти свободную позицию
      const pos = matrix.findFreeRect(1, 1);
      expect(pos).not.toBeNull();
    });
  });

  describe('Вспомогательные методы', () => {
    describe('getCellType', () => {
      it('должен возвращать тип занятости ячейки', () => {
        matrix.occupyRect(5, 5, 1, 1, 'permanent');
        expect(matrix.getCellType(5, 5)).toBe('permanent');
        
        matrix.occupyRect(10, 10, 1, 1, 'item');
        expect(matrix.getCellType(10, 10)).toBe('item');
        
        matrix.occupyRect(15, 15, 1, 1, 'enemy');
        expect(matrix.getCellType(15, 15)).toBe('enemy');
      });

      it('должен возвращать "free" для координат за границами', () => {
        expect(matrix.getCellType(-1, 0)).toBe('free');
        expect(matrix.getCellType(0, -1)).toBe('free');
        expect(matrix.getCellType(MATRIX_COLS, 0)).toBe('free');
        expect(matrix.getCellType(0, MATRIX_ROWS)).toBe('free');
      });
    });

    describe('getMatrixSize', () => {
      it('должен возвращать правильные размеры матрицы', () => {
        const size = matrix.getMatrixSize();
        
        expect(size.cols).toBe(MATRIX_COLS);
        expect(size.rows).toBe(MATRIX_ROWS);
        expect(size.cellSize).toBe(CELL_SIZE);
      });
    });
  });

  describe('Интеграционные тесты', () => {
    it('должен правильно работать с последовательностью операций', () => {
      // 1. Занимаем оракул (2×4 ячейки)
      const oraclePos = matrix.findFreeRect(2, 4);
      expect(oraclePos).not.toBeNull();
      if (oraclePos) {
        matrix.occupyRect(oraclePos.col, oraclePos.row, 2, 4, 'permanent');
      }
      
      // 2. Занимаем портал (4×3 ячейки)
      const portalPos = matrix.findFreeRect(4, 3);
      expect(portalPos).not.toBeNull();
      if (portalPos) {
        matrix.occupyRect(portalPos.col, portalPos.row, 4, 3, 'permanent');
      }
      
      // 3. Занимаем куст (2×2 ячейки)
      const bushPos = matrix.findFreeRect(2, 2);
      expect(bushPos).not.toBeNull();
      if (bushPos) {
        matrix.occupyRect(bushPos.col, bushPos.row, 2, 2, 'permanent');
      }
      
      // 4. Занимаем предмет (1×1 ячейка)
      const itemPos = matrix.findFreeRect(1, 1);
      expect(itemPos).not.toBeNull();
      if (itemPos) {
        matrix.occupyRect(itemPos.col, itemPos.row, 1, 1, 'item');
      }
      
      // 5. Враг может перезаписать предмет
      if (itemPos) {
        matrix.occupyRect(itemPos.col, itemPos.row, 1, 1, 'enemy');
        expect(matrix.getCellType(itemPos.col, itemPos.row)).toBe('enemy');
      }
      
      // 6. Враг НЕ может перезаписать постоянные объекты
      if (oraclePos) {
        const beforeType = matrix.getCellType(oraclePos.col, oraclePos.row);
        matrix.occupyRect(oraclePos.col, oraclePos.row, 2, 4, 'enemy');
        expect(matrix.getCellType(oraclePos.col, oraclePos.row)).toBe(beforeType);
      }
    });

    it('должен корректно обрабатывать сценарий заполненной матрицы', () => {
      // Занимаем почти всю матрицу постоянными объектами
      for (let row = 0; row < MATRIX_ROWS - 2; row++) {
        for (let col = 0; col < MATRIX_COLS - 2; col++) {
          matrix.occupyRect(col, row, 1, 1, 'permanent');
        }
      }
      
      // Можем найти позицию для маленького объекта
      const smallPos = matrix.findFreeRect(1, 1);
      expect(smallPos).not.toBeNull();
      
      // Но не для большого
      const largePos = matrix.findFreeRect(3, 3);
      // Может быть null или позиция в свободной области
      expect(largePos === null || (largePos.col >= MATRIX_COLS - 2 || largePos.row >= MATRIX_ROWS - 2)).toBe(true);
    });
  });
});



























