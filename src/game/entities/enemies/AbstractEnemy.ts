/**
 * Абстрактный базовый класс для всех врагов
 */

import Phaser from 'phaser';
import { EnemyType, EnemyConfig, EnemyState } from '../../../types/enemyTypes';
import { ACTOR_SIZES, BASE_SCALE, DEFAULT_ENEMY_HEALTH, MAP_WIDTH, MAP_HEIGHT, DEPTHS } from '../../../constants/gameConstants';
import { SpriteAnimationHandler } from '../../systems/SpriteAnimationHandler';
import { logger } from '../../../utils/Logger';

export abstract class AbstractEnemy {
  protected sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  protected scene: Phaser.Scene;
  protected type: EnemyType;
  protected baseSpeed: number;
  protected isDying: boolean = false;
  protected damage: number = 1; // ✅ Урон, наносимый игроку при столкновении
  protected health: number; // ✅ Текущее здоровье врага
  protected maxHealth: number; // ✅ Максимальное здоровье врага
  protected animationHandler: SpriteAnimationHandler;
  protected deathAnimationSprite?: Phaser.GameObjects.Sprite; // ✅ Спрайт для анимации смерти поверх основного
  protected lastCollisionTime: number = 0; // ✅ Время последнего столкновения с игроком (для cooldown)
  protected readonly COLLISION_COOLDOWN: number = 500; // ✅ 500ms между столкновениями с этим врагом

  // ✅ Машина состояний
  protected currentState: EnemyState = EnemyState.IDLE;
  protected previousState: EnemyState = EnemyState.IDLE;

  // ✅ Настройки поведения (из конфига уровня)
  protected cloneDetectionRadius: number = 0; // Радиус детекции игрока для клонирования
  protected chaseRadius: number = 0; // Радиус преследования
  protected chaseSpeed: number = 0; // Скорость преследования (если 0, используется baseSpeed)
  protected clonesCanClone: boolean = false; // Могут ли клоны клонироваться
  protected cloneLifetime: number = 0; // Время жизни клонов в мс (0 = бессмертные)
  protected cloneCount: number = 0; // Количество клонов при клонировании
  protected cloneSpawnDelay: number = 0; // Задержка между спавном каждого клона в мс
  protected showDetectionRadius: boolean = false; // Показывать ли кольцо радиуса детекции

  // ✅ Флаги для клонов
  protected isClone: boolean = false; // Является ли этот враг клоном
  protected parentId?: string; // ID родительского врага (для клонов)
  protected spawnTime: number = 0; // Время создания (для клонов с ограниченным временем жизни)
  protected enemyId: string; // Уникальный ID врага

  // ✅ Состояние клонирования
  protected isSpawning: boolean = false; // Флаг процесса клонирования
  protected spawnBlinkTween?: Phaser.Tweens.Tween; // Твин для мигания при клонировании
  protected lastDetectionTime: number = 0; // Время последней детекции (для cooldown)
  protected readonly DETECTION_COOLDOWN: number = 2000; // 2 секунды между клонированиями
  protected isBlinking: boolean = false; // Флаг активного мигания (защита от сброса тинта)
  private cloneBlinkTimer?: Phaser.Time.TimerEvent; // ✅ Таймер мигания клона
  private cloneBlinkCleanup?: Phaser.Time.TimerEvent; // ✅ Cleanup таймер мигания клона
  private spawnBlinkCleanup?: Phaser.Time.TimerEvent; // ✅ Cleanup таймер спавна

  // ✅ Визуальное кольцо для отладки
  protected detectionRadiusCircle?: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    config: EnemyConfig
  ) {
    this.scene = scene;
    this.type = config.type;
    this.baseSpeed = config.speed;
    this.damage = config.damage ?? 1; // ✅ Урон из конфига или 1 по умолчанию
    this.maxHealth = config.health ?? DEFAULT_ENEMY_HEALTH; // ✅ Здоровье из конфига или по умолчанию
    this.health = this.maxHealth; // ✅ Начальное здоровье равно максимальному

    // ✅ Генерируем уникальный ID для врага
    this.enemyId = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ Инициализируем настройки поведения из конфига
    this.cloneDetectionRadius = config.cloneDetectionRadius ?? 0;
    this.chaseRadius = config.chaseRadius ?? 0;
    this.chaseSpeed = config.chaseSpeed ?? 0; // Если не указана, будет использоваться baseSpeed
    this.clonesCanClone = config.clonesCanClone ?? false;
    this.cloneLifetime = config.cloneLifetime ?? 0;
    this.cloneCount = config.cloneCount ?? 0;
    this.cloneSpawnDelay = config.cloneSpawnDelay ?? 0;
    this.showDetectionRadius = config.showDetectionRadius ?? false;

    // ✅ Если cloneCount = 0, обнуляем связанные настройки клонирования
    if (this.cloneCount === 0) {
      this.cloneSpawnDelay = 0;
      this.clonesCanClone = false;
      // cloneLifetime оставляем как есть (может использоваться для других целей)
    }

    // ✅ Отладочный лог для проверки настроек
    logger.log('ENEMY_INIT', 'Enemy initialized with behavior config', {
      enemyId: this.enemyId,
      type: this.type,
      cloneDetectionRadius: this.cloneDetectionRadius,
      chaseRadius: this.chaseRadius,
      clonesCanClone: this.clonesCanClone,
      cloneLifetime: this.cloneLifetime,
      cloneCount: this.cloneCount
    });

    // ✅ Инициализируем флаги для клонов
    this.isClone = config.isClone ?? false;
    this.parentId = config.parentId;
    this.spawnTime = config.spawnTime ?? scene.time.now;

    // ✅ Инициализируем состояние
    this.currentState = EnemyState.IDLE;
    this.previousState = EnemyState.IDLE;

    // Создаем спрайт врага
    const textureKey = this.getTextureKey();
    this.sprite = scene.physics.add.sprite(config.x, config.y, textureKey);

    // ✅ СОЗДАЕМ ОБРАБОТЧИК АНИМАЦИЙ (передаем scene первым параметром!)
    // ✅ Используем тип врага для определения префикса анимации
    let animPrefix: string;
    switch (this.type) {
      case EnemyType.CHASER:
        animPrefix = 'dragon';
        break;
      case EnemyType.FLAM:
        animPrefix = 'flam';
        break;
      case EnemyType.RANDOM_WALKER:
      default:
        animPrefix = 'beast';
        break;
    }
    this.animationHandler = new SpriteAnimationHandler(scene, this.sprite, animPrefix);

    // ✅ Устанавливаем callback для проверки состояния мигания
    this.animationHandler.setIsBlinkingCallback(() => this.isBlinking);

    // ✅ НЕ устанавливаем начальную анимацию здесь - она будет установлена в конструкторах дочерних классов
    // после установки скорости через playDirectionAnimation()

    this.sprite.setData('type', config.type);
    this.sprite.setData('enemy', this);
    this.sprite.setData('enemyId', this.enemyId);
    this.sprite.setData('enemyType', this.type); // ✅ Сохраняем тип врага
    this.sprite.setData('state', this.currentState);
    this.sprite.setData('isClone', this.isClone);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setBounce(1);
    this.sprite.setDepth(DEPTHS.WORLD.ENEMY);
    // ✅ Используем индивидуальный размер для врагов
    this.sprite.setScale(BASE_SCALE * ACTOR_SIZES.ENEMY);

    // ✅ Создаем визуальное кольцо для отладки (если нужно)
    // Кольцо показывается только если есть что показывать: преследование ИЛИ клонирование
    // ✅ Для преследования: chaseRadius > 0
    // ✅ Для клонирования: cloneCount > 0 И cloneDetectionRadius > 0
    const shouldShowChaseRing = this.chaseRadius > 0;
    const shouldShowCloneRing = this.cloneCount > 0 && this.cloneDetectionRadius > 0;

    if (this.showDetectionRadius && (shouldShowChaseRing || shouldShowCloneRing)) {
      this.createDetectionRadiusCircle();
    }
  }

  /**
   * Создать визуальное кольцо радиуса детекции для отладки
   */
  protected createDetectionRadiusCircle(): void {
    if (!this.scene || !this.sprite) return;

    // ✅ Определяем радиус и цвет кольца с учетом всех условий
    let radius = 0;
    let color = 0xffffff;

    // ✅ Приоритет: преследование (chaseRadius) имеет приоритет над клонированием
    if (this.chaseRadius > 0) {
      // Красный для преследующих
      radius = this.chaseRadius;
      color = 0xff0000;
    } else if (this.cloneCount > 0 && this.cloneDetectionRadius > 0) {
      // Зеленый для клонирующих (только если cloneCount > 0)
      radius = this.cloneDetectionRadius;
      color = 0x00ff00;
    } else {
      // Не показываем кольцо, если нет ни преследования, ни клонирования
      return;
    }

    if (radius <= 0) return;

    // Создаем Graphics объект (как у перса - один объект, перерисовываем каждый кадр)
    this.detectionRadiusCircle = this.scene.add.graphics();
    this.detectionRadiusCircle.setDepth(this.sprite.depth - 1); // Ниже спрайта врага (6)

    // Первоначальная отрисовка (будет перерисовываться каждый кадр в update)
    this.redrawDetectionRadiusCircle();
  }

  /**
   * Перерисовать кольцо радиуса детекции
   * Используется каждый кадр в update() для обновления позиции (как у перса)
   */
  protected redrawDetectionRadiusCircle(): void {
    if (!this.detectionRadiusCircle || !this.sprite || !this.sprite.active) {
      // ✅ Если кольцо уничтожено или спрайт неактивен, не рисуем
      return;
    }

    // ✅ Проверяем, должны ли мы показывать кольцо (те же условия, что и при создании)
    // ✅ Для преследования: chaseRadius > 0
    // ✅ Для клонирования: cloneCount > 0 И cloneDetectionRadius > 0
    const shouldShowChaseRing = this.chaseRadius > 0;
    const shouldShowCloneRing = this.cloneCount > 0 && this.cloneDetectionRadius > 0;

    if (!this.showDetectionRadius || !(shouldShowChaseRing || shouldShowCloneRing)) {
      // Условия больше не выполняются - уничтожаем кольцо
      this.detectionRadiusCircle.destroy();
      this.detectionRadiusCircle = undefined;
      return;
    }

    // ✅ Определяем радиус и цвет кольца с учетом всех условий
    // ✅ Приоритет: преследование (chaseRadius) имеет приоритет над клонированием
    let radius = 0;
    let color = 0xffffff;

    if (this.chaseRadius > 0) {
      // Красный для преследующих
      radius = this.chaseRadius;
      color = 0xff0000;
    } else if (this.cloneCount > 0 && this.cloneDetectionRadius > 0) {
      // Зеленый для клонирующих (только если cloneCount > 0)
      radius = this.cloneDetectionRadius;
      color = 0x00ff00;
    } else {
      // Не должно происходить (уже проверили выше), но на всякий случай
      this.detectionRadiusCircle.destroy();
      this.detectionRadiusCircle = undefined;
      return;
    }

    if (radius <= 0) {
      this.detectionRadiusCircle.destroy();
      this.detectionRadiusCircle = undefined;
      return;
    }

    // Очищаем предыдущий рисунок (как у перса)
    this.detectionRadiusCircle.clear();

    // Рисуем кольцо в позиции спрайта (как у перса - strokeCircle с абсолютными координатами)
    this.detectionRadiusCircle.lineStyle(2, color, 0.8);
    this.detectionRadiusCircle.strokeCircle(this.sprite.x, this.sprite.y, radius);
  }

  /**
   * Воспроизвести звук спавна (универсальный метод для любого спавна)
   * Звук проигрывается только если враг виден на камере
   */
  public playSpawnSound(): void {
    // Проверяем видимость на камере перед воспроизведением звука
    if (!this.isVisibleOnCamera()) {
      logger.log('ENEMY_SPAWNING', 'Spawn sound skipped - enemy not visible on camera', {
        enemyId: this.enemyId,
        type: this.type,
        x: this.sprite?.x,
        y: this.sprite?.y
      });
      return;
    }

    try {
      // Получаем AudioManager из data сцены
      const audioManager = this.scene.data.get('audioManager');
      if (audioManager && typeof audioManager.playEnemySpawn === 'function') {
        audioManager.playEnemySpawn();
        logger.log('ENEMY_SPAWNING', 'Spawn sound played', {
          enemyId: this.enemyId,
          type: this.type,
          isClone: this.isClone
        });
      } else {
        logger.log('ENEMY_SPAWNING', 'AudioManager not found or playEnemySpawn method missing', {
          hasAudioManager: !!audioManager,
          hasMethod: audioManager && typeof audioManager.playEnemySpawn === 'function'
        });
      }
    } catch (error) {
      logger.log('ENEMY_SPAWNING', 'Failed to play spawn sound', {
        error,
        enemyId: this.enemyId,
        type: this.type
      });
    }
  }

  /**
   * Получить ключ текстуры для типа врага
   */
  protected getTextureKey(): string {
    // ✅ Используем тип врага для определения текстуры
    switch (this.type) {
      case EnemyType.RANDOM_WALKER:
        return 'beast_sheet';
      case EnemyType.CHASER:
        return 'dragon_sheet';
      case EnemyType.FLAM:
        return 'flam_sheet';
      default:
        return 'beast_sheet';
    }
  }

  /**
   * Получить текущее состояние
   */
  public getState(): EnemyState {
    return this.currentState;
  }

  /**
   * Установить состояние врага
   */
  protected setState(newState: EnemyState): void {
    if (this.currentState === newState) {
      return; // Уже в этом состоянии
    }

    // DEAD - финальное состояние, нельзя выйти из него
    if (this.currentState === EnemyState.DEAD) {
      return;
    }

    // ✅ Запрещаем изменение состояния во время мигания (клонирования)
    // Исключение: переход в DYING или DEAD (смерть важнее)
    if ((this.isSpawning || this.isBlinking) &&
      newState !== EnemyState.DYING &&
      newState !== EnemyState.DEAD &&
      this.currentState === EnemyState.SPAWNING) {
      logger.log('ENEMY_STATE', `Blocked state transition during spawning: ${this.currentState} -> ${newState}`, {
        enemyId: this.enemyId,
        type: this.type,
        isSpawning: this.isSpawning,
        isBlinking: this.isBlinking
      });
      return;
    }

    logger.log('ENEMY_STATE', `State transition: ${this.currentState} -> ${newState}`, {
      enemyId: this.enemyId,
      type: this.type,
      isClone: this.isClone,
      isSpawning: this.isSpawning,
      isBlinking: this.isBlinking
    });

    this.previousState = this.currentState;
    this.currentState = newState;
    this.sprite.setData('state', newState);

    this.updateVisualState();
  }

  /**
   * Обновить визуальное состояние
   */
  protected updateVisualState(): void {
    logger.log('ENEMY_VISUAL_STATE', 'updateVisualState called', {
      currentState: this.currentState,
      isSpawning: this.isSpawning,
      enemyId: this.enemyId,
      type: this.type
    });

    switch (this.currentState) {
      case EnemyState.IDLE:
      case EnemyState.MOVING:
      case EnemyState.WANDERING:
      case EnemyState.CHASING:
      case EnemyState.RETREATING:
        // ✅ При переходе в состояние движения сразу запускаем анимацию, если есть скорость
        if (this.sprite && this.sprite.body && this.animationHandler) {
          const velocityX = this.sprite.body.velocity.x;
          const velocityY = this.sprite.body.velocity.y;
          const isMoving = Math.abs(velocityX) > 1 || Math.abs(velocityY) > 1;
          if (isMoving) {
            this.animationHandler.playDirectionAnimation(velocityX, velocityY);
          }
        }
        break;
      case EnemyState.DETECTING:
        // Состояние детекции - можно добавить визуальный эффект
        break;
      case EnemyState.SPAWNING:
        // ✅ Запускаем мигание только если еще не запущено
        logger.log('ENEMY_VISUAL_STATE', 'SPAWNING state detected', {
          isSpawning: this.isSpawning,
          enemyId: this.enemyId,
          type: this.type
        });
        if (!this.isSpawning) {
          logger.log('ENEMY_VISUAL_STATE', 'Calling startSpawningAnimation', {
            enemyId: this.enemyId,
            type: this.type
          });
          this.startSpawningAnimation();
        } else {
          logger.log('ENEMY_VISUAL_STATE', 'Skipping startSpawningAnimation - already spawning', {
            enemyId: this.enemyId,
            type: this.type
          });
        }
        break;
      case EnemyState.DAMAGED:
        // Обрабатывается в onPlayerCollision
        break;
      case EnemyState.DYING:
        // Обрабатывается в playDeathAnimation
        break;
      case EnemyState.DEAD:
        // Финальное состояние
        break;
    }
  }

  /**
   * Абстрактный метод для обновления AI
   */
  public abstract updateAI(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void;

  /**
   * Обновление врага
   */
  public update(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    if (!this.sprite?.active || this.currentState === EnemyState.DEAD) return;

    // ✅ Проверяем, не на паузе ли сцена (например, при показе модального окна с вопросом)
    // В Phaser Scene имеет свойство scene (ScenePlugin) с методом isPaused()
    // Также проверяем паузу физики, так как модальные окна часто паузут только физику
    if ((this.scene?.scene?.isPaused && this.scene.scene.isPaused()) ||
      this.scene.physics.world.isPaused) {
      return; // Не обновляем врага, если сцена на паузе
    }

    // ✅ КРИТИЧНО: Если враг в состоянии WANDERING и скорость = 0, устанавливаем начальную скорость
    // ✅ Это исправляет проблему, когда скорость не устанавливается в конструкторе
    if ((this.currentState === EnemyState.WANDERING || this.currentState === EnemyState.IDLE) &&
      this.sprite.body &&
      this.sprite.body.velocity.x === 0 &&
      this.sprite.body.velocity.y === 0) {
      const angle = Phaser.Math.Between(0, 360);
      this.scene.physics.velocityFromAngle(angle, this.baseSpeed, this.sprite.body.velocity);
      // ✅ Сразу запускаем анимацию после установки скорости
      if (this.animationHandler) {
        const newVelocityX = this.sprite.body.velocity.x;
        const newVelocityY = this.sprite.body.velocity.y;
        this.animationHandler.playDirectionAnimation(newVelocityX, newVelocityY);
        this.animationHandler.syncFrame();
      }
    }

    // ✅ Проверяем время жизни клонов
    if (this.isClone && this.cloneLifetime > 0) {
      const elapsed = this.scene.time.now - this.spawnTime;
      if (elapsed >= this.cloneLifetime) {
        // Время жизни истекло - переходим в DYING
        this.setState(EnemyState.DYING);
        this.isDying = true;
        this.sprite.disableBody(true, false);
        this.playDeathAnimation(true);
        return;
      }
    }

    // ✅ Обрабатываем состояние SPAWNING (клонирование)
    // ✅ НЕ блокируем update() - враг должен двигаться даже во время мигания
    // ✅ Мигание - это только визуальный эффект, не должен блокировать движение
    // if (this.currentState === EnemyState.SPAWNING) {
    //   return; // УБРАНО - блокировало движение врага
    // }

    // ✅ Проверяем детекцию игрока (если враг может клонироваться и есть радиус детекции)
    // ВАЖНО: родитель может клонироваться повторно после cooldown
    // ✅ Также проверяем, что это НЕ клон (клоны не должны клонироваться, если clonesCanClone = false)
    const shouldCheckCloning = !this.isClone || (this.isClone && this.clonesCanClone);

    // ✅ Проверка: cloneCount > 0 для возможности клонирования
    if (shouldCheckCloning && this.cloneCount > 0 && this.cloneDetectionRadius > 0 && !this.isSpawning &&
      this.currentState !== EnemyState.DYING &&
      this.currentState !== EnemyState.SPAWNING &&
      this.currentState !== EnemyState.DETECTING) {
      const now = this.scene.time.now;
      const timeSinceLastDetection = now - this.lastDetectionTime;

      if (timeSinceLastDetection > this.DETECTION_COOLDOWN) {
        const dist = Phaser.Math.Distance.Between(
          this.sprite.x,
          this.sprite.y,
          player.x,
          player.y
        );

        if (dist <= this.cloneDetectionRadius) {
          // Обнаружили игрока - переходим в DETECTING, затем SPAWNING
          logger.log('ENEMY_DETECTION', 'Player in detection radius', {
            enemyId: this.enemyId,
            type: this.type,
            isClone: this.isClone,
            cloneCount: this.cloneCount,
            clonesCanClone: this.clonesCanClone,
            shouldCheckCloning: shouldCheckCloning,
            distance: dist,
            cloneDetectionRadius: this.cloneDetectionRadius,
            currentState: this.currentState,
            isSpawning: this.isSpawning,
            timeSinceLastDetection: timeSinceLastDetection,
            cooldown: this.DETECTION_COOLDOWN
          });
          this.lastDetectionTime = now;
          this.handlePlayerDetection(player);
        }
      }
    } else if (this.cloneCount > 0 && this.cloneDetectionRadius > 0) {
      // ✅ Логируем, почему не проверяем детекцию (для диагностики)
      if (this.isSpawning || this.currentState === EnemyState.SPAWNING ||
        this.currentState === EnemyState.DETECTING || this.currentState === EnemyState.DYING) {
        // Это нормально - враг уже в процессе клонирования или умирает
      } else if (this.isClone && !this.clonesCanClone) {
        // Это нормально - клон не может клонироваться
      } else {
        logger.log('ENEMY_DETECTION', 'Skipping detection check', {
          enemyId: this.enemyId,
          type: this.type,
          isClone: this.isClone,
          cloneCount: this.cloneCount,
          clonesCanClone: this.clonesCanClone,
          cloneDetectionRadius: this.cloneDetectionRadius,
          isSpawning: this.isSpawning,
          currentState: this.currentState
        });
      }
    }

    // ✅ Обновляем AI только если не в специальных состояниях
    // ✅ Мигание (startCloneBlinkAnimation) - это только визуальный эффект, не блокирует движение
    // ✅ isSpawning блокирует только процесс клонирования (создание новых врагов), не движение
    // ✅ SPAWNING состояние НЕ блокирует движение - враг должен двигаться даже во время мигания
    // ✅ Примечание: проверка на DEAD не нужна здесь, так как она уже выполнена на строке 427
    if (this.currentState !== EnemyState.DYING) {
      // ✅ Разрешаем updateAI даже во время SPAWNING - враг должен двигаться
      this.updateAI(player);
    }

    // ✅ Автоматически определяем IDLE/MOVING по velocity
    // ✅ Мигание (isBlinking) - это только визуальный эффект, не блокирует изменение состояния
    // ✅ isSpawning блокирует только процесс клонирования, не изменение состояния движения
    if ((this.currentState === EnemyState.IDLE || this.currentState === EnemyState.MOVING) &&
      !this.isSpawning) {
      const isMoving = Math.abs(this.sprite.body.velocity.x) > 1 ||
        Math.abs(this.sprite.body.velocity.y) > 1;
      if (isMoving && this.currentState === EnemyState.IDLE) {
        this.setState(EnemyState.MOVING);
      } else if (!isMoving && this.currentState === EnemyState.MOVING) {
        this.setState(EnemyState.IDLE);
      }
    }

    // ✅ Перерисовываем кольцо радиуса детекции каждый кадр (как у перса)
    // Показываем только если есть что показывать: преследование ИЛИ клонирование
    if (this.detectionRadiusCircle && this.showDetectionRadius &&
      (this.chaseRadius > 0 || (this.cloneCount > 0 && this.cloneDetectionRadius > 0))) {
      this.redrawDetectionRadiusCircle();
    } else if (this.detectionRadiusCircle &&
      !(this.chaseRadius > 0 || (this.cloneCount > 0 && this.cloneDetectionRadius > 0))) {
      // ✅ Если кольцо создано, но больше нечего показывать - уничтожаем его
      this.detectionRadiusCircle.destroy();
      this.detectionRadiusCircle = undefined;
    }

    // ✅ ОБНОВЛЯЕМ АНИМАЦИЮ АВТОМАТИЧЕСКИ (без ручной синхронизации!)
    // НЕ обновляем анимацию только во время смерти (DYING)
    // Во время мигания (SPAWNING) анимация должна продолжаться, чтобы базовый спрайт воспроизводился
    if (this.currentState !== EnemyState.DYING) {
      this.animationHandler.playDirectionAnimation(
        this.sprite.body.velocity.x,
        this.sprite.body.velocity.y
      );

      // ✅ КРИТИЧНО: Для physics спрайтов нужно синхронизировать кадры вручную
      this.animationHandler.syncFrame();
    }
  }

  // ✅ Методы updateAnimation и playAnimation удалены - теперь используется SpriteAnimationHandler

  /**
   * Обработать детекцию игрока
   */
  protected handlePlayerDetection(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    // ✅ Проверка: если сцена на паузе, не начинаем клонирование
    if ((this.scene?.scene?.isPaused && this.scene.scene.isPaused()) ||
      this.scene.physics.world.isPaused) {
      logger.log('ENEMY_DETECTION', 'Scene/Physics is paused - skipping cloning', {
        enemyId: this.enemyId,
        type: this.type,
        scenePaused: this.scene?.scene?.isPaused(),
        physicsPaused: this.scene.physics.world.isPaused
      });
      return;
    }

    // ✅ Проверка: если cloneCount = 0, не запускаем клонирование
    if (this.cloneCount === 0) {
      logger.log('ENEMY_DETECTION', 'Cloning disabled - cloneCount is 0', {
        enemyId: this.enemyId,
        type: this.type,
        cloneCount: this.cloneCount
      });
      return;
    }

    logger.log('ENEMY_DETECTION', 'Player detected', {
      enemyId: this.enemyId,
      type: this.type,
      distance: Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.x, player.y),
      cloneDetectionRadius: this.cloneDetectionRadius,
      cloneCount: this.cloneCount,
      currentState: this.currentState,
      isSpawning: this.isSpawning
    });

    // ✅ Переходим сразу в SPAWNING для начала клонирования (пропускаем DETECTING)
    logger.log('ENEMY_DETECTION', 'Setting state to SPAWNING', {
      enemyId: this.enemyId,
      type: this.type,
      currentState: this.currentState
    });
    this.setState(EnemyState.SPAWNING);
  }

  /**
   * Начать мигание белым (для клонов при создании)
   */
  public startCloneBlinkAnimation(): void {
    // ✅ Очищаем предыдущие таймеры
    if (this.cloneBlinkTimer) {
      this.cloneBlinkTimer.destroy();
      this.cloneBlinkTimer = undefined;
    }
    if (this.cloneBlinkCleanup) {
      this.cloneBlinkCleanup.destroy();
      this.cloneBlinkCleanup = undefined;
    }

    // ✅ Сохраняем оригинальный blend mode
    // ❗ КРИТИЧНО: Если blend mode уже SCREEN (3), значит предыдущее мигание еще работает
    // В этом случае нужно сохранить NORMAL (0), а не текущий SCREEN!
    const originalBlendMode = this.sprite.blendMode === Phaser.BlendModes.SCREEN
      ? Phaser.BlendModes.NORMAL
      : this.sprite.blendMode;

    // ✅ Восстанавливаем состояние перед началом
    this.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
    this.sprite.clearTint();
    this.sprite.setAlpha(1); // Всегда восстанавливаем до 1
    this.isBlinking = false;

    // Мигание белым цветом в течение 1 секунды (как у родителя)
    const blinkDuration = 1000; // 1000ms = 1 секунда общая длительность
    const blinkInterval = 50; // 50ms между переключениями
    const maxBlinks = Math.floor(blinkDuration / blinkInterval); // 20 миганий

    let blinkCount = 0;
    let isWhite = true;

    // ✅ Устанавливаем флаг мигания
    this.isBlinking = true;

    // ✅ Начинаем с белого тинта с ярким blend mode (SCREEN - самый яркий)
    this.sprite.setBlendMode(Phaser.BlendModes.SCREEN);
    this.sprite.setTint(0xffffff);
    logger.log('ENEMY_SPAWNING', 'Clone blink started - white tint with SCREEN blend mode', {
      enemyId: this.enemyId,
      type: this.type,
      isClone: this.isClone
    });

    // ✅ Создаем интервал и сохраняем ссылку
    this.cloneBlinkTimer = this.scene.time.addEvent({
      delay: blinkInterval,
      repeat: maxBlinks - 1,
      callback: () => {
        if (!this.sprite || !this.sprite.active) {
          if (this.cloneBlinkTimer) {
            this.cloneBlinkTimer.destroy();
            this.cloneBlinkTimer = undefined;
          }
          this.isBlinking = false;
          return;
        }
        blinkCount++;
        isWhite = !isWhite;
        if (isWhite) {
          // ✅ Белый тинт с ярким blend mode
          this.sprite.setBlendMode(Phaser.BlendModes.SCREEN);
          this.sprite.setTint(0xffffff);
        } else {
          // ✅ Убираем тинт и восстанавливаем оригинальный blend mode
          this.sprite.setBlendMode(originalBlendMode);
          this.sprite.clearTint();
        }
      },
      callbackScope: this
    });

    // ✅ Создаем cleanup таймер и сохраняем ссылку
    this.cloneBlinkCleanup = this.scene.time.delayedCall(blinkDuration, () => {
      this.isBlinking = false;
      if (this.sprite && this.sprite.active) {
        this.sprite.setBlendMode(originalBlendMode);
        this.sprite.clearTint();
      }
      if (this.cloneBlinkTimer) {
        this.cloneBlinkTimer.destroy();
        this.cloneBlinkTimer = undefined;
      }
      this.cloneBlinkCleanup = undefined;
    });
  }

  /**
   * Начать анимацию клонирования (мигание)
   */
  protected startSpawningAnimation(): void {
    // ✅ Проверка: если сцена на паузе, не начинаем клонирование
    if ((this.scene?.scene?.isPaused && this.scene.scene.isPaused()) ||
      this.scene.physics.world.isPaused) {
      logger.log('ENEMY_SPAWNING', 'Scene/Physics is paused - skipping spawn animation', {
        enemyId: this.enemyId,
        type: this.type,
        scenePaused: this.scene?.scene?.isPaused(),
        physicsPaused: this.scene.physics.world.isPaused
      });
      // Возвращаемся в предыдущее состояние
      this.setState(this.previousState);
      return;
    }

    if (this.isSpawning) return; // Уже в процессе клонирования

    this.isSpawning = true;
    logger.log('ENEMY_SPAWNING', 'Starting spawn animation', {
      enemyId: this.enemyId,
      type: this.type,
      cloneCount: this.cloneCount,
      cloneDetectionRadius: this.cloneDetectionRadius
    });

    // ✅ Очищаем ВСЕ предыдущие таймеры
    if (this.spawnBlinkTween) {
      if ((this.spawnBlinkTween as any).destroy) {
        (this.spawnBlinkTween as any).destroy();
      }
      this.spawnBlinkTween = undefined;
    }
    if (this.spawnBlinkCleanup) {
      this.spawnBlinkCleanup.destroy();
      this.spawnBlinkCleanup = undefined;
    }

    // ✅ Сохраняем оригинальный blend mode
    const originalBlendMode = this.sprite.blendMode;

    // ✅ Восстанавливаем состояние перед началом
    this.sprite.setBlendMode(originalBlendMode);
    this.sprite.clearTint();
    this.isBlinking = false;

    // Мигание белым цветом в течение 1 секунды
    const blinkDuration = 1000; // 1000ms = 1 секунда общая длительность
    const blinkInterval = 50; // 50ms между переключениями
    const maxBlinks = Math.floor(blinkDuration / blinkInterval); // 20 миганий

    let blinkCount = 0;
    let isWhite = true;

    // ✅ Устанавливаем флаг мигания
    this.isBlinking = true;

    // ✅ Начинаем с белого тинта с ярким blend mode (SCREEN - самый яркий режим наложения)
    this.sprite.setBlendMode(Phaser.BlendModes.SCREEN);
    this.sprite.setTint(0xffffff);
    logger.log('ENEMY_SPAWNING', 'Blink started - white tint with SCREEN blend mode', {
      enemyId: this.enemyId,
      type: this.type,
      spriteActive: this.sprite.active,
      spriteVisible: this.sprite.visible,
      spriteTint: this.sprite.tint,
      blendMode: this.sprite.blendMode
    });

    // Создаем интервал для мигания белым
    const blinkTimer = this.scene.time.addEvent({
      delay: blinkInterval,
      repeat: maxBlinks - 1,
      callback: () => {
        if (!this.sprite || !this.sprite.active) {
          logger.log('ENEMY_SPAWNING', 'Blink callback - sprite inactive, stopping', {
            enemyId: this.enemyId,
            type: this.type
          });
          if (blinkTimer && blinkTimer.destroy) {
            blinkTimer.destroy();
          }
          this.isBlinking = false;
          return;
        }
        blinkCount++;
        isWhite = !isWhite;
        if (isWhite) {
          // ✅ Белый тинт с ярким blend mode (SCREEN - самый яркий)
          this.sprite.setBlendMode(Phaser.BlendModes.SCREEN);
          this.sprite.setTint(0xffffff);
          logger.log('ENEMY_SPAWNING', `Blink ${blinkCount}/${maxBlinks} - white tint with SCREEN blend`, {
            enemyId: this.enemyId,
            type: this.type,
            spriteTint: this.sprite.tint,
            blendMode: this.sprite.blendMode
          });
        } else {
          // ✅ Убираем тинт и восстанавливаем оригинальный blend mode
          this.sprite.setBlendMode(originalBlendMode);
          this.sprite.clearTint();
          logger.log('ENEMY_SPAWNING', `Blink ${blinkCount}/${maxBlinks} - clear tint`, {
            enemyId: this.enemyId,
            type: this.type,
            spriteTint: this.sprite.tint,
            blendMode: this.sprite.blendMode
          });
        }
      },
      callbackScope: this
    });

    // Сохраняем ссылку на таймер для очистки
    (this.spawnBlinkTween as any) = blinkTimer;

    // ✅ Создаем клонов сразу (параллельно с миганием), но НЕ меняем состояние и флаги
    // Состояние и флаги будут изменены после завершения мигания
    // ✅ Проверяем cloneCount перед созданием клонов
    if (this.cloneCount > 0) {
      this.createClones();
    }

    // ✅ Создаем cleanup таймер и сохраняем ссылку
    this.spawnBlinkCleanup = this.scene.time.delayedCall(blinkDuration, () => {
      logger.log('ENEMY_SPAWNING', 'Blink completed, finishing spawn', {
        enemyId: this.enemyId,
        type: this.type,
        totalBlinks: blinkCount
      });
      this.isBlinking = false;
      // ✅ Восстанавливаем оригинальный blend mode и убираем тинт
      if (this.sprite && this.sprite.active) {
        this.sprite.setBlendMode(originalBlendMode);
        this.sprite.clearTint();
      }
      if (blinkTimer && blinkTimer.destroy) {
        blinkTimer.destroy();
      }
      this.spawnBlinkTween = undefined;
      this.spawnBlinkCleanup = undefined;
      // ✅ Только теперь завершаем клонирование и меняем состояние
      this.completeSpawning();
    });
  }

  /**
   * Завершить клонирование (вызывается после завершения мигания)
   */
  protected completeSpawning(): void {
    logger.log('ENEMY_SPAWNING', 'Completing spawn', {
      enemyId: this.enemyId,
      type: this.type,
      cloneCount: this.cloneCount,
      isClone: this.isClone,
      cloneDetectionRadius: this.cloneDetectionRadius,
      chaseRadius: this.chaseRadius,
      showDetectionRadius: this.showDetectionRadius,
      currentState: this.currentState
    });

    // ✅ Сбрасываем флаг клонирования (родитель снова может клонироваться после cooldown)
    this.isSpawning = false;

    // Меняем направление движения на случайное (для родителя)
    const randomAngle = Phaser.Math.Between(0, 360);
    this.scene.physics.velocityFromAngle(randomAngle, this.baseSpeed, this.sprite.body.velocity);

    // ✅ Возвращаемся в нормальное состояние (WANDERING)
    // Родитель должен вернуться в WANDERING, чтобы снова мог клонироваться
    this.setState(EnemyState.WANDERING);

    // ✅ Проверяем, что родитель сохранил свои свойства
    logger.log('ENEMY_SPAWNING', 'After completing spawn - parent properties', {
      enemyId: this.enemyId,
      isClone: this.isClone,
      cloneCount: this.cloneCount,
      cloneDetectionRadius: this.cloneDetectionRadius,
      showDetectionRadius: this.showDetectionRadius,
      hasDetectionCircle: !!this.detectionRadiusCircle
    });
  }

  /**
   * Создать клонов врага
   * Спавним с задержкой между каждым клоном
   */
  protected createClones(): void {
    // ✅ Проверка: если сцена на паузе, не создаем клонов
    if ((this.scene?.scene?.isPaused && this.scene.scene.isPaused()) ||
      this.scene.physics.world.isPaused) {
      logger.log('ENEMY_SPAWNING', 'Scene/Physics is paused - skipping clone creation', {
        enemyId: this.enemyId,
        type: this.type,
        scenePaused: this.scene?.scene?.isPaused(),
        physicsPaused: this.scene.physics.world.isPaused
      });
      return;
    }

    // ✅ Проверяем cloneCount перед созданием клонов
    if (this.cloneCount === 0) {
      logger.log('ENEMY_SPAWNING', 'Cannot create clones - cloneCount is 0', {
        enemyId: this.enemyId,
        type: this.type,
        cloneCount: this.cloneCount
      });
      return;
    }

    if (!this.scene.data || typeof this.scene.data.get !== 'function') {
      logger.log('ENEMY_SPAWNING', 'Cannot create clones - scene.data not available', {
        hasData: !!this.scene.data,
        dataType: typeof this.scene.data.get
      });
      return;
    }

    // Получаем callback для создания клонов из сцены
    const createCloneCallback = this.scene.data.get('createEnemyClone');
    if (!createCloneCallback || typeof createCloneCallback !== 'function') {
      logger.log('ENEMY_SPAWNING', 'Cannot create clones - createEnemyClone callback not found', {
        hasCallback: !!createCloneCallback,
        callbackType: typeof createCloneCallback
      });
      return;
    }

    logger.log('ENEMY_SPAWNING', 'Creating clones', {
      enemyId: this.enemyId,
      type: this.type,
      cloneCount: this.cloneCount,
      cloneSpawnDelay: this.cloneSpawnDelay,
      parentX: this.sprite.x,
      parentY: this.sprite.y,
      clonesCanClone: this.clonesCanClone,
      cloneLifetime: this.cloneLifetime
    });

    // Создаем клонов с задержкой между каждым
    for (let i = 0; i < this.cloneCount; i++) {
      const delay = i * this.cloneSpawnDelay;

      this.scene.time.delayedCall(delay, () => {
        // ✅ Проверка: если сцена на паузе, не создаем клона
        if ((this.scene?.scene?.isPaused && this.scene.scene.isPaused()) ||
          this.scene.physics.world.isPaused) {
          logger.log('ENEMY_SPAWNING', `Scene/Physics is paused - skipping clone ${i + 1}/${this.cloneCount}`, {
            enemyId: this.enemyId,
            type: this.type,
            scenePaused: this.scene?.scene?.isPaused(),
            physicsPaused: this.scene.physics.world.isPaused
          });
          return;
        }

        // Небольшое смещение, чтобы клоны не накладывались друг на друга
        const offsetX = (Math.random() - 0.5) * 20; // ±10 пикселей
        const offsetY = (Math.random() - 0.5) * 20;
        const cloneX = this.sprite.x + offsetX;
        const cloneY = this.sprite.y + offsetY;

        // Случайное направление движения для каждого клона
        const cloneAngle = Phaser.Math.Between(0, 360);

        // Вызываем callback для создания клона
        try {
          logger.log('ENEMY_SPAWNING', `Creating clone ${i + 1}/${this.cloneCount}`, {
            x: cloneX,
            y: cloneY,
            angle: cloneAngle,
            delay: delay
          });

          createCloneCallback({
            type: this.type,
            x: cloneX,
            y: cloneY,
            speed: this.baseSpeed,
            health: this.maxHealth,
            damage: this.damage,
            isClone: true,
            parentId: this.enemyId,
            spawnTime: this.scene.time.now,
            cloneDetectionRadius: this.cloneDetectionRadius,
            chaseRadius: this.chaseRadius,
            chaseSpeed: this.chaseSpeed,
            cloneCount: this.clonesCanClone ? this.cloneCount : 0, // Клоны получают cloneCount только если могут клонироваться
            clonesCanClone: this.clonesCanClone,
            cloneLifetime: this.cloneLifetime,
            cloneSpawnDelay: this.cloneSpawnDelay,
            showDetectionRadius: this.showDetectionRadius,
            initialAngle: cloneAngle,
            shouldBlink: true // Флаг для мигания при создании
          });

          logger.log('ENEMY_SPAWNING', `Clone ${i + 1}/${this.cloneCount} created successfully`);
        } catch (error) {
          logger.log('ENEMY_SPAWNING', `Error creating clone ${i + 1}`, { error });
          console.error('Error creating clone:', error);
        }
      });
    }

    logger.log('ENEMY_SPAWNING', 'All clones creation scheduled', {
      requestedCount: this.cloneCount,
      totalDelay: (this.cloneCount - 1) * this.cloneSpawnDelay
    });
  }

  /**
   * Обработка коллизии с игроком
   */
  public onPlayerCollision(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    logger.log('ENEMY_COLLISION', 'onPlayerCollision called', {
      isDying: this.isDying,
      currentHealth: this.health,
      maxHealth: this.maxHealth,
      enemyType: this.type
    });

    if (this.isDying) {
      logger.log('ENEMY_COLLISION', 'Early return - isDying', {
        isDying: this.isDying
      });
      return;
    }

    // Уменьшаем здоровье
    this.health--;

    logger.log('ENEMY_COLLISION', 'Health decreased', {
      newHealth: this.health,
      maxHealth: this.maxHealth,
      willDie: this.health <= 0
    });

    // Переходим в состояние DAMAGED
    this.setState(EnemyState.DAMAGED);

    // Если здоровье закончилось - враг умирает
    if (this.health <= 0) {
      logger.log('ENEMY_COLLISION', 'Enemy will die - calling playDeathAnimation(true)', {
        health: this.health
      });
      this.isDying = true;
      this.sprite.disableBody(true, false);
      // Переходим в состояние DYING
      this.setState(EnemyState.DYING);
      // Проигрываем анимацию смерти (враг исчезнет после анимации)
      this.playDeathAnimation(true);
    } else {
      logger.log('ENEMY_COLLISION', 'Enemy will survive - calling playDeathAnimation(false)', {
        health: this.health
      });
      // Если здоровье еще есть - проигрываем анимацию смерти поверх основного спрайта
      this.playDeathAnimation(false);
      // Возвращаемся в предыдущее состояние после получения урона
      this.scene.time.delayedCall(300, () => {
        if (this.currentState === EnemyState.DAMAGED) {
          this.setState(this.previousState);
        }
      });
    }
  }

  /**
   * Проиграть анимацию смерти врага
   * @param isFinalDeath - если true, враг умрет после анимации (заменяем текстуру основного спрайта); если false, анимация проиграется поверх основного спрайта
   * Анимация проигрывается один раз, без цикла
   */
  protected playDeathAnimation(isFinalDeath: boolean): void {
    // ✅ Удаляем кольцо радиуса детекции при смерти
    if (this.detectionRadiusCircle) {
      this.detectionRadiusCircle.destroy();
      this.detectionRadiusCircle = undefined;
    }
    logger.log('ENEMY_ANIMATION', 'playDeathAnimation called', {
      isFinalDeath,
      spriteActive: this.sprite?.active,
      spriteVisible: this.sprite?.visible,
      currentHealth: this.health,
      hasDeathAnimationSprite: !!this.deathAnimationSprite,
      deathAnimationSpriteActive: this.deathAnimationSprite?.active
    });

    // ✅ Для финальной смерти сохраняем позицию ДО проверки активности
    // так как спрайт может быть уже неактивен после первого столкновения
    let savedX: number | undefined;
    let savedY: number | undefined;
    if (isFinalDeath && this.sprite) {
      savedX = this.sprite.x;
      savedY = this.sprite.y;
      logger.log('ENEMY_ANIMATION', 'Saved sprite position for final death', {
        x: savedX,
        y: savedY,
        spriteActive: this.sprite.active
      });
    }

    // ✅ Для не финальной смерти проверяем активность спрайта
    // Для финальной смерти продолжаем даже если спрайт неактивен
    if (!isFinalDeath && (!this.sprite || !this.sprite.active)) {
      logger.log('ENEMY_ANIMATION', 'Early return - sprite not active (non-final death)', {
        hasSprite: !!this.sprite,
        spriteActive: this.sprite?.active
      });
      return;
    }

    // ✅ Для финальной смерти проверяем только наличие спрайта
    if (isFinalDeath && !this.sprite) {
      logger.log('ENEMY_ANIMATION', 'Early return - no sprite (final death)', {
        hasSprite: false
      });
      return;
    }

    // Проверяем, что анимация существует
    if (!this.scene.anims.exists('enemy_death')) {
      logger.log('ENEMY_ANIMATION', 'Animation not found, using fallback', {
        isFinalDeath
      });
      console.warn('AbstractEnemy: enemy_death animation not found, using fallback');
      if (isFinalDeath) {
        // Fallback на мигание, если анимация не найдена
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0.2,
          duration: 100,
          yoyo: true,
          repeat: 4,
          onComplete: () => {
            this.destroy();
          }
        });
      }
      return;
    }

    if (isFinalDeath) {
      logger.log('ENEMY_ANIMATION', 'FINAL DEATH - Starting animation setup', {
        hasPreviousAnimation: !!this.deathAnimationSprite,
        previousAnimationActive: this.deathAnimationSprite?.active,
        spriteVisible: this.sprite.visible,
        spriteX: this.sprite.x,
        spriteY: this.sprite.y
      });

      // ✅ ФИНАЛЬНАЯ СМЕРТЬ: Создаем отдельный спрайт для анимации смерти
      // ✅ Уничтожаем предыдущую анимацию смерти, если она была (от не финальной смерти)
      if (this.deathAnimationSprite && this.deathAnimationSprite.active) {
        logger.log('ENEMY_ANIMATION', 'Destroying previous death animation sprite', {
          spriteActive: this.deathAnimationSprite.active,
          spriteVisible: this.deathAnimationSprite.visible
        });
        this.deathAnimationSprite.destroy();
        this.deathAnimationSprite = undefined;
      }

      // Останавливаем текущую анимацию движения
      if (this.animationHandler) {
        this.animationHandler.stop();
      }
      if (this.sprite && this.sprite.anims) {
        this.sprite.anims.stop();
      }

      // Отключаем физику основного спрайта (если еще не отключена)
      if (this.sprite && this.sprite.body) {
        this.sprite.disableBody(true, false);
      }

      // ✅ Используем сохраненную позицию, если спрайт был неактивен
      const currentX = savedX !== undefined ? savedX : (this.sprite?.x ?? 0);
      const currentY = savedY !== undefined ? savedY : (this.sprite?.y ?? 0);

      logger.log('ENEMY_ANIMATION', 'Using position for final death animation', {
        x: currentX,
        y: currentY,
        usedSavedPosition: savedX !== undefined
      });

      // Центрируем анимацию (размер кадра врага 16x16, анимация 32x32)
      // Смещаем на половину разницы размеров
      const offsetX = (32 - 16) / 2;
      const offsetY = (32 - 16) / 2;

      logger.log('ENEMY_ANIMATION', 'Creating death animation sprite', {
        position: { x: currentX - offsetX, y: currentY - offsetY },
        offset: { x: offsetX, y: offsetY },
        spritePosition: { x: currentX, y: currentY }
      });

      // Создаем отдельный спрайт для анимации смерти (обычный спрайт, не physics)
      this.deathAnimationSprite = this.scene.add.sprite(
        currentX - offsetX,
        currentY - offsetY,
        'enemy_death'
      );

      // Устанавливаем глубину выше основного спрайта
      this.deathAnimationSprite.setDepth(this.sprite.depth + 1);
      // Масштабируем так же, как основной спрайт
      this.deathAnimationSprite.setScale(BASE_SCALE * ACTOR_SIZES.ENEMY);

      // ✅ Скрываем основной спрайт (даже если он неактивен)
      logger.log('ENEMY_ANIMATION', 'Hiding main sprite', {
        spriteVisibleBefore: this.sprite?.visible,
        spriteActive: this.sprite?.active,
        hasSprite: !!this.sprite
      });
      if (this.sprite) {
        this.sprite.setVisible(false);
        logger.log('ENEMY_ANIMATION', 'Main sprite hidden', {
          spriteVisibleAfter: this.sprite.visible
        });
      } else {
        logger.log('ENEMY_ANIMATION', 'Cannot hide sprite - sprite is null');
      }

      // Проигрываем анимацию один раз
      // ✅ Для обычных спрайтов нужна ручная синхронизация кадров
      if (this.deathAnimationSprite.anims && this.scene.anims.exists('enemy_death')) {
        logger.log('ENEMY_ANIMATION', 'Starting death animation playback', {
          hasAnims: !!this.deathAnimationSprite.anims,
          animationExists: this.scene.anims.exists('enemy_death'),
          spriteActive: this.deathAnimationSprite.active,
          spriteVisible: this.deathAnimationSprite.visible
        });

        // ✅ Останавливаем анимацию, если она уже играет (на всякий случай)
        this.deathAnimationSprite.anims.stop();
        // ✅ Сбрасываем флаги ручной синхронизации кадров
        (this.deathAnimationSprite as any)._animationInitialized = false;
        (this.deathAnimationSprite as any)._animationFrameIndex = 0;
        (this.deathAnimationSprite as any)._animationTimer = 0;
        (this.deathAnimationSprite as any)._lastFrameShown = false; // ✅ Сбрасываем флаг последнего кадра
        // ✅ НЕ используем play() для обычных спрайтов - используем ручную синхронизацию в MainScene
        // this.deathAnimationSprite.play('enemy_death', false); // Отключено - используем ручную синхронизацию

        logger.log('ENEMY_ANIMATION', 'Death animation sprite created, using manual sync', {
          animationKey: 'enemy_death',
          spriteActive: this.deathAnimationSprite.active,
          spriteVisible: this.deathAnimationSprite.visible
        });

        // ✅ Уничтожение спрайта происходит в MainScene после показа последнего кадра
        // Используем ручную синхронизацию кадров вместо события animationcomplete
      } else {
        logger.log('ENEMY_ANIMATION', 'Animation not available, using fallback', {
          hasAnims: !!this.deathAnimationSprite?.anims,
          animationExists: this.scene.anims.exists('enemy_death')
        });
        console.warn('AbstractEnemy: enemy_death animation not available, destroying immediately');
        // Fallback: уничтожаем сразу
        this.scene.time.delayedCall(500, () => {
          this.destroy();
        });
      }
    } else {
      logger.log('ENEMY_ANIMATION', 'NON-FINAL DEATH - Starting animation setup', {
        hasPreviousAnimation: !!this.deathAnimationSprite,
        previousAnimationActive: this.deathAnimationSprite?.active,
        spriteVisible: this.sprite.visible,
        spriteActive: this.sprite.active,
        spriteX: this.sprite.x,
        spriteY: this.sprite.y,
        currentHealth: this.health
      });

      // ✅ НЕ ФИНАЛЬНАЯ СМЕРТЬ: Проигрываем анимацию поверх основного спрайта
      // ✅ Уничтожаем предыдущую анимацию смерти, если она была (включая таймер обновления позиции)
      if (this.deathAnimationSprite && this.deathAnimationSprite.active) {
        logger.log('ENEMY_ANIMATION', 'Destroying previous non-final death animation', {
          spriteActive: this.deathAnimationSprite.active,
          spriteVisible: this.deathAnimationSprite.visible,
          hasUpdateTimer: !!(this.deathAnimationSprite as any)._updateTimer
        });

        // Уничтожаем таймер обновления позиции, если он был
        const updateTimer = (this.deathAnimationSprite as any)._updateTimer;
        if (updateTimer) {
          updateTimer.destroy();
          logger.log('ENEMY_ANIMATION', 'Update timer destroyed');
        }
        this.deathAnimationSprite.destroy();
        this.deathAnimationSprite = undefined;
        logger.log('ENEMY_ANIMATION', 'Previous animation sprite destroyed');
      }

      // Создаем отдельный спрайт для анимации смерти поверх основного
      const currentX = this.sprite.x;
      const currentY = this.sprite.y;

      // Центрируем анимацию (размер кадра врага 16x16, анимация 32x32)
      // Смещаем на половину разницы размеров
      const offsetX = (32 - 16) / 2;
      const offsetY = (32 - 16) / 2;

      logger.log('ENEMY_ANIMATION', 'Creating non-final death animation sprite', {
        position: { x: currentX - offsetX, y: currentY - offsetY },
        offset: { x: offsetX, y: offsetY },
        spritePosition: { x: currentX, y: currentY }
      });

      this.deathAnimationSprite = this.scene.add.sprite(
        currentX - offsetX,
        currentY - offsetY,
        'enemy_death'
      );

      // Устанавливаем глубину выше основного спрайта
      this.deathAnimationSprite.setDepth(this.sprite.depth + 1);
      // Масштабируем так же, как основной спрайт
      this.deathAnimationSprite.setScale(BASE_SCALE * ACTOR_SIZES.ENEMY);

      logger.log('ENEMY_ANIMATION', 'Death animation sprite created', {
        spriteActive: this.deathAnimationSprite.active,
        spriteVisible: this.deathAnimationSprite.visible,
        depth: this.deathAnimationSprite.depth,
        scale: this.deathAnimationSprite.scale
      });

      // Синхронизируем позицию с основным спрайтом
      const updatePosition = () => {
        if (this.deathAnimationSprite && this.sprite && this.sprite.active) {
          this.deathAnimationSprite.setPosition(
            this.sprite.x - offsetX,
            this.sprite.y - offsetY
          );
        } else {
          // Если основной спрайт неактивен, останавливаем обновление
          return false;
        }
        return true;
      };

      // Обновляем позицию каждый кадр
      const updateTimer = this.scene.time.addEvent({
        delay: 16, // ~60 FPS
        callback: updatePosition,
        loop: true
      });

      // ✅ Сохраняем ссылку на таймер в спрайте для последующего уничтожения
      (this.deathAnimationSprite as any)._updateTimer = updateTimer;

      logger.log('ENEMY_ANIMATION', 'Update timer created', {
        delay: 16,
        hasTimer: !!updateTimer
      });

      // Проигрываем анимацию один раз
      // ✅ Для обычных спрайтов нужна ручная синхронизация кадров
      if (this.deathAnimationSprite.anims && this.scene.anims.exists('enemy_death')) {
        logger.log('ENEMY_ANIMATION', 'Starting non-final death animation playback', {
          hasAnims: !!this.deathAnimationSprite.anims,
          animationExists: this.scene.anims.exists('enemy_death'),
          spriteActive: this.deathAnimationSprite.active,
          spriteVisible: this.deathAnimationSprite.visible
        });

        // ✅ Останавливаем анимацию, если она уже играет (на всякий случай)
        this.deathAnimationSprite.anims.stop();
        // ✅ Сбрасываем флаги ручной синхронизации кадров
        (this.deathAnimationSprite as any)._animationInitialized = false;
        (this.deathAnimationSprite as any)._animationFrameIndex = 0;
        (this.deathAnimationSprite as any)._animationTimer = 0;
        (this.deathAnimationSprite as any)._lastFrameShown = false; // ✅ Сбрасываем флаг последнего кадра
        // ✅ НЕ используем play() для обычных спрайтов - используем ручную синхронизацию в MainScene
        // this.deathAnimationSprite.play('enemy_death', false); // Отключено - используем ручную синхронизацию

        logger.log('ENEMY_ANIMATION', 'Non-final death animation sprite created, using manual sync', {
          animationKey: 'enemy_death',
          spriteActive: this.deathAnimationSprite.active,
          spriteVisible: this.deathAnimationSprite.visible
        });

        // ✅ Уничтожение спрайта происходит в MainScene после показа последнего кадра
        // Используем ручную синхронизацию кадров вместо события animationcomplete
        // Таймер обновления позиции уничтожается в MainScene
      } else {
        logger.log('ENEMY_ANIMATION', 'Animation not available for non-final death, using fallback', {
          hasAnims: !!this.deathAnimationSprite?.anims,
          animationExists: this.scene.anims.exists('enemy_death')
        });
        console.warn('AbstractEnemy: enemy_death animation not available for non-final death');
        // Fallback: скрываем анимацию через время
        this.scene.time.delayedCall(500, () => {
          if (updateTimer) {
            updateTimer.destroy();
          }
          if (this.deathAnimationSprite) {
            this.deathAnimationSprite.destroy();
            this.deathAnimationSprite = undefined;
          }
        });
      }
    }
  }

  /**
   * Получить урон, наносимый игроку
   */
  public getDamage(): number {
    return this.damage;
  }

  /**
   * Получить спрайт
   */
  public getSprite(): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    return this.sprite;
  }

  /**
   * Получить тип врага
   */
  public getType(): EnemyType {
    return this.type;
  }

  /**
   * Получить позицию
   */
  public getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /**
   * Получить настройки поведения
   */
  public getBehaviorConfig(): {
    cloneDetectionRadius: number;
    chaseRadius: number;
    clonesCanClone: boolean;
    cloneLifetime: number;
    cloneCount: number;
  } {
    return {
      cloneDetectionRadius: this.cloneDetectionRadius,
      chaseRadius: this.chaseRadius,
      cloneCount: this.cloneCount,
      clonesCanClone: this.clonesCanClone,
      cloneLifetime: this.cloneLifetime
    };
  }

  /**
   * Получить ID врага
   */
  public getId(): string {
    return this.enemyId;
  }

  /**
   * Проверить, является ли враг клоном
   */
  public getIsClone(): boolean {
    return this.isClone;
  }

  /**
   * Проверить, активен ли враг
   */
  public isActive(): boolean {
    return this.sprite && this.sprite.active && !this.isDying;
  }

  /**
   * Проверить, виден ли враг на камере
   */
  public isVisibleOnCamera(): boolean {
    if (!this.sprite || !this.sprite.active) {
      return false;
    }

    try {
      const camera = this.scene.cameras.main;
      if (!camera) {
        return false;
      }

      const worldView = camera.worldView;
      const spriteX = this.sprite.x;
      const spriteY = this.sprite.y;

      // Проверяем, находится ли позиция спрайта в пределах видимой области камеры
      return spriteX >= worldView.x &&
        spriteX <= worldView.x + worldView.width &&
        spriteY >= worldView.y &&
        spriteY <= worldView.y + worldView.height;
    } catch (error) {
      logger.log('ENEMY_SPAWNING', 'Error checking camera visibility', {
        error,
        enemyId: this.enemyId,
        type: this.type
      });
      return false;
    }
  }

  /**
   * Уничтожить врага и очистить ресурсы
   */
  public destroy(): void {
    logger.log('ENEMY_DESTROY', 'destroy() called', {
      health: this.health,
      isDying: this.isDying,
      currentState: this.currentState,
      hasDeathAnimationSprite: !!this.deathAnimationSprite,
      deathAnimationSpriteActive: this.deathAnimationSprite?.active,
      spriteActive: this.sprite?.active,
      spriteVisible: this.sprite?.visible
    });

    // 1. Останавливаем все таймеры и твины
    if (this.cloneBlinkTimer) {
      this.cloneBlinkTimer.destroy();
      this.cloneBlinkTimer = undefined;
    }
    if (this.cloneBlinkCleanup) {
      this.cloneBlinkCleanup.destroy();
      this.cloneBlinkCleanup = undefined;
    }
    if (this.spawnBlinkTween) {
      if ((this.spawnBlinkTween as any).destroy) {
        (this.spawnBlinkTween as any).destroy();
      }
      this.spawnBlinkTween = undefined;
    }
    if (this.spawnBlinkCleanup) {
      this.spawnBlinkCleanup.destroy();
      this.spawnBlinkCleanup = undefined;
    }

    // Убираем тинт на всякий случай
    if (this.sprite) {
      this.sprite.clearTint();
    }

    // 2. Уничтожаем графические объекты
    if (this.detectionRadiusCircle) {
      this.detectionRadiusCircle.destroy();
      this.detectionRadiusCircle = undefined;
    }

    if (this.deathAnimationSprite) {
      logger.log('ENEMY_DESTROY', 'Destroying death animation sprite', {
        spriteActive: this.deathAnimationSprite.active,
        spriteVisible: this.deathAnimationSprite.visible,
        hasUpdateTimer: !!(this.deathAnimationSprite as any)._updateTimer
      });

      // Уничтожаем таймер обновления позиции, если он был
      const updateTimer = (this.deathAnimationSprite as any)._updateTimer;
      if (updateTimer) {
        updateTimer.destroy();
      }

      this.deathAnimationSprite.destroy();
      this.deathAnimationSprite = undefined;
      logger.log('ENEMY_DESTROY', 'Death animation sprite destroyed');
    }

    // 3. Уничтожаем основной спрайт
    if (this.sprite) {
      logger.log('ENEMY_DESTROY', 'Destroying main sprite', {
        spriteActive: this.sprite.active,
        spriteVisible: this.sprite.visible
      });
      this.sprite.destroy();
      logger.log('ENEMY_DESTROY', 'Main sprite destroyed');
    }

    this.currentState = EnemyState.DEAD;
    this.isDying = true;
    logger.log('ENEMY_DESTROY', 'Enemy fully destroyed');
  }

  /**
   * Получить текущее здоровье
   */
  public getHealth(): number {
    return this.health;
  }

  /**
   * Получить максимальное здоровье
   */
  public getMaxHealth(): number {
    return this.maxHealth;
  }
}
