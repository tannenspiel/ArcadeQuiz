/**
 * Coin - Collectible coin item for Coin Phase
 *
 * **Behavior:**
 * - Spawns on map during COIN Phase
 * - When collected: triggers CoinBubbleQuiz (true/false statement)
 * - Correct answer: +score, +coin, continue
 * - Wrong answer: -life, no coin, continue
 * - Death animation: enemy_death centered on 16x16 coin
 *
 * **Phase 1 Flow:**
 * 1. Player touches coin → physics pause
 * 2. CoinBubbleQuiz appears (2 bubbles, no modal)
 * 3. Player answers → result
 * 4. Death animation plays → coin disappears
 */

import type MainScene from '../../scenes/MainScene';
import { AbstractItem, ItemType } from './AbstractItem';
import { logger } from '../../../utils/Logger';
import { ACTOR_SIZES, BASE_SCALE, DEPTHS } from '../../../constants/gameConstants';

/**
 * Coin - collectible item during Coin Phase
 */
export class Coin extends AbstractItem {
  constructor(scene: MainScene, x: number, y: number) {
    // ⚠️ CRITICAL: Use 'coin_sheet' texture key (from spritesheetConfigs.ts)
    super(scene, x, y, 'coin_sheet', ItemType.COIN);

    // Set scale based on ACTOR_SIZES
    this.setScale(BASE_SCALE * ACTOR_SIZES.COIN);

    // Play idle animation
    this.play('coin_idle');

    // ✅ VISIBILITY: Set same depth as other items (keys, hearts)
    // ✅ CRITICAL: Set depth above Tiled Map layers (which are typically 0-10)
    this.setVisible(true);
    this.setDepth(DEPTHS.WORLD.ITEMS); // Above Tiled Map, below Player (200), below Portals (150)

    logger.log('COIN', `Coin created`, {
      x: this.x,
      y: this.y,
      scale: this.scale,
      depth: 100,
      body: !!this.body
    });
  }

  /**
   * Called when player collects the coin
   * This triggers the quiz flow - actual collection happens after quiz result
   */
  public onCollect(): void {
    logger.log('COIN', `Coin collected - quiz will be shown`, {
      x: this.x,
      y: this.y
    });

    // NOTE: The actual collection logic (adding to game state) happens in CoinQuizHandler
    // based on quiz result. This is just the trigger point.
    //
    // Flow: ItemCollisionHandler.detectCoin() → CoinBubbleQuiz → CoinQuizHandler.handleCorrect/Wrong()
    //
    // The CoinBubbleQuiz will emit COIN_QUIZ_COMPLETED event with the result
    // CoinQuizHandler listens for this event and updates GameState accordingly
  }

  /**
   * ⚠️ DEPRECATED: Now just destroys the coin.
   */
  public playDeathAnimation(): void {
    logger.log('COIN', `playDeathAnimation called - redirecting to destroy()`, {
      x: this.x,
      y: this.y
    });
    this.destroy();
  }

  /**
   * Destroys the coin and cleans up
   */
  public destroy(fromScene?: boolean): void {
    logger.log('COIN', `Destroying coin`, {
      fromScene,
      hasDeathAnimation: !!this.deathAnimationSprite
    });

    // Call parent destroy (handles SpawnMatrix cleanup, death animation cleanup)
    super.destroy(fromScene);
  }
}
