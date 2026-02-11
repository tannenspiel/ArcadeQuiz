/**
 * Heart - Collectible health item
 *
 * **Behavior:**
 * - Spawns periodically on map
 * - When collected: +1 life directly (no quiz)
 * - Death animation: enemy_death centered on heart sprite
 *
 * **Flow:**
 * 1. Player touches heart → +1 life immediately
 * 2. Death animation plays → heart disappears
 */

import type MainScene from '../../scenes/MainScene';
import { AbstractItem, ItemType } from './AbstractItem';
import { logger } from '../../../utils/Logger';
import { ACTOR_SIZES, BASE_SCALE, DEPTHS } from '../../../constants/gameConstants';

/**
 * Heart - collectible health item
 */
export class Heart extends AbstractItem {
  constructor(scene: MainScene, x: number, y: number) {
    // Use 'heart_tex' texture key (from gameConstants KEYS)
    super(scene, x, y, 'heart_tex', ItemType.HEART);

    // Set scale based on ACTOR_SIZES
    this.setScale(BASE_SCALE * ACTOR_SIZES.HEART);

    // ✅ VISIBILITY: Set same depth as other items (coins, keys)
    // ✅ CRITICAL: Set depth above Tiled Map layers (which are typically 0-10)
    this.setVisible(true);
    this.setDepth(DEPTHS.WORLD.ITEMS); // Above Tiled Map, below Player (200), below Portals (150)

    logger.log('HEART', `Heart created`, {
      x: this.x,
      y: this.y,
      scale: this.scale,
      depth: 100
    });
  }

  /**
   * Called when player collects the heart
   * Directly adds +1 life (no quiz)
   */
  public onCollect(): void {
    logger.log('HEART', `Heart collected - adding life`, {
      x: this.x,
      y: this.y
    });

    // NOTE: The actual life addition happens in ItemCollisionHandler
    // This is just the trigger point for the collection flow.
    //
    // Flow: ItemCollisionHandler.detectHeart() → GameState.addLife() → playDeathAnimation()
    //
    // Hearts give +1 life directly without any quiz
  }

  /**
   * Plays death animation centered on the heart
   *
   * ⚠️ CRITICAL: Must call freePositionMatrix() to free SpawnMatrix cells
   *
   * Centering: enemy_death is 32x32, heart is same size
   * Offset: (32 - heart_size) / 2
   */
  public playDeathAnimation(): void {
    logger.log('HEART', `Playing death animation`, {
      x: this.x,
      y: this.y,
      hasSpawnMatrix: !!this.spawnMatrix
    });

    // ⚠️ CRITICAL: Free SpawnMatrix cells BEFORE creating death animation
    this.freePositionMatrix();

    // Disable physics body
    if (this.body) {
      this.disableBody(true, false);
    }

    // Hide main sprite
    this.setVisible(false);

    // Check if enemy_death animation exists
    if (!this.scene.anims.exists('enemy_death')) {
      logger.warn('HEART', 'enemy_death animation not found, destroying immediately');
      this.destroy();
      return;
    }

    // Calculate offset for centering death animation
    // enemy_death is 32x32, heart size depends on texture
    // We'll use the same offset as coin/key for consistency
    const offset = this.getDeathAnimationOffset(32, 16);

    // Create death animation sprite (non-physics sprite)
    this.deathAnimationSprite = this.scene.add.sprite(
      this.x - offset.x,
      this.y - offset.y,
      'enemy_death'
    );

    // Set scale same as heart
    this.deathAnimationSprite.setScale(BASE_SCALE * ACTOR_SIZES.HEART);

    // Set depth above heart
    this.deathAnimationSprite.setDepth(this.depth + 1);

    // Initialize manual frame sync flags (for AnimationSyncManager)
    (this.deathAnimationSprite as any)._animationInitialized = false;
    (this.deathAnimationSprite as any)._animationFrameIndex = 0;
    (this.deathAnimationSprite as any)._animationTimer = 0;
    (this.deathAnimationSprite as any)._lastFrameShown = false;

    // Note: Death animation cleanup is handled by AnimationSyncManager
    // when it reaches the last frame (based on _lastFrameShown flag)

    logger.log('HEART', `Death animation sprite created`, {
      position: { x: this.x - offset.x, y: this.y - offset.y },
      offset,
      scale: this.deathAnimationSprite.scale
    });
  }

  /**
   * Destroys the heart and cleans up
   */
  public destroy(fromScene?: boolean): void {
    logger.log('HEART', `Destroying heart`, {
      fromScene,
      hasDeathAnimation: !!this.deathAnimationSprite
    });

    // Call parent destroy (handles SpawnMatrix cleanup, death animation cleanup)
    super.destroy(fromScene);
  }
}
