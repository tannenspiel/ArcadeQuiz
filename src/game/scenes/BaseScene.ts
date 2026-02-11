/**
 * Базовый класс для всех игровых сцен
 * Содержит общий функционал
 */

import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { AssetLoader } from '../core/AssetLoader';
import { LevelManager } from '../core/LevelManager';
import { GameState } from '../core/GameState';
import { MAP_WIDTH, MAP_HEIGHT, BASE_SCALE } from '../../constants/gameConstants';
import { logger } from '../../utils/Logger';

export class BaseScene extends Phaser.Scene {
  protected eventBus: typeof EventBus = EventBus;
  protected assetLoader!: AssetLoader;
  protected levelManager!: LevelManager;
  protected gameState!: GameState;

  // Phaser свойства
  declare physics: Phaser.Physics.Arcade.ArcadePhysics;
  declare add: Phaser.GameObjects.GameObjectFactory;
  declare input: Phaser.Input.InputPlugin;
  declare cameras: Phaser.Cameras.Scene2D.CameraManager;
  declare time: Phaser.Time.Clock;
  declare make: Phaser.GameObjects.GameObjectCreator;
  declare sound: Phaser.Sound.NoAudioSoundManager | Phaser.Sound.HTML5AudioSoundManager | Phaser.Sound.WebAudioSoundManager;
  declare scene: Phaser.Scenes.ScenePlugin;
  declare tweens: Phaser.Tweens.TweenManager;
  declare scale: Phaser.Scale.ScaleManager;

  constructor(key: string) {
    super({ key });
  }

  /**
   * Инициализация базовых систем
   */
  protected initBaseSystems(): void {
    this.assetLoader = new AssetLoader(this);
    this.levelManager = new LevelManager(this.assetLoader);
    this.gameState = new GameState();
  }

  /**
   * Настройка физики мира
   */
  protected setupPhysics(): void {
    logger.log('SCENE_PHYSICS', 'BaseScene: setupPhysics() - checking physics availability...', {
      hasScene: !!this,
      hasPhysics: !!this?.physics,
      hasPhysicsWorld: !!this?.physics?.world
    });

    // Safety check: physics.world may be null during scene restart
    if (!this?.physics?.world) {
      console.warn('⚠️ BaseScene: Physics world not available in setupPhysics(), skipping');
      return;
    }

    const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
    const mapHeightScaled = MAP_HEIGHT * BASE_SCALE;
    this.physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
    logger.log('SCENE_PHYSICS', 'BaseScene: Physics bounds set to', { width: mapWidthScaled, height: mapHeightScaled });
  }

  /**
   * Настройка камеры
   */
  protected setupCamera(bounds?: { x: number; y: number; width: number; height: number }): void {
    if (bounds) {
      this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    } else {
      const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
      const mapHeightScaled = MAP_HEIGHT * BASE_SCALE;
      this.cameras.main.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
    }
  }

  /**
   * Метод для создания сцены (может быть переопределен в наследниках)
   */
  create(): void {
    // Базовая реализация пустая, наследники могут переопределить
  }

  /**
   * Метод для обновления сцены (может быть переопределен в наследниках)
   */
  update(time: number, delta: number): void {
    // Базовая реализация пустая, наследники могут переопределить
  }

  /**
   * Получить размер камеры в координатах игрового мира
   * Безопасный хелпер для расчета размеров камеры
   */
  protected getCameraWorldSize(): { width: number; height: number } {
    const cam = this.cameras.main;
    const scale = this.scale;
    
    // При FIT mode используем gameSize как базовый размер
    const baseWidth = scale.gameSize.width;
    const baseHeight = scale.gameSize.height;
    
    // Учитываем zoom камеры
    const width = baseWidth / cam.zoom;
    const height = baseHeight / cam.zoom;
    
    return { width, height };
  }
}

