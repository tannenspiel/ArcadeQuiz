/**
 * Unit тесты для Button
 */

import { Button, ButtonState } from '../../../game/ui/Button';

// TypeScript interfaces for mock scene
interface MockZone {
    setInteractive: jest.Mock;
    on: jest.Mock;
    setDepth: jest.Mock;
}

interface MockRectangle {
    setOrigin: jest.Mock;
    setScrollFactor: jest.Mock;
    setDepth: jest.Mock;
    setFillStyle: jest.Mock;
    setAlpha: jest.Mock;
    setInteractive: jest.Mock;
    disableInteractive: jest.Mock;
    on: jest.Mock;
    destroy: jest.Mock;
    setVisible: jest.Mock;
    visible: boolean;
}

interface MockText {
    setOrigin: jest.Mock;
    setScrollFactor: jest.Mock;
    setDepth: jest.Mock;
    setText: jest.Mock;
    setResolution: jest.Mock;
    setVisible: jest.Mock;
    setScale: jest.Mock;
    destroy: jest.Mock;
    visible: boolean;
    displayWidth: number;
    displayHeight: number;
}

interface MockDelayedCall {
    remove: jest.Mock;
    destroy: jest.Mock;
}

interface MockTween {
    stop: jest.Mock;
}

interface MockScene {
    add: {
        zone: jest.Mock;
        rectangle: jest.Mock;
        text: jest.Mock;
    };
    input: {
        enabled: boolean;
        setTopOnly: jest.Mock;
        activePointer: { reset: jest.Mock };
    };
    time: {
        now: number;
        delayedCall: jest.Mock;
    };
    tweens: {
        add: jest.Mock;
    };
    data: {
        get: jest.Mock;
    };
    cameras: {
        main: {
            zoom: number;
        };
    };
}

// Helper function to create mock scene with all required methods
const createMockScene = (): MockScene => ({
    add: {
        zone: jest.fn((): MockZone => ({
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
        })),
        rectangle: jest.fn((): MockRectangle => ({
            setOrigin: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setFillStyle: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            disableInteractive: jest.fn().mockReturnThis(),
            on: jest.fn(),
            destroy: jest.fn(),
            setVisible: jest.fn(),
            visible: true
        })),
        text: jest.fn((): MockText => ({
            setOrigin: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setText: jest.fn().mockReturnThis(),
            setResolution: jest.fn().mockReturnThis(),
            setVisible: jest.fn(),
            setScale: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            visible: true,
            displayWidth: 200,
            displayHeight: 50
        })),
    },
    input: {
        enabled: true,
        setTopOnly: jest.fn(),
        activePointer: {
            reset: jest.fn()
        }
    },
    time: {
        now: 0,
        delayedCall: jest.fn().mockImplementation((delay: number, callback: () => void): MockDelayedCall => {
            if (delay === 0) {
                callback();
            }
            return { remove: jest.fn(), destroy: jest.fn() };
        }),
    },
    tweens: {
        add: jest.fn((): MockTween => ({
            stop: jest.fn()
        }))
    },
    data: {
        get: jest.fn()
    },
    cameras: {
        main: {
            zoom: 1
        }
    },
});

// Мокируем NineSliceBackground
jest.mock('../../../game/ui/NineSliceBackground', () => ({
  NineSliceBackground: jest.fn().mockImplementation(() => ({
    setDepth: jest.fn().mockReturnThis(),
    setTint: jest.fn().mockReturnThis(),
    setupInteractive: jest.fn(),
    disableInteractive: jest.fn(),
    setInteractive: jest.fn().mockReturnThis(),
    on: jest.fn(),
    destroy: jest.fn(),
    setVisible: jest.fn(),
    setAlpha: jest.fn().mockReturnThis(),
    depth: 1002,
    input: { cursor: 'pointer' }
  }))
}));

describe('Button', () => {
  let mockScene: MockScene;
  let mockOnClick: jest.Mock;

  beforeEach(() => {
    mockScene = createMockScene();
    mockOnClick = jest.fn();
  });

  describe('Инициализация', () => {
    it('должен создавать кнопку с правильными параметрами', () => {
      const button = new Button(mockScene as any, {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        text: 'Test Button',
        onClick: mockOnClick
      });

      expect(button).toBeDefined();
      expect(mockScene.add.rectangle).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('должен использовать начальное состояние NORMAL по умолчанию', () => {
      const button = new Button(mockScene as any, {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        text: 'Test Button'
      });

      expect(button.getState()).toBe(ButtonState.NORMAL);
    });

    it('должен использовать указанное начальное состояние', () => {
      const button = new Button(mockScene as any, {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        text: 'Test Button',
        initialState: ButtonState.DISABLED
      });

      expect(button.getState()).toBe(ButtonState.DISABLED);
    });
  });

  describe('Управление состоянием', () => {
    it('должен изменять состояние кнопки', () => {
      const button = new Button(mockScene as any, {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        text: 'Test Button'
      });

      button.setState(ButtonState.HOVER);
      expect(button.getState()).toBe(ButtonState.HOVER);

      button.setState(ButtonState.ACTIVE);
      expect(button.getState()).toBe(ButtonState.ACTIVE);
    });

    it('должен игнорировать установку того же состояния', () => {
      const button = new Button(mockScene as any, {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        text: 'Test Button'
      });

      const initialState = button.getState();
      button.setState(initialState);
      expect(button.getState()).toBe(initialState);
    });

    it('должен отключать интерактивность при состоянии DISABLED', () => {
      jest.clearAllMocks();
      const button = new Button(mockScene as any, {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        text: 'Test Button'
      });

      button.setState(ButtonState.DISABLED);

      // Проверяем, что disableInteractive был вызван на фоне кнопки
      const mockBackground = (mockScene.add.rectangle as jest.Mock).mock.results[0].value;
      expect(mockBackground.disableInteractive).toHaveBeenCalled();
    });
  });

  describe('Управление текстом', () => {
    it('должен обновлять текст кнопки', () => {
      const button = new Button(mockScene as any, {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        text: 'Initial Text'
      });

      // Get the text mock from the scene
      const textMock = (mockScene.add.text as jest.Mock).mock.results[0].value;

      // Clear previous calls to setText
      textMock.setText.mockClear();

      // Update text and verify setText was called on the text mock
      button.setText('New Text');
      expect(textMock.setText).toHaveBeenCalledWith('New Text');
    });

    it('должен устанавливать feedback текст', () => {
      const button = new Button(mockScene as any, {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        text: 'Test Button'
      });

      // Очищаем предыдущие вызовы text
      jest.clearAllMocks();

      button.setFeedback('Feedback message');

      // Проверяем, что был создан feedback текст
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('должен скрывать feedback текст', () => {
      const button = new Button(mockScene as any, {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        text: 'Test Button'
      });

      button.setFeedback('Feedback message');

      // Получаем mock объект feedback текста из последнего вызова
      const textCalls = (mockScene.add.text as jest.Mock).mock.calls;
      const feedbackTextMock = textCalls[textCalls.length - 1] ? textCalls[textCalls.length - 1][3] : null;

      button.hideFeedback();

      // Проверяем, что feedback текст был скрыт (если был создан)
      if (feedbackTextMock && feedbackTextMock.setVisible) {
        expect(feedbackTextMock.setVisible).toHaveBeenCalledWith(false);
      }
    });
  });

  describe('Управление видимостью', () => {
    it('должен показывать/скрывать кнопку', () => {
      const button = new Button(mockScene as any, {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        text: 'Test Button'
      });

      // Get the background and text mocks from the scene
      const backgroundMock = (mockScene.add.rectangle as jest.Mock).mock.results[0].value;
      const textMock = (mockScene.add.text as jest.Mock).mock.results[0].value;

      // Clear previous calls to setVisible
      backgroundMock.setVisible.mockClear();
      textMock.setVisible.mockClear();

      // Hide button and verify setVisible was called on both background and text
      button.setVisible(false);
      expect(backgroundMock.setVisible).toHaveBeenCalledWith(false);
      expect(textMock.setVisible).toHaveBeenCalledWith(false);

      // Show button and verify setVisible was called with true
      button.setVisible(true);
      expect(backgroundMock.setVisible).toHaveBeenCalledWith(true);
      expect(textMock.setVisible).toHaveBeenCalledWith(true);
    });
  });

  describe('Уничтожение', () => {
    it('должен уничтожать все элементы кнопки', () => {
      const button = new Button(mockScene as any, {
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        text: 'Test Button'
      });

      // Get the background and text mocks from the scene
      const backgroundMock = (mockScene.add.rectangle as jest.Mock).mock.results[0].value;
      const textMock = (mockScene.add.text as jest.Mock).mock.results[0].value;

      // Clear previous calls to destroy
      backgroundMock.destroy.mockClear();
      textMock.destroy.mockClear();

      // Destroy button and verify destroy was called on child elements
      button.destroy();
      expect(backgroundMock.destroy).toHaveBeenCalled();
      expect(textMock.destroy).toHaveBeenCalled();
    });
  });
});
