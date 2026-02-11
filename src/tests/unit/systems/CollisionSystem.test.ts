/**
 * Unit тесты для CollisionSystem
 *
 * ⚠️ НОВОЕ: Обновлено для distance-based подхода к интеракции с айтемами
 * Вместо overlap collision для айтемов используется проверка расстояния в update()
 */

import { CollisionSystem } from '../../../game/systems/CollisionSystem';
import { Player } from '../../../game/entities/Player';
import { AbstractEnemy } from '../../../game/entities/enemies/AbstractEnemy';
import { AbstractPortal } from '../../../game/entities/portals/AbstractPortal';
import { INTERACTION_CONFIG } from '../../../constants/gameConstants';
import Phaser from 'phaser';

// Моки
jest.mock('../../../game/entities/Player');
jest.mock('../../../game/entities/enemies/AbstractEnemy');
jest.mock('../../../game/entities/portals/AbstractPortal');

// ✅ Мокаем typeGuards, чтобы избежать загрузки реальных сущностей через импорты
jest.mock('../../../utils/typeGuards', () => ({
  getEnemyFromGameObject: jest.fn(),
  getPortalFromGameObject: jest.fn(),
  hasBody: jest.fn(),
  asSprite: jest.fn()
}));

// Мокаем Logger
jest.mock('../../../utils/Logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('CollisionSystem', () => {
  let mockScene: any;
  let mockPlayer: any;
  let mockPlayerSprite: any;
  let mockEnemyGroup: any;
  let mockChaserGroup: any;
  let mockHeartsGroup: any;
  let mockKeysGroup: any;
  let mockPortalsGroup: any;
  let mockOracle: any;
  let mockCoinsGroup: any;
  let mockCollisionObjects: any;
  let collisionSystem: CollisionSystem;

  // Тестовые данные для коллизий
  let capturedColliders: any[];
  let capturedOverlaps: any[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    capturedColliders = [];
    capturedOverlaps = [];

    // Mock player sprite
    mockPlayerSprite = {
      x: 100,
      y: 100,
      active: true,
      visible: true,
      getData: jest.fn(),
      body: {
        center: { x: 100, y: 100 }
      }
    };

    mockPlayer = {
      getSprite: jest.fn().mockReturnValue(mockPlayerSprite)
    };

    // Mock groups
    mockEnemyGroup = {
      getChildren: jest.fn().mockReturnValue([]),
      scene: { sys: {} }
    };
    mockChaserGroup = {
      getChildren: jest.fn().mockReturnValue([]),
      scene: { sys: {} }
    };
    mockHeartsGroup = {
      getChildren: jest.fn().mockReturnValue([]),
      scene: { sys: {} }
    };
    mockKeysGroup = {
      getChildren: jest.fn().mockReturnValue([]),
      scene: { sys: {} }
    };
    mockPortalsGroup = {
      getChildren: jest.fn().mockReturnValue([]),
      scene: { sys: {} }
    };
    mockCoinsGroup = {
      getChildren: jest.fn().mockReturnValue([]),
      scene: { sys: {} }
    };
    mockOracle = {};
    mockCollisionObjects = {
      getChildren: jest.fn().mockReturnValue([]),
      scene: { sys: {} }
    };

    // Mock scene with physics
    mockScene = {
      physics: {
        add: {
          collider: jest.fn().mockImplementation((...args: any[]) => {
            const collider = { active: true, destroy: jest.fn() };
            capturedColliders.push({ type: 'collider', args, collider });
            return collider;
          }),
          overlap: jest.fn().mockImplementation((...args: any[]) => {
            const overlap = { active: true, destroy: jest.fn() };
            capturedOverlaps.push({ type: 'overlap', args, overlap });
            return overlap;
          }),
          group: jest.fn().mockReturnValue({
            getChildren: jest.fn().mockReturnValue([]),
            scene: { sys: {} }
          })
        }
      }
    };

    collisionSystem = new CollisionSystem(
      mockScene,
      mockPlayer,
      mockEnemyGroup,
      mockChaserGroup,
      mockHeartsGroup,
      mockKeysGroup,
      mockPortalsGroup,
      mockOracle,
      mockCollisionObjects,
      false, // useCustomCollision
      mockCoinsGroup
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('должен создать экземпляр CollisionSystem', () => {
      expect(collisionSystem).toBeInstanceOf(CollisionSystem);
    });

    it('должен сохранить все зависимости', () => {
      expect(collisionSystem['scene']).toBe(mockScene);
      expect(collisionSystem['player']).toBe(mockPlayer);
      expect(collisionSystem['enemies']).toBe(mockEnemyGroup);
      expect(collisionSystem['chasers']).toBe(mockChaserGroup);
      expect(collisionSystem['hearts']).toBe(mockHeartsGroup);
      expect(collisionSystem['keys']).toBe(mockKeysGroup);
      expect(collisionSystem['coins']).toBe(mockCoinsGroup);
      expect(collisionSystem['portals']).toBe(mockPortalsGroup);
      expect(collisionSystem['oracle']).toBe(mockOracle);
      expect(collisionSystem['collisionObjects']).toBe(mockCollisionObjects);
    });

    it('должен использовать дефолтную группу coins если не передана', () => {
      const systemWithoutCoins = new CollisionSystem(
        mockScene,
        mockPlayer,
        mockEnemyGroup,
        mockChaserGroup,
        mockHeartsGroup,
        mockKeysGroup,
        mockPortalsGroup,
        mockOracle,
        mockCollisionObjects,
        false
        // coins не передан
      );

      expect(systemWithoutCoins['coins']).toBeDefined();
      expect(typeof systemWithoutCoins['coins'].getChildren).toBe('function');
    });

    it('должен инициализировать пустые processingKeys и itemStates', () => {
      expect(collisionSystem['processingKeys'] instanceof Set).toBe(true);
      expect(collisionSystem['processingKeys'].size).toBe(0);
      expect(collisionSystem['itemStates'] instanceof Map).toBe(true);
      expect(collisionSystem['itemStates'].size).toBe(0);
    });

    it('должен инициализироваться в не-ready состоянии', () => {
      expect(collisionSystem['ready']).toBe(false);
    });

    it('должен вызвать setupCollisions при создании', () => {
      expect(mockScene.physics.add.collider).toHaveBeenCalled();
    });

    it('должен очищать processingKeys при создании', () => {
      // Добавляем ключ в Set для теста
      collisionSystem['processingKeys'].add('test-key');

      // Создаём новую систему - она должна очистить ключи
      const newSystem = new CollisionSystem(
        mockScene,
        mockPlayer,
        mockEnemyGroup,
        mockChaserGroup,
        mockHeartsGroup,
        mockKeysGroup,
        mockPortalsGroup,
        mockOracle
      );

      expect(newSystem['processingKeys'].size).toBe(0);
    });

    it('должен очищать itemStates при создании', () => {
      // Добавляем состояние для теста
      collisionSystem['itemStates'].set('test-item', { itemId: 'test-item', wasInRange: false });

      // Создаём новую систему - она должна очистить состояния
      const newSystem = new CollisionSystem(
        mockScene,
        mockPlayer,
        mockEnemyGroup,
        mockChaserGroup,
        mockHeartsGroup,
        mockKeysGroup,
        mockPortalsGroup,
        mockOracle
      );

      expect(newSystem['itemStates'].size).toBe(0);
    });
  });

  describe('setReady', () => {
    it('должен устанавливать флаг ready в true', () => {
      collisionSystem.setReady();
      expect(collisionSystem['ready']).toBe(true);
    });

    it('должен позволять update обрабатываться после setReady', () => {
      collisionSystem.setReady();

      // Не должно выбрасывать исключение
      expect(() => collisionSystem.update()).not.toThrow();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      collisionSystem.setReady();
    });

    it('не должен делать ничего если не ready', () => {
      collisionSystem['ready'] = false;

      const heartCallback = jest.fn();
      collisionSystem.setOnPlayerHeartCollision(heartCallback);

      collisionSystem.update();

      expect(heartCallback).not.toHaveBeenCalled();
    });

    it('должен возвращать null если нет player sprite', () => {
      mockPlayer.getSprite.mockReturnValue(null);

      expect(() => collisionSystem.update()).not.toThrow();
    });

    it('должен пропускать валидацию группы если группа invalid', () => {
      mockHeartsGroup.getChildren = undefined as any;

      expect(() => collisionSystem.update()).not.toThrow();
    });

    it('должен пропускать группу если scene.sys не определён', () => {
      mockHeartsGroup.scene = undefined;

      expect(() => collisionSystem.update()).not.toThrow();
    });

    it('должен пропускать группу если getChildren не функция', () => {
      mockHeartsGroup.getChildren = 'not-a-function' as any;

      expect(() => collisionSystem.update()).not.toThrow();
    });
  });

  describe('checkDistanceInteraction - distance-based интеракция', () => {
    beforeEach(() => {
      collisionSystem.setReady();
    });

    it('должен вызывать callback когда item входит в радиус', () => {
      const heartCallback = jest.fn();
      collisionSystem.setOnPlayerHeartCollision(heartCallback);

      // Создаём херт рядом с игроком
      const nearbyHeart = {
        x: 105,
        y: 100,
        active: true,
        visible: true
      };

      mockHeartsGroup.getChildren.mockReturnValue([nearbyHeart as any]);

      collisionSystem.update();

      // Callback должен быть вызван (item в радиусе)
      expect(heartCallback).toHaveBeenCalledTimes(1);
    });

    it('должен создавать itemState при первой проверке', () => {
      const heartCallback = jest.fn();
      collisionSystem.setOnPlayerHeartCollision(heartCallback);

      const nearbyHeart = {
        x: 105,
        y: 100,
        active: true
      };

      mockHeartsGroup.getChildren.mockReturnValue([nearbyHeart as any]);
      collisionSystem.update();

      // Должен создать состояние для этого айтема
      const itemId = `heart-${Math.round(nearbyHeart.x)}-${Math.round(nearbyHeart.y)}`;
      expect(collisionSystem['itemStates'].has(itemId)).toBe(true);
    });

    it('не должен вызывать callback если item уже был в радиусе (continuous trigger prevention)', () => {
      const heartCallback = jest.fn();
      collisionSystem.setOnPlayerHeartCollision(heartCallback);

      const nearbyHeart = {
        x: 105,
        y: 100,
        active: true
      };

      mockHeartsGroup.getChildren.mockReturnValue([nearbyHeart as any]);

      // Первый update - должен вызвать
      collisionSystem.update();
      expect(heartCallback).toHaveBeenCalledTimes(1);

      // Второй update - НЕ должен вызывать (уже в радиусе)
      collisionSystem.update();
      expect(heartCallback).toHaveBeenCalledTimes(1); // Всё ещё 1
    });

    it('не должен вызывать callback если item inactive', () => {
      const heartCallback = jest.fn();
      collisionSystem.setOnPlayerHeartCollision(heartCallback);

      const inactiveHeart = {
        x: 105,
        y: 100,
        active: false // Неактивен
      };

      mockHeartsGroup.getChildren.mockReturnValue([inactiveHeart as any]);

      collisionSystem.update();

      expect(heartCallback).not.toHaveBeenCalled();
    });

    it('должен очищать itemState для inactive items', () => {
      const heartCallback = jest.fn();
      collisionSystem.setOnPlayerHeartCollision(heartCallback);

      const inactiveHeart = {
        x: 105,
        y: 100,
        active: false
      };

      mockHeartsGroup.getChildren.mockReturnValue([inactiveHeart as any]);

      // Сначала обновляем - создаём состояние
      collisionSystem.update();

      const itemId = `heart-${Math.round(inactiveHeart.x)}-${Math.round(inactiveHeart.y)}`;
      expect(collisionSystem['itemStates'].has(itemId)).toBe(false);
    });

    it('должен обрабатывать ключи аналогично хертам', () => {
      const keyCallback = jest.fn();
      collisionSystem.setOnPlayerKeyCollision(keyCallback);

      const nearbyKey = {
        x: 110,
        y: 100,
        active: true
      };

      mockKeysGroup.getChildren.mockReturnValue([nearbyKey as any]);
      collisionSystem.update();

      expect(keyCallback).toHaveBeenCalledTimes(1);
    });

    it('должен обрабатывать монеты аналогично хертам', () => {
      const coinCallback = jest.fn();
      collisionSystem.setOnPlayerCoinCollision(coinCallback);

      const nearbyCoin = {
        x: 108,
        y: 100,
        active: true
      };

      mockCoinsGroup.getChildren.mockReturnValue([nearbyCoin as any]);
      collisionSystem.update();

      expect(coinCallback).toHaveBeenCalledTimes(1);
    });

    it('должен удалять itemState когда item уходит из радиуса и не обрабатывается', () => {
      const heartCallback = jest.fn();
      collisionSystem.setOnPlayerHeartCollision(heartCallback);

      // Сначала item рядом - enters range
      const nearbyHeart = {
        x: 105,
        y: 100,
        active: true
      };

      mockHeartsGroup.getChildren.mockReturnValue([nearbyHeart as any]);
      collisionSystem.update();

      // Item вошёл в радиус, состояние создано
      let itemId = `heart-${Math.round(nearbyHeart.x)}-${Math.round(nearbyHeart.y)}`;
      expect(collisionSystem['itemStates'].has(itemId)).toBe(true);
      expect(collisionSystem['processingKeys'].has(itemId)).toBe(true);

      // Теперь item перемещается далеко (уходит из радиуса)
      const farHeart = {
        x: 500,
        y: 500,
        active: true
      };

      mockHeartsGroup.getChildren.mockReturnValue([farHeart as any]);

      // Первый update с далеко расположенным item - старое состояние для nearbyHeart должно удалиться
      collisionSystem.update();

      itemId = `heart-${Math.round(farHeart.x)}-${Math.round(farHeart.y)}`;
      // Новое состояние для farHeart создаётся и сразу удаляется (out of range, not in processingKeys)
      expect(collisionSystem['itemStates'].has(itemId)).toBe(false);
    });

    it('не должен вызывать callback если item уже в processingKeys', () => {
      const heartCallback = jest.fn();
      collisionSystem.setOnPlayerHeartCollision(heartCallback);

      const nearbyHeart = {
        x: 105,
        y: 100,
        active: true
      };

      mockHeartsGroup.getChildren.mockReturnValue([nearbyHeart as any]);

      const itemId = `heart-${Math.round(nearbyHeart.x)}-${Math.round(nearbyHeart.y)}`;

      // Добавляем в processingKeys вручную
      collisionSystem['processingKeys'].add(itemId);

      collisionSystem.update();

      // Callback НЕ должен быть вызван (уже обрабатывается)
      expect(heartCallback).not.toHaveBeenCalled();
    });

    it('должен возвращаться без ошибок если group undefined', () => {
      collisionSystem['hearts'] = undefined as any;

      expect(() => collisionSystem.update()).not.toThrow();
    });

    it('должен возвращаться без ошибок если group.getChildren не функция', () => {
      collisionSystem['hearts'] = { getChildren: 'not-a-function' } as any;

      expect(() => collisionSystem.update()).not.toThrow();
    });

    it('должен возвращаться без ошибок если children пустой массив', () => {
      mockHeartsGroup.getChildren.mockReturnValue([]);

      expect(() => collisionSystem.update()).not.toThrow();
    });

    it('должен возвращаться без ошибок если children undefined', () => {
      mockHeartsGroup.getChildren.mockReturnValue(undefined as any);

      expect(() => collisionSystem.update()).not.toThrow();
    });
  });

  describe('setupCollisions', () => {
    it('должен создавать collider для player-enemy', () => {
      const colliderCalls = capturedColliders.filter(c =>
        c.args[0] === mockPlayerSprite && c.args[1] === mockEnemyGroup
      );
      expect(colliderCalls.length).toBeGreaterThan(0);
    });

    it('должен создавать collider для player-chaser', () => {
      const colliderCalls = capturedColliders.filter(c =>
        c.args[0] === mockPlayerSprite && c.args[1] === mockChaserGroup
      );
      expect(colliderCalls.length).toBeGreaterThan(0);
    });

    it('должен создавать collider/overlap для oracle в зависимости от useCustomCollision', () => {
      const systemWithCustom = new CollisionSystem(
        mockScene,
        mockPlayer,
        mockEnemyGroup,
        mockChaserGroup,
        mockHeartsGroup,
        mockKeysGroup,
        mockPortalsGroup,
        mockOracle,
        mockCollisionObjects,
        true // useCustomCollision = true
      );

      // С useCustomCollision=true должен быть overlap
      const oracleOverlapCall = capturedOverlaps.filter(c =>
        c.args.includes(mockOracle)
      );
      expect(oracleOverlapCall.length).toBeGreaterThan(0);
    });

    it('должен создавать collider для portals', () => {
      const portalCalls = capturedColliders.filter(c =>
        c.args[0] === mockPlayerSprite && c.args[1] === mockPortalsGroup
      );
      expect(portalCalls.length).toBeGreaterThan(0);
    });

    it('должен создавать overlap для portal entry', () => {
      const portalOverlapCalls = capturedOverlaps.filter(c =>
        c.args[0] === mockPlayerSprite && c.args[1] === mockPortalsGroup
      );
      expect(portalOverlapCalls.length).toBeGreaterThan(0);
    });

    it('должен сохранять portalOverlapCollider', () => {
      expect(collisionSystem['portalOverlapCollider']).toBeDefined();
      expect(collisionSystem['portalOverlapCollider'].active).toBe(true);
    });

    it('должен создавать collider для collisionObjects если передан', () => {
      const collisionObjCalls = capturedColliders.filter(c =>
        c.args.includes(mockCollisionObjects)
      );
      expect(collisionObjCalls.length).toBeGreaterThan(0);
    });

    it('не должен создавать collider для collisionObjects если не передан', () => {
      const systemWithoutCollisionObj = new CollisionSystem(
        mockScene,
        mockPlayer,
        mockEnemyGroup,
        mockChaserGroup,
        mockHeartsGroup,
        mockKeysGroup,
        mockPortalsGroup,
        mockOracle
        // collisionObjects не передан
      );

      // Должен создаться без ошибок
      expect(systemWithoutCollisionObj).toBeDefined();
    });
  });

  describe('setOnPlayerEnemyCollision', () => {
    it('должен сохранять обработчик коллизии с врагом', () => {
      const handler = jest.fn();
      collisionSystem.setOnPlayerEnemyCollision(handler);

      expect(collisionSystem['onPlayerEnemyCollision']).toBe(handler);
    });

    it('должен перезаписывать предыдущий обработчик', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      collisionSystem.setOnPlayerEnemyCollision(handler1);
      expect(collisionSystem['onPlayerEnemyCollision']).toBe(handler1);

      collisionSystem.setOnPlayerEnemyCollision(handler2);
      expect(collisionSystem['onPlayerEnemyCollision']).toBe(handler2);
    });
  });

  describe('setOnPlayerHeartCollision', () => {
    it('должен сохранять обработчик коллизии с сердцем', () => {
      const handler = jest.fn();
      collisionSystem.setOnPlayerHeartCollision(handler);

      expect(collisionSystem['onPlayerHeartCollision']).toBe(handler);
    });
  });

  describe('setOnPlayerKeyCollision', () => {
    it('должен сохранять обработчик коллизии с ключом', () => {
      const handler = jest.fn();
      collisionSystem.setOnPlayerKeyCollision(handler);

      expect(collisionSystem['onPlayerKeyCollision']).toBe(handler);
    });
  });

  describe('setOnPlayerCoinCollision', () => {
    it('должен сохранять обработчик коллизии с монетой', () => {
      const handler = jest.fn();
      collisionSystem.setOnPlayerCoinCollision(handler);

      expect(collisionSystem['onPlayerCoinCollision']).toBe(handler);
    });
  });

  describe('setOnPlayerOracleCollision', () => {
    it('должен сохранять обработчик коллизии с оракулом', () => {
      const handler = jest.fn();
      collisionSystem.setOnPlayerOracleCollision(handler);

      expect(collisionSystem['onPlayerOracleCollision']).toBe(handler);
    });
  });

  describe('setOnPlayerPortalCollision', () => {
    it('должен сохранять обработчик коллизии с порталом', () => {
      const handler = jest.fn();
      collisionSystem.setOnPlayerPortalCollision(handler);

      expect(collisionSystem['onPlayerPortalCollision']).toBe(handler);
    });
  });

  describe('setOnPlayerPortalOverlap', () => {
    it('должен сохранять обработчик пересечения с порталом', () => {
      const handler = jest.fn();
      collisionSystem.setOnPlayerPortalOverlap(handler);

      expect(collisionSystem['onPlayerPortalOverlap']).toBe(handler);
    });
  });

  describe('disablePortalOverlap', () => {
    it('должен отключать portalOverlapCollider', () => {
      collisionSystem.disablePortalOverlap();

      expect(collisionSystem['portalOverlapCollider']?.active).toBe(false);
    });

    it('не должен выбрасывать ошибку если collider undefined', () => {
      collisionSystem['portalOverlapCollider'] = undefined;

      expect(() => collisionSystem.disablePortalOverlap()).not.toThrow();
    });
  });

  describe('enablePortalOverlap', () => {
    it('должен включать portalOverlapCollider', () => {
      collisionSystem.disablePortalOverlap();
      expect(collisionSystem['portalOverlapCollider']?.active).toBe(false);

      collisionSystem.enablePortalOverlap();
      expect(collisionSystem['portalOverlapCollider']?.active).toBe(true);
    });

    it('не должен выбрасывать ошибку если collider undefined', () => {
      collisionSystem['portalOverlapCollider'] = undefined;

      expect(() => collisionSystem.enablePortalOverlap()).not.toThrow();
    });
  });

  describe('clearProcessingKey', () => {
    it('должен удалять ключ из processingKeys', () => {
      const keyId = 'test-key-123';
      collisionSystem['processingKeys'].add(keyId);

      expect(collisionSystem['processingKeys'].has(keyId)).toBe(true);

      collisionSystem.clearProcessingKey(keyId);

      expect(collisionSystem['processingKeys'].has(keyId)).toBe(false);
    });

    it('должен также удалять ключ из itemStates', () => {
      const keyId = 'test-key-456';
      collisionSystem['processingKeys'].add(keyId);
      collisionSystem['itemStates'].set(keyId, { itemId: keyId, wasInRange: true });

      collisionSystem.clearProcessingKey(keyId);

      expect(collisionSystem['itemStates'].has(keyId)).toBe(false);
    });

    it('не должен выбрасывать ошибку если ключ не существует', () => {
      expect(() => collisionSystem.clearProcessingKey('non-existent-key')).not.toThrow();
    });

    it('должен позволять re-trigger после clearProcessingKey', () => {
      const heartCallback = jest.fn();
      collisionSystem.setOnPlayerHeartCollision(heartCallback);
      collisionSystem.setReady();

      const nearbyHeart = {
        x: 105,
        y: 100,
        active: true
      };

      mockHeartsGroup.getChildren.mockReturnValue([nearbyHeart as any]);

      // Первый update - должен вызвать
      collisionSystem.update();
      expect(heartCallback).toHaveBeenCalledTimes(1);

      const itemId = `heart-${Math.round(nearbyHeart.x)}-${Math.round(nearbyHeart.y)}`;

      // Очищаем processing key
      collisionSystem.clearProcessingKey(itemId);

      // Сбрасываем состояние (wasInRange = false)
      collisionSystem['itemStates'].set(itemId, { itemId, wasInRange: false });

      // Второй update - должен снова вызвать
      collisionSystem.update();
      expect(heartCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearAllProcessingKeys', () => {
    it('должен очищать все processingKeys', () => {
      collisionSystem['processingKeys'].add('key1');
      collisionSystem['processingKeys'].add('key2');
      collisionSystem['processingKeys'].add('key3');

      expect(collisionSystem['processingKeys'].size).toBe(3);

      collisionSystem.clearAllProcessingKeys();

      expect(collisionSystem['processingKeys'].size).toBe(0);
    });

    it('должен быть публичным методом', () => {
      expect(typeof collisionSystem.clearAllProcessingKeys).toBe('function');
    });
  });

  describe('clearAllItemStates', () => {
    it('должен очищать все itemStates', () => {
      collisionSystem['itemStates'].set('item1', { itemId: 'item1', wasInRange: true });
      collisionSystem['itemStates'].set('item2', { itemId: 'item2', wasInRange: false });

      expect(collisionSystem['itemStates'].size).toBe(2);

      collisionSystem.clearAllItemStates();

      expect(collisionSystem['itemStates'].size).toBe(0);
    });

    it('должен быть публичным методом', () => {
      expect(typeof collisionSystem.clearAllItemStates).toBe('function');
    });
  });

  describe('getProcessingKeys', () => {
    it('должен возвращать массив всех processingKeys', () => {
      collisionSystem['processingKeys'].add('key1');
      collisionSystem['processingKeys'].add('key2');

      const keys = collisionSystem.getProcessingKeys();

      expect(Array.isArray(keys)).toBe(true);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('должен возвращать пустой массив если нет ключей', () => {
      const keys = collisionSystem.getProcessingKeys();

      expect(Array.isArray(keys)).toBe(true);
      expect(keys).toHaveLength(0);
    });

    it('должен быть публичным методом', () => {
      expect(typeof collisionSystem.getProcessingKeys).toBe('function');
    });
  });

  describe('Интеграционные сценарии', () => {
    it('должен корректно обрабатывать полный цикл интеракции с айтемом', () => {
      const heartCallback = jest.fn();
      collisionSystem.setOnPlayerHeartCollision(heartCallback);
      collisionSystem.setReady();

      const heart = {
        x: 105,
        y: 100,
        active: true
      };

      mockHeartsGroup.getChildren.mockReturnValue([heart as any]);

      const itemId = `heart-${Math.round(heart.x)}-${Math.round(heart.y)}`;

      // 1. Item входит в радиус - callback вызван
      collisionSystem.update();
      expect(heartCallback).toHaveBeenCalledTimes(1);
      expect(collisionSystem['processingKeys'].has(itemId)).toBe(true);

      // 2. Item собирается (callback обработан)
      // В реальном коде MainScene вызывает clearProcessingKey
      collisionSystem.clearProcessingKey(itemId);

      // 3. Item становится inactive
      heart.active = false;

      // 4. Следующий update - состояние очищено
      collisionSystem.update();
      expect(collisionSystem['itemStates'].has(itemId)).toBe(false);
    });

    it('должен корректно управлять portal overlap через enable/disable', () => {
      expect(collisionSystem['portalOverlapCollider']?.active).toBe(true);

      collisionSystem.disablePortalOverlap();
      expect(collisionSystem['portalOverlapCollider']?.active).toBe(false);

      collisionSystem.enablePortalOverlap();
      expect(collisionSystem['portalOverlapCollider']?.active).toBe(true);
    });

    it('должен корректно обрабатывать несколько айтемов одновременно', () => {
      const heartCallback = jest.fn();
      const keyCallback = jest.fn();
      const coinCallback = jest.fn();

      collisionSystem.setOnPlayerHeartCollision(heartCallback);
      collisionSystem.setOnPlayerKeyCollision(keyCallback);
      collisionSystem.setOnPlayerCoinCollision(coinCallback);
      collisionSystem.setReady();

      const heart = { x: 105, y: 100, active: true };
      const key = { x: 110, y: 100, active: true };
      const coin = { x: 108, y: 100, active: true };

      mockHeartsGroup.getChildren.mockReturnValue([heart as any]);
      mockKeysGroup.getChildren.mockReturnValue([key as any]);
      mockCoinsGroup.getChildren.mockReturnValue([coin as any]);

      collisionSystem.update();

      expect(heartCallback).toHaveBeenCalledTimes(1);
      expect(keyCallback).toHaveBeenCalledTimes(1);
      expect(coinCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases и защита', () => {
    it('должен корректно обрабатывать null group в update', () => {
      collisionSystem.setReady();
      collisionSystem['hearts'] = null;

      expect(() => collisionSystem.update()).not.toThrow();
    });

    it('должен корректно обрабатывать undefined getChildren', () => {
      collisionSystem.setReady();
      mockHeartsGroup.getChildren = undefined;

      expect(() => collisionSystem.update()).not.toThrow();
    });

    it('должен корректно обрабатывать null player sprite', () => {
      collisionSystem.setReady();
      mockPlayer.getSprite.mockReturnValue(null);

      expect(() => collisionSystem.update()).not.toThrow();
    });

    it('должен корректно обрабатывать undefined scene.sys', () => {
      mockHeartsGroup.scene = undefined;

      expect(() => collisionSystem.update()).not.toThrow();
    });

    it('должен создавать дефолтную группу coins если не передана', () => {
      const systemWithoutCoins = new CollisionSystem(
        mockScene,
        mockPlayer,
        mockEnemyGroup,
        mockChaserGroup,
        mockHeartsGroup,
        mockKeysGroup,
        mockPortalsGroup,
        mockOracle
      );

      expect(systemWithoutCoins['coins']).toBeDefined();
      expect(typeof systemWithoutCoins['coins'].getChildren).toBe('function');
    });

    it('должен работать с useCustomCollision=true', () => {
      const customSystem = new CollisionSystem(
        mockScene,
        mockPlayer,
        mockEnemyGroup,
        mockChaserGroup,
        mockHeartsGroup,
        mockKeysGroup,
        mockPortalsGroup,
        mockOracle,
        mockCollisionObjects,
        true // useCustomCollision
      );

      expect(customSystem['useCustomCollision']).toBe(true);
      expect(customSystem).toBeDefined();
    });

    it('должен корректно работать с пустыми группами', () => {
      mockEnemyGroup.getChildren.mockReturnValue([]);
      mockHeartsGroup.getChildren.mockReturnValue([]);
      mockKeysGroup.getChildren.mockReturnValue([]);
      mockCoinsGroup.getChildren.mockReturnValue([]);

      collisionSystem.setReady();

      expect(() => collisionSystem.update()).not.toThrow();
    });
  });
});
