import Phaser from 'phaser';
import { AbstractEnemy } from '../../entities/enemies/AbstractEnemy';
import { SpawnSystem } from '../../systems/SpawnSystem';
import { LevelManager } from '../../core/LevelManager';
import { AbstractPortal } from '../../entities/portals/AbstractPortal';

/**
 * Handles spawning of enemies and items
 */
export class EnemySpawner {
    constructor(
        private scene: Phaser.Scene,
        private spawnSystem: SpawnSystem,
        private levelManager: LevelManager,
        private enemiesGroup: Phaser.Physics.Arcade.Group,
        private chasersGroup: Phaser.Physics.Arcade.Group,
        private heartsGroup: Phaser.Physics.Arcade.Group,
        private keysGroup: Phaser.Physics.Arcade.Group,
        private coinsGroup: Phaser.Physics.Arcade.Group, // ⚠️ НОВОЕ: Coins group
        private getPlayerPosition: () => { x: number, y: number },
        private onEnemySpawned: (enemy: AbstractEnemy) => void,
        private updateEnemyInstances: () => void
    ) { }

    /**
     * Spawns initial enemies
     */
    public async spawnInitialEnemies(): Promise<void> {
        const playerPos = this.getPlayerPosition();

        // Callback for immediate update and initialization after each enemy spawn
        await this.spawnSystem.spawnInitialEnemies(
            this.enemiesGroup,
            this.chasersGroup,
            playerPos.x,
            playerPos.y,
            (enemy: AbstractEnemy) => {
                // Update instances list immediately
                this.updateEnemyInstances();
                // Immediately update newly created enemy to start logic/animations
                if (enemy && enemy.getSprite && enemy.getSprite().active) {
                    this.onEnemySpawned(enemy);
                }
            }
        );

        // Final update to catch any missing ones
        this.updateEnemyInstances();
    }

    /**
     * Sets up periodic spawn events for enemies and items
     */
    public async setupPeriodicEvents(): Promise<void> {
        const spawnConfig = await this.levelManager.getEnemySpawnConfig();
        const itemConfig = await this.levelManager.getItemSpawnConfig();

        // Periodic Enemy Spawn
        this.scene.time.addEvent({
            delay: spawnConfig.periodicSpawnDelay,
            callback: async () => {
                // Check if scene is active
                if (!this.scene.sys.settings.active) return;

                const playerPos = this.getPlayerPosition();
                await this.spawnSystem.spawnEnemy(
                    this.enemiesGroup,
                    this.chasersGroup,
                    playerPos.x,
                    playerPos.y
                );

                // Update instances if scene is still active
                if (this.scene.sys.settings.active) {
                    this.updateEnemyInstances();
                }
            },
            callbackScope: this,
            loop: true
        });

        // Periodic Item Spawn
        this.scene.time.addEvent({
            delay: itemConfig.keys.spawnDelay,
            callback: async () => {
                const playerPos = this.getPlayerPosition();
                await this.spawnSystem.spawnPeriodicItems(
                    this.heartsGroup,
                    this.keysGroup,
                    this.coinsGroup, // ⚠️ НОВОЕ: Pass coins group
                    playerPos.x,
                    playerPos.y
                );
            },
            callbackScope: this,
            loop: true
        });
    }
}
