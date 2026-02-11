/**
 * Класс Оракула с машиной состояний
 * Управляет состояниями и анимациями оракула
 */

import Phaser from 'phaser';
import { KEYS, ACTOR_SIZES, BASE_SCALE, GamePhase, EVENTS, SOUND_KEYS, DEPTHS, ORACLE_MAX_COINS, ORACLE_MAX_KEYS } from '../../constants/gameConstants';
import { QuestionBubble } from '../ui/QuestionBubble';
import { calculateBubbleY } from '../utils/BubblePositionCalculator';
import { ParsedQuestion } from '../../types/questionTypes';
import { QuizManager } from '../systems/QuizManager';
import { EventBus } from '../EventBus';
import { logger } from '../../utils/Logger';
import { AB_TESTING } from '../../config/gameConfig';

/**
 * Состояния оракула
 */
export enum OracleState {
  BASE = 'base',              // Базовое состояние (статическая текстура)
  INTERACTION = 'interaction', // Состояние интеракции (анимация при получении ключа)
  ACTIVATING = 'activating',   // Состояние активации (циклическая анимация)
  ACTIVATED = 'activated'      // Активированное состояние (циклическая анимация после всех ключей)
}

/**
 * Класс Оракула
 */
export class Oracle {
  private sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private currentState: OracleState;
  private storedKeys: number = 0;
  private readonly maxKeys: number = ORACLE_MAX_KEYS;
  // ⚠️ НОВОЕ: Coin tracking
  private storedCoins: number = 0;
  private readonly maxCoins: number = ORACLE_MAX_COINS;
  private readonly scale: number = BASE_SCALE * ACTOR_SIZES.ORACLE;
  protected questionBubble?: QuestionBubble; // ✅ Баббл для вопроса Оракула
  private explicitBubblePosition?: { x: number, y: number }; // ✅ Явная позиция баббла (из Tiled Map)
  private coinIndicators: Phaser.GameObjects.Sprite | null = null; // ✅ Спрайт индикатора монет (один спрайт с 4 кадрами)

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.currentState = OracleState.BASE;

    // ✅ Логируем доступные текстуры и анимации
    logger.log('ORACLE', 'Oracle constructor: Checking available resources...');
    logger.log('ORACLE', 'Available textures:', Object.keys(scene.textures.list));
    // Используем безопасный способ получения списка анимаций
    const animsList = (scene.anims as any).anims?.entries ? Object.keys((scene.anims as any).anims.entries) : [];
    logger.log('ORACLE', 'Available animations:', animsList);

    // Проверяем наличие текстур оракула
    const baseTextureExists = scene.textures.exists(KEYS.ORACLE);
    const activationSheetExists = scene.textures.exists('oracle_activation_sheet');
    const activatedSheetExists = scene.textures.exists('oracle_activated_sheet');
    logger.log('ORACLE', `Oracle textures: BASE=${baseTextureExists}, ACTIVATION=${activationSheetExists}, ACTIVATED=${activatedSheetExists}`);

    // Проверяем наличие анимаций оракула
    const activationAnimExists = scene.anims.exists('oracle_activation');
    const activatedAnimExists = scene.anims.exists('oracle_activated');
    logger.log('ORACLE', `Oracle animations: activation=${activationAnimExists}, activated=${activatedAnimExists}`);

    // Safety check: physics.add may be null during scene restart
    logger.log('ORACLE', 'Oracle: Checking physics.add availability...', {
      hasScene: !!scene,
      hasPhysics: !!scene?.physics,
      hasPhysicsAdd: !!scene?.physics?.add,
      textureExists: baseTextureExists
    });

    if (!scene?.physics?.add) {
      logger.error('ORACLE', 'scene.physics.add is not available, cannot create Oracle sprite');
      throw new Error('Cannot create Oracle: scene.physics.add is not available');
    }

    if (!baseTextureExists) {
      logger.error('ORACLE', `Texture ${KEYS.ORACLE} not found`);
      throw new Error(`Cannot create Oracle: Texture ${KEYS.ORACLE} not found`);
    }

    // Создаем спрайт оракула с базовой текстурой
    this.sprite = scene.physics.add.sprite(x, y, KEYS.ORACLE);
    this.sprite.setImmovable(true);
    this.sprite.setPushable(false);
    this.sprite.setScale(this.scale);
    this.sprite.setDepth(DEPTHS.WORLD.ORACLE);

    logger.log('ORACLE', `Oracle created at ${x}, ${y}, initial state: ${this.currentState}`);
    logger.log('ORACLE', `Oracle sprite texture: ${this.sprite.texture.key}`);

    // ✅ Инициализируем индикаторы монет, если фича включена
    if (AB_TESTING.ENABLE_ORACLE_COIN_INDICATORS) {
      this.createCoinIndicators();
    }
  }

  /**
   * Получить спрайт оракула
   */
  public getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }

  /**
   * Получить текущее состояние
   */
  public getState(): OracleState {
    return this.currentState;
  }

  /**
   * Получить количество хранимых ключей
   */
  public getStoredKeys(): number {
    return this.storedKeys;
  }

  /**
   * Получить количество хранимых монет
   */
  public getStoredCoins(): number {
    return this.storedCoins;
  }

  /**
   * Проверить, активирован ли оракул
   */
  public isActivated(): boolean {
    return this.currentState === OracleState.ACTIVATED;
  }

  /**
   * Добавить ключ в оракул
   * @returns true если ключ был добавлен, false если оракул уже полон
   */
  public depositKey(): boolean {
    logger.log('ORACLE', `depositKey: Called, current storedKeys: ${this.storedKeys}, maxKeys: ${this.maxKeys}`);

    if (this.storedKeys >= this.maxKeys) {
      logger.warn('ORACLE', 'Cannot deposit key, already full');
      return false;
    }

    this.storedKeys++;
    logger.log('ORACLE', `Oracle: Key deposited (${this.storedKeys}/${this.maxKeys})`);
    logger.log('ORACLE', `depositKey: Current state before transition: ${this.currentState}`);

    // ✅ Если мы уже в состоянии интеракции, мы не можем принять новый ключ прямо сейчас
    // (чтобы анимация успела проиграться)
    if (this.currentState === OracleState.INTERACTION) {
      logger.warn('ORACLE', 'Busy interacting, rejecting key deposit');
      this.storedKeys--; // Откатываем, т.к. мы отвергли ключ
      return false;
    }

    // Переходим в состояние интеракции при каждом ключе
    logger.log('ORACLE', `depositKey: Calling setState(INTERACTION)`);
    this.setState(OracleState.INTERACTION);

    // Обновляем визуальные индикаторы (на случай, если они зависят от ключей тоже)
    this.updateCoinIndicators();

    return true;
  }

  /**
   * ⚠️ НОВОЕ: Депозит айтема (ключ или монетка) в оракул
   * Проверяет фазу игры и принимает соответствующие айтемы
   * @param currentPhase Текущая фаза игры
   * @returns true если айтем был принят, false если не принят
   */
  public depositItem(currentPhase: GamePhase): boolean {
    logger.log('ORACLE', `depositItem: Called, phase: ${currentPhase}, storedCoins: ${this.storedCoins}, storedKeys: ${this.storedKeys}`);

    // В COIN Phase принимаем монетки
    if (currentPhase === GamePhase.COIN) {
      if (this.storedCoins >= this.maxCoins) {
        logger.warn('ORACLE', 'Cannot deposit coin, already full');
        return false;
      }

      if (this.currentState === OracleState.INTERACTION) {
        logger.warn('ORACLE', 'Busy interacting, rejecting coin deposit');
        return false;
      }

      this.storedCoins++;
      logger.log('ORACLE', `Oracle: Coin deposited (${this.storedCoins}/${this.maxCoins})`);

      // Переходим в состояние интеракции
      this.setState(OracleState.INTERACTION);

      // При 3 монетках - эмитим событие смены фазы
      if (this.storedCoins >= this.maxCoins) {
        logger.log('ORACLE', `3 coins collected! Emitting GAME_PHASE_CHANGED event to KEY phase`);
        EventBus.emit(EVENTS.GAME_PHASE_CHANGED, { newPhase: GamePhase.KEY });
      }

      // Обновляем визуальные индикаторы
      this.updateCoinIndicators();

      return true;
    }

    // В KEY Phase принимаем ключи (используем существующий метод)
    if (currentPhase === GamePhase.KEY) {
      return this.depositKey();
    }

    logger.warn('ORACLE', `Unknown phase: ${currentPhase}, rejecting item`);
    return false;
  }

  /**
   * Установить состояние оракула
   */
  private setState(newState: OracleState): void {
    logger.log('ORACLE', `setState: Called with newState: ${newState}, currentState: ${this.currentState}`);

    // ✅ Если уже в этом состоянии, пропускаем переход
    if (this.currentState === newState) {
      logger.warn('ORACLE', `setState: Already in state ${newState}, skipping`);
      return; // Уже в этом состоянии
    }

    // ✅ Разрешаем переход из ACTIVATING в BASE или ACTIVATED (это нормальный переход после завершения анимации)
    logger.log('ORACLE', `Oracle: State transition ${this.currentState} -> ${newState}`);
    this.currentState = newState;
    this.updateVisualState();
  }

  /**
   * Обновить визуальное состояние оракула
   */
  private updateVisualState(): void {
    switch (this.currentState) {
      case OracleState.BASE:
        this.setBaseState();
        break;
      case OracleState.ACTIVATING:
        this.setActivatingState();
        break;
      case OracleState.INTERACTION:
        this.setInteractionState();
        break;
      case OracleState.ACTIVATED:
        this.setActivatedState();
        break;
    }

    // ✅ Всегда обновляем индикаторы при смене визуального состояния
    this.updateCoinIndicators();
  }

  /**
   * Установить базовое состояние
   */
  private setBaseState(): void {
    // Останавливаем все анимации
    if (this.sprite.anims) {
      this.sprite.anims.stop();
    }

    // ✅ Сбрасываем таймеры анимации (для ручной синхронизации кадров)
    (this.sprite as any)._needsManualSync = false;
    if ((this.sprite as any)._animationInitialized) {
      (this.sprite as any)._animationInitialized = false;
      (this.sprite as any)._animationTimer = 0;
      (this.sprite as any)._animationFrameIndex = 0;
    }

    // Устанавливаем базовую текстуру
    if (this.scene.textures.exists(KEYS.ORACLE)) {
      this.sprite.setTexture(KEYS.ORACLE);
      this.sprite.setFrame(0);
      this.sprite.clearTint();
      logger.log('ORACLE', 'Set to BASE state');
    } else {
      logger.error('ORACLE', `Base texture not found: ${KEYS.ORACLE}`);
    }
  }

  /**
   * Установить состояние интеракции
   */
  private setInteractionState(): void {
    const sheetKey = 'oracle_interaction_sheet';
    const animKey = 'oracle_interaction';

    logger.log('ORACLE', 'setInteractionState: Starting...');

    if (!this.scene.textures.exists(sheetKey)) {
      logger.error('ORACLE', `Interaction spritesheet not found: ${sheetKey}`);
      return;
    }

    if (!this.scene.anims.exists(animKey)) {
      logger.error('ORACLE', `Interaction animation not found: ${animKey}`);
      return;
    }

    // Останавливаем текущую анимацию
    if (this.sprite.anims && this.sprite.anims.isPlaying) {
      this.sprite.anims.stop();
    }

    // Переключаемся на спрайтшит интеракции
    this.sprite.setVisible(true);
    this.sprite.setActive(true);
    this.sprite.setAlpha(1.0);
    this.sprite.setTexture(sheetKey);
    this.sprite.setFrame(0);
    this.sprite.clearTint();

    // ✅ Сбрасываем слушатели, чтобы избежать дублирования
    this.sprite.off('animationcomplete');

    // Функция для обработки завершения анимации
    const handleAnimationComplete = () => {
      logger.log('ORACLE', `Interaction animation COMPLETED, storedCoins: ${this.storedCoins}`);

      // Сбрасываем слушатель
      this.sprite.off('animationcomplete');

      // Определяем следующее состояние
      // ✅ CRITICAL FIX: Oracle activates based on COINS, not KEYS
      if (this.storedCoins >= this.maxCoins) {
        logger.log('ORACLE', 'All coins collected, transitioning to ACTIVATED');
        this.setState(OracleState.ACTIVATED);
      } else {
        logger.log('ORACLE', 'Not all coins, transitioning to ACTIVATING (Idle with coins)');
        // Переходим в состояние ACTIVATING (Idle)
        this.setState(OracleState.ACTIVATING);
      }
    };

    if (this.sprite.anims && this.scene.anims.exists(animKey)) {
      logger.log('ORACLE', `Playing interaction animation: ${animKey}`);

      // ✅ FIX: Attach listener BEFORE play
      this.sprite.once('animationcomplete', (animation: Phaser.Animations.Animation) => {
        if (animation.key === animKey) {
          handleAnimationComplete();
        }
      });

      this.sprite.play(animKey, false); // false = не повторять

      // ✅ СБРОС СИНХРОНИЗАЦИИ перед началом новой анимации
      logger.log('ORACLE', 'Manual sync reset for interaction animation');
      (this.sprite as any)._animationInitialized = false;
      (this.sprite as any)._animationTimer = 0;
      (this.sprite as any)._animationFrameIndex = 0;

      // ✅ Включаем ручную синхронизацию = FALSE (Trust Phaser)
      (this.sprite as any)._needsManualSync = true;
    } else {
      logger.error('ORACLE', `Interaction animation missing or anims system fail: ${animKey}`);
      // Fallback to immediate complete
      this.scene.time.delayedCall(100, handleAnimationComplete);
    }

    // Safety fallback: if animation hangs
    this.scene.time.delayedCall(2000, () => {
      if (this.currentState === OracleState.INTERACTION) {
        logger.warn('ORACLE', 'Interaction watchdog triggered - forcing complete');
        handleAnimationComplete();
      }
    });
  }

  /**
   * Установить состояние активации (Idle состояние, когда есть 1 или 2 ключа)
   */
  private setActivatingState(): void {
    const sheetKey = 'oracle_activation_sheet';
    const animKey = 'oracle_activation';

    logger.log('ORACLE', `setActivatingState: Starting... keys: ${this.storedKeys}`);

    if (!this.scene.textures.exists(sheetKey)) {
      logger.error('ORACLE', `Activation spritesheet not found: ${sheetKey}`);
      return;
    }

    if (!this.scene.anims.exists(animKey)) {
      logger.error('ORACLE', `Activation animation not found: ${animKey}`);
      return;
    }

    // Останавливаем текущую анимацию
    if (this.sprite.anims && this.sprite.anims.isPlaying) {
      this.sprite.anims.stop();
    }

    // Удаляем старые обработчики завершения
    this.sprite.off('animationcomplete');

    // Переключаемся на спрайтшит
    this.sprite.setTexture(sheetKey);
    this.sprite.setFrame(0);
    this.sprite.clearTint();

    // Запускаем циклическую анимацию
    logger.log('ORACLE', 'Playing activation animation (loop)');
    this.sprite.play(animKey, true); // true = повторять

    // ✅ СБРОС СИНХРОНИЗАЦИИ перед началом новой анимации
    logger.log('ORACLE', 'Manual sync reset for activation animation');
    (this.sprite as any)._animationInitialized = false;
    (this.sprite as any)._animationTimer = 0;
    (this.sprite as any)._animationFrameIndex = 0;

    // ✅ Включаем ручную синхронизацию = FALSE (Trust Phaser)
    (this.sprite as any)._needsManualSync = true;

    // ВАЖНО: Мы НЕ подписываемся на animationcomplete, так как это циклическое состояние
    // Оракул будет крутить эту анимацию, пока игрок не принесет следующий ключ
  }

  /**
   * Установить активированное состояние
   */
  private setActivatedState(): void {
    const sheetKey = 'oracle_activated_sheet';
    const animKey = 'oracle_activated';

    logger.log('ORACLE', 'setActivatedState: Starting...');
    logger.log('ORACLE', `setActivatedState: Checking texture: ${sheetKey}`);
    logger.log('ORACLE', `setActivatedState: Checking animation: ${animKey}`);

    if (!this.scene.textures.exists(sheetKey)) {
      logger.error('ORACLE', `Activated spritesheet not found: ${sheetKey}`);
      logger.error('ORACLE', `Available textures: ${Object.keys(this.scene.textures.list).join(', ')}`);
      return;
    }

    if (!this.scene.anims.exists(animKey)) {
      logger.error('ORACLE', `Activated animation not found: ${animKey}`);
      const animsList = (this.scene.anims as any).anims?.entries ? Object.keys((this.scene.anims as any).anims.entries) : [];
      logger.error('ORACLE', `Available animations: ${animsList.join(', ')}`);
      return;
    }

    logger.log('ORACLE', 'setActivatedState: Both texture and animation exist');

    // Переключаемся на спрайтшит активированного состояния
    logger.log('ORACLE', `setActivatedState: Setting texture to ${sheetKey}`);

    // ✅ Убеждаемся, что спрайт виден и активен
    this.sprite.setVisible(true);
    this.sprite.setActive(true);
    this.sprite.setAlpha(1.0);

    // ✅ Останавливаем текущую анимацию перед сменой текстуры
    if (this.sprite.anims && this.sprite.anims.isPlaying) {
      this.sprite.anims.stop();
    }

    // ✅ Устанавливаем текстуру и сбрасываем кадр
    this.sprite.setTexture(sheetKey);
    this.sprite.setFrame(0);
    this.sprite.clearTint();

    logger.log('ORACLE', `setActivatedState: Texture set, current texture key: ${this.sprite.texture.key}`);
    logger.log('ORACLE', `setActivatedState: Sprite visible: ${this.sprite.visible}, active: ${this.sprite.active}, alpha: ${this.sprite.alpha}`);
    const frameIndex = (this.sprite.frame as any).index ?? (this.sprite.frame as any).frame ?? 'unknown';
    logger.log('ORACLE', `setActivatedState: Current frame: ${this.sprite.frame.name}, frame index: ${frameIndex}`);

    // Запускаем циклическую анимацию активированного состояния
    logger.log('ORACLE', `setActivatedState: Playing animation: ${animKey} with repeat: -1`);

    // ✅ Запускаем анимацию сразу после установки текстуры
    // Используем play() для запуска анимации (как в Player.ts и AbstractEnemy.ts)
    if (this.sprite.anims && this.scene.anims.exists(animKey)) {
      // Останавливаем текущую анимацию, если она играет
      if (this.sprite.anims.isPlaying) {
        this.sprite.anims.stop();
      }
      // Запускаем анимацию циклично (repeat: -1 в конфиге)
      this.sprite.play(animKey, true); // true = повторять бесконечно

      // ✅ СБРОС СИНХРОНИЗАЦИИ перед началом новой анимации
      logger.log('ORACLE', 'Manual sync reset for activated animation');
      (this.sprite as any)._animationInitialized = false;
      (this.sprite as any)._animationTimer = 0;
      (this.sprite as any)._animationFrameIndex = 0;

      // ✅ Включаем ручную синхронизацию = FALSE (Trust Phaser)
      (this.sprite as any)._needsManualSync = true;
      logger.log('ORACLE', 'setActivatedState: play() called with repeat');
    } else {
      logger.error('ORACLE', 'setActivatedState: sprite.anims is null or animation does not exist!');
      logger.error('ORACLE', `Animation exists: ${this.scene.anims.exists(animKey)}`);
    }
    // ✅ Проверяем состояние анимации после запуска
    if (this.sprite.anims && this.sprite.anims.currentAnim) {
      logger.log('ORACLE', `setActivatedState: sprite.anims.currentAnim: key=${this.sprite.anims.currentAnim.key}, frameRate=${this.sprite.anims.currentAnim.frameRate}, repeat=${this.sprite.anims.currentAnim.repeat}, frames=${this.sprite.anims.currentAnim.frames.length}, isPlaying=${this.sprite.anims.isPlaying}`);
      logger.log('ORACLE', `setActivatedState: sprite.anims.isPlaying: ${this.sprite.anims.isPlaying}`);
      logger.log('ORACLE', `setActivatedState: sprite.frame.name: ${this.sprite.frame.name}`);
    } else {
      logger.warn('ORACLE', 'setActivatedState: No current animation after play()');
    }

    // ✅ Дополнительная проверка через небольшой таймер
    this.scene.time.delayedCall(100, () => {
      if (this.sprite.anims && this.sprite.anims.currentAnim) {
        logger.log('ORACLE', `setActivatedState: After 100ms - currentAnim: ${this.sprite.anims.currentAnim.key}, isPlaying: ${this.sprite.anims.isPlaying}, currentFrame: ${this.sprite.frame.name}`);
      } else {
        logger.warn('ORACLE', 'setActivatedState: After 100ms - NO CURRENT ANIMATION!');
      }
    });
    logger.log('ORACLE', 'Set to ACTIVATED state (looping animation)');

    // ✅ Play activation sound
    const audioManager = (this.scene as any).data?.get('audioManager');
    if (audioManager && typeof audioManager.playOracleActivated === 'function') {
      audioManager.playOracleActivated();
    } else if (audioManager && typeof audioManager.playSound === 'function') {
      audioManager.playSound(SOUND_KEYS.ORACLE_ACTIVATED);
    } else {
      logger.warn('ORACLE', 'audioManager not available for activation sound');
    }

    // 🔥 Emit event so Portals can activate
    EventBus.emit(EVENTS.ORACLE_ACTIVATED);

    // ✅ Enable interaction with Oracle (as per backup implementation)
    this.enableInteraction();
  }

  /**
   * Сбросить состояние оракула
   */
  public reset(): void {
    this.storedKeys = 0;
    this.setState(OracleState.BASE);
    logger.log('ORACLE', 'Reset to initial state');
  }

  /**
   * Создать баббл вопроса для Оракула
   * Позиционируется относительно реальных координат спрайта Oracle (локальная система координат)
   * @param quizManager Менеджер викторины
   * @param currentLevel Текущий уровень
   * @param explicitX Явная координата X (из Tiled Map)
   * @param explicitY Явная координата Y (из Tiled Map)
   */
  public createQuestionBubble(quizManager?: QuizManager, currentLevel: number = 1, explicitX?: number, explicitY?: number): void {
    let bubbleX: number;
    let bubbleY: number;

    if (explicitX !== undefined && explicitY !== undefined) {
      // ✅ Если заданы явные координаты (из Tiled Map), используем их
      bubbleX = explicitX;
      bubbleY = explicitY;
      this.explicitBubblePosition = { x: explicitX, y: explicitY }; // ✅ Сохраняем явную позицию
      logger.log('ORACLE', `Question bubble created at EXPLICIT coordinates [${bubbleX}, ${bubbleY}]`);
    } else {
      // ✅ Используем реальные координаты спрайта Oracle (уже выровненного по матрице)
      const oracleX = this.sprite.x;
      const oracleY = this.sprite.y;

      bubbleX = oracleX;
      // ✅ Вычисляем позицию баббла: нижняя граница баббла совпадает с верхней границей Оракула
      bubbleY = calculateBubbleY(oracleY, 'oracle', 'oracle');
      logger.log('ORACLE', `Question bubble created at RELATIVE coordinates [${bubbleX}, ${bubbleY}] relative to Oracle sprite`);
    }

    // Создаем баббл с типом 'oracle'
    this.questionBubble = new QuestionBubble(this.scene, bubbleX, bubbleY, quizManager, currentLevel, 'oracle');

    // Скрываем баббл изначально (показывается при установке вопроса)
    this.questionBubble.hide();
  }

  /**
   * Обновить позицию баббла относительно спрайта Oracle
   * Вызывается для синхронизации позиции баббла с позицией Oracle в локальной системе координат
   */
  public updateBubblePosition(): void {
    if (!this.questionBubble) {
      return;
    }

    let bubbleX: number;
    let bubbleY: number;

    // ✅ Если есть явная позиция, используем её
    if (this.explicitBubblePosition) {
      bubbleX = this.explicitBubblePosition.x;
      bubbleY = this.explicitBubblePosition.y;
    } else {
      // ✅ Иначе вычисляем относительно спрайта
      const oracleX = this.sprite.x;
      const oracleY = this.sprite.y;

      bubbleX = oracleX;
      bubbleY = calculateBubbleY(oracleY, 'oracle', 'oracle');
    }

    // Обновляем позицию баббла
    this.questionBubble.updatePosition(bubbleX, bubbleY);

    // ✅ Обновляем позицию подсказки, если она существует и видима
    const hintText = this.questionBubble.getHintText();
    if (hintText && hintText.visible) {
      // Подсказка всегда относительно Оракула, даже если баббл смещен
      this.questionBubble.updateHintPosition(this.sprite.x, this.sprite.y);
    }
  }

  /**
   * Установить вопрос в баббл Оракула
   */
  public async setQuestion(questionData: ParsedQuestion, assetLoader: any): Promise<void> {
    if (!this.questionBubble) {
      logger.warn('ORACLE', 'Cannot set question, bubble not created');
      return;
    }

    // ✅ Обновляем позицию баббла перед установкой вопроса (на случай, если Oracle переместился)
    this.updateBubblePosition();

    await this.questionBubble.setQuestion(questionData, assetLoader);
    this.questionBubble.show(); // ✅ Показываем баббл с анимацией

    // Показываем подсказку под Оракулом (используем текущие координаты Oracle)
    this.questionBubble.showHint(this.sprite.x, this.sprite.y, 'oracle');

    logger.log('ORACLE', 'Question set in bubble');
  }

  /**
   * Переключить видимость баббла вопроса
   */
  public toggleQuestionBubble(): void {
    if (this.questionBubble) {
      this.questionBubble.toggleVisibility();
    }
  }

  /**
   * Включить взаимодействие (клики) для Оракула
   */
  public enableInteraction(): void {
    if (this.sprite.input) {
      return; // Уже включено
    }

    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on('pointerdown', () => {
      this.toggleQuestionBubble();
    });
    logger.log('ORACLE', 'Interaction enabled');
  }

  /**
   * Показать баббл вопроса
   */
  public showQuestionBubble(): void {
    if (this.questionBubble) {
      this.questionBubble.show();
    }
  }

  /**
   * Скрыть баббл вопроса
   */
  public hideQuestionBubble(): void {
    if (this.questionBubble) {
      this.questionBubble.hide();
    }
  }

  /**
   * Получить баббл вопроса
   */
  public getQuestionBubble(): QuestionBubble | undefined {
    return this.questionBubble;
  }

  /**
   * Уничтожить оракул
   */
  public destroy(): void {
    if (this.sprite.anims) {
      this.sprite.anims.stop();
    }
    if (this.questionBubble) {
      this.questionBubble.destroy();
      this.questionBubble = undefined;
    }
    this.sprite.destroy();
    if (this.coinIndicators) {
      this.coinIndicators.destroy();
      this.coinIndicators = null;
    }
  }

  /**
   * Создать визуальный индикатор монет
   * Использует один спрайт с 4 кадрами (Oracle.Coin_128x64.png)
   * Кадр 0: 0 монет, Кадр 1: 1 монета, Кадр 2: 2 монеты, Кадр 3: 3 монеты
   */
  private createCoinIndicators(): void {
    const { x, y } = this.sprite;

    // Создаём один спрайт в координатах Оракула
    const coinSprite = this.scene.add.sprite(x, y, 'oracle_coin_sheet');
    coinSprite.setScale(this.scale); // Масштаб Оракула
    coinSprite.setDepth(DEPTHS.WORLD.ORACLE_COIN_INDICATOR);
    coinSprite.setFrame(0); // Базовое состояние (0 монет)

    this.coinIndicators = coinSprite;
    this.updateCoinIndicators();
  }

  /**
   * Обновить состояние индикатора монет
   * Переключает кадры спрайта в зависимости от количества собранных монет:
   * Кадр 0: 0 монет, Кадр 1: 1 монета, Кадр 2: 2 монеты, Кадр 3: 3 монеты
   * Индикатор скрывается при активации Оракула
   */
  private updateCoinIndicators(): void {
    if (!AB_TESTING.ENABLE_ORACLE_COIN_INDICATORS || !this.coinIndicators) return;

    const isOracleActivated = this.currentState === OracleState.ACTIVATED;

    if (isOracleActivated) {
      // Скрываем индикатор при активации Оракула
      this.coinIndicators.setVisible(false);
    } else {
      // Показываем индикатор и устанавливаем соответствующий кадр
      this.coinIndicators.setVisible(true);
      this.coinIndicators.setFrame(this.storedCoins); // 0→frame0, 1→frame1, 2→frame2, 3→frame3
    }
  }
}

