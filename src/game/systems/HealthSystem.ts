/**
 * Система управления здоровьем
 * Использует PNG текстуру для отображения
 */

import Phaser from 'phaser';
import { AssetLoader } from '../core/AssetLoader';
import { CURRENT_THEME } from '../../config/gameConfig';
import { DEPTHS, MAX_HEALTH } from '../../constants/gameConstants';

export class HealthSystem {
  private scene: Phaser.Scene;
  private assetLoader: AssetLoader;
  private health: number = MAX_HEALTH;
  private maxHealth: number = MAX_HEALTH;
  private heartTextureKey: string = 'heart_player'; // ✅ Текстура для отображения над головой игрока (Heart5x5.png)
  private goldHeartTextureKey: string = 'heart_gold_player'; // ✅ Текстура золотого сердечка (Heart.Gold5x5.png)
  private heartSprites: Phaser.GameObjects.Sprite[] = [];
  private playerHealthContainer?: Phaser.GameObjects.Container;
  // ✅ Множество индексов сердечек, которые должны быть скрыты (перекрыты золотыми)
  private overriddenHeartIndices: Set<number> = new Set();

  // Константы позиционирования для синхронизации с Player
  private static readonly HEART_SPACING = 18;
  private static readonly HEART_OFFSET_Y = 30;

  constructor(scene: Phaser.Scene, assetLoader: AssetLoader) {
    this.scene = scene;
    this.assetLoader = assetLoader;
  }

  /**
   * Инициализация - загрузка текстуры сердечка для отображения над головой игрока
   */
  public async initialize(): Promise<void> {
    try {
      await this.assetLoader.loadImage(this.heartTextureKey, 'Heart5x5.png');
      await this.assetLoader.loadImage(this.goldHeartTextureKey, 'Heart.Gold5x5.png');
    } catch (error) {
      console.error('Failed to load heart texture, using fallback', error);
      // Fallback: создаем простую текстуру
      this.createFallbackHeartTexture();
    }
  }

  /**
   * Создать текстуру сердечка по умолчанию (fallback)
   */
  private createFallbackHeartTexture(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xd53f8c); // Розовый цвет
    graphics.fillRect(0, 0, 5, 5); // ✅ Размер 5x5 для соответствия Heart5x5.png
    graphics.generateTexture(this.heartTextureKey, 5, 5);
    graphics.clear();
  }

  /**
   * Установить здоровье
   */
  public setHealth(health: number): void {
    this.health = Math.max(0, Math.min(health, this.maxHealth));
    this.updateDisplay();
  }

  /**
   * Получить здоровье
   */
  public getHealth(): number {
    return this.health;
  }

  /**
   * Нанести урон
   */
  public takeDamage(amount: number = 1): boolean {
    this.health = Math.max(0, this.health - amount);
    this.updateDisplay();
    return this.health > 0;
  }

  /**
   * Добавить здоровье
   */
  public addHealth(amount: number = 1): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.updateDisplay();
  }

  /**
   * Установить максимальное здоровье
   */
  public setMaxHealth(maxHealth: number): void {
    this.maxHealth = maxHealth;
    if (this.health > this.maxHealth) {
      this.health = this.maxHealth;
    }
    this.updateDisplay();
  }

  /**
   * Установить перекрытие для сердечка (скрыть/показать)
   * Используется когда поверх обычного сердечка отображается золотое
   */
  public setHeartOverride(index: number, isOverridden: boolean): void {
    const changed = isOverridden
      ? !this.overriddenHeartIndices.has(index)
      : this.overriddenHeartIndices.has(index);

    if (changed) {
      if (isOverridden) {
        this.overriddenHeartIndices.add(index);
      } else {
        this.overriddenHeartIndices.delete(index);
      }
      this.updatePlayerHealthDisplay();
    }
  }

  /**
   * Создать отображение здоровья над головой игрока
   */
  public createPlayerHealthDisplay(playerX: number, playerY: number): void {
    if (this.playerHealthContainer) {
      this.playerHealthContainer.destroy();
    }

    this.playerHealthContainer = this.scene.add.container(playerX, playerY - 30);
    // ✅ Сердечки над головой - на уровне персонажа (9), синхронизированы с depth персонажа
    this.playerHealthContainer.setDepth(DEPTHS.WORLD.OVERHEAD_INDICATOR);
    this.updatePlayerHealthDisplay();
  }

  /**
   * Обновить отображение здоровья над игроком
   */
  public updatePlayerHealthDisplay(): void {
    if (!this.playerHealthContainer) return;

    // Очищаем старые спрайты
    this.playerHealthContainer.removeAll(true);

    // Создаем спрайты сердечек
    const spacing = 18;
    const startX = -(this.maxHealth * spacing) / 2 + spacing / 2;

    for (let i = 0; i < this.maxHealth; i++) {
      const heart = this.scene.add.sprite(
        startX + i * spacing,
        0,
        this.heartTextureKey
      );

      // ✅ Увеличиваем размер сердечка в 4 раза (5x5 -> 20x20)
      heart.setScale(4.0);

      if (i < this.health) {
        heart.setTint(0xffffff); // Белый (активное)
        heart.setAlpha(1);
      } else {
        heart.setTint(0x666666); // Серый (неактивное)
        heart.setAlpha(0.5);
      }

      // ✅ Если сердечко перекрыто золотым, скрываем его полностью
      if (this.overriddenHeartIndices.has(i)) {
        heart.setVisible(false);
      }

      this.playerHealthContainer.add(heart);
    }
  }

  /**
   * Обновить позицию отображения здоровья над игроком
   * @param x Позиция X персонажа
   * @param y Позиция Y персонажа
   * @param playerDepth Depth персонажа для синхронизации (опционально)
   */
  public updatePlayerHealthPosition(x: number, y: number, playerDepth?: number): void {
    if (this.playerHealthContainer) {
      this.playerHealthContainer.setPosition(x, y - 30);
      // ✅ Синхронизируем depth с персонажем, если передан
      if (playerDepth !== undefined) {
        this.playerHealthContainer.setDepth(playerDepth);
      }
    }
  }

  /**
   * Создать отображение здоровья в UI (для React компонента)
   * Возвращает данные для UIOverlay
   */
  public getHealthForUI(): number {
    return this.health;
  }

  /**
   * Обновить отображение
   */
  private updateDisplay(): void {
    this.updatePlayerHealthDisplay();
  }

  /**
   * Уничтожить систему
   */
  public destroy(): void {
    if (this.playerHealthContainer) {
      this.playerHealthContainer.destroy();
      this.playerHealthContainer = undefined;
    }
    this.heartSprites.forEach(sprite => sprite.destroy());
    this.heartSprites = [];
  }

  /**
   * Сбросить здоровье
   */
  public reset(): void {
    this.health = this.maxHealth;
    this.updateDisplay();
  }

  /**
   * Получить позиции сердечек для синхронизации с золотыми сердечками
   * @param playerX Позиция X игрока
   * @param playerY Позиция Y игрока
   * @returns Массив позиций {x, y} для каждого сердечка
   */
  public getHeartPositions(playerX: number, playerY: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const spacing = HealthSystem.HEART_SPACING;
    const startX = -(this.maxHealth * spacing) / 2 + spacing / 2;
    const offsetY = HealthSystem.HEART_OFFSET_Y;

    for (let i = 0; i < this.maxHealth; i++) {
      positions.push({
        x: playerX + startX + i * spacing,
        y: playerY - offsetY
      });
    }

    return positions;
  }

  /**
   * Получить текстуру золотого сердечка
   */
  public getGoldHeartTextureKey(): string {
    return this.goldHeartTextureKey;
  }

  /**
   * Получить scale для сердечек (для синхронизации размеров)
   */
  public static getHeartScale(): number {
    return 4.0; // Совпадает сsetScale(4.0) в updatePlayerHealthDisplay
  }
}

