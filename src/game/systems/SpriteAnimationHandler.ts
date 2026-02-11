/**
 * Универсальный обработчик анимаций для спрайтшитов
 * ВЕРСИЯ 2.0 - БЕЗ РУЧНОЙ СИНХРОНИЗАЦИИ
 */

import Phaser from 'phaser';
import { DEBUG_ANIMATION } from '../../config/debugConfig';
import { logger } from '../../utils/Logger';

export class SpriteAnimationHandler {
  private sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private currentAnimation: string | null = null;
  private readonly animationPrefix: string;
  private readonly minMovementThreshold: number = 1; // ✅ Уменьшен с 5 до 1 для более чувствительного определения движения
  private scene: Phaser.Scene;
  private isBlinkingCallback?: () => boolean; // ✅ Callback для проверки состояния мигания
  
  // ✅ Ручное управление кадрами для physics спрайтов
  private currentFrameIndex: number = 0;
  private frameTimer: number = 0;
  private frameInterval: number = 0; // Интервал между кадрами в миллисекундах

  constructor(
    scene: Phaser.Scene,
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    animationPrefix: string
  ) {
    this.scene = scene;
    this.sprite = sprite;
    this.animationPrefix = animationPrefix;
    
    // ✅ КРИТИЧНО: Для physics спрайтов Phaser НЕ обновляет кадры автоматически!
    // Нужно явно синхронизировать кадр спрайта с кадром анимации
    // Проверяем наличие метода on (для тестового окружения)
    if (this.sprite && typeof this.sprite.on === 'function') {
      this.sprite.on('animationupdate', (animation: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
      // Логируем только изредка для диагностики
      if (Math.random() < 0.05) {
        logger.log('ANIMATION_SPRITE', `🔄 ${this.animationPrefix}: animationupdate event fired`, {
          animKey: animation.key,
          frameIndex: frame.index,
          frameName: frame.frame?.name,
          frameObj: frame.frame
        });
      }
      
      if (frame && frame.frame) {
        // Получаем индекс кадра из события
        let frameIndex: number | undefined;
        
        // Способ 1: Прямой доступ к индексу
        if ((frame.frame as any).index !== undefined) {
          frameIndex = (frame.frame as any).index;
        }
        // Способ 2: Через name (может быть строкой с числом)
        else if (frame.frame.name !== undefined) {
          const nameAsNum = parseInt(String(frame.frame.name), 10);
          if (!isNaN(nameAsNum)) {
            frameIndex = nameAsNum;
          }
        }
        // Способ 3: Если frame - это объект с frame свойством
        else if ((frame.frame as any).frame !== undefined) {
          const nestedFrame = (frame.frame as any).frame;
          if (typeof nestedFrame === 'number') {
            frameIndex = nestedFrame;
          } else if ((nestedFrame as any)?.index !== undefined) {
            frameIndex = (nestedFrame as any).index;
          }
        }
        // Способ 4: Используем индекс из текущего кадра анимации
        if (frameIndex === undefined && frame.index !== undefined) {
          const anim = animation;
          if (anim && anim.frames && anim.frames[frame.index]) {
            const animFrame = anim.frames[frame.index];
            if (animFrame && animFrame.frame) {
              const frameObj = animFrame.frame;
              if ((frameObj as any).index !== undefined) {
                frameIndex = (frameObj as any).index;
              } else if (frameObj.name !== undefined) {
                const nameAsNum = parseInt(String(frameObj.name), 10);
                if (!isNaN(nameAsNum)) {
                  frameIndex = nameAsNum;
                }
              }
            }
          }
        }
        
        // Устанавливаем кадр напрямую
        if (frameIndex !== undefined) {
          this.sprite.setFrame(frameIndex);
        } else {
          // Fallback: используем имя кадра как строку
          if (frame.frame.name) {
            this.sprite.setFrame(frame.frame.name);
          }
        }
      }
    });
    }
  }

  /**
   * Воспроизвести анимацию направления (КОРРЕКТНАЯ ВЕРСИЯ)
   */
  public playDirectionAnimation(
    velocityX: number,
    velocityY: number
  ): void {
    if (!this.sprite?.active || !this.sprite.body) {
      return;
    }

    const absX = Math.abs(velocityX);
    const absY = Math.abs(velocityY);
    const isMoving = absX > this.minMovementThreshold || absY > this.minMovementThreshold;

    if (!isMoving) {
      if (this.currentAnimation !== null) {
        this.sprite.anims.stop();
        this.currentAnimation = null;
      }
      return;
    }

    let animationKey: string | null = null;

    // Определяем направление
    if (absX > absY * 1.3) {
      animationKey = velocityX > 0 ? `${this.animationPrefix}_right` : `${this.animationPrefix}_left`;
    } else if (absY > absX * 1.3) {
      animationKey = velocityY > 0 ? `${this.animationPrefix}_down` : `${this.animationPrefix}_up`;
    } else {
      // ✅ Если направления примерно равны (диагональ), выбираем по приоритету: вниз > вправо > влево > вверх
      if (absY > 0) {
        animationKey = velocityY > 0 ? `${this.animationPrefix}_down` : `${this.animationPrefix}_up`;
      } else if (absX > 0) {
        animationKey = velocityX > 0 ? `${this.animationPrefix}_right` : `${this.animationPrefix}_left`;
      } else {
        // Fallback на "вниз" если скорость очень мала
        animationKey = `${this.animationPrefix}_down`;
      }
    }

    if (animationKey && this.scene.anims.exists(animationKey)) {
      // ✅ Если анимация изменилась, сбрасываем таймер кадров
      if (this.currentAnimation !== animationKey) {
        this.currentAnimation = animationKey;
        this.currentFrameIndex = 0;
        this.frameTimer = 0;
        
        // Получаем frameRate анимации для расчета интервала
        const anim = this.scene.anims.get(animationKey);
        if (anim && anim.frameRate > 0) {
          this.frameInterval = 1000 / anim.frameRate; // Интервал в миллисекундах
        } else {
          this.frameInterval = 125; // По умолчанию 8 FPS
        }
      }
      
      // ✅ ВСЕГДА вызываем play() - Phaser сам разберётся
      // НО: сохраняем тинт перед play(), если идет мигание
      const wasTinted = this.isBlinkingCallback && this.isBlinkingCallback();
      const savedTint = wasTinted ? this.sprite.tint : null;
      
      this.sprite.anims.play(animationKey, true);
      
      // ✅ Восстанавливаем тинт после play(), если он был установлен
      if (wasTinted && savedTint !== null) {
        this.sprite.setTint(savedTint);
      }
    }
  }

  /**
   * Синхронизировать кадр спрайта с текущим кадром анимации
   * ВАЖНО: Для physics спрайтов нужно вызывать это в каждом update()
   * 
   * КРИТИЧНО: Для physics спрайтов Phaser не обновляет кадры автоматически,
   * поэтому мы вручную переключаем кадры по таймеру.
   */
  public syncFrame(): void {
    // Получаем delta из игрового цикла (с проверкой для тестового окружения)
    if (!this.scene.game?.loop?.delta) {
      return; // В тестовом окружении game.loop может быть недоступен
    }
    const delta = this.scene.game.loop.delta;
    if (!this.sprite?.active || !this.sprite.anims?.isPlaying || !this.currentAnimation) {
      return;
    }

    const anim = this.scene.anims.get(this.currentAnimation);
    if (!anim || !anim.frames || anim.frames.length === 0) {
      return;
    }

    // ✅ Обновляем таймер кадров
    this.frameTimer += delta;
    
    // ✅ Если прошло достаточно времени, переключаем на следующий кадр
    if (this.frameTimer >= this.frameInterval) {
      this.frameTimer = 0;
      
      // Переключаем на следующий кадр
      this.currentFrameIndex = (this.currentFrameIndex + 1) % anim.frames.length;
      
      // Получаем кадр из массива кадров анимации
      const animFrame = anim.frames[this.currentFrameIndex];
      if (!animFrame || !animFrame.frame) {
        return;
      }

      const animFrameObj = animFrame.frame;
      
      // ✅ Получаем индекс кадра из спрайтшита
      let frameIndex: number | undefined;
      
      // Способ 1: Прямой индекс
      if ((animFrameObj as any).index !== undefined) {
        frameIndex = (animFrameObj as any).index;
      }
      // Способ 2: Через name (может быть строкой с числом)
      else if (animFrameObj.name !== undefined) {
        const nameAsNum = parseInt(String(animFrameObj.name), 10);
        if (!isNaN(nameAsNum)) {
          frameIndex = nameAsNum;
        }
      }
      // Способ 3: Если frame - это число
      else if (typeof animFrameObj === 'number') {
        frameIndex = animFrameObj;
      }

      // ✅ Устанавливаем кадр
      if (frameIndex !== undefined) {
        // ✅ Сохраняем тинт перед setFrame(), если идет мигание
        const wasTinted = this.isBlinkingCallback && this.isBlinkingCallback();
        const savedTint = wasTinted ? this.sprite.tint : null;
        
        this.sprite.setFrame(frameIndex);
        
        // ✅ Восстанавливаем тинт после setFrame(), если он был установлен
        if (wasTinted && savedTint !== null) {
          this.sprite.setTint(savedTint);
        }
        
        // Логируем только изредка для диагностики
        if (DEBUG_ANIMATION && Math.random() < 0.02) {
          logger.log('ANIMATION_SPRITE', `🔄 ${this.animationPrefix}: Manual frame ${this.currentFrameIndex}/${anim.frames.length} -> frameIndex ${frameIndex} (anim: ${this.currentAnimation})`);
        }
      }
    }
  }


  /**
   * Остановить анимацию
   */
  public stop(): void {
    if (!this.sprite?.active || !this.sprite.anims) return;
    this.sprite.anims.stop();
    this.currentAnimation = null;
  }

  /**
   * Проверить, играет ли анимация
   */
  public isPlaying(): boolean {
    return this.sprite?.anims?.isPlaying || false;
  }

  /**
   * Получить текущую анимацию
   */
  public getCurrentAnimation(): string | null {
    return this.currentAnimation;
  }

  /**
   * Установить callback для проверки состояния мигания
   */
  public setIsBlinkingCallback(callback: () => boolean): void {
    this.isBlinkingCallback = callback;
  }
}

