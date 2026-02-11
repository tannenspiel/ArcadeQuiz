/**
 * Враг типа flam
 * Универсальный враг, поведение настраивается через конфиг (chaseRadius, cloneCount и т.д.)
 */

import Phaser from 'phaser';
import { AbstractEnemy } from './AbstractEnemy';
import { EnemyConfig, EnemyState } from '../../../types/enemyTypes';
import { MAP_WIDTH, MAP_HEIGHT, BASE_SCALE } from '../../../constants/gameConstants';

export class EnemyFlam extends AbstractEnemy {
  private lastDirectionChange: number = 0;
  private directionChangeInterval: number = 2000; // Меняет направление каждые 2 секунды

  constructor(scene: Phaser.Scene, config: EnemyConfig) {
    super(scene, config);
    // ✅ Инициализируем состояние WANDERING
    this.setState(EnemyState.WANDERING);
    // ✅ Инициализируем lastDirectionChange текущим временем, чтобы враг начал движение сразу
    this.lastDirectionChange = scene.time.now;
    // ✅ Устанавливаем начальную скорость СИНХРОННО сразу после создания спрайта
    // ✅ Проверяем, что спрайт и тело физики инициализированы
    if (this.sprite && this.sprite.body && this.animationHandler) {
      const angle = Phaser.Math.Between(0, 360);
      scene.physics.velocityFromAngle(angle, this.baseSpeed, this.sprite.body.velocity);
      // ✅ Сразу запускаем анимацию после установки скорости
      const velocityX = this.sprite.body.velocity.x;
      const velocityY = this.sprite.body.velocity.y;
      this.animationHandler.playDirectionAnimation(velocityX, velocityY);
      // ✅ Также вызываем syncFrame для немедленной синхронизации первого кадра
      this.animationHandler.syncFrame();
    } else {
      // ✅ Fallback: если спрайт еще не готов, используем delayedCall
      scene.time.delayedCall(0, () => {
        if (this.sprite && this.sprite.body && this.sprite.active && this.animationHandler) {
          const angle = Phaser.Math.Between(0, 360);
          scene.physics.velocityFromAngle(angle, this.baseSpeed, this.sprite.body.velocity);
          const velocityX = this.sprite.body.velocity.x;
          const velocityY = this.sprite.body.velocity.y;
          this.animationHandler.playDirectionAnimation(velocityX, velocityY);
          this.animationHandler.syncFrame();
        }
      });
    }
  }

  /**
   * AI для flam врага с универсальными настройками поведения
   */
  public updateAI(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    if (!this.sprite || !this.sprite.active || !this.sprite.body) return;

    const currentState = this.getState();
    
    // Не обновляем AI в специальных состояниях
    if (currentState === EnemyState.SPAWNING || 
        currentState === EnemyState.DYING || 
        currentState === EnemyState.DEAD ||
        currentState === EnemyState.DETECTING) {
      return;
    }

    const now = this.scene.time.now;

    // Проверяем отступление от краев карты (отступ 16 базовый = 64 виртуальный)
    const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
    const mapHeightScaled = MAP_HEIGHT * BASE_SCALE;
    const edgeOffset = 16 * BASE_SCALE; // 64 в виртуальном разрешении
    if (this.sprite.x < edgeOffset || this.sprite.x > mapWidthScaled - edgeOffset || 
        this.sprite.y < edgeOffset || this.sprite.y > mapHeightScaled - edgeOffset) {
      if (currentState !== EnemyState.RETREATING) {
        this.setState(EnemyState.RETREATING);
      }
      const angleToCenter = Phaser.Math.Angle.Between(
        this.sprite.x, 
        this.sprite.y, 
        mapWidthScaled / 2, 
        mapHeightScaled / 2
      );
      this.scene.physics.velocityFromRotation(angleToCenter, this.baseSpeed, this.sprite.body.velocity);
      return;
    }

    // ✅ Проверяем преследование (если chaseRadius > 0)
    if (this.chaseRadius > 0) {
      const dist = Phaser.Math.Distance.Between(
        this.sprite.x, 
        this.sprite.y, 
        player.x, 
        player.y
      );
      
      if (dist < this.chaseRadius) {
        // Преследуем игрока
        if (currentState !== EnemyState.CHASING) {
          this.setState(EnemyState.CHASING);
        }
        // ✅ Используем chaseSpeed если указана, иначе baseSpeed
        const chaseSpeed = this.chaseSpeed > 0 ? this.chaseSpeed : this.baseSpeed;
        this.scene.physics.moveToObject(this.sprite, player, chaseSpeed);
        return;
      }
    }

    // Если не отступаем и не преследуем, блуждаем
    if (currentState !== EnemyState.WANDERING && currentState !== EnemyState.RETREATING) {
      this.setState(EnemyState.WANDERING);
      // ✅ При переходе в WANDERING сразу устанавливаем начальную скорость
      const angle = Phaser.Math.Between(0, 360);
      this.scene.physics.velocityFromAngle(angle, this.baseSpeed, this.sprite.body.velocity);
      this.lastDirectionChange = now;
    }

    // ✅ Если враг стоит (скорость = 0), сразу начинаем движение
    if (currentState === EnemyState.WANDERING && 
        this.sprite.body.velocity.x === 0 && 
        this.sprite.body.velocity.y === 0) {
      const angle = Phaser.Math.Between(0, 360);
      this.scene.physics.velocityFromAngle(angle, this.baseSpeed, this.sprite.body.velocity);
      this.lastDirectionChange = now;
    }

    // Периодически меняем направление
    if (now - this.lastDirectionChange > this.directionChangeInterval) {
      const angle = Phaser.Math.Between(0, 360);
      this.scene.physics.velocityFromAngle(angle, this.baseSpeed, this.sprite.body.velocity);
      this.lastDirectionChange = now;
    }
  }
}
