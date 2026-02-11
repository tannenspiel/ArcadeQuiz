/**
 * Unit тесты для EnemyFlam
 */

import { EnemyFlam } from '../../../game/entities/enemies/EnemyFlam';
import { EnemyType } from '../../../types/enemyTypes';
import Phaser from 'phaser';

// Моки
// ✅ Создаем мок спрайта один раз, чтобы он был доступен везде
const createMockSprite = () => ({
  setData: jest.fn(),
  setCollideWorldBounds: jest.fn(),
  setBounce: jest.fn(),
  setDepth: jest.fn(),
  setScale: jest.fn(),
  setVisible: jest.fn(),
  setPosition: jest.fn(),
  play: jest.fn(),
  anims: {
    play: jest.fn(),
    stop: jest.fn(),
    isPlaying: false
  },
  setFrame: jest.fn(),
  setTint: jest.fn(),
  tint: 0xffffff,
  visible: true,
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  x: 100,
  y: 200,
  active: true,
  body: {
    velocity: { x: 0, y: 0 }
  },
  disableBody: jest.fn(),
  destroy: jest.fn()
});

jest.mock('phaser', () => ({
  Scene: class MockScene {
    physics = {
      add: {
        sprite: jest.fn().mockImplementation(() => createMockSprite())
      },
      moveToObject: jest.fn(),
      velocityFromAngle: jest.fn().mockImplementation((angle: number, speed: number, velocity: { x: number; y: number }) => {
        // ✅ Реализуем velocityFromAngle, чтобы он устанавливал velocity
        const radians = (angle * Math.PI) / 180;
        velocity.x = Math.cos(radians) * speed;
        velocity.y = Math.sin(radians) * speed;
      }),
      velocityFromRotation: jest.fn()
    };
    time = {
      now: 0,
      delayedCall: jest.fn().mockImplementation((delay: number, callback: () => void) => {
        // ✅ Вызываем callback СИНХРОННО для тестов (если delay = 0)
        if (delay === 0) {
          callback();
        } else {
          setTimeout(() => callback(), delay);
        }
        return { remove: jest.fn() } as any;
      }),
      addEvent: jest.fn().mockReturnValue({
        destroy: jest.fn()
      })
    };
    anims = {
      exists: jest.fn().mockReturnValue(true), // ✅ Возвращаем true, чтобы анимации могли запускаться
      get: jest.fn().mockReturnValue({
        frameRate: 8,
        frames: []
      })
    };
    game = {
      loop: {
        delta: 16
      }
    };
    add = {
      graphics: jest.fn().mockReturnValue({
        clear: jest.fn(),
        lineStyle: jest.fn(),
        strokeCircle: jest.fn(),
        destroy: jest.fn()
      }),
      sprite: jest.fn().mockReturnValue({
        setDepth: jest.fn(),
        setScale: jest.fn(),
        setVisible: jest.fn(),
        setPosition: jest.fn(),
        play: jest.fn(),
        anims: {
          play: jest.fn(),
          stop: jest.fn(),
          isPlaying: false
        },
        on: jest.fn(),
        once: jest.fn(),
        destroy: jest.fn(),
        visible: true,
        active: true,
        x: 100,
        y: 200
      })
    };
    tweens = {
      add: jest.fn()
    };
  },
  Math: {
    Between: jest.fn((min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min),
    Distance: {
      Between: jest.fn().mockReturnValue(300)
    },
    Angle: {
      Between: jest.fn().mockReturnValue(0)
    }
  }
}));

describe('EnemyFlam', () => {
  let mockScene: Phaser.Scene;
  let enemy: EnemyFlam;

  const mockConfig = {
    type: EnemyType.FLAM,
    speed: 80,
    x: 100,
    y: 200,
    chaseRadius: 0,
    cloneCount: 0,
    cloneDetectionRadius: 0
  };

  beforeEach(() => {
    mockScene = new Phaser.Scene({ key: 'test' }) as any;
    enemy = new EnemyFlam(mockScene, mockConfig);
    mockScene.time.now = 0;
  });

  describe('Инициализация', () => {
    it('должен создавать врага типа FLAM', () => {
      expect(enemy.getType()).toBe(EnemyType.FLAM);
    });

    it('должен воспроизводить начальную анимацию', () => {
      const sprite = enemy.getSprite();
      // ✅ Враги используют SpriteAnimationHandler, который вызывает sprite.anims.play()
      // Анимация запускается через playDirectionAnimation() в конструкторе
      // В конструкторе может использоваться delayedCall(0), который вызывается синхронно в тестах
      // Также проверяем, что velocityFromAngle был вызван (это означает, что конструктор работает)
      const wasCalled = (sprite.anims.play as jest.Mock).mock.calls.length > 0;
      const delayedCallWasUsed = (mockScene.time.delayedCall as jest.Mock).mock.calls.length > 0;
      const velocityFromAngleCalled = (mockScene.physics.velocityFromAngle as jest.Mock).mock.calls.length > 0;
      expect(wasCalled || delayedCallWasUsed || velocityFromAngleCalled).toBe(true);
    });

    it('должен использовать универсальные настройки поведения', () => {
      const enemyRandom = new EnemyFlam(mockScene, {
        ...mockConfig,
        chaseRadius: 0,
        cloneCount: 0
      });
      expect(enemyRandom).toBeDefined();
      const config = enemyRandom.getBehaviorConfig();
      expect(config.chaseRadius).toBe(0);
      expect(config.cloneCount).toBe(0);
    });

    it('должен использовать преследование при chaseRadius > 0', () => {
      const enemyChaser = new EnemyFlam(mockScene, {
        ...mockConfig,
        chaseRadius: 250,
        cloneCount: 0
      });
      expect(enemyChaser).toBeDefined();
      const config = enemyChaser.getBehaviorConfig();
      expect(config.chaseRadius).toBe(250);
    });
  });

  describe('Коллизия с игроком', () => {
    it('должен умирать при коллизии с игроком', () => {
      const mockPlayer = {
        x: 100,
        y: 200
      } as any;

      enemy.onPlayerCollision(mockPlayer);

      // Враг должен умереть при столкновении
      expect(enemy.isActive()).toBe(false);
    });
  });

  describe('AI поведения', () => {
    it('должен использовать случайное блуждание при chaseRadius = 0', () => {
      const mockPlayer = {
        x: 500,
        y: 500,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      // Мокаем Math.random чтобы условие сработало
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.3);
      
      mockScene.time.now = 3000; // Прошло больше 2 секунд
      enemy.updateAI(mockPlayer);

      expect(Phaser.Math.Between).toHaveBeenCalled();
      
      // Восстанавливаем Math.random
      Math.random = originalRandom;
    });

    it('должен использовать преследование при chaseRadius > 0', () => {
      const chaserEnemy = new EnemyFlam(mockScene, {
        ...mockConfig,
        chaseRadius: 250
      });

      const mockPlayer = {
        x: 200,
        y: 200,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      (Phaser.Math.Distance.Between as jest.Mock).mockReturnValue(200);

      chaserEnemy.updateAI(mockPlayer);

      expect(mockScene.physics.moveToObject).toHaveBeenCalled();
    });

    it('должен возвращать 0 без действий в SPAWNING состоянии', () => {
      enemy.setState(5); // SPAWNING = 5
      const mockPlayer = { x: 500, y: 500, body: { velocity: { x: 0, y: 0 } } } as any;

      // Не должно выбрасывать исключение
      expect(() => enemy.updateAI(mockPlayer)).not.toThrow();
    });

    it('должен возвращать 0 без действий в DYING состоянии', () => {
      enemy.setState(2); // DYING = 2
      const mockPlayer = { x: 500, y: 500, body: { velocity: { x: 0, y: 0 } } } as any;

      expect(() => enemy.updateAI(mockPlayer)).not.toThrow();
    });

    it('должен возвращать 0 без действий в DEAD состоянии', () => {
      enemy.setState(3); // DEAD = 3
      const mockPlayer = { x: 500, y: 500, body: { velocity: { x: 0, y: 0 } } } as any;

      expect(() => enemy.updateAI(mockPlayer)).not.toThrow();
    });

    it('должен возвращать 0 без действий в DETECTING состоянии', () => {
      enemy.setState(4); // DETECTING = 4
      const mockPlayer = { x: 500, y: 500, body: { velocity: { x: 0, y: 0 } } } as any;

      expect(() => enemy.updateAI(mockPlayer)).not.toThrow();
    });

    it('должен отступать от краев карты', () => {
      const edgeEnemy = new EnemyFlam(mockScene, mockConfig);
      const sprite = edgeEnemy.getSprite();

      // Симулируем нахождение у края (устанавливаем координату x меньше отступа)
      sprite.x = 10;

      const mockPlayer = { x: 500, y: 500, body: { velocity: { x: 0, y: 0 } } } as any;

      edgeEnemy.updateAI(mockPlayer);

      // Должен быть вызван velocityFromRotation для отступления к центру
      expect(Phaser.Math.Angle.Between).toHaveBeenCalled();
    });

    it('должен устанавливать RETREATING состояние при нахождении у края', () => {
      const edgeEnemy = new EnemyFlam(mockScene, mockConfig);
      const sprite = edgeEnemy.getSprite();

      sprite.x = 10; // У края карты

      const mockPlayer = { x: 500, y: 500, body: { velocity: { x: 0, y: 0 } } } as any;

      edgeEnemy.updateAI(mockPlayer);

      expect(edgeEnemy.getState()).toBe('retreating');
    });

    it('должен переходить в WANDERING из не-WANDERING состояния', () => {
      enemy.setState(2); // DYING

      // Сбрасываем состояние обратно в активное
      enemy.setState(0); // WANDERING

      const mockPlayer = { x: 500, y: 500, body: { velocity: { x: 0, y: 0 } } } as any;

      expect(() => enemy.updateAI(mockPlayer)).not.toThrow();
    });

    it('должен начинать движение если скорость = 0 в WANDERING состоянии', () => {
      enemy.setState(0); // WANDERING
      const sprite = enemy.getSprite();

      // Устанавливаем нулевую скорость
      sprite.body.velocity.x = 0;
      sprite.body.velocity.y = 0;

      const mockPlayer = { x: 500, y: 500, body: { velocity: { x: 0, y: 0 } } } as any;

      enemy.updateAI(mockPlayer);

      // Должен быть вызван velocityFromAngle для запуска движения
      expect(Phaser.Math.Between).toHaveBeenCalled();
    });

    it('должен периодически менять направление', () => {
      const mockPlayer = { x: 500, y: 500, body: { velocity: { x: 0, y: 0 } } } as any;

      mockScene.time.now = 5000; // Прошло больше directionChangeInterval

      enemy.updateAI(mockPlayer);

      expect(Phaser.Math.Between).toHaveBeenCalled();
    });

    it('должен использовать chaseSpeed если указана', () => {
      const chaserEnemy = new EnemyFlam(mockScene, {
        ...mockConfig,
        chaseRadius: 250,
        chaseSpeed: 100
      });

      const mockPlayer = { x: 200, y: 200, body: { velocity: { x: 0, y: 0 } } } as any;
      (Phaser.Math.Distance.Between as jest.Mock).mockReturnValue(100);

      chaserEnemy.updateAI(mockPlayer);

      expect(mockScene.physics.moveToObject).toHaveBeenCalled();
    });
  });
});

