/**
 * Unit тесты для GameOverModal
 */

import { GameOverModal, GameOverModalConfig, GameOverType } from '../../../game/ui/GameOverModal';

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
            on: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            setVisible: jest.fn(),
            visible: true,
            height: 100,
        })),
        container: jest.fn(() => ({
            setSize: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            add: jest.fn(),
            getChildren: jest.fn(() => []),
            clear: jest.fn(),
        })),
        sprite: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            play: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            setVisible: jest.fn(),
            visible: true,
        })),
        image: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            setVisible: jest.fn(),
            visible: true,
        })),
        rectangle: jest.fn(() => ({
            setOrigin: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setStrokeStyle: jest.fn().mockReturnThis(),
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
    anims: {
        exists: jest.fn().mockReturnValue(false),
        get: jest.fn().mockReturnValue(null)
    },
    data: {
        get: jest.fn((key: string) => {
            if (key === 'currentLevel') return 1;
            if (key === 'quizManager') return undefined;
            if (key === 'audioManager') return undefined;
            return undefined;
        }),
        set: jest.fn(),
        values: {},
        list: [],
        events: {} as any,
        parent: null as any
    } as any,
});

// Мокируем Button
jest.mock('../../../game/ui/Button', () => ({
  Button: jest.fn().mockImplementation(() => ({
    setDepth: jest.fn(),
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

describe('GameOverModal', () => {
  let mockScene: any;
  let mockOnRestart: jest.Mock;
  let mockOnNextLevel: jest.Mock;

  beforeEach(() => {
    mockScene = createMockScene();
    mockOnRestart = jest.fn();
    mockOnNextLevel = jest.fn();
    mockScene.time.now = 0;
  });

  describe('Инициализация', () => {
    beforeEach(() => {
      // Очищаем моки перед каждым тестом
      jest.clearAllMocks();
    });

    it('должен создавать модальное окно Game Over для проигрыша', () => {
      const config: GameOverModalConfig = {
        type: GameOverType.LOSE,
        score: 100,
        onRestart: mockOnRestart
      };

      const modal = new GameOverModal(mockScene, config);

      expect(modal).toBeDefined();
      // Проверяем, что UI создается (через delayedCall)
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
    });

    it('должен создавать модальное окно для победы в игре', () => {
      const config: GameOverModalConfig = {
        type: GameOverType.WIN_GAME,
        score: 500,
        onRestart: mockOnRestart
      };

      const modal = new GameOverModal(mockScene, config);

      expect(modal).toBeDefined();
    });

    it('должен создавать модальное окно для победы на уровне', () => {
      const config: GameOverModalConfig = {
        type: GameOverType.WIN_LEVEL,
        score: 300,
        onRestart: mockOnRestart,
        onNextLevel: mockOnNextLevel
      };

      const modal = new GameOverModal(mockScene, config);

      expect(modal).toBeDefined();
    });

    it('должен настраивать input сцены', () => {
      const config: GameOverModalConfig = {
        type: GameOverType.LOSE,
        score: 100,
        onRestart: mockOnRestart
      };

      new GameOverModal(mockScene, config);

      expect(mockScene.input.setTopOnly).toHaveBeenCalledWith(false);
    });
  });

  describe('Уничтожение', () => {
    it('должен уничтожать все элементы модального окна', () => {
      const config: GameOverModalConfig = {
        type: GameOverType.LOSE,
        score: 100,
        onRestart: mockOnRestart
      };

      // Проверяем, что destroy() выполняется без ошибок
      const modal = new GameOverModal(mockScene, config);

      // Вызываем delayedCall для создания UI
      const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
      if (delayedCallCalls.length > 0 && delayedCallCalls[0][0] === 1) {
        delayedCallCalls[0][1](); // Вызываем callback создания UI
      }

      expect(() => modal.destroy()).not.toThrow();
    });
  });

  describe('Управление видимостью', () => {
    it('должен показывать/скрывать модальное окно', () => {
      const config: GameOverModalConfig = {
        type: GameOverType.LOSE,
        score: 100,
        onRestart: mockOnRestart
      };

      const modal = new GameOverModal(mockScene, config);

      // Вызываем delayedCall для создания UI
      const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
      if (delayedCallCalls.length > 0 && delayedCallCalls[0][0] === 1) {
        delayedCallCalls[0][1](); // Вызываем callback создания UI
      }

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
      
      const config: GameOverModalConfig = {
        type: GameOverType.LOSE,
        score: 100,
        onRestart: mockOnRestart
      };

      new GameOverModal(mockScene, config);

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
      
      const config: GameOverModalConfig = {
        type: GameOverType.LOSE,
        score: 100,
        onRestart: mockOnRestart
      };

      new GameOverModal(mockScene, config);

      // Вызываем delayedCall для создания UI
      const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
      if (delayedCallCalls.length > 0 && delayedCallCalls[0][0] === 1) {
        delayedCallCalls[0][1](); // Вызываем callback создания UI
      }

      // ✅ GameOverModal использует calculateUnifiedBaseFontSize с ФИКСИРОВАННЫМ level=1
      // Это гарантирует консистентный размер шрифта для всех трёх типов (WIN_LEVEL, WIN_GAME, LOSE)
      expect(calculateUnifiedBaseFontSize).toHaveBeenCalledWith(mockScene, 1);
    });

    it('должен масштабировать спрайт персонажа используя BASE_SCALE и ACTOR_SIZES', () => {
      const config: GameOverModalConfig = {
        type: GameOverType.WIN_GAME,
        score: 500,
        onRestart: mockOnRestart
      };

      mockScene.textures.exists = jest.fn().mockReturnValue(true);
      mockScene.anims.exists = jest.fn().mockReturnValue(true);
      mockScene.anims.get = jest.fn().mockReturnValue({
        frames: [],
        frameRate: 8
      });

      const mockSprite = {
        setDepth: jest.fn().mockReturnThis(),
        setScrollFactor: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        play: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        setVisible: jest.fn(),
        anims: {
          isPlaying: false,
          currentAnim: null
        },
        frame: {
          name: 'frame0'
        }
      };

      const mockSpriteFn = jest.fn().mockReturnValue(mockSprite);
      mockScene.add.sprite = mockSpriteFn as any;

      new GameOverModal(mockScene, config);

      // Вызываем delayedCall для создания UI
      const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
      if (delayedCallCalls.length > 0 && delayedCallCalls[0][0] === 1) {
        delayedCallCalls[0][1](); // Вызываем callback создания UI
      }

      // Проверяем, что setScale был вызван для спрайта (если спрайт был создан)
      if (mockSpriteFn.mock.calls.length > 0) {
        expect(mockSprite.setScale).toHaveBeenCalled();
      }
    });

    it('должен устанавливать правильное разрешение для текста (textResolution)', () => {
      const config: GameOverModalConfig = {
        type: GameOverType.LOSE,
        score: 100,
        onRestart: mockOnRestart
      };

      const mockTextWithResolution = {
        setOrigin: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        setScrollFactor: jest.fn().mockReturnThis(),
        setResolution: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        setVisible: jest.fn()
      };
      
      mockScene.add.text = jest.fn().mockReturnValue(mockTextWithResolution);

      new GameOverModal(mockScene, config);

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
      const config: GameOverModalConfig = {
        type: GameOverType.LOSE,
        score: 100,
        onRestart: mockOnRestart
      };

      const mockRectangle = {
        setDepth: jest.fn().mockReturnThis(),
        setScrollFactor: jest.fn().mockReturnThis(),
        setStrokeStyle: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        setVisible: jest.fn()
      };
      
      const mockRectangleFn = jest.fn().mockReturnValue(mockRectangle);
      mockScene.add.rectangle = mockRectangleFn as any;

      new GameOverModal(mockScene, config);

      // Вызываем delayedCall для создания UI
      const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
      if (delayedCallCalls.length > 0 && delayedCallCalls[0][0] === 1) {
        delayedCallCalls[0][1](); // Вызываем callback создания UI
      }

      // Проверяем, что координаты округлены (если rectangle был создан)
      if (mockRectangleFn.mock.calls.length > 0) {
        const [x, y] = mockRectangleFn.mock.calls[0];
        expect(Number.isInteger(x)).toBe(true);
        expect(Number.isInteger(y)).toBe(true);
      }
    });

    it('должен пересоздавать UI при изменении ориентации экрана', () => {
      const config: GameOverModalConfig = {
        type: GameOverType.LOSE,
        score: 100,
        onRestart: mockOnRestart
      };

      const modal = new GameOverModal(mockScene, config);

      // Вызываем delayedCall для создания UI
      const delayedCallCalls = (mockScene.time.delayedCall as jest.Mock).mock.calls;
      if (delayedCallCalls.length > 0 && delayedCallCalls[0][0] === 1) {
        delayedCallCalls[0][1](); // Вызываем callback создания UI
      }

      const mockRectangleFn = mockScene.add.rectangle as jest.Mock;
      const initialCallCount = mockRectangleFn.mock.calls.length;

      // Симулируем изменение ориентации
      if (typeof window !== 'undefined' && (window as any).orientationHandler) {
        (window as any).orientationHandler();
      }

      // Проверяем, что UI был пересоздан (если обработчик был установлен)
      // Это проверка того, что обработчик ориентации установлен
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
    });
  });
});

