import Phaser from 'phaser';
import { BASE_SCALE } from '../../constants/gameConstants';
import { logger } from '../../utils/Logger';

/**
 * Компонент 9-slice фона для модальных окон.
 * Использует спрайтшит UI.DialogBox_24x24.png (кадры 8x8).
 * 
 * Схема спрайтшита (3x3):
 * 0 1 2  (A B C)
 * 3 4 5  (D E F)
 * 6 7 8  (G H I)
 */
export class NineSliceBackground extends Phaser.GameObjects.Container {
    private bgTexture: string;
    private tileSize: number;
    private scaledTileSize: number;
    private useStretch: boolean;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        width: number,
        height: number,
        texture: string = 'ui_dialog_box',
        tileSize: number = 8,
        useStretch: boolean = false
    ) {
        // Округляем позицию контейнера для предотвращения размытия и швов
        super(scene, Math.round(x), Math.round(y));

        this.bgTexture = texture;
        this.tileSize = tileSize;
        this.scaledTileSize = this.tileSize * BASE_SCALE;
        this.useStretch = useStretch;
        this.createBackground(width, height);

        scene.add.existing(this);
    }

    /**
     * Очищает и пересоздает фон под нужный размер
     */
    public resize(width: number, height: number): void {
        this.removeAll(true);
        this.createBackground(width, height);
    }

    /**
     * Устанавливает цвет (tint) для всех сегментов 9-slice
     */
    public setTint(color: number): this {
        this.each((child: any) => {
            if (child.setTint) {
                child.setTint(color);
            }
        });
        return this;
    }

    /**
     * Устанавливает сплошной цвет (tintFill)
     */
    public setTintFill(color: number): this {
        this.each((child: any) => {
            if (child.setTintFill) {
                child.setTintFill(color);
            }
        });
        return this;
    }

    /**
     * Очищает tint
     */
    public clearTint(): this {
        this.each((child: any) => {
            if (child.clearTint) {
                child.clearTint();
            }
        });
        return this;
    }

    /**
     * Устанавливает режим смешивания
     */
    public setBlendMode(mode: Phaser.BlendModes | string): this {
        this.each((child: any) => {
            if (child.setBlendMode) {
                child.setBlendMode(mode);
            }
        });
        return this;
    }

    /**
     * Устанавливает прозрачность
     */
    public setAlpha(alpha: number): this {
        super.setAlpha(alpha);
        this.each((child: any) => {
            if (child.setAlpha) {
                child.setAlpha(alpha);
            }
        });
        return this;
    }

    /**
     * Настраивает интерактивность для контейнера (так как у Container нет размера по умолчанию)
     */
    public setupInteractive(): this {
        // Нам нужно знать размеры, которые были использованы при создании
        // Используем bounds контейнера для создания hitArea
        const bounds = this.getBounds();
        const w = Math.round(bounds.width);
        const h = Math.round(bounds.height);

        // ВАЖНО: setInteractive для Container требует явной формы
        this.setInteractive(
            new Phaser.Geom.Rectangle(Math.round(-w / 2), Math.round(-h / 2), w, h),
            Phaser.Geom.Rectangle.Contains
        );
        return this;
    }

    private createBackground(width: number, height: number): void {
        const ts = Math.round(this.scaledTileSize);
        // Используем четные размеры для избежания проблем с центром контейнера (0.5px)
        const w = Math.round(width / 2) * 2;
        const h = Math.round(height / 2) * 2;

        // Расчет размеров и позиций
        const midWidth = w - ts * 2;
        const midHeight = h - ts * 2;

        // Если размер слишком маленький, ограничиваем
        if (midWidth < 0 || midHeight < 0) {
            logger.warn('MODAL_SIZE', `NineSliceBackground (${this.bgTexture}): Requested size is too small for 9-slice corners`);
        }

        // ПОРЯДОК ВАЖЕН: Добавляем сначала границы и центр, затем углы поверх них
        // Это позволяет границам "наползать" под углы без видимых швов

        // 1. Границы (B, D, F, H) и Середина (E)
        if (midWidth > 0) {
            // Top Border (B) - без перекрытия
            this.addBorder(ts, 0, midWidth, ts, 1);
            // Bottom Border (H) - без перекрытия
            this.addBorder(ts, h - ts, midWidth, ts, 7);
        }

        if (midHeight > 0) {
            // Left Border (D) - без перекрытия
            this.addBorder(0, ts, ts, midHeight, 3);
            // Right Border (F) - без перекрытия
            this.addBorder(w - ts, ts, ts, midHeight, 5);
        }

        // Середина (E) - без перекрытия
        if (midWidth > 0 && midHeight > 0) {
            this.addBorder(ts, ts, midWidth, midHeight, 4);
        }

        // 2. Углы (A, C, G, I) - рисуются ПОВЕРХ границ
        // Top-Left (A)
        this.addCorner(0, 0, 0);
        // Top-Right (C)
        this.addCorner(w - ts, 0, 2);
        // Bottom-Left (G)
        this.addCorner(0, h - ts, 6);
        // Bottom-Right (I)
        this.addCorner(w - ts, h - ts, 8);

        // Устанавливаем ориентацию контейнера так, чтобы x,y были центром (как у Rectangle)
        this.each((child: any) => {
            child.x = Math.round(child.x - w / 2);
            child.y = Math.round(child.y - h / 2);
        });

        // По умолчанию для UI элементов в этом проекте
        this.setScrollFactor(0);
    }

    private addCorner(x: number, y: number, frame: number): void {
        const corner = this.scene.add.image(Math.round(x), Math.round(y), this.bgTexture, frame)
            .setOrigin(0)
            .setScale(BASE_SCALE);
        this.add(corner);
    }

    private addBorder(x: number, y: number, width: number, height: number, frame: number): void {
        if (this.useStretch) {
            // Используем Image с масштабированием
            const border = this.scene.add.image(
                Math.round(x),
                Math.round(y),
                this.bgTexture,
                frame
            )
                .setOrigin(0);

            // Масштабируем до нужного размера
            border.setDisplaySize(Math.round(width), Math.round(height));
            this.add(border);
        } else {
            // TileSprite для границ и центра (повторение паттерна)
            // Используем Math.round для всех параметров
            const border = this.scene.add.tileSprite(
                Math.round(x),
                Math.round(y),
                Math.round(width),
                Math.round(height),
                this.bgTexture,
                frame
            )
                .setOrigin(0)
                .setTileScale(BASE_SCALE, BASE_SCALE);
            this.add(border);
        }
    }
}
