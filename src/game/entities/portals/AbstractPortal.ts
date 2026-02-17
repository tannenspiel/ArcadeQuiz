/**
 * Абстрактный базовый класс для всех порталов
 * Использует машину состояний PortalState
 */

import Phaser from 'phaser';
import {
  DEFAULT_FONT_FAMILY,
  PORTAL_LABEL_FONT_SIZE,
  PORTAL_ANSWER_FONT_SIZE,
  PORTAL_PROGRESS_FONT_SIZE,
  PORTAL_LABEL_FONT_STYLE,
  PORTAL_ANSWER_FONT_STYLE,
  PORTAL_PROGRESS_FONT_STYLE,
  PORTAL_LABEL_COLOR,
  PORTAL_ANSWER_COLOR,
  PORTAL_ANSWER_BACKGROUND_COLOR,
  PORTAL_PROGRESS_COLOR,
  PORTAL_PROGRESS_OPEN_COLOR
} from '../../../constants/textStyles';
import { PortalConfig, PortalState, PortalType } from '../../../types/portalTypes';
import { KEYS, ACTOR_SIZES, BASE_SCALE, SPRITE_SIZES, BUBBLE_SIZES, EVENTS, DEPTHS } from '../../../constants/gameConstants';
import { QuestionBubble, getGlobalBubbleFontSize } from '../../ui/QuestionBubble';
import { USE_QUESTION_BUBBLE } from '../../../config/gameConfig';
import { ParsedQuestion, QuestionType } from '../../../types/questionTypes';
import { QuizManager } from '../../systems/QuizManager';
import { calculateBubbleY } from '../../utils/BubblePositionCalculator';
import { EventBus } from '../../EventBus';
import { logger } from '../../../utils/Logger';

export abstract class AbstractPortal {
  protected sprite: Phaser.Physics.Arcade.Sprite;
  protected scene: Phaser.Scene;
  protected config: PortalConfig;
  protected currentState: PortalState;
  protected storedKeys: number = 0;
  protected readonly maxKeys: number = 3;
  protected label?: Phaser.GameObjects.Text;
  protected progressText?: Phaser.GameObjects.Text;
  protected answerBubble?: QuestionBubble; // ✅ Баббл для ответа портала
  protected readonly scale: number = BASE_SCALE * ACTOR_SIZES.PORTAL; // ✅ Размер портала (BASE_SCALE × множитель)
  protected damage: number = 1; // ✅ Урон, наносимый игроку при входе в неправильный портал
  protected _mustExit: boolean = false; // ✅ Флаг необходимости выхода из зоны портала
  protected useTiledMapTextures: boolean = false; // ✅ Использовать статичные текстуры для Tiled Map
  protected _collisionOverride: boolean = false; // ✅ Флаг отключения жесткой коллизии (для Overlap Mask)
  protected associatedCollisionBodies: Phaser.GameObjects.GameObject[] = []; // ✅ Связанные физические тела (для Tiled Map)

  /**
   * Получить букву портала (A, B, C)
   */
  protected getPortalLetter(): string {
    return String.fromCharCode(65 + (this.config.id - 1)); // A, B, C
  }

  /**
   * Получить ключ спрайтшита для базового состояния
   */
  protected getBaseSheetKey(): string {
    if (this.useTiledMapTextures) {
      return KEYS.PORTAL_BASE_NEW;
    }
    const letter = this.getPortalLetter().toLowerCase();
    return `portal_${letter}_base_sheet`;
  }

  /**
   * Получить ключ спрайтшита для состояния активации
   */
  protected getActivationSheetKey(): string {
    if (this.useTiledMapTextures) {
      return KEYS.PORTAL_ACTIVATION_NEW;
    }
    const letter = this.getPortalLetter().toLowerCase();
    return `portal_${letter}_activation_sheet`;
  }

  /**
   * Получить ключ спрайтшита для активированного состояния
   */
  protected getActivatedSheetKey(): string {
    if (this.useTiledMapTextures) {
      return KEYS.PORTAL_ACTIVATED_NEW;
    }
    const letter = this.getPortalLetter().toLowerCase();
    return `portal_${letter}_activated_sheet`;
  }

  /**
   * Получить ключ анимации для базового состояния
   */
  protected getBaseAnimKey(): string {
    if (this.useTiledMapTextures) {
      return 'portal_door_base'; // Общая анимация для всех порталов в Tiled Map режиме
    }
    const letter = this.getPortalLetter().toLowerCase();
    return `portal_${letter}_base`;
  }

  /**
   * Получить ключ анимации для состояния активации
   */
  protected getActivationAnimKey(keyNumber: number): string {
    if (this.useTiledMapTextures) {
      return 'portal_door_base'; // Tiled Map mode uses static base for activation (for now)
    }
    const letter = this.getPortalLetter().toLowerCase();
    return `portal_${letter}_activation_${keyNumber}x`;
  }

  /**
   * Получить ключ анимации для активированного состояния
   */
  protected getActivatedAnimKey(): string {
    if (this.useTiledMapTextures) {
      return 'portal_door_activated'; // Общая анимация для всех порталов в Tiled Map режиме
    }
    const letter = this.getPortalLetter().toLowerCase();
    return `portal_${letter}_activated`;
  }

  protected collisionBodies: Phaser.GameObjects.GameObject[] = [];

  constructor(
    scene: Phaser.Scene,
    config: PortalConfig,
    x: number,
    y: number
  ) {
    this.scene = scene;
    this.config = config;

    // ✅ Получаем урон из конфига портала (по умолчанию 1)
    this.damage = config.damage ?? 1;

    // ✅ Получаем флаг использования Tiled Map текстур
    this.useTiledMapTextures = config.useTiledMapTextures ?? false;

    // ✅ Получаем тела коллизий (voxels)
    this.collisionBodies = config.collisionBodies ?? [];

    // Инициализируем состояние
    this.currentState = PortalState.BASE;
    this.storedKeys = 0;

    // Создаем спрайт портала с базовым спрайтшитом или статичной текстурой
    const baseSheetKey = this.getBaseSheetKey();
    this.sprite = scene.physics.add.sprite(x, y, baseSheetKey);
    this.sprite.setData('config', config);
    this.sprite.setData('portal', this);
    this.sprite.setData('state', PortalState.BASE);
    this.sprite.setData('storedKeys', 0);
    this.sprite.setData('mustExit', false);
    this.sprite.setImmovable(true);
    this.sprite.setPushable(false);
    this.sprite.setDepth(DEPTHS.WORLD.TILED_MAP);
    this.sprite.setScale(this.scale);

    this.createLabels();

    // ✅ Слушаем клик по порталу
    this.sprite.on('pointerdown', this.onPortalClick, this);

    // Устанавливаем начальное визуальное состояние
    this.updateVisualState();

    // ✅ Слушаем событие активации Оракула
    EventBus.on(EVENTS.ORACLE_ACTIVATED, this.onOracleActivated, this);
  }

  /**
   * Обработчик активации Оракула
   */
  private onOracleActivated(): void {
    logger.log('PORTAL', `🔥 Portal ${this.config.id}: ORACLE_ACTIVATED event received!`);
    logger.log('PORTAL', `Portal ${this.config.id}: Current state BEFORE transition: ${this.currentState}`);
    logger.log('PORTAL', `Portal ${this.config.id}: Oracle activated! Transitioning from ${this.currentState} to ACTIVATING`);
    // Если портал еще в базовом состоянии, переводим в активацию
    if (this.currentState === PortalState.BASE) {
      this.setState(PortalState.ACTIVATING);
      logger.log('PORTAL', `Portal ${this.config.id}: State changed to ACTIVATING`);
    } else {
      logger.warn('PORTAL', `Portal ${this.config.id}: Cannot transition to ACTIVATING, current state is ${this.currentState}`);
    }
  }

  /**
   * Создать метки портала
   */
  protected createLabels(): void {
    const letter = String.fromCharCode(65 + (this.config.id - 1)); // A, B, C

    // ✅ Вычисляем позицию Y для названия портала
    // Правило: верхняя граница названия совпадает с нижней границей портала
    const portalHeight = SPRITE_SIZES.PORTAL.HEIGHT * BASE_SCALE * ACTOR_SIZES.PORTAL; // 48 * 4.0 * 1.0 = 192
    const portalBottom = this.sprite.y + (portalHeight / 2); // Нижняя граница портала

    // Создаем временный текст для получения его реальной высоты
    const tempText = this.scene.add.text(0, 0, `PORTAL ${letter}`, {
      fontSize: `${PORTAL_LABEL_FONT_SIZE}px`,
      fontFamily: DEFAULT_FONT_FAMILY,
      fontStyle: PORTAL_LABEL_FONT_STYLE,
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5);

    const textHeight = tempText.height;
    tempText.destroy(); // Удаляем временный текст

    // Центр текста = нижняя граница портала + (высота текста / 2)
    const labelY = portalBottom + (textHeight / 2);

    // ✅ Постоянная метка - работает в виртуальном разрешении 720×1280
    this.scene.add.text(this.sprite.x, labelY, `PORTAL ${letter}`, {
      fontSize: `${PORTAL_LABEL_FONT_SIZE}px`, // ✅ Используем константу
      fontFamily: DEFAULT_FONT_FAMILY, // ✅ Используем Nunito
      fontStyle: PORTAL_LABEL_FONT_STYLE, // ✅ Используем константу
      color: PORTAL_LABEL_COLOR, // ✅ Используем константу
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(DEPTHS.WORLD.PORTAL_TEXT);

    // ✅ Метка ответа - используем баббл если флаг включен, иначе старый текст
    if (USE_QUESTION_BUBBLE) {
      // ✅ Логируем наличие bubblePosition в конфиге
      logger.log('PORTAL', `Portal ${this.config.id}: bubblePosition in config =`, this.config.bubblePosition);

      // ✅ Используем утилиту для расчета позиции баббла (правило: нижняя граница баббла совпадает с верхней границей портала)
      let bubbleX = this.sprite.x;
      let bubbleY: number;

      // ✅ Если есть явные координаты баббла в конфиге, используем их
      if (this.config.bubblePosition) {
        bubbleX = this.config.bubblePosition.x;
        bubbleY = this.config.bubblePosition.y;
        logger.log('PORTAL', `Portal answer bubble using EXPLICIT coordinates: [${bubbleX}, ${bubbleY}]`);
      } else {
        // ✅ Иначе вычисляем позицию на основе реальных размеров спрайта
        // Используем реальные размеры спрайта вместо фиксированных констант
        const spriteHeight = this.sprite.displayHeight;
        const bubbleHeight = BUBBLE_SIZES.PORTAL.HEIGHT * BASE_SCALE * ACTOR_SIZES.QUESTION_BUBBLE;
        const spriteTop = this.sprite.y - (spriteHeight / 2);
        bubbleY = spriteTop - (bubbleHeight / 2);

        logger.log('PORTAL', `Portal ${this.config.id} answer bubble using CALCULATED position (sprite height: ${spriteHeight}): [${bubbleX}, ${bubbleY}]`);
      }

      // Получаем quizManager и currentLevel из scene.data для правильного расчета размера шрифта
      const quizManager = (this.scene as any).data?.get('quizManager') as QuizManager | undefined;
      const currentLevel = (this.scene as any).data?.get('currentLevel') as number | undefined || 1;

      // ✅ Создаем баббл для портала с типом 'portal' (использует текстуру BubbleMsg.Transparent128x36.png)
      this.answerBubble = new QuestionBubble(this.scene, bubbleX, bubbleY, quizManager, currentLevel, 'portal');

      // Устанавливаем текст ответа в баббл
      // Создаем временный объект ParsedQuestion для баббла
      const answerData: ParsedQuestion = {
        type: QuestionType.TEXT_ONLY,
        questionText: this.config.answerText,
        image: undefined,
        correctAnswer: '',
        wrongAnswers: [],
        allAnswers: [],
        feedbacks: [],
        wrongFeedbacks: []
      };

      // Устанавливаем текст (без assetLoader, так как картинки нет)
      this.answerBubble.setQuestion(answerData, null as any).catch(() => {
        // Игнорируем ошибки, так как assetLoader не нужен для текста
      });

      // Скрываем баббл изначально (показывается при активации)
      this.answerBubble.hide();

      logger.log('PORTAL', `Answer bubble created for: ${this.config.answerText} with global font size`);
    } else {
      // Старая реализация: текстовый лейбл
      this.label = this.scene.add.text(this.sprite.x, this.sprite.y - 60, this.config.answerText, {
        fontSize: `${PORTAL_ANSWER_FONT_SIZE}px`, // ✅ Используем константу
        fontFamily: DEFAULT_FONT_FAMILY, // ✅ Используем Nunito
        fontStyle: PORTAL_ANSWER_FONT_STYLE, // ✅ Используем константу
        backgroundColor: PORTAL_ANSWER_BACKGROUND_COLOR, // ✅ Используем константу
        padding: { x: 5, y: 5 },
        color: PORTAL_ANSWER_COLOR // ✅ Используем константу
      }).setOrigin(0.5).setVisible(false).setDepth(DEPTHS.WORLD.PORTAL_TEXT);
    }

    // ✅ Метка прогресса - работает в виртуальном разрешении 720×1280
    this.progressText = this.scene.add.text(this.sprite.x, this.sprite.y + 60, '0/3 Keys', {
      fontSize: `${PORTAL_PROGRESS_FONT_SIZE}px`, // ✅ Используем константу
      fontFamily: DEFAULT_FONT_FAMILY, // ✅ Используем Nunito
      fontStyle: PORTAL_PROGRESS_FONT_STYLE, // ✅ Используем константу
      color: PORTAL_PROGRESS_COLOR, // ✅ Используем константу
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5).setVisible(false).setDepth(2); // ✅ Текст ответа портала - на уровне текстов глобальных вопросов

    this.sprite.setData('label', this.label);
    this.sprite.setData('progressText', this.progressText);
  }

  /**
   * Вкл/выкл коллизий вокселей
   */
  protected setCollisionBodiesEnabled(enabled: boolean): void {
    this.collisionBodies.forEach(body => {
      if (body.body) {
        const staticBody = body.body as Phaser.Physics.Arcade.StaticBody | Phaser.Physics.Arcade.Body;
        staticBody.enable = enabled;
      }
    });
    if (this.collisionBodies.length > 0) {
      logger.log('PORTAL', `Portal ${this.config.id}: Voxel collision bodies enabled = ${enabled}`);
    }
  }

  /**
   * Получить текущее состояние
   */
  public getState(): PortalState {
    return this.currentState;
  }

  /**
   * Установить состояние портала
   */
  protected setState(newState: PortalState): void {
    if (this.currentState === newState) {
      return; // Уже в этом состоянии
    }

    logger.log('PORTAL', `State transition ${this.currentState} -> ${newState}`);
    this.currentState = newState;
    this.sprite.setData('state', newState);
    this.updateVisualState();
  }



  /**
   * Обновить визуальное состояние портала
   */
  private updateVisualState(): void {
    // Toggle voxel collisions based on state
    if (this.currentState === PortalState.ACTIVATED) {
      this.setCollisionBodiesEnabled(false); // Remove wall when open
    } else {
      this.setCollisionBodiesEnabled(true); // Wall is solid
    }

    // Очищаем слушатели анимации, чтобы не срабатывали старые колбэки
    this.sprite.off('animationcomplete');

    // Останавливаем все текущие анимации
    if (this.sprite.anims) {
      this.sprite.anims.stop();
    }

    switch (this.currentState) {
      case PortalState.BASE:
        this.setBaseState();
        break;
      case PortalState.ACTIVATING:
        this.setActivatingState();
        break;
      case PortalState.INTERACTION:
        this.setInteractionState();
        break;
      case PortalState.ACTIVATED:
        this.setActivatedState();
        break;
    }
  }

  /**
   * Установить базовое состояние
   */
  private setBaseState(): void {
    // Отключаем физику в базовом состоянии (портал закрыт)
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    const sheetKey = this.getBaseSheetKey();

    logger.log('PORTAL', 'setBaseState: Starting...');
    logger.log('PORTAL', `setBaseState: Checking texture: ${sheetKey}`);
    logger.log('PORTAL', `setBaseState: useTiledMapTextures: ${this.useTiledMapTextures}`);

    if (!this.scene.textures.exists(sheetKey)) {
      logger.error('PORTAL', `Base texture not found: ${sheetKey}`);
      return;
    }

    // Останавливаем текущую анимацию
    if (this.sprite.anims && this.sprite.anims.isPlaying) {
      this.sprite.anims.stop();
    }

    // Переключаемся на текстуру базового состояния
    this.sprite.setTexture(sheetKey);
    this.sprite.setFrame(0);
    this.sprite.clearTint();

    // Проигрываем анимацию только если не используем статичные текстуры
    if (!this.useTiledMapTextures) {
      const animKey = this.getBaseAnimKey();
      if (!this.scene.anims.exists(animKey)) {
        logger.error('PORTAL', `Base animation not found: ${animKey}`);
        return;
      }

      if (this.sprite.anims && this.scene.anims.exists(animKey)) {
        // Останавливаем предыдущую анимацию, если она играет
        if (this.sprite.anims.isPlaying) {
          this.sprite.anims.stop();
        }

        // Сбрасываем флаги ручной синхронизации (если были установлены)
        (this.sprite as any)._animationInitialized = false;
        (this.sprite as any)._animationTimer = 0;
        (this.sprite as any)._animationFrameIndex = 0;

        // Запускаем анимацию
        this.sprite.play(animKey, true); // true = повторять бесконечно
        logger.log('PORTAL', `Playing base animation ${animKey}, isPlaying: ${this.sprite.anims.isPlaying}`);

        // ✅ Для physics спрайтов Phaser может не обновлять кадры автоматически
        // Поэтому устанавливаем флаг, что нужна ручная синхронизация
        (this.sprite as any)._needsManualSync = true;
      } else {
        logger.error('PORTAL', `Cannot play animation ${animKey} - anims: ${!!this.sprite.anims}, exists: ${this.scene.anims.exists(animKey)}`);
      }
    } else {
      logger.log('PORTAL', 'Using static texture for base state (Tiled Map mode)');
    }

    // Скрываем метки
    if (this.progressText) {
      this.progressText.setVisible(false);
    }
    if (this.label) {
      this.label.setVisible(false);
    }
    if (this.answerBubble) {
      this.answerBubble.hide();
    }

    // ✅ Включаем связанные коллизии (воксели)
    this.associatedCollisionBodies.forEach(body => {
      if (body.body) {
        (body.body as Phaser.Physics.Arcade.Body).enable = true;
      }
    });

    // ✅ Отключаем интерактивность в базовом состоянии
    if (this.sprite.input) {
      this.sprite.disableInteractive();
    }
  }

  /**
   * Установить состояние интеракции
   */
  private setInteractionState(): void {
    // Включаем физику, чтобы завершить интеракцию (хотя технически уже внутри интеракции)
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).enable = true;
    }

    // Выбираем правильный ключ спрайтшита
    let sheetKey = 'portal_interaction_sheet'; // Default standard
    let animKey = 'portal_interaction';

    if (this.useTiledMapTextures) {
      // Для Tiled Map режима
      sheetKey = 'portal_door_interaction_sheet';
      animKey = 'portal_door_interaction';
    }

    logger.log('PORTAL', `setInteractionState: Starting... config.id=${this.config.id}`);

    if (!this.scene.textures.exists(sheetKey)) {
      logger.error('PORTAL', `Interaction texture not found: ${sheetKey}`);
      return;
    }

    // Останавливаем текущую анимацию
    if (this.sprite.anims && this.sprite.anims.isPlaying) {
      this.sprite.anims.stop();
    }

    // Переключаемся на спрайтшит интеракции
    this.sprite.setTexture(sheetKey);
    this.sprite.setFrame(0);
    this.sprite.clearTint();

    // ✅ Сбрасываем слушатели
    this.sprite.off('animationcomplete');

    // ✅ Сбрасываем таймеры анимации (КРИТИЧНО для ручной синхронизации)
    (this.sprite as any)._animationInitialized = false;
    (this.sprite as any)._animationTimer = 0;
    (this.sprite as any)._animationFrameIndex = 0;

    // ✅ Включаем ручную синхронизацию для интеракции
    (this.sprite as any)._needsManualSync = true;

    // ✅ Отключаем интерактивность во время анимации (баббл пока не нужен)
    this.sprite.disableInteractive();

    // Показываем прогресс
    if (this.progressText) {
      this.progressText.setText(`${this.storedKeys}/3 Keys`).setVisible(true);
    }

    // Функция завершения
    const handleComplete = () => {
      logger.log('PORTAL', `Interaction complete. storedKeys=${this.storedKeys}`);
      if (this.storedKeys >= this.maxKeys) {
        this.setState(PortalState.ACTIVATED);
      } else {
        this.setState(PortalState.ACTIVATING);
      }
    };

    if (this.sprite.anims && this.scene.anims.exists(animKey)) {
      logger.log('PORTAL', `setInteractionState: Playing animation ${animKey}`);

      // ✅ FIX: Listener MUST be attached BEFORE playing the animation to avoid race conditions
      this.sprite.once('animationcomplete', (anim: Phaser.Animations.Animation) => {
        if (anim.key === animKey) {
          logger.log('PORTAL', `setInteractionState: Animation ${anim.key} completed`);
          handleComplete();
        }
      });

      this.sprite.play(animKey, false); // false = не повторять

      // Safety fallback: if animation hangs
      this.scene.time.delayedCall(2000, () => {
        if (this.currentState === PortalState.INTERACTION) {
          logger.warn('PORTAL', 'Interaction watchdog triggered - forcing complete');
          handleComplete();
        }
      });

      // ✅ СБРОС СИНХРОНИЗАЦИИ перед началом новой анимации
      (this.sprite as any)._animationInitialized = false;
      (this.sprite as any)._animationTimer = 0;
      (this.sprite as any)._animationFrameIndex = 0;

      // ✅ Включаем ручную синхронизацию
      (this.sprite as any)._needsManualSync = true;

      // Log immediate status
      logger.log('PORTAL', `> Is Playing: ${this.sprite.anims.isPlaying}, Current Anim: ${this.sprite.anims.currentAnim?.key}`);

      // DEBUG: Force isPlaying if it's somehow false but we just played it
      if (!this.sprite.anims.isPlaying) {
        logger.warn('PORTAL', 'isPlaying is FALSE after play()! forcing manual flag??');
      }
    } else {
      logger.warn('PORTAL', `Start interaction without animation or anim missing: ${animKey}`);
      // Fallback
      this.scene.time.delayedCall(500, handleComplete);
    }
  }

  /**
   * Установить состояние активации
   */
  private setActivatingState(): void {
    // Включаем физику, чтобы игрок мог взаимодействовать (сдавать ключи)
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).enable = true;
    }

    // ✅ Отключаем интерактивность в состоянии активации
    if (this.sprite.input) {
      this.sprite.disableInteractive();
    }


    // Определяем ключи для активации
    let sheetKey = '';
    let animKey = '';

    // ✅ FIX: Use standard activation animation (no dynamic key count suffixes as per user request)
    // The user specified a single looping activation animation for the portal
    if (!this.useTiledMapTextures) {
      const letter = this.getPortalLetter().toLowerCase();
      sheetKey = `portal_${letter}_activation_sheet`;
      animKey = `portal_${letter}_activation`;
    } else {
      // Tiled Map Mode fallback
      const letter = this.getPortalLetter();
      sheetKey = `portal_door_${letter.toLowerCase()}_activation_sheet`;
      animKey = `portal_door_${letter.toLowerCase()}_activation`;
    }



    logger.log('PORTAL', `setActivatingState: Starting... sheet=${sheetKey} anim=${animKey} keys=${this.storedKeys}`);

    if (!this.scene.textures.exists(sheetKey)) {
      logger.error('PORTAL', `Activation texture not found: ${sheetKey}`);
      return;
    }

    // Останавливаем текущую анимацию
    if (this.sprite.anims && this.sprite.anims.isPlaying) {
      this.sprite.anims.stop();
    }

    // Переключаемся на спрайтшит
    this.sprite.setTexture(sheetKey);
    this.sprite.setFrame(0);
    this.sprite.clearTint();

    // Показываем прогресс
    if (this.progressText) {
      this.progressText.setText(`${this.storedKeys}/3 Keys`).setVisible(true);
    }

    // Запускаем цикл
    logger.log('PORTAL', `setActivatingState: Attempting to play animation ${animKey}`);
    if (this.sprite.anims && this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey, true); // loop

      // ✅ СБРОС СИНХРОНИЗАЦИИ перед началом новой анимации
      (this.sprite as any)._animationInitialized = false;
      (this.sprite as any)._animationTimer = 0;
      (this.sprite as any)._animationFrameIndex = 0;

      // ✅ Restoring Manual Sync for reliability
      (this.sprite as any)._needsManualSync = true;
      logger.log('PORTAL', `setActivatingState: Playing ${animKey}, isPlaying=${this.sprite.anims.isPlaying}`);
    } else {
      logger.error('PORTAL', `setActivatingState: Animation ${animKey} NOT FOUND or sprite.anims missing!`);
    }
  }

  /**
   * Установить активированное состояние
   */
  private setActivatedState(): void {
    let sheetKey = '';
    let animKey = '';

    if (this.useTiledMapTextures) {
      // Tiled Map Mode: PortalDoor.Activated... (Wait, config map uses Portal.Activated_32x48 for PortalDoor?)
      // In configs I added `portal_door_activated_sheet`
      sheetKey = 'portal_door_activated_sheet';
      animKey = 'portal_door_activated';
    } else {
      // Standard Mode
      const letter = this.getPortalLetter().toLowerCase();
      sheetKey = `portal_${letter}_activated_sheet`;
      animKey = `portal_${letter}_activated`;
    }

    logger.log('PORTAL', 'setActivatedState: Starting...');
    logger.log('PORTAL', `setActivatedState: Checking texture: ${sheetKey}`);
    logger.log('PORTAL', `setActivatedState: useTiledMapTextures: ${this.useTiledMapTextures}`);

    if (!this.scene.textures.exists(sheetKey)) {
      logger.error('PORTAL', `Activated texture not found: ${sheetKey}`);
      return;
    }

    // Останавливаем текущую анимацию
    if (this.sprite.anims && this.sprite.anims.isPlaying) {
      this.sprite.anims.stop();
    }

    // Переключаемся на текстуру активированного состояния
    this.sprite.setTexture(sheetKey);
    this.sprite.setFrame(0);
    this.sprite.clearTint();

    // Показываем метки
    if (this.progressText) {
      this.progressText.setText('OPEN').setColor(PORTAL_PROGRESS_OPEN_COLOR).setVisible(true);
    }
    if (USE_QUESTION_BUBBLE && this.answerBubble) {
      // Показываем баббл ответа с анимацией
      this.answerBubble.show();
      // Показываем подсказку под Порталом
      this.answerBubble.showHint(this.sprite.x, this.sprite.y, 'portal');
    } else if (this.label) {
      // Старая реализация: текстовый лейбл
      this.label.setVisible(true);
    }

    // Устанавливаем флаги
    this._mustExit = true;
    this.sprite.setData('mustExit', true);

    // ✅ Включаем интерактивность только когда портал полностью активирован
    this.sprite.setInteractive({ useHandCursor: true });
    logger.log('PORTAL', 'Enabled interactivity for ACTIVATED state');

    // Проигрываем циклическую анимацию активированного состояния
    if (!this.scene.anims.exists(animKey)) {
      logger.error('PORTAL', `Activated animation not found: ${animKey}`);
      return;
    }

    // ✅ Для physics спрайтов нужно явно запускать анимацию
    if (this.sprite.anims && this.scene.anims.exists(animKey)) {
      // Останавливаем предыдущую анимацию, если она играет
      if (this.sprite.anims.isPlaying) {
        this.sprite.anims.stop();
      }

      // Сбрасываем флаги ручной синхронизации (если были установлены)
      (this.sprite as any)._animationInitialized = false;
      (this.sprite as any)._animationTimer = 0;
      (this.sprite as any)._animationFrameIndex = 0;

      // Запускаем анимацию
      this.sprite.play(animKey, true); // true = повторять бесконечно
      logger.log('PORTAL', `Playing activated animation ${animKey}, isPlaying: ${this.sprite.anims.isPlaying}`);

      // ✅ Для physics спрайтов Phaser может не обновлять кадры автоматически
      // Поэтому устанавливаем флаг, что нужна ручная синхронизация
      (this.sprite as any)._needsManualSync = true;
    } else {
      logger.error('PORTAL', `Cannot play animation ${animKey} - anims: ${!!this.sprite.anims}, exists: ${this.scene.anims.exists(animKey)}`);
    }

    // ✅ Воспроизводим звук активации портала
    if (this.scene.data && typeof this.scene.data.get === 'function') {
      const audioManager = this.scene.data.get('audioManager');
      if (audioManager && typeof (audioManager as any).playPortalActivated === 'function') {
        (audioManager as any).playPortalActivated();
      }
    }

    // ✅ Воспроизводим звук завершения активации портала (когда появляется надпись ответа)
    this.scene.time.delayedCall(300, () => {
      if (this.scene.data && typeof this.scene.data.get === 'function') {
        const audioManager = this.scene.data.get('audioManager');
        if (audioManager && typeof (audioManager as any).playPortalActivatedComplete === 'function') {
          (audioManager as any).playPortalActivatedComplete();
        }
      }
    });

    logger.log('PORTAL', 'Set to ACTIVATED state');

    // ✅ Выключаем связанные коллизии (воксели), чтобы игрок мог пройти
    this.associatedCollisionBodies.forEach(body => {
      if (body.body) {
        (body.body as Phaser.Physics.Arcade.Body).enable = false;
        logger.log('PORTAL', 'Disabled associated collision body');
      }
    });

    // ✅ Отключаем тело самого портала, чтобы игрок мог пройти сквозь него (или оставляем включенным для overlap?)
    // Если портал работает как проход, лучше оставить overlap, чтобы детектить вход?
    // Но onEnter() вызывается при overlap. Если выключить body, onEnter не сработает.
    // Поэтому оставляем ENABLED, но collision override?
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).enable = true;
    }
  }

  /**
   * Абстрактный метод для обработки депозита ключа
   */
  public abstract onKeyDeposit(): void;

  /**
   * Абстрактный метод для обработки входа в портал
   */
  public abstract onEnter(): boolean; // Возвращает true если портал правильный

  /**
   * Депозит ключа в портал
   * @returns true если ключ принят, false если отклонен (портал занят или полон)
   */
  public depositKey(): boolean {
    logger.log('PORTAL', `depositKey: Called for portal ${this.config.id}, currentState: ${this.currentState}, storedKeys: ${this.storedKeys}`);

    // Нельзя депозитить ключи, если портал уже активирован
    if (this.currentState === PortalState.ACTIVATED) {
      logger.log('PORTAL', 'depositKey: Portal already activated, returning');
      return false;
    }

    // ✅ Нельзя депозитить ключи, если портал в состоянии интеракции (проигрывает анимацию)
    if (this.currentState === PortalState.INTERACTION) {
      logger.log('PORTAL', 'depositKey: Portal busy interacting, returning');
      return false;
    }

    // Нельзя депозитить больше 3 ключей
    if (this.storedKeys >= this.maxKeys) {
      logger.log('PORTAL', 'depositKey: Max keys reached, returning');
      return false;
    }

    this.storedKeys++;
    this.sprite.setData('storedKeys', this.storedKeys);
    logger.log('PORTAL', `depositKey: Key deposited, storedKeys now: ${this.storedKeys}`);

    if (this.progressText) {
      this.progressText.setText(`${this.storedKeys}/3 Keys`);
    }

    // Переходим в состояние интеракции
    logger.log('PORTAL', 'depositKey: Setting state to INTERACTION');
    this.setState(PortalState.INTERACTION);

    this.onKeyDeposit();
    return true;
  }

  /**
   * Получить количество хранимых ключей
   */
  public getStoredKeys(): number {
    return this.storedKeys;
  }

  /**
   * Установить флаг переопределения коллизии
   * Если true, то физическая коллизия (проталкивание) будет отключена
   */
  public setCollisionOverride(value: boolean): void {
    this._collisionOverride = value;
    // console.log(`🔧 Portal ${this.config.id}: Collision override set to ${value}`);
  }

  /**
   * Проверить флаг переопределения коллизии
   */
  public hasCollisionOverride(): boolean {
    return this._collisionOverride;
  }

  /**
   * Проверить, открыт ли портал
   */
  public isOpen(): boolean {
    return this.currentState === PortalState.ACTIVATED;
  }

  /**
   * Проверить, активируется ли портал
   */
  /**
   * Проверить, активируется ли портал
   */
  public isActivating(): boolean {
    return this.currentState === PortalState.ACTIVATING;
  }

  /**
   * Проверить, нужно ли выйти из зоны портала
   */
  public mustExit(): boolean {
    return this._mustExit;
  }

  /**
   * Обработчик клика по порталу
   */
  private onPortalClick(): void {
    if (this.currentState !== PortalState.ACTIVATED) {
      return;
    }

    logger.log('PORTAL', `Portal ${this.config.id}: Clicked! Toggling bubble...`);

    if (USE_QUESTION_BUBBLE && this.answerBubble) {
      this.answerBubble.toggleVisibility();
    } else if (this.label) {
      this.label.setVisible(!this.label.visible);
    }
  }

  /**
   * Установить флаг mustExit
   */
  public setMustExit(): void {
    this._mustExit = true;
    this.sprite.setData('mustExit', true);
  }

  /**
   * Сбросить флаг mustExit
   */
  public resetMustExit(): void {
    this._mustExit = false;
    this.sprite.setData('mustExit', false);
  }

  /**
   * Получить спрайт
   */
  public getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }

  /**
   * Получить X координату портала
   */
  public getX(): number {
    return this.sprite.x;
  }

  /**
   * Получить Y координату портала
   */
  public getY(): number {
    return this.sprite.y;
  }

  /**
   * Получить урон, наносимый игроку при входе в неправильный портал
   */
  public getDamage(): number {
    return this.damage;
  }

  /**
   * Получить конфигурацию
   */
  public getConfig(): PortalConfig {
    return this.config;
  }

  /**
   * Переключить видимость баббла ответа
   */
  public toggleAnswerBubble(): void {
    if (this.answerBubble) {
      this.answerBubble.toggleVisibility();
    }
  }

  /**
   * Получить баббл ответа
   */
  public getAnswerBubble(): QuestionBubble | undefined {
    return this.answerBubble;
  }

  /**
   * Уничтожить портал
   */
  public destroy(): void {
    // Останавливаем анимации
    if (this.sprite.anims) {
      this.sprite.anims.stop();
    }

    if (this.sprite) {
      this.sprite.destroy();
    }
    if (this.label) {
      this.label.destroy();
    }
    if (this.progressText) {
      this.progressText.destroy();
    }
    if (this.answerBubble) {
      this.answerBubble.destroy();
    }

    // ✅ Удаляем слушатель событий
    EventBus.off(EVENTS.ORACLE_ACTIVATED, this.onOracleActivated, this);
  }
  /**
   * Добавить связанное физическое тело
   */
  public addCollisionBody(body: Phaser.GameObjects.GameObject): void {
    this.associatedCollisionBodies.push(body);
  }
}
