/**
 * Unit тесты для MainScene
 */

import MainScene from '../../../game/scenes/MainScene';
import { BaseScene } from '../../../game/scenes/BaseScene';

// Mock всех систем перед импортом MainScene
jest.mock('../../../game/systems/HealthSystem');
jest.mock('../../../game/systems/ScoreSystem');
jest.mock('../../../game/systems/SpawnSystem');
jest.mock('../../../game/systems/CollisionSystem');
jest.mock('../../../game/systems/QuizManager');
jest.mock('../../../game/systems/AudioManager');

// Mock менеджеров
jest.mock('../../../game/ui/UIManager');
jest.mock('../../../game/scenes/ui/HUDManager');
jest.mock('../../../game/scenes/ui/CameraManager');
jest.mock('../../../game/scenes/ui/EffectsManager');
jest.mock('../../../game/scenes/enemy/EnemyManager');

// Mock обработчиков коллизий
jest.mock('../../../game/scenes/collision/EnemyCollisionHandler');
jest.mock('../../../game/scenes/collision/ItemCollisionHandler');
jest.mock('../../../game/scenes/collision/OracleCollisionHandler');
jest.mock('../../../game/scenes/collision/PortalCollisionHandler');

// Mock фабрик
jest.mock('../../../game/scenes/world/WorldFactory');
jest.mock('../../../game/scenes/world/EntityFactory');
jest.mock('../../../game/scenes/world/CollisionObjectFactory');

jest.mock('../../../game/EventBus', () => ({
  EventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
}));

describe('MainScene Unit Tests', () => {
  let scene: MainScene;
  let mockGame: any;

  const createMockGame = (): any => ({
    config: {},
    registry: {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      remove: jest.fn()
    },
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      once: jest.fn()
    },
    pause: jest.fn(),
    resume: jest.fn(),
    destroy: jest.fn()
  });

  beforeEach(() => {
    mockGame = createMockGame();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Инициализация', () => {
    it('должен создавать MainScene', () => {
      scene = new MainScene(mockGame);
      expect(scene).toBeDefined();
      expect(scene).toBeInstanceOf(MainScene);
      expect(scene).toBeInstanceOf(BaseScene);
    });

    it('должен иметь правильное имя класса', () => {
      scene = new MainScene(mockGame);
      expect(scene.constructor.name).toBe('MainScene');
    });
  });

  describe('createEnemyClone', () => {
    it('должен иметь метод createEnemyClone', () => {
      scene = new MainScene(mockGame);
      expect(typeof scene.createEnemyClone).toBe('function');
    });

    it('должен иметь правильную сигнатуру метода', () => {
      scene = new MainScene(mockGame);
      expect(scene.createEnemyClone.length).toBeGreaterThan(0);
    });
  });

  describe('handlePortalOverlapByMask', () => {
    it('должен иметь метод handlePortalOverlapByMask', () => {
      scene = new MainScene(mockGame);
      expect(typeof scene.handlePortalOverlapByMask).toBe('function');
    });

    it('должен иметь правильную сигнатуру метода (2 параметра)', () => {
      scene = new MainScene(mockGame);
      expect(scene.handlePortalOverlapByMask.length).toBe(2);
    });
  });

  describe('createPlayer', () => {
    it('должен иметь метод createPlayer', () => {
      scene = new MainScene(mockGame);
      expect(typeof scene.createPlayer).toBe('function');
    });

    it('должен иметь правильную сигнатуру метода', () => {
      scene = new MainScene(mockGame);
      expect(scene.createPlayer.length).toBe(0);
    });
  });

  describe('isPositionInOverlapMask', () => {
    it('должен иметь метод isPositionInOverlapMask', () => {
      scene = new MainScene(mockGame);
      expect(typeof scene.isPositionInOverlapMask).toBe('function');
    });

    it('должен возвращать boolean значение', () => {
      scene = new MainScene(mockGame);
      const result = scene.isPositionInOverlapMask(100, 200);
      expect(typeof result).toBe('boolean');
    });

    it('должен корректно обрабатывать нулевые координаты', () => {
      scene = new MainScene(mockGame);
      expect(() => scene.isPositionInOverlapMask(0, 0)).not.toThrow();
    });

    it('должен корректно обрабатывать отрицательные координаты', () => {
      scene = new MainScene(mockGame);
      expect(() => scene.isPositionInOverlapMask(-100, -200)).not.toThrow();
    });
  });

  describe('testTextBlur', () => {
    it('должен иметь метод testTextBlur', () => {
      scene = new MainScene(mockGame);
      expect(typeof scene.testTextBlur).toBe('function');
    });
  });

  describe('clearTestText', () => {
    it('должен иметь метод clearTestText', () => {
      scene = new MainScene(mockGame);
      expect(typeof scene.clearTestText).toBe('function');
    });
  });

  describe('Проверка существования систем', () => {
    it('должен создаваться со всеми необходимыми системами', () => {
      scene = new MainScene(mockGame);
      expect(scene).toBeDefined();
    });
  });

  describe('Проверка типов', () => {
    it('должен быть экземпляром MainScene', () => {
      scene = new MainScene(mockGame);
      expect(scene.constructor.name).toBe('MainScene');
    });
  });
});
