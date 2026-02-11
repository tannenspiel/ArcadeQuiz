import Phaser from 'phaser';
import { AbstractEnemy } from '../game/entities/enemies/AbstractEnemy';
import { AbstractPortal } from '../game/entities/portals/AbstractPortal';

/**
 * Type Guard для проверки наличия физического тела у объекта
 */
export function hasBody(obj: Phaser.GameObjects.GameObject): obj is Phaser.GameObjects.GameObject & { body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody } {
    return !!obj.body;
}

/**
 * Безопасное получение экземпляра врага из игрового объекта
 */
export function getEnemyFromGameObject(obj: Phaser.GameObjects.GameObject): AbstractEnemy | undefined {
    if (!obj || typeof obj.getData !== 'function') return undefined;
    return obj.getData('enemy') as AbstractEnemy;
}

/**
 * Безопасное получение экземпляра портала из игрового объекта
 */
export function getPortalFromGameObject(obj: Phaser.GameObjects.GameObject): AbstractPortal | undefined {
    if (!obj || typeof obj.getData !== 'function') return undefined;
    return obj.getData('portal') as AbstractPortal;
}

/**
 * Безопасное получение экземпляра предмета (сердце/руна) из игрового объекта
 * В данной реализации предметы - это просто спрайты, но мы можем проверять их texture key или name, если нужно.
 * Пока просто кастим к спрайту.
 */
export function asSprite(obj: Phaser.GameObjects.GameObject): Phaser.Physics.Arcade.Sprite | undefined {
    if (obj instanceof Phaser.Physics.Arcade.Sprite) {
        return obj;
    }
    return undefined;
}
