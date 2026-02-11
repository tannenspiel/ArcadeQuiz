import Phaser from 'phaser';
import { Player } from '../../entities/Player';
import { WorldFactory } from '../world/WorldFactory';
import {
    MAP_WIDTH,
    MAP_HEIGHT,
    BASE_SCALE,
    ACTOR_SIZES,
    PLAYER_FRAME_HEIGHT,
    BASE_GAME_HEIGHT,
    PLAYER_HEIGHT_PERCENT
} from '../../../constants/gameConstants';
import { logger } from '../../../utils/Logger';

/**
 * Callbacks for operations that require MainScene
 */
export interface CameraManagerCallbacks {
    onResize: () => void;
}

/**
 * Dependencies for CameraManager
 */
export interface CameraManagerDependencies {
    scene: Phaser.Scene;
    player: Player;
    worldFactory: WorldFactory;
    physics: Phaser.Physics.Arcade.ArcadePhysics;
}

/**
 * Manages camera setup, bounds, follow, and resize handling
 */
export class CameraManager {
    private resizeHandler?: (gameSize: Phaser.Structs.Size) => void;

    constructor(
        private deps: CameraManagerDependencies,
        private callbacks: CameraManagerCallbacks
    ) { }

    /**
     * Sets up camera bounds
     */
    private setupBounds(): void {
        const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
        const mapHeightScaled = MAP_HEIGHT * BASE_SCALE;

        this.deps.scene.cameras.main.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
        this.deps.physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);

        logger.log('SCENE_CAMERA', 'Camera bounds set', {
            x: 0,
            y: 0,
            width: mapWidthScaled,
            height: mapHeightScaled
        });
    }

    /**
     * Calculates camera zoom based on player height
     */
    private calculateZoom(): number {
        const playerScale = BASE_SCALE * ACTOR_SIZES.PLAYER;
        const playerHeightInVirtual = PLAYER_FRAME_HEIGHT * playerScale;
        const desiredPlayerHeight = BASE_GAME_HEIGHT * PLAYER_HEIGHT_PERCENT;
        const zoom = desiredPlayerHeight / playerHeightInVirtual;

        return zoom;
    }

    /**
     * Sets up camera to follow player
     */
    public setupFollow(): void {
        const playerSprite = this.deps.player.getSprite();

        if (!playerSprite?.active) {
            logger.error('SCENE_CAMERA', 'CameraManager: Player not ready!');
            return;
        }

        // Setup bounds
        this.setupBounds();

        // Calculate and apply zoom
        const zoom = this.calculateZoom();
        this.deps.scene.cameras.main.setZoom(zoom);

        // Center on player
        this.deps.scene.cameras.main.centerOn(playerSprite.x, playerSprite.y);

        // Start following
        // Плавное следование (0.15) для комфорта
        this.deps.scene.cameras.main.startFollow(playerSprite, true, 0.15, 0.15);
        this.deps.scene.cameras.main.setDeadzone(0, 0);
        this.deps.scene.cameras.main.roundPixels = true;

        // Listen to resize
        this.deps.scene.scale.on('resize', this.handleResize, this);

        const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
        logger.log('SCENE_CAMERA', 'Camera follow enabled', {
            bounds: `${mapWidthScaled}x${MAP_HEIGHT * BASE_SCALE}`,
            zoom: zoom.toFixed(2),
            playerHeightPercent: `${(PLAYER_HEIGHT_PERCENT * 100).toFixed(1)}%`
        });
    }

    /**
     * Handles window/game resize
     */
    private handleResize = (gameSize: Phaser.Structs.Size): void => {
        // Recreate background via WorldFactory
        this.deps.worldFactory.handleResize();

        // Update bounds
        this.setupBounds();

        // Recalculate zoom
        const zoom = this.calculateZoom();
        this.deps.scene.cameras.main.setZoom(zoom);

        // Trigger HUD update via callback
        this.callbacks.onResize();

        logger.log('VIEWPORT_RESIZE', `CameraManager: Resize handled - screenSize: ${gameSize.width}x${gameSize.height}, zoom: ${zoom.toFixed(2)}`);
    };
}
