/**
 * Модальное окно окончания игры
 * Поддерживает 3 типа: выигрыш всей игры, выигрыш уровня, проигрыш
 */

import Phaser from 'phaser';
import { Button } from './Button';
import {
  DEFAULT_FONT_FAMILY,
  GAMEOVER_TITLE_FONT_STYLE,
  GAMEOVER_SCORE_FONT_STYLE,
  GAMEOVER_BUTTON_FONT_STYLE,
  GAMEOVER_SCORE_COLOR,
  TEXT_COLORS,
  MIN_FONT_SIZE_TEXT,
  MAX_FONT_SIZE,
  GLOBAL_QUESTION_COLOR,
  GLOBAL_QUESTION_BACKGROUND_COLOR,
  KEY_FEEDBACK_FONT_STYLE,
  KEY_FEEDBACK_COLOR,
  UI_TEXT
} from '../../constants/textStyles';
import { ACTOR_SIZES, BASE_SCALE, DEPTHS } from '../../constants/gameConstants';
import { calculateModalSize } from './ModalSizeCalculator';
import { calculateBaseFontSize, calculateButtonFontSize, calculateUnifiedBaseFontSize } from '../utils/FontSizeCalculator';
import { AB_TESTING } from '../../config/gameConfig';
import { NineSliceBackground } from './NineSliceBackground';
import { logger } from '../../utils/Logger';
import { snapToGrid, snapToGridDouble } from './ModalPositioningHelper';

export enum GameOverType {
  WIN_GAME = 'win_game',      // Выигрыш всей игры (YOU WIN)
  WIN_LEVEL = 'win_level',    // Выигрыш уровня (LEVEL COMPLETE)
  LOSE = 'lose'               // Проигрыш (GAME OVER)
}

export interface GameOverModalConfig {
  type: GameOverType;
  score: number;
  feedbackText?: string; // Текст фидбэка (из JSON)
  onRestart: () => void;
  onNextLevel?: () => void; // Только для WIN_LEVEL
}

export class GameOverModal {
  private scene: Phaser.Scene;
  private config: GameOverModalConfig;

  // UI элементы
  private background!: Phaser.GameObjects.Rectangle | NineSliceBackground;
  private titleText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private feedbackText?: Phaser.GameObjects.Text; // Текст фидбэка
  private playerSprite?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  private restartButton!: Button;
  private nextLevelButton?: Button;

  // ✅ Обработчик поворота экрана (не закрываем модальное окно, так как игра завершена)
  private orientationHandler?: () => void;

  // ✅ Таймер для ручной синхронизации анимации
  private animationTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, config: GameOverModalConfig) {
    this.scene = scene;
    this.config = config;

    // ✅ Настройка input
    if (scene.input) {
      scene.input.enabled = true;
      scene.input.setTopOnly(false);
    }

    // ✅ Откладываем создание UI на 1 кадр, чтобы Phaser.Scale.FIT завершил масштабирование
    // Это гарантирует, что getBoundingClientRect() вернет правильные размеры canvas
    scene.time.delayedCall(1, () => {
      this.createUI();
    });

    // ✅ Слушатель поворота экрана - пересоздаем UI при изменении ориентации
    // (не закрываем модальное окно, так как игра уже завершена)
    if (typeof window !== 'undefined') {
      this.orientationHandler = () => {
        logger.log('MODAL_UI', 'GameOverModal: Orientation change detected, recreating UI');
        // Уничтожаем старые элементы
        if (this.background) this.background.destroy();
        if (this.titleText) this.titleText.destroy();
        if (this.scoreText) this.scoreText.destroy();
        if (this.feedbackText) this.feedbackText.destroy();
        if (this.playerSprite) this.playerSprite.destroy();
        if (this.restartButton) this.restartButton.destroy();
        if (this.nextLevelButton) this.nextLevelButton.destroy();
        // Пересоздаем UI с новыми размерами
        this.createUI();
      };
      window.addEventListener('orientationchange', this.orientationHandler);
    }
  }

  private createUI(): void {
    const cam = this.scene.cameras.main;
    const invZoom = 1 / cam.zoom; // ✅ FIX BLUR: Компенсация zoom для всех текстов модального окна

    // Получаем реальный размер canvas
    const canvasRect = this.scene.game.canvas.getBoundingClientRect();
    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;

    // ✅ Используем calculateModalSize с теми же параметрами, что и KeyQuestionModal
    // IMPORTANT: Используем cam.width и cam.height напрямую (без деления на zoom)
    let modalSize = calculateModalSize(
      cam.width,      // Camera width (виртуальные пиксели)
      cam.height,     // Camera height (виртуальные пиксели)
      canvasWidth,    // Canvas width (реальные пиксели)
      canvasHeight,   // Canvas height (реальные пиксели)
      40,             // Padding (по умолчанию, как в KeyQuestionModal)
      'GameOverModal' // Имя модального окна для логов
    );

    // ✅ GRID SNAPPING: Привязка к пиксельной сетке (используем ModalPositioningHelper)
    // Чтобы избежать дробных пикселей при BASE_SCALE=4, координаты и размеры должны быть кратны 4 (или 8 для центрирования)

    const modalWidth = snapToGridDouble(modalSize.width);
    const modalHeight = snapToGridDouble(modalSize.height);
    const modalX = snapToGrid(modalSize.x);
    const modalY = snapToGrid(modalSize.y);

    logger.log('MODAL_SIZE', `GameOverModal: Camera: ${cam.width} x ${cam.height}, Modal: ${modalWidth} x ${modalHeight}`);

    // ✅ ЕДИНОЕ ПОЛЕ ОТСТУПОВ для всех элементов внутри модального окна
    const MODAL_INTERNAL_PADDING_PERCENT = 0.08; // 8% от меньшей стороны
    const MODAL_INTERNAL_PADDING_MIN = 30; // Минимум 30 виртуальных пикселей
    const modalMinSize = Math.min(modalWidth, modalHeight);
    const internalPadding = Math.max(
      MODAL_INTERNAL_PADDING_MIN,
      modalMinSize * MODAL_INTERNAL_PADDING_PERCENT
    );

    // Доступная область для контента
    const contentAreaWidth = modalWidth - (internalPadding * 2);
    const contentAreaHeight = modalHeight - (internalPadding * 2);

    // Границы контентной области
    const contentAreaLeft = modalX - modalWidth / 2 + internalPadding;
    const contentAreaRight = modalX + modalWidth / 2 - internalPadding;
    const contentAreaTop = modalY - modalHeight / 2 + internalPadding;
    const contentAreaBottom = modalY + modalHeight / 2 - internalPadding;

    // Фон
    if (AB_TESTING.USE_NINE_SLICE_MODAL) {
      logger.log('MODAL_UI', 'GameOverModal: Using NineSliceBackground');
      this.background = new NineSliceBackground(
        this.scene,
        modalX,
        modalY,
        modalWidth,
        modalHeight
      ).setDepth(DEPTHS.SCREEN.MODAL_BG).setScrollFactor(0);
    } else {
      logger.log('MODAL_UI', 'GameOverModal: Using standard Rectangle background');
      this.background = this.scene.add.rectangle(
        modalX, modalY, modalWidth, modalHeight,
        0x1a202c, 0.98
      ).setDepth(DEPTHS.SCREEN.MODAL_BG).setScrollFactor(0).setStrokeStyle(4, 0x4a5568);
    }

    // ✅ Устанавливаем разрешение для четкости текста (предотвращает размытие)
    // ✅ Устанавливаем разрешение = 1 для пиксельного шрифта
    const textResolution = 1;

    // ✅ ОТСТУП МЕЖДУ ЭЛЕМЕНТАМИ (одинаковый для всех)
    // Отступ между элементами = половина отступа от краев модального окна
    let buttonSpacing = internalPadding / 4;

    // ✅ РАСЧЕТ ОБЛАСТЕЙ: ДЕЛИМ РАБОЧУЮ ОБЛАСТЬ НА 6 РАВНЫХ ЧАСТЕЙ
    // Всего блоков: 1 (заголовок) + 1 (фидбэк) + 1 (счетчик) + 1 (персонаж) + 2 (кнопки) = 6
    const totalBlocks = 6;
    const totalSpacings = totalBlocks - 1; // 5 отступов

    // Общая высота рабочей области
    const totalContentHeight = contentAreaHeight;

    // Высота одного блока (с учетом отступов)
    const blockHeight = (totalContentHeight - (totalSpacings * buttonSpacing)) / totalBlocks;

    logger.log('MODAL_SIZE', `GameOverModal Layout: totalBlocks=${totalBlocks}, totalSpacings=${totalSpacings}, blockHeight=${blockHeight.toFixed(1)}, totalContentHeight=${totalContentHeight.toFixed(1)}`);

    // Высоты для каждого блока (все одинаковые)
    const titleAreaHeight = blockHeight;
    const feedbackAreaHeight = blockHeight;
    const scoreAreaHeight = blockHeight;
    const spriteAreaHeight = blockHeight;
    const buttonHeight = blockHeight;

    // ✅ РАСЧЕТ ПОЗИЦИЙ: создаем массив позиций снизу вверх
    // Порядок снизу вверх: кнопка "Следующий уровень" (index 0, только для WIN_LEVEL), кнопка "Рестарт" (index 1), персонаж (index 2), счетчик (index 3), заголовок (index 4)
    const blockPositions: number[] = [];
    let currentY = contentAreaBottom; // Начинаем с нижнего края

    // Рассчитываем позиции снизу вверх
    for (let i = 0; i < totalBlocks; i++) {
      currentY -= blockHeight / 2; // Центр текущего блока
      blockPositions.push(currentY);
      currentY -= blockHeight / 2; // Переходим к следующему блоку
      if (i < totalBlocks - 1) {
        currentY -= buttonSpacing; // Отступ между блоками
      }
    }

    // Индексы: [0, 1, 2, 3, 4, 5]
    const titleY = blockPositions[5]; // Заголовок - самый верхний
    const feedbackY = blockPositions[4]; // Фидбэк
    const scoreY = blockPositions[3]; // Счетчик
    const spriteY = blockPositions[2]; // Персонаж
    const nextLevelButtonY = blockPositions[1]; // Кнопка "Следующий уровень"
    const restartButtonY = blockPositions[0]; // Кнопка Рестарт - самая нижняя

    // ✅ РАСЧЕТ ЕДИНОГО БАЗОВОГО РАЗМЕРА ШРИФТА
    // Используем calculateUnifiedBaseFontSize для унификации с KeyQuestionModal/PortalModal
    // ⚠️ ВАЖНО: Для GameOverModal ВСЕГДА используем level=1, независимо от типа (WIN_GAME/WIN_LEVEL/LOSE)
    // Это гарантирует консистентный размер шрифта между всеми тремя типами модального окна
    const baseFontSize = calculateUnifiedBaseFontSize(this.scene, 1); // ✅ Фиксированный level=1 для унификации
    logger.log('MODAL_SIZE', `GameOverModal: baseFontSize (unified, level=1): ${baseFontSize.toFixed(2)}px`);

    // Используем реальный текст для расчета размеров элементов
    const titleTextForCalculation = this.getTitleText();

    logger.log('MODAL_SIZE', `GameOverModal: baseFontSize (unified): ${baseFontSize.toFixed(2)}px`);

    // ✅ ЗАГОЛОВОК: используем baseFontSize напрямую (унификация)
    const titleFontSizeRaw = baseFontSize;
    logger.log('MODAL_SIZE', `GameOverModal: Title: base=${baseFontSize.toFixed(2)}px, final=${titleFontSizeRaw.toFixed(2)}px`);

    // ✅ КНОПКИ: используем тот же размер, что и для текстовых элементов (как в KeyQuestionModal)
    const buttonWidth = contentAreaWidth;
    logger.log('MODAL_SIZE', `GameOverModal: buttonWidth: ${buttonWidth}, buttonHeight: ${buttonHeight}`);

    // ✅ Используем baseFontSize напрямую для кнопок, без отдельного расчёта
    let buttonFontSizeRaw = baseFontSize;
    logger.log('MODAL_SIZE', `GameOverModal: Button: base=${baseFontSize.toFixed(2)}px, final=${buttonFontSizeRaw.toFixed(2)}px`);

    // ✅ Находим unified размер для всех элементов (заголовок, кнопки)
    // ⚠️ ВАЖНО: feedback и score НЕ включаем в unifiedFontSize!
    // Они используют свои множители и должны адаптироваться к unified size, а не определять его.
    let unifiedFontSize = Math.min(titleFontSizeRaw, buttonFontSizeRaw);
    logger.log('MODAL_SIZE', `GameOverModal: unifiedFontSize (min of title/button): ${unifiedFontSize.toFixed(2)}px, feedback/score excluded`);

    // ✅ КОНСТАНТЫ МНОЖИТЕЛЕЙ для GameOverModal (унифицировано с KeyQuestionModal)
    const TITLE_SCORE_MULTIPLIER = 2.0;   // GAME OVER, LEVEL COMPLETE, Score - 2x
    const BUTTON_MULTIPLIER = 1.3;         // Кнопки - 1.3x (как в KeyQuestionModal)
    const FEEDBACK_MULTIPLIER = 1.3;       // ✅ Фидбэк унифицирован с KeyQuestionModal - 1.3x

    // ✅ Применяем множители
    const titleFontSize = unifiedFontSize * TITLE_SCORE_MULTIPLIER;
    const scoreFontSize = unifiedFontSize * TITLE_SCORE_MULTIPLIER;
    const buttonFontSize = unifiedFontSize * BUTTON_MULTIPLIER;
    const feedbackFontSize = unifiedFontSize * FEEDBACK_MULTIPLIER; // ✅ Унифицирован с KeyQuestionModal

    logger.log('MODAL_SIZE', `GameOverModal: TITLE_SCORE_MULTIPLIER: ${TITLE_SCORE_MULTIPLIER}, BUTTON_MULTIPLIER: ${BUTTON_MULTIPLIER}, FEEDBACK_MULTIPLIER: ${FEEDBACK_MULTIPLIER}, FINAL SIZES: title=${titleFontSize.toFixed(2)}, score=${scoreFontSize.toFixed(2)}, button=${buttonFontSize.toFixed(2)}, feedback=${feedbackFontSize.toFixed(2)}`);

    // ✅ Заголовок - самый верхний блок
    const titleTextToDisplay = this.getTitleText();

    // ✅ Округляем координаты до целых пикселей для предотвращения размытия
    const titleTextX = Math.round(modalX);
    const titleTextY = Math.round(titleY);

    this.titleText = this.scene.add.text(
      titleTextX, // ✅ Округлено до целого пикселя
      titleTextY, // ✅ Округлено до целого пикселя
      titleTextToDisplay,
      {
        fontSize: `${Math.round(titleFontSize)}px`,
        fontFamily: 'monospace', // ✅ Моноширинный шрифт для четкости
        fontStyle: GAMEOVER_TITLE_FONT_STYLE,
        color: this.getTitleColor(),
        wordWrap: { width: contentAreaWidth * 0.9 }, // ✅ v2 - 90% ширины для отступов по бокам
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);

    // ✅ Устанавливаем разрешение для четкости текста (предотвращает размытие)
    this.titleText.setResolution(textResolution);

    // ✅ ВАЖНО: Применяем setScale(invZoom) для четкости текста при zoom камеры (invZoom объявлен в начале createUI)
    this.titleText.setScale(invZoom);

    // ✅ Логирование размера шрифта заголовка
    logger.log('MODAL_SIZE', `GameOverModal: Title text: fontSize=${titleFontSize.toFixed(2)}px, text="${titleTextToDisplay}"`);

    // ✅ Блок фидбэка (только если передан текст)
    if (this.config.feedbackText) {
      const feedbackX = Math.round(modalX);
      const roundedFeedbackY = Math.round(feedbackY);

      // ✅ wordWrap width должен учитывать invZoom для правильного переноса строк
      // Когда применяем setScale(invZoom), ширина текста масштабируется, поэтому wordWrap.width
      // нужно разделить на invZoom, чтобы перенос строк происходил в нужном месте
      const feedbackWordWrapWidth = (contentAreaWidth * 0.95) / invZoom; // 95% ширины с компенсацией zoom

      this.feedbackText = this.scene.add.text(
        feedbackX,
        roundedFeedbackY,
        this.config.feedbackText,
        {
          fontSize: `${Math.round(feedbackFontSize)}px`,
          fontFamily: 'monospace', // ✅ Моноширинный шрифт для четкости
          fontStyle: KEY_FEEDBACK_FONT_STYLE, // ✅ Унифицировано с KeyQuestionModal (bold italic)
          color: KEY_FEEDBACK_COLOR, // ✅ Унифицировано с KeyQuestionModal
          wordWrap: { width: feedbackWordWrapWidth },
          align: 'center'
        }
      ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_BUTTON).setScrollFactor(0);

      this.feedbackText.setResolution(textResolution);

      // ✅ ВАЖНО: Применяем setScale(invZoom) для четкости текста при zoom камеры (invZoom объявлен в начале createUI)
      this.feedbackText.setScale(invZoom);

      logger.log('MODAL_SIZE', `GameOverModal: Feedback wordWrap width: ${feedbackWordWrapWidth.toFixed(1)}px (contentAreaWidth=${contentAreaWidth.toFixed(1)}, invZoom=${invZoom.toFixed(3)})`);
    }

    // ✅ Счетчик очков
    const scoreTextToDisplay = `${UI_TEXT.SCORE_PREFIX}${this.config.score}`;

    // ✅ Округляем координаты до целых пикселей для предотвращения размытия
    const scoreTextX = Math.round(modalX);
    const scoreTextY = Math.round(scoreY);

    this.scoreText = this.scene.add.text(
      scoreTextX, // ✅ Округлено до целого пикселя
      scoreTextY, // ✅ Округлено до целого пикселя
      scoreTextToDisplay,
      {
        fontSize: `${Math.round(scoreFontSize)}px`,
        fontFamily: 'monospace', // ✅ Моноширинный шрифт для четкости
        fontStyle: GAMEOVER_SCORE_FONT_STYLE,
        color: GAMEOVER_SCORE_COLOR,
        wordWrap: { width: contentAreaWidth },
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);

    // ✅ Устанавливаем разрешение для четкости текста (предотвращает размытие)
    this.scoreText.setResolution(textResolution);

    // ✅ ВАЖНО: Применяем setScale(invZoom) для четкости текста при zoom камеры (invZoom объявлен в начале createUI)
    this.scoreText.setScale(invZoom);

    // ✅ Логирование размера шрифта счетчика
    logger.log('MODAL_SIZE', `GameOverModal: Score text: fontSize=${scoreFontSize.toFixed(2)}px, text="${scoreTextToDisplay}"`);

    // ✅ Персонаж с анимацией - используем рассчитанную позицию
    this.createPlayerAnimation(modalX, spriteY);

    // ✅ Кнопка Рестарт
    // ✅ Округляем координаты до целых пикселей для предотвращения размытия
    const restartButtonX = Math.round(modalX);
    const roundedRestartButtonY = Math.round(restartButtonY);

    this.restartButton = new Button(this.scene, {
      x: restartButtonX, // ✅ Округлено до целого пикселя
      y: roundedRestartButtonY, // ✅ Округлено до целого пикселя
      width: buttonWidth,
      height: buttonHeight,
      text: 'ИГРАТЬ ЗАНОВО',
      fontSize: buttonFontSize, // ✅ В 1.5 раза больше общего размера
      wordWrap: { width: buttonWidth }, // ✅ Максимальная ширина для переноса
      onClick: () => {
        logger.log('BUTTON_EVENTS', 'GameOverModal: Restart button clicked');
        this.config.onRestart();
        this.destroy();
      }
    });
    this.restartButton.setDepth(DEPTHS.SCREEN.MODAL_BUTTON);

    // ✅ Логирование размера шрифта кнопки Рестарт
    logger.log('MODAL_SIZE', `GameOverModal: Restart button: fontSize=${buttonFontSize.toFixed(2)}px`);

    // ✅ Кнопка "Следующий уровень" (только для WIN_LEVEL)
    if (this.config.type === GameOverType.WIN_LEVEL && this.config.onNextLevel) {
      // ✅ Округляем координаты до целых пикселей для предотвращения размытия
      const nextLevelButtonX = Math.round(modalX);
      const roundedNextLevelButtonY = Math.round(nextLevelButtonY);

      this.nextLevelButton = new Button(this.scene, {
        x: nextLevelButtonX, // ✅ Округлено до целого пикселя
        y: roundedNextLevelButtonY, // ✅ Округлено до целого пикселя
        width: buttonWidth,
        height: buttonHeight,
        text: 'СЛЕДУЮЩИЙ УРОВЕНЬ',
        fontSize: buttonFontSize, // ✅ В 1.5 раза больше общего размера
        wordWrap: { width: buttonWidth }, // ✅ Максимальная ширина для переноса
        onClick: () => {
          logger.log('BUTTON_EVENTS', 'GameOverModal: Next level button clicked');
          if (this.config.onNextLevel) {
            this.config.onNextLevel();
          }
          this.destroy();
        }
      });
      this.nextLevelButton.setDepth(DEPTHS.SCREEN.MODAL_BUTTON);

      // ✅ Логирование размера шрифта кнопки "Следующий уровень"
      logger.log('MODAL_SIZE', `GameOverModal: Next level button: fontSize=${buttonFontSize.toFixed(2)}px`);
    }
  }

  private getTitleText(): string {
    switch (this.config.type) {
      case GameOverType.WIN_GAME:
        return 'YOU WIN';
      case GameOverType.WIN_LEVEL:
        return 'УРОВЕНЬ ПРОЙДЕН!';
      case GameOverType.LOSE:
        return 'GAME OVER';
      default:
        return 'GAME OVER';
    }
  }

  private getTitleColor(): string {
    switch (this.config.type) {
      case GameOverType.WIN_GAME:
      case GameOverType.WIN_LEVEL:
        return TEXT_COLORS.PORTAL_WRONG; // ✅ Красный для победы
      case GameOverType.LOSE:
        return TEXT_COLORS.PORTAL_WRONG; // ✅ Красный для поражения
      default:
        return TEXT_COLORS.WHITE; // ✅ Белый по умолчанию
    }
  }

  private createPlayerAnimation(modalX: number, spriteY: number): void {
    // ✅ Для проигрыша используем статическую текстуру Character.GameOver_16x16.png
    if (this.config.type === GameOverType.LOSE) {
      const gameOverKey = 'character_gameover';

      // Проверяем, загружена ли текстура
      if (!this.scene.textures.exists(gameOverKey)) {
        logger.warn('MODAL_UI', 'GameOverModal: Character.GameOver texture not loaded, skipping');
        return;
      }

      // Создаем статическое изображение (не спрайт с анимацией)
      this.playerSprite = this.scene.add.image(
        modalX,
        spriteY, // ✅ Используем рассчитанную позицию
        gameOverKey
      ).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);

      // ✅ Масштабируем персонажа используя константу из системы масштабирования
      this.playerSprite.setScale(BASE_SCALE * ACTOR_SIZES.PLAYER);
    } else {
      // ✅ Для выигрыша используем анимацию из Character.Win_64x16.png
      const spriteKey = 'character_win';

      // Проверяем, загружен ли спрайтшит
      if (!this.scene.textures.exists(spriteKey)) {
        logger.warn('MODAL_UI', 'GameOverModal: Character.Win sprite not loaded, skipping animation');
        return;
      }

      // Создаем спрайт
      const sprite = this.scene.add.sprite(
        modalX,
        spriteY, // ✅ Используем рассчитанную позицию
        spriteKey
      ).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);

      // Сохраняем спрайт в поле класса
      this.playerSprite = sprite;

      // ✅ Используем анимацию из конфигурации (уже создана через AnimationManager)
      const animKey = 'boy_jump_win';

      // Проверяем, что анимация существует (она должна быть создана в MainScene через SPRITESHEET_CONFIGS)
      if (!this.scene.anims.exists(animKey)) {
        logger.warn('MODAL_UI', `GameOverModal: Animation "${animKey}" not found. It should be created via SPRITESHEET_CONFIGS.`);
        return;
      }

      // Запускаем анимацию нативно (на всякий случай)
      sprite.play(animKey, true);

      // ✅ ВНЕДРЯЕМ РУЧНУЮ СИНХРОНИЗАЦИЮ КАДРОВ
      // Это нужно, так как в проекте для physics спрайтов нативная анимация может не работать при паузе
      const anim = this.scene.anims.get(animKey);
      if (anim && anim.frames && anim.frames.length > 0) {
        let currentFrameIdx = 0;
        const frameRate = anim.frameRate || 8;
        const interval = 1000 / frameRate;

        logger.log('MODAL_UI', `GameOverModal: Initializing manual animation sync for "${animKey}": frameRate=${frameRate}, interval=${interval}, totalFrames=${anim.frames.length}`);

        // Создаем таймер для переключения кадров
        this.animationTimer = this.scene.time.addEvent({
          delay: interval,
          callback: () => {
            if (!sprite || !sprite.active) return;

            // Переходим к следующему кадру
            currentFrameIdx = (currentFrameIdx + 1) % anim.frames.length;
            const animFrame = anim.frames[currentFrameIdx];

            if (animFrame && animFrame.frame) {
              const animFrameObj = animFrame.frame;
              let frameIndex: number | undefined;

              // Определяем индекс кадра (совместимо с разными форматами кадров Phaser)
              if (typeof (animFrameObj as any).index === 'number') {
                frameIndex = (animFrameObj as any).index;
              } else if (typeof animFrameObj.name === 'string') {
                frameIndex = parseInt(animFrameObj.name, 10);
              }

              if (frameIndex !== undefined) {
                sprite.setFrame(frameIndex);

                // Логируем изредка для проверки
                if (Math.random() < 0.05) {
                  logger.log('MODAL_UI', `GameOverModal: Manual frame sync: ${currentFrameIdx} -> frameIndex ${frameIndex}`);
                }
              }
            }
          },
          loop: true
        });
      }

      logger.log('MODAL_UI', `GameOverModal: Playing win animation "${animKey}" on sprite: isPlaying=${sprite.anims.isPlaying}, currentAnim=${sprite.anims.currentAnim?.key}, frame=${sprite.frame.name}`);

      // ✅ Масштабируем персонажа используя константу из системы масштабирования
      sprite.setScale(BASE_SCALE * ACTOR_SIZES.PLAYER); // Используем константу масштабирования игрока
    }
  }

  public destroy(): void {
    // ✅ Удаляем слушатель поворота экрана
    if (this.orientationHandler && typeof window !== 'undefined') {
      window.removeEventListener('orientationchange', this.orientationHandler);
      this.orientationHandler = undefined;
    }

    // ✅ Удаляем таймер анимации
    if (this.animationTimer) {
      this.animationTimer.remove();
      this.animationTimer = null;
    }

    if (this.background) this.background.destroy();
    if (this.titleText) this.titleText.destroy();
    if (this.scoreText) this.scoreText.destroy();
    if (this.feedbackText) this.feedbackText.destroy();
    if (this.playerSprite) {
      this.playerSprite.destroy();
    }
    // Проверка на существование кнопок перед удалением
    if (this.restartButton) this.restartButton.destroy();
    if (this.nextLevelButton) {
      this.nextLevelButton.destroy();
    }
  }

  public setVisible(visible: boolean): void {
    this.background.setVisible(visible);
    this.titleText.setVisible(visible);
    this.scoreText.setVisible(visible);
    if (this.playerSprite) {
      this.playerSprite.setVisible(visible);
    }
    this.restartButton.setVisible(visible);
    if (this.nextLevelButton) {
      this.nextLevelButton.setVisible(visible);
    }
  }

  // ✅ Метод для получения спрайта для обновления анимации (только для выигрыша, проигрыш - статическое изображение)
  public getPlayerSprite(): Phaser.GameObjects.Sprite | undefined {
    // ✅ Возвращаем только если это Sprite (для выигрыша), не Image (для проигрыша)
    return this.playerSprite instanceof Phaser.GameObjects.Sprite ? this.playerSprite : undefined;
  }
}