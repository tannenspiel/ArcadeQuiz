/**
 * Unit тесты для AbstractPortal
 * Тестируется через конкретную реализацию StandardPortal
 */

import { StandardPortal } from '../../../game/entities/portals/StandardPortal';
import { PortalType, PortalState } from '../../../types/portalTypes';

// Мокируем Phaser
jest.mock('phaser', () => ({
  Scene: class MockScene {},
  Events: {
    EventEmitter: class MockEventEmitter {}
  }
}));

// Мокируем EventBus
jest.mock('../../../game/EventBus', () => ({
  EventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
}));

// TypeScript interfaces for mock scene
interface MockBody {
  immovable: boolean;
  pushable: boolean;
}

interface MockAnimations {
  stop: jest.Mock;
  play: jest.Mock;
  isPlaying: boolean;
}

interface MockPhysicsSprite {
  setData: jest.Mock;
  setImmovable: jest.Mock;
  setPushable: jest.Mock;
  setDepth: jest.Mock;
  setScale: jest.Mock;
  setTexture: jest.Mock;
  setFrame: jest.Mock;
  setTint: jest.Mock;
  clearTint: jest.Mock;
  setAlpha: jest.Mock;
  play: jest.Mock;
  on: jest.Mock;
  off: jest.Mock;
  once: jest.Mock;
  setInteractive: jest.Mock;
  disableInteractive: jest.Mock;
  x: number;
  y: number;
  body: MockBody;
  anims: MockAnimations;
}

interface MockTextObject {
  setOrigin: jest.Mock;
  setVisible: jest.Mock;
  setDepth: jest.Mock;
  setText: jest.Mock;
  setColor: jest.Mock;
  destroy: jest.Mock;
  height: number;
}

interface MockTextures {
  exists: jest.Mock;
}

interface MockAnimationsSystem {
  exists: jest.Mock;
}

interface MockDelayedCall {
  remove: jest.Mock;
}

interface MockTime {
  now: number;
  delayedCall: jest.Mock;
}

interface MockTween {
  destroy: jest.Mock;
}

interface MockTweens {
  add: jest.Mock;
}

interface MockScene {
  physics: {
    add: {
      sprite: jest.Mock;
    };
  };
  add: {
    text: jest.Mock;
  };
  textures: MockTextures;
  anims: MockAnimationsSystem;
  time: MockTime;
  tweens: MockTweens;
}

// Helper function to create mock scene with all required methods
const createMockScene = (): MockScene => {
  const mockSprite: MockPhysicsSprite = {
    setData: jest.fn().mockReturnThis(),
    setImmovable: jest.fn().mockReturnThis(),
    setPushable: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    setScale: jest.fn().mockReturnThis(),
    setTexture: jest.fn().mockReturnThis(),
    setFrame: jest.fn().mockReturnThis(),
    setTint: jest.fn().mockReturnThis(),
    clearTint: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
    play: jest.fn().mockReturnThis(),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    setInteractive: jest.fn().mockReturnThis(),
    disableInteractive: jest.fn().mockReturnThis(),
    x: 100,
    y: 200,
    body: {
      immovable: false,
      pushable: false
    },
    anims: {
      stop: jest.fn(),
      play: jest.fn(),
      isPlaying: false
    }
  };

  const mockText: MockTextObject = {
    setOrigin: jest.fn().mockReturnThis(),
    setVisible: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    setText: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    height: 40
  };

  const mockScene: MockScene = {
    physics: {
      add: {
        sprite: jest.fn().mockReturnValue(mockSprite)
      }
    },
    add: {
      text: jest.fn().mockReturnValue(mockText)
    },
    textures: {
      exists: jest.fn().mockReturnValue(true)
    },
    anims: {
      exists: jest.fn().mockReturnValue(true)
    },
    time: {
      now: 0,
      delayedCall: jest.fn().mockImplementation((delay: number, callback: () => void) => {
        callback();
        const mockDelayedCall: MockDelayedCall = {
          remove: jest.fn()
        };
        return mockDelayedCall as any;
      })
    },
    tweens: {
      add: jest.fn().mockImplementation((config: any) => {
        if (config.onComplete) {
          config.onComplete();
        }
        const mockTween: MockTween = {
          destroy: jest.fn()
        };
        return mockTween as any;
      })
    }
  };

  return mockScene;
};

describe('AbstractPortal', () => {
  let mockScene: MockScene;
  let portal: StandardPortal;

  const mockConfig = {
    id: 1,
    type: PortalType.STANDARD,
    isCorrect: true,
    answerText: 'Mars'
  };

  beforeEach(() => {
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockScene = createMockScene();
    portal = new StandardPortal(mockScene as any, mockConfig, 100, 200);
  });

  afterEach(() => {
    // Restore console logs
    jest.restoreAllMocks();
  });

  describe('Инициализация', () => {
    it('должен создавать спрайт портала', () => {
      expect(mockScene.physics.add.sprite).toHaveBeenCalledWith(
        100, 200, expect.any(String)
      );
    });

    it('должен настраивать свойства спрайта', () => {
      const sprite = (mockScene.physics.add.sprite as jest.Mock).mock.results[0].value;
      expect(sprite.setImmovable).toHaveBeenCalledWith(true);
      expect(sprite.setPushable).toHaveBeenCalledWith(false);
      expect(sprite.setDepth).toHaveBeenCalledWith(0);
    });

    it('должен создавать метки портала', () => {
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('должен получать урон из конфига', () => {
      const portalWithDamage = new StandardPortal(mockScene as any, {
        ...mockConfig,
        damage: 2
      }, 100, 200);
      expect(portalWithDamage.getDamage()).toBe(2);
    });

    it('должен использовать урон по умолчанию (1)', () => {
      expect(portal.getDamage()).toBe(1);
    });
  });

  describe('Состояние портала', () => {
    it('должен начинать с закрытым состоянием', () => {
      expect(portal.isOpen()).toBe(false);
      expect(portal.isActivating()).toBe(false);
    });

    it('должен возвращать конфигурацию', () => {
      const config = portal.getConfig();
      expect(config.id).toBe(1);
      expect(config.isCorrect).toBe(true);
    });

    it('должен возвращать состояние', () => {
      const state = portal.getState();
      expect(state).toBe(PortalState.BASE);
      expect(portal.getStoredKeys()).toBe(0);
    });
  });

  describe('Депозит ключей', () => {
    it('должен увеличивать количество ключей при депозите', () => {
      portal.depositKey();
      
      expect(portal.getStoredKeys()).toBe(1);
      expect(portal.getState()).toBe(PortalState.ACTIVATING);
    });

    it('должен переходить в правильные состояния при депозите ключей', () => {
      portal.depositKey();
      expect(portal.getState()).toBe(PortalState.ACTIVATING);
      
      portal.depositKey();
      expect(portal.getState()).toBe(PortalState.ACTIVATING);
      
      portal.depositKey();
      // После третьего ключа портал сразу переходит в ACTIVATED через delayedCall
      expect(portal.getState()).toBe(PortalState.ACTIVATED);
    });

    it('должен активировать портал при 3 ключах', () => {
      portal.depositKey();
      portal.depositKey();
      portal.depositKey();

      // После третьего ключа портал сразу переходит в ACTIVATED через delayedCall
      expect(portal.getStoredKeys()).toBe(3);
      expect(portal.getState()).toBe(PortalState.ACTIVATED);
    });

    it('не должен принимать ключи, если портал уже активирован', () => {
      portal.depositKey();
      portal.depositKey();
      portal.depositKey(); // Активирует портал (после задержки)

      const keysBefore = portal.getStoredKeys();
      portal.depositKey();
      const keysAfter = portal.getStoredKeys();

      expect(keysAfter).toBe(keysBefore);
    });
  });

  describe('Вход в портал', () => {
    it('должен возвращать true для правильного портала', () => {
      const correctPortal = new StandardPortal(mockScene as any, {
        ...mockConfig,
        isCorrect: true
      }, 100, 200);

      expect(correctPortal.onEnter()).toBe(true);
    });

    it('должен возвращать false для неправильного портала', () => {
      const wrongPortal = new StandardPortal(mockScene as any, {
        ...mockConfig,
        isCorrect: false
      }, 100, 200);

      expect(wrongPortal.onEnter()).toBe(false);
    });
  });

  describe('Флаг mustExit', () => {
    it('должен устанавливать флаг mustExit', () => {
      portal.setMustExit();
      expect(portal.mustExit()).toBe(true);
    });

    it('должен сбрасывать флаг mustExit', () => {
      portal.setMustExit();
      portal.resetMustExit();
      expect(portal.mustExit()).toBe(false);
    });
  });
});


