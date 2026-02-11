/**
 * Класс игрока с машиной состояний
 * Управляет состояниями, анимациями и взаимодействиями игрока
 */

import Phaser from 'phaser';
import { PLAYER_SPEED, ACTOR_SIZES, BASE_SCALE, KEYS, DEPTHS } from '../../constants/gameConstants';
import { SpriteAnimationHandler } from '../systems/SpriteAnimationHandler';
import { logger } from '../../utils/Logger';

/**
 * Состояния игрока
 */
export enum PlayerState {
  IDLE = 'idle',                    // Стоит
  MOVING = 'moving',                // Движется
  LOSING_KEY = 'losing_key',        // Теряет ключ
  GETTING_KEY = 'getting_key',      // Получает ключ
  APPLYING_KEY = 'applying_key',    // Применяет ключ
  DAMAGED = 'damaged',              // Получил урон (анимация повреждения)
  IN_QUIZ = 'in_quiz',              // В режиме вопроса
  IN_PORTAL = 'in_portal',          // В портале
  DEAD = 'dead'                     // Мертв (Game Over)
}

/**
 * Класс игрока
 */
export class Player {
  private sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: any;
  private speed: number = PLAYER_SPEED;
  private readonly scale: number = BASE_SCALE * ACTOR_SIZES.PLAYER;
  private scene: Phaser.Scene;

  // Машина состояний
  private currentState: PlayerState = PlayerState.IDLE;
  private previousVelocity: { x: number; y: number } = { x: 0, y: 0 };

  // Drag and Move переменные
  private isDragging: boolean = false;
  private dragStartPosition: Phaser.Math.Vector2 | null = null;
  private dragCurrentPosition: Phaser.Math.Vector2 | null = null;
  private moveIndicator: Phaser.GameObjects.Sprite | null = null; // ✅ Изменено на Sprite
  private isMobile: boolean = false;
  private animationHandler: SpriteAnimationHandler;

  // Кольца ключей (визуализация количества собранных ключей)
  private keyRingsGraphics?: Phaser.GameObjects.Graphics;

  // Анимации событий (отдельные спрайты поверх основного)
  private loseKeyAnimationSprite?: Phaser.GameObjects.Sprite;
  private getKeyAnimationSprite?: Phaser.GameObjects.Sprite;
  private applyKeyAnimationSprite?: Phaser.GameObjects.Sprite;
  private loseKeyAnimationPlaying: boolean = false;
  private getKeyAnimationPlaying: boolean = false;
  private applyKeyAnimationPlaying: boolean = false;

  // ✅ Новая система золотых сердечек для отображения ключей
  private goldHeartSprites: Phaser.GameObjects.Sprite[] = [];
  private goldHeartGlowSprites: Phaser.GameObjects.Sprite[] = []; // ✅ Спрайты для эффекта свечения
  private goldHeartBlinkTweens: Phaser.Tweens.Tween[] = [];
  private previousKeyCount: number = -1; // Для отслеживания изменений

  // ✅ Система мон acreток для фазы coin (аналог goldHeartSprites)
  private coinSprites: Phaser.GameObjects.Sprite[] = [];
  private coinGlowSprites: Phaser.GameObjects.Sprite[] = [];
  private coinBlinkTweens: Phaser.Tweens.Tween[] = [];
  private previousCoinCount: number = -1;

  // Состояние повреждения
  private originalTextureKey: string; // Сохраняем оригинальную текстуру для возврата
  private knockbackVelocity: { x: number; y: number } | null = null;
  private knockbackDuration: number = 0;
  private readonly KNOCKBACK_FORCE: number = 200; // Сила отбрасывания
  private readonly KNOCKBACK_DURATION: number = 300; // Длительность отбрасывания в мс
  private flashDamageTween?: Phaser.Tweens.Tween; // ✅ Отслеживание активного tween мигания

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string
  ) {
    this.scene = scene;
    this.originalTextureKey = textureKey;

    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(DEPTHS.WORLD.PLAYER);
    this.sprite.setScale(this.scale);

    // Создаем обработчик анимаций
    this.animationHandler = new SpriteAnimationHandler(scene, this.sprite, 'boy');

    // Определяем мобильное устройство
    this.isMobile = scene.game.device.os.android || scene.game.device.os.iOS;

    // Настройка управления
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
      });
    }

    // Настройка Tap-to-Move для мобильных устройств
    if (this.isMobile && scene.input) {
      this.setupTouchControls(scene);
    }

    // Инициализируем графику для колец ключей
    this.keyRingsGraphics = scene.add.graphics();
    this.keyRingsGraphics.setDepth(this.sprite.depth); // ✅ Кольца на том же уровне, что и персонаж
    this.keyRingsGraphics.setScrollFactor(1, 1); // ✅ Кольца двигаются вместе с камерой
    this.keyRingsGraphics.setVisible(false); // ✅ СКРЫВАЕМ старые кольца

    // Инициализируем состояние
    this.setState(PlayerState.IDLE);
  }

  /**
   * Получить текущее состояние
   */
  public getState(): PlayerState {
    return this.currentState;
  }

  /**
   * Проверить, можно ли перейти в новое состояние
   */
  private canTransitionTo(newState: PlayerState): boolean {
    // DEAD - финальное состояние, нельзя выйти из него
    if (this.currentState === PlayerState.DEAD) {
      return false;
    }

    // IN_QUIZ и IN_PORTAL блокируют большинство переходов
    if (this.currentState === PlayerState.IN_QUIZ || this.currentState === PlayerState.IN_PORTAL) {
      // Разрешаем только выход из этих состояний
      return newState === PlayerState.IDLE || newState === PlayerState.MOVING ||
        newState === PlayerState.GETTING_KEY || newState === PlayerState.DEAD;
    }

    // DAMAGED блокирует переходы, кроме DEAD
    if (this.currentState === PlayerState.DAMAGED) {
      return newState === PlayerState.DEAD || newState === PlayerState.IDLE ||
        newState === PlayerState.MOVING;
    }

    // Анимации событий блокируют переходы, кроме возврата к нормальным состояниям
    if (this.currentState === PlayerState.LOSING_KEY ||
      this.currentState === PlayerState.GETTING_KEY ||
      this.currentState === PlayerState.APPLYING_KEY) {
      return newState === PlayerState.IDLE || newState === PlayerState.MOVING ||
        newState === PlayerState.DEAD;
    }

    return true;
  }

  /**
   * Установить состояние игрока (публичный метод для внешнего управления)
   */
  public setState(newState: PlayerState): void {
    if (!this.canTransitionTo(newState)) {
      logger.log('PLAYER_STATE', `Cannot transition from ${this.currentState} to ${newState}`);
      return;
    }

    if (this.currentState === newState) {
      return; // Уже в этом состоянии
    }

    logger.log('PLAYER_STATE', `State transition: ${this.currentState} -> ${newState}`);
    const oldState = this.currentState;
    this.currentState = newState;

    // ✅ КРИТИЧНО: Сбрасываем визуальные эффекты при выходе из DAMAGED
    // или переходе в IDLE/MOVING
    if (oldState === PlayerState.DAMAGED ||
      newState === PlayerState.IDLE ||
      newState === PlayerState.MOVING) {
      this.resetVisualEffects();
    }

    this.updateVisualState(oldState);
  }

  /**
   * Обновить визуальное состояние
   */
  private updateVisualState(oldState: PlayerState): void {
    switch (this.currentState) {
      case PlayerState.IDLE:
        this.setIdleState();
        break;
      case PlayerState.MOVING:
        this.setMovingState();
        break;
      case PlayerState.LOSING_KEY:
        this.setLosingKeyState();
        break;
      case PlayerState.GETTING_KEY:
        this.setGettingKeyState();
        break;
      case PlayerState.APPLYING_KEY:
        this.setApplyingKeyState();
        break;
      case PlayerState.DAMAGED:
        this.setDamagedState();
        break;
      case PlayerState.IN_QUIZ:
        this.setInQuizState();
        break;
      case PlayerState.IN_PORTAL:
        this.setInPortalState();
        break;
      case PlayerState.DEAD:
        this.setDeadState();
        break;
    }
  }

  /**
   * Установить состояние IDLE
   */
  private setIdleState(): void {
    if (this.sprite.anims) {
      this.sprite.anims.stop();
    }
    // Возвращаем оригинальную текстуру, если была заменена
    if (this.sprite.texture.key !== this.originalTextureKey &&
      this.sprite.texture.key !== 'character_gameover') {
      if (this.scene.textures.exists(this.originalTextureKey)) {
        this.sprite.setTexture(this.originalTextureKey);
        this.sprite.setFrame(0);
      }
    }
    // ✅ КРИТИЧНО: НЕ сбрасываем velocity здесь, если активно отбрасывание
    // Отбрасывание должно продолжаться независимо от состояния
    // Velocity будет установлена в update() в зависимости от наличия отбрасывания
    if (!this.knockbackVelocity || this.knockbackDuration <= 0) {
      this.sprite.setVelocity(0);
    }
    // ✅ НЕ сбрасываем knockbackVelocity здесь - отбрасывание должно продолжаться
  }

  /**
   * Установить состояние MOVING
   */
  private setMovingState(): void {
    // Анимация движения управляется через SpriteAnimationHandler
    // В update() будет вызван playDirectionAnimation()
  }

  /**
   * Установить состояние LOSING_KEY
   */
  private setLosingKeyState(): void {
    // ✅ Останавливаем движение при потере ключа
    this.sprite.setVelocity(0);
    this.playLoseKeyAnimation();
  }

  /**
   * Установить состояние GETTING_KEY
   */
  private setGettingKeyState(): void {
    this.playGetKeyAnimation();
  }

  /**
   * Установить состояние APPLYING_KEY
   */
  private setApplyingKeyState(): void {
    this.playApplyKeyAnimation();
  }

  /**
   * Установить состояние DAMAGED
   */
  private setDamagedState(): void {
    // Останавливаем все анимации
    if (this.sprite.anims) {
      this.sprite.anims.stop();
    }

    // Сохраняем текущую текстуру, если это еще не оригинальная
    if (this.sprite.texture.key === this.originalTextureKey) {
      // Текстура уже оригинальная, продолжаем
    }

    // Переключаемся на спрайтшит повреждения
    const sheetKey = 'character_damaged';
    const animKey = 'character_damaged';

    if (!this.scene.textures.exists(sheetKey)) {
      logger.log('PLAYER_STATE', `Damaged spritesheet not found: ${sheetKey}`);
      return;
    }

    if (!this.scene.anims.exists(animKey)) {
      logger.log('PLAYER_STATE', `Damaged animation not found: ${animKey}`);
      return;
    }

    // Устанавливаем текстуру и запускаем анимацию
    this.sprite.setTexture(sheetKey);
    this.sprite.setFrame(0);

    // ✅ КРИТИЧНО: Сбрасываем флаг инициализации анимации для ручной синхронизации
    // Это гарантирует, что анимация начнется с первого кадра
    (this.sprite as any)._damageAnimationInitialized = false;
    (this.sprite as any)._damageAnimationTimer = 0;
    (this.sprite as any)._damageAnimationFrameIndex = 0;

    // ✅ Добавляем мигание красным цветом (как было раньше)
    this.flashDamage();

    // Удаляем старые обработчики
    this.sprite.off('animationcomplete');

    // Запускаем анимацию повреждения один раз
    // Обработка завершения будет в MainScene для проверки здоровья
    this.sprite.play(animKey, false);

    logger.log('PLAYER_STATE', 'Playing damage animation', {
      texture: sheetKey,
      animation: animKey,
      spriteActive: this.sprite.active,
      spriteVisible: this.sprite.visible
    });
  }

  /**
   * Мигание красным цветом при получении повреждения
   * ✅ ИСПРАВЛЕНО: Добавлена очистка предыдущего tween для предотвращения race condition
   */
  private flashDamage(): void {
    logger.log('PLAYER_FLASH', '🔴 flashDamage() called', {
      hasPreviousTween: !!this.flashDamageTween,
      currentAlpha: this.sprite.alpha,
      currentBlendMode: this.sprite.blendMode,
      currentTint: this.sprite.tint
    });

    // ✅ Останавливаем предыдущий tween, если он активен
    if (this.flashDamageTween) {
      logger.log('PLAYER_FLASH', '⚠️ Stopping previous tween');
      this.flashDamageTween.stop();
      this.flashDamageTween = undefined;
    }

    // ✅ Сохраняем оригинальное состояние ДО изменения
    // ❗ КРИТИЧНО: Если blend mode уже ADD (1), значит предыдущий tween еще работает
    // В этом случае нужно сохранить NORMAL (0), а не текущий ADD!
    const originalBlendMode = this.sprite.blendMode === Phaser.BlendModes.ADD
      ? Phaser.BlendModes.NORMAL
      : this.sprite.blendMode;
    const originalAlpha = 1; // Всегда восстанавливаем до 1

    logger.log('PLAYER_FLASH', 'Original state saved', {
      originalBlendMode,
      originalAlpha
    });

    // ✅ Сначала восстанавливаем состояние (на случай, если предыдущий tween был остановлен)
    this.sprite.setBlendMode(originalBlendMode);
    this.sprite.clearTint();
    this.sprite.setAlpha(originalAlpha);

    // Применяем эффект мигания
    this.sprite.setBlendMode(Phaser.BlendModes.ADD);
    this.sprite.setTint(0xff0000); // Красный цвет

    logger.log('PLAYER_FLASH', 'Flash effect applied', {
      blendMode: this.sprite.blendMode,
      tint: this.sprite.tint
    });

    // Создаем новый tween и сохраняем ссылку
    this.flashDamageTween = this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.2,
      duration: 100,
      yoyo: true,
      repeat: 4, // 4 повторения = 5 миганий
      onComplete: () => {
        logger.log('PLAYER_FLASH', '✅ Tween onComplete - restoring state', {
          originalBlendMode,
          originalAlpha: 1
        });
        // Восстанавливаем оригинальное состояние
        this.sprite.setBlendMode(originalBlendMode);
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
        this.flashDamageTween = undefined;
        logger.log('PLAYER_FLASH', '✅ State restored', {
          currentAlpha: this.sprite.alpha,
          currentBlendMode: this.sprite.blendMode,
          currentTint: this.sprite.tint
        });
      }
    });

    logger.log('PLAYER_FLASH', 'Tween created', {
      tweenExists: !!this.flashDamageTween
    });
  }

  /**
   * Установить состояние IN_QUIZ
   */
  private setInQuizState(): void {
    this.sprite.setVelocity(0);
    if (this.sprite.anims) {
      this.sprite.anims.stop();
    }
  }

  /**
   * Установить состояние IN_PORTAL
   */
  private setInPortalState(): void {
    this.sprite.setVelocity(0);
    if (this.sprite.anims) {
      this.sprite.anims.stop();
    }
  }

  /**
   * Сбросить все визуальные эффекты (alpha, blendMode, tint)
   * ✅ КРИТИЧНО: Вызывается при переходе в нормальные состояния
   */
  private resetVisualEffects(): void {
    if (!this.sprite) return;

    // Останавливаем активный tween мигания
    if (this.flashDamageTween) {
      this.flashDamageTween.stop();
      this.flashDamageTween = undefined;
    }

    // Сбрасываем визуальные эффекты
    this.sprite.setAlpha(1);
    this.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
    this.sprite.clearTint();

    logger.log('PLAYER_VISUAL', '✅ Visual effects reset', {
      alpha: this.sprite.alpha,
      blendMode: this.sprite.blendMode,
      tint: this.sprite.tint
    });
  }

  /**
   * Установить состояние DEAD
   */
  private setDeadState(): void {
    // Останавливаем все анимации
    if (this.sprite.anims) {
      this.sprite.anims.stop();
    }

    // Останавливаем движение
    this.sprite.setVelocity(0);
    this.knockbackVelocity = null;

    // Переключаемся на спрайт смерти
    const gameOverKey = 'character_gameover';

    if (!this.scene.textures.exists(gameOverKey)) {
      logger.log('PLAYER_STATE', `GameOver texture not found: ${gameOverKey}`);
      return;
    }

    // Устанавливаем текстуру смерти
    this.sprite.setTexture(gameOverKey);
    this.sprite.setFrame(0);

    logger.log('PLAYER_STATE', 'Player is now DEAD');
  }

  /**
   * Применить отбрасывание при столкновении
   * @param directionX - Направление от врага к игроку по X
   * @param directionY - Направление от врага к игроку по Y
   */
  public applyKnockback(directionX: number, directionY: number): void {
    // ✅ КРИТИЧНО: Сохраняем начальную позицию для отслеживания расстояния отбрасывания
    const startX = this.sprite.x;
    const startY = this.sprite.y;

    // ✅ КРИТИЧНО: Сбрасываем текущую velocity спрайта ПЕРЕД применением нового отбрасывания
    // Это гарантирует, что новое отбрасывание всегда применяется с полной силой,
    // независимо от текущей velocity (которая может быть от предыдущего отбрасывания или движения)
    this.sprite.setVelocity(0, 0);

    // ✅ Сбрасываем предыдущее отбрасывание, если оно активно
    const hadPreviousKnockback = this.knockbackVelocity !== null;
    this.knockbackVelocity = null;
    this.knockbackDuration = 0;

    // ✅ Используем направление от врага к игроку (уже правильное направление для отбрасывания)
    // Нормализуем вектор направления
    const length = Math.sqrt(directionX * directionX + directionY * directionY);

    // Минимальная длина для избежания проблем с очень маленькими значениями
    const MIN_LENGTH = 0.1;

    if (length > MIN_LENGTH) {
      // Нормализуем и умножаем на силу отбрасывания
      const normalizedX = directionX / length;
      const normalizedY = directionY / length;

      // ✅ Всегда применяем одинаковую силу отбрасывания (независимо от предыдущего состояния)
      this.knockbackVelocity = {
        x: normalizedX * this.KNOCKBACK_FORCE,
        y: normalizedY * this.KNOCKBACK_FORCE
      };
      this.knockbackDuration = this.KNOCKBACK_DURATION;

      // ✅ Вычисляем ожидаемое расстояние отбрасывания (для отладки)
      // Расстояние = скорость * время = (сила/1000) * (длительность/1000) в пикселях
      // Но это приблизительно, так как Phaser работает в пикселях за кадр
      const expectedDistance = (this.KNOCKBACK_FORCE / 1000) * (this.KNOCKBACK_DURATION / 1000) * 60; // Примерно

      // ✅ Применяем velocity сразу, чтобы отбрасывание началось немедленно
      this.sprite.setVelocity(this.knockbackVelocity.x, this.knockbackVelocity.y);

      // ✅ Сохраняем начальную позицию для отслеживания
      (this.sprite as any)._knockbackStartX = startX;
      (this.sprite as any)._knockbackStartY = startY;

      logger.log('PLAYER_STATE', 'Knockback applied', {
        hadPreviousKnockback: hadPreviousKnockback,
        startPosition: { x: startX, y: startY },
        direction: { x: directionX, y: directionY },
        length: length,
        normalized: { x: normalizedX, y: normalizedY },
        knockback: this.knockbackVelocity,
        knockbackMagnitude: Math.sqrt(this.knockbackVelocity.x * this.knockbackVelocity.x + this.knockbackVelocity.y * this.knockbackVelocity.y),
        force: this.KNOCKBACK_FORCE,
        duration: this.knockbackDuration,
        expectedDistance: expectedDistance,
        currentVelocity: { x: this.sprite.body.velocity.x, y: this.sprite.body.velocity.y },
        velocityMagnitude: Math.sqrt(this.sprite.body.velocity.x * this.sprite.body.velocity.x + this.sprite.body.velocity.y * this.sprite.body.velocity.y)
      });
    } else {
      // Если направление слишком маленькое или нулевое, отбрасываем в случайном направлении
      const angle = Phaser.Math.Between(0, 360) * Math.PI / 180;
      this.knockbackVelocity = {
        x: Math.cos(angle) * this.KNOCKBACK_FORCE,
        y: Math.sin(angle) * this.KNOCKBACK_FORCE
      };
      this.knockbackDuration = this.KNOCKBACK_DURATION;

      // ✅ Применяем velocity сразу
      this.sprite.setVelocity(this.knockbackVelocity.x, this.knockbackVelocity.y);

      logger.log('PLAYER_STATE', 'Knockback applied (random direction, zero/small vector)', {
        direction: { x: directionX, y: directionY },
        length: length,
        knockback: this.knockbackVelocity,
        force: this.KNOCKBACK_FORCE
      });
    }
  }

  /**
   * Перейти в состояние повреждения
   * @param directionX - Направление от врага к игроку по X
   * @param directionY - Направление от врага к игроку по Y
   */
  public takeDamage(directionX: number, directionY: number): void {
    logger.log('PLAYER_DAMAGE', '🔴 takeDamage() called', {
      direction: { x: directionX, y: directionY },
      currentState: this.currentState,
      currentAlpha: this.sprite.alpha,
      currentBlendMode: this.sprite.blendMode
    });

    // Сохраняем направление для возможного использования в будущем
    this.previousVelocity = { x: directionX, y: directionY };
    // Применяем отбрасывание в направлении от врага к игроку
    this.applyKnockback(directionX, directionY);
    this.setState(PlayerState.DAMAGED);
  }

  /**
   * Завершить состояние повреждения (вызывается извне после проверки здоровья)
   */
  public finishDamage(isAlive: boolean): void {
    if (isAlive) {
      // Возвращаемся к нормальному состоянию
      this.setState(PlayerState.IDLE);
    } else {
      // Переходим в состояние смерти
      this.setState(PlayerState.DEAD);
    }
  }

  /**
   * Перейти в состояние потери ключа
   */
  public loseKey(): void {
    this.setState(PlayerState.LOSING_KEY);
  }

  /**
   * Перейти в состояние получения ключа
   */
  public getKey(): void {
    this.setState(PlayerState.GETTING_KEY);
  }

  /**
   * Перейти в состояние применения ключа
   */
  public applyKey(): void {
    this.setState(PlayerState.APPLYING_KEY);
  }

  /**
   * Перейти в состояние вопроса
   */
  public enterQuiz(): void {
    this.setState(PlayerState.IN_QUIZ);
  }

  /**
   * Выйти из состояния вопроса
   */
  public exitQuiz(): void {
    if (this.currentState === PlayerState.IN_QUIZ) {
      // Переходим в IDLE, внешний код может перевести в GETTING_KEY если нужно
      this.setState(PlayerState.IDLE);
    }
  }

  /**
   * Перейти в состояние портала
   */
  public enterPortal(): void {
    this.setState(PlayerState.IN_PORTAL);
  }

  /**
   * Выйти из состояния портала
   */
  public exitPortal(): void {
    this.setState(PlayerState.IDLE);
  }

  /**
   * Настройка Drag and Move контролов
   */
  private setupTouchControls(scene: Phaser.Scene): void {
    // ✅ Создаем спрайт указателя направления вместо graphics
    const pointerScale = BASE_SCALE * ACTOR_SIZES.POINTER;
    this.moveIndicator = scene.add.sprite(0, 0, KEYS.POINTER)
      .setActive(false)
      .setVisible(false)
      .setScale(pointerScale)
      .setDepth(DEPTHS.WORLD.PLAYER - 1); // Ниже игрока, но выше фона

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.isDragging = true;
        this.dragStartPosition = new Phaser.Math.Vector2(pointer.x, pointer.y);
        this.dragCurrentPosition = new Phaser.Math.Vector2(pointer.x, pointer.y);
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.isDown) {
        this.dragCurrentPosition = new Phaser.Math.Vector2(pointer.x, pointer.y);
        this.updateMoveIndicator();
      }
    });

    scene.input.on('pointerup', () => {
      this.isDragging = false;
      this.dragStartPosition = null;
      this.dragCurrentPosition = null;
      if (this.moveIndicator) {
        this.moveIndicator.setVisible(false);
      }
    });
  }

  /**
   * Обновить индикатор движения при перетаскивании
   * ✅ Использует спрайт Character.Pointer_3x3.png вместо отрисовки graphics
   * ❌ НЕ вращает спрайт - он всегда направлен вверх
   */
  private updateMoveIndicator(): void {
    if (!this.moveIndicator || !this.dragStartPosition || !this.dragCurrentPosition) return;

    // ✅ Показываем спрайт при обновлении
    this.moveIndicator.setVisible(true);

    const playerPos = this.getPosition();
    const dragVector = new Phaser.Math.Vector2(
      this.dragCurrentPosition.x - this.dragStartPosition.x,
      this.dragCurrentPosition.y - this.dragStartPosition.y
    );

    // Вычисляем длину и направление
    const indicatorLength = Math.min(dragVector.length(), 100);
    const normalizedDrag = dragVector.normalize();

    // Вычисляем позицию конца указателя
    const indicatorEnd = new Phaser.Math.Vector2(
      playerPos.x + normalizedDrag.x * indicatorLength,
      playerPos.y + normalizedDrag.y * indicatorLength
    );

    // ✅ Обновляем позицию спрайта (без вращения!)
    this.moveIndicator.setPosition(indicatorEnd.x, indicatorEnd.y);
  }

  /**
   * Обновление движения
   */
  public update(): void {
    if (!this.sprite || !this.sprite.active) return;

    // ✅ Синхронизация overlay спрайтов (ДО проверок состояния!)
    // Эти спрайты (loseKey, getKey, applyKey) НЕ являются physics спрайтами
    // и требуют ручной синхронизации кадров
    const delta = this.scene.game.loop.delta;
    this.updateAnimationSync(delta);

    // Обработка отбрасывания
    if (this.knockbackVelocity && this.knockbackDuration > 0) {
      const delta = this.scene.game.loop.delta;
      this.knockbackDuration -= delta;

      if (this.knockbackDuration > 0) {
        // ✅ Проверяем, не блокируется ли отбрасывание коллизией с границами
        const wasBlockedX = this.sprite.body.blocked.left || this.sprite.body.blocked.right;
        const wasBlockedY = this.sprite.body.blocked.up || this.sprite.body.blocked.down;

        // Применяем отбрасывание
        this.sprite.setVelocity(
          this.knockbackVelocity.x,
          this.knockbackVelocity.y
        );

        // ✅ Проверяем фактическую velocity после применения (для диагностики)
        const actualVelX = this.sprite.body.velocity.x;
        const actualVelY = this.sprite.body.velocity.y;
        const actualMagnitude = Math.sqrt(actualVelX * actualVelX + actualVelY * actualVelY);
        const expectedMagnitude = Math.sqrt(this.knockbackVelocity.x * this.knockbackVelocity.x + this.knockbackVelocity.y * this.knockbackVelocity.y);

        // ✅ Логируем, если velocity отличается от ожидаемой (для отладки)
        const velocityDiff = Math.abs(actualMagnitude - expectedMagnitude);
        if (velocityDiff > 5 || wasBlockedX || wasBlockedY) { // Разница больше 5 пикселей/сек или блокировка
          logger.log('PLAYER_STATE', 'Knockback velocity mismatch detected', {
            blockedX: wasBlockedX,
            blockedY: wasBlockedY,
            expectedVelocity: this.knockbackVelocity,
            expectedMagnitude: expectedMagnitude,
            actualVelocity: { x: actualVelX, y: actualVelY },
            actualMagnitude: actualMagnitude,
            velocityDiff: velocityDiff,
            position: { x: this.sprite.x, y: this.sprite.y },
            remainingDuration: this.knockbackDuration
          });
        }
      } else {
        // Отбрасывание завершено
        // ✅ Логируем фактическое расстояние отбрасывания для отладки
        const startX = (this.sprite as any)._knockbackStartX;
        const startY = (this.sprite as any)._knockbackStartY;
        if (startX !== undefined && startY !== undefined) {
          const actualDistance = Math.sqrt(
            Math.pow(this.sprite.x - startX, 2) +
            Math.pow(this.sprite.y - startY, 2)
          );
          logger.log('PLAYER_STATE', 'Knockback completed', {
            startPosition: { x: startX, y: startY },
            endPosition: { x: this.sprite.x, y: this.sprite.y },
            actualDistance: actualDistance,
            expectedVelocity: this.knockbackVelocity,
            finalVelocity: { x: this.sprite.body.velocity.x, y: this.sprite.body.velocity.y }
          });
          delete (this.sprite as any)._knockbackStartX;
          delete (this.sprite as any)._knockbackStartY;
        }

        this.knockbackVelocity = null;
        this.knockbackDuration = 0;
        this.sprite.setVelocity(0);
      }

      // Не обрабатываем обычное управление во время отбрасывания
      return;
    }

    // ✅ КРИТИЧНО: Проверяем, не активно ли отбрасывание ПЕРЕД блокировкой управления
    // Это гарантирует, что отбрасывание продолжается даже после завершения анимации повреждения
    if (this.knockbackVelocity && this.knockbackDuration > 0) {
      // Отбрасывание все еще активно - продолжаем его применять
      // (это может произойти, если анимация повреждения завершилась раньше отбрасывания)
      const delta = this.scene.game.loop.delta;
      this.knockbackDuration -= delta;

      if (this.knockbackDuration > 0) {
        // Продолжаем применять отбрасывание
        this.sprite.setVelocity(
          this.knockbackVelocity.x,
          this.knockbackVelocity.y
        );
        return; // Не обрабатываем обычное управление во время отбрасывания
      } else {
        // Отбрасывание завершено
        const startX = (this.sprite as any)._knockbackStartX;
        const startY = (this.sprite as any)._knockbackStartY;
        if (startX !== undefined && startY !== undefined) {
          const actualDistance = Math.sqrt(
            Math.pow(this.sprite.x - startX, 2) +
            Math.pow(this.sprite.y - startY, 2)
          );
          logger.log('PLAYER_STATE', 'Knockback completed (after damage animation)', {
            startPosition: { x: startX, y: startY },
            endPosition: { x: this.sprite.x, y: this.sprite.y },
            actualDistance: actualDistance,
            expectedVelocity: this.knockbackVelocity,
            finalVelocity: { x: this.sprite.body.velocity.x, y: this.sprite.body.velocity.y }
          });
          delete (this.sprite as any)._knockbackStartX;
          delete (this.sprite as any)._knockbackStartY;
        }

        this.knockbackVelocity = null;
        this.knockbackDuration = 0;
        this.sprite.setVelocity(0);
      }
    }

    // Блокируем управление в определенных состояниях
    if (this.currentState === PlayerState.DEAD ||
      this.currentState === PlayerState.IN_QUIZ ||
      this.currentState === PlayerState.IN_PORTAL ||
      this.currentState === PlayerState.DAMAGED ||
      this.currentState === PlayerState.LOSING_KEY ||
      this.currentState === PlayerState.GETTING_KEY ||
      this.currentState === PlayerState.APPLYING_KEY) {
      // В этих состояниях управление заблокировано
      return;
    }

    this.sprite.setVelocity(0);

    // Клавиатурное управление (приоритет)
    if (this.cursors && this.wasd) {
      if (this.cursors.left.isDown || this.wasd.left.isDown) {
        this.sprite.setVelocityX(-this.speed);
        this.isDragging = false;
      } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
        this.sprite.setVelocityX(this.speed);
        this.isDragging = false;
      }

      if (this.cursors.up.isDown || this.wasd.up.isDown) {
        this.sprite.setVelocityY(-this.speed);
        this.isDragging = false;
      } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
        this.sprite.setVelocityY(this.speed);
        this.isDragging = false;
      }
    }

    // Drag and Move управление
    if (this.isDragging && this.dragStartPosition && this.dragCurrentPosition && this.isMobile) {
      this.handleDragMovement();
    }

    // Обновляем состояние на основе движения (только если не в блокирующих состояниях)
    const velocityX = this.sprite.body.velocity.x;
    const velocityY = this.sprite.body.velocity.y;
    const isMoving = Math.abs(velocityX) > 5 || Math.abs(velocityY) > 5;

    // Проверяем, что состояние позволяет обновлять движение и анимацию
    if (this.currentState === PlayerState.IDLE || this.currentState === PlayerState.MOVING) {

      if (isMoving && this.currentState === PlayerState.IDLE) {
        this.setState(PlayerState.MOVING);
      } else if (!isMoving && this.currentState === PlayerState.MOVING) {
        this.setState(PlayerState.IDLE);
      }

      // Обновляем анимацию движения
      this.animationHandler.playDirectionAnimation(velocityX, velocityY);
      this.animationHandler.syncFrame();
    }

    // ✅ Синхронизируем позиции золотых сердечек
    const healthSystem = (this.scene as any).healthSystem;
    const heartPositions = healthSystem ? healthSystem.getHeartPositions(this.sprite.x, this.sprite.y) : null;
    this.updateGoldHeartsPosition(heartPositions);
    // ✅ Синхронизируем позиции монеток (если есть)
    this.updateCoinsPosition(heartPositions);
  }

  /**
   * Обработка движения при перетаскивании
   */
  private handleDragMovement(): void {
    if (!this.dragStartPosition || !this.dragCurrentPosition) return;

    const playerPos = this.getPosition();
    const dragVector = new Phaser.Math.Vector2(
      this.dragCurrentPosition.x - this.dragStartPosition.x,
      this.dragCurrentPosition.y - this.dragStartPosition.y
    );

    const minDragLength = 20;
    if (dragVector.length() < minDragLength) {
      return;
    }

    dragVector.normalize();
    this.sprite.setVelocity(
      dragVector.x * this.speed,
      dragVector.y * this.speed
    );
  }

  /**
   * Остановить движение и анимацию
   */
  public stop(): void {
    if (!this.sprite) return;
    this.sprite.setVelocity(0);
    this.isDragging = false;
    this.dragStartPosition = null;
    this.dragCurrentPosition = null;
    if (this.sprite.body) {
      this.sprite.body.stop();
    }
    if (this.moveIndicator) {
      this.moveIndicator.setVisible(false);
    }
    this.animationHandler.stop();
    this.setState(PlayerState.IDLE);
  }

  /**
   * Получить спрайт
   */
  public getSprite(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    return this.sprite;
  }

  /**
   * Получить позицию
   */
  public getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /**
   * Установить позицию
   */
  public setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
  }

  /**
   * Получить X координату
   */
  public getX(): number {
    return this.sprite.x;
  }

  /**
   * Получить Y координату
   */
  public getY(): number {
    return this.sprite.y;
  }

  /**
   * Установить скорость
   */
  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  /**
   * Получить скорость
   */
  public getSpeed(): number {
    return this.speed;
  }

  /**
   * Включить/выключить управление
   */
  public setInputEnabled(enabled: boolean): void {
    // Управление через cursors и wasd уже настроено
  }

  /**
   * Получить обработчик анимаций (для отладки)
   */
  public getAnimationHandler(): SpriteAnimationHandler {
    return this.animationHandler;
  }

  /**
   * Проиграть анимацию потери ключа
   */
  public playLoseKeyAnimation(): void {
    logger.log('PLAYER_ANIMATION', 'playLoseKeyAnimation called', {
      spriteActive: this.sprite?.active,
      animationPlaying: this.loseKeyAnimationPlaying,
      hasAnimationSprite: !!this.loseKeyAnimationSprite
    });

    if (!this.sprite || !this.sprite.active || this.loseKeyAnimationPlaying) {
      return;
    }

    if (!this.sprite.scene.anims.exists('character_lose_key')) {
      console.warn('Player: character_lose_key animation not found');
      return;
    }

    this.loseKeyAnimationPlaying = true;

    const currentX = this.sprite.x;
    const currentY = this.sprite.y;
    const offsetX = (24 - 16) / 2;
    const offsetY = (26 - 16) / 2;

    this.loseKeyAnimationSprite = this.sprite.scene.add.sprite(
      currentX - offsetX,
      currentY - offsetY,
      'character_lose_key'
    );

    this.loseKeyAnimationSprite.setDepth(this.sprite.depth + 1);
    this.loseKeyAnimationSprite.setScale(this.scale);
    // ✅ Храним ключ анимации для ручной синхронизации
    (this.loseKeyAnimationSprite as any)._animationKey = 'character_lose_key';

    const updatePosition = () => {
      if (this.loseKeyAnimationSprite && this.sprite && this.sprite.active) {
        this.loseKeyAnimationSprite.setPosition(
          this.sprite.x - offsetX,
          this.sprite.y - offsetY
        );
      } else {
        return false;
      }
      return true;
    };

    const updateTimer = this.sprite.scene.time.addEvent({
      delay: 16,
      callback: updatePosition,
      loop: true
    });

    (this.loseKeyAnimationSprite as any)._updateTimer = updateTimer;

    if (this.loseKeyAnimationSprite.anims && this.sprite.scene.anims.exists('character_lose_key')) {
      this.loseKeyAnimationSprite.anims.stop();
      (this.loseKeyAnimationSprite as any)._animationInitialized = false;
      (this.loseKeyAnimationSprite as any)._animationFrameIndex = 0;
      (this.loseKeyAnimationSprite as any)._animationTimer = 0;
      this.loseKeyAnimationSprite.play('character_lose_key', false);

      this.loseKeyAnimationSprite.once('animationcomplete', () => {
        if (this.loseKeyAnimationSprite && this.loseKeyAnimationSprite.anims) {
          this.loseKeyAnimationSprite.anims.stop();
        }
        updateTimer.destroy();
        if (this.loseKeyAnimationSprite) {
          this.loseKeyAnimationSprite.destroy();
          this.loseKeyAnimationSprite = undefined;
        }
        this.loseKeyAnimationPlaying = false;

        // После завершения анимации возвращаемся к нормальному состоянию
        if (this.currentState === PlayerState.LOSING_KEY) {
          // ✅ Сбрасываем velocity, чтобы предотвратить автоматическое движение
          this.sprite.setVelocity(0);

          // ✅ Возвращаемся в IDLE (управление восстановится в update())
          this.setState(PlayerState.IDLE);
        }
      });
    } else {
      this.sprite.scene.time.delayedCall(1000, () => {
        updateTimer.destroy();
        if (this.loseKeyAnimationSprite) {
          this.loseKeyAnimationSprite.destroy();
          this.loseKeyAnimationSprite = undefined;
        }
        this.loseKeyAnimationPlaying = false;
      });
    }
  }

  /**
   * Проиграть анимацию получения ключа
   */
  public playGetKeyAnimation(): void {
    logger.log('PLAYER_ANIMATION', 'playGetKeyAnimation called', {
      spriteActive: this.sprite?.active,
      animationPlaying: this.getKeyAnimationPlaying,
      hasAnimationSprite: !!this.getKeyAnimationSprite
    });

    if (!this.sprite || !this.sprite.active || this.getKeyAnimationPlaying) {
      return;
    }

    if (!this.sprite.scene.anims.exists('character_get_key')) {
      console.warn('Player: character_get_key animation not found');
      return;
    }

    this.getKeyAnimationPlaying = true;

    const currentX = this.sprite.x;
    const currentY = this.sprite.y;
    const offsetX = (53 - 16) / 2;
    const offsetY = (35 - 16) / 2;

    this.getKeyAnimationSprite = this.sprite.scene.add.sprite(
      currentX - offsetX,
      currentY - offsetY,
      'character_get_key'
    );

    this.getKeyAnimationSprite.setDepth(this.sprite.depth + 1);
    this.getKeyAnimationSprite.setScale(this.scale);
    // ✅ Храним ключ анимации для ручной синхронизации
    (this.getKeyAnimationSprite as any)._animationKey = 'character_get_key';

    const updatePosition = () => {
      if (this.getKeyAnimationSprite && this.sprite && this.sprite.active) {
        this.getKeyAnimationSprite.setPosition(
          this.sprite.x - offsetX,
          this.sprite.y - offsetY
        );
      } else {
        return false;
      }
      return true;
    };

    const updateTimer = this.sprite.scene.time.addEvent({
      delay: 16,
      callback: updatePosition,
      loop: true
    });

    (this.getKeyAnimationSprite as any)._updateTimer = updateTimer;

    if (this.getKeyAnimationSprite.anims && this.sprite.scene.anims.exists('character_get_key')) {
      this.getKeyAnimationSprite.anims.stop();
      (this.getKeyAnimationSprite as any)._animationInitialized = false;
      (this.getKeyAnimationSprite as any)._animationFrameIndex = 0;
      (this.getKeyAnimationSprite as any)._animationTimer = 0;
      this.getKeyAnimationSprite.play('character_get_key', false);

      this.getKeyAnimationSprite.once('animationcomplete', () => {
        if (this.getKeyAnimationSprite && this.getKeyAnimationSprite.anims) {
          this.getKeyAnimationSprite.anims.stop();
        }
        updateTimer.destroy();
        if (this.getKeyAnimationSprite) {
          this.getKeyAnimationSprite.destroy();
          this.getKeyAnimationSprite = undefined;
        }
        this.getKeyAnimationPlaying = false;

        // После завершения анимации возвращаемся к нормальному состоянию
        if (this.currentState === PlayerState.GETTING_KEY) {
          this.setState(PlayerState.IDLE);
        }
      });
    } else {
      this.sprite.scene.time.delayedCall(1000, () => {
        updateTimer.destroy();
        if (this.getKeyAnimationSprite) {
          this.getKeyAnimationSprite.destroy();
          this.getKeyAnimationSprite = undefined;
        }
        this.getKeyAnimationPlaying = false;
      });
    }
  }

  /**
   * Проиграть анимацию применения ключа
   */
  public playApplyKeyAnimation(): void {
    logger.log('PLAYER_ANIMATION', 'playApplyKeyAnimation called', {
      spriteActive: this.sprite?.active,
      animationPlaying: this.applyKeyAnimationPlaying,
      hasAnimationSprite: !!this.applyKeyAnimationSprite
    });

    if (!this.sprite || !this.sprite.active || this.applyKeyAnimationPlaying) {
      return;
    }

    if (!this.sprite.scene.anims.exists('character_apply_key')) {
      console.warn('Player: character_apply_key animation not found');
      return;
    }

    this.applyKeyAnimationPlaying = true;

    const currentX = this.sprite.x;
    const currentY = this.sprite.y;

    this.applyKeyAnimationSprite = this.sprite.scene.add.sprite(
      currentX,
      currentY,
      'character_apply_key'
    );

    this.applyKeyAnimationSprite.setDepth(this.sprite.depth + 1);
    this.applyKeyAnimationSprite.setScale(this.scale);
    this.applyKeyAnimationSprite.setScrollFactor(this.sprite.scrollFactorX, this.sprite.scrollFactorY);
    // ✅ Храним ключ анимации для ручной синхронизации
    (this.applyKeyAnimationSprite as any)._animationKey = 'character_apply_key';

    const updatePosition = () => {
      if (this.applyKeyAnimationSprite && this.sprite && this.sprite.active) {
        this.applyKeyAnimationSprite.setPosition(
          this.sprite.x,
          this.sprite.y
        );
      } else {
        return false;
      }
      return true;
    };

    const updateTimer = this.sprite.scene.time.addEvent({
      delay: 16,
      callback: updatePosition,
      loop: true
    });

    (this.applyKeyAnimationSprite as any)._updateTimer = updateTimer;

    if (this.applyKeyAnimationSprite.anims && this.sprite.scene.anims.exists('character_apply_key')) {
      this.applyKeyAnimationSprite.anims.stop();
      (this.applyKeyAnimationSprite as any)._animationInitialized = false;
      (this.applyKeyAnimationSprite as any)._animationFrameIndex = 0;
      (this.applyKeyAnimationSprite as any)._animationTimer = 0;
      this.applyKeyAnimationSprite.play('character_apply_key', false);

      this.applyKeyAnimationSprite.once('animationcomplete', () => {
        if (this.applyKeyAnimationSprite && this.applyKeyAnimationSprite.anims) {
          this.applyKeyAnimationSprite.anims.stop();
        }
        updateTimer.destroy();
        if (this.applyKeyAnimationSprite) {
          this.applyKeyAnimationSprite.destroy();
          this.applyKeyAnimationSprite = undefined;
        }
        this.applyKeyAnimationPlaying = false;

        // После завершения анимации возвращаемся к нормальному состоянию
        if (this.currentState === PlayerState.APPLYING_KEY) {
          const isMoving = Math.abs(this.sprite.body.velocity.x) > 5 ||
            Math.abs(this.sprite.body.velocity.y) > 5;
          this.setState(isMoving ? PlayerState.MOVING : PlayerState.IDLE);
        }
      });
    } else {
      this.sprite.scene.time.delayedCall(1000, () => {
        updateTimer.destroy();
        if (this.applyKeyAnimationSprite) {
          this.applyKeyAnimationSprite.destroy();
          this.applyKeyAnimationSprite = undefined;
        }
        this.applyKeyAnimationPlaying = false;
      });
    }
  }

  /**
   * Обновить кольца ключей (визуализация количества собранных ключей)
   * @param keyCount Количество ключей у игрока
   * @param heartPositions Позиции сердечек (опционально, для синхронизации)
   * @param goldHeartTexture Текстура золотого сердечка (опционально)
   * @param heartScale Scale сердечка (опционально)
   */
  public updateKeyRings(
    keyCount: number,
    heartPositions?: { x: number; y: number }[],
    goldHeartTexture?: string,
    heartScale?: number
  ): void {
    if (!this.sprite || !this.sprite.active) {
      return;
    }

    // Старые кольца (скрыты, но код доступен)
    if (this.keyRingsGraphics) {
      this.keyRingsGraphics.clear();
      if (this.keyRingsGraphics.visible && keyCount > 0) {
        const maxRings = Math.min(keyCount, 3);
        this.keyRingsGraphics.lineStyle(2, 0x38a169, 0.8);
        for (let i = 1; i <= maxRings; i++) {
          this.keyRingsGraphics.strokeCircle(this.sprite.x, this.sprite.y, 25 + (i * 8));
        }
      }
    }

    // ✅ Новая система золотых сердечек - обновляем только если количество изменилось
    if (this.previousKeyCount !== keyCount) {
      this.previousKeyCount = keyCount;
      this.updateGoldHearts(keyCount, heartPositions, goldHeartTexture, heartScale);
    } else {
      // ✅ Обновляем позиции существующих золотых сердечек
      this.updateGoldHeartsPosition(heartPositions);
    }
  }

  /**
   * Обновить мон acreтки (визуализация количества собранных мон acreток)
   * @param coinCount Количество мон acreток у игрока
   * @param heartPositions Позиции сердечек (из HealthSystem)
   * @param coinTexture Текстура мон acreтки
   * @param coinScale Scale мон acreтки
   */
  public updateCoins(
    coinCount: number,
    heartPositions?: { x: number; y: number }[],
    coinTexture?: string,
    coinScale?: number
  ): void {
    if (!this.sprite || !this.sprite.active) {
      return;
    }

    // ✅ Обновляем только если количество изменилось
    if (this.previousCoinCount !== coinCount) {
      this.previousCoinCount = coinCount;
      this.updateCoinsInternal(coinCount, heartPositions, coinTexture, coinScale);
    } else {
      // ✅ Обновляем позиции существующих мон acreток
      this.updateCoinsPosition(heartPositions);
    }
  }

  /**
   * Принудительно очистить все мон acreтки (используется при переходе COIN → KEY)
   * Обходит проверку previousCoinCount !== coinCount
   */
  public clearPlayerCoins(): void {
    console.log('🔥🔥🔥 clearPlayerCoins() called!', `previousCount=${this.previousCoinCount}`, `coinSprites.length=${this.coinSprites.length}`);
    logger.log('PLAYER_COINS', `clearPlayerCoins() called - previousCount=${this.previousCoinCount}, coinSprites.length=${this.coinSprites.length}`);
    this.previousCoinCount = 0;  // Сбрасываем счётчик
    this.clearCoins();  // Вызываем приватный метод очистки
    console.log('🔥🔥🔥 clearPlayerCoins() finished!', `coinSprites.length=${this.coinSprites.length}`);
    logger.log('PLAYER_COINS', `clearPlayerCoins() finished - coinSprites.length=${this.coinSprites.length}`);
  }

  /**
   * Обновить золотые сердечки (новая система отображения ключей)
   */
  private updateGoldHearts(
    keyCount: number,
    heartPositions?: { x: number; y: number }[],
    goldHeartTexture?: string,
    heartScale?: number
  ): void {
    // Удаляем все старые золотые сердечки
    this.clearGoldHearts();

    if (keyCount <= 0 || !heartPositions || !goldHeartTexture || !heartScale) {
      return;
    }

    const healthSystem = (this.scene as any).healthSystem;

    // Создаем золотые сердечки для каждого ключа
    const maxGoldHearts = Math.min(keyCount, 3);

    for (let i = 0; i < maxGoldHearts; i++) {
      if (i >= heartPositions.length) break;

      const pos = heartPositions[i];

      // ✅ Округляем координаты до целых пикселей для точного позиционирования
      const roundedX = Math.round(pos.x);
      const roundedY = Math.round(pos.y);

      // 1. Создаем БАЗОВЫЙ спрайт (Непрозрачный, NORMAL blend)
      const goldHeartBase = this.scene.add.sprite(roundedX, roundedY, goldHeartTexture);
      goldHeartBase.setScale(heartScale);
      goldHeartBase.setDepth(DEPTHS.WORLD.OVERHEAD_INDICATOR); // ✅ ВЫШЕ игрока (201)
      goldHeartBase.setAlpha(1); // ✅ ПОЛНОСТЬЮ непрозрачный
      goldHeartBase.setBlendMode(Phaser.BlendModes.NORMAL);

      this.goldHeartSprites.push(goldHeartBase);

      // 2. Создаем СПРАЙТ СВЕЧЕНИЯ (Прозрачный, ADD blend)
      const goldHeartGlow = this.scene.add.sprite(roundedX, roundedY, goldHeartTexture);
      goldHeartGlow.setScale(heartScale);
      goldHeartGlow.setDepth(DEPTHS.WORLD.OVERHEAD_INDICATOR_GLOW); // ✅ ВЫШЕ базового
      goldHeartGlow.setAlpha(0); // Стартуем с 0
      goldHeartGlow.setBlendMode(Phaser.BlendModes.ADD); // ✅ ADD для эффекта свечения

      this.goldHeartGlowSprites.push(goldHeartGlow);

      // ✅ Мигание через alpha свечения: 0.0 → 0.6 → 0.0
      // Базовый спрайт остается непрозрачным, создавая эффект "100% + N%"
      const blinkTween = this.scene.tweens.add({
        targets: goldHeartGlow,
        alpha: 0.6,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.goldHeartBlinkTweens.push(blinkTween);

      // ✅ Скрываем соответствующее красное сердечко, чтобы убрать артефакты по краям
      if (healthSystem && healthSystem.setHeartOverride) {
        healthSystem.setHeartOverride(i, true);
      }
    }
  }

  /**
   * Синхронизировать позиции золотых сердечек с игроком
   */
  private updateGoldHeartsPosition(heartPositions?: { x: number; y: number }[]): void {
    if (!this.sprite || !this.sprite.active) return;
    if (!heartPositions) return;

    // Обновляем позиции каждого золотого сердечка и свечения
    for (let i = 0; i < this.goldHeartSprites.length; i++) {
      if (i < heartPositions.length) {
        // ✅ Округляем координаты до целых пикселей для точного позиционирования
        const roundedX = Math.round(heartPositions[i].x);
        const roundedY = Math.round(heartPositions[i].y);

        // Базовый спрайт
        const goldHeart = this.goldHeartSprites[i];
        if (goldHeart && goldHeart.active) {
          goldHeart.setPosition(roundedX, roundedY);
        }

        // Спрайт свечения
        if (i < this.goldHeartGlowSprites.length) {
          const goldHeartGlow = this.goldHeartGlowSprites[i];
          if (goldHeartGlow && goldHeartGlow.active) {
            goldHeartGlow.setPosition(roundedX, roundedY);
          }
        }
      }
    }
  }

  /**
   * Очистить все золотые сердечки
   */
  private clearGoldHearts(): void {
    const healthSystem = (this.scene as any).healthSystem;

    // Останавливаем все tweens
    this.goldHeartBlinkTweens.forEach(tween => {
      if (tween && tween.isActive()) {
        tween.stop();
      }
    });
    this.goldHeartBlinkTweens = [];

    // Удаляем все базовые спрайты
    this.goldHeartSprites.forEach((sprite, index) => {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
      // ✅ Возвращаем видимость красных сердечек
      if (healthSystem && healthSystem.setHeartOverride) {
        healthSystem.setHeartOverride(index, false);
      }
    });
    this.goldHeartSprites = [];

    // Удаляем все спрайты свечения
    this.goldHeartGlowSprites.forEach(sprite => {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    this.goldHeartGlowSprites = [];

    // ✅ Очищаем и мон acreтки (для безопасности и консистентности)
    this.clearCoins();
  }

  // ================================================
  // ✅ Система мон acreток для фазы coin (аналог золотых сердечек)
  // ================================================

  /**
   * Обновить мон acreтки (аналог золотых сердечек для фазы coin)
   *
   * ⚠️ ВАЖНО: Мон acreтки отображаются ВНИЗУ персонажа, а не вверху как серд acreчки!
   */
  private updateCoinsInternal(
    coinCount: number,
    heartPositions?: { x: number; y: number }[],
    coinTexture?: string,
    coinScale?: number
  ): void {
    // Удаляем все старые мон acreтки
    this.clearCoins();

    if (coinCount <= 0 || !heartPositions || !coinTexture || !coinScale) {
      return;
    }

    const healthSystem = (this.scene as any).healthSystem;

    // Создаем мон acreтки для каждой собранной мон acreтки
    const maxCoins = Math.min(coinCount, 3);

    // ⚠️ ВАЖНО: Рассчитываем позиции мон acreток ВНИЗУ персонажа
    // Нижняя граница мон acreтки совпадает с нижней границей персонажа
    const spacing = 18; // HEART_SPACING из HealthSystem
    const startX = -(maxCoins * spacing) / 2 + spacing / 2;
    // Расчёт: playerBottom (playerY + displayHeight/2) - coinSize/2 - playerY
    // При displayHeight=64, coinSize=20: offsetY = 32 - 10 = 22
    const offsetY = 22; // ВНИЗУ персонажа (нижняя граница мон acreтки = нижняя граница игрока)

    for (let i = 0; i < maxCoins; i++) {
      // Рассчитываем позицию ВНИЗУ персонажа
      const playerX = this.sprite.x;
      const playerY = this.sprite.y;
      const roundedX = Math.round(playerX + startX + i * spacing);
      const roundedY = Math.round(playerY + offsetY);

      // 1. БАЗОВЫЙ спрайт (Непрозрачный, NORMAL blend)
      const coinBase = this.scene.add.sprite(roundedX, roundedY, coinTexture);
      coinBase.setScale(coinScale);
      coinBase.setDepth(DEPTHS.WORLD.OVERHEAD_INDICATOR); // ✅ Константа вместо magic number
      coinBase.setAlpha(1);
      coinBase.setBlendMode(Phaser.BlendModes.NORMAL);

      this.coinSprites.push(coinBase);

      // 2. СПРАЙТ СВЕЧЕНИЯ (Прозрачный, ADD blend)
      const coinGlow = this.scene.add.sprite(roundedX, roundedY, coinTexture);
      coinGlow.setScale(coinScale);
      coinGlow.setDepth(DEPTHS.WORLD.OVERHEAD_INDICATOR_GLOW); // ✅ Константа вместо magic number
      coinGlow.setAlpha(0);
      coinGlow.setBlendMode(Phaser.BlendModes.ADD);

      this.coinGlowSprites.push(coinGlow);

      // ✅ Мигание через alpha свечения: 0.0 → 0.6 → 0.0
      const blinkTween = this.scene.tweens.add({
        targets: coinGlow,
        alpha: 0.6,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.coinBlinkTweens.push(blinkTween);

      // ✅ Мон acreтки НЕ скрывают красные серд acreчки (в отличие от золотых)
    }
  }

  /**
   * Синхронизировать позиции мон acreток с игроком
   *
   * ⚠️ ВАЖНО: Мон acreтки отображаются ВНИЗУ персонажа, а не вверху как серд acreчки!
   * Параметр heartPositions игнорируется - позиции рассчитываются отдельно.
   */
  private updateCoinsPosition(heartPositions?: { x: number; y: number }[]): void {
    if (!this.sprite || !this.sprite.active) return;
    if (this.coinSprites.length === 0) return;

    // ⚠️ Рассчитываем позиции мон acreток ВНИЗУ персонажа
    const spacing = 18; // HEART_SPACING из HealthSystem
    const offsetX = -(this.coinSprites.length * spacing) / 2 + spacing / 2;
    const offsetY = 22; // ВНИЗУ персонажа (нижняя граница мон acreтки = нижняя граница игрока)

    const playerX = this.sprite.x;
    const playerY = this.sprite.y;

    // Обновляем позиции каждой мон acreтки и свечения
    for (let i = 0; i < this.coinSprites.length; i++) {
      const roundedX = Math.round(playerX + offsetX + i * spacing);
      const roundedY = Math.round(playerY + offsetY);

      // Базовый спрайт
      const coin = this.coinSprites[i];
      if (coin && coin.active) {
        coin.setPosition(roundedX, roundedY);
      }

      // Спрайт свечения
      if (i < this.coinGlowSprites.length) {
        const coinGlow = this.coinGlowSprites[i];
        if (coinGlow && coinGlow.active) {
          coinGlow.setPosition(roundedX, roundedY);
        }
      }
    }
  }

  /**
   * Очистить все мон acreтки
   */
  private clearCoins(): void {
    const healthSystem = (this.scene as any).healthSystem;

    // Останавливаем все tweens
    this.coinBlinkTweens.forEach(tween => {
      if (tween && tween.isActive()) {
        tween.stop();
      }
    });
    this.coinBlinkTweens = [];

    // Удаляем все базовые спрайты
    console.log('🔥 clearCoins: Starting cleanup, coinSprites.length=', this.coinSprites.length);
    let destroyedCount = 0;
    this.coinSprites.forEach((sprite) => {
      if (sprite && sprite.active) {
        console.log('🔥 clearCoins: destroying sprite', sprite);
        sprite.destroy();
        destroyedCount++;
      }
      // ✅ Мон acreтки независимы от сердечек - не возвращаем их видимость
    });
    this.coinSprites = [];
    console.log('🔥 clearCoins: Destroyed', destroyedCount, 'sprites, array length=', this.coinSprites.length);
    logger.log('PLAYER_COINS', `clearCoins: coinSprites cleared, array length=${this.coinSprites.length}`);

    // Удаляем все спрайты свечения
    this.coinGlowSprites.forEach(sprite => {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    this.coinGlowSprites = [];
  }

  /**
   * Синхронизировать кадры анимаций событий (для physics спрайтов)
   * Этот метод инкапсулирует логику синхронизации, чтобы избежать нарушения инкапсуляции
   * @param delta Время, прошедшее с последнего кадра (в миллисекундах)
   */
  public updateAnimationSync(delta: number): void {
    // Синхронизация анимации потери ключа
    if (this.loseKeyAnimationSprite && this.loseKeyAnimationSprite.active) {
      this.syncAnimationFrame(this.loseKeyAnimationSprite, delta, () => {
        // Callback при завершении анимации
        this.loseKeyAnimationSprite = undefined;
        this.loseKeyAnimationPlaying = false;
        if (this.currentState === PlayerState.LOSING_KEY) {
          this.sprite.setVelocity(0);
          this.setState(PlayerState.IDLE);
        }
      });
    }

    // Синхронизация анимации получения ключа
    if (this.getKeyAnimationSprite && this.getKeyAnimationSprite.active) {
      this.syncAnimationFrame(this.getKeyAnimationSprite, delta, () => {
        // Callback при завершении анимации
        this.getKeyAnimationSprite = undefined;
        this.getKeyAnimationPlaying = false;
        if (this.currentState === PlayerState.GETTING_KEY) {
          this.sprite.setVelocity(0);
          this.setState(PlayerState.IDLE);
        }
      });
    }

    // Синхронизация анимации применения ключа
    if (this.applyKeyAnimationSprite && this.applyKeyAnimationSprite.active) {
      this.syncAnimationFrame(this.applyKeyAnimationSprite, delta, () => {
        // Callback при завершении анимации
        this.applyKeyAnimationSprite = undefined;
        this.applyKeyAnimationPlaying = false;
        if (this.currentState === PlayerState.APPLYING_KEY) {
          this.sprite.setVelocity(0);
          const isMoving = Math.abs(this.sprite.body.velocity.x) > 5 ||
            Math.abs(this.sprite.body.velocity.y) > 5;
          this.setState(isMoving ? PlayerState.MOVING : PlayerState.IDLE);
        }
      });
    }
  }

  /**
   * Вспомогательный метод для синхронизации кадра анимации
   * @param sprite Спрайт анимации
   * @param delta Время, прошедшее с последнего кадра
   * @param onComplete Callback при завершении анимации
   */
  private syncAnimationFrame(
    sprite: Phaser.GameObjects.Sprite,
    delta: number,
    onComplete: () => void
  ): void {
    // ✅ Сначала пробуем получить текущую анимацию из спрайта
    let anim = sprite.anims?.currentAnim;

    // ✅ Если нет, пробуем получить по ключу из scene
    if (!anim) {
      const animKey = (sprite as any)._animationKey;
      if (animKey && this.sprite.scene.anims.exists(animKey)) {
        anim = this.sprite.scene.anims.get(animKey);
      }
    }

    if (!anim || !anim.frames || anim.frames.length === 0) {
      return;
    }

    // Инициализация таймера, если еще не инициализирован
    if ((sprite as any)._animationInitialized !== true) {
      (sprite as any)._animationTimer = 0;
      (sprite as any)._animationFrameIndex = 0;
      const frameRate = anim.frameRate || 12;
      (sprite as any)._animationInterval = 1000 / frameRate;
      (sprite as any)._animationInitialized = true;
    }

    // Обновление таймера
    (sprite as any)._animationTimer += delta;

    // Переключение кадра, если прошло достаточно времени
    if ((sprite as any)._animationTimer >= (sprite as any)._animationInterval) {
      (sprite as any)._animationTimer = 0;
      const maxFrameIndex = anim.frames.length - 1;

      // Позволяем анимации проиграться полностью, включая последний кадр
      if ((sprite as any)._animationFrameIndex < maxFrameIndex) {
        (sprite as any)._animationFrameIndex++;
      }

      const currentFrameIndex = Math.min((sprite as any)._animationFrameIndex, maxFrameIndex);
      const animFrame = anim.frames[currentFrameIndex];

      if (animFrame && animFrame.frame) {
        const animFrameObj = animFrame.frame;
        let frameIndex: number | undefined;

        // Определение индекса кадра из различных форматов
        if (animFrameObj && typeof animFrameObj === 'object' && (animFrameObj as any).frame !== undefined) {
          frameIndex = (animFrameObj as any).frame;
        } else if ((animFrameObj as any)?.index !== undefined) {
          frameIndex = (animFrameObj as any).index;
        } else if (animFrameObj?.name !== undefined) {
          const nameAsNum = parseInt(String(animFrameObj.name), 10);
          if (!isNaN(nameAsNum)) {
            frameIndex = nameAsNum;
          }
        } else if (typeof animFrameObj === 'number') {
          frameIndex = animFrameObj;
        }

        if (frameIndex !== undefined) {
          sprite.setFrame(frameIndex);

          // Если это последний кадр, уничтожаем спрайт
          const reachedLastFrame = (sprite as any)._animationFrameIndex >= maxFrameIndex;
          if (reachedLastFrame && !(sprite as any)._lastFrameShown) {
            (sprite as any)._lastFrameShown = true;

            // Уничтожаем таймер обновления позиции
            const updateTimer = (sprite as any)._updateTimer;
            if (updateTimer) {
              updateTimer.destroy();
            }

            if (sprite && sprite.active) {
              sprite.destroy();
              onComplete();
            }
          }
        }
      }
    }
  }

  /**
   * Сбросить состояние игрока (для рестарта)
   */
  public reset(): void {
    // 1. Сбрасываем визуальные эффекты (мигание и т.д.)
    this.resetVisualEffects();

    // 2. Очищаем отбрасывание
    this.knockbackVelocity = null;
    this.knockbackDuration = 0;

    // 3. Сбрасываем анимации событий
    this.loseKeyAnimationPlaying = false;
    this.getKeyAnimationPlaying = false;
    this.applyKeyAnimationPlaying = false;

    if (this.loseKeyAnimationSprite) {
      if (this.loseKeyAnimationSprite.active) this.loseKeyAnimationSprite.destroy();
      this.loseKeyAnimationSprite = undefined;
    }
    if (this.getKeyAnimationSprite) {
      if (this.getKeyAnimationSprite.active) this.getKeyAnimationSprite.destroy();
      this.getKeyAnimationSprite = undefined;
    }
    if (this.applyKeyAnimationSprite) {
      if (this.applyKeyAnimationSprite.active) this.applyKeyAnimationSprite.destroy();
      this.applyKeyAnimationSprite = undefined;
    }

    // 4. Очищаем графику
    if (this.keyRingsGraphics) {
      this.keyRingsGraphics.clear();
    }
    // ✅ Очищаем золотые сердечки и сбрасываем счетчик
    this.clearGoldHearts();
    this.previousKeyCount = -1;
    if (this.moveIndicator) {
      this.moveIndicator.setVisible(false);
    }

    // 5. Возвращаем состояние
    this.setState(PlayerState.IDLE);

    // 6. Сбрасываем физику и текстуру
    if (this.sprite && this.sprite.active) {
      this.sprite.setVelocity(0);
      this.sprite.setTexture(this.originalTextureKey);
      this.sprite.setFrame(0);
    }
  }

  /**
   * Уничтожить игрока
   */
  public destroy(): void {
    if (this.loseKeyAnimationSprite) {
      this.loseKeyAnimationSprite.destroy();
      this.loseKeyAnimationSprite = undefined;
    }
    if (this.getKeyAnimationSprite) {
      this.getKeyAnimationSprite.destroy();
      this.getKeyAnimationSprite = undefined;
    }
    if (this.applyKeyAnimationSprite) {
      this.applyKeyAnimationSprite.destroy();
      this.applyKeyAnimationSprite = undefined;
    }

    if (this.keyRingsGraphics) {
      this.keyRingsGraphics.destroy();
      this.keyRingsGraphics = undefined;
    }

    // ✅ Уничтожаем золотые сердечки
    this.clearGoldHearts();

    // ✅ Уничтожаем мон acreтки
    this.clearCoins();

    if (this.sprite) {
      this.sprite.destroy();
    }
  }
}
