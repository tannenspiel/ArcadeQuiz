/**
 * EntityFactory - Factory for creating game entities (Oracle, Player, Portals)
 *
 * This factory handles:
 * - Creating Oracle at the center of the map
 * - Creating Player near the Oracle
 * - Creating Portals based on global questions
 * - Creating fallback portals if question loading fails
 *
 * Separated from MainScene to reduce its size and improve modularity.
 */

import Phaser from 'phaser';
import { MAP_CENTER_X, MAP_CENTER_Y, BASE_SCALE, PORTALS_DATA, COLLISION_CONFIG } from '../../../constants/gameConstants';
import { ORACLE_LABEL_FONT_SIZE, DEFAULT_FONT_FAMILY, ORACLE_LABEL_FONT_STYLE, ORACLE_LABEL_COLOR } from '../../../constants/textStyles';
import { Player } from '../../entities/Player';
import { Oracle } from '../../entities/Oracle';
import { StandardPortal } from '../../entities/portals/StandardPortal';
import { PortalType } from '../../../types/portalTypes';
import type { PortalConfig } from '../../../types/portalTypes';
import { logger } from '../../../utils/Logger';

/**
 * Dependencies needed from MainScene
 */
interface EntityFactoryDependencies {
    spawnSystem: any; // SpawnSystem
    levelManager: any; // LevelManager
    quizManager: any; // QuizManager
    physics: Phaser.Physics.Arcade.ArcadePhysics;
    add: any; // Phaser.GameObjects.GameObjectFactory
    portals: Phaser.Physics.Arcade.Group;
    oracle: Oracle | null;
    player: Player | null;
    healthSystem: any;
    tiledPortalsConfig?: any[];
    tiledOracleConfig?: { x: number, y: number, bubblePosition?: { x: number, y: number } };
}

/**
 * Result for portal creation
 */
interface PortalCreationResult {
    portals: any[];
    globalQuestionData: any;
}

/**
 * Result for entity creation
 */
interface EntityCreationResult {
    oracle: Oracle;
    player: Player;
    oracleLabel?: Phaser.GameObjects.Text | null; // ❌ ОТКЛЮЧЕНО: опционально, так как больше не создается
    globalQuestionData: any;
}

export class EntityFactory {
    // Stores the current global question data
    private currentGlobalQuestionData: any = null;

    // Stores created entities (for returning to MainScene)
    private createdOracle: Oracle | null = null;
    private createdPlayer: Player | null = null;
    private createdOracleLabel: Phaser.GameObjects.Text | null = null;

    constructor(
        private scene: Phaser.Scene,
        private deps: EntityFactoryDependencies
    ) {
        logger.log('ENTITY_FACTORY', `constructor: deps.portals =`, this.deps.portals);
        logger.log('ENTITY_FACTORY', `constructor: deps.portals exists?`, !!this.deps.portals);
    }

    /**
     * Creates all game entities in the correct order
     * Order: Oracle → Player → Portals → Collision Objects → Items
     */
    async createAll(
        tiledPortalsConfig?: any[],
        tiledOracleConfig?: { x: number, y: number, bubblePosition?: { x: number, y: number } }
    ): Promise<EntityCreationResult> {
        // ✅ UPDATE DEPS with fresh values passed from MainScene (resolves stale reference issues)
        if (tiledPortalsConfig) this.deps.tiledPortalsConfig = tiledPortalsConfig;
        if (tiledOracleConfig) this.deps.tiledOracleConfig = tiledOracleConfig;

        // 0. Ensure Global Question is selected FIRST (unified for all entities)
        const currentLevel = this.deps.levelManager.getCurrentLevel();
        if (!this.currentGlobalQuestionData) {
            this.currentGlobalQuestionData = await this.deps.quizManager.getRandomGlobalQuestion(currentLevel);
            logger.log('ENTITY_FACTORY', `Global question selected for level: ${this.currentGlobalQuestionData.questionText}`);
        }

        // 1. Oracle (most important object, should be in center)
        this.createdOracle = this.createOracle();

        // 2. Player (spawns below oracle)
        this.createdPlayer = this.createPlayer();

        // 3. Portals (spawn before items to occupy best positions)
        await this.createPortals();

        logger.log('ENTITY_FACTORY', 'All entities created');

        // ❌ ОТКЛЮЧЕНО: Проверка oracleLabel удалена - метка больше не создается
        if (!this.createdOracle || !this.createdPlayer) {
            throw new Error('❌ EntityFactory: Failed to create all required entities');
        }

        // Return created entities for MainScene to use
        return {
            oracle: this.createdOracle,
            player: this.createdPlayer,
            oracleLabel: this.createdOracleLabel,
            globalQuestionData: this.currentGlobalQuestionData
        };
    }

    /**
     * Creates the Oracle entity
     * Uses matrix system for placement
     */
    private createOracle(): Oracle {
        let oracleX: number;
        let oracleY: number;

        // ✅ Check if Tiled Oracle Config exists
        if (this.deps.tiledOracleConfig) {
            oracleX = this.deps.tiledOracleConfig.x;
            oracleY = this.deps.tiledOracleConfig.y;
            logger.log('ENTITY_FACTORY', `Using Tiled Oracle config at [${oracleX}, ${oracleY}]`);

            // Occupy matrix (Tiled WorldGenerator already does this, but safely duplicate for correctness)
            this.deps.spawnSystem.spawnOracleMatrix();
        } else {
            // Use matrix system for oracle spawn
            const oraclePos = this.deps.spawnSystem.spawnOracleMatrix();
            oracleX = oraclePos.x;
            oracleY = oraclePos.y;
        }

        // Create Oracle instance with state machine
        // Safety: Oracle may fail if physics.add is not available (scene restart)
        let oracle: Oracle;
        try {
            oracle = new Oracle(this.scene, oracleX, oracleY);
        } catch (error) {
            logger.error('ENTITY_FACTORY', `Failed to create Oracle: ${error}`);
            // Cannot retry synchronously, rethrow with clearer message
            throw new Error(`EntityFactory: Cannot create Oracle at [${oracleX}, ${oracleY}]. ${error}`);
        }

        // ❌ ОТКЛЮЧЕНО: Oracle label - не нужна
        // // Create oracle label (above oracle) and store it
        // this.createdOracleLabel = this.createOracleLabel(oracleX, oracleY);

        // Create question bubble if enabled
        this.createOracleQuestionBubble(oracle);

        // Position already occupied in matrix via spawnOracleMatrix()
        logger.log('ENTITY_FACTORY', `Oracle created at [${oracleX}, ${oracleY}]`);
        return oracle;
    }

    /**
     * Creates the Oracle label text
     */
    private createOracleLabel(oracleX: number, oracleY: number): Phaser.GameObjects.Text {
        return this.scene.add.text(oracleX, oracleY - 150, 'ORACLE (0/3)', {
            fontSize: `${ORACLE_LABEL_FONT_SIZE}px`,
            fontFamily: DEFAULT_FONT_FAMILY,
            fontStyle: ORACLE_LABEL_FONT_STYLE,
            color: ORACLE_LABEL_COLOR,
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
    }

    /**
     * Creates the Oracle question bubble
     */
    private createOracleQuestionBubble(oracle: Oracle): void {
        const USE_QUESTION_BUBBLE = true; // TODO: Move to config

        if (USE_QUESTION_BUBBLE) {
            const currentLevel = this.deps.levelManager.getCurrentLevel();
            let explicitX: number | undefined;
            let explicitY: number | undefined;

            if (this.deps.tiledOracleConfig?.bubblePosition) {
                explicitX = this.deps.tiledOracleConfig.bubblePosition.x;
                explicitY = this.deps.tiledOracleConfig.bubblePosition.y;
                logger.log('ENTITY_FACTORY', `Using explicit Oracle bubble position: [${explicitX}, ${explicitY}]`);
            }

            oracle.createQuestionBubble(this.deps.quizManager, currentLevel, explicitX, explicitY);

            // Если явная позиция не задана, обновляем позицию по умолчанию
            if (!explicitX) {
                oracle.updateBubblePosition();
            }
        }
    }

    /**
     * Creates the Player entity
     * Uses matrix system for placement (below Oracle)
     */
    private createPlayer(): Player {
        // Get oracle position (already created)
        const oracleX = this.createdOracle ? this.createdOracle.getSprite().x : MAP_CENTER_X;
        const oracleY = this.createdOracle ? this.createdOracle.getSprite().y : MAP_CENTER_Y;

        // Use matrix system to spawn player below oracle
        const playerPos = this.deps.spawnSystem.spawnPlayerMatrix(oracleX, oracleY);

        const player = new Player(
            this.scene,
            playerPos.x,
            playerPos.y,
            'character_walk_sheet'
        );

        // Create player health display
        const finalPlayerPos = player.getPosition();
        this.deps.healthSystem.createPlayerHealthDisplay(finalPlayerPos.x, finalPlayerPos.y);

        // Position already occupied in matrix via spawnPlayerMatrix()
        logger.log('ENTITY_FACTORY', `Player created at [${playerPos.x}, ${playerPos.y}]`);
        return player;
    }

    /**
     * Creates portals based on global question from JSON
     * Uses saved question if already selected
     */
    async createPortals(): Promise<void> {
        try {
            const currentLevel = this.deps.levelManager.getCurrentLevel();

            // Load global question ONCE and save it
            if (!this.currentGlobalQuestionData) {
                this.currentGlobalQuestionData = await this.deps.quizManager.getRandomGlobalQuestion(currentLevel);
                logger.log('ENTITY_FACTORY', `Global question selected: ${this.currentGlobalQuestionData.questionText}`);
            }

            const questionData = this.currentGlobalQuestionData;

            // Create array of all answers (correct + wrong)
            const allAnswers = [
                questionData.correctAnswer,
                ...questionData.wrongAnswers
            ];

            // Shuffle answers for random portal order
            const shuffledAnswers = this.shuffleArray([...allAnswers]);

            // Get portal spawn radius from level config
            const levelConfig = await this.deps.levelManager.getLevelConfig();
            const portalSpawnRadius = levelConfig?.portalSpawnRadius ?? 576;

            // Check if Tiled Map config exists
            if (this.deps.tiledPortalsConfig && this.deps.tiledPortalsConfig.length > 0) {
                this.createPortalsFromTiledConfig(shuffledAnswers, questionData);
            } else {
                // Fallback: Circular spawn for auto-mode
                await this.createPortalsCircular(shuffledAnswers, portalSpawnRadius);
            }

            logger.log('ENTITY_FACTORY', `Portals created from global question: ${shuffledAnswers.join(', ')}`);
        } catch (error) {
            logger.error('ENTITY_FACTORY', `Failed to create portals from question, using fallback: ${error}`);
            // Fallback to hardcoded portals if question loading fails
            await this.createPortalsFallback();
        }
    }

    /**
     * Creates portals from Tiled Map configuration
     */
    private createPortalsFromTiledConfig(
        shuffledAnswers: string[],
        questionData: any
    ): void {
        if (!this.deps.tiledPortalsConfig) {
            logger.warn('ENTITY_FACTORY', 'tiledPortalsConfig is null, cannot create portals from Tiled config');
            return;
        }

        logger.log('ENTITY_FACTORY', `Using Tiled Map config for ${this.deps.tiledPortalsConfig.length} portals`);

        this.deps.tiledPortalsConfig.forEach((config: any) => {
            // Portal ID starts at 1. Answer index = ID - 1
            const answerIndex = config.id - 1;

            logger.log('ENTITY_FACTORY', `Processing Tiled portal config id=${config.id}, bubblePosition=`, config.bubblePosition);

            if (answerIndex >= 0 && answerIndex < shuffledAnswers.length) {
                const answer = shuffledAnswers[answerIndex];
                const isCorrect = answer === questionData.correctAnswer;

                const portalConfig: PortalConfig = {
                    id: config.id,
                    type: PortalType.STANDARD,
                    isCorrect: isCorrect,
                    answerText: answer,
                    damage: 3,
                    bubblePosition: config.bubblePosition, // ✅ Pass bubble position
                    useTiledMapTextures: true, // ✅ Use correct Tiled Map assets
                    collisionBodies: config.collisionBodies // ✅ Pass voxel collision bodies
                };

                logger.log('ENTITY_FACTORY', `Portal ${config.id} bubblePosition:`, { bubblePosition: config.bubblePosition, position: [config.x, config.y] });

                const portal = new StandardPortal(
                    this.scene,
                    portalConfig,
                    config.x,
                    config.y
                );

                // Apply collision override flag
                if (config.overrideCollision) {
                    portal.setCollisionOverride(true);
                }

                // TILED MODE FIX: Expand portal body for sensor interaction
                const pSprite = portal.getSprite();
                const pBody = pSprite.body as Phaser.Physics.Arcade.Body;
                if (pBody) {
                    const expand = COLLISION_CONFIG.TILED_SENSOR_EXPANSION;
                    pBody.setSize(pBody.width + expand, pBody.height + expand, true);
                    logger.log('ENTITY_FACTORY', `Expanded Portal ${config.id} body for interaction sensor`);
                }

                // ✅ FIX: Occupy portal cells in SpawnMatrix to prevent items from spawning on portals
                // Portals occupy 2×3 cells (same as in spawnPortalMatrix for circular mode)
                this.deps.spawnSystem.occupyTiledPortal(config.x, config.y, 2, 3);
                logger.log('ENTITY_FACTORY', `Portal ${config.id} cells occupied in SpawnMatrix`);

                this.deps.portals.add(portal.getSprite());
                // ✅ Fix: Add to portalInstances for robust animation sync
                if ((this.scene as any).portalInstances) {
                    (this.scene as any).portalInstances.push(portal);
                }
                logger.log('ENTITY_FACTORY', `Portal ${config.id} created at [${config.x}, ${config.y}] (Override: ${config.overrideCollision})`);
            } else {
                logger.warn('ENTITY_FACTORY', `Portal ID ${config.id} out of range for answers (count: ${shuffledAnswers.length})`);
            }
        });
    }

    /**
     * Creates portals in circular pattern (fallback for auto-mode)
     */
    private async createPortalsCircular(
        shuffledAnswers: string[],
        portalSpawnRadius: number
    ): Promise<void> {
        logger.log('ENTITY_FACTORY', 'Using Circular Spawn (Automatic Mode)');
        logger.log('ENTITY_FACTORY', 'DEBUG: this.deps.portals =', this.deps.portals);
        logger.log('ENTITY_FACTORY', 'DEBUG: this.deps.portals exists?', !!this.deps.portals);

        const centerX = MAP_CENTER_X;
        const centerY = MAP_CENTER_Y;
        const angleStep = (2 * Math.PI) / shuffledAnswers.length;

        for (let index = 0; index < shuffledAnswers.length; index++) {
            const answer = shuffledAnswers[index];
            const isCorrect = answer === this.currentGlobalQuestionData.correctAnswer;

            const portalConfig: PortalConfig = {
                id: index + 1,
                type: PortalType.STANDARD,
                isCorrect: isCorrect,
                answerText: answer,
                damage: 3,
                useTiledMapTextures: false
            };

            // Calculate position on circle
            const angle = index * angleStep;

            // Use spawnPortalMatrix for proper grid alignment
            const posResult = this.deps.spawnSystem.spawnPortalMatrix(
                centerX,
                centerY,
                portalSpawnRadius,
                angle
            );

            if (!posResult.success) {
                logger.warn('ENTITY_FACTORY', `Could not find safe position for portal ${index + 1}. Skipping.`);
                continue;
            }

            // Log for debugging
            if (process.env.NODE_ENV === 'development') {
                logger.log('ENTITY_FACTORY', `Portal ${index + 1} spawn on circle: [${posResult.x.toFixed(2)}, ${posResult.y.toFixed(2)}], angle: ${(angle * 180 / Math.PI).toFixed(1)}°, radius: ${portalSpawnRadius}`);
            }

            const portal = new StandardPortal(
                this.scene,
                portalConfig,
                posResult.x,
                posResult.y
            );

            this.deps.portals.add(portal.getSprite());
            // ✅ Fix: Add to portalInstances for robust animation sync
            if ((this.scene as any).portalInstances) {
                (this.scene as any).portalInstances.push(portal);
            }
        }
    }

    /**
     * Fallback portal creation (if question loading fails)
     */
    private async createPortalsFallback(): Promise<void> {
        logger.log('ENTITY_FACTORY', 'Using fallback portals (hardcoded)');

        const levelConfig = await this.deps.levelManager.getLevelConfig();
        const portalSpawnRadius = levelConfig?.portalSpawnRadius ?? 576;

        const centerX = MAP_CENTER_X;
        const centerY = MAP_CENTER_Y;
        const angleStep = (2 * Math.PI) / PORTALS_DATA.length;

        for (let index = 0; index < PORTALS_DATA.length; index++) {
            const portalConfig = PORTALS_DATA[index];

            // Calculate position on circle
            const angle = index * angleStep;

            const posResult = this.deps.spawnSystem.spawnPortalMatrix(
                centerX,
                centerY,
                portalSpawnRadius,
                angle
            );

            if (!posResult.success) {
                logger.warn('ENTITY_FACTORY', `Could not find safe position for fallback portal ${index + 1}. Skipping.`);
                continue;
            }

            const portal = new StandardPortal(
                this.scene,
                portalConfig,
                posResult.x,
                posResult.y
            );

            this.deps.portals.add(portal.getSprite());
            // ✅ Fix: Add to portalInstances for robust animation sync
            if ((this.scene as any).portalInstances) {
                (this.scene as any).portalInstances.push(portal);
            }
            logger.log('ENTITY_FACTORY', `Fallback portal ${index + 1} created at [${posResult.x}, ${posResult.y}]`);
        }

        logger.log('ENTITY_FACTORY', 'Fallback portals created');
    }

    /**
     * Utility: Shuffle array (Fisher-Yates)
     */
    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Get the current global question data
     */
    getGlobalQuestionData(): any {
        return this.currentGlobalQuestionData;
    }

    /**
     * Reset global question data (for level restart)
     */
    resetGlobalQuestionData(): void {
        this.currentGlobalQuestionData = null;
    }
}
