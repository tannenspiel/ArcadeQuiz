/**
 * Универсальная система управления анимациями спрайтшитов
 * Поддерживает разные форматы расположения кадров
 */

import Phaser from 'phaser';
import { ASSETS_BASE_PATH } from '../../config/gameConfig';
import {
  SpritesheetConfig,
  SpritesheetLoadConfig,
  AnimationConfig,
  SpritesheetLayout,
  AnimationFrame
} from '../../types/animationTypes';
import { logger } from '../../utils/Logger';

export class AnimationManager {
  private scene: Phaser.Scene;
  private loadedSpritesheets: Set<string> = new Set();
  private createdAnimations: Set<string> = new Set();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Загрузить спрайтшит
   */
  public loadSpritesheet(config: SpritesheetLoadConfig): void {
    if (this.loadedSpritesheets.has(config.key)) {
      logger.log('ANIMATION_CREATE', `Spritesheet already loaded: ${config.key}`);
      return;
    }

    const fullPath = `${ASSETS_BASE_PATH}/images/${config.path}`;
    logger.log('ANIMATION_CREATE', `Loading spritesheet: ${config.key} from ${fullPath}`);

    // ✅ КРИТИЧНО: Указываем endFrame для корректной загрузки количества кадров
    const frameConfig: Phaser.Types.Loader.FileTypes.ImageFrameConfig = {
      frameWidth: config.frameWidth,
      frameHeight: config.frameHeight
    };

    // Добавляем endFrame если указан frameCount
    if (config.frameCount !== undefined) {
      frameConfig.endFrame = config.frameCount - 1; // endFrame индексируется с 0
    }

    this.scene.load.spritesheet(config.key, fullPath, frameConfig);

    this.loadedSpritesheets.add(config.key);
  }

  /**
   * Создать анимации из спрайтшита
   * Вызывается ПОСЛЕ загрузки спрайтшита
   */
  public createAnimations(
    spritesheetKey: string,
    animations: AnimationConfig[]
  ): void {
    if (!this.scene.textures.exists(spritesheetKey)) {
      logger.warn('ANIMATION_CREATE', `Cannot create animations: spritesheet "${spritesheetKey}" not loaded`);
      return;
    }

    const texture = this.scene.textures.get(spritesheetKey);
    const totalFrames = texture.frameTotal;
    logger.log('ANIMATION_CREATE', `Spritesheet "${spritesheetKey}": total frames = ${totalFrames}`);

    animations.forEach((animConfig) => {
      // ✅ КРИТИЧНО: Проверяем существование анимации ПЕРЕД любыми другими операциями
      // Это должно предотвратить предупреждения Phaser
      if (this.scene.anims.exists(animConfig.key)) {
        logger.log('ANIMATION_CREATE', `Skipping animation "${animConfig.key}" - already exists in Phaser`);
        // Добавляем в Set, если еще не добавлена
        if (!this.createdAnimations.has(animConfig.key)) {
          this.createdAnimations.add(animConfig.key);
        }
        return;
      }

      // ✅ Проверяем внутренний Set (второстепенная проверка)
      if (this.createdAnimations.has(animConfig.key)) {
        logger.log('ANIMATION_CREATE', `Skipping animation "${animConfig.key}" - already in createdAnimations Set`);
        return;
      }

      // Генерируем кадры правильно
      const frameIndices = animConfig.frames.map(f =>
        typeof f === 'number' ? f : f.frame
      );

      // ✅ КРИТИЧНО: Проверяем, что индексы не выходят за пределы
      const invalidFrames = frameIndices.filter(i => i >= totalFrames);
      if (invalidFrames.length > 0) {
        console.error(`❌ INVALID FRAMES in ${animConfig.key}:`, invalidFrames, 'Total frames:', totalFrames); // Критическая ошибка - оставляем в консоли
        return; // Не создаём анимацию с невалидными кадрами
      }

      logger.log('ANIMATION_CREATE', `Creating animation "${animConfig.key}" with frames:`, frameIndices);
      logger.log('ANIMATION_CREATE', `Frame indices detail:`, frameIndices.map((idx, i) => `[${i}]=${idx}`).join(', '));

      try {
        const generatedFrames = this.scene.anims.generateFrameNumbers(spritesheetKey, {
          frames: frameIndices
        });

        const generatedFramesDetail = generatedFrames.map((f: any, idx: number) => {
          const frameObj = f.frame || f;
          const frameIndex = (frameObj as any)?.index ?? frameObj;
          const frameName = (frameObj as any)?.name ?? String(frameIndex);
          return {
            animIndex: idx,
            spritesheetIndex: frameIndex,
            frameName: frameName,
            fullFrame: frameObj
          };
        });
        logger.log('ANIMATION_CREATE', `Generated frames (${generatedFrames.length}):`, JSON.stringify(generatedFramesDetail, null, 2));

        // ✅ КРИТИЧНО: Финальная проверка перед созданием (на случай, если анимация была создана между проверками)
        // Это последний шанс предотвратить предупреждение Phaser
        if (this.scene.anims.exists(animConfig.key)) {
          logger.log('ANIMATION_CREATE', `Animation "${animConfig.key}" already exists in Phaser (final check), skipping creation`);
          this.createdAnimations.add(animConfig.key);
          return;
        }

        // ✅ Создаем анимацию только если она точно не существует
        // Phaser может выдать предупреждение через installHook, но мы уже проверили существование
        this.scene.anims.create({
          key: animConfig.key,
          frames: generatedFrames,
          frameRate: animConfig.frameRate ?? 8,
          repeat: animConfig.repeat ?? -1, // ✅ ВАЖНО: -1 = бесконечно
          delay: animConfig.delay,
          yoyo: animConfig.yoyo
        });

        const createdAnim = this.scene.anims.get(animConfig.key);
        const actualFrameIndices = createdAnim?.frames?.map((f: any, idx: number) => {
          const frameObj = f.frame || f;
          return {
            animIndex: idx,
            spritesheetIndex: (frameObj as any)?.index ?? frameObj,
            name: (frameObj as any)?.name ?? 'unknown'
          };
        }) || [];

        logger.log('ANIMATION_CREATE', `Created animation: ${animConfig.key}`, {
          frameCount: generatedFrames.length,
          actualFrames: createdAnim?.frames?.length,
          frameRate: animConfig.frameRate ?? 8,
          repeat: animConfig.repeat ?? -1,
          actualFrameIndices: actualFrameIndices
        });

        this.createdAnimations.add(animConfig.key);
      } catch (error) {
        console.error(`❌ Error creating animation "${animConfig.key}":`, error); // Критическая ошибка - оставляем в консоли
      }
    });
  }

  /**
   * Загрузить спрайтшит и создать анимации (полная конфигурация)
   */
  public loadAndCreateAnimations(config: SpritesheetConfig): void {
    this.loadSpritesheet(config.load);
    // Анимации будут созданы после загрузки (в обработчике complete)
  }

  /**
   * Преобразовать кадры в формат Phaser
   */
  private convertFramesToPhaser(
    spritesheetKey: string,
    frames: AnimationFrame[] | number[]
  ): Phaser.Types.Animations.AnimationFrame[] {
    return frames.map((frame) => {
      if (typeof frame === 'number') {
        return { key: spritesheetKey, frame };
      } else {
        return {
          key: spritesheetKey,
          frame: frame.frame,
          duration: frame.duration
        };
      }
    });
  }

  /**
   * Генератор кадров для горизонтальной полосы
   */
  public static generateHorizontalFrames(
    start: number,
    end: number
  ): number[] {
    const frames: number[] = [];
    for (let i = start; i <= end; i++) {
      frames.push(i);
    }
    return frames;
  }

  /**
   * Генератор кадров для вертикальной полосы
   */
  public static generateVerticalFrames(
    start: number,
    end: number,
    cols: number
  ): number[] {
    const frames: number[] = [];
    for (let i = start; i <= end; i++) {
      frames.push(i * cols);
    }
    return frames;
  }

  /**
   * Генератор кадров для сетки (4 направления)
   * Предполагает формат: 4 колонки (направления) x N строк (кадры анимации)
   * Колонка 0 = вниз, 1 = вверх, 2 = влево, 3 = вправо
   */
  public static generateGridDirectionFrames(
    direction: 'down' | 'up' | 'left' | 'right',
    frameCount: number = 4,
    cols: number = 4
  ): number[] {
    const directionIndex = {
      down: 0,
      up: 1,
      left: 2,
      right: 3
    }[direction];

    const frames: number[] = [];
    for (let i = 0; i < frameCount; i++) {
      frames.push(directionIndex + i * cols);
    }
    return frames;
  }

  /**
   * Генератор кадров для сетки (произвольная область)
   */
  public static generateGridFrames(
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number,
    cols: number
  ): number[] {
    const frames: number[] = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        frames.push(row * cols + col);
      }
    }
    return frames;
  }

  /**
   * Проверить, загружен ли спрайтшит
   */
  public isSpritesheetLoaded(key: string): boolean {
    return this.loadedSpritesheets.has(key) || this.scene.textures.exists(key);
  }

  /**
   * Проверить, создана ли анимация
   */
  public isAnimationCreated(key: string): boolean {
    return (
      this.createdAnimations.has(key) || this.scene.anims.exists(key)
    );
  }

  /**
   * Очистить кеш
   */
  public clearCache(): void {
    this.loadedSpritesheets.clear();
    this.createdAnimations.clear();
  }
}

