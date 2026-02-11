/**
 * WorldFactory - Factory for creating game world (backgrounds, physics bounds)
 *
 * This factory handles:
 * - Creating the main game world (Tiled or Random mode)
 * - Creating extended backgrounds for wide screens
 * - Setting up physics world bounds
 *
 * Separated from MainScene to reduce its size and improve modularity.
 */

import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT, MAP_CENTER_X, MAP_CENTER_Y, BASE_SCALE, KEYS, LevelAssetKeys, DEPTHS } from '../../../constants/gameConstants';
import { logger } from '../../../utils/Logger';
import { GrassBackgroundSprite } from '../../entities/background/GrassBackgroundSprite';

/**
 * Dependencies needed from MainScene
 */
interface WorldFactoryDependencies {
    spawnSystem: any; // SpawnSystem
    levelManager: any; // LevelManager
    worldGenerator: any; // WorldGenerator
    physics: Phaser.Physics.Arcade.ArcadePhysics;
    add: any; // Phaser.GameObjects.GameObjectFactory
}

/**
 * Configuration for world creation
 */
interface WorldConfig {
    mapWidthScaled: number;
    mapHeightScaled: number;
}

export class WorldFactory {
    private mapBackgroundTileSprite: Phaser.GameObjects.TileSprite | null = null;

    constructor(
        private scene: Phaser.Scene,
        private deps: WorldFactoryDependencies
    ) { }

    /**
     * Creates the main game world
     * Chooses between Tiled Map mode and Random Spawn mode based on level config
     */
    async create(): Promise<void> {
        // Clear occupied zones before creating new world
        this.deps.spawnSystem.clearOccupiedZones();

        // ⚠️ НОВОЕ: Очищаем запретные зоны при создании нового мира
        // (предотвращает накопление запретных зон от предыдущих запусков)
        this.deps.spawnSystem.clearForbiddenZones();

        const mapWidthScaled = MAP_WIDTH * BASE_SCALE;   // 2048 virtual pixels
        const mapHeightScaled = MAP_HEIGHT * BASE_SCALE; // 2048 virtual pixels

        // Get level config to check useTiledMap flag
        const levelConfig = await this.deps.levelManager.getLevelConfig();
        const useTiledMap = levelConfig?.useTiledMap ?? false;
        const tiledMapKey = levelConfig?.tiledMapKey ?? 'level1_json';

        // Setup physics world bounds (strictly limited to 2048×2048)
        // Safety check: physics.world may be null during scene restart
        if (this.deps.physics?.world) {
            this.deps.physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
        }

        if (useTiledMap) {
            // TILED MAP MODE: Use WorldGenerator
            await this.createTiledWorld(tiledMapKey, mapWidthScaled, mapHeightScaled);
        } else {
            // RANDOM SPAWN MODE: Create random world
            await this.createRandomWorld(mapWidthScaled, mapHeightScaled);
        }

        logger.log('WORLD_GENERATOR', 'WorldFactory: World creation complete');
    }

    /**
     * Creates game world using Tiled Map
     * Delegates to WorldGenerator
     */
    private async createTiledWorld(
        tiledMapKey: string,
        mapWidthScaled: number,
        mapHeightScaled: number
    ): Promise<void> {
        logger.log('WORLD_GENERATOR', 'WorldFactory: Delegating to WorldGenerator for Tiled Map');
        await this.deps.worldGenerator.generate(tiledMapKey, mapWidthScaled, mapHeightScaled);
        logger.log('WORLD_GENERATOR', 'WorldFactory: Tiled world generation complete');

        // Create extended background even for Tiled Map (for wide screens)
        this.createExtendedBackground();
    }

    /**
     * Creates game world using Random Spawn (legacy logic)
     */
    private async createRandomWorld(
        mapWidthScaled: number,
        mapHeightScaled: number
    ): Promise<void> {
        // 1. EXTENDED BACKGROUND (fills screen for wide displays)
        this.createExtendedBackground();

        // 2. MAIN MAP (Visual part)
        const currentLevel = this.deps.levelManager.getCurrentLevel();
        const mapBgKey = LevelAssetKeys.getMapBgStandard(currentLevel);

        // Main map background (lowest layer)
        const mapBackground = this.deps.add.image(MAP_CENTER_X, MAP_CENTER_Y, mapBgKey);
        mapBackground.setScale(BASE_SCALE);
        mapBackground.setDepth(-200);

        // 2.1. BACKGROUND SPRITES (Grass)
        await this.createBackgroundSprites(mapWidthScaled, mapHeightScaled);

        // 2.2. MAP BORDERS (Debug/Visual guide)
        this.deps.add.rectangle(MAP_CENTER_X, MAP_CENTER_Y, mapWidthScaled, mapHeightScaled)
            .setStrokeStyle(2, 0x666666, 0.3)
            .setDepth(DEPTHS.WORLD.TILED_STRUCT_BG);

        logger.log('WORLD_GENERATOR', 'WorldFactory: Random world creation complete');
    }

    /**
     * Creates extended background for wide screen coverage
     * Background extends 2x width to cover wide screens
     * Synchronized with camera and main map
     */
    createExtendedBackground(): void {
        // Remove old background if exists
        if (this.mapBackgroundTileSprite) {
            this.mapBackgroundTileSprite.destroy();
            this.mapBackgroundTileSprite = null;
        }

        try {
            // Always create wide background (2x map width for wide screen coverage)
            const extendedBaseWidth = MAP_WIDTH * 2; // 1024 base → 4096 virtual
            const extendedBaseHeight = MAP_HEIGHT;   // 512 base

            // Position - same as main map (centered)
            const backgroundX = MAP_CENTER_X; // 1024
            const backgroundY = MAP_CENTER_Y; // 1024

            // TileSprite created with BASE pixels dimensions
            this.mapBackgroundTileSprite = this.deps.add.tileSprite(
                backgroundX,
                backgroundY,
                extendedBaseWidth,  // BASE pixels - sprite size
                MAP_HEIGHT,      // BASE pixels
                LevelAssetKeys.getMapBgStandard(this.deps.levelManager.getCurrentLevel())
            );

            if (this.mapBackgroundTileSprite) {
                // setTileScale(1, 1) - DON'T scale tiles separately
                this.mapBackgroundTileSprite.setTileScale(1, 1);

                // setScale scales THE SPRITE to virtual size
                this.mapBackgroundTileSprite.setScale(BASE_SCALE, BASE_SCALE);

                // Origin (0.5, 0.5) - same as main map (centered)
                this.mapBackgroundTileSprite.setOrigin(0.5, 0.5);

                // Sync tilings with main map
                const tilePositionX = 0;
                const tilePositionY = 0;
                this.mapBackgroundTileSprite.setTilePosition(tilePositionX, tilePositionY);

                // Make sprite visible and active
                this.mapBackgroundTileSprite.setScrollFactor(1, 1);
                this.mapBackgroundTileSprite.setDepth(-200);
                this.mapBackgroundTileSprite.setVisible(true);
                this.mapBackgroundTileSprite.setActive(true);
            }

            logger.log('WORLD_GENERATOR', 'WorldFactory: Extended background created', {
                width: extendedBaseWidth,
                height: extendedBaseHeight,
                virtualWidth: extendedBaseWidth * BASE_SCALE,
                virtualHeight: extendedBaseHeight * BASE_SCALE
            });
        } catch (error) {
            logger.warn('WORLD_GENERATOR', `WorldFactory: Error creating extended background: ${error}`);
            this.mapBackgroundTileSprite = null;
        }
    }

    /**
     * Creates background sprites (grass)
     * Called after main map is created
     */
    private async createBackgroundSprites(
        mapWidthScaled: number,
        mapHeightScaled: number
    ): Promise<void> {
        // Try to create grass sprites using GrassBackgroundSprite entity
        try {
            // Check if grass spritesheet exists
            if (!this.scene.textures.exists(KEYS.BG_GRASS_SHEET)) {
                logger.warn('WORLD_GENERATOR', `WorldFactory: Grass spritesheet ${KEYS.BG_GRASS_SHEET} not found, skipping grass sprites`);
                return;
            }

            // Create GrassBackgroundSprite entity
            const grassDensity = 0.05; // Повышена плотность для генерации ~50 пучков травы
            const grassGenerator = new GrassBackgroundSprite(this.scene, grassDensity);

            // Spawn grass on map
            grassGenerator.spawnOnMap(mapWidthScaled, mapHeightScaled);

            logger.log('WORLD_GENERATOR', `WorldFactory: Grass background generation complete`);
        } catch (error) {
            logger.warn('WORLD_GENERATOR', `WorldFactory: Error creating grass sprites: ${error}`);
        }
    }

    /**
     * Recreates extended background on resize
     * Called when screen size changes
     */
    handleResize(): void {
        this.createExtendedBackground();
        logger.log('VIEWPORT_RESIZE', 'Extended background recreated on resize');
    }

    /**
     * Cleanup - destroys the extended background
     */
    destroy(): void {
        if (this.mapBackgroundTileSprite) {
            this.mapBackgroundTileSprite.destroy();
            this.mapBackgroundTileSprite = null;
        }
    }
}
