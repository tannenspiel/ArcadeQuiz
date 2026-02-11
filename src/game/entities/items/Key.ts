/**
 * Key - Collectible key item for Key Phase
 *
 * **Behavior:**
 * - Spawns on map during KEY Phase (after 3 coins delivered to Oracle)
 * - When collected: triggers KeyQuestionModal (modal window with question)
 * - Correct answer: +score, +key, continue
 * - Wrong answer: -life, lose key, continue
 * - Death animation: enemy_death centered on 16x16 key
 *
 * **Phase 2 Flow:**
 * 1. Player touches key → physics pause
 * 2. KeyQuestionModal appears (modal with question)
 * 3. Player answers → result
 * 4. Death animation plays → key disappears
 */

import type MainScene from '../../scenes/MainScene';
import { AbstractItem, ItemType } from './AbstractItem';
import { logger } from '../../../utils/Logger';
import { ACTOR_SIZES, BASE_SCALE, DEPTHS } from '../../../constants/gameConstants';

/**
 * Key - collectible item during Key Phase
 */
export class Key extends AbstractItem {
  constructor(scene: MainScene, x: number, y: number) {
    // Use 'key_sheet' texture key (from spritesheetConfigs.ts)
    super(scene, x, y, 'key_sheet', ItemType.KEY);

    // Set scale based on ACTOR_SIZES
    this.setScale(BASE_SCALE * ACTOR_SIZES.KEY);

    // Play idle animation
    this.play('key_idle');

    // ✅ VISIBILITY: Set same depth as other items (coins, hearts)
    // ✅ CRITICAL: Set depth above Tiled Map layers (which are typically 0-10)
    this.setVisible(true);
    this.setDepth(DEPTHS.WORLD.ITEMS); // Above Tiled Map, below Player (200), below Portals (150)

    logger.log('KEY', `Key created`, {
      x: this.x,
      y: this.y,
      scale: this.scale,
      depth: 100
    });
  }

  /**
   * Called when player collects the key
   * This triggers the KeyQuestionModal flow
   */
  public onCollect(): void {
    logger.log('KEY', `Key collected - KeyQuestionModal will be shown`, {
      x: this.x,
      y: this.y
    });

    // NOTE: The actual collection logic (adding to inventory) happens in KeyQuizHandler
    // based on quiz result. This is just the trigger point.
    //
    // Flow: ItemCollisionHandler.detectKey() → KeyQuestionModal → KeyQuizHandler.handleCorrect/Wrong()
    //
    // The KeyQuestionModal will emit KEY_QUIZ_COMPLETED event with the result
    // KeyQuizHandler listens for this event and updates GameState accordingly
  }

  /**
   * Plays death animation centered on the key
   *
   * ⚠️ CRITICAL: Must call freePositionMatrix() to free SpawnMatrix cells
   *
   * Centering: enemy_death is 32x32, key is 16x16
   * Offset: (32 - 16) / 2 = 8 pixels
   */
  public playDeathAnimation(): void {
    logger.log('KEY', `Playing death animation`, {
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
      logger.warn('KEY', 'enemy_death animation not found, destroying immediately');
      this.destroy();
      return;
    }

    // Calculate offset for centering death animation
    // enemy_death is 32x32, key is 16x16 → offset is 8 pixels
    const offset = this.getDeathAnimationOffset(32, 16);

    // Create death animation sprite (non-physics sprite)
    this.deathAnimationSprite = this.scene.add.sprite(
      this.x - offset.x,
      this.y - offset.y,
      'enemy_death'
    );

    // Set scale same as key
    this.deathAnimationSprite.setScale(BASE_SCALE * ACTOR_SIZES.KEY);

    // Set depth above key
    this.deathAnimationSprite.setDepth(this.depth + 1);

    // Initialize manual frame sync flags (for AnimationSyncManager)
    (this.deathAnimationSprite as any)._animationInitialized = false;
    (this.deathAnimationSprite as any)._animationFrameIndex = 0;
    (this.deathAnimationSprite as any)._animationTimer = 0;
    (this.deathAnimationSprite as any)._lastFrameShown = false;

    // Note: Death animation cleanup is handled by AnimationSyncManager
    // when it reaches the last frame (based on _lastFrameShown flag)

    logger.log('KEY', `Death animation sprite created`, {
      position: { x: this.x - offset.x, y: this.y - offset.y },
      offset,
      scale: this.deathAnimationSprite.scale
    });
  }

  /**
   * Destroys the key and cleans up
   */
  public destroy(fromScene?: boolean): void {
    logger.log('KEY', `Destroying key`, {
      fromScene,
      hasDeathAnimation: !!this.deathAnimationSprite
    });

    // Call parent destroy (handles SpawnMatrix cleanup, death animation cleanup)
    super.destroy(fromScene);
  }
}
