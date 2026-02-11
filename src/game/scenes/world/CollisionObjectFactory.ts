/**
 * CollisionObjectFactory - Factory for creating collision objects (bushes, stones, etc.)
 *
 * This factory handles:
 * - Creating collision objects (bushes, stones) based on level config
 * - Spawning collision objects on the map using SpawnSystem
 *
 * Separated from MainScene to reduce its size and improve modularity.
 */

import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT, BASE_SCALE } from '../../../constants/gameConstants';
import { BushCollisionObject } from '../../entities/collision/BushCollisionObject';
import { StoneCollisionObject } from '../../entities/collision/StoneCollisionObject';
import { logger } from '../../../utils/Logger';

/**
 * Dependencies needed from MainScene
 */
interface CollisionObjectFactoryDependencies {
    levelManager: any; // LevelManager
    spawnSystem: any; // SpawnSystem
}

/**
 * Configuration for collision objects from level config
 */
interface BushConfig {
    count: number;
    showCollisionDebug?: boolean;
}

interface StoneConfig {
    count: number;
    showCollisionDebug?: boolean;
}

interface CollisionConfig {
    bush?: BushConfig;
    stone?: StoneConfig;
}

/**
 * Result for collision object creation
 */
interface CollisionObjectCreationResult {
    bushCollisionObjects: BushCollisionObject | null;
    stoneCollisionObjects: StoneCollisionObject | null;
}

export class CollisionObjectFactory {
    // Reference to collision objects (if created)
    private bushCollisionObjects: BushCollisionObject | null = null;
    private stoneCollisionObjects: StoneCollisionObject | null = null;

    constructor(
        private scene: Phaser.Scene,
        private deps: CollisionObjectFactoryDependencies
    ) {}

    /**
     * Creates all collision objects based on level configuration
     * Currently handles: Bush and Stone collision objects
     *
     * ⚠️ В Tiled режиме (useTiledMap=true) кусты и камни не создаются
     */
    async create(currentLevel: number): Promise<CollisionObjectCreationResult> {
        try {
            // ✅ Проверяем режим карты для текущего уровня
            const levelConfig = await this.deps.levelManager.loadLevelConfig(currentLevel);
            const useTiledMap = levelConfig?.levelConfig?.useTiledMap ?? false;

            logger.log('COLLISION_FACTORY', `Level ${currentLevel}: useTiledMap=${useTiledMap}`);

            // ⚠️ ИНВЕРСИЯ: Tiled mode НЕ создаёт кусты/камни, Standard mode создаёт
            if (!useTiledMap) {
                logger.log('COLLISION_FACTORY', `Level ${currentLevel}: Standard mode - CREATING bush/stone collision objects`);
                // Создаём объекты как обычно
                const collisionConfig: CollisionConfig | undefined = await this.deps.levelManager.getCollisionObjectConfig();
                const bushConfig = collisionConfig?.bush;
                const stoneConfig = collisionConfig?.stone;

                // Create bushes
                if (bushConfig && bushConfig.count !== undefined && bushConfig.count > 0) {
                    await this.createBushCollisionObjects(bushConfig);
                }

                // Create stones
                if (stoneConfig && stoneConfig.count !== undefined && stoneConfig.count > 0) {
                    await this.createStoneCollisionObjects(stoneConfig);
                }

                return {
                    bushCollisionObjects: this.bushCollisionObjects,
                    stoneCollisionObjects: this.stoneCollisionObjects
                };
            } else {
                logger.log('COLLISION_FACTORY', `Level ${currentLevel}: Tiled mode - SKIPPING bush/stone collision objects`);
                return {
                    bushCollisionObjects: null,
                    stoneCollisionObjects: null
                };
            }
        } catch (error) {
            logger.error('COLLISION_FACTORY', `Error creating collision objects: ${error}`);
            return {
                bushCollisionObjects: null,
                stoneCollisionObjects: null
            };
        }
    }

    /**
     * Creates bush collision objects
     */
    private async createBushCollisionObjects(bushConfig: BushConfig): Promise<void> {
        const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
        const mapHeightScaled = MAP_HEIGHT * BASE_SCALE;

        // Create BushCollisionObject with debug setting from config
        this.bushCollisionObjects = new BushCollisionObject(
            this.scene,
            bushConfig.showCollisionDebug ?? false
        );

        // Spawn bushes on the map
        this.bushCollisionObjects.spawnOnMap(
            mapWidthScaled,
            mapHeightScaled,
            bushConfig.count,
            this.deps.spawnSystem
        );

        logger.log('COLLISION_FACTORY', '✅ CollisionObjectFactory: BushCollisionObject created and spawned', {
            count: bushConfig.count,
            showDebug: bushConfig.showCollisionDebug
        });
    }

    /**
     * Creates stone collision objects
     */
    private async createStoneCollisionObjects(stoneConfig: StoneConfig): Promise<void> {
        const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
        const mapHeightScaled = MAP_HEIGHT * BASE_SCALE;

        // Create StoneCollisionObject with debug setting from config
        this.stoneCollisionObjects = new StoneCollisionObject(
            this.scene,
            stoneConfig.showCollisionDebug ?? false
        );

        // Spawn stones on the map
        this.stoneCollisionObjects.spawnOnMap(
            mapWidthScaled,
            mapHeightScaled,
            stoneConfig.count,
            this.deps.spawnSystem
        );

        logger.log('COLLISION_FACTORY', '✅ CollisionObjectFactory: StoneCollisionObject created and spawned', {
            count: stoneConfig.count,
            showDebug: stoneConfig.showCollisionDebug
        });
    }

    /**
     * Get reference to BushCollisionObject (for testing/debug)
     */
    getBushCollisionObjects(): BushCollisionObject | null {
        return this.bushCollisionObjects;
    }

    /**
     * Get reference to StoneCollisionObject (for testing/debug)
     */
    getStoneCollisionObjects(): StoneCollisionObject | null {
        return this.stoneCollisionObjects;
    }

    /**
     * Cleanup - destroys collision objects
     */
    destroy(): void {
        if (this.bushCollisionObjects) {
            this.bushCollisionObjects.destroy();
            this.bushCollisionObjects = null;
        }
        if (this.stoneCollisionObjects) {
            this.stoneCollisionObjects.destroy();
            this.stoneCollisionObjects = null;
        }
    }
}
