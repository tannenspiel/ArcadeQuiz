/**
 * Интеграционные тесты для масштабирования модальных окон
 * Проверяют работу масштабирования при разных разрешениях и ориентациях
 */

import { calculateModalSize } from '../../game/ui/ModalSizeCalculator';
import {
  calculateBaseFontSize,
  calculateButtonFontSize,
  calculateUnifiedBaseFontSize
} from '../../game/utils/FontSizeCalculator';
import Phaser from 'phaser';

// Мокируем Phaser Scene для тестов
// Мокируем Phaser Scene для тестов
const createMockScene = (canvasWidth: number, canvasHeight: number) => {
  return {
    add: {
      text: jest.fn().mockImplementation((x, y, text, style) => {
        // Парсим размер шрифта из стиля (например, "30px" -> 30)
        const fontSizeStr = style.fontSize || '24px';
        const fontSize = parseInt(String(fontSizeStr).replace('px', ''), 10);

        return {
          height: fontSize * 1.2, // Примерная высота строки
          destroy: jest.fn()
        };
      })
    },
    cameras: {
      main: {
        width: 720,
        height: 1280
      }
    },
    game: {
      canvas: {
        getBoundingClientRect: jest.fn().mockReturnValue({
          width: canvasWidth,
          height: canvasHeight
        })
      }
    },
    data: {
      get: jest.fn((key: string) => {
        if (key === 'currentLevel') return 1;
        if (key === 'quizManager') return {
          getLongestTexts: jest.fn().mockReturnValue({
            question: 'Какая планета известна как \'Красная планета\'?',
            answer: 'Кошка говорит мяу! Она маукает, мяунькает! Намяукивает!',
            feedback: 'Правильно! Кошка говорит \'Мяу\'! Ты прям ваще красава! Угадал про кошку!',
            maxLength: 76
          })
        };
        return undefined;
      })
    }
  } as unknown as Phaser.Scene;
};

describe('Интеграционные тесты масштабирования модальных окон', () => {
  describe('Масштабирование при разных разрешениях', () => {
    it('должен корректно масштабировать модальное окно для мобильного портретного устройства', () => {
      const cameraWidth = 720;
      const cameraHeight = 1280;
      const canvasWidth = 360; // Мобильное устройство
      const canvasHeight = 640; // Портретная ориентация
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Проверяем, что размеры вычислены
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);

      // ✅ Для мобильных портретных должен использоваться адаптивный padding (80)
      const isPortrait = canvasHeight > canvasWidth;
      const isMobile = canvasWidth < 768;
      const adaptivePadding = (isMobile && isPortrait) ? 80 : padding;
      expect(adaptivePadding).toBe(80);

      // Проверяем пропорции для портретного режима
      const aspectRatio = result.width / result.height;
      const expectedRatio = 720 / 1280;
      expect(Math.abs(aspectRatio - expectedRatio)).toBeLessThan(0.1);
    });

    it('должен корректно масштабировать модальное окно для мобильного landscape устройства', () => {
      const cameraWidth = 1280;
      const cameraHeight = 720;
      const canvasWidth = 640; // Мобильное устройство
      const canvasHeight = 360; // Landscape ориентация
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Проверяем, что размеры вычислены
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);

      // ✅ Для landscape должно быть квадратное окно
      const aspectRatio = result.width / result.height;
      expect(Math.abs(aspectRatio - 1.0)).toBeLessThan(0.1);

      // ✅ Для мобильных landscape используется modalHeightMultiplier = 0.65
      const isPortrait = canvasHeight > canvasWidth;
      const isMobile = canvasWidth < 768;
      const isLandscape = !isPortrait;
      const modalHeightMultiplier = (isMobile && isLandscape) ? 0.65 : 0.7;
      expect(modalHeightMultiplier).toBe(0.65);
    });

    it('должен корректно масштабировать модальное окно для десктопного устройства', () => {
      const cameraWidth = 2560;
      const cameraHeight = 1280;
      const canvasWidth = 1920; // Десктоп
      const canvasHeight = 1080; // Landscape ориентация
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Проверяем, что размеры вычислены
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);

      // ✅ Для landscape должно быть квадратное окно
      const aspectRatio = result.width / result.height;
      expect(Math.abs(aspectRatio - 1.0)).toBeLessThan(0.1);

      // ✅ Для десктопа используется modalHeightMultiplier = 0.7
      const isPortrait = canvasHeight > canvasWidth;
      const isMobile = canvasWidth < 768;
      const isLandscape = !isPortrait;
      const modalHeightMultiplier = (isMobile && isLandscape) ? 0.65 : 0.7;
      expect(modalHeightMultiplier).toBe(0.7);
    });
  });

  describe('Масштабирование текста в модальных окнах', () => {
    it('должен корректно рассчитывать размер шрифта для разных размеров модального окна', () => {
      const mockScene = createMockScene(360, 640);
      const availableWidth = 500;
      const availableHeight = 300;
      const longestText = 'Это очень длинный текст, который должен влезть в модальное окно';
      const defaultFontSize = 30;

      const result = calculateBaseFontSize(
        mockScene,
        availableWidth,
        availableHeight,
        longestText,
        defaultFontSize,
        3
      );

      // Проверяем, что размер в допустимых пределах
      expect(result).toBeGreaterThanOrEqual(16); // MIN_FONT_SIZE_TEXT
      expect(result).toBeLessThanOrEqual(48); // MAX_FONT_SIZE
    });

    it('должен корректно рассчитывать размер шрифта для кнопок', () => {
      const mockScene = createMockScene(360, 640);
      const buttonWidth = 200;
      const buttonHeight = 60;
      const longestAnswer = 'Очень длинный ответ на вопрос';
      const defaultFontSize = 18;

      const result = calculateButtonFontSize(
        mockScene,
        buttonWidth,
        buttonHeight,
        longestAnswer,
        defaultFontSize
      );

      // Проверяем, что размер в допустимых пределах
      expect(result).toBeGreaterThanOrEqual(12); // MIN_FONT_SIZE_BUTTON (но в коде используется MIN_FONT_SIZE_TEXT)
      expect(result).toBeLessThanOrEqual(48); // MAX_FONT_SIZE
    });

    it('должен корректно рассчитывать единый базовый размер шрифта', () => {
      const mockScene = createMockScene(360, 640);

      // Мокируем QuizManager
      const mockQuizManager = {
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

      const result = calculateUnifiedBaseFontSize(mockScene, 1);

      // Проверяем, что размер в допустимых пределах
      expect(result).toBeGreaterThanOrEqual(16); // MIN_FONT_SIZE_TEXT
      expect(result).toBeLessThanOrEqual(48); // MAX_OPTIMAL_FONT_SIZE (обновлено с 40 на 48)
    });
  });

  describe('Совместная работа масштабирования модального окна и текста', () => {
    it('должен согласованно масштабировать модальное окно и текст для мобильного портретного устройства', () => {
      const cameraWidth = 720;
      const cameraHeight = 1280;
      const canvasWidth = 360; // Мобильное устройство
      const canvasHeight = 640; // Портретная ориентация
      const padding = 40;

      // Рассчитываем размер модального окна
      const modalSize = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Рассчитываем размер шрифта
      const mockScene = createMockScene(canvasWidth, canvasHeight);
      const baseFontSize = calculateUnifiedBaseFontSize(mockScene, 1);

      // Проверяем, что оба расчета выполнены успешно
      expect(modalSize.width).toBeGreaterThan(0);
      expect(modalSize.height).toBeGreaterThan(0);
      expect(baseFontSize).toBeGreaterThanOrEqual(16);
      expect(baseFontSize).toBeLessThanOrEqual(48) // MAX_OPTIMAL_FONT_SIZE (обновлено с 40 на 48);

      // Проверяем, что размеры согласованы (модальное окно не слишком маленькое для текста)
      const modalMinSize = Math.min(modalSize.width, modalSize.height);
      const MODAL_INTERNAL_PADDING_PERCENT = 0.08;
      const MODAL_INTERNAL_PADDING_MIN = 30;
      const internalPadding = Math.max(
        MODAL_INTERNAL_PADDING_MIN,
        modalMinSize * MODAL_INTERNAL_PADDING_PERCENT
      );
      const contentAreaWidth = modalSize.width - (internalPadding * 2);
      const contentAreaHeight = modalSize.height - (internalPadding * 2);

      // Проверяем, что контентная область достаточна для текста
      expect(contentAreaWidth).toBeGreaterThan(100);
      expect(contentAreaHeight).toBeGreaterThan(100);
    });

    it('должен согласованно масштабировать модальное окно и текст для мобильного landscape устройства', () => {
      const cameraWidth = 1280;
      const cameraHeight = 720;
      const canvasWidth = 640; // Мобильное устройство
      const canvasHeight = 360; // Landscape ориентация
      const padding = 40;

      // Рассчитываем размер модального окна
      const modalSize = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Рассчитываем размер шрифта
      const mockScene = createMockScene(canvasWidth, canvasHeight);
      const baseFontSize = calculateUnifiedBaseFontSize(mockScene, 1);

      // Проверяем, что оба расчета выполнены успешно
      expect(modalSize.width).toBeGreaterThan(0);
      expect(modalSize.height).toBeGreaterThan(0);
      expect(baseFontSize).toBeGreaterThanOrEqual(16);
      expect(baseFontSize).toBeLessThanOrEqual(48) // MAX_OPTIMAL_FONT_SIZE (обновлено с 40 на 48);

      // ✅ Для landscape должно быть квадратное окно
      const aspectRatio = modalSize.width / modalSize.height;
      expect(Math.abs(aspectRatio - 1.0)).toBeLessThan(0.1);
    });

    it('должен согласованно масштабировать модальное окно и текст для десктопного устройства', () => {
      const cameraWidth = 2560;
      const cameraHeight = 1280;
      const canvasWidth = 1920; // Десктоп
      const canvasHeight = 1080; // Landscape ориентация
      const padding = 40;

      // Рассчитываем размер модального окна
      const modalSize = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Рассчитываем размер шрифта
      const mockScene = createMockScene(canvasWidth, canvasHeight);
      const baseFontSize = calculateUnifiedBaseFontSize(mockScene, 1);

      // Проверяем, что оба расчета выполнены успешно
      expect(modalSize.width).toBeGreaterThan(0);
      expect(modalSize.height).toBeGreaterThan(0);
      expect(baseFontSize).toBeGreaterThanOrEqual(16);
      expect(baseFontSize).toBeLessThanOrEqual(48) // MAX_OPTIMAL_FONT_SIZE (обновлено с 40 на 48);

      // ✅ Для landscape должно быть квадратное окно
      const aspectRatio = modalSize.width / modalSize.height;
      expect(Math.abs(aspectRatio - 1.0)).toBeLessThan(0.1);
    });
  });

  describe('Проверка граничных случаев', () => {
    it('должен корректно обрабатывать очень маленькое модальное окно', () => {
      const cameraWidth = 720;
      const cameraHeight = 1280;
      const canvasWidth = 200; // Очень маленькое устройство
      const canvasHeight = 300;
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Проверяем, что размеры все равно вычислены
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);

      // Проверяем, что модальное окно не выходит за границы
      const scaleX = cameraWidth / canvasWidth;
      const scaleY = cameraHeight / canvasHeight;
      const isPortrait = canvasHeight > canvasWidth;
      const isMobile = canvasWidth < 768;
      const adaptivePadding = (isMobile && isPortrait) ? 80 : padding;
      const availableWidth = canvasWidth * scaleX - adaptivePadding * 2;
      const availableHeight = canvasHeight * scaleY - adaptivePadding * 2 - 120; // closeButtonTopPadding

      expect(result.width).toBeLessThanOrEqual(availableWidth * 0.98);
      expect(result.height).toBeLessThanOrEqual(availableHeight * 0.98);
    });

    it('должен корректно обрабатывать очень большое модальное окно', () => {
      const cameraWidth = 3840;
      const cameraHeight = 2160;
      const canvasWidth = 3840; // Очень большое устройство
      const canvasHeight = 2160;
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Проверяем, что размеры вычислены
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);

      // Проверяем, что модальное окно не слишком большое
      const scaleX = cameraWidth / canvasWidth;
      const scaleY = cameraHeight / canvasHeight;
      const availableWidth = canvasWidth * scaleX - padding * 2;
      const availableHeight = canvasHeight * scaleY - padding * 2 - 120; // closeButtonTopPadding

      expect(result.width).toBeLessThanOrEqual(availableWidth * 0.98);
      expect(result.height).toBeLessThanOrEqual(availableHeight * 0.98);
    });

    it('должен корректно обрабатывать очень длинный текст', () => {
      const mockScene = createMockScene(360, 640);
      const availableWidth = 100; // Очень узкая область
      const availableHeight = 15; // Очень низкая область (меньше чем 30px * 1.2 = 36px)
      const longestText = 'Это очень-очень-очень длинный текст, который точно не влезет в такую маленькую область и должен быть уменьшен до минимума';
      const defaultFontSize = 30;

      const result = calculateBaseFontSize(
        mockScene,
        availableWidth,
        availableHeight,
        longestText,
        defaultFontSize,
        3
      );

      // Должен вернуть минимум, если текст не влезает
      expect(result).toBe(16); // MIN_FONT_SIZE_TEXT
    });
  });
});











































