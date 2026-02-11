/**
 * Items Index - Exports all item classes and factory
 *
 * **Available Items:**
 * - Coin: Collectible during COIN Phase, triggers CoinBubbleQuiz
 * - Key: Collectible during KEY Phase, triggers KeyQuestionModal
 * - Heart: Collectible anytime, gives +1 life directly
 *
 * **Usage:**
 * ```typescript
 * import { Coin, Key, Heart, createItem, ItemType } from './items';
 *
 * // Factory usage
 * const coin = createItem(scene, x, y, ItemType.COIN);
 * ```
 */

export { AbstractItem, ItemType } from './AbstractItem';
export { Coin } from './Coin';
export { Key } from './Key';
export { Heart } from './Heart';

import type MainScene from '../../scenes/MainScene';
import { Coin } from './Coin';
import { Key } from './Key';
import { Heart } from './Heart';
import { ItemType } from './AbstractItem';
import { logger } from '../../../utils/Logger';

/**
 * Factory function to create items by type
 * Used by SpawnSystem for spawning items
 *
 * @param scene - MainScene reference
 * @param x - World X coordinate
 * @param y - World Y coordinate
 * @param itemType - Type of item to create
 * @returns Created item instance
 */
export function createItem(scene: MainScene, x: number, y: number, itemType: ItemType): AbstractItem {
  switch (itemType) {
    case ItemType.COIN:
      return new Coin(scene, x, y);
    case ItemType.KEY:
      return new Key(scene, x, y);
    case ItemType.HEART:
      return new Heart(scene, x, y);
    default:
      logger.error('ITEMS', `Unknown item type: ${itemType}`);
      throw new Error(`Unknown item type: ${itemType}`);
  }
}
