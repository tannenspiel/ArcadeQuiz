/**
 * EnemyCollisionHandler - Обработка столкновений игрока с врагами
 *
 * ✅ v4 - Новые правила штрафов:
 * - Базовый урон от врага: -2 очка (всегда)
 * - Потерянная монетка: -3 очка (дополнительно)
 * - Потерянный ключ: -5 очков (дополнительно)
 */

import type { AbstractEnemy } from '../../entities/enemies/AbstractEnemy';
import type MainScene from '../MainScene';
import { logger } from '../../../utils/Logger';
import { KEYS } from '../../../constants/gameConstants';
import { PENALTY, calculateEnemyDamagePenalty } from '../../../constants/scoreConstants';

export class EnemyCollisionHandler {
    constructor(private scene: MainScene) { }

    /**
     * Обрабатывает столкновение игрока с врагом
     * - Враг всегда умирает
     * - Если есть ключи - теряется ключ
     * - Если нет ключей - теряется здоровье
     */
    handle(enemy: AbstractEnemy): void {
        if (!this.scene.sys.settings.active) return;
        const enemySprite = enemy.getSprite();
        if (!enemySprite || !enemySprite.active) return;

        // ✅ Cooldown для предотвращения множественных столкновений с ЭТИМ конкретным врагом
        const now = this.scene.time.now;
        const lastCollisionTime = (enemy as any).lastCollisionTime || 0;
        const collisionCooldown = (enemy as any).COLLISION_COOLDOWN || 500;

        if (now - lastCollisionTime < collisionCooldown) {
            return; // Игнорируем столкновение, если прошло меньше времени cooldown для этого врага
        }
        (enemy as any).lastCollisionTime = now;

        // ✅ Получаем урон из конфига врага
        const enemyDamage = enemy.getDamage();

        // ✅ Вычисляем направление от врага к игроку для отбрасывания
        const player = this.scene.player;
        const playerSprite = player.getSprite();
        const playerPos = { x: playerSprite.x, y: playerSprite.y };
        const enemyPos = { x: enemySprite.x, y: enemySprite.y };

        // Вектор от врага к игроку (направление отбрасывания)
        const directionX = playerPos.x - enemyPos.x;
        const directionY = playerPos.y - enemyPos.y;

        // ✅ Враг всегда умирает при столкновении
        enemy.onPlayerCollision(playerSprite);

        // ✅ Логика потери ключа/монетки у персонажа:
        // - Ключи защищают от потери жизней (теряется только ключ)
        // - Монетки НЕ защищают (теряется И монетка, И жизнь)
        const gameState = (this.scene as any).gameState;
        const audioManager = this.scene.audioManager;
        const scoreSystem = this.scene.scoreSystem;
        const healthSystem = this.scene.healthSystem;
        const effectsManager = this.scene.effectsManager;

        const keyCount = gameState.getKeys();
        const coinCount = gameState.getCoins();

        if (keyCount > 0) {
            // ✅ v4: У игрока есть ключи - теряется ключ, НЕ теряется здоровье
            gameState.removeKey();
            audioManager.playDamageKey();

            // ✅ v4: Базовый урон (-2) + штраф за потерянный ключ (-5) = -7 очков
            const totalPenalty = Math.abs(PENALTY.ENEMY_DAMAGE_BASE) + Math.abs(PENALTY.KEY_LOST);
            scoreSystem.removeScore(totalPenalty);

            effectsManager.triggerRingLossEffect(keyCount);
            // ✅ Мигание персонажа при потере ключа
            effectsManager.flashPlayerLoseKey();
            // ✅ Проигрываем анимацию потери ключа через машину состояний
            player.loseKey();
        } else {
            // ✅ v4: Проверка монеток (монетки НЕ защищают от потери жизней)
            const lostCoin = coinCount > 0;

            if (lostCoin) {
                // У игрока есть монетки - теряется монетка И жизнь
                gameState.removeCoin();
                audioManager.playDamageCoin();

                // ✅ Обновляем мон acreтки над игроком (после потери одной)
                const currentCoins = gameState.getCoins();
                const playerSprite = player.getSprite();
                const heartPositions = this.scene.healthSystem.getHeartPositions(playerSprite.x, playerSprite.y);
                const heartScale = 4.0; // Совпадает с HealthSystem.getHeartScale()
                player.updateCoins(currentCoins, heartPositions, KEYS.COIN_HEART, heartScale);

                // ✅ v4: Базовый урон (-2) + штраф за потерянную монетку (-3) = -5 очков
                const totalPenalty = Math.abs(PENALTY.ENEMY_DAMAGE_BASE) + Math.abs(PENALTY.COIN_LOST);
                scoreSystem.removeScore(totalPenalty);
                // TODO: Можно добавить эффект потери монетки (аналог triggerRingLossEffect)
            } else {
                // ✅ v4: Только базовый урон, когда нет ни ключей, ни монеток
                scoreSystem.removeScore(Math.abs(PENALTY.ENEMY_DAMAGE_BASE));
            }

            // Теряется здоровье (всегда, независимо от наличия монеток)
            player.takeDamage(directionX, directionY);
            audioManager.playDamage();

            // ✅ Обработка завершения анимации повреждения
            const handleDamageComplete = () => {
                const isAlive = healthSystem.takeDamage(enemyDamage);
                if (!isAlive) {
                    // Переходим в состояние смерти
                    player.finishDamage(false);
                    audioManager.playCharacterDead();
                    // Показываем окно проигрыша с задержкой
                    this.scene.time.delayedCall(1000, () => {
                        this.scene.gameOverHandler.handleGameOver('lose');
                    });
                } else {
                    // Возвращаемся к нормальному состоянию
                    player.finishDamage(true);
                }
                this.scene.hudManager.update();
            };

            // Ждем завершения анимации повреждения
            playerSprite.once('animationcomplete', (animation: Phaser.Animations.Animation) => {
                if (animation.key === 'character_damaged') {
                    handleDamageComplete();
                }
            });
        }
        this.scene.hudManager.update();
    }
}
