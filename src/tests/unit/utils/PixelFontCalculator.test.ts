/**
 * Unit тесты для PixelFontCalculator
 */

import { calculatePixelBaseFontSize, calculatePixelButtonFontSize } from '../../../game/utils/PixelFontCalculator';

// Мокаем Logger
jest.mock('../../../utils/Logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('PixelFontCalculator', () => {
  let mockScene: any;
  let mockTextObject: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock text object
    mockTextObject = {
      width: 100,
      height: 20,
      destroy: jest.fn()
    };

    // Mock scene
    mockScene = {
      add: {
        text: jest.fn().mockReturnValue(mockTextObject)
      }
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('calculatePixelBaseFontSize', () => {
    it('должен возвращать TARGET_PIXEL_FONT_SIZE если текст влезает', () => {
      mockTextObject.height = 18; // Меньше чем availableHeight

      const result = calculatePixelBaseFontSize(mockScene, 200, 20, 'Test');

      expect(result).toBe(18); // TARGET_PIXEL_FONT_SIZE
      expect(mockTextObject.destroy).toHaveBeenCalled();
    });

    it('должен возвращать TARGET_PIXEL_FONT_SIZE даже если текст НЕ влезает (force)', () => {
      mockTextObject.height = 50; // Больше чем availableHeight

      const result = calculatePixelBaseFontSize(mockScene, 200, 20, 'Test');

      expect(result).toBe(18); // Всё равно TARGET_PIXEL_FONT_SIZE (force)
      expect(mockTextObject.destroy).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });

    it('должен создавать временный текст с правильными параметрами', () => {
      mockTextObject.height = 18;

      calculatePixelBaseFontSize(mockScene, 200, 20, 'Test Text');

      expect(mockScene.add.text).toHaveBeenCalledWith(
        0,
        0,
        'Test Text',
        expect.objectContaining({
          fontSize: '18px',
          wordWrap: { width: 200 },
          align: 'center'
        })
      );
    });

    it('должен уничтожать временный текст после проверки', () => {
      mockTextObject.height = 18;

      calculatePixelBaseFontSize(mockScene, 200, 20, 'Test');

      expect(mockTextObject.destroy).toHaveBeenCalled();
    });

    it('должен работать с разной шириной', () => {
      mockTextObject.height = 18;

      const widths = [100, 200, 300, 400];
      widths.forEach(width => {
        const result = calculatePixelBaseFontSize(mockScene, width, 20, 'Test');
        expect(result).toBe(18);
      });
    });

    it('должен работать с разной высотой', () => {
      mockTextObject.height = 18;

      const heights = [15, 20, 25, 30];
      heights.forEach(height => {
        const result = calculatePixelBaseFontSize(mockScene, 200, height, 'Test');
        expect(result).toBe(18);
      });
    });

    it('должен работать с длинным текстом', () => {
      mockTextObject.height = 18;
      const longText = 'Это очень длинный текст для проверки того, как калькулятор справляется с большими строками';

      const result = calculatePixelBaseFontSize(mockScene, 200, 20, longText);

      expect(result).toBe(18);
    });

    it('должен работать с коротким текстом', () => {
      mockTextObject.height = 18;

      const result = calculatePixelBaseFontSize(mockScene, 200, 20, 'A');

      expect(result).toBe(18);
    });

    it('должен работать с пустым текстом', () => {
      mockTextObject.height = 5; // Пустой текст имеет маленькую высоту

      const result = calculatePixelBaseFontSize(mockScene, 200, 20, '');

      expect(result).toBe(18);
    });

    it('должен работать с текстом содержащим перенос строк', () => {
      mockTextObject.height = 18;

      const result = calculatePixelBaseFontSize(mockScene, 200, 20, 'Строка 1\nСтрока 2\nСтрока 3');

      expect(result).toBe(18);
    });
  });

  describe('calculatePixelButtonFontSize', () => {
    it('должен возвращать TARGET_PIXEL_FONT_SIZE если текст влезает по ширине и высоте', () => {
      mockTextObject.height = 36;
      mockTextObject.width = 90; // buttonWidth * 0.95 = 95

      const result = calculatePixelButtonFontSize(mockScene, 100, 40, 'Test');

      expect(result).toBe(18);
      expect(mockTextObject.destroy).toHaveBeenCalled();
    });

    it('должен возвращать TARGET_PIXEL_FONT_SIZE даже если текст НЕ влезает (force)', () => {
      mockTextObject.height = 100; // Не влезает по высоте
      mockTextObject.width = 200; // Не влезает по ширине

      const result = calculatePixelButtonFontSize(mockScene, 100, 40, 'Test');

      expect(result).toBe(18); // Всё равно TARGET_PIXEL_FONT_SIZE (force)
      expect(mockTextObject.destroy).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });

    it('должен создавать временный текст с wordWrap.width = buttonWidth * 0.9', () => {
      mockTextObject.height = 36;
      mockTextObject.width = 90;

      calculatePixelButtonFontSize(mockScene, 100, 40, 'Test');

      expect(mockScene.add.text).toHaveBeenCalledWith(
        0,
        0,
        'Test',
        expect.objectContaining({
          fontSize: '18px',
          wordWrap: { width: 90 }, // 100 * 0.9
          align: 'center'
        })
      );
    });

    it('должен уничтожать временный текст после проверки', () => {
      mockTextObject.height = 36;
      mockTextObject.width = 90;

      calculatePixelButtonFontSize(mockScene, 100, 40, 'Test');

      expect(mockTextObject.destroy).toHaveBeenCalled();
    });

    it('должен работать с разными размерами кнопок', () => {
      mockTextObject.height = 36;
      mockTextObject.width = 90;

      const sizes = [
        { width: 80, height: 35 },
        { width: 100, height: 40 },
        { width: 120, height: 45 },
        { width: 150, height: 50 }
      ];

      sizes.forEach(size => {
        const result = calculatePixelButtonFontSize(mockScene, size.width, size.height, 'Test');
        expect(result).toBe(18);
      });
    });

    it('должен работать с длинным текстом для кнопки', () => {
      mockTextObject.height = 36;
      mockTextObject.width = 90;

      const longText = 'Очень длинный текст кнопки';

      const result = calculatePixelButtonFontSize(mockScene, 100, 40, longText);

      expect(result).toBe(18);
    });

    it('должен работать с коротким текстом для кнопки', () => {
      mockTextObject.height = 36;
      mockTextObject.width = 90;

      const result = calculatePixelButtonFontSize(mockScene, 100, 40, 'OK');

      expect(result).toBe(18);
    });

    it('должен проверять что текст влезает по высоте И ширине', () => {
      mockTextObject.height = 36;
      mockTextObject.width = 95; // Ровно на границе

      const result = calculatePixelButtonFontSize(mockScene, 100, 40, 'Test');

      expect(result).toBe(18);
    });
  });

  describe('Сравнение поведения функций', () => {
    it('должен возвращать одинаковый размер для обеих функций', () => {
      mockTextObject.height = 18;
      mockTextObject.width = 90;

      const baseSize = calculatePixelBaseFontSize(mockScene, 200, 20, 'Test');
      const buttonSize = calculatePixelButtonFontSize(mockScene, 100, 40, 'Test');

      expect(baseSize).toBe(buttonSize);
      expect(baseSize).toBe(18);
    });
  });

  describe('Краевые условия', () => {
    it('должен работать с минимальной шириной', () => {
      mockTextObject.height = 18;

      const result = calculatePixelBaseFontSize(mockScene, 1, 20, 'A');

      expect(result).toBe(18);
    });

    it('должен работать с минимальной высотой', () => {
      mockTextObject.height = 1;

      const result = calculatePixelBaseFontSize(mockScene, 200, 1, 'A');

      expect(result).toBe(18);
    });

    it('должен работать с большими значениями', () => {
      mockTextObject.height = 18;

      const result = calculatePixelBaseFontSize(mockScene, 2000, 2000, 'Test');

      expect(result).toBe(18);
    });

    it('должен работать с null/undefined текстом (преобразуется в строку)', () => {
      mockTextObject.height = 18;

      const result1 = calculatePixelBaseFontSize(mockScene, 200, 20, null as any);
      const result2 = calculatePixelBaseFontSize(mockScene, 200, 20, undefined as any);

      expect(result1).toBe(18);
      expect(result2).toBe(18);
    });
  });

  describe('Интеграционные сценарии', () => {
    it('должен корректно обрабатывать текст с эмодзи', () => {
      mockTextObject.height = 18;

      const textWithEmoji = 'Текст с эмодзи 🎮🎯👾';

      const result = calculatePixelBaseFontSize(mockScene, 200, 20, textWithEmoji);

      expect(result).toBe(18);
    });

    it('должен корректно обрабатывать текст со специальными символами', () => {
      mockTextObject.height = 18;

      const textWithSpecial = 'Текст со спецсимволами: @#$%^&*()';

      const result = calculatePixelBaseFontSize(mockScene, 200, 20, textWithSpecial);

      expect(result).toBe(18);
    });

    it('должн работать для типичных текстов вопросов', () => {
      mockTextObject.height = 18;

      const questions = [
        'Какая планета известна как "Красная планета"?',
        'Какая столица Франции?',
        'Сколько ног у паука?',
        'Какое животное известно как "король джунглей"?'
      ];

      questions.forEach(question => {
        const result = calculatePixelBaseFontSize(mockScene, 200, 20, question);
        expect(result).toBe(18);
      });
    });

    it('должен работать для типичных текстов ответов', () => {
      mockTextObject.height = 36;
      mockTextObject.width = 90;

      const answers = [
        'Марс',
        'Париж',
        'Восемь',
        'Лев',
        'Кошка говорит мяу! Она маукает, мяунькает! Намяукивает!'
      ];

      answers.forEach(answer => {
        const result = calculatePixelButtonFontSize(mockScene, 100, 40, answer);
        expect(result).toBe(18);
      });
    });
  });
});
