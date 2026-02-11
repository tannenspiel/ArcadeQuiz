import Phaser from 'phaser';
import { EnemyType } from '../../../types/enemyTypes';
import { AbstractEnemy } from '../../entities/enemies/AbstractEnemy';
import { EnemyRandomWalker } from '../../entities/enemies/EnemyRandomWalker';
import { EnemyChaser } from '../../entities/enemies/EnemyChaser';
import { EnemyFlam } from '../../entities/enemies/EnemyFlam';
import { logger } from '../../../utils/Logger';

/**
 * Interface for Clone Creation Configuration
 */
export interface CloneCreationConfig {
    type: EnemyType;
    x: number;
    y: number;
    speed: number;
    health: number;
    damage: number;
    isClone: boolean;
    parentId: string;
    spawnTime: number;
    cloneDetectionRadius: number;
    chaseRadius: number;
    chaseSpeed: number;
    clonesCanClone: boolean;
    cloneLifetime: number;
    cloneCount: number;
    cloneSpawnDelay?: number;
    showDetectionRadius?: boolean;
    initialAngle?: number;
    shouldBlink?: boolean;
}

/**
 * Factory for creating enemy clones
 */
export class EnemyCloneFactory {
    constructor(
        private scene: Phaser.Scene,
        private enemiesGroup: Phaser.Physics.Arcade.Group,
        private chasersGroup: Phaser.Physics.Arcade.Group,
        private onCloneCreated: (enemy: AbstractEnemy) => void
    ) { }

    /**
     * Creates a clone of an enemy
     */
    public createClone(config: CloneCreationConfig): void {
        logger.log('ENEMY_CLONE', 'Creating enemy clone', config);

        let enemy: AbstractEnemy;
        const enemyConfig: any = {
            type: config.type,
            speed: config.speed,
            x: config.x,
            y: config.y,
            health: config.health,
            damage: config.damage,
            isClone: config.isClone,
            parentId: config.parentId,
            spawnTime: config.spawnTime,
            cloneDetectionRadius: config.cloneDetectionRadius,
            chaseRadius: config.chaseRadius,
            chaseSpeed: config.chaseSpeed,
            clonesCanClone: config.clonesCanClone,
            cloneLifetime: config.cloneLifetime,
            cloneCount: config.cloneCount,
            cloneSpawnDelay: config.cloneSpawnDelay ?? 0,
            showDetectionRadius: config.showDetectionRadius ?? false
        };

        if (config.type === EnemyType.RANDOM_WALKER) {
            enemy = new EnemyRandomWalker(this.scene, enemyConfig);
            this.enemiesGroup.add(enemy.getSprite());
        } else if (config.type === EnemyType.CHASER) {
            enemy = new EnemyChaser(this.scene, enemyConfig);
            this.chasersGroup.add(enemy.getSprite());
        } else if (config.type === EnemyType.FLAM) {
            enemy = new EnemyFlam(this.scene, {
                ...enemyConfig
            });
            this.chasersGroup.add(enemy.getSprite());
        } else {
            logger.log('ENEMY_CLONE', 'Unknown enemy type, skipping', { type: config.type });
            return;
        }

        // Set initial movement direction
        if (config.initialAngle !== undefined) {
            this.scene.physics.velocityFromAngle(config.initialAngle, config.speed, enemy.getSprite().body.velocity);
        }

        // Blink white on creation (if needed)
        if (config.shouldBlink) {
            enemy.startCloneBlinkAnimation();
        }

        // Play spawn sound
        enemy.playSpawnSound();

        // Notify manager
        this.onCloneCreated(enemy);

        logger.log('ENEMY_CLONE', 'Clone created successfully', {
            enemyId: enemy.getId(),
            parentId: config.parentId
        });
    }
}
