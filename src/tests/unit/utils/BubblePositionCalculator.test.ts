/**
 * Unit тесты для BubblePositionCalculator
 */

import { calculateBubbleY } from '../../../game/utils/BubblePositionCalculator';
import { BUBBLE_SIZES, SPRITE_SIZES, BASE_SCALE, ACTOR_SIZES } from '../../../constants/gameConstants';

describe('BubblePositionCalculator', () => {
  describe('calculateBubbleY', () => {
    describe('Oracle bubble', () => {
      it('должен вычислять Y позицию для oracle bubble с oracle sprite', () => {
        const spriteY = 500;
        const result = calculateBubbleY(spriteY, 'oracle', 'oracle');

        // Нижняя граница баббла должна совпадать с верхней границей спрайта
        expect(result).toBeLessThan(spriteY);
        expect(result).toBeGreaterThan(0);
      });

      it('должен возвращать корректное значение для oracle-oracle', () => {
        const spriteY = 400;
        const result = calculateBubbleY(spriteY, 'oracle', 'oracle');

        // Проверяем что результат вычислен корректно
        expect(typeof result).toBe('number');
        expect(isFinite(result)).toBe(true);
      });

      it('должен работать с разными Y позициями', () => {
        const yPositions = [100, 200, 300, 400, 500, 600];

        yPositions.forEach(y => {
          const result = calculateBubbleY(y, 'oracle', 'oracle');
          expect(typeof result).toBe('number');
          expect(isFinite(result)).toBe(true);
          // Баббл должен быть выше спрайта
          expect(result).toBeLessThan(y);
        });
      });
    });

    describe('Portal bubble', () => {
      it('должен вычислять Y позицию для portal bubble с portal sprite', () => {
        const spriteY = 500;
        const result = calculateBubbleY(spriteY, 'portal', 'portal');

        expect(result).toBeLessThan(spriteY);
        expect(result).toBeGreaterThan(0);
      });

      it('должен возвращать корректное значение для portal-portal', () => {
        const spriteY = 350;
        const result = calculateBubbleY(spriteY, 'portal', 'portal');

        expect(typeof result).toBe('number');
        expect(isFinite(result)).toBe(true);
      });

      it('должен работать с разными Y позициями', () => {
        const yPositions = [100, 200, 300, 400, 500, 600];

        yPositions.forEach(y => {
          const result = calculateBubbleY(y, 'portal', 'portal');
          expect(typeof result).toBe('number');
          expect(isFinite(result)).toBe(true);
          expect(result).toBeLessThan(y);
        });
      });
    });

    describe('Смешанные комбинации', () => {
      it('должен работать с oracle bubble и portal sprite', () => {
        const spriteY = 400;
        const result = calculateBubbleY(spriteY, 'oracle', 'portal');

        expect(typeof result).toBe('number');
        expect(isFinite(result)).toBe(true);
      });

      it('должен работать с portal bubble и oracle sprite', () => {
        const spriteY = 450;
        const result = calculateBubbleY(spriteY, 'portal', 'oracle');

        expect(typeof result).toBe('number');
        expect(isFinite(result)).toBe(true);
      });
    });

    describe('Краевые условия', () => {
      it('должен работать с Y=0', () => {
        const result = calculateBubbleY(0, 'oracle', 'oracle');
        expect(typeof result).toBe('number');
      });

      it('должен работать с большими Y значениями', () => {
        const result = calculateBubbleY(2000, 'portal', 'portal');
        expect(typeof result).toBe('number');
        expect(isFinite(result)).toBe(true);
      });

      it('должен работать с отрицательными Y', () => {
        const result = calculateBubbleY(-100, 'oracle', 'oracle');
        expect(typeof result).toBe('number');
        expect(isFinite(result)).toBe(true);
      });

      it('должен возвращать разные значения для разных типов спрайтов', () => {
        const spriteY = 400;
        const oracleResult = calculateBubbleY(spriteY, 'oracle', 'oracle');
        const portalResult = calculateBubbleY(spriteY, 'portal', 'portal');

        // Разные размеры спрайтов должны давать разные позиции баббла
        expect(oracleResult).not.toEqual(portalResult);
      });

      it('должен возвращать разные значения для разных типов бабблов', () => {
        const spriteY = 400;
        const oracleBubble = calculateBubbleY(spriteY, 'oracle', 'oracle');
        const portalBubble = calculateBubbleY(spriteY, 'portal', 'oracle');

        // Разные размеры бабблов должны давать разные позиции
        expect(oracleBubble).not.toEqual(portalBubble);
      });
    });

    describe('Проверка формулы', () => {
      it('должен позиционировать баббл выше спрайта', () => {
        const spriteY = 500;
        const result = calculateBubbleY(spriteY, 'oracle', 'oracle');

        // Баббл должен быть выше центра спрайта
        expect(result).toBeLessThan(spriteY);
      });

      it('должен создавать корректный отступ между спрайтом и бабблом', () => {
        const spriteY = 500;
        const bubbleY = calculateBubbleY(spriteY, 'oracle', 'oracle');

        // Отступ должен быть положительным
        const gap = spriteY - bubbleY;
        expect(gap).toBeGreaterThan(0);
      });
    });
  });

  describe('Интеграционные тесты', () => {
    it('должен корректно вычислять позицию для типичного кейса', () => {
      // Типичная позиция оркала в игре
      const oracleY = 432; // MAP_CENTER_Y
      const bubbleY = calculateBubbleY(oracleY, 'oracle', 'oracle');

      expect(typeof bubbleY).toBe('number');
      expect(isFinite(bubbleY)).toBe(true);
      expect(bubbleY).toBeLessThan(oracleY);
    });

    it('должен работать для нескольких бабблов на одной сцене', () => {
      const oracleY = 432;
      const portalY = 300;

      const oracleBubble = calculateBubbleY(oracleY, 'oracle', 'oracle');
      const portalBubble = calculateBubbleY(portalY, 'portal', 'portal');

      expect(oracleBubble).toBeLessThan(oracleY);
      expect(portalBubble).toBeLessThan(portalY);
    });
  });

  // ================================================
  // ✅ НОВЫЕ ТЕСТЫ: Константы из документации
  // ================================================
  describe('Константы размеров согласно gameConstants.ts', () => {
    it('должен иметь BUBBLE_SIZES.ORACLE с размерами 136×56', () => {
      expect(BUBBLE_SIZES.ORACLE.WIDTH).toBe(136);
      expect(BUBBLE_SIZES.ORACLE.HEIGHT).toBe(56);
      expect(BUBBLE_SIZES.ORACLE.TEXT_AREA_WIDTH).toBe(120);
      expect(BUBBLE_SIZES.ORACLE.TEXT_AREA_HEIGHT).toBe(36);
    });

    it('должен иметь BUBBLE_SIZES.PORTAL с размерами 128×36', () => {
      expect(BUBBLE_SIZES.PORTAL.WIDTH).toBe(128);
      expect(BUBBLE_SIZES.PORTAL.HEIGHT).toBe(36);
      expect(BUBBLE_SIZES.PORTAL.TEXT_AREA_WIDTH).toBe(110);
      expect(BUBBLE_SIZES.PORTAL.TEXT_AREA_HEIGHT).toBe(28);
    });

    it('должен иметь SPRITE_SIZES.ORACLE с размерами 32×56', () => {
      expect(SPRITE_SIZES.ORACLE.WIDTH).toBe(32);
      expect(SPRITE_SIZES.ORACLE.HEIGHT).toBe(56);
    });

    it('должен иметь SPRITE_SIZES.PORTAL с размерами 64×46', () => {
      expect(SPRITE_SIZES.PORTAL.WIDTH).toBe(64);
      expect(SPRITE_SIZES.PORTAL.HEIGHT).toBe(46);
    });

    it('должен иметь BASE_SCALE = 4.0', () => {
      expect(BASE_SCALE).toBe(4.0);
    });

    it('должен иметь ACTOR_SIZES.ORACLE = 1.0', () => {
      expect(ACTOR_SIZES.ORACLE).toBe(1.0);
    });

    it('должен иметь ACTOR_SIZES.QUESTION_BUBBLE = 1.0', () => {
      expect(ACTOR_SIZES.QUESTION_BUBBLE).toBe(1.0);
    });
  });

  describe('Расчёт позиции с использованием констант', () => {
    it('должен вычислять oracle bubble Y с учётом реальных размеров', () => {
      const spriteY = 500;
      const bubbleY = calculateBubbleY(spriteY, 'oracle', 'oracle');

      // Формула: bubbleY = spriteTop - (bubbleFinalHeight / 2)
      // spriteTop = spriteY - (SPRITE_SIZES.ORACLE.HEIGHT * BASE_SCALE * ACTOR_SIZES.ORACLE / 2)
      // bubbleFinalHeight = BUBBLE_SIZES.ORACLE.HEIGHT * BASE_SCALE * ACTOR_SIZES.QUESTION_BUBBLE

      const spriteFinalHeight = SPRITE_SIZES.ORACLE.HEIGHT * BASE_SCALE * ACTOR_SIZES.ORACLE; // 56 * 4 * 1 = 224
      const spriteTop = spriteY - (spriteFinalHeight / 2); // 500 - 112 = 388

      const bubbleFinalHeight = BUBBLE_SIZES.ORACLE.HEIGHT * BASE_SCALE * ACTOR_SIZES.QUESTION_BUBBLE; // 56 * 4 * 1 = 224
      const expectedBubbleY = spriteTop - (bubbleFinalHeight / 2); // 388 - 112 = 276

      expect(bubbleY).toBe(expectedBubbleY);
    });

    it('должен вычислять portal bubble Y с учётом реальных размеров', () => {
      const spriteY = 400;
      const bubbleY = calculateBubbleY(spriteY, 'portal', 'portal');

      const spriteFinalHeight = SPRITE_SIZES.PORTAL.HEIGHT * BASE_SCALE * ACTOR_SIZES.PORTAL; // 46 * 4 * 1 = 184
      const spriteTop = spriteY - (spriteFinalHeight / 2); // 400 - 92 = 308

      const bubbleFinalHeight = BUBBLE_SIZES.PORTAL.HEIGHT * BASE_SCALE * ACTOR_SIZES.QUESTION_BUBBLE; // 36 * 4 * 1 = 144
      const expectedBubbleY = spriteTop - (bubbleFinalHeight / 2); // 308 - 72 = 236

      expect(bubbleY).toBe(expectedBubbleY);
    });

    it('должен создавать правильный отступ для oracle bubble', () => {
      const spriteY = 500;
      const bubbleY = calculateBubbleY(spriteY, 'oracle', 'oracle');

      const spriteFinalHeight = SPRITE_SIZES.ORACLE.HEIGHT * BASE_SCALE * ACTOR_SIZES.ORACLE; // 224
      const bubbleFinalHeight = BUBBLE_SIZES.ORACLE.HEIGHT * BASE_SCALE * ACTOR_SIZES.QUESTION_BUBBLE; // 224
      const expectedGap = (spriteFinalHeight / 2) + (bubbleFinalHeight / 2); // 112 + 112 = 224

      const actualGap = spriteY - bubbleY;
      expect(actualGap).toBe(expectedGap);
    });

    it('должен создавать правильный отступ для portal bubble', () => {
      const spriteY = 400;
      const bubbleY = calculateBubbleY(spriteY, 'portal', 'portal');

      const spriteFinalHeight = SPRITE_SIZES.PORTAL.HEIGHT * BASE_SCALE * ACTOR_SIZES.PORTAL; // 184
      const bubbleFinalHeight = BUBBLE_SIZES.PORTAL.HEIGHT * BASE_SCALE * ACTOR_SIZES.QUESTION_BUBBLE; // 144
      const expectedGap = (spriteFinalHeight / 2) + (bubbleFinalHeight / 2); // 92 + 72 = 164

      const actualGap = spriteY - bubbleY;
      expect(actualGap).toBe(expectedGap);
    });
  });
});
