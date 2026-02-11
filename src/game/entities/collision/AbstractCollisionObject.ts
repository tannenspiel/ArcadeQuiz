/**
 * Абстрактный класс для статичных объектов коллизии
 * Используется для объектов, которые имеют физику и коллизии, но не двигаются
 */

import Phaser from 'phaser';
import { BASE_SCALE, COLLISION_CONFIG } from '../../../constants/gameConstants';
import { logger } from '../../../utils/Logger';
// DEBUG_CONFIG больше не используется - настройки отладки берутся из конфига уровня

export interface CollisionObjectConfig {
    textureKey: string;
    frameWidth: number;
    frameHeight: number;
    framesPerRow: number;
    totalFrames: number;
    depth?: number;
    scale?: number;
    collisionRadius?: number; // Радиус коллизии (если не указан, используется размер спрайта)
}

export abstract class AbstractCollisionObject {
    protected scene: Phaser.Scene;
    protected sprites: Phaser.Physics.Arcade.Sprite[] = [];
    protected config: CollisionObjectConfig;
    protected showCollisionDebug: boolean; // ✅ Настройка отладки коллизий

    constructor(scene: Phaser.Scene, config: CollisionObjectConfig, showCollisionDebug?: boolean) {
        this.scene = scene;
        this.config = {
            depth: 6, // По умолчанию выше порталов (5), но ниже игрока (150)
            scale: BASE_SCALE,
            ...config
        };
        // ✅ Используем значение из параметра (конфиг уровня), если задано, иначе false
        this.showCollisionDebug = showCollisionDebug ?? false;
    }

    /**
     * Создать спрайт с коллизией из текстуры с указанным фреймом
     */
    protected createSprite(x: number, y: number, frameIndex: number): Phaser.Physics.Arcade.Sprite {
        const { textureKey, frameWidth, frameHeight, depth, scale } = this.config;
        const finalScale = scale || BASE_SCALE;

        // Проверяем, загружена ли текстура
        if (!this.scene.textures.exists(textureKey)) {
            console.error(`❌ AbstractCollisionObject: Texture "${textureKey}" does not exist!`);
            throw new Error(`Texture "${textureKey}" not found`);
        }

        // ВАЖНО: Используем тот же подход, что и порталы/оракул
        // Создаем физический спрайт с указанием фрейма из spritesheet
        const sprite = this.scene.physics.add.sprite(x, y, textureKey, frameIndex);
        
        // Настраиваем спрайт (порядок как у порталов)
        sprite.setOrigin(0.5, 0.5);
        sprite.setScale(finalScale);
        sprite.setDepth(depth || 6);
        
        // Настраиваем физику (как у порталов и оракула)
        sprite.setImmovable(true); // Статичный объект
        sprite.setPushable(false); // Нельзя толкать
        
        // ВАЖНО: Phaser автоматически создает тело коллизии на основе размера фрейма после масштабирования
        // Но для кустов мы уменьшаем размер коллизии с отступом, чтобы персонаж мог немного заходить на куст
        // ВАЖНО: setSize принимает размеры в БАЗОВЫХ пикселях (до масштабирования), а не в виртуальных!
        // Поэтому вычисляем размер тела коллизии в базовых пикселях
        // Отступ задан в виртуальных пикселях, поэтому делим его на масштаб
        const offsetInBasePixels = COLLISION_CONFIG.BUSH_COLLISION_OFFSET / finalScale;
        const bodyWidth = Math.max(1, frameWidth - (offsetInBasePixels * 2));
        const bodyHeight = Math.max(1, frameHeight - (offsetInBasePixels * 2));
        
        // Устанавливаем размер тела коллизии с отступом
        // ВАЖНО: setSize должен быть вызван ПОСЛЕ setScale, чтобы Phaser правильно применил изменения
        // ВАЖНО: setSize принимает размеры в БАЗОВЫХ пикселях (до масштабирования)
        // Phaser автоматически применит масштаб к телу коллизии
        sprite.body.setSize(bodyWidth, bodyHeight);
        
        // ВАЖНО: После setSize нужно обновить тело коллизии, чтобы изменения применились
        // updateFromGameObject() обновит позицию тела коллизии относительно спрайта
        sprite.body.updateFromGameObject();
        
        // При origin 0.5 Phaser автоматически центрирует тело коллизии
        // Отступ применяется равномерно со всех сторон
        
        // Логирование для отладки
        const body = sprite.body as Phaser.Physics.Arcade.Body;
        logger.log('COLLISION_ABSTRACT', `🌳 AbstractCollisionObject.createSprite():`, {
            textureKey,
            frameIndex,
            spritePosition: { x: sprite.x, y: sprite.y },
            frameSize: { width: frameWidth, height: frameHeight },
            scale: finalScale,
            displaySize: { width: sprite.displayWidth, height: sprite.displayHeight },
            collisionOffset: COLLISION_CONFIG.BUSH_COLLISION_OFFSET,
            offsetInBasePixels: offsetInBasePixels,
            bodySizeInBasePixels: { width: bodyWidth, height: bodyHeight },
            expectedBodySizeInVirtualPixels: { width: bodyWidth * finalScale, height: bodyHeight * finalScale },
            actualBodySize: { width: body.width, height: body.height },
            bodyPosition: { x: body.x, y: body.y },
            bodyCenter: { x: body.x + body.width / 2, y: body.y + body.height / 2 },
            spriteOrigin: { x: sprite.originX, y: sprite.originY },
            spriteDisplaySize: { width: sprite.displayWidth, height: sprite.displayHeight },
            spriteFrame: { name: sprite.frame.name, index: frameIndex }
        });
        
        // Отладочная отрисовка тела коллизии
        // Используем displayWidth и displayHeight для правильного отображения размера коллизии
        this.drawCollisionDebug(sprite);

        return sprite;
    }
    
    /**
     * Отладочная отрисовка тела коллизии
     */
    private drawCollisionDebug(sprite: Phaser.Physics.Arcade.Sprite): void {
        // ✅ Используем настройку из конфига уровня или глобального конфига
        if (!this.showCollisionDebug) return;
        // Создаем графику для отрисовки тела коллизии
        const graphics = this.scene.add.graphics();
        graphics.setDepth((sprite.depth || 6) + 1); // Чуть выше спрайта
        
        // Обновляем отрисовку каждый кадр
        const updateDebug = () => {
            if (!sprite.active || !sprite.body) {
                graphics.destroy();
                return;
            }
            
            graphics.clear();
            
            // Получаем позицию и размеры тела коллизии
            const body = sprite.body as Phaser.Physics.Arcade.Body;
            
            // ВАЖНО: Phaser автоматически создает тело коллизии на основе размера фрейма после масштабирования
            // Тело коллизии должно совпадать с визуальным размером спрайта (displayWidth × displayHeight)
            // Используем displayWidth и displayHeight для правильного отображения размера коллизии
            
            // Рисуем визуальные границы спрайта (желтый контур) - это визуальный размер спрайта
            graphics.lineStyle(2, 0xffff00, 1); // Желтый контур - визуальный размер спрайта (displayWidth × displayHeight)
            const spriteLeft = sprite.x - sprite.displayWidth / 2;
            const spriteTop = sprite.y - sprite.displayHeight / 2;
            graphics.strokeRect(spriteLeft, spriteTop, sprite.displayWidth, sprite.displayHeight);
            
            // Рисуем прямоугольник коллизии (красный контур) - это реальное тело коллизии Phaser
            // Используем body.x, body.y, body.width, body.height для отображения фактического тела коллизии
            graphics.lineStyle(2, 0xff0000, 1); // Красный контур - реальное тело коллизии (body.x, body.y, body.width, body.height)
            graphics.strokeRect(body.x, body.y, body.width, body.height);
            
            // Рисуем центр спрайта (зеленая точка)
            graphics.fillStyle(0x00ff00, 1); // Зеленая точка - центр спрайта
            graphics.fillCircle(sprite.x, sprite.y, 5);
            
            // Рисуем центр тела коллизии (синяя точка) - центр реального тела коллизии
            graphics.fillStyle(0x0000ff, 1); // Синяя точка - центр тела коллизии (body.center)
            const bodyCenterX = body.x + body.width / 2;
            const bodyCenterY = body.y + body.height / 2;
            graphics.fillCircle(bodyCenterX, bodyCenterY, 5);
        };
        
        // Обновляем отрисовку каждый кадр
        this.scene.events.on('update', updateDebug);
        
        // Очищаем при уничтожении спрайта
        sprite.on('destroy', () => {
            graphics.destroy();
            this.scene.events.off('update', updateDebug);
        });
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
        count?: number,
        spawnSystem?: any // SpawnSystem для безопасного размещения
    ): void;

    /**
     * Уничтожить все спрайты
     */
    public destroy(): void {
        // Удаляем каждый спрайт из сцены
        this.sprites.forEach(sprite => {
            if (sprite) {
                // Удаляем из группы коллизии если есть
                if (sprite.body) {
                    sprite.body.destroy();
                }
                // Удаляем спрайт из сцены
                if (sprite.active) {
                    sprite.destroy();
                }
            }
        });
        this.sprites = [];

        // ⚠️ НОВО: Также удаляем отладочную графику если есть
        if (this.debugGraphics) {
            this.debugGraphics.destroy();
            this.debugGraphics = null;
        }
    }

    /**
     * Получить все спрайты
     */
    public getSprites(): Phaser.Physics.Arcade.Sprite[] {
        return this.sprites;
    }

    /**
     * Получить группу спрайтов для коллизий
     */
    public getGroup(): Phaser.Physics.Arcade.Group {
        const group = this.scene.physics.add.group();
        this.sprites.forEach(sprite => {
            if (sprite && sprite.active) {
                group.add(sprite);
            }
        });
        return group;
    }
}

