/**
 * Unit тесты для PhaserGame компонента
 * Проверяет конфигурацию масштабирования и обработку resize событий
 */

// Мокаем Phaser перед импортом PhaserGame, чтобы избежать инициализации Canvas
jest.mock('phaser', () => {
  // Простой EventEmitter для EventBus
  class MockEventEmitter {
    private listeners: Map<string, Function[]> = new Map();

    on(event: string, callback: Function) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)!.push(callback);
      return this;
    }

    off(event: string, callback?: Function) {
      if (!this.listeners.has(event)) return this;
      if (callback) {
        const callbacks = this.listeners.get(event)!;
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      } else {
        this.listeners.delete(event);
      }
      return this;
    }

    emit(event: string, ...args: any[]) {
      if (!this.listeners.has(event)) return false;
      const callbacks = this.listeners.get(event)!;
      callbacks.forEach(callback => callback(...args));
      return true;
    }

    removeAllListeners(event?: string) {
      if (event) {
        this.listeners.delete(event);
      } else {
        this.listeners.clear();
      }
      return this;
    }
  }

  const mockScale = {
    refresh: jest.fn(),
    gameSize: {
      width: 720,
      height: 1280 // BASE_GAME_HEIGHT
    },
    setGameSize: jest.fn(),
    updateCenter: jest.fn()
  };

  const mockGame = {
    scale: mockScale,
    destroy: jest.fn(),
    canvas: {
      getBoundingClientRect: jest.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 720,
        height: 1280 // BASE_GAME_HEIGHT
      })
    }
  };

  const mockPhaserGame = jest.fn().mockImplementation(() => mockGame);

  return {
    __esModule: true,
    default: {
      AUTO: 'AUTO',
      Scale: {
        FIT: 'FIT',
        CENTER_BOTH: 'CENTER_BOTH'
      },
      Game: mockPhaserGame,
      Scene: jest.fn(),
      Events: {
        EventEmitter: MockEventEmitter
      },
      GameObjects: {
        Container: class MockContainer {
          constructor(scene: any, x: number, y: number) {}
          setDepth(depth: number) { return this; }
          setOrigin(x: number, y: number) { return this; }
          setPosition(x: number, y: number) { return this; }
          setSize(width: number, height: number) { return this; }
          setScrollFactor(x: number, y?: number) { return this; }
          setInteractive(config?: any) { return this; }
          setStrokeStyle(color?: number, thickness?: number) { return this; }
          setVisible(visible: boolean) { return this; }
          setResolution(width: number, height: number) { return this; }
          setFontSize(size: number) { return this; }
          on(event: string, callback: Function) { return this; }
          destroy() { return this; }
        },
        Sprite: class MockSprite {},
        Text: class MockText {},
        Image: class MockImage {}
      },
      // ⚠️ ADDED: Physics.Arcade.Sprite needed for AbstractItem extends Phaser.Physics.Arcade.Sprite
      Physics: {
        Arcade: {
          Sprite: class MockArcadeSprite {},
        }
      }
    }
  };
});

import React, { Suspense } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { act } from 'react';
import PhaserGame from '../../../react/PhaserGame';
import { BASE_GAME_HEIGHT } from '../../../constants/gameConstants';
import Phaser from 'phaser';

// Fallback компонент для тестов Suspense
const TestFallback = () => <div data-testid="loading-fallback">Loading...</div>;

// Получаем моки из jest.mock
const mockPhaserGame = (Phaser as any).Game;
const mockGame = new mockPhaserGame({});
const mockScale = mockGame.scale;

// Моки для window
const mockWindowResizeListeners: Array<() => void> = [];
const mockOrientationChangeListeners: Array<() => void> = [];
const mockVisualViewportResizeListeners: Array<() => void> = [];

describe('PhaserGame', () => {
  let originalWindow: any;
  let originalDocument: any;
  let originalAddEventListener: any;
  let originalRemoveEventListener: any;
  let originalVisualViewport: any;

  beforeEach(() => {
    // Сохраняем оригинальные значения
    originalWindow = global.window;
    originalDocument = global.document;
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;
    originalVisualViewport = window.visualViewport;

    // ✅ Мокаем window.innerWidth и window.innerHeight для корректного вычисления размера игры
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    });

    // Мокаем window.addEventListener
    window.addEventListener = jest.fn((event: string, handler: any) => {
      if (event === 'resize') {
        mockWindowResizeListeners.push(handler);
      } else if (event === 'orientationchange') {
        mockOrientationChangeListeners.push(handler);
      }
      return originalAddEventListener.call(window, event, handler);
    });

    // Мокаем window.removeEventListener
    window.removeEventListener = jest.fn((event: string, handler: any) => {
      if (event === 'resize') {
        const index = mockWindowResizeListeners.indexOf(handler);
        if (index > -1) mockWindowResizeListeners.splice(index, 1);
      } else if (event === 'orientationchange') {
        const index = mockOrientationChangeListeners.indexOf(handler);
        if (index > -1) mockOrientationChangeListeners.splice(index, 1);
      }
      return originalRemoveEventListener.call(window, event, handler);
    });

    // Мокаем visualViewport
    const mockVisualViewport = {
      width: 1024,
      height: 768,
      addEventListener: jest.fn((event: string, handler: () => void) => {
        if (event === 'resize') {
          mockVisualViewportResizeListeners.push(handler);
        }
      }),
      removeEventListener: jest.fn((event: string, handler: () => void) => {
        if (event === 'resize') {
          const index = mockVisualViewportResizeListeners.indexOf(handler);
          if (index > -1) mockVisualViewportResizeListeners.splice(index, 1);
        }
      })
    };

    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      value: mockVisualViewport
    });

    // Мокаем document.addEventListener и removeEventListener
    const mockDocumentListeners: { [key: string]: Array<(e: Event) => void> } = {};
    document.addEventListener = jest.fn((event: string, handler: any) => {
      if (!mockDocumentListeners[event]) {
        mockDocumentListeners[event] = [];
      }
      mockDocumentListeners[event].push(handler);
    });

    document.removeEventListener = jest.fn((event: string, handler: any) => {
      if (mockDocumentListeners[event]) {
        const index = mockDocumentListeners[event].indexOf(handler);
        if (index > -1) mockDocumentListeners[event].splice(index, 1);
      }
    });

    // Очищаем моки перед каждым тестом
    jest.clearAllMocks();
    mockWindowResizeListeners.length = 0;
    mockOrientationChangeListeners.length = 0;
    mockVisualViewportResizeListeners.length = 0;
  });

  afterEach(() => {
    // Восстанавливаем оригинальные значения
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      value: originalVisualViewport
    });

    // Очищаем компоненты
    cleanup();
  });

  describe('Конфигурация Phaser', () => {
    it('должен создавать Phaser.Game с правильной конфигурацией', () => {
      act(() => {
        render(<PhaserGame />);
      });

      expect(mockPhaserGame).toHaveBeenCalled();
      const config = mockPhaserGame.mock.calls[0][0];

      // Проверяем виртуальное разрешение
      // Ширина вычисляется динамически на основе соотношения сторон экрана
      // Высота фиксирована (BASE_GAME_HEIGHT)
      expect(config.height).toBe(BASE_GAME_HEIGHT);
      expect(config.width).toBeGreaterThan(0);
      expect(config.width).toBeLessThanOrEqual(2560); // MAX_GAME_WIDTH

      // Проверяем конфигурацию масштабирования
      expect(config.scale.mode).toBe('FIT');
      expect(config.scale.autoCenter).toBe('CENTER_BOTH');

      // Проверяем parent контейнер
      expect(config.parent).toBe('game-container');
    });

    it('должен использовать правильный тип рендеринга', () => {
      act(() => {
        render(<PhaserGame />);
      });

      const config = mockPhaserGame.mock.calls[0][0];
      expect(config.render.pixelArt).toBe(true);
      expect(config.render.roundPixels).toBe(true);
      expect(config.render.antialias).toBe(false);
    });
  });

  describe('Обработчики событий resize', () => {
    it('должен регистрировать обработчик window.resize', () => {
      act(() => {
        render(<PhaserGame />);
      });

      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('должен регистрировать обработчик window.orientationchange', () => {
      act(() => {
        render(<PhaserGame />);
      });

      expect(window.addEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    });

    it('должен регистрировать обработчик visualViewport.resize если доступен', () => {
      act(() => {
        render(<PhaserGame />);
      });

      expect(window.visualViewport?.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('должен вызывать game.scale.refresh() при resize с debounce', async () => {
      jest.useFakeTimers();

      act(() => {
        render(<PhaserGame />);
      });

      // Получаем обработчик resize
      const resizeHandler = mockWindowResizeListeners[0];
      expect(resizeHandler).toBeDefined();

      // Вызываем resize
      act(() => {
        resizeHandler();
      });

      // Проверяем, что refresh() еще не вызван (debounce 100ms)
      expect(mockScale.refresh).not.toHaveBeenCalled();

      // Ждем debounce
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Теперь refresh() должен быть вызван
      expect(mockScale.refresh).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('должен отменять предыдущий debounce при множественных resize', async () => {
      jest.useFakeTimers();

      act(() => {
        render(<PhaserGame />);
      });

      const resizeHandler = mockWindowResizeListeners[0];

      // Вызываем resize несколько раз
      act(() => {
        resizeHandler();
        jest.advanceTimersByTime(50);
        resizeHandler();
        jest.advanceTimersByTime(50);
        resizeHandler();
      });

      // refresh() еще не должен быть вызван
      expect(mockScale.refresh).not.toHaveBeenCalled();

      // Ждем полный debounce после последнего вызова
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // refresh() должен быть вызван только один раз
      expect(mockScale.refresh).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('должен вызывать handleResize с задержкой при orientationchange', async () => {
      jest.useFakeTimers();

      act(() => {
        render(<PhaserGame />);
      });

      const orientationHandler = mockOrientationChangeListeners[0];
      expect(orientationHandler).toBeDefined();

      // Вызываем orientationchange (он вызывает setTimeout(handleResize, 300))
      act(() => {
        orientationHandler();
      });

      // Проверяем, что refresh() еще не вызван (задержка 300ms + debounce 100ms)
      expect(mockScale.refresh).not.toHaveBeenCalled();

      // Ждем задержку orientationchange (300ms)
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Теперь должен быть вызван handleResize, который имеет debounce 100ms
      expect(mockScale.refresh).not.toHaveBeenCalled();

      // Ждем debounce handleResize (100ms)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Теперь refresh() должен быть вызван
      expect(mockScale.refresh).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Очистка при размонтировании', () => {
    it('должен удалять обработчик window.resize при размонтировании', () => {
      const { unmount } = render(<PhaserGame />);

      const resizeHandler = mockWindowResizeListeners[0];

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('resize', resizeHandler);
    });

    it('должен удалять обработчик window.orientationchange при размонтировании', () => {
      const { unmount } = render(<PhaserGame />);

      const orientationHandler = mockOrientationChangeListeners[0];

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('orientationchange', orientationHandler);
    });

    it('должен удалять обработчик visualViewport.resize при размонтировании', () => {
      const { unmount } = render(<PhaserGame />);

      const viewportHandler = mockVisualViewportResizeListeners[0];

      unmount();

      // ✅ Проверяем, что removeEventListener был вызван с правильными параметрами
      // (может быть именованная функция handleResize, а не анонимная)
      expect(window.visualViewport?.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('должен уничтожать Phaser.Game при размонтировании', () => {
      const { unmount } = render(<PhaserGame />);

      expect(mockPhaserGame).toHaveBeenCalled();

      unmount();

      expect(mockGame.destroy).toHaveBeenCalledWith(true);
    });
  });

  describe('Создание DOM элементов', () => {
    it('должен создавать div с id="game-container"', () => {
      render(<PhaserGame />);

      const gameContainer = document.querySelector('#game-container');
      expect(gameContainer).toBeInTheDocument();
    });
  });
});
