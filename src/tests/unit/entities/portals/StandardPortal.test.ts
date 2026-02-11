/**
 * Unit тесты для StandardPortal
 */

import { StandardPortal } from '../../../../game/entities/portals/StandardPortal';
import { PortalType, PortalConfig } from '../../../../types/portalTypes';

jest.mock('phaser', () => {
  // Mock EventEmitter
  class MockEventEmitter {
    on() { return this; }
    off() { return this; }
    emit() { return this; }
    once() { return this; }
    removeAllListeners() {}
  }

  // Mock Text
  class MockText {
    x = 0;
    y = 0;
    text = '';
    style = {};
    originX = 0.5;
    originY = 0.5;
    visible = true;
    active = true;
    depth = 0;
    alpha = 1;
    scale = 1;
    displayWidth = 100;
    displayHeight = 20;
    width = 100;
    height = 20;

    setText(text: string) { this.text = text; return this; }
    setOrigin(x: number, y?: number) {
      this.originX = x;
      this.originY = y ?? x;
      return this;
    }
    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    setAlpha(alpha: number) { this.alpha = alpha; return this; }
    setScale(x: number, y?: number) {
      this.scale = x;
      return this;
    }
    setFontSize(size: string | number) { return this; }
    setFontFamily(family: string) { return this; }
    setFontStyle(style: string) { return this; }
    setColor(color: string) { return this; }
    setStroke(color: string, thickness: number) { return this; }
    destroy() { this.active = false; return this; }
  }

  // Mock Container
  class MockContainer {
    x = 0;
    y = 0;
    visible = true;
    active = true;
    depth = 0;
    alpha = 1;
    private children: any[] = [];

    add(child: any) {
      this.children.push(child);
      return child;
    }
    getChildren() { return this.children; }
    setX(x: number) { this.x = x; return this; }
    setY(y: number) { this.y = y; return this; }
    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }
    setVisible(visible: boolean) { this.visible = visible; return this; }
    setDepth(depth: number) { this.depth = depth; return this; }
    setAlpha(alpha: number) { this.alpha = alpha; return this; }
    destroy() { this.active = false; return this; }
  }

  // Mock Sprite
  const createMockSprite = () => {
    const data: Record<string, any> = {};
    return {
      setImmovable: jest.fn().mockReturnThis(),
      setPushable: jest.fn().mockReturnThis(),
      setScale: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
      setTexture: jest.fn().mockReturnThis(),
      setFrame: jest.fn().mockReturnThis(),
      clearTint: jest.fn().mockReturnThis(),
      setTint: jest.fn().mockReturnThis(),
      setVisible: jest.fn().mockReturnThis(),
      setActive: jest.fn().mockReturnThis(),
      setAlpha: jest.fn().mockReturnThis(),
      play: jest.fn().mockReturnThis(),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      texture: { key: 'test' },
      frame: { name: '0', index: 0 },
      x: 0,
      y: 0,
      active: true,
      visible: true,
      alpha: 1,
      depth: 5,
      body: {
        immovable: false,
        pushable: false,
        enable: jest.fn(),
        disable: jest.fn()
      },
      destroy: jest.fn(),
      tweens: {
        add: jest.fn()
      },
      setData: function(key: string, value: any) {
        data[key] = value;
        return this;
      },
      getData: function(key: string) {
        return data[key];
      }
    };
  };

  // Mock Scene
  class MockScene {
    physics = {
      add: {
        sprite: jest.fn().mockReturnValue(createMockSprite())
      }
    };
    add = {
      text: jest.fn(() => new MockText()),
      container: jest.fn(() => new MockContainer()),
      sprite: jest.fn(() => createMockSprite())
    };
    tweens = {
      add: jest.fn()
    };
    textures = {
      exists: jest.fn(() => true)
    };
    anims = {
      exists: jest.fn(() => true)
    };
  }

  return {
    Events: {
      EventEmitter: MockEventEmitter
    },
    Scene: MockScene
  };
});

describe('StandardPortal', () => {
  let portal: StandardPortal;
  let mockScene: any;
  let mockConfig: PortalConfig;

  beforeEach(() => {
    mockScene = new (require('phaser')).Scene();
    mockConfig = {
      type: PortalType.STANDARD,
      levelKey: 'test_level_1',
      question: 'Test question?'
    };
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Инициализация', () => {
    it('должен создаваться с PortalConfig', () => {
      portal = new StandardPortal(mockScene, mockConfig, 100, 200);
      expect(portal).toBeDefined();
    });

    it('должен создавать физический спрайт', () => {
      portal = new StandardPortal(mockScene, mockConfig, 100, 200);
      expect(mockScene.physics.add.sprite).toHaveBeenCalled();
    });

    it('должен начинать в состоянии BASE', () => {
      portal = new StandardPortal(mockScene, mockConfig, 100, 200);
      expect(portal.getState()).toBe('base');
    });
  });

  describe('isOpen', () => {
    it('должен возвращать false для закрытого портала', () => {
      portal = new StandardPortal(mockScene, mockConfig, 100, 200);
      expect(portal.isOpen()).toBe(false);
    });
  });

  describe('getPosition', () => {
    it('должен возвращать позицию портала через getX и getY', () => {
      portal = new StandardPortal(mockScene, mockConfig, 100, 200);
      expect(portal.getX()).toBeDefined();
      expect(portal.getY()).toBeDefined();
    });
  });

  describe('destroy', () => {
    it('должен уничтожать портал без ошибок', () => {
      portal = new StandardPortal(mockScene, mockConfig, 100, 200);
      expect(() => portal.destroy()).not.toThrow();
    });
  });

  describe('onKeyDeposit', () => {
    it('должен обрабатывать депозит ключа', () => {
      portal = new StandardPortal(mockScene, mockConfig, 100, 200);
      expect(() => portal.onKeyDeposit()).not.toThrow();
    });
  });

  describe('PortalType', () => {
    it('должен экспортировать PortalType', () => {
      expect(PortalType).toBeDefined();
      expect(PortalType.STANDARD).toBeDefined();
    });
  });
});
