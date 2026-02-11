import Phaser from 'phaser';
import { AbstractEnemy } from '../../entities/enemies/AbstractEnemy';
import { EnemyState, EnemyType } from '../../../types/enemyTypes';
import { EnemyCloneFactory, CloneCreationConfig } from './EnemyCloneFactory';
import { EnemySpawner } from './EnemySpawner';
import { logger } from '../../../utils/Logger';
import { LevelManager } from '../../core/LevelManager';

/**
 * Dependencies for EnemyManager
 */
interface EnemyManagerDependencies {
    scene: Phaser.Scene;
    enemiesGroup: Phaser.Physics.Arcade.Group;
    chasersGroup: Phaser.Physics.Arcade.Group;
    levelManager: LevelManager;
}

/**
 * Manages enemy lifecycle, updates, and control
 */
export class EnemyManager {
    private enemyInstances: AbstractEnemy[] = [];
    private cloneFactory!: EnemyCloneFactory;
    private spawner!: EnemySpawner; // Assigned via setter or separate init to resolve circular dependency if needed

    constructor(
        private deps: EnemyManagerDependencies
    ) {
        // Initialize Clone Factory immediately
        this.cloneFactory = new EnemyCloneFactory(
            deps.scene,
            deps.enemiesGroup,
            deps.chasersGroup,
            (enemy) => this.registerEnemy(enemy)
        );
    }

    /**
     * Sets the spawner instance (dependency injection)
     */
    public setSpawner(spawner: EnemySpawner): void {
        this.spawner = spawner;
    }

    /**
     * Get the Clone Factory component
     */
    public getCloneFactory(): EnemyCloneFactory {
        return this.cloneFactory;
    }

    /**
     * Main update loop for all enemies
     */
    public update(time: number, delta: number, playerSprite: Phaser.GameObjects.Sprite | null): void {
        // Update all enemy instances
        if (this.enemyInstances && Array.isArray(this.enemyInstances)) {
            this.enemyInstances.forEach(enemy => {
                const enemySprite = enemy.getSprite();
                if (enemySprite && enemySprite.active && playerSprite && playerSprite.active) {
                    enemy.update(playerSprite as any);
                }
            });
        }

        // Control max enemies limit
        this.controlMaxEnemies();
    }

    /**
     * Updates the internal list of enemy instances from groups
     */
    public updateEnemyInstances(): void {
        this.enemyInstances = [];

        // Check groups/scene validity
        if (!this.deps.enemiesGroup || !this.deps.enemiesGroup.scene ||
            !this.deps.chasersGroup || !this.deps.chasersGroup.scene) {
            return;
        }

        this.deps.enemiesGroup.getChildren().forEach((sprite: any) => {
            const enemy = sprite.getData('enemy') as AbstractEnemy;
            if (enemy) {
                this.enemyInstances.push(enemy);
            }
        });

        this.deps.chasersGroup.getChildren().forEach((sprite: any) => {
            const enemy = sprite.getData('enemy') as AbstractEnemy;
            if (enemy) {
                this.enemyInstances.push(enemy);
            }
        });
    }

    /**
     * Registers a new enemy instance manually (e.g. from clone factory)
     */
    private registerEnemy(enemy: AbstractEnemy): void {
        // Rebuild list to ensure consistency
        this.updateEnemyInstances();
    }

    /**
     * Returns current enemy instances
     */
    public getInstances(): AbstractEnemy[] {
        return this.enemyInstances;
    }

    /**
     * Creates a clone via factory
     * This method is called by AbstractEnemy via a callback/delegate in MainScene
     * In the new architecture, MainScene will delegate this to EnemyManager
     */
    public createClone(config: CloneCreationConfig): void {
        this.cloneFactory.createClone(config);

        // Setup collision/physics for the new clone if needed 
        // (Groups handle adding to world, but if special colliders are needed, they are in MainScene setup)

        // Immediate update of instances list
        this.updateEnemyInstances();
    }

    /**
     * Controls maximum number of enemies by killing oldest ones
     */
    private async controlMaxEnemies(): Promise<void> {
        try {
            const spawnConfig = await this.deps.levelManager.getEnemySpawnConfig();

            // If maxEnemies is null, unlimited
            if (spawnConfig.maxEnemies === null) {
                return;
            }

            const totalEnemies = this.deps.enemiesGroup.countActive() + this.deps.chasersGroup.countActive();

            // If over limit, kill oldest
            if (totalEnemies > spawnConfig.maxEnemies) {
                const enemiesToKill = totalEnemies - spawnConfig.maxEnemies;

                // Sort by spawn time (oldest first)
                const sortedEnemies = [...this.enemyInstances]
                    .filter(e => e && e.isActive())
                    .sort((a, b) => {
                        const aTime = (a as any).spawnTime || 0;
                        const bTime = (b as any).spawnTime || 0;
                        return aTime - bTime;
                    });

                // Kill oldest enemies
                for (let i = 0; i < enemiesToKill && i < sortedEnemies.length; i++) {
                    const enemy = sortedEnemies[i];
                    if (enemy && enemy.isActive()) {
                        logger.log('ENEMY_CONTROL', 'Killing oldest enemy to maintain maxEnemies limit', {
                            enemyId: enemy.getId(),
                            type: enemy.getType(),
                            isClone: (enemy as any).isClone,
                            spawnTime: (enemy as any).spawnTime,
                            totalEnemies,
                            maxEnemies: spawnConfig.maxEnemies
                        });

                        // Kill via DYING state
                        enemy.getSprite().disableBody(true, false);
                        (enemy as any).setState(EnemyState.DYING);
                        (enemy as any).isDying = true;
                        (enemy as any).playDeathAnimation(true);
                    }
                }

                // Update list
                this.updateEnemyInstances();
            }
        } catch (error) {
            logger.log('ENEMY_CONTROL', 'Error controlling max enemies', { error });
        }
    }
}
