/**
 * Класс для фоновых спрайтов травы
 * Использует текстуру Bg.Grass.64x64.png с 16 спрайтами по 16x16
 */

import Phaser from 'phaser';
import { AbstractBackgroundSprite, BackgroundSpriteConfig } from './AbstractBackgroundSprite';
import { MAP_WIDTH, MAP_HEIGHT, BASE_SCALE, ACTOR_SIZES, KEYS } from '../../../constants/gameConstants';
import { logger } from '../../../utils/Logger';

export class GrassBackgroundSprite extends AbstractBackgroundSprite {
    private density: number; // Плотность размещения (количество на единицу площади)

    constructor(scene: Phaser.Scene, density: number = 0.1) {
        const config: BackgroundSpriteConfig = {
            textureKey: KEYS.BG_GRASS_SHEET,
            frameWidth: 16,
            frameHeight: 16,
            framesPerRow: 4,
            totalFrames: 16,
            depth: -100, // ✅ Трава - второй слой снизу (выше основного фона -200, но ниже всех остальных объектов)
            scale: BASE_SCALE * ACTOR_SIZES.GRASS // Используем единый мультипликатор, как для всех акторов
        };

        super(scene, config);
        this.density = density;
    }

    /**
     * Разместить спрайты травы на карте
     * @param mapWidth Ширина карты в виртуальных координатах
     * @param mapHeight Высота карты в виртуальных координатах
     * @param count Количество спрайтов (если не указано, вычисляется автоматически на основе density)
     */
    public spawnOnMap(
        mapWidth: number = MAP_WIDTH * BASE_SCALE,
        mapHeight: number = MAP_HEIGHT * BASE_SCALE,
        count?: number
    ): void {
        // Если count не указан, вычисляем количество спрайтов на основе плотности
        let calculatedCount: number;
        if (count !== undefined) {
            calculatedCount = count;
        } else {
            const mapArea = mapWidth * mapHeight;
            const spriteArea = (this.config.frameWidth * this.config.scale!) * (this.config.frameHeight * this.config.scale!);
            calculatedCount = Math.floor((mapArea * this.density) / spriteArea);
        }

        // Минимальный отступ от краев карты
        const edgeOffset = 32 * BASE_SCALE;
        
        // Размещаем спрайты случайным образом
        for (let i = 0; i < calculatedCount; i++) {
            const x = Phaser.Math.Between(edgeOffset, mapWidth - edgeOffset);
            const y = Phaser.Math.Between(edgeOffset, mapHeight - edgeOffset);
            const frameIndex = this.getRandomFrameIndex();
            
            const sprite = this.createSprite(x, y, frameIndex);
            this.sprites.push(sprite);
        }

        logger.log('BACKGROUND', `✅ GrassBackgroundSprite: Размещено ${this.sprites.length} спрайтов травы на карте`);
    }

    /**
     * Установить плотность размещения
     */
    public setDensity(density: number): void {
        this.density = density;
    }

    /**
     * Получить текущую плотность
     */
    public getDensity(): number {
        return this.density;
    }
}

