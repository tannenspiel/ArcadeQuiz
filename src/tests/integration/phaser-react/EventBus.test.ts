/**
 * Integration тесты для EventBus (взаимодействие Phaser-React)
 */

// Мокаем Phaser перед импортом EventBus, чтобы избежать инициализации Canvas
jest.mock('phaser', () => {
  // Простой EventEmitter для тестов
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

  return {
    Events: {
      EventEmitter: MockEventEmitter
    }
  };
});

import { EventBus } from '../../../game/EventBus';

describe('EventBus Integration', () => {
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    // Отключаем логирование EventBus в тестах
    originalConsoleLog = console.log;
    console.log = jest.fn();
    
    // Очищаем все слушатели перед каждым тестом
    EventBus.removeAllListeners();
  });

  afterEach(() => {
    // Восстанавливаем логирование
    console.log = originalConsoleLog;
  });

  afterEach(() => {
    // Очищаем после теста
    EventBus.removeAllListeners();
  });

  describe('Phaser → React события', () => {
    it('должен отправлять событие update-hud с данными', () => {
      const mockHandler = jest.fn();
      EventBus.on('update-hud', mockHandler);

      const data = { health: 3, runes: 2, altarActive: true };
      EventBus.emit('update-hud', data);

      expect(mockHandler).toHaveBeenCalledWith(data);
    });

    it('должен отправлять событие show-quiz', () => {
      const mockHandler = jest.fn();
      EventBus.on('show-quiz', mockHandler);

      const quizData = {
        question: 'Test question?',
        answers: ['A', 'B', 'C'],
        correctAnswer: 0
      };
      EventBus.emit('show-quiz', quizData);

      expect(mockHandler).toHaveBeenCalledWith(quizData);
    });

    it('должен отправлять событие game-over', () => {
      const mockHandler = jest.fn();
      EventBus.on('game-over', mockHandler);

      EventBus.emit('game-over', 'win');
      expect(mockHandler).toHaveBeenCalledWith('win');

      EventBus.emit('game-over', 'lose');
      expect(mockHandler).toHaveBeenCalledWith('lose');
    });
  });

  describe('React → Phaser события', () => {
    it('должен отправлять событие quiz-completed', () => {
      const mockHandler = jest.fn();
      EventBus.on('quiz-completed', mockHandler);

      const result = { correct: true, context: 'rune' };
      EventBus.emit('quiz-completed', result);

      expect(mockHandler).toHaveBeenCalledWith(result);
    });

    it('должен отправлять событие restart-game', () => {
      const mockHandler = jest.fn();
      EventBus.on('restart-game', mockHandler);

      EventBus.emit('restart-game');

      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('Множественные подписчики', () => {
    it('должен уведомлять всех подписчиков', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      EventBus.on('update-hud', handler1);
      EventBus.on('update-hud', handler2);
      EventBus.on('update-hud', handler3);

      const data = { health: 2, runes: 1, altarActive: false };
      EventBus.emit('update-hud', data);

      expect(handler1).toHaveBeenCalledWith(data);
      expect(handler2).toHaveBeenCalledWith(data);
      expect(handler3).toHaveBeenCalledWith(data);
    });
  });

  describe('Отписка от событий', () => {
    it('должен отписываться от событий', () => {
      const handler = jest.fn();
      EventBus.on('update-hud', handler);
      EventBus.off('update-hud', handler);

      EventBus.emit('update-hud', { health: 1, runes: 0, altarActive: false });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Типизация данных', () => {
    it('должен корректно обрабатывать типизированные данные update-hud', () => {
      const handler = jest.fn();
      EventBus.on('update-hud', handler);

      const data: { health: number; runes: number; altarActive: boolean } = {
        health: 3,
        runes: 2,
        altarActive: true
      };
      EventBus.emit('update-hud', data);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          health: expect.any(Number),
          runes: expect.any(Number),
          altarActive: expect.any(Boolean)
        })
      );
    });

    it('должен корректно обрабатывать типизированные данные quiz-completed', () => {
      const handler = jest.fn();
      EventBus.on('quiz-completed', handler);

      const data: { correct: boolean; context: string } = {
        correct: true,
        context: 'rune'
      };
      EventBus.emit('quiz-completed', data);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          correct: expect.any(Boolean),
          context: expect.any(String)
        })
      );
    });
  });
});


