/**
 * Стандартный портал
 * Реализация базовой логики портала
 */

import Phaser from 'phaser';
import { AbstractPortal } from './AbstractPortal';
import { PortalConfig } from '../../../types/portalTypes';

export class StandardPortal extends AbstractPortal {
  constructor(
    scene: Phaser.Scene,
    config: PortalConfig,
    x: number,
    y: number
  ) {
    super(scene, config, x, y);
  }

  /**
   * Обработка депозита ключа
   */
  public onKeyDeposit(): void {
    // Вспышка при депозите
    this.sprite.setTint(0x00ffff);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.7,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
      }
    });
  }

  /**
   * Обработка входа в портал
   * Возвращает true если портал правильный
   */
  public onEnter(): boolean {
    return this.config.isCorrect;
  }
}

