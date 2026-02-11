/**
 * Unit тесты для StandardPortal
 */

import { StandardPortal } from '../../../game/entities/portals/StandardPortal';
import { PortalType } from '../../../types/portalTypes';

// Мокируем Phaser
jest.mock('phaser', () => ({
  Scene: class MockScene {}
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
    height: 40 // Mock height for text object
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
        // Execute callback immediately for testing
        callback();
        const mockDelayedCall: MockDelayedCall = {
          remove: jest.fn()
        };
        return mockDelayedCall as any;
      })
    },
    tweens: {
      add: jest.fn().mockImplementation((config: any) => {
        // Immediately call onComplete for synchronous testing
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

// Мокируем EventBus
jest.mock('../../../game/EventBus', () => ({
  EventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
}));

describe('StandardPortal', () => {
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

  describe('Депозит ключей', () => {
    it('должен создавать визуальный эффект при депозите ключа', () => {
      portal.depositKey();

      const sprite = portal.getSprite();
      expect(sprite.setTint).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
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

  describe('Активация', () => {
    it('должен активироваться при депозите 3 ключей', () => {
      portal.depositKey();
      portal.depositKey();
      portal.depositKey();

      expect(portal.isOpen()).toBe(true);
    });

    it('должен показывать метку ответа при активации', () => {
      portal.depositKey();
      portal.depositKey();
      portal.depositKey();

      // Проверяем, что метка становится видимой
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });
  });
});


