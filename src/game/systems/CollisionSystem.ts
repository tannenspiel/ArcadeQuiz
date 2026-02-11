/**
 * Централизованная система обработки коллизий
 *
 * ⚠️ НОВОЕ: Для айтемов (coins, keys, hearts) используется distance-based подход
 * вместо overlap collision. Это более предсказуемо и не зависит от physics body sizing.
 */

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { AbstractEnemy } from '../entities/enemies/AbstractEnemy';
import { AbstractPortal } from '../entities/portals/AbstractPortal';
import { getEnemyFromGameObject, getPortalFromGameObject } from '../../utils/typeGuards';
import { INTERACTION_CONFIG } from '../../constants/gameConstants';
import { logger } from '../../utils/Logger';

// ✅ Определяем тип объекта, который может прийти в callback физики Phaser
// Phaser.Arcade.Collider callback ожидает (object1: GameObjectWithBody | Tile | Body | StaticBody, object2: ...)
type ArcadeObject = Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;

/**
 * Отслеживание состояния интеракции с айтемом для distance-based подхода
 */
interface ItemInteractionState {
  itemId: string;
  wasInRange: boolean;
}

export class CollisionSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private enemies: Phaser.Physics.Arcade.Group;
  private chasers: Phaser.Physics.Arcade.Group;
  private hearts: Phaser.Physics.Arcade.Group;
  private keys: Phaser.Physics.Arcade.Group;
  private coins: Phaser.Physics.Arcade.Group; // ⚠️ НОВОЕ: Coins group
  private portals: Phaser.Physics.Arcade.Group;
  private oracle: Phaser.Physics.Arcade.Sprite;
  private collisionObjects?: Phaser.Physics.Arcade.Group;
  private useCustomCollision: boolean;
  private processingKeys = new Set<string>();

  // ⚠️ НОВОЕ: Distance-based interaction state tracking
  private itemStates = new Map<string, ItemInteractionState>();

  // Обработчики коллизий
  private onPlayerEnemyCollision?: (enemy: AbstractEnemy) => void;
  private onPlayerHeartCollision?: (heart: Phaser.Physics.Arcade.Sprite) => void;
  private onPlayerKeyCollision?: (key: Phaser.Physics.Arcade.Sprite) => void;
  private onPlayerCoinCollision?: (coin: Phaser.Physics.Arcade.Sprite) => void;
  private onPlayerOracleCollision?: () => void;
  private onPlayerPortalCollision?: (portal: AbstractPortal) => void;
  private onPlayerPortalOverlap?: (portal: AbstractPortal) => void;

  private portalOverlapCollider?: Phaser.Physics.Arcade.Collider;
  private ready = false; // ✅ Flag to block collisions until fully initialized

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.Physics.Arcade.Group,
    chasers: Phaser.Physics.Arcade.Group,
    hearts: Phaser.Physics.Arcade.Group,
    keys: Phaser.Physics.Arcade.Group,
    portals: Phaser.Physics.Arcade.Group,
    oracle: Phaser.Physics.Arcade.Sprite,
    collisionObjects?: Phaser.Physics.Arcade.Group,
    useCustomCollision: boolean = false,
    coins?: Phaser.Physics.Arcade.Group // ⚠️ НОВОЕ: Coins group parameter
  ) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.chasers = chasers;
    this.hearts = hearts;
    this.keys = keys;
    this.coins = coins || scene.physics.add.group(); // ⚠️ НОВОЕ: Initialize coins
    this.portals = portals;
    this.oracle = oracle;
    this.collisionObjects = collisionObjects;
    this.useCustomCollision = useCustomCollision;

    // ✅ CRITICAL FIX: Clear processingKeys on creation to prevent cross-session contamination
    this.clearAllProcessingKeys();
    // ⚠️ НОВОЕ: Clear item states
    this.clearAllItemStates();

    this.setupCollisions();
  }

  /**
   * Clear all processing keys (called on scene init to prevent stale state)
   */
  public clearAllProcessingKeys(): void {
    const size = this.processingKeys.size;
    if (size > 0) {
      logger.warn('COLLISION', `CollisionSystem: Clearing ${size} stale processingKeys:`, Array.from(this.processingKeys));
    }
    this.processingKeys.clear();
  }

  /**
   * ⚠️ НОВОЕ: Clear all item interaction states
   */
  public clearAllItemStates(): void {
    this.itemStates.clear();
  }

  /**
   * Mark CollisionSystem as ready to process collisions
   * Call this after setting up all callbacks
   */
  public setReady(): void {
    this.ready = true;
    logger.log('COLLISION', 'CollisionSystem: Ready to process collisions');
  }

  /**
   * ⚠️ НОВОЕ: Update method for distance-based item interaction checking
   * Called from MainScene.update()
   */
  public update(): void {
    if (!this.ready) return;

    const playerSprite = this.player.getSprite();

    // ✅ Защита от уничтоженных групп при переходе уровня
    // Проверяем, что группа существует, имеет метод getChildren, и её сцена всё еще активна
    const isValidGroup = (group: any) =>
      group &&
      typeof group.getChildren === 'function' &&
      group.scene &&
      typeof group.scene.sys !== 'undefined';

    // Check distance-based interaction for hearts
    if (isValidGroup(this.hearts)) {
      this.checkDistanceInteraction(
        this.hearts,
        'heart',
        INTERACTION_CONFIG.ITEM_INTERACTION_RADIUS,
        (item: Phaser.Physics.Arcade.Sprite) => {
          if (this.onPlayerHeartCollision) {
            this.onPlayerHeartCollision(item);
          }
        }
      );
    }

    // Check distance-based interaction for keys
    if (isValidGroup(this.keys)) {
      this.checkDistanceInteraction(
        this.keys,
        'key',
        INTERACTION_CONFIG.ITEM_INTERACTION_RADIUS,
        (item: Phaser.Physics.Arcade.Sprite) => {
          this.onPlayerKeyCollision?.(item);
        }
      );
    }

    // Check distance-based interaction for coins
    if (isValidGroup(this.coins)) {
      this.checkDistanceInteraction(
        this.coins,
        'coin',
        INTERACTION_CONFIG.ITEM_INTERACTION_RADIUS,
        (item: Phaser.Physics.Arcade.Sprite) => {
          this.onPlayerCoinCollision?.(item);
        }
      );
    }
  }

  /**
   * ⚠️ НОВОЕ: Distance-based interaction check for a group of items
   *
   * Triggers callback when:
   * 1. Item enters range (wasInRange = false → true)
   * 2. Item is active and not already being processed
   */
  private checkDistanceInteraction(
    group: Phaser.Physics.Arcade.Group,
    itemType: 'heart' | 'key' | 'coin',
    radius: number,
    callback: (item: Phaser.Physics.Arcade.Sprite) => void
  ): void {
    // ✅ Защита от undefined группы или игрока (возможна при переходе уровней)
    if (!group || typeof group.getChildren !== 'function') {
      return;
    }

    const playerSprite = this.player.getSprite();
    if (!playerSprite) {
      return;
    }

    const children = group.getChildren() as Phaser.Physics.Arcade.Sprite[];
    if (!children || children.length === 0) {
      return;
    }

    for (const item of children) {
      // Skip inactive items
      if (!item.active) {
        // Clean up state for inactive items
        const itemId = `${itemType}-${Math.round(item.x)}-${Math.round(item.y)}`;
        this.itemStates.delete(itemId);
        continue;
      }

      const itemId = `${itemType}-${Math.round(item.x)}-${Math.round(item.y)}`;

      // Get or create interaction state
      let state = this.itemStates.get(itemId);
      if (!state) {
        state = { itemId, wasInRange: false };
        this.itemStates.set(itemId, state);
      }

      // Calculate distance between player and item centers
      const dist = Phaser.Math.Distance.Between(
        playerSprite.x,
        playerSprite.y,
        item.x,
        item.y
      );

      const isInRange = dist < radius;

      // Trigger callback on entering range (edge trigger)
      if (isInRange && !state.wasInRange) {
        // Check if already being processed
        if (this.processingKeys.has(itemId)) {
          logger.log('COLLISION', `  ❌ SKIPPED: ${itemType} already in processingKeys: ${itemId}`);
          continue;
        }

        logger.log('COLLISION', `✅ ${itemType.toUpperCase()} entered range: ${itemId}, dist: ${Math.round(dist)}`);

        // Mark as being processed
        this.processingKeys.add(itemId);
        state.wasInRange = true;

        // Trigger the collision callback
        callback(item);
      }

      // Update state
      state.wasInRange = isInRange;

      // Clean up state if item is out of range and not being processed
      if (!isInRange && !this.processingKeys.has(itemId)) {
        this.itemStates.delete(itemId);
      }
    }
  }

  /**
   * Настройка всех коллизий
   */
  private setupCollisions(): void {
    const playerSprite = this.player.getSprite();

    // Коллизии с врагами
    this.scene.physics.add.collider(
      playerSprite,
      this.enemies,
      (_player: ArcadeObject, enemy: ArcadeObject) => {
        if (this.onPlayerEnemyCollision && enemy instanceof Phaser.GameObjects.GameObject) {
          const enemyInstance = getEnemyFromGameObject(enemy);
          if (enemyInstance) {
            this.onPlayerEnemyCollision(enemyInstance);
          }
        }
      },
      undefined,
      this
    );

    this.scene.physics.add.collider(
      playerSprite,
      this.chasers,
      (_player: ArcadeObject, enemy: ArcadeObject) => {
        if (this.onPlayerEnemyCollision && enemy instanceof Phaser.GameObjects.GameObject) {
          const enemyInstance = getEnemyFromGameObject(enemy);
          if (enemyInstance) {
            this.onPlayerEnemyCollision(enemyInstance);
          }
        }
      },
      undefined,
      this
    );

    // ⚠️ УДАЛЕНО: Overlap для hearts, keys, coins - теперь используется distance-based в update()

    // Коллизия с оракулом
    const oracleCallback = () => {
      logger.log('ORACLE', '🎯 CollisionSystem: Oracle collision callback triggered!');
      if (this.onPlayerOracleCollision) {
        logger.log('ORACLE', '✅ CollisionSystem: Calling onPlayerOracleCollision handler');
        this.onPlayerOracleCollision();
      } else {
        logger.warn('ORACLE', '❌ CollisionSystem: onPlayerOracleCollision handler is NOT SET!');
      }
    };

    if (!this.useCustomCollision) {
      logger.log('ORACLE', 'CollisionSystem: Setting up Oracle COLLIDER (standard mode)');
      this.scene.physics.add.collider(
        playerSprite,
        this.oracle,
        oracleCallback,
        undefined,
        this
      );
    } else {
      logger.log('ORACLE', 'CollisionSystem: Setting up Oracle OVERLAP (custom collision mode)');
      this.scene.physics.add.overlap(
        playerSprite,
        this.oracle,
        oracleCallback,
        undefined,
        this
      );
    }

    // Коллизии с порталами
    const portalCollisionCallback = (_player: ArcadeObject, portal: ArcadeObject) => {
      if (portal instanceof Phaser.GameObjects.GameObject) {
        const portalInstance = getPortalFromGameObject(portal);
        if (portalInstance && this.onPlayerPortalCollision) {
          this.onPlayerPortalCollision(portalInstance);
        }
      }
    };

    const portalProcessCallback = (player: ArcadeObject, portal: ArcadeObject) => {
      // Process callback: возвращает false если портал открыт (проходимый)
      if (!(portal instanceof Phaser.GameObjects.GameObject) || !(player instanceof Phaser.GameObjects.GameObject)) return true;

      const portalInstance = getPortalFromGameObject(portal);

      // ✅ ДИНАМИЧЕСКИЙ ОВЕРРАЙД
      const scene = this.scene as any;
      if (typeof scene.isPositionInOverlapMask === 'function' && player.body) {
        const playerBody = player.body as Phaser.Physics.Arcade.Body;
        if (scene.isPositionInOverlapMask(playerBody.center.x, playerBody.center.y)) {
          return false;
        }
      }


      if (portalInstance && portalInstance.hasCollisionOverride()) {
        return false;
      }

      return portalInstance ? !portalInstance.isOpen() : true;
    };

    if (!this.useCustomCollision) {
      this.scene.physics.add.collider(
        playerSprite,
        this.portals,
        portalCollisionCallback,
        portalProcessCallback,
        this
      );
    } else {
      this.scene.physics.add.overlap(
        playerSprite,
        this.portals,
        portalCollisionCallback,
        undefined,
        this
      );
    }

    // Пересечения с порталами (для входа)
    this.portalOverlapCollider = this.scene.physics.add.overlap(
      playerSprite,
      this.portals,
      (_player: ArcadeObject, portal: ArcadeObject) => {
        if (portal instanceof Phaser.GameObjects.GameObject) {
          const portalInstance = getPortalFromGameObject(portal);
          if (portalInstance && this.onPlayerPortalOverlap) {
            // Передаем портал в обработчик (MainScene), там решим: депозит или вход
            this.onPlayerPortalOverlap(portalInstance);
          }
        }
      },
      (player: ArcadeObject, portal: ArcadeObject) => {
        if (!(portal instanceof Phaser.GameObjects.GameObject) || !(player instanceof Phaser.GameObjects.GameObject)) return false;

        const portalInstance = getPortalFromGameObject(portal);
        if (!portalInstance) {
          return false;
        }

        // ✅ Разрешаем взаимодействие, если портал активирован (открыт) ИЛИ находится в процессе активации (ждет ключи)
        // isActivating() == true -> ждет ключи
        // isOpen() == true -> портал открыт для входа
        if (!portalInstance.isOpen() && !portalInstance.isActivating()) {
          return false;
        }

        const playerSpriteObj = player as Phaser.Physics.Arcade.Sprite;
        const portalSpriteObj = portal as Phaser.Physics.Arcade.Sprite;

        const dist = Phaser.Math.Distance.Between(
          playerSpriteObj.x,
          playerSpriteObj.y,
          portalSpriteObj.x,
          portalSpriteObj.y
        );

        return dist < INTERACTION_CONFIG.PORTAL_ACTIVATION_RADIUS;
      },
      this
    );

    // ✅ Коллизии врагов с порталами
    if (!this.useCustomCollision) {
      const enemyPortalProcessCallback = (_enemy: ArcadeObject, portal: ArcadeObject) => {
        if (!(portal instanceof Phaser.GameObjects.GameObject)) return true;
        const portalInstance = getPortalFromGameObject(portal);
        return portalInstance ? !portalInstance.isOpen() : true;
      };

      this.scene.physics.add.collider(
        this.enemies,
        this.portals,
        undefined,
        enemyPortalProcessCallback,
        this
      );

      this.scene.physics.add.collider(
        this.chasers,
        this.portals,
        undefined,
        enemyPortalProcessCallback,
        this
      );

      this.scene.physics.add.collider(
        this.enemies,
        this.oracle,
        undefined,
        undefined,
        this
      );

      this.scene.physics.add.collider(
        this.chasers,
        this.oracle,
        undefined,
        undefined,
        this
      );
    }

    // ✅ Коллизии с объектами коллизии (кусты)
    if (this.collisionObjects) {
      this.scene.physics.add.collider(
        playerSprite,
        this.collisionObjects,
        undefined,
        undefined,
        this
      );

      this.scene.physics.add.collider(
        this.enemies,
        this.collisionObjects,
        undefined,
        undefined,
        this
      );

      this.scene.physics.add.collider(
        this.chasers,
        this.collisionObjects,
        undefined,
        undefined,
        this
      );
    }
  }

  public setOnPlayerEnemyCollision(handler: (enemy: AbstractEnemy) => void): void {
    this.onPlayerEnemyCollision = handler;
  }

  public setOnPlayerHeartCollision(handler: (heart: Phaser.Physics.Arcade.Sprite) => void): void {
    this.onPlayerHeartCollision = handler;
  }

  public setOnPlayerKeyCollision(handler: (key: Phaser.Physics.Arcade.Sprite) => void): void {
    this.onPlayerKeyCollision = handler;
  }

  public setOnPlayerCoinCollision(handler: (coin: Phaser.Physics.Arcade.Sprite) => void): void {
    this.onPlayerCoinCollision = handler;
  }

  public setOnPlayerOracleCollision(handler: () => void): void {
    this.onPlayerOracleCollision = handler;
  }

  public setOnPlayerPortalCollision(handler: (portal: AbstractPortal) => void): void {
    this.onPlayerPortalCollision = handler;
  }

  public setOnPlayerPortalOverlap(handler: (portal: AbstractPortal) => void): void {
    this.onPlayerPortalOverlap = handler;
  }

  public disablePortalOverlap(): void {
    if (this.portalOverlapCollider) {
      this.portalOverlapCollider.active = false;
      logger.log('COLLISION', '🔴 CollisionSystem: Portal overlap collider disabled');
    }
  }

  public enablePortalOverlap(): void {
    if (this.portalOverlapCollider) {
      this.portalOverlapCollider.active = true;
      logger.log('COLLISION', '✅ CollisionSystem: Portal overlap enabled');
    }
  }

  /**
   * Mark key as no longer being processed
   * Called after collision handling is complete
   * ⚠️ НОВОЕ: Also clears interaction state to allow re-entry
   */
  public clearProcessingKey(keyId: string): void {
    logger.log('COLLISION', `🔑 CollisionSystem.clearProcessingKey called for: ${keyId}, before:`, Array.from(this.processingKeys));
    this.processingKeys.delete(keyId);

    // Also clear interaction state to allow re-triggering if player walks away and back
    this.itemStates.delete(keyId);

    logger.log('COLLISION', '  after:', Array.from(this.processingKeys));
  }

  /**
   * Get all currently processing keys (for debugging)
   */
  public getProcessingKeys(): string[] {
    return Array.from(this.processingKeys);
  }
}
