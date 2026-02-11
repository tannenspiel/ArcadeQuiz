/**
 * Unit тесты для Player
 */

import { Player, PlayerState } from '../../../game/entities/Player';

// Мокируем Phaser для поддержки Phaser.Input.Keyboard.KeyCodes
jest.mock('phaser', () => ({
  Scene: class MockScene {},
  Input: {
    Keyboard: {
      KeyCodes: {
        W: 'W',
        S: 'S',
        A: 'A',
        D: 'D'
      }
    }
  },
  BlendModes: {
    ADD: 2,
    MULTIPLY: 1,
    SCREEN: 3,
    NORMAL: 0
  },
  Math: {
    Vector2: class MockVector2 {
      x: number;
      y: number;
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
      }
      normalize() {
        return this;
      }
      length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
      }
    },
    Between: jest.fn()
  }
}));

// TypeScript interfaces for mock scene
interface MockBody {
    velocity: { x: number; y: number };
    stop: jest.Mock;
    blocked: {
        left: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
    };
}

interface MockAnimations {
    stop: jest.Mock;
    play: jest.Mock;
    currentAnim?: any;
}

interface MockPhysicsSprite {
    setCollideWorldBounds: jest.Mock;
    setDepth: jest.Mock;
    setScale: jest.Mock;
    setVelocity: jest.Mock;
    setVelocityX: jest.Mock;
    setVelocityY: jest.Mock;
    setTexture: jest.Mock;
    setFrame: jest.Mock;
    setTint: jest.Mock;
    clearTint: jest.Mock;
    setBlendMode: jest.Mock;
    setAlpha: jest.Mock;
    setPosition: jest.Mock;
    play: jest.Mock;
    destroy: jest.Mock;
    off: jest.Mock;
    on: jest.Mock;
    once: jest.Mock;
    x: number;
    y: number;
    active: boolean;
    visible: boolean;
    body: MockBody;
    anims: MockAnimations;
    texture: { key: string };
    scene: any;
    blendMode: number;
    depth: number;
    scrollFactorX: number;
    scrollFactorY: number;
    tint: number;
    alpha: number;
}

interface MockGraphics {
    clear: jest.Mock;
    lineStyle: jest.Mock;
    moveTo: jest.Mock;
    lineTo: jest.Mock;
    beginPath: jest.Mock;
    strokePath: jest.Mock;
    setDepth: jest.Mock;
    setScrollFactor: jest.Mock;
    setVisible: jest.Mock;
    destroy: jest.Mock;
}

interface MockSprite {
    play: jest.Mock;
    setDepth: jest.Mock;
    setScale: jest.Mock;
    setScrollFactor: jest.Mock;
    destroy: jest.Mock;
    setPosition: jest.Mock;
    once: jest.Mock;
    anims?: MockAnimations;
    active?: boolean;
    scene?: any;
}

interface MockCursorKeys {
    left: { isDown: boolean };
    right: { isDown: boolean };
    up: { isDown: boolean };
    down: { isDown: boolean };
}

interface MockKeyboard {
    createCursorKeys: jest.Mock;
    addKeys: jest.Mock;
}

interface MockInput {
    keyboard?: MockKeyboard;
    on?: jest.Mock;
    enabled?: boolean;
}

interface MockTimeEvent {
    destroy: jest.Mock;
}

interface MockDelayedCall {
    remove: jest.Mock;
    destroy: jest.Mock;
}

interface MockTween {
    stop: jest.Mock;
}

interface MockTime {
    now: number;
    delayedCall: jest.Mock;
    addEvent: jest.Mock;
}

interface MockTweens {
    add: jest.Mock;
}

interface MockDevice {
    os: {
        android: boolean;
        iOS: boolean;
    };
}

interface MockGameLoop {
    delta: number;
}

interface MockGame {
    device: MockDevice;
    loop: MockGameLoop;
}

interface MockTextures {
    exists: jest.Mock;
}

interface MockAnimationsSystem {
    exists: jest.Mock;
}

interface MockCameras {
    getMain: jest.Mock;
}

interface MockScene {
    physics: {
        add: {
            sprite: jest.Mock;
        };
    };
    game: MockGame;
    textures: MockTextures;
    anims: MockAnimationsSystem;
    time: MockTime;
    tweens: MockTweens;
    input: MockInput;
    add: {
        graphics: jest.Mock;
        sprite: jest.Mock;
    };
    cameras: MockCameras;
}

// Helper function to create mock scene with all required methods
const createMockScene = (): MockScene => {
    const mockSprite: MockPhysicsSprite = {
        setCollideWorldBounds: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        setVelocity: jest.fn().mockReturnThis(),
        setVelocityX: jest.fn().mockReturnThis(),
        setVelocityY: jest.fn().mockReturnThis(),
        setTexture: jest.fn().mockReturnThis(),
        setFrame: jest.fn().mockReturnThis(),
        setTint: jest.fn().mockReturnThis(),
        clearTint: jest.fn().mockReturnThis(),
        setBlendMode: jest.fn().mockReturnThis(),
        setAlpha: jest.fn().mockReturnThis(),
        setPosition: jest.fn().mockReturnThis(),
        play: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        off: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        x: 100,
        y: 200,
        active: true,
        visible: true,
        body: {
            velocity: { x: 0, y: 0 },
            stop: jest.fn(),
            blocked: {
                left: false,
                right: false,
                up: false,
                down: false
            }
        },
        anims: {
            stop: jest.fn(),
            play: jest.fn(),
            currentAnim: undefined
        },
        texture: { key: 'player_texture' },
        scene: null,
        blendMode: 0,
        depth: 150,
        scrollFactorX: 1,
        scrollFactorY: 1,
        tint: 0xffffff,
        alpha: 1
    };

    const mockGraphics: MockGraphics = {
        clear: jest.fn().mockReturnThis(),
        lineStyle: jest.fn().mockReturnThis(),
        moveTo: jest.fn().mockReturnThis(),
        lineTo: jest.fn().mockReturnThis(),
        beginPath: jest.fn().mockReturnThis(),
        strokePath: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        setScrollFactor: jest.fn().mockReturnThis(),
        setVisible: jest.fn().mockReturnThis(),
        destroy: jest.fn()
    };

    const mockAddedSprite: MockSprite = {
        play: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        setScrollFactor: jest.fn().mockReturnThis(),
        setAlpha: jest.fn().mockReturnThis(),
        setBlendMode: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        setPosition: jest.fn().mockReturnThis(),
        once: jest.fn(),
        x: 0,
        y: 0,
        active: true,
        anims: {
            stop: jest.fn(),
            play: jest.fn()
        }
    };

    const mockCursorKeys: MockCursorKeys = {
        left: { isDown: false },
        right: { isDown: false },
        up: { isDown: false },
        down: { isDown: false }
    };

    const mockScene: MockScene = {
        physics: {
            add: {
                sprite: jest.fn().mockReturnValue(mockSprite)
            }
        },
        game: {
            device: {
                os: {
                    android: false,
                    iOS: false
                }
            },
            loop: {
                delta: 16
            }
        },
        textures: {
            exists: jest.fn().mockImplementation((key: string) => {
                // Return false for keyHoldSprite texture to prevent creation
                if (key === 'Character.KeyHold_78x26.png') {
                    return false;
                }
                return true;
            })
        },
        anims: {
            exists: jest.fn().mockReturnValue(true)
        },
        time: {
            now: 0,
            delayedCall: jest.fn().mockImplementation((delay: number, callback: () => void) => {
                if (delay === 0) {
                    callback();
                }
                const mockDelayedCall: MockDelayedCall = {
                    remove: jest.fn(),
                    destroy: jest.fn()
                };
                return mockDelayedCall;
            }),
            addEvent: jest.fn().mockReturnValue({
                destroy: jest.fn()
            })
        },
        tweens: {
            add: jest.fn().mockReturnValue({
                stop: jest.fn()
            })
        },
        input: {
            keyboard: {
                createCursorKeys: jest.fn().mockReturnValue(mockCursorKeys),
                addKeys: jest.fn().mockReturnValue(mockCursorKeys)
            },
            enabled: true
        },
        add: {
            graphics: jest.fn().mockReturnValue(mockGraphics),
            sprite: jest.fn().mockImplementation(() => {
                // Возвращаем новый mock для каждого спрайта
                return {
                    setScale: jest.fn().mockReturnThis(),
                    setDepth: jest.fn().mockReturnThis(),
                    setAlpha: jest.fn().mockReturnThis(),
                    setBlendMode: jest.fn().mockReturnThis(),
                    setPosition: jest.fn().mockReturnThis(),
                    setScrollFactor: jest.fn().mockReturnThis(),
                    destroy: jest.fn(),
                    play: jest.fn().mockReturnThis(),
                    x: 0,
                    y: 0,
                    active: true
                };
            })
        },
        cameras: {
            getMain: jest.fn().mockReturnValue({ width: 1280, height: 720 })
        }
    };

    // Set scene reference on sprite
    mockSprite.scene = mockScene;

    return mockScene;
};

// Мокируем SpriteAnimationHandler
jest.mock('../../../game/systems/SpriteAnimationHandler', () => ({
  SpriteAnimationHandler: jest.fn().mockImplementation(() => ({
    playDirectionAnimation: jest.fn(),
    syncFrame: jest.fn(),
    stop: jest.fn()
  }))
}));

// Мокируем Logger
jest.mock('../../../utils/Logger', () => ({
  logger: {
    log: jest.fn()
  }
}));

describe('Player', () => {
  let mockScene: MockScene;
  let player: Player;

  beforeEach(() => {
    mockScene = createMockScene();
    player = new Player(mockScene as any, 100, 200, 'player_texture');
  });

  describe('Инициализация', () => {
    it('должен создавать спрайт игрока', () => {
      expect(mockScene.physics.add.sprite).toHaveBeenCalledWith(100, 200, 'player_texture');
    });

    it('должен настраивать коллизии с границами мира', () => {
      const sprite = mockScene.physics.add.sprite('', 0, 0) as any;
      expect(sprite.setCollideWorldBounds).toHaveBeenCalledWith(true);
    });

    it('должен настраивать depth спрайта', () => {
      const sprite = mockScene.physics.add.sprite('', 0, 0) as any;
      expect(sprite.setDepth).toHaveBeenCalled();
    });

    it('должен настраивать масштаб спрайта', () => {
      const sprite = mockScene.physics.add.sprite('', 0, 0) as any;
      expect(sprite.setScale).toHaveBeenCalled();
    });

    it('должен настраивать клавиатурное управление', () => {
      expect(mockScene.input.keyboard?.createCursorKeys).toHaveBeenCalled();
      expect(mockScene.input.keyboard?.addKeys).toHaveBeenCalled();
    });
  });

  describe('Получение данных', () => {
    it('должен возвращать позицию игрока', () => {
      const position = player.getPosition();
      expect(position).toBeDefined();
      expect(position.x).toBe(100);
      expect(position.y).toBe(200);
    });

    it('должен возвращать спрайт игрока', () => {
      const sprite = player.getSprite();
      expect(sprite).toBeDefined();
    });
  });

  describe('Движение', () => {
    it('должен останавливать движение', () => {
      player.stop();
      const sprite = player.getSprite();
      expect(sprite.setVelocity).toHaveBeenCalledWith(0);
    });

    it('должен обновлять движение при нажатии клавиш', () => {
      const sprite = player.getSprite();
      const cursors = mockScene.input.keyboard?.createCursorKeys();
      if (cursors) {
        cursors.left.isDown = true;
      }

      player.update();

      expect(sprite.setVelocityX).toHaveBeenCalled();
    });
  });

  describe('Мобильные контролы', () => {
    it('должен настраивать touch контролы на мобильных устройствах', () => {
      const mobileScene = createMockScene();
      mobileScene.game.device.os.android = true;
      mobileScene.input.on = jest.fn();

      // ✅ Mock для add.sprite чтобы он возвращал объект с методами setActive, setVisible, etc.
      const mockSprite = {
        setActive: jest.fn().mockReturnThis(),
        setVisible: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis()
      };
      mobileScene.add.sprite = jest.fn().mockReturnValue(mockSprite);

      const mobilePlayer = new Player(mobileScene as any, 100, 200, 'player_texture');

      // ✅ Проверяем что sprite был создан
      expect(mobileScene.add.sprite).toHaveBeenCalledWith(0, 0, 'character_pointer');
      expect(mockSprite.setActive).toHaveBeenCalledWith(false);
      expect(mockSprite.setVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('Состояния игрока', () => {
    it('должен начинать с состояния IDLE', () => {
      expect(player.getState()).toBe(PlayerState.IDLE);
    });

    it('должен переходить в состояние DAMAGED при получении урона', () => {
      player.takeDamage(1, 0);
      expect(player.getState()).toBe(PlayerState.DAMAGED);
    });

    it('должен переходить в состояние LOSING_KEY при потере ключа', () => {
      player.loseKey();
      expect(player.getState()).toBe(PlayerState.LOSING_KEY);
    });

    it('должен переходить в состояние GETTING_KEY при получении ключа', () => {
      player.getKey();
      expect(player.getState()).toBe(PlayerState.GETTING_KEY);
    });

    it('должен переходить в состояние APPLYING_KEY при применении ключа', () => {
      player.applyKey();
      expect(player.getState()).toBe(PlayerState.APPLYING_KEY);
    });

    it('должен возвращаться в IDLE после завершения урона (если жив)', () => {
      player.takeDamage(1, 0);
      expect(player.getState()).toBe(PlayerState.DAMAGED);

      player.finishDamage(true);
      expect(player.getState()).toBe(PlayerState.IDLE);
    });

    it('должен переходить в DEAD после завершения урона (если мертв)', () => {
      player.takeDamage(1, 0);
      expect(player.getState()).toBe(PlayerState.DAMAGED);

      player.finishDamage(false);
      expect(player.getState()).toBe(PlayerState.DEAD);
    });
  });

  describe('Движение', () => {
    it('должен обновлять движение при нажатии клавиш', () => {
      const sprite = player.getSprite();
      const cursors = mockScene.input.keyboard?.createCursorKeys();

      if (cursors) {
        cursors.left.isDown = true;
      }

      player.update();

      expect(sprite.setVelocityX).toHaveBeenCalled();
    });

    it('должен обрабатывать отбрасывание при получении урона', () => {
      const sprite = player.getSprite();

      player.takeDamage(1, 0);

      // Проверяем, что была установлена velocity для отбрасывания
      expect(sprite.setVelocity).toHaveBeenCalled();
    });

    it('должен обновлять отбрасывание в update', () => {
      const sprite = player.getSprite();

      player.takeDamage(1, 0);

      // Симулируем прохождение времени
      mockScene.game.loop.delta = 16;

      player.update();

      // Velocity должна быть обновлена
      expect(sprite.setVelocity).toHaveBeenCalled();
    });
  });

  describe('Коллизии и взаимодействия', () => {
    it('должен применять отбрасывание при получении урона', () => {
      const sprite = player.getSprite();

      player.takeDamage(1, 0);

      // Проверяем, что была установлена velocity для отбрасывания
      expect(sprite.setVelocity).toHaveBeenCalled();
    });

    it('должен останавливать движение при потере ключа', () => {
      const sprite = player.getSprite();

      player.loseKey();

      // Движение должно быть остановлено
      expect(sprite.setVelocity).toHaveBeenCalledWith(0);
    });
  });

  describe('Очистка монет игрока (clearPlayerCoins)', () => {
    it('должен очищать все монетки игрока при вызове clearPlayerCoins', () => {
      // Симулируем наличие монеток у игрока
      // Note: Player имеет приватное свойство coinSprites, но мы не можем напрямую к нему обратиться
      // Метод clearPlayerCoins должен:
      // 1. Установить previousCoinCount = 0
      // 2. Вызвать clearCoins() для уничтожения спрайтов

      // Вызываем метод очистки
      player.clearPlayerCoins();

      // Метод должен выполниться без ошибок
      expect(player.clearPlayerCoins).toBeDefined();
    });

    it('должен корректно обрабатывать вызов clearPlayerCoins когда монеток нет', () => {
      // Вызываем очистку когда монеток нет - не должно быть ошибок
      expect(() => player.clearPlayerCoins()).not.toThrow();
    });
  });

  describe('setState', () => {
    it('должен устанавливать состояние игрока', () => {
      player.setState(PlayerState.DAMAGED);
      expect(player.getState()).toBe(PlayerState.DAMAGED);

      player.setState(PlayerState.IDLE);
      expect(player.getState()).toBe(PlayerState.IDLE);
    });
  });

  describe('applyKnockback', () => {
    it('должен применять отбрасывание', () => {
      const sprite = player.getSprite();

      player.applyKnockback(100, -50);

      // Проверяем, что скорость была установлена
      expect(sprite.setVelocity).toHaveBeenCalled();
    });

    it('должен обрабатывать нулевое направление', () => {
      expect(() => player.applyKnockback(0, 0)).not.toThrow();
    });
  });

  describe('Quiz состояния', () => {
    it('должен входить в состояние IN_QUIZ', () => {
      player.enterQuiz();
      expect(player.getState()).toBe(PlayerState.IN_QUIZ);
    });

    it('должен выходить из состояния IN_QUIZ', () => {
      player.enterQuiz();
      expect(player.getState()).toBe(PlayerState.IN_QUIZ);

      player.exitQuiz();
      expect(player.getState()).toBe(PlayerState.IDLE);
    });
  });

  describe('Portal состояния', () => {
    it('должен входить в состояние IN_PORTAL', () => {
      player.enterPortal();
      expect(player.getState()).toBe(PlayerState.IN_PORTAL);
    });

    it('должен выходить из состояния IN_PORTAL', () => {
      player.enterPortal();
      expect(player.getState()).toBe(PlayerState.IN_PORTAL);

      player.exitPortal();
      expect(player.getState()).toBe(PlayerState.IDLE);
    });
  });

  describe('setPosition', () => {
    it('должен устанавливать позицию игрока', () => {
      player.setPosition(500, 300);
      const sprite = player.getSprite();
      expect(sprite.setPosition).toHaveBeenCalledWith(500, 300);
    });

    it('должен обновлять x и y координаты', () => {
      player.setPosition(150, 250);
      const sprite = player.getSprite();
      expect(sprite.setPosition).toHaveBeenCalledWith(150, 250);
    });
  });

  describe('getX и getY', () => {
    it('должен возвращать x координату', () => {
      expect(player.getX()).toBe(100);
    });

    it('должен возвращать y координату', () => {
      expect(player.getY()).toBe(200);
    });
  });

  describe('setSpeed и getSpeed', () => {
    it('должен устанавливать скорость', () => {
      player.setSpeed(250);
      expect(player.getSpeed()).toBe(250);
    });

    it('должен возвращать скорость по умолчанию', () => {
      expect(player.getSpeed()).toBeDefined();
      expect(player.getSpeed()).toBeGreaterThan(0);
    });
  });

  describe('setInputEnabled', () => {
    it('должен отключать ввод', () => {
      expect(() => player.setInputEnabled(false)).not.toThrow();
    });

    it('должен включать ввод', () => {
      expect(() => player.setInputEnabled(true)).not.toThrow();
    });
  });

  describe('getAnimationHandler', () => {
    it('должен возвращать анимационный хендлер', () => {
      const handler = player.getAnimationHandler();
      expect(handler).toBeDefined();
    });
  });

  describe('Анимации ключей', () => {
    it('должен проигрывать анимацию потери ключа', () => {
      expect(() => player.playLoseKeyAnimation()).not.toThrow();
    });

    it('должен проигрывать анимацию получения ключа', () => {
      expect(() => player.playGetKeyAnimation()).not.toThrow();
    });

    it('должен проигрывать анимацию применения ключа', () => {
      expect(() => player.playApplyKeyAnimation()).not.toThrow();
    });
  });

  describe('updateKeyRings', () => {
    it('должен обновлять кольца ключей', () => {
      expect(() => player.updateKeyRings(0, 1, 2)).not.toThrow();
    });

    it('должен обрабатывать нулевые значения', () => {
      expect(() => player.updateKeyRings(0, 0, 0)).not.toThrow();
    });
  });

  describe('updateCoins', () => {
    it('должен обновлять монеты', () => {
      expect(() => player.updateCoins(3)).not.toThrow();
    });

    it('должен обрабатывать ноль монет', () => {
      expect(() => player.updateCoins(0)).not.toThrow();
    });
  });

  describe('updateAnimationSync', () => {
    it('должен обновлять синхронизацию анимации', () => {
      mockScene.game.loop.delta = 16;
      expect(() => player.updateAnimationSync(16)).not.toThrow();
    });
  });

  describe('reset', () => {
    it('должен сбрасывать игрока в начальное состояние', () => {
      // Изменяем состояние игрока
      player.takeDamage(1, 0);
      expect(player.getState()).toBe(PlayerState.DAMAGED);

      // Сбрасываем
      player.reset();

      // После сброса состояние должно быть IDLE
      expect(player.getState()).toBe(PlayerState.IDLE);
    });
  });

  describe('destroy', () => {
    it('должен уничтожать игрока без ошибок', () => {
      expect(() => player.destroy()).not.toThrow();
    });
  });

  describe('Граничные условия', () => {
    it('должен корректно обрабатывать множественные вызовы getState', () => {
      const state1 = player.getState();
      const state2 = player.getState();
      expect(state1).toBe(state2);
    });

    it('должен корректно обрабатывать множественные вызовы getPosition', () => {
      const pos1 = player.getPosition();
      const pos2 = player.getPosition();
      expect(pos1).toEqual(pos2);
    });

    it('должен корректно обрабатывать множественные вызовы getSprite', () => {
      const sprite1 = player.getSprite();
      const sprite2 = player.getSprite();
      expect(sprite1).toBe(sprite2);
    });
  });

  describe('Состояние DAMAGED', () => {
    it('должен корректно обрабатывать finishDamage с true', () => {
      player.takeDamage(1, 0);
      expect(player.getState()).toBe(PlayerState.DAMAGED);

      player.finishDamage(true);
      expect(player.getState()).toBe(PlayerState.IDLE);
    });

    it('должен корректно обрабатывать finishDamage с false', () => {
      player.takeDamage(1, 0);
      expect(player.getState()).toBe(PlayerState.DAMAGED);

      player.finishDamage(false);
      expect(player.getState()).toBe(PlayerState.DEAD);
    });
  });

  describe('Константы PlayerState', () => {
    it('должен экспортировать PlayerState', () => {
      expect(PlayerState.IDLE).toBeDefined();
      expect(PlayerState.MOVING).toBeDefined();
      expect(PlayerState.DAMAGED).toBeDefined();
      expect(PlayerState.DEAD).toBeDefined();
      expect(PlayerState.LOSING_KEY).toBeDefined();
      expect(PlayerState.GETTING_KEY).toBeDefined();
      expect(PlayerState.APPLYING_KEY).toBeDefined();
      expect(PlayerState.IN_QUIZ).toBeDefined();
      expect(PlayerState.IN_PORTAL).toBeDefined();
    });
  });

  // ========================================
  // Тесты для игровых механик (согласно GameDescription.md)
  // ========================================

  describe('Система монеток (Coin Phase)', () => {
    it('должен обновлять количество монеток (updateCoins)', () => {
      // Тест проверяет что метод можно вызвать без ошибок
      expect(() => player.updateCoins(0)).not.toThrow();
      expect(() => player.updateCoins(1)).not.toThrow();
      expect(() => player.updateCoins(2)).not.toThrow();
      expect(() => player.updateCoins(3)).not.toThrow();
    });

    it('должен принимать опциональные параметры позиций в updateCoins', () => {
      const heartPositions = [
        { x: 60, y: -30 },
        { x: 85, y: -30 },
        { x: 110, y: -30 }
      ];

      expect(() => player.updateCoins(2, heartPositions, 'coin_texture', 3.0)).not.toThrow();
    });

    it('должен очищать монетки игрока (clearPlayerCoins)', () => {
      // Сначала добавляем монетки
      player.updateCoins(3);

      // Затем очищаем
      expect(() => player.clearPlayerCoins()).not.toThrow();
    });

    it('должен корректно обрабатывать множественные вызовы clearPlayerCoins', () => {
      player.clearPlayerCoins();
      player.clearPlayerCoins();
      player.clearPlayerCoins();

      // Не должно быть ошибок
      expect(() => player.clearPlayerCoins()).not.toThrow();
    });

    it('должен обрабатывать updateCoins с разным количеством', () => {
      const coinCounts = [0, 1, 2, 3];

      coinCounts.forEach(count => {
        expect(() => player.updateCoins(count)).not.toThrow();
      });
    });
  });

  describe('Система колец ключей (KeyRings)', () => {
    it('должен обновлять кольца ключей (updateKeyRings)', () => {
      expect(() => player.updateKeyRings(0, 1, 2)).not.toThrow();
      expect(() => player.updateKeyRings(1, 1, 2)).not.toThrow();
      expect(() => player.updateKeyRings(2, 1, 2)).not.toThrow();
      expect(() => player.updateKeyRings(3, 1, 2)).not.toThrow();
    });

    it('должен ограничивать количество колец до 3', () => {
      // Даже если передать больше 3, должно обрабатываться корректно
      expect(() => player.updateKeyRings(5, 1, 2)).not.toThrow();
    });

    it('должен обрабатывать нулевое количество ключей', () => {
      expect(() => player.updateKeyRings(0, 0, 0)).not.toThrow();
    });
  });

  describe('Игровые механики согласно GameDescription.md', () => {
    it('должен переходить в LOSING_KEY состояние при потере ключа (loseKey)', () => {
      player.loseKey();
      expect(player.getState()).toBe(PlayerState.LOSING_KEY);
    });

    it('должен переходить в GETTING_KEY состояние при получении ключа (getKey)', () => {
      player.getKey();
      expect(player.getState()).toBe(PlayerState.GETTING_KEY);
    });

    it('должен переходить в APPLYING_KEY состояние при применении ключа (applyKey)', () => {
      player.applyKey();
      expect(player.getState()).toBe(PlayerState.APPLYING_KEY);
    });

    describe('Машина состояний - последовательность сбора ключа', () => {
      it('должен корректно обрабатывать полный цикл получения ключа', () => {
        // IDLE → GETTING_KEY
        player.getKey();
        expect(player.getState()).toBe(PlayerState.GETTING_KEY);

        // После завершения анимации возвращаемся в IDLE
        player.setState(PlayerState.IDLE);

        // Применяем ключ
        player.applyKey();
        expect(player.getState()).toBe(PlayerState.APPLYING_KEY);
      });
    });
  });

  describe('Синхронизация анимации', () => {
    it('должен обновлять синхронизацию анимации (updateAnimationSync)', () => {
      mockScene.game.loop.delta = 16;
      expect(() => player.updateAnimationSync(16)).not.toThrow();
    });

    it('должен обрабатывать разные значения delta', () => {
      const deltas = [8, 16, 32, 64];

      deltas.forEach(delta => {
        mockScene.game.loop.delta = delta;
        expect(() => player.updateAnimationSync(delta)).not.toThrow();
      });
    });
  });

  describe('Анимации ключей и состояний', () => {
    it('должен проигрывать анимацию потери ключа', () => {
      expect(() => player.playLoseKeyAnimation()).not.toThrow();
    });

    it('должен проигрывать анимацию получения ключа', () => {
      expect(() => player.playGetKeyAnimation()).not.toThrow();
    });

    it('должен проигрывать анимацию применения ключа', () => {
      expect(() => player.playApplyKeyAnimation()).not.toThrow();
    });
  });

  describe('Ввод и управление', () => {
    it('должен включать и выключать ввод (setInputEnabled)', () => {
      player.setInputEnabled(false);
      player.setInputEnabled(true);

      // Проверка что методы выполняются без ошибок
      expect(() => player.setInputEnabled(false)).not.toThrow();
    });
  });

  describe('Позиция и скорость', () => {
    it('должен возвращать корректные координаты', () => {
      expect(player.getX()).toBe(100);
      expect(player.getY()).toBe(200);
    });

    it('должен устанавливать и возвращать скорость', () => {
      player.setSpeed(250);
      expect(player.getSpeed()).toBe(250);

      player.setSpeed(300);
      expect(player.getSpeed()).toBe(300);
    });

    it('должен возвращать дефолтную скорость', () => {
      const defaultSpeed = player.getSpeed();
      expect(defaultSpeed).toBeGreaterThan(0);
      expect(typeof defaultSpeed).toBe('number');
    });
  });

  describe('Анимационный хендлер', () => {
    it('должен возвращать анимационный хендлер', () => {
      const handler = player.getAnimationHandler();
      expect(handler).toBeDefined();
    });

    it('должен возвращать один и тот же хендлер при многократных вызовах', () => {
      const handler1 = player.getAnimationHandler();
      const handler2 = player.getAnimationHandler();
      expect(handler1).toBe(handler2);
    });
  });

  describe('Интеграционные сценарии согласно GameDescription.md', () => {
    it('должен корректно обрабатывать сценарий полного игрового цикла', () => {
      // 1. Игрок собирает монетку (показываются мон acreтки)
      player.updateCoins(1);

      // 2. Игрок отвечает на вопрос (переходит в IN_QUIZ)
      player.enterQuiz();
      expect(player.getState()).toBe(PlayerState.IN_QUIZ);

      // 3. Игрок завершает квиз (выходит из IN_QUIZ)
      player.exitQuiz();
      expect(player.getState()).toBe(PlayerState.IDLE);

      // 4. Игрок получает ключ (GETTING_KEY)
      player.getKey();
      expect(player.getState()).toBe(PlayerState.GETTING_KEY);

      // 5. Игрок применяет ключ (APPLYING_KEY)
      player.setState(PlayerState.IDLE); // Сброс состояния
      player.applyKey();
      expect(player.getState()).toBe(PlayerState.APPLYING_KEY);

      // 6. Игрок получает урон (DAMAGED)
      player.setState(PlayerState.IDLE); // Сброс состояния
      player.takeDamage(1, 0);
      expect(player.getState()).toBe(PlayerState.DAMAGED);

      // 7. Игрок выживает (возврат в IDLE)
      player.finishDamage(true);
      expect(player.getState()).toBe(PlayerState.IDLE);
    });

    it('должен корректно обрабатывать сценарий смерти игрока', () => {
      // Игрок получает урон
      player.takeDamage(1, 0);
      expect(player.getState()).toBe(PlayerState.DAMAGED);

      // Игрок умирает
      player.finishDamage(false);
      expect(player.getState()).toBe(PlayerState.DEAD);
    });
  });

  // ================================================
  // ✅ НОВЫЕ ТЕСТЫ: Золотые сердечки (Gold Hearts)
  // ================================================
  describe('Система золотых сердечек согласно GOLDEN_HEARTS_SYSTEM.md', () => {
    // Заметка: updateGoldHearts() - приватный метод, тестируем через updateCoins

    it('должен принимать параметры для updateCoins (аналог goldHearts)', () => {
      // updateCoins использует ту же логику, что и updateGoldHearts
      expect(() => player.updateCoins(1, [{ x: 60, y: -30 }], 'UI.UI_Inventory5x5_0', 3.0)).not.toThrow();
    });

    it('должен корректно работать с максимальным количеством (3 мон acreтки)', () => {
      // Согласно GOLDEN_HEARTS_SYSTEM.md - максимум 3 сердечка
      const positions = [
        { x: 60, y: -30 },
        { x: 85, y: -30 },
        { x: 110, y: -30 }
      ];

      expect(() => player.updateCoins(3, positions, 'UI.UI_Inventory5x5_0', 3.0)).not.toThrow();
    });

    it('должен корректно работать с 0 монеток', () => {
      expect(() => player.updateCoins(0, [], 'UI.UI_Inventory5x5_0', 3.0)).not.toThrow();
    });

    it('должен корректно работать с 1 монеткой', () => {
      expect(() => player.updateCoins(1, [{ x: 60, y: -30 }], 'UI.UI_Inventory5x5_0', 3.0)).not.toThrow();
    });

    it('должен корректно работать с 2 монетками', () => {
      const positions = [
        { x: 60, y: -30 },
        { x: 85, y: -30 }
      ];

      expect(() => player.updateCoins(2, positions, 'UI.UI_Inventory5x5_0', 3.0)).not.toThrow();
    });
  });
});
