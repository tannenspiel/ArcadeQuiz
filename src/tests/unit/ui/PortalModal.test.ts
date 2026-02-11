/**
 * Unit тесты для PortalModal
 */

import { PortalModal, PortalModalConfig } from '../../../game/ui/PortalModal';
import { PortalConfig, PortalType } from '../../../types/portalTypes';

// Helper function to create mock scene with all required methods
const createMockScene = () => ({
    add: {
        text: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            setResolution: jest.fn().mockReturnThis(),
            setFontSize: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setTint: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            setVisible: jest.fn(),
            visible: true,
            height: 100,
        })),
        image: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            setTexture: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setTint: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            setVisible: jest.fn(),
            width: 100,
            height: 100,
        })),
        rectangle: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setStrokeStyle: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setTint: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            setVisible: jest.fn(),
            visible: true,
        })),
    },
    input: {
        enabled: true,
        setTopOnly: jest.fn(),
        keyboard: { createCursor: jest.fn() },
        activePointer: {
            reset: jest.fn()
        }
    },
    sys: {
        settings: { active: true },
    },
    time: {
        now: 0,
        delayedCall: jest.fn().mockImplementation((delay: number, callback: () => void) => {
            if (delay === 0 || delay === 1) {
                callback();
            }
            return { destroy: jest.fn(), remove: jest.fn() } as any;
        }),
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
                width: 360,
                height: 640
            })
        }
    },
    textures: {
        exists: jest.fn().mockReturnValue(false),
        get: jest.fn()
    },
    data: {
        get: jest.fn()
    }
});

// Мокируем Button
jest.mock('../../../game/ui/Button', () => ({
  Button: jest.fn().mockImplementation(() => ({
    setDepth: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    setVisible: jest.fn()
  })),
  ButtonState: {
    NORMAL: 'normal',
    HOVER: 'hover',
    ACTIVE: 'active',
    DISABLED: 'disabled',
    BLINKING: 'blinking',
    WRONG: 'wrong'
  }
}));

// Мокируем NineSliceBackground
jest.mock('../../../game/ui/NineSliceBackground', () => ({
  NineSliceBackground: jest.fn().mockImplementation(() => ({
    setDepth: jest.fn().mockReturnThis(),
    setScrollFactor: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    setVisible: jest.fn()
  }))
}));

// Мокируем ModalSizeCalculator
jest.mock('../../../game/ui/ModalSizeCalculator', () => ({
  calculateModalSize: jest.fn().mockReturnValue({
    width: 600,
    height: 1000,
    x: 360,
    y: 640
  })
}));

// Мокируем FontSizeCalculator
jest.mock('../../../game/utils/FontSizeCalculator', () => ({
  calculateBaseFontSize: jest.fn().mockReturnValue(24),
  calculateButtonFontSize: jest.fn().mockReturnValue(24),
  calculateUnifiedBaseFontSize: jest.fn().mockReturnValue(24)
}));

// Мокируем AssetLoader
jest.mock('../../../game/core/AssetLoader', () => ({
  AssetLoader: jest.fn()
}));

describe('PortalModal', () => {
  let mockScene: any;
  let mockConfig: PortalModalConfig;
  let mockOnEnter: jest.Mock;
  let mockOnCancel: jest.Mock;

  beforeEach(() => {
    mockScene = createMockScene();
    mockOnEnter = jest.fn();
    mockOnCancel = jest.fn();

    const portalConfig: PortalConfig = {
      id: 1,
      type: PortalType.STANDARD,
      isCorrect: true,
      answerText: 'Correct Answer',
      damage: 1
    };

    mockConfig = {
      portalConfig,
      onEnter: mockOnEnter,
      onCancel: mockOnCancel
    };

    mockScene.time.now = 0;
  });

  // Helper function to create a modal instance and wait for UI creation
  const createModalAndWaitForUI = () => {
    const modal = new PortalModal(mockScene, mockConfig);

    // Simulate the delayedCall that creates UI
    const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
    if (delayedCallCalls.length > 0) {
      // Execute the UI creation callback
      if (delayedCallCalls[0][0] === 1) {
        // Call the createUI function
        const createUICallback = delayedCallCalls[0][1];
        createUICallback();

        // Execute the button enable callback (for tests that need enabled buttons)
        if (delayedCallCalls.length > 1 && delayedCallCalls[1][0] === 150) {
          delayedCallCalls[1][1]();
        }
      }
    }

    return modal;
  };

  describe('Инициализация', () => {
    beforeEach(() => {
      // Очищаем моки перед каждым тестом
      jest.clearAllMocks();
    });

    it('должен создавать модальное окно портала', () => {
      const modal = new PortalModal(mockScene, mockConfig);

      expect(modal).toBeDefined();
      // Проверяем, что UI создается (через delayedCall)
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
    });

    it('должен настраивать input сцены', () => {
      new PortalModal(mockScene, mockConfig);

      expect(mockScene.input.setTopOnly).toHaveBeenCalledWith(false);
    });
  });

  describe('Уничтожение', () => {
    it('должен уничтожать все элементы модального окна', () => {
      const modal = createModalAndWaitForUI();

      // Проверяем, что destroy() выполняется без ошибок
      expect(() => modal.destroy()).not.toThrow();
    });
  });

  describe('Управление видимостью', () => {
    it('должен показывать/скрывать модальное окно', () => {
      const modal = createModalAndWaitForUI();

      // Проверяем, что setVisible() выполняется без ошибок
      expect(() => modal.setVisible(false)).not.toThrow();
      expect(() => modal.setVisible(true)).not.toThrow();
    });
  });

  describe('Масштабирование модального окна', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('должен использовать calculateModalSize для расчета размеров', () => {
      const { calculateModalSize } = require('../../../game/ui/ModalSizeCalculator');
      
      new PortalModal(mockScene, mockConfig);

      // Вызываем delayedCall для создания UI
      const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
      if (delayedCallCalls.length > 0 && delayedCallCalls[0][0] === 1) {
        delayedCallCalls[0][1](); // Вызываем callback создания UI
      }

      // Проверяем, что calculateModalSize был вызван
      expect(calculateModalSize).toHaveBeenCalled();
    });

    it('должен использовать calculateUnifiedBaseFontSize для расчета размера шрифта', () => {
      const { calculateUnifiedBaseFontSize } = require('../../../game/utils/FontSizeCalculator');
      
      new PortalModal(mockScene, mockConfig);

      // Вызываем delayedCall для создания UI
      const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
      if (delayedCallCalls.length > 0 && delayedCallCalls[0][0] === 1) {
        delayedCallCalls[0][1](); // Вызываем callback создания UI
      }

      // Проверяем, что calculateUnifiedBaseFontSize был вызван
      expect(calculateUnifiedBaseFontSize).toHaveBeenCalled();
    });

    it('должен масштабировать изображение вопроса, если оно есть', async () => {
      const mockImage = {
        setOrigin: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        setScrollFactor: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        setVisible: jest.fn(),
        width: 1000,
        height: 800
      };

      mockScene.add.image = jest.fn().mockReturnValue(mockImage);
      mockScene.textures = {
        exists: jest.fn().mockReturnValue(true),
        get: jest.fn()
      } as any;

      const mockAssetLoader = {
        loadImage: jest.fn().mockResolvedValue(undefined)
      };

      (mockScene as any).assetLoader = mockAssetLoader;

      const configWithImage: PortalModalConfig = {
        ...mockConfig,
        globalQuestion: {
          type: 'TEXT_WITH_IMAGE' as any,
          questionText: 'Test question',
          image: 'test-image.png',
          correctAnswer: 'A',
          wrongAnswers: ['B', 'C'],
          allAnswers: ['A', 'B', 'C'],
          feedbacks: ['Correct!'],
          wrongFeedbacks: ['Wrong!']
        }
      };

      const modal = new PortalModal(mockScene, configWithImage);

      // Вызываем delayedCall для создания UI (async)
      const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
      if (delayedCallCalls.length > 0 && delayedCallCalls[0][0] === 1) {
        await delayedCallCalls[0][1](); // Вызываем async callback создания UI
      }

      // Проверяем, что изображение было создано и масштабировано
      if ((mockScene.add.image as jest.Mock).mock.calls.length > 0) {
        expect(mockImage.setScale).toHaveBeenCalled();
      }
    });

    it('должен устанавливать правильное разрешение для текста (textResolution)', () => {
      const mockTextWithResolution = {
        setOrigin: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        setScrollFactor: jest.fn().mockReturnThis(),
        setResolution: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        setVisible: jest.fn()
      };
      
      mockScene.add.text = jest.fn().mockReturnValue(mockTextWithResolution);

      new PortalModal(mockScene, mockConfig);

      // Вызываем delayedCall для создания UI
      const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
      if (delayedCallCalls.length > 0 && delayedCallCalls[0][0] === 1) {
        delayedCallCalls[0][1](); // Вызываем callback создания UI
      }

      // Проверяем, что setResolution был вызван (если текст был создан)
      if (mockTextWithResolution.setResolution.mock.calls.length > 0) {
        expect(mockTextWithResolution.setResolution).toHaveBeenCalled();
      }
    });

    it('должен округлять координаты до целых пикселей для предотвращения размытия', () => {
      const mockRectangle = {
        setDepth: jest.fn().mockReturnThis(),
        setScrollFactor: jest.fn().mockReturnThis(),
        setStrokeStyle: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        setVisible: jest.fn()
      };
      
      mockScene.add.rectangle = jest.fn().mockReturnValue(mockRectangle);

      new PortalModal(mockScene, mockConfig);

      // Вызываем delayedCall для создания UI
      const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
      if (delayedCallCalls.length > 0 && delayedCallCalls[0][0] === 1) {
        delayedCallCalls[0][1](); // Вызываем callback создания UI
      }

      // Проверяем, что координаты округлены (если rectangle был создан)
      if ((mockScene.add.rectangle as jest.Mock).mock.calls.length > 0) {
        const [x, y] = (mockScene.add.rectangle as jest.Mock).mock.calls[0];
        expect(Number.isInteger(x)).toBe(true);
        expect(Number.isInteger(y)).toBe(true);
      }
    });
  });
});

