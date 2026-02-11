/**
 * AbstractItem - Abstract base class for all collectible items (Coin, Key, Heart)
 *
 * **CRITICAL FEATURE:** Automatic SpawnMatrix integration
 * - Automatically frees occupied cells when destroyed
 * - Prevents memory leaks in SpawnMatrix
 * - All items must extend this class
 *
 * @abstract
 * @example
 * ```typescript
 * class Coin extends AbstractItem {
 *   constructor(scene: MainScene, x: number, y: number) {
 *     super(scene, x, y, 'coin_sheet', ItemType.COIN);
 *   }
 *
 *   protected onCollect(): void {
 *     // Add coin to game state
 *   }
 *
 *   protected playDeathAnimation(): void {
 *     // Play enemy_death animation centered on coin
 *   }
 * }
 * ```
 */

import Phaser from 'phaser';
import { SpawnMatrix, CellPosition } from '../../systems/SpawnMatrix';
import { BASE_SCALE, ItemType } from '../../../constants/gameConstants';
import { logger } from '../../../utils/Logger';

// Re-export ItemType for convenience (imports from gameConstants)
export { ItemType };

/**
 * Configuration for item spawning
 */
export interface ItemConfig {
  textureKey: string;
  itemType: ItemType;
  spawnMatrix?: SpawnMatrix;
  cellPosition?: CellPosition;
  cellWidth?: number;
  cellHeight?: number;
}

/**
 * Abstract base class for all collectible items
 * Extends Phaser.Physics.Arcade.Sprite directly for proper physics integration
 *
 * **Lifecycle:**
 * 1. Constructor - Creates physics sprite
 * 2. spawn() - Called by SpawnSystem, occupies SpawnMatrix cells
 * 3. onCollect() - Called when player touches the item
 * 4. playDeathAnimation() - Plays death animation
 * 5. destroy() - Automatically frees SpawnMatrix cells
 */
export abstract class AbstractItem extends Phaser.Physics.Arcade.Sprite {
  /**
   * SpawnMatrix reference for automatic cell freeing
   */
  protected spawnMatrix?: SpawnMatrix;

  /**
   * Position in SpawnMatrix (for freeing cells on destroy)
   */
  protected cellPosition?: CellPosition;

  /**
   * Size in SpawnMatrix cells (default: 1x1)
   */
  protected cellWidth: number;
  protected cellHeight: number;

  /**
   * Item type (for collision handling)
   */
  public readonly itemType: ItemType;

  /**
   * Death animation sprite (enemy_death animation)
   */
  protected deathAnimationSprite?: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    itemType: ItemType,
    config?: Partial<ItemConfig>
  ) {
    // Call parent constructor
    super(scene, x, y, texture);

    // Enable physics body immediately
    scene.physics.world.enable(this);

    // ✅ CRITICAL: Add to scene display list!
    // Without this, the sprite exists but is not rendered.
    scene.add.existing(this);

    // Configure physics properties
    // (this as any).body is now available after enable()

    this.itemType = itemType;
    this.cellWidth = config?.cellWidth ?? 1;
    this.cellHeight = config?.cellHeight ?? 1;
    this.spawnMatrix = config?.spawnMatrix;
    this.cellPosition = config?.cellPosition;

    // Configure physics properties (like Portal/Oracle patterns)
    this.setPushable(false);
    this.setImmovable(true);

    logger.log('ABSTRACT_ITEM', `Item created`, {
      itemType,
      x: this.x,
      y: this.y,
      cellPosition: this.cellPosition,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight
    });
  }

  /**
   * Called when item is spawned (by SpawnSystem)
   * Sets up SpawnMatrix integration
   */
  public spawn(spawnMatrix: SpawnMatrix, cellPosition: CellPosition): void {
    this.spawnMatrix = spawnMatrix;
    this.cellPosition = cellPosition;

    logger.log('ABSTRACT_ITEM', `Item spawned`, {
      itemType: this.itemType,
      cellPosition,
      x: this.x,
      y: this.y
    });
  }

  /**
   * Called when player collects the item
   * Subclasses must implement this
   *
   * @abstract
   */
  public abstract onCollect(): void;

  /**
   * Plays death animation (enemy_death centered on item)
   * Subclasses must implement this
   *
   * ⚠️ CRITICAL: Must call freePositionMatrix() before or after animation
   *
   * @abstract
   */
  public abstract playDeathAnimation(): void;

  /**
   * Frees the SpawnMatrix cells occupied by this item
   * ⚠️ CRITICAL: Called automatically on destroy
   *
   * **IMPORTANT:** This prevents memory leaks in SpawnMatrix
   */
  protected freePositionMatrix(): void {
    if (this.spawnMatrix && this.cellPosition) {
      logger.log('ABSTRACT_ITEM', `Freeing SpawnMatrix cells`, {
        itemType: this.itemType,
        cellPosition: this.cellPosition,
        cellWidth: this.cellWidth,
        cellHeight: this.cellHeight
      });

      this.spawnMatrix.freeRect(
        this.cellPosition.col,
        this.cellPosition.row,
        this.cellWidth,
        this.cellHeight,
        'item'
      );

      // Clear references to prevent double-free
      this.spawnMatrix = undefined;
      this.cellPosition = undefined;
    }
  }

  /**
   * Destroys the item and automatically frees SpawnMatrix cells
   * ⚠️ CRITICAL: Always call super.destroy() when overriding
   */
  public destroy(fromScene?: boolean): void {
    logger.log('ABSTRACT_ITEM', `Destroying item`, {
      itemType: this.itemType,
      fromScene,
      hasDeathAnimation: !!this.deathAnimationSprite,
      hasSpawnMatrix: !!this.spawnMatrix
    });

    // Destroy death animation sprite if exists
    if (this.deathAnimationSprite && this.deathAnimationSprite.active) {
      this.deathAnimationSprite.destroy();
      this.deathAnimationSprite = undefined;
    }

    // ⚠️ CRITICAL: Free SpawnMatrix cells
    this.freePositionMatrix();

    // Call parent destroy
    super.destroy(fromScene);
  }

  /**
   * Centers death animation on the item
   * Offset is calculated as: (animationSize - itemSize) / 2
   *
   * @param animationSize Size of the death animation sprite (default: 32)
   * @param itemSize Size of this item (default: 16 for coins)
   */
  protected getDeathAnimationOffset(animationSize: number = 32, itemSize: number = 16): { x: number; y: number } {
    return {
      x: (animationSize - itemSize) / 2,
      y: (animationSize - itemSize) / 2
    };
  }
}
