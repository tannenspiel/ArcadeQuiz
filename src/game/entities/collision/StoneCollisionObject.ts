/**
 * Класс для объектов коллизии - камни
 * Использует текстуру CollisionObject.Stone.128x32.png с 4 спрайтами по 32x32
 */

import Phaser from 'phaser';
import { AbstractCollisionObject, CollisionObjectConfig } from './AbstractCollisionObject';
import { MAP_WIDTH, MAP_HEIGHT, BASE_SCALE, ACTOR_SIZES, KEYS } from '../../../constants/gameConstants';
import { SpawnSystem } from '../../systems/SpawnSystem';
import { logger } from '../../../utils/Logger';

export class StoneCollisionObject extends AbstractCollisionObject {
    constructor(scene: Phaser.Scene, showCollisionDebug?: boolean) {
        const config: CollisionObjectConfig = {
            textureKey: KEYS.COLLISION_STONE_SHEET,
            frameWidth: 32,
            frameHeight: 32,
            framesPerRow: 4,
            totalFrames: 4,
            depth: 1, // Сразу после карты (TILED_MAP: 0), но ниже ключей/монеток (ITEMS: 100)
            scale: BASE_SCALE * ACTOR_SIZES.BUSH, // Используем единый мультипликатор, как для всех акторов
        };

        super(scene, config, showCollisionDebug);
    }

    /**
     * Разместить камни на карте
     * ✅ Использует матричную систему для безопасного размещения
     * @param mapWidth Ширина карты в виртуальных координатах
     * @param mapHeight Высота карты в виртуальных координатах
     * @param count Количество камней
     * @param spawnSystem Система спавна для безопасного размещения
     */
    public spawnOnMap(
        mapWidth: number = MAP_WIDTH * BASE_SCALE,
        mapHeight: number = MAP_HEIGHT * BASE_SCALE,
        count: number = 15,
        spawnSystem?: SpawnSystem
    ): void {
        // Размещаем камни случайным образом, используя матричную систему
        let stonesSpawned = 0;
        for (let i = 0; i < count; i++) {
            let pos: { x: number; y: number };

            if (spawnSystem) {
                // ✅ Используем матричную систему для безопасного размещения
                // Камни занимают 2×2 ячейки (128×128 пикселей)
                const posResult = spawnSystem.spawnStoneMatrix();
                if (!posResult.success) {
                    console.warn(`⚠️ StoneCollisionObject.spawnOnMap: Не удалось найти безопасную позицию для камня ${i + 1}/${count}. Пропускаем.`);
                    continue;
                }
                pos = { x: posResult.x, y: posResult.y };
            } else {
                // Fallback: случайное размещение без проверки пересечений
                const edgeOffset = 32 * BASE_SCALE;
                pos = {
                    x: Phaser.Math.Between(edgeOffset, mapWidth - edgeOffset),
                    y: Phaser.Math.Between(edgeOffset, mapHeight - edgeOffset)
                };
            }

            const frameIndex = this.getRandomFrameIndex();
            const sprite = this.createSprite(pos.x, pos.y, frameIndex);
            this.sprites.push(sprite);
            stonesSpawned++;
        }

        if (stonesSpawned < count) {
            console.warn(`⚠️ StoneCollisionObject.spawnOnMap: Создано только ${stonesSpawned} из ${count} камней.`);
        } else {
            logger.log('COLLISION_STONE', `✅ StoneCollisionObject: Размещено ${stonesSpawned} камней на карте`);
        }
    }
}
