/**
 * Unit тесты для ModalPositioningHelper
 */

import { snapToGrid, snapToGridDouble, createSnappedPosition, isGridAligned } from '../../../game/ui/ModalPositioningHelper';

describe('ModalPositioningHelper', () => {

  describe('snapToGrid', () => {
    const BASE_SCALE = 4;

    it('should round down to nearest grid multiple', () => {
      expect(snapToGrid(5, BASE_SCALE)).toBe(4);
      expect(snapToGrid(3, BASE_SCALE)).toBe(4);
    });

    it('should round up to nearest grid multiple', () => {
      expect(snapToGrid(6, BASE_SCALE)).toBe(8);
      expect(snapToGrid(10, BASE_SCALE)).toBe(12);
    });

    it('should keep already-aligned values', () => {
      expect(snapToGrid(4, BASE_SCALE)).toBe(4);
      expect(snapToGrid(8, BASE_SCALE)).toBe(8);
      expect(snapToGrid(16, BASE_SCALE)).toBe(16);
    });

    it('should handle negative values', () => {
      expect(snapToGrid(-5, BASE_SCALE)).toBe(-4);
      expect(snapToGrid(-10, BASE_SCALE)).toBe(-8);
    });

    it('should handle zero', () => {
      expect(snapToGrid(0, BASE_SCALE)).toBe(0);
    });

    it('should use BASE_SCALE by default', () => {
      expect(snapToGrid(5)).toBe(4);  // 5/4=1.25 → 1*4=4
      expect(snapToGrid(10)).toBe(12); // 10/4=2.5 → 3*4=12
    });
  });

  describe('snapToGridDouble', () => {
    const BASE_SCALE = 4;

    it('should round to nearest 2*BASE_SCALE multiple (8)', () => {
      expect(snapToGridDouble(10, BASE_SCALE)).toBe(8);
      expect(snapToGridDouble(14, BASE_SCALE)).toBe(16);
      expect(snapToGridDouble(100, BASE_SCALE)).toBe(104); // 100/8=12.5 → 13*8=104
    });

    it('should keep already-aligned values', () => {
      expect(snapToGridDouble(8, BASE_SCALE)).toBe(8);
      expect(snapToGridDouble(16, BASE_SCALE)).toBe(16);
    });

    it('should handle larger values', () => {
      expect(snapToGridDouble(100, BASE_SCALE)).toBe(104); // 100/8=12.5 → 13*8=104
      expect(snapToGridDouble(200, BASE_SCALE)).toBe(200);
    });

    it('should use BASE_SCALE by default', () => {
      expect(snapToGridDouble(10)).toBe(8);
      expect(snapToGridDouble(14)).toBe(16);
    });
  });

  describe('createSnappedPosition', () => {
    const BASE_SCALE = 4;

    it('should snap all position values', () => {
      const result = createSnappedPosition(100.5, 200.3, 300.7, 400.5, BASE_SCALE);

      expect(result.x).toBe(100);   // snapToGrid(100.5) = 100
      expect(result.y).toBe(200);   // snapToGrid(200.3) = 200
      expect(result.width).toBe(304);  // snapToGridDouble(300.7) = 304
      expect(result.height).toBe(400); // snapToGridDouble(400.5) = 400
    });

    it('should return correct structure', () => {
      const result = createSnappedPosition(50, 50, 100, 100);

      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
    });
  });

  describe('isGridAligned', () => {
    const BASE_SCALE = 4;

    it('should return true for aligned values', () => {
      expect(isGridAligned(4, BASE_SCALE)).toBe(true);
      expect(isGridAligned(8, BASE_SCALE)).toBe(true);
      expect(isGridAligned(16, BASE_SCALE)).toBe(true);
    });

    it('should return false for non-aligned values', () => {
      expect(isGridAligned(5, BASE_SCALE)).toBe(false);
      expect(isGridAligned(10, BASE_SCALE)).toBe(false);
      expect(isGridAligned(15, BASE_SCALE)).toBe(false);
    });

    it('should handle zero', () => {
      expect(isGridAligned(0, BASE_SCALE)).toBe(true);
    });

    it('should handle negative values', () => {
      expect(isGridAligned(-4, BASE_SCALE)).toBe(true);
      expect(isGridAligned(-5, BASE_SCALE)).toBe(false);
    });

    it('should use BASE_SCALE by default', () => {
      expect(isGridAligned(4)).toBe(true);
      expect(isGridAligned(5)).toBe(false);
    });
  });

  describe('Integration tests', () => {
    const BASE_SCALE = 4;

    it('should maintain grid consistency across operations', () => {
      // Проверяем, что snapToGridDouble всегда даёт значение, кратное 2*BASE_SCALE
      const value = 123;
      const snapped = snapToGridDouble(value, BASE_SCALE);
      const isDouble = (snapped % (BASE_SCALE * 2)) === 0;

      expect(isDouble).toBe(true);
      expect(isGridAligned(snapped, BASE_SCALE * 2)).toBe(true);
    });

    it('should center properly with snapped dimensions', () => {
      // Для центрирования: половина snapped width тоже должна быть выровнена
      const width = 100;
      const snappedWidth = snapToGridDouble(width, BASE_SCALE);
      const halfWidth = snappedWidth / 2;

      // Половина snapToGridDouble (кратного 8) должна быть кратна 4 (BASE_SCALE)
      expect(halfWidth % BASE_SCALE).toBeCloseTo(0, 0.01);
    });
  });
});
