/**
 * Абстрактный класс для фоновых спрайтов
 * Используется для декоративных элементов, которые не имеют коллизий
 */

import Phaser from 'phaser';
import { BASE_SCALE } from '../../../constants/gameConstants';

export interface BackgroundSpriteConfig {
    textureKey: string;
    frameWidth: number;
    frameHeight: number;
    framesPerRow: number;
    totalFrames: number;
    depth?: number;
    scale?: number;
}

export abstract class AbstractBackgroundSprite {
    protected scene: Phaser.Scene;
    protected sprites: Phaser.GameObjects.Sprite[] = [];
    protected config: BackgroundSpriteConfig;

    constructor(scene: Phaser.Scene, config: BackgroundSpriteConfig) {
        this.scene = scene;
        this.config = {
            depth: 1, // ✅ Трава - всегда второй слой снизу (выше текстуры карты -100, но ниже всех остальных объектов)
            scale: BASE_SCALE,
            ...config
        };
    }

    /**
     * Создать спрайт из текстуры с указанным фреймом
     * ✅ ИЗМЕНЕНО: Используем Sprite вместо Image для правильной работы с setFrame
     */
    protected createSprite(x: number, y: number, frameIndex: number): Phaser.GameObjects.Sprite {
        const { textureKey, frameWidth, frameHeight, framesPerRow, depth, scale } = this.config;

        // ✅ Используем sprite вместо image - sprite автоматически масштабирует кадр правильно
        const sprite = this.scene.add.sprite(x, y, textureKey);

        // setFrame для spritesheet с кадрами 16x16
        try {
            sprite.setFrame(frameIndex);
        } catch (e) {
            // Fallback: если setFrame не сработал (текстура не spritesheet), используем setCrop
            const frameX = (frameIndex % framesPerRow) * frameWidth;
            const frameY = Math.floor(frameIndex / framesPerRow) * frameHeight;
            sprite.setCrop(frameX, frameY, frameWidth, frameHeight);
        }

        // Настраиваем спрайт
        sprite.setScale(scale || BASE_SCALE);
        sprite.setDepth(depth || 1);
        sprite.setOrigin(0.5, 0.5);

        return sprite;
    }

    /**
     * Получить случайный индекс фрейма
     */
    protected getRandomFrameIndex(): number {
        return Phaser.Math.Between(0, this.config.totalFrames - 1);
    }

    /**
     * Разместить спрайты на карте (абстрактный метод, должен быть реализован в подклассах)
     */
    public abstract spawnOnMap(
        mapWidth: number,
        mapHeight: number,
        count?: number
    ): void;

    /**
     * Уничтожить все спрайты
     */
    public destroy(): void {
        this.sprites.forEach(sprite => {
            if (sprite && sprite.active) {
                sprite.destroy();
            }
        });
        this.sprites = [];
    }

    /**
     * Получить все спрайты
     */
    public getSprites(): Phaser.GameObjects.Sprite[] {
        return this.sprites;
    }
}

