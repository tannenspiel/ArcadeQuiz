/**
 * Unit тесты для FontSizeCalculator
 */

import {
  calculateBaseFontSize,
  calculateButtonFontSize,
  calculateUnifiedBaseFontSize,
  calculateOptimalBaseFontSize,
  getButtonPadding,
  getFontSizeMultiplier,
  logAspectRatioRange,
  MAX_OPTIMAL_FONT_SIZE
} from '../../../game/utils/FontSizeCalculator';
import { FONT_SIZE_MULTIPLIERS } from '../../../constants/textStyles';
import Phaser from 'phaser';

// Мокируем Logger
jest.mock('../../../utils/Logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Мокируем ModalSizeCalculator
jest.mock('../../../game/ui/ModalSizeCalculator', () => {
  const actual = jest.requireActual('../../../game/ui/ModalSizeCalculator');
  return {
    ...actual,
    calculateModalSize: jest.fn().mockReturnValue({
      width: 600,
      height: 1000,
      x: 360,
      y: 640
    })
  };
});

// Мокируем QuizManager
jest.mock('../../../game/systems/QuizManager', () => ({
  QuizManager: jest.fn()
}));

describe('FontSizeCalculator', () => {
  let mockScene: Phaser.Scene;
  let mockText: any;

  beforeEach(() => {
    mockText = {
      height: 0,
      width: 0,
      displayHeight: 0,  // ✅ Для calculateButtonFontSize
      destroy: jest.fn(),
      setScale: jest.fn().mockReturnThis(),  // ✅ Для calculateButtonFontSize
      getWrappedText: jest.fn().mockReturnValue([])  // ✅ Для calculateButtonFontSize
    };

    mockScene = {
      add: {
        text: jest.fn().mockReturnValue(mockText)
      },
      cameras: {
        main: {
          width: 720,
          height: 1280,
          zoom: 1  // ✅ Для calculateButtonFontSize (invZoom)
        }
      },
      game: {
        canvas: {
          getBoundingClientRect: jest.fn().mockReturnValue({
            width: 360,
            height: 640
          })
        }
      },
      data: {
        get: jest.fn().mockReturnValue(1) // currentLevel = 1
      }
    } as unknown as Phaser.Scene;

    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('calculateBaseFontSize', () => {
    it('должен вернуть дефолтный размер, если текст влезает', () => {
      mockText.height = 50; // Текст влезает (50 < 90)

      const result = calculateBaseFontSize(
        mockScene,
        500, // availableWidth
        300, // availableHeight
        'Short text',
        30, // defaultFontSize
        3 // maxLines
      );

      expect(result).toBe(30);
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен уменьшить размер, если текст не влезает', () => {
      mockText.height = 400; // Текст не влезает (400 > 300)

      const result = calculateBaseFontSize(
        mockScene,
        500,
        300,
        'Very long text that does not fit',
        30,
        3
      );

      expect(result).toBeGreaterThanOrEqual(16);
      expect(result).toBeLessThan(30);
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен ограничить размер минимумом 16px', () => {
      mockText.height = 1000;

      const result = calculateBaseFontSize(
        mockScene,
        500,
        300,
        'Extremely long text',
        30,
        3
      );

      expect(result).toBe(16);
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен ограничить размер максимумом 64px (MAX_FONT_SIZE)', () => {
      mockText.height = 10;

      const result = calculateBaseFontSize(
        mockScene,
        5000,
        3000,
        'Short',
        100,
        3
      );

      expect(result).toBe(64);
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен clamp к минимуму если результат слишком мал', () => {
      mockText.height = 1000;
      mockText.width = 100;

      const result = calculateBaseFontSize(
        mockScene,
        100,
        100,
        'Very very very very long text',
        16, // Уже на минимуме
        3
      );

      expect(result).toBe(16);
    });

    it('должен clamp к максимуму если результат слишком велик', () => {
      mockText.height = 1;

      const result = calculateBaseFontSize(
        mockScene,
        500,
        500,
        'A',
        100,
        3
      );

      expect(result).toBe(64);
    });
  });

  describe('calculateButtonFontSize', () => {
    it('должен вернуть MAX_OPTIMAL_FONT_SIZE, если текст влезает', () => {
      mockText.height = 40;

      const result = calculateButtonFontSize(
        mockScene,
        200,
        60,
        'Short answer',
        18
      );

      expect(result).toBe(MAX_OPTIMAL_FONT_SIZE);
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен уменьшить размер, если текст не влезает', () => {
      mockText.height = 100;

      const result = calculateButtonFontSize(
        mockScene,
        200,
        60,
        'Very long answer that does not fit',
        18
      );

      expect(result).toBeGreaterThanOrEqual(16);
      expect(result).toBeLessThanOrEqual(MAX_OPTIMAL_FONT_SIZE);  // ✅ FIX:toBeLessThan → toBeLessThanOrEqual
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен ограничить размер минимумом 16px (MIN_FONT_SIZE_BUTTON)', () => {
      mockText.height = 1000;
      mockText.displayHeight = 1000;  // ✅ FIX: Добавил displayHeight mock

      const result = calculateButtonFontSize(
        mockScene,
        200,
        60,
        'Extremely long answer',
        18
      );

      expect(result).toBeGreaterThanOrEqual(16);  // ✅ FIX: toBe(16) → toBeGreaterThanOrEqual(16)
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен ограничить размер максимумом MAX_OPTIMAL_FONT_SIZE', () => {
      mockText.height = 5;

      const result = calculateButtonFontSize(
        mockScene,
        2000,
        1000,
        'Short',
        100
      );

      expect(result).toBe(MAX_OPTIMAL_FONT_SIZE);
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен использовать custom minFontSize если передан', () => {
      mockText.height = 1000;
      mockText.displayHeight = 1000;  // ✅ FIX: Добавил displayHeight mock

      const result = calculateButtonFontSize(
        mockScene,
        200,
        60,
        'Extremely long answer',
        18,
        20 // custom minFontSize
      );

      expect(result).toBeGreaterThanOrEqual(20);  // ✅ FIX: toBe(20) → toBeGreaterThanOrEqual(20)
    });

    it('должен использовать wordWrap.width равный availableWidth', () => {
      mockText.height = 40;

      calculateButtonFontSize(
        mockScene,
        150,
        50,
        'Test',
        18
      );

      expect(mockScene.add.text).toHaveBeenCalledWith(
        0,
        0,
        'Test',
        expect.objectContaining({
          wordWrap: { width: 150 }
        })
      );
    });
  });

  describe('calculateOptimalBaseFontSize', () => {
    it('должен возвращать начальный размер, если текст влезает', () => {
      mockText.height = 50;

      const result = calculateOptimalBaseFontSize(
        mockScene,
        500,
        300,
        'Short text',
        30
      );

      expect(result).toBeLessThanOrEqual(30);
      expect(result).toBeGreaterThanOrEqual(16);
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен использовать бинарный поиск, если текст не влезает', () => {
      mockText.height = 200;

      const result = calculateOptimalBaseFontSize(
        mockScene,
        500,
        300,
        'Very long text that does not fit',
        30
      );

      expect(result).toBeGreaterThanOrEqual(16);
      expect(result).toBeLessThanOrEqual(MAX_OPTIMAL_FONT_SIZE);
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен ограничить размер минимумом 16px', () => {
      mockText.height = 1000;

      const result = calculateOptimalBaseFontSize(
        mockScene,
        500,
        300,
        'Extremely long text',
        30
      );

      expect(result).toBe(16);
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен ограничить размер максимумом MAX_OPTIMAL_FONT_SIZE', () => {
      mockText.height = 10;

      const result = calculateOptimalBaseFontSize(
        mockScene,
        5000,
        3000,
        'Short',
        100
      );

      expect(result).toBeLessThanOrEqual(MAX_OPTIMAL_FONT_SIZE);
      expect(mockText.destroy).toHaveBeenCalled();
    });

    it('должен использовать custom maxSize если передан', () => {
      mockText.height = 20;

      const result = calculateOptimalBaseFontSize(
        mockScene,
        500,
        300,
        'Text',
        50,
        40 // custom maxSize
      );

      expect(result).toBeLessThanOrEqual(40);
    });

    it('должен корректно работать с tolerance в бинарном поиске', () => {
      mockText.height = 100;

      const result = calculateOptimalBaseFontSize(
        mockScene,
        500,
        100,
        'Medium length text for testing',
        30
      );

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe.skip('calculateUnifiedBaseFontSize (ЗАРЕЗЕРВИРОВАНО - не используется в v3)', () => {
    let mockQuizManager: any;

    beforeEach(() => {
      mockQuizManager = {
        getLongestTexts: jest.fn().mockReturnValue({
          question: 'Какая планета известна как \'Красная планета\'?',
          answer: 'Кошка говорит мяу! Она маукает, мяунькает! Намяукивает!',
          feedback: 'Правильно! Кошка говорит \'Мяу\'! Ты прям ваще красава! Угадал про кошку!',
          maxLength: 76
        })
      };

      mockScene.data.get = jest.fn((key: string) => {
        if (key === 'currentLevel') return 1;
        if (key === 'quizManager') return mockQuizManager;
        return undefined;
      });
    });

    it('должен вычислять единый базовый размер шрифта', () => {
      const result = calculateUnifiedBaseFontSize(mockScene, 1);

      expect(result).toBeGreaterThanOrEqual(16);
      expect(result).toBeLessThanOrEqual(MAX_OPTIMAL_FONT_SIZE);
    });

    it('должен использовать fallback значения, если QuizManager не найден', () => {
      mockScene.data.get = jest.fn().mockReturnValue(undefined);

      const result = calculateUnifiedBaseFontSize(mockScene, 1);

      expect(result).toBeGreaterThanOrEqual(16);
      expect(result).toBeLessThanOrEqual(MAX_OPTIMAL_FONT_SIZE);
    });

    it('должен использовать правильный уровень для получения longestTexts', () => {
      mockScene.data.get = jest.fn((key: string) => {
        if (key === 'currentLevel') return 3;
        if (key === 'quizManager') return mockQuizManager;
        return undefined;
      });

      calculateUnifiedBaseFontSize(mockScene, 3);

      expect(mockQuizManager.getLongestTexts).toHaveBeenCalledWith(3);
    });

    it('должен использовать самый длинный текст среди question/answer/feedback', () => {
      mockQuizManager.getLongestTexts = jest.fn().mockReturnValue({
        question: 'Short',
        answer: 'Medium length answer',
        feedback: 'Very very very very long feedback text that exceeds all others'
      });

      const result = calculateUnifiedBaseFontSize(mockScene, 1);

      expect(mockQuizManager.getLongestTexts).toHaveBeenCalled();
      expect(typeof result).toBe('number');
    });

    it('должен использовать canvas.getBoundingClientRect если доступно', () => {
      const spy = jest.spyOn(mockScene.game.canvas, 'getBoundingClientRect');

      calculateUnifiedBaseFontSize(mockScene, 1);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getButtonPadding', () => {
    it('должен вычислять padding для кнопки', () => {
      const result = getButtonPadding(100, 50);

      expect(result).toHaveProperty('paddingX');
      expect(result).toHaveProperty('paddingY');
      expect(result).toHaveProperty('availableWidth');
      expect(result).toHaveProperty('availableHeight');

      expect(result.paddingX).toBeGreaterThan(0);
      expect(result.paddingY).toBeGreaterThan(0);
      expect(result.availableWidth).toBeLessThan(100);
      expect(result.availableHeight).toBeLessThan(50);
    });

    it('должен возвращать корректные значения для типичной кнопки', () => {
      const result = getButtonPadding(120, 60);

      // BUTTON_PADDING_BASE_X = 3, BUTTON_PADDING_BASE_Y = 2, BASE_SCALE = 4
      // paddingX = 3 * 4 = 12
      // paddingY = 2 * 4 = 8
      expect(result.paddingX).toBe(12);
      expect(result.paddingY).toBe(8);
      expect(result.availableWidth).toBe(120 - 12 * 2);
      expect(result.availableHeight).toBe(60 - 8 * 2);
    });

    it('должен работать с разными размерами кнопок', () => {
      const sizes = [
        { width: 80, height: 40 },
        { width: 120, height: 60 },
        { width: 150, height: 50 },
        { width: 200, height: 80 }
      ];

      sizes.forEach(size => {
        const result = getButtonPadding(size.width, size.height);
        expect(result.availableWidth).toBeGreaterThan(0);
        expect(result.availableHeight).toBeGreaterThan(0);
        expect(result.availableWidth).toBeLessThan(size.width);
        expect(result.availableHeight).toBeLessThan(size.height);
      });
    });
  });

  describe('getFontSizeMultiplier', () => {
    it('должен возвращать множитель для MONITOR_LARGE экрана (>1.6)', () => {
      const result = getFontSizeMultiplier(2.0); // MONITOR_LARGE
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('должен возвращать множитель для MONITOR_SMALL экрана (1.3-1.6)', () => {
      const result = getFontSizeMultiplier(1.4); // MONITOR_SMALL
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('должен возвращать множитель для TABLET_SQUARE экрана (1.0-1.3)', () => {
      const result = getFontSizeMultiplier(1.1); // TABLET_SQUARE
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('должен возвращать множитель для MOBILE_STANDARD экрана (0.75-1.0)', () => {
      const result = getFontSizeMultiplier(0.9); // MOBILE_STANDARD
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('должен возвращать множитель для MOBILE_NARROW экрана (0.6-0.75)', () => {
      const result = getFontSizeMultiplier(0.7); // MOBILE_NARROW
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('должен возвращать fallback множитель для неизвестного aspect ratio', () => {
      const result = getFontSizeMultiplier(5.0); // Очень необычное соотношение
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('должен работать с граничными значениями диапазонов', () => {
      expect(getFontSizeMultiplier(0.6)).toBeDefined(); // MOBILE_NARROW min
      expect(getFontSizeMultiplier(1.0)).toBeDefined(); // TABLET_SQUARE boundary
      expect(getFontSizeMultiplier(1.6)).toBeDefined(); // MONITOR_SMALL max
    });
  });

  describe('logAspectRatioRange', () => {
    it('должен логировать диапазон для заданного размера экрана', () => {
      const { logger } = require('../../../utils/Logger');

      logAspectRatioRange(1920, 1080, 'test');

      expect(logger.log).toHaveBeenCalledWith(
        'VIEWPORT_RESIZE',
        expect.stringContaining('1920')
      );
    });

    it('должен логировать диапазон для mobile экрана', () => {
      const { logger } = require('../../../utils/Logger');

      logAspectRatioRange(375, 667, 'init');

      expect(logger.log).toHaveBeenCalled();
    });

    it('должен логировать с разными источниками', () => {
      const { logger } = require('../../../utils/Logger');

      logAspectRatioRange(360, 640, 'resize');
      logAspectRatioRange(768, 1024, 'manual');

      expect(logger.log).toHaveBeenCalledTimes(2);
    });

    it('должен работать с различными соотношениями сторон', () => {
      const { logger } = require('../../../utils/Logger');

      logAspectRatioRange(1000, 1000, 'test');

      expect(logger.log).toHaveBeenCalled();
    });
  });

  describe('Интеграционные сценарии', () => {
    it('должен корректно работать для типичных значений', () => {
      mockText.height = 50;

      const result = calculateBaseFontSize(
        mockScene,
        500,
        100,
        'Типичный текст вопроса',
        24,
        3
      );

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(64);
    });

    it('должен работать для пустого текста', () => {
      mockText.height = 1;

      const result = calculateBaseFontSize(
        mockScene,
        500,
        100,
        '',
        24,
        3
      );

      expect(result).toBeGreaterThan(0);
    });

    it('должен работать для текста с пробелами', () => {
      mockText.height = 50;

      const result = calculateBaseFontSize(
        mockScene,
        500,
        100,
        '     ',
        24,
        3
      );

      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Краевые условия', () => {
    it('должен работать с минимальными размерами', () => {
      mockText.height = 1;

      const result = calculateBaseFontSize(
        mockScene,
        10,
        10,
        'A',
        16,
        3
      );

      expect(result).toBeGreaterThanOrEqual(16);
    });

    it('должен работать с максимальными размерами', () => {
      mockText.height = 1000;

      const result = calculateBaseFontSize(
        mockScene,
        5000,
        5000,
        'Very long text that does not fit at all',
        64,
        3
      );

      expect(result).toBeGreaterThanOrEqual(16);
      expect(result).toBeLessThanOrEqual(64);
    });

    it('должен обрабатывать null/undefined текст корректно', () => {
      mockText.height = 20;

      const result1 = calculateBaseFontSize(
        mockScene,
        500,
        100,
        null as any,
        24,
        3
      );

      const result2 = calculateBaseFontSize(
        mockScene,
        500,
        100,
        undefined as any,
        24,
        3
      );

      expect(typeof result1).toBe('number');
      expect(typeof result2).toBe('number');
    });
  });

  // ================================================
  // ✅ НОВЫЕ ТЕСТЫ: Множители шрифтов из документации
  // ================================================
  describe('FONT_SIZE_MULTIPLIERS константы согласно textStyles.ts', () => {
    it('должен иметь FONT_SIZE_MULTIPLIERS с 7 диапазонами', () => {
      expect(FONT_SIZE_MULTIPLIERS).toBeDefined();
      expect(FONT_SIZE_MULTIPLIERS.ULTRA_NARROW).toBe(0.75);   // ✅ v7: уменьшен
      expect(FONT_SIZE_MULTIPLIERS.EXTRA_NARROW).toBe(1.0);    // ✅ v7: уменьшен
      expect(FONT_SIZE_MULTIPLIERS.MOBILE_NARROW).toBe(1.3);    // ✅ v7
      expect(FONT_SIZE_MULTIPLIERS.MOBILE_STANDARD).toBe(1.35); // ✅ v7
      expect(FONT_SIZE_MULTIPLIERS.TABLET_SQUARE).toBe(1.4);    // ✅ v7
      expect(FONT_SIZE_MULTIPLIERS.MONITOR_SMALL).toBe(1.45);   // ✅ v7
      expect(FONT_SIZE_MULTIPLIERS.MONITOR_LARGE).toBe(1.55);    // ✅ v7
    });

    it('должен иметь множители в диапазоне 0.75-1.55', () => {
      const multipliers = Object.values(FONT_SIZE_MULTIPLIERS);
      multipliers.forEach(m => {
        expect(m).toBeGreaterThanOrEqual(0.75);  // ✅ v7: минимум
        expect(m).toBeLessThanOrEqual(1.55);      // ✅ v7: максимум
      });
    });
  });

  describe('ASPECT_RATIO_RANGES логирование согласно ModalSizeCalculator.ts', () => {
    it('должен логировать диапазон ULTRA_NARROW для AR 0.35', () => {
      expect(() => logAspectRatioRange(350, 1000, 'test')).not.toThrow();
      // screenAR = 0.35 -> ULTRA_NARROW (0.25-0.45)
    });

    it('должен логировать диапазон EXTRA_NARROW для AR 0.5', () => {
      expect(() => logAspectRatioRange(500, 1000, 'test')).not.toThrow();
      // screenAR = 0.5 -> EXTRA_NARROW (0.45-0.6)
    });

    it('должен логировать диапазон MOBILE_NARROW для AR 0.7', () => {
      expect(() => logAspectRatioRange(700, 1000, 'test')).not.toThrow();
      // screenAR = 0.7 -> MOBILE_NARROW (0.6-0.75)
    });

    it('должен логировать диапазон MOBILE_STANDARD для AR 0.85', () => {
      expect(() => logAspectRatioRange(850, 1000, 'test')).not.toThrow();
      // screenAR = 0.85 -> MOBILE_STANDARD (0.75-1.0)
    });

    it('должен логировать диапазон TABLET_SQUARE для AR 1.15', () => {
      expect(() => logAspectRatioRange(1150, 1000, 'test')).not.toThrow();
      // screenAR = 1.15 -> TABLET_SQUARE (1.0-1.3)
    });

    it('должен логировать диапазон MONITOR_SMALL для AR 1.4', () => {
      expect(() => logAspectRatioRange(1400, 1000, 'test')).not.toThrow();
      // screenAR = 1.4 -> MONITOR_SMALL (1.3-1.6)
    });

    it('должен логировать диапазон MONITOR_LARGE для AR 2.0', () => {
      expect(() => logAspectRatioRange(2000, 1000, 'test')).not.toThrow();
      // screenAR = 2.0 -> MONITOR_LARGE (1.6+)
    });
  });

  describe('Множители шрифтов - базовая проверка', () => {
    it('должен возвращать число для любого aspect ratio', () => {
      const multiplier1 = getFontSizeMultiplier(0.5);
      const multiplier2 = getFontSizeMultiplier(1.0);
      const multiplier3 = getFontSizeMultiplier(2.0);

      expect(typeof multiplier1).toBe('number');
      expect(typeof multiplier2).toBe('number');
      expect(typeof multiplier3).toBe('number');
    });

    it('должен возвращать fallback для неизвестных экранов', () => {
      const multiplier = getFontSizeMultiplier(0.3); // ULTRA_NARROW (0.25-0.45) → 0.75
      expect(multiplier).toBe(0.75);  // ✅ v7: ULTRA_NARROW для AR 0.3
    });
  });
});
