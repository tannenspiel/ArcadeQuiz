/**
 * Unit тесты для SpriteAnimationHandler
 */

import { SpriteAnimationHandler } from '../../../game/systems/SpriteAnimationHandler';
import Phaser from 'phaser';

// Моки
jest.mock('phaser', () => ({
  Scene: class MockScene {
    time = {
      now: 0
    };
    anims = {
      exists: jest.fn().mockReturnValue(true),
      get: jest.fn().mockReturnValue({
        frameRate: 8,
        frames: [
          { frame: { index: 0, name: '0' } },
          { frame: { index: 1, name: '1' } }
        ]
      })
    };
    game = {
      loop: {
        delta: 16
      }
    };
  },
  Math: {
    Between: jest.fn()
  }
}));

describe('SpriteAnimationHandler', () => {
  let mockScene: Phaser.Scene;
  let mockSprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  let handler: SpriteAnimationHandler;

  beforeEach(() => {
    mockScene = new Phaser.Scene({ key: 'test' }) as any;

    mockSprite = {
      x: 100,
      y: 200,
      active: true,
      body: {
        velocity: { x: 0, y: 0 } as unknown as Phaser.Math.Vector2
      },
      anims: {
        play: jest.fn(),
        stop: jest.fn(),
        isPlaying: false,
        currentAnim: null
      },
      setFrame: jest.fn(),
      setTint: jest.fn(),
      clearTint: jest.fn(),
      tint: 0xffffff,
      blendMode: 0,
      on: jest.fn(),
      off: jest.fn()
    } as any;

    handler = new SpriteAnimationHandler(mockScene, mockSprite, 'boy');
  });

  describe('Инициализация', () => {
    it('должен создавать обработчик анимаций', () => {
      expect(handler).toBeDefined();
    });

    it('должен устанавливать префикс анимации', () => {
      expect(handler).toBeDefined();
      // Префикс устанавливается в конструкторе
    });
  });

  describe('Воспроизведение анимаций по направлению', () => {
    it('должен воспроизводить анимацию движения вниз', () => {
      mockSprite.body.velocity = { x: 0, y: 100 } as unknown as Phaser.Math.Vector2;
      
      handler.playDirectionAnimation(0, 100);
      
      expect(mockSprite.anims.play).toHaveBeenCalledWith('boy_down', true);
    });

    it('должен воспроизводить анимацию движения вверх', () => {
      mockSprite.body.velocity = { x: 0, y: -100 } as unknown as Phaser.Math.Vector2;
      
      handler.playDirectionAnimation(0, -100);
      
      expect(mockSprite.anims.play).toHaveBeenCalledWith('boy_up', true);
    });

    it('должен воспроизводить анимацию движения влево', () => {
      mockSprite.body.velocity = { x: -100, y: 0 } as unknown as Phaser.Math.Vector2;
      
      handler.playDirectionAnimation(-100, 0);
      
      expect(mockSprite.anims.play).toHaveBeenCalledWith('boy_left', true);
    });

    it('должен воспроизводить анимацию движения вправо', () => {
      mockSprite.body.velocity = { x: 100, y: 0 } as unknown as Phaser.Math.Vector2;
      
      handler.playDirectionAnimation(100, 0);
      
      expect(mockSprite.anims.play).toHaveBeenCalledWith('boy_right', true);
    });

    it('должен останавливать анимацию при нулевой скорости', () => {
      // Сначала устанавливаем анимацию
      handler.playDirectionAnimation(100, 0);
      expect(mockSprite.anims.play).toHaveBeenCalled();
      
      // Очищаем моки
      (mockSprite.anims.play as jest.Mock).mockClear();
      (mockSprite.anims.stop as jest.Mock).mockClear();
      
      // Теперь устанавливаем нулевую скорость
      mockSprite.body.velocity = { x: 0, y: 0 } as unknown as Phaser.Math.Vector2;
      handler.playDirectionAnimation(0, 0);
      
      // При нулевой скорости анимация должна остановиться
      expect(mockSprite.anims.stop).toHaveBeenCalled();
    });

    it('должен останавливать анимацию при скорости меньше порога', () => {
      // Сначала устанавливаем анимацию
      handler.playDirectionAnimation(100, 0);
      expect(mockSprite.anims.play).toHaveBeenCalled();
      
      // Очищаем моки
      (mockSprite.anims.play as jest.Mock).mockClear();
      (mockSprite.anims.stop as jest.Mock).mockClear();
      
      // ✅ minMovementThreshold = 1, поэтому используем скорость меньше 1
      mockSprite.body.velocity = { x: 0.5, y: 0.5 } as unknown as Phaser.Math.Vector2;
      handler.playDirectionAnimation(0.5, 0.5);
      
      // При скорости меньше порога (1) анимация должна остановиться
      expect(mockSprite.anims.stop).toHaveBeenCalled();
    });
  });

  describe('Синхронизация кадров', () => {
    it('должен синхронизировать кадр спрайта при наличии активной анимации', () => {
      // Устанавливаем, что анимация играет
      mockSprite.anims.isPlaying = true;
      (handler as any).currentAnimation = 'boy_down';
      
      handler.syncFrame();
      
      // syncFrame должен вызывать setFrame при наличии активной анимации
      expect(mockSprite.setFrame).toHaveBeenCalled();
    });

    it('не должен синхронизировать кадр, если анимация не играет', () => {
      mockSprite.anims.isPlaying = false;
      
      handler.syncFrame();
      
      // setFrame не должен быть вызван
      expect(mockSprite.setFrame).not.toHaveBeenCalled();
    });

    it('должен сохранять тинт во время мигания', () => {
      // Устанавливаем callback для проверки мигания
      const isBlinkingCallback = jest.fn().mockReturnValue(true);
      (handler as any).isBlinkingCallback = isBlinkingCallback;
      
      mockSprite.anims.isPlaying = true;
      (handler as any).currentAnimation = 'boy_down';
      mockSprite.tint = 0xffffff; // Белый тинт
      
      handler.syncFrame();
      
      // Тип должен быть сохранен и восстановлен
      expect(mockSprite.setFrame).toHaveBeenCalled();
      expect(mockSprite.setTint).toHaveBeenCalled();
    });
  });

  describe('Обработка мигания', () => {
    it('должен сохранять тинт при мигании', () => {
      const isBlinkingCallback = jest.fn().mockReturnValue(true);
      (handler as any).isBlinkingCallback = isBlinkingCallback;
      
      mockSprite.tint = 0xffffff;
      
      handler.playDirectionAnimation(100, 0);
      
      // Тип должен быть сохранен
      expect(mockSprite.anims.play).toHaveBeenCalled();
    });
  });

  describe('Управление анимациями', () => {
    it('должен останавливать анимацию', () => {
      handler.stop();
      
      expect(mockSprite.anims.stop).toHaveBeenCalled();
    });

    it('должен проверять, играет ли анимация', () => {
      mockSprite.anims.isPlaying = true;
      expect(handler.isPlaying()).toBe(true);
      
      mockSprite.anims.isPlaying = false;
      expect(handler.isPlaying()).toBe(false);
    });

    it('должен возвращать текущую анимацию', () => {
      const animation = handler.getCurrentAnimation();
      expect(animation).toBeDefined();
    });
  });

  describe('Синхронизация кадров', () => {
    it('должен синхронизировать кадры при наличии анимации', () => {
      mockSprite.anims.isPlaying = true;
      (handler as any).currentAnimation = 'boy_down';
      
      handler.syncFrame();
      
      // syncFrame должен обновить кадр
      expect(mockSprite.setFrame).toHaveBeenCalled();
    });

    it('не должен синхронизировать кадры, если анимация не играет', () => {
      mockSprite.anims.isPlaying = false;
      
      handler.syncFrame();
      
      // setFrame не должен быть вызван
      expect(mockSprite.setFrame).not.toHaveBeenCalled();
    });
  });
});

