/**
 * Unit tests for v3 Tiered Font System
 * Тесты для системы бинарного поиска размера шрифта
 */

import {
  calculateTieredFontSizeSimple,
  simulateWordWrapLines,
  calculatePortalTieredFontSize,
  calculateGameOverTieredFontSize,
  MAX_OPTIMAL_FONT_SIZE,
  MIN_FONT_SIZE_BUTTON,
  CHAR_WIDTH_RATIO_SANS,
  CHAR_WIDTH_RATIO_MONO,
  LINE_HEIGHT_RATIO
} from '../../../game/utils/FontSizeCalculator';

describe('v3 Tiered Font System', () => {

  describe('simulateWordWrapLines', () => {
    it('should count lines correctly for short text', () => {
      const text = 'Короткий текст';
      const charsPerLine = 20;

      const lines = simulateWordWrapLines(text, charsPerLine);

      expect(lines).toBe(1); // Всё влезает в одну строку
    });

    it('should count lines correctly for long text', () => {
      const text = 'Очень длинный текст который не помещается в одну строку';
      const charsPerLine = 15;

      const lines = simulateWordWrapLines(text, charsPerLine);

      expect(lines).toBeGreaterThan(1); // Будет перенос на несколько строк
    });

    it('should handle word wrap correctly (long word)', () => {
      // "Длинноеслово" = 12 символов, charsPerLine = 10
      // Слово должно перенестись полностью на новую строку
      const text = 'Тест Длинноеслово здесь';
      const charsPerLine = 10;

      const lines = simulateWordWrapLines(text, charsPerLine);

      // "Тест" (4) + пробел (1) = 5, остаток = 5
      // "Длинноеслово" (12) > 5 → перенос
      // Строка 1: "Тест" (5 символов с пробелом)
      // Строка 2: "Длинноеслово" (12 символов)
      // Строка 3: "здесь" (5 символов)
      expect(lines).toBe(3);
    });

    it('should handle empty text', () => {
      const lines = simulateWordWrapLines('', 10);
      expect(lines).toBe(1); // Минимум 1 строка
    });

    it('should handle single long word', () => {
      const text = 'Длинноеслово';
      const charsPerLine = 5;

      const lines = simulateWordWrapLines(text, charsPerLine);

      // Слово длинее charsPerLine, но целиком на одной строке
      expect(lines).toBe(1);
    });
  });

  describe('calculateTieredFontSizeSimple', () => {
    const defaultText = 'Тестовый текст для проверки размера шрифта';

    it('should return font size that fits in field', () => {
      const fieldWidth = 200;
      const fieldHeight = 50;

      const fontSize = calculateTieredFontSizeSimple(
        fieldWidth,
        fieldHeight,
        defaultText,
        CHAR_WIDTH_RATIO_SANS
      );

      expect(fontSize).toBeGreaterThanOrEqual(MIN_FONT_SIZE_BUTTON);
      expect(fontSize).toBeLessThanOrEqual(MAX_OPTIMAL_FONT_SIZE);
    });

    it('should return smaller font for narrow field', () => {
      const narrowWidth = 100;
      const normalWidth = 300;
      const fieldHeight = 50;

      const narrowFontSize = calculateTieredFontSizeSimple(
        narrowWidth,
        fieldHeight,
        defaultText,
        CHAR_WIDTH_RATIO_SANS
      );

      const normalFontSize = calculateTieredFontSizeSimple(
        normalWidth,
        fieldHeight,
        defaultText,
        CHAR_WIDTH_RATIO_SANS
      );

      // Узкое поле → меньше шрифт
      expect(narrowFontSize).toBeLessThanOrEqual(normalFontSize);
    });

    it('should return smaller font for short field', () => {
      const shortHeight = 30;
      const normalHeight = 80;
      const fieldWidth = 200;

      const shortFontSize = calculateTieredFontSizeSimple(
        fieldWidth,
        shortHeight,
        defaultText,
        CHAR_WIDTH_RATIO_SANS
      );

      const normalFontSize = calculateTieredFontSizeSimple(
        fieldWidth,
        normalHeight,
        defaultText,
        CHAR_WIDTH_RATIO_SANS
      );

      // Низкое поле → меньше шрифт
      expect(shortFontSize).toBeLessThanOrEqual(normalFontSize);
    });

    it('should use CHAR_WIDTH_RATIO_MONO correctly', () => {
      const fieldWidth = 200;
      const fieldHeight = 50;

      const sansFontSize = calculateTieredFontSizeSimple(
        fieldWidth,
        fieldHeight,
        defaultText,
        CHAR_WIDTH_RATIO_SANS  // 0.45
      );

      const monoFontSize = calculateTieredFontSizeSimple(
        fieldWidth,
        fieldHeight,
        defaultText,
        CHAR_WIDTH_RATIO_MONO  // 0.50
      );

      // Monospace символы шире → больше строк → меньше шрифт
      expect(monoFontSize).toBeLessThanOrEqual(sansFontSize);
    });

    it('should limit by MAX_OPTIMAL_FONT_SIZE for very large field', () => {
      const hugeField = {
        width: 2000,
        height: 1000
      };
      const shortText = 'A';

      const fontSize = calculateTieredFontSizeSimple(
        hugeField.width,
        hugeField.height,
        shortText,
        CHAR_WIDTH_RATIO_SANS
      );

      // Даже для огромного поля шрифт ограничен MAX_OPTIMAL_FONT_SIZE
      expect(fontSize).toBeLessThanOrEqual(MAX_OPTIMAL_FONT_SIZE);
    });

    it('should return MIN_FONT_SIZE_BUTTON for very small field', () => {
      const tinyField = {
        width: 10,
        height: 5
      };
      const longText = 'Очень длинный текст который точно не влезет в такое маленькое поле';

      const fontSize = calculateTieredFontSizeSimple(
        tinyField.width,
        tinyField.height,
        longText,
        CHAR_WIDTH_RATIO_SANS
      );

      // Для крошечного поля шрифт должен быть минимальным
      expect(fontSize).toBe(MIN_FONT_SIZE_BUTTON);
    });

    it('should respect custom maxSize parameter', () => {
      const fieldWidth = 500;
      const fieldHeight = 200;
      const shortText = 'A';
      const customMax = 24; // Меньше чем MAX_OPTIMAL_FONT_SIZE

      const fontSize = calculateTieredFontSizeSimple(
        fieldWidth,
        fieldHeight,
        shortText,
        CHAR_WIDTH_RATIO_SANS,
        customMax
      );

      // Шрифт должен быть ограничен customMax
      expect(fontSize).toBeLessThanOrEqual(customMax);
    });
  });

  describe('calculatePortalTieredFontSize', () => {
    it('should use PORTAL_MODAL_MAX_FONT_SIZE limit', () => {
      const fieldWidth = 500;
      const fieldHeight = 200;
      const shortText = 'A';

      const fontSize = calculatePortalTieredFontSize(
        fieldWidth,
        fieldHeight,
        shortText,
        CHAR_WIDTH_RATIO_SANS
      );

      // Должен быть ограничен PORTAL_MODAL_MAX_FONT_SIZE (42)
      expect(fontSize).toBeLessThanOrEqual(42);
    });
  });

  describe('calculateGameOverTieredFontSize', () => {
    it('should use GAMEOVER_MODAL_MAX_FONT_SIZE limit', () => {
      const fieldWidth = 500;
      const fieldHeight = 200;
      const shortText = 'Game Over';

      const fontSize = calculateGameOverTieredFontSize(
        fieldWidth,
        fieldHeight,
        shortText,
        CHAR_WIDTH_RATIO_SANS
      );

      // Должен быть ограничен GAMEOVER_MODAL_MAX_FONT_SIZE (42)
      expect(fontSize).toBeLessThanOrEqual(42);
    });
  });

  describe('Constants', () => {
    it('should have MAX_OPTIMAL_FONT_SIZE = 48', () => {
      expect(MAX_OPTIMAL_FONT_SIZE).toBe(48);
    });

    it('should have MIN_FONT_SIZE_BUTTON = 10', () => {
      expect(MIN_FONT_SIZE_BUTTON).toBe(10);
    });

    it('should have CHAR_WIDTH_RATIO_SANS = 0.45', () => {
      expect(CHAR_WIDTH_RATIO_SANS).toBe(0.45);
    });

    it('should have CHAR_WIDTH_RATIO_MONO = 0.50', () => {
      expect(CHAR_WIDTH_RATIO_MONO).toBe(0.50);
    });

    it('should have LINE_HEIGHT_RATIO = 1.55', () => {
      expect(LINE_HEIGHT_RATIO).toBe(1.55);
    });
  });

  describe('Integration tests', () => {
    it('should calculate different font sizes for different texts', () => {
      const fieldWidth = 200;
      const fieldHeight = 50;

      const shortText = 'А';
      const longText = 'Это очень длинный текст который занимает много места';

      const shortFontSize = calculateTieredFontSizeSimple(
        fieldWidth,
        fieldHeight,
        shortText,
        CHAR_WIDTH_RATIO_SANS
      );

      const longFontSize = calculateTieredFontSizeSimple(
        fieldWidth,
        fieldHeight,
        longText,
        CHAR_WIDTH_RATIO_SANS
      );

      // Для короткого текста шрифт должен быть больше
      expect(shortFontSize).toBeGreaterThan(longFontSize);
    });

    it('should work correctly with Russian text', () => {
      const fieldWidth = 200;
      const fieldHeight = 50;
      const russianText = 'Русский текст для проверки';

      const fontSize = calculateTieredFontSizeSimple(
        fieldWidth,
        fieldHeight,
        russianText,
        CHAR_WIDTH_RATIO_SANS
      );

      expect(fontSize).toBeGreaterThan(0);
      expect(fontSize).toBeLessThanOrEqual(MAX_OPTIMAL_FONT_SIZE);
    });

    it('should work correctly with mixed text', () => {
      const fieldWidth = 200;
      const fieldHeight = 50;
      const mixedText = 'Текст123 with symbols! @#$%';

      const fontSize = calculateTieredFontSizeSimple(
        fieldWidth,
        fieldHeight,
        mixedText,
        CHAR_WIDTH_RATIO_SANS
      );

      expect(fontSize).toBeGreaterThan(0);
      expect(fontSize).toBeLessThanOrEqual(MAX_OPTIMAL_FONT_SIZE);
    });
  });
});
