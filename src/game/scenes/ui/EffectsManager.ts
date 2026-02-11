import Phaser from 'phaser';
import { Player } from '../../entities/Player';
import { DEPTHS } from '../../../constants/gameConstants';
import { logger } from '../../../utils/Logger';

/**
 * Callbacks for operations that require MainScene
 */
export interface EffectsManagerCallbacks {
    onUpdateHUD: () => void;
    getZoomCompensatedPosition: (screenX: number, screenY: number) => { x: number; y: number };
}

/**
 * Dependencies for EffectsManager
 */
export interface EffectsManagerDependencies {
    scene: Phaser.Scene;
    player: Player;
    tweens: Phaser.Tweens.TweenManager;
}

/**
 * Manages visual effects (flash, floating text)
 */
export class EffectsManager {
    // Tracking for flash effects
    private playerFlashLoseKeyInterval: Phaser.Time.TimerEvent | null = null;
    private playerFlashGetKeyInterval: Phaser.Time.TimerEvent | null = null;
    private playerFlashGetKeyPositionTimer: Phaser.Time.TimerEvent | null = null;
    private playerFlashGetKeySprites: Phaser.GameObjects.Sprite[] = [];

    constructor(
        private deps: EffectsManagerDependencies,
        private callbacks: EffectsManagerCallbacks
    ) { }

    /**
     * Shows floating text at world position
     */
    public showFloatingText(worldX: number, worldY: number, message: string, color: number): void {
        const cam = this.deps.scene.cameras.main;

        // ✅ Switch to World Coordinates for reliability
        // Instead of calculating screen position, we place text in the world
        // and invert the zoom scale so it looks consistent.

        // ✅ Округляем координаты до целых чисел для pixel-perfect рендеринга
        const roundedX = Math.round(worldX);
        const roundedY = Math.round(worldY);

        const text = this.deps.scene.add.text(roundedX, roundedY, message, {
            fontSize: `${24}px`,
            fontFamily: 'Nunito',
            fontStyle: 'bold',
            color: `#${color.toString(16).padStart(6, '0')}`,
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(DEPTHS.SCREEN.EFFECTS);

        // ✅ Устанавливаем разрешение = 1 для четкости
        text.setResolution(1);

        // Compensate for camera zoom to keep text size consistent visibly
        if (cam) {
            text.setScale(1 / cam.zoom);
        }

        this.deps.tweens.add({
            targets: text,
            alpha: 0,
            y: worldY - 50, // Move up in world coordinates
            duration: 1000,
            onComplete: () => text.destroy()
        });

        logger.log('UI', `Floating text shown at world [${worldX}, ${worldY}]: ${message}`);
    }

    /**
     * Flashes a sprite with a color
     */
    public flashSprite(
        sprite: Phaser.GameObjects.Sprite,
        color: number = 0xffffff,
        duration: number = 1000,
        onComplete?: () => void
    ): void {
        const originalBlendMode = sprite.blendMode;
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        sprite.setTint(color);

        this.deps.tweens.add({
            targets: sprite,
            alpha: 0.2,
            duration: 100,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                sprite.setBlendMode(originalBlendMode);
                sprite.clearTint();
                sprite.setAlpha(1);
                if (onComplete) onComplete();
            }
        });
    }

    /**
     * Flashes player when losing a key
     */
    public flashPlayerLoseKey(): void {
        logger.log('FLASH_PLAYER', 'flashPlayerLoseKey called');

        const playerSprite = this.deps.player.getSprite();
        if (!playerSprite || !playerSprite.active) {
            logger.warn('FLASH_PLAYER', 'flashPlayerLoseKey early return - sprite not available');
            return;
        }

        // Clear previous interval
        if (this.playerFlashLoseKeyInterval) {
            this.playerFlashLoseKeyInterval.destroy();
            this.playerFlashLoseKeyInterval = null;
        }

        // Save original state
        const originalAlpha = playerSprite.alpha;
        const originalBlendMode = playerSprite.blendMode;

        // Flash: tint red -> clear -> tint red -> clear
        let blinkCount = 0;
        const maxBlinks = 10; // 10 blinks total (5 red/clear cycles)

        this.playerFlashLoseKeyInterval = this.deps.scene.time.addEvent({
            delay: 200,
            callback: () => {
                if (!playerSprite.active) {
                    this.playerFlashLoseKeyInterval?.destroy();
                    this.playerFlashLoseKeyInterval = null;
                    return;
                }

                // Check if we've reached max blinks
                if (blinkCount >= maxBlinks) {
                    logger.log('FLASH_PLAYER', 'Lose key flash completed');
                    this.playerFlashLoseKeyInterval?.destroy();
                    this.playerFlashLoseKeyInterval = null;
                    // Restore original state
                    playerSprite.setBlendMode(originalBlendMode);
                    playerSprite.clearTint();
                    playerSprite.setAlpha(originalAlpha);
                    return;
                }

                if (playerSprite.alpha === 1) {
                    playerSprite.setBlendMode(Phaser.BlendModes.ADD);
                    playerSprite.setTint(0xff0000);
                    playerSprite.setAlpha(0.6);
                } else {
                    playerSprite.setBlendMode(originalBlendMode);
                    playerSprite.clearTint();
                    playerSprite.setAlpha(originalAlpha);
                }

                blinkCount++;
            },
            loop: true
        });
    }

    /**
     * Flashes player when getting a key (with double ADD blend overlay)
     */
    public flashPlayerGetKey(): void {
        logger.log('FLASH_PLAYER', 'flashPlayerGetKey called');

        const playerSprite = this.deps.player.getSprite();
        if (!playerSprite || !playerSprite.active) {
            logger.warn('FLASH_PLAYER', 'flashPlayerGetKey early return - sprite not available');
            return;
        }

        // Clear previous intervals and sprites
        if (this.playerFlashGetKeyInterval) {
            this.playerFlashGetKeyInterval.destroy();
            this.playerFlashGetKeyInterval = null;
        }
        if (this.playerFlashGetKeyPositionTimer) {
            this.playerFlashGetKeyPositionTimer.destroy();
            this.playerFlashGetKeyPositionTimer = null;
        }
        this.playerFlashGetKeySprites.forEach(sprite => {
            if (sprite?.active) sprite.destroy();
        });
        this.playerFlashGetKeySprites = [];

        const originalAlpha = playerSprite.alpha;
        const originalBlendMode = playerSprite.blendMode;

        playerSprite.setAlpha(1.0);

        // Create two white overlay sprites for double ADD blend
        const currentFrame = playerSprite.frame.name;

        const whiteFlashSprite1 = this.deps.scene.add.sprite(
            playerSprite.x, playerSprite.y,
            'character_walk_sheet', currentFrame
        );
        whiteFlashSprite1.setDepth(playerSprite.depth + 1);
        whiteFlashSprite1.setScale(playerSprite.scaleX, playerSprite.scaleY);
        whiteFlashSprite1.setOrigin(playerSprite.originX, playerSprite.originY);
        whiteFlashSprite1.setScrollFactor(playerSprite.scrollFactorX, playerSprite.scrollFactorY);
        whiteFlashSprite1.setBlendMode(Phaser.BlendModes.ADD);
        whiteFlashSprite1.setTint(0xffffff);
        whiteFlashSprite1.setAlpha(1.0);

        const whiteFlashSprite2 = this.deps.scene.add.sprite(
            playerSprite.x, playerSprite.y,
            'character_walk_sheet', currentFrame
        );
        whiteFlashSprite2.setDepth(playerSprite.depth + 2);
        whiteFlashSprite2.setScale(playerSprite.scaleX, playerSprite.scaleY);
        whiteFlashSprite2.setOrigin(playerSprite.originX, playerSprite.originY);
        whiteFlashSprite2.setScrollFactor(playerSprite.scrollFactorX, playerSprite.scrollFactorY);
        whiteFlashSprite2.setBlendMode(Phaser.BlendModes.ADD);
        whiteFlashSprite2.setTint(0xffffff);
        whiteFlashSprite2.setAlpha(1.0);

        // Flash effect
        let flashCount = 0;
        const maxFlashes = 10;
        const flashDelay = 100;

        // Start immediately
        whiteFlashSprite1.setVisible(true);
        whiteFlashSprite2.setVisible(true);
        flashCount++;

        // Position update timer
        const updatePosition = () => {
            if (playerSprite?.active) {
                const currentFrame = playerSprite.frame.name;

                if (whiteFlashSprite1?.active) {
                    whiteFlashSprite1.setPosition(playerSprite.x, playerSprite.y);
                    if (whiteFlashSprite1.frame.name !== currentFrame) {
                        whiteFlashSprite1.setFrame(currentFrame);
                    }
                }

                if (whiteFlashSprite2?.active) {
                    whiteFlashSprite2.setPosition(playerSprite.x, playerSprite.y);
                    if (whiteFlashSprite2.frame.name !== currentFrame) {
                        whiteFlashSprite2.setFrame(currentFrame);
                    }
                }
                return true;
            }
            return false;
        };

        const positionUpdateTimer = this.deps.scene.time.addEvent({
            delay: 16,
            callback: updatePosition,
            loop: true
        });

        this.playerFlashGetKeySprites.push(whiteFlashSprite1, whiteFlashSprite2);
        this.playerFlashGetKeyPositionTimer = positionUpdateTimer;

        // Flash interval
        this.playerFlashGetKeyInterval = this.deps.scene.time.addEvent({
            delay: flashDelay,
            callback: () => {
                if (flashCount >= maxFlashes) {
                    logger.log('FLASH_PLAYER', 'Get key flash completed');
                    this.playerFlashGetKeyInterval?.destroy();
                    this.playerFlashGetKeyInterval = null;
                    positionUpdateTimer.destroy();
                    this.playerFlashGetKeyPositionTimer = null;
                    whiteFlashSprite1?.destroy();
                    whiteFlashSprite2?.destroy();
                    this.playerFlashGetKeySprites = [];
                    playerSprite.setBlendMode(originalBlendMode);
                    playerSprite.setAlpha(originalAlpha);
                    return;
                }

                if (flashCount % 2 === 0) {
                    whiteFlashSprite1.setVisible(true);
                    whiteFlashSprite2.setVisible(true);
                } else {
                    whiteFlashSprite1.setVisible(false);
                    whiteFlashSprite2.setVisible(false);
                }
                flashCount++;
            },
            loop: true
        });
    }

    /**
     * Shows a ring loss effect when the player loses a key
     */
    public triggerRingLossEffect(keyCount: number): void {
        const radius = 25 + (keyCount + 1) * 8;
        const ring = this.deps.scene.add.graphics();
        ring.lineStyle(4, 0x38a169, 1);
        ring.strokeCircle(0, 0, radius);

        const playerSprite = this.deps.player.getSprite();
        if (playerSprite) {
            ring.setPosition(playerSprite.x, playerSprite.y);
            // Устанавливаем ту же depth, что у персонажа, чтобы кольцо было на том же Z-уровне
            ring.setDepth(playerSprite.depth);
        }

        this.deps.tweens.add({
            targets: ring,
            alpha: 0,
            scale: 1.2,
            duration: 500,
            onUpdate: () => {
                const sprite = this.deps.player.getSprite();
                if (sprite && sprite.active) {
                    ring.setPosition(sprite.x, sprite.y);
                }
            },
            onComplete: () => {
                ring.destroy();
            }
        });
    }

    /**
     * Cleans up all active effects
     */
    public destroy(): void {
        if (this.playerFlashLoseKeyInterval) {
            this.playerFlashLoseKeyInterval.destroy();
            this.playerFlashLoseKeyInterval = null;
        }
        if (this.playerFlashGetKeyInterval) {
            this.playerFlashGetKeyInterval.destroy();
            this.playerFlashGetKeyInterval = null;
        }
        if (this.playerFlashGetKeyPositionTimer) {
            this.playerFlashGetKeyPositionTimer.destroy();
            this.playerFlashGetKeyPositionTimer = null;
        }
        this.playerFlashGetKeySprites.forEach(sprite => sprite?.destroy());
        this.playerFlashGetKeySprites = [];
    }
}
