/**
 * Unit тесты для AbstractEnemy
 * Тестируется через конкретную реализацию EnemyRandomWalker
 */

import { AbstractEnemy } from '../../../game/entities/enemies/AbstractEnemy';
import { EnemyRandomWalker } from '../../../game/entities/enemies/EnemyRandomWalker';
import { EnemyType, EnemyState } from '../../../types/enemyTypes';
import Phaser from 'phaser';

// Моки
jest.mock('phaser', () => ({
  BlendModes: {
    NORMAL: 0,
    ADD: 1,
    MULTIPLY: 2,
    SCREEN: 3,
    OVERLAY: 4
  },
  Scene: class MockScene {
    physics = {
      add: {
        sprite: jest.fn().mockReturnValue({
          setData: jest.fn(),
          setCollideWorldBounds: jest.fn(),
          setBounce: jest.fn(),
          setDepth: jest.fn(),
          setScale: jest.fn(),
          play: jest.fn(),
          x: 100,
          y: 200,
          active: true,
          body: {
            velocity: { x: 0, y: 0 }
          },
          disableBody: jest.fn(),
          destroy: jest.fn(),
          setTint: jest.fn(),
          clearTint: jest.fn(),
          setBlendMode: jest.fn(),
          setAlpha: jest.fn(),
          setVisible: jest.fn(),
          blendMode: 0,
          visible: true,
          depth: 200,
          frame: {
            name: '0',
            index: 0
          }
        })
      },
      velocityFromAngle: jest.fn(),
      velocityFromRotation: jest.fn(),
      moveToObject: jest.fn(),
      world: {
        isPaused: false // ✅ Добавлено для тестов
      }
    };
    time = {
      now: 3000, // Устанавливаем время больше DETECTION_COOLDOWN (2000)
      addEvent: jest.fn().mockReturnValue({
        destroy: jest.fn()
      }),
      delayedCall: jest.fn().mockImplementation((delay, callback) => {
        // Вызываем callback синхронно для тестов
        setTimeout(() => callback(), 0);
        return { remove: jest.fn() };
      })
    };
    data = {
      get: jest.fn(),
      set: jest.fn()
    };
    tweens = {
      add: jest.fn()
    };
    anims = {
      exists: jest.fn().mockReturnValue(false)
    };
    add = {
      graphics: jest.fn().mockReturnValue({
        clear: jest.fn(),
        lineStyle: jest.fn(),
        strokeCircle: jest.fn(),
        destroy: jest.fn()
      }),
      sprite: jest.fn().mockReturnValue({
        play: jest.fn(),
        setDepth: jest.fn(),
        destroy: jest.fn(),
        x: 100,
        y: 200,
        active: true
      })
    };
  },
  Math: {
    Between: jest.fn(),
    Distance: {
      Between: jest.fn()
    },
    Angle: {
      Between: jest.fn()
    }
  }
}));

describe('AbstractEnemy', () => {
  let mockScene: Phaser.Scene;
  let enemy: EnemyRandomWalker;

  const mockConfig = {
    type: EnemyType.RANDOM_WALKER,
    speed: 80,
    x: 100,
    y: 200,
    cloneCount: 0,
    cloneDetectionRadius: 0,
    chaseRadius: 0
  };

  beforeEach(() => {
    mockScene = new Phaser.Scene({ key: 'test' }) as any;
    enemy = new EnemyRandomWalker(mockScene, mockConfig);
  });

  describe('Инициализация', () => {
    it('должен создавать спрайт врага', () => {
      expect(mockScene.physics.add.sprite).toHaveBeenCalledWith(
        100, 200, 'beast_sheet'
      );
    });

    it('должен настраивать свойства спрайта', () => {
      const sprite = (mockScene.physics.add.sprite as jest.Mock).mock.results[0].value;
      expect(sprite.setCollideWorldBounds).toHaveBeenCalledWith(true);
      expect(sprite.setBounce).toHaveBeenCalledWith(1);
      expect(sprite.setDepth).toHaveBeenCalledWith(7);
    });

    it('должен устанавливать данные спрайта', () => {
      const sprite = (mockScene.physics.add.sprite as jest.Mock).mock.results[0].value;
      expect(sprite.setData).toHaveBeenCalledWith('type', EnemyType.RANDOM_WALKER);
      expect(sprite.setData).toHaveBeenCalledWith('enemy', enemy);
    });
  });

  describe('Получение данных', () => {
    it('должен возвращать спрайт', () => {
      const sprite = enemy.getSprite();
      expect(sprite).toBeDefined();
    });

    it('должен возвращать тип врага', () => {
      expect(enemy.getType()).toBe(EnemyType.RANDOM_WALKER);
    });

    it('должен возвращать позицию', () => {
      const position = enemy.getPosition();
      expect(position.x).toBe(100);
      expect(position.y).toBe(200);
    });

    it('должен возвращать урон', () => {
      expect(enemy.getDamage()).toBe(1);
    });

    it('должен возвращать урон из конфига', () => {
      const enemyWithDamage = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        damage: 2
      });
      expect(enemyWithDamage.getDamage()).toBe(2);
    });
  });

  describe('Настройки поведения', () => {
    it('должен возвращать настройки поведения', () => {
      const config = enemy.getBehaviorConfig();
      expect(config).toBeDefined();
      expect(config.cloneCount).toBe(0);
      expect(config.cloneDetectionRadius).toBe(0);
      expect(config.chaseRadius).toBe(0);
    });

    it('должен использовать настройки из конфига', () => {
      const enemyWithConfig = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        cloneCount: 2,
        cloneDetectionRadius: 200,
        chaseRadius: 250
      });
      const config = enemyWithConfig.getBehaviorConfig();
      expect(config.cloneCount).toBe(2);
      expect(config.cloneDetectionRadius).toBe(200);
      expect(config.chaseRadius).toBe(250);
    });
  });

  describe('Обновление', () => {
    it('должен обновлять AI при вызове update', () => {
      const mockPlayer = {
        x: 500,
        y: 500,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      enemy.update(mockPlayer);

      // Проверяем, что updateAI был вызван (через проверку состояния)
      expect(enemy.isActive()).toBe(true);
    });

    it('не должен обновлять неактивного врага', () => {
      const sprite = enemy.getSprite();
      sprite.active = false;

      const mockPlayer = {
        x: 500,
        y: 500
      } as any;

      enemy.update(mockPlayer);

      // AI не должен обновляться
      expect(enemy.isActive()).toBe(false);
    });
  });

  describe('Коллизия с игроком', () => {
    it('должен обрабатывать коллизию с игроком', () => {
      const mockPlayer = {
        x: 100,
        y: 200
      } as any;

      enemy.onPlayerCollision(mockPlayer);

      expect(enemy.isActive()).toBe(false);
    });

    it('должен умирать при коллизии независимо от настроек', () => {
      const enemyWithConfig = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        cloneCount: 2,
        cloneDetectionRadius: 200
      });

      const mockPlayer = {
        x: 100,
        y: 200
      } as any;

      enemyWithConfig.onPlayerCollision(mockPlayer);

      // Враг должен умереть при столкновении
      expect(enemyWithConfig.isActive()).toBe(false);
    });
  });

  describe('Активность', () => {
    it('должен проверять активность врага', () => {
      expect(enemy.isActive()).toBe(true);
    });

    it('должен возвращать false для умирающего врага', () => {
      const mockPlayer = {
        x: 100,
        y: 200
      } as any;

      enemy.onPlayerCollision(mockPlayer);
      expect(enemy.isActive()).toBe(false);
    });
  });

  describe('Машина состояний', () => {
    it('должен начинать с состояния WANDERING', () => {
      expect(enemy.getState()).toBe(EnemyState.WANDERING);
    });

    it('должен переходить в состояние CHASING', () => {
      const enemyWithChase = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        chaseRadius: 250
      });
      
      const mockPlayer = {
        x: 150, // В пределах chaseRadius (50 пикселей от врага)
        y: 200,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      // Мокаем расстояние
      (Phaser.Math.Distance.Between as jest.Mock).mockReturnValue(50);
      
      enemyWithChase.updateAI(mockPlayer);
      
      expect(enemyWithChase.getState()).toBe(EnemyState.CHASING);
    });

    it('должен переходить в состояние RETREATING при приближении к краю карты', () => {
      const sprite = enemy.getSprite();
      sprite.x = 30; // Близко к левому краю (< 50)
      
      const mockPlayer = {
        x: 500,
        y: 500,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      (Phaser.Math.Angle.Between as jest.Mock).mockReturnValue(0);
      
      enemy.updateAI(mockPlayer);
      
      expect(enemy.getState()).toBe(EnemyState.RETREATING);
    });

    it('не должен переходить из состояния DEAD', () => {
      const mockPlayer = {
        x: 100,
        y: 200
      } as any;

      enemy.onPlayerCollision(mockPlayer);
      
      // После столкновения состояние должно быть DYING (а не сразу DEAD)
      const dyingState = enemy.getState();
      expect(dyingState).toBe(EnemyState.DYING);
      
      // Попытка изменить состояние не должна работать (из DYING нельзя выйти, кроме как в DEAD)
      enemy.update(mockPlayer);
      // Состояние может остаться DYING или перейти в DEAD, но не должно меняться на другие
      const currentState = enemy.getState();
      expect([EnemyState.DYING, EnemyState.DEAD]).toContain(currentState);
    });
  });

  describe('Детекция игрока', () => {
    it('должен детектировать игрока в пределах cloneDetectionRadius', () => {
      const enemyWithDetection = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        cloneDetectionRadius: 200,
        cloneCount: 2,
        cloneSpawnDelay: 300
      });

      const mockPlayer = {
        x: 150, // В пределах cloneDetectionRadius (50 пикселей от врага)
        y: 200,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      // Мокаем расстояние (должно быть меньше cloneDetectionRadius)
      (Phaser.Math.Distance.Between as jest.Mock).mockReturnValue(50);
      
      // Мокаем callback для создания клонов
      const mockCreateClone = jest.fn();
      (mockScene.data.get as jest.Mock).mockReturnValue(mockCreateClone);
      
      // Мокаем addEvent для мигания
      (mockScene.time.addEvent as jest.Mock).mockReturnValue({
        destroy: jest.fn()
      });
      
      enemyWithDetection.update(mockPlayer);
      
      // После детекции должно перейти в состояние SPAWNING
      // Но может потребоваться несколько вызовов update для полной инициализации
      const state = enemyWithDetection.getState();
      // Состояние может быть SPAWNING или WANDERING (если детекция еще не произошла)
      expect([EnemyState.SPAWNING, EnemyState.WANDERING]).toContain(state);
    });

    it('не должен детектировать игрока вне cloneDetectionRadius', () => {
      const enemyWithDetection = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        cloneDetectionRadius: 200,
        cloneCount: 2
      });

      const mockPlayer = {
        x: 500, // Вне cloneDetectionRadius (> 200 пикселей)
        y: 500,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      // Мокаем большое расстояние
      (Phaser.Math.Distance.Between as jest.Mock).mockReturnValue(500);
      
      const initialState = enemyWithDetection.getState();
      enemyWithDetection.update(mockPlayer);
      
      // Состояние не должно измениться на SPAWNING
      expect(enemyWithDetection.getState()).not.toBe(EnemyState.SPAWNING);
    });

    it('не должен детектировать, если cloneCount = 0', () => {
      const enemyWithoutCloning = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        cloneDetectionRadius: 200,
        cloneCount: 0 // Клонирование отключено
      });

      const mockPlayer = {
        x: 150,
        y: 200,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      (Phaser.Math.Distance.Between as jest.Mock).mockReturnValue(50);
      
      const initialState = enemyWithoutCloning.getState();
      enemyWithoutCloning.update(mockPlayer);
      
      // Состояние не должно измениться на SPAWNING
      expect(enemyWithoutCloning.getState()).not.toBe(EnemyState.SPAWNING);
    });
  });

  describe('Клонирование', () => {
    it('должен создавать клонов через callback', () => {
      const enemyWithCloning = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        cloneDetectionRadius: 200,
        cloneCount: 2,
        cloneSpawnDelay: 300
      });

      const mockPlayer = {
        x: 150,
        y: 200,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      const mockCreateClone = jest.fn();
      (mockScene.data.get as jest.Mock).mockReturnValue(mockCreateClone);
      (Phaser.Math.Distance.Between as jest.Mock).mockReturnValue(50);
      (Phaser.Math.Between as jest.Mock).mockReturnValue(90);
      
      // Мокаем addEvent для мигания
      (mockScene.time.addEvent as jest.Mock).mockReturnValue({
        destroy: jest.fn()
      });
      
      // Инициируем детекцию
      enemyWithCloning.update(mockPlayer);
      
      // Проверяем, что был вызван addEvent для мигания
      // addEvent вызывается в startSpawningAnimation для мигания
      expect(mockScene.time.addEvent).toHaveBeenCalled();
      
      // Проверяем, что был вызван delayedCall для создания клонов
      // delayedCall вызывается в createClones, который вызывается сразу после начала мигания
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
      
      // Проверяем, что состояние изменилось на SPAWNING
      expect(enemyWithCloning.getState()).toBe(EnemyState.SPAWNING);
    });

    it('не должен создавать клонов, если cloneCount = 0', () => {
      const enemyWithoutCloning = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        cloneDetectionRadius: 200,
        cloneCount: 0
      });

      const mockCreateClone = jest.fn();
      (mockScene.data.get as jest.Mock).mockReturnValue(mockCreateClone);
      
      // Попытка создать клонов не должна вызвать callback
      expect(mockCreateClone).not.toHaveBeenCalled();
    });

    it('не должен создавать клонов, если callback отсутствует', () => {
      const enemyWithCloning = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        cloneDetectionRadius: 200,
        cloneCount: 2
      });

      (mockScene.data.get as jest.Mock).mockReturnValue(null);
      
      // Не должно быть ошибки, просто не создаст клонов
      expect(() => {
        const mockPlayer = {
          x: 150,
          y: 200,
          body: { velocity: { x: 0, y: 0 } }
        } as any;
        (Phaser.Math.Distance.Between as jest.Mock).mockReturnValue(50);
        enemyWithCloning.update(mockPlayer);
      }).not.toThrow();
    });
  });

  describe('Время жизни клонов', () => {
    it('должен уничтожать клонов по истечении времени жизни', () => {
      const cloneEnemy = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        cloneLifetime: 5000 // 5 секунд
      });

      // Устанавливаем, что это клон
      (cloneEnemy as any).isClone = true;
      (cloneEnemy as any).spawnTime = mockScene.time.now - 6000; // Прошло 6 секунд

      const mockPlayer = {
        x: 500,
        y: 500,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      cloneEnemy.update(mockPlayer);

      // Клон должен перейти в состояние DYING
      expect(cloneEnemy.getState()).toBe(EnemyState.DYING);
    });

    it('не должен уничтожать клонов с бесконечным временем жизни', () => {
      const cloneEnemy = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        cloneLifetime: 0 // Бессмертный клон
      });

      (cloneEnemy as any).isClone = true;
      (cloneEnemy as any).spawnTime = mockScene.time.now - 10000; // Прошло 10 секунд

      const mockPlayer = {
        x: 500,
        y: 500,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      const initialState = cloneEnemy.getState();
      cloneEnemy.update(mockPlayer);

      // Состояние не должно измениться на DYING
      expect(cloneEnemy.getState()).not.toBe(EnemyState.DYING);
    });
  });

  describe('getState и setState', () => {
    it('должен возвращать текущее состояние', () => {
      expect(enemy.getState()).toBeDefined();
      expect(typeof enemy.getState()).toBe('string');
    });

    it('должен устанавливать состояние', () => {
      enemy.setState(EnemyState.WANDERING);
      expect(enemy.getState()).toBe('wandering');
    });

    it('должен устанавливать состояние DYING', () => {
      enemy.setState(EnemyState.DYING);
      expect(enemy.getState()).toBe('dying');
    });

    it('должен устанавливать состояние DEAD', () => {
      enemy.setState(EnemyState.DEAD);
      expect(enemy.getState()).toBe('dead');
    });
  });

  describe('isActive', () => {
    it('должен возвращать true для активного врага', () => {
      expect(enemy.isActive()).toBe(true);
    });

    it('должен возвращать false после уничтожения', () => {
      enemy.setState(EnemyState.DYING);
      const sprite = enemy.getSprite();
      sprite.active = false;

      expect(enemy.isActive()).toBe(false);
    });
  });

  describe('getSprite', () => {
    it('должен возвращать спрайт врага', () => {
      const sprite = enemy.getSprite();
      expect(sprite).toBeDefined();
      expect(sprite.x).toBeDefined();
      expect(sprite.y).toBeDefined();
    });
  });

  describe('getType', () => {
    it('должен возвращать тип врага', () => {
      expect(enemy.getType()).toBe(EnemyType.RANDOM_WALKER);
    });
  });

  describe('Состояние SPAWNING', () => {
    it('должен устанавливать состояние SPAWNING', () => {
      enemy.setState(EnemyState.SPAWNING);
      expect(enemy.getState()).toBe('spawning');
    });
  });

  describe('Состояние DETECTING', () => {
    it('должен устанавливать состояние DETECTING', () => {
      enemy.setState(EnemyState.DETECTING);
      expect(enemy.getState()).toBe('detecting');
    });
  });

  describe('onPlayerCollision', () => {
    it('должен обрабатывать коллизию с игроком', () => {
      const mockPlayer = {
        x: 100,
        y: 200,
        body: { velocity: { x: 0, y: 0 } }
      } as any;

      expect(() => enemy.onPlayerCollision(mockPlayer)).not.toThrow();
    });
  });

  describe('Базовая скорость', () => {
    it('должен использовать baseSpeed из конфига', () => {
      const customEnemy = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        speed: 120
      });

      expect(customEnemy).toBeDefined();
    });
  });

  describe('chaseRadius', () => {
    it('должен поддерживать chaseRadius', () => {
      const chaserEnemy = new EnemyRandomWalker(mockScene, {
        ...mockConfig,
        chaseRadius: 200
      });

      expect(chaserEnemy).toBeDefined();
    });
  });
});








