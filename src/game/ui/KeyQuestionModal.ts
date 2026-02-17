/**
 * Модальное окно для мини-вопросов при поднятии ключей
 * Отображается в Phaser сцене
 */

import Phaser from 'phaser';
import { Button, ButtonState } from './Button';
import { ParsedQuestion, QuestionType } from '../../types/questionTypes';
import { AB_TESTING } from '../../config/gameConfig';
import { BASE_SCALE } from '../../constants/gameConstants';
import {
  DEFAULT_FONT_FAMILY,
  KEY_QUESTION_FONT_SIZE_MULTIPLIER,
  KEY_FEEDBACK_FONT_SIZE_MULTIPLIER,
  KEY_QUESTION_FONT_STYLE,
  KEY_FEEDBACK_FONT_STYLE,
  KEY_BUTTON_FONT_STYLE,
  KEY_BUTTON_FONT_SIZE_MULTIPLIER,
  KEY_QUESTION_COLOR,
  KEY_FEEDBACK_COLOR,
  MIN_FONT_SIZE_TEXT,
  MIN_FONT_SIZE_BUTTON,
  MAX_FONT_SIZE,
  BUTTON_PADDING_BASE_X,
  BUTTON_PADDING_BASE_Y,
  KEY_QUESTION_MODAL_MAX_FONT_SIZE
} from '../../constants/textStyles';
import { LONGEST_TEXTS_MINI_QUIZZES } from '../../constants/textLengths';
import { calculateModalSize } from './ModalSizeCalculator';
import {
  calculateBaseFontSize,
  calculateButtonFontSize,
  calculateTieredFontSize,
  calculateTieredFontSizeSimple,
  CHAR_WIDTH_RATIO_MONO,
  CHAR_WIDTH_RATIO_SANS,
  calculateUnifiedBaseFontSize,
  getButtonPadding,
  getModalFontMultiplier,
  MAX_OPTIMAL_FONT_SIZE
} from '../utils/FontSizeCalculator';
import { NineSliceBackground } from './NineSliceBackground';
import { logger } from '../../utils/Logger';
import { DEBUG_MODAL_BOUNDS } from '../../config/debugConfig';

export interface KeyQuestionModalConfig {
  question: ParsedQuestion;
  onCorrectAnswer: () => void;
  onWrongAnswer: (damage: number) => void; // ✅ Принимает урон как параметр
  onClose: () => void;
}

export class KeyQuestionModal {
  private scene: Phaser.Scene;
  private config: KeyQuestionModalConfig;
  private parsedQuestion: ParsedQuestion;

  // UI элементы
  private background!: Phaser.GameObjects.Rectangle | NineSliceBackground; // Инициализируется в createUI()
  private questionText!: Phaser.GameObjects.Text; // Инициализируется в createUI()
  private feedbackText?: Phaser.GameObjects.Text;
  private answerButtons: Button[] = [];
  private closeButton!: Phaser.GameObjects.Image; // ✅ Изменено с Text на Image (текстура ui_dialog_close)

  // Состояние
  private correctButtonIndex: number = -1;
  private selectedButtonIndex: number = -1; // ✅ Индекс выбранной для подтверждения кнопки
  private isAnswered: boolean = false;
  private isCorrect: boolean = false;

  // ✅ Защита от случайных нажатий
  private buttonsEnabled: boolean = false; // ✅ Кнопки активны только после задержки
  private creationTime: number = 0; // ✅ Время создания модального окна
  private lastInteractionTime: number = 0; // ✅ Время последнего взаимодействия (для дебаунса)

  // ✅ Обработчик поворота экрана
  private orientationHandler?: () => void;

  // ✅ Флаг инициализации
  private isInitialized: boolean = false;
  private initTimer?: Phaser.Time.TimerEvent; // ✅ Timer for delayed initialization

  // ✅ ДЕБАГ: Ссылка на debugGraphics для уничтожения
  private debugGraphics?: Phaser.GameObjects.Graphics;

  /**
   * Check if scene input is available for keyboard events
   */
  private isInputAvailable(): boolean {
    return !!(
      this.scene?.input &&
      this.scene.input.keyboard &&
      this.scene.sys?.settings?.active
    );
  }

  constructor(scene: Phaser.Scene, config: KeyQuestionModalConfig) {
    this.scene = scene;
    this.config = config;
    this.parsedQuestion = config.question;

    // ✅ Сохраняем время создания для защиты от случайных нажатий
    this.creationTime = scene.time.now;
    this.buttonsEnabled = false; // ✅ Кнопки изначально отключены

    // ✅ Более надежная настройка input
    if (!this.isInputAvailable()) {
      logger.warn('MODAL_UI', 'KeyQuestionModal: Scene input or keyboard not available');
      return;
    }

    scene.input.enabled = true;
    scene.input.setTopOnly(false); // ✅ Разрешаем клики по всем слоям для кнопок
    logger.log('MODAL_UI', 'KeyQuestionModal: Input enabled, setTopOnly(false)');

    // ✅ Останавливаем все активные pointer события перед созданием UI
    // Это предотвращает случайные клики при открытии модального окна
    if (!this.isInputAvailable()) {
      logger.warn('MODAL_UI', 'KeyQuestionModal: Input not available for pointer clearing');
    } else {
      try {
        // ✅ Безопасная очистка pointer событий (методы могут не существовать в некоторых версиях Phaser)
        const input = scene.input as any; // Приведение к any для обхода проверки типов
        if (typeof input.clearDragState === 'function') {
          input.clearDragState();
        }
        if (typeof input.clearHitTest === 'function') {
          input.clearHitTest();
        }
        if (scene.input.activePointer && typeof (scene.input.activePointer as any).reset === 'function') {
          (scene.input.activePointer as any).reset();
        }
      } catch (e) {
        logger.warn('MODAL_UI', 'KeyQuestionModal: Error clearing pointer state', e);
        // Продолжаем создание UI даже если очистка не удалась
      }
    }

    // ✅ Откладываем создание UI на 1 кадр, чтобы Phaser.Scale.FIT завершил масштабирование
    // Это гарантирует, что getBoundingClientRect() вернет правильные размеры canvas
    // ✅ Откладываем создание UI на 1 кадр, чтобы Phaser.Scale.FIT завершил масштабирование
    // Это гарантирует, что getBoundingClientRect() вернет правильные размеры canvas
    // ✅ Откладываем создание UI на 1 кадр, чтобы Phaser.Scale.FIT завершил масштабирование
    // Это гарантирует, что getBoundingClientRect() вернет правильные размеры canvas
    this.initTimer = scene.time.delayedCall(1, async () => {
      try {
        // ✅ Создаем UI асинхронно (загружаем данные для расчета шрифта)
        await this.createUI();
        this.isInitialized = true; // ✅ UI успешно создан, объект полностью инициализирован
        logger.log('MODAL_UI', 'KeyQuestionModal: UI created successfully');
      } catch (error) {
        logger.log('MODAL_UI', '❌ KeyQuestionModal: Error creating UI', error);
        throw error; // Пробрасываем ошибку дальше
      }

      // ✅ Включаем кнопки через задержку (после того, как палец будет поднят)
      const BUTTON_ENABLE_DELAY = 300;
      scene.time.delayedCall(BUTTON_ENABLE_DELAY, () => {
        this.buttonsEnabled = true;
        logger.log('MODAL_UI', 'KeyQuestionModal: Buttons enabled after delay');
      });
    });

    // ✅ Слушатель поворота экрана - закрывает модальное окно при изменении ориентации
    if (typeof window !== 'undefined') {
      this.orientationHandler = () => {
        logger.log('MODAL_UI', 'KeyQuestionModal: Orientation change detected, closing modal');
        this.destroy();
      };
      window.addEventListener('orientationchange', this.orientationHandler);
    }

    logger.log('MODAL_UI', `KeyQuestionModal: Created with input: ${scene.input?.enabled}`);

    // ✅ Инициализация завершена успешно
    this.isInitialized = true;
  }

  private async createUI(): Promise<void> {
    // ✅ Устанавливаем разрешение для четкости текста (предотвращает размытие)
    // Используем devicePixelRatio для высоких DPI экранов, но ограничиваем до 2 для производительности
    // ✅ Устанавливаем разрешение = 1 для пиксельного шрифта
    const textResolution = 1;

    const cam = this.scene.cameras.main;
    const invZoom = 1 / cam.zoom; // ✅ FIX BLUR: Компенсация zoom для всех текстов модального окна

    // Получаем реальный размер canvas
    const canvasRect = this.scene.game.canvas.getBoundingClientRect();
    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;

    // 🐛 DEBUG: Проверяем входные данные
    console.log('=== KeyQuestionModal BEFORE calculateModalSize ===', { cam: { w: cam.width, h: cam.height }, canvas: { w: canvasWidth, h: canvasHeight } });

    // ✅ Используем функцию расчета размеров из бэкапного проекта
    // IMPORTANT: Используем cam.width и cam.height напрямую (без деления на zoom)
    let modalSize = calculateModalSize(
      cam.width,      // Camera width (виртуальные пиксели)
      cam.height,     // Camera height (виртуальные пиксели)
      canvasWidth,    // Canvas width (реальные пиксели)
      canvasHeight,   // Canvas height (реальные пиксели)
      40,             // Padding (по умолчанию в бэкапной версии)
      'KeyQuestionModal' // Имя модального окна для логов
    );

    // 🐛 DEBUG: Проверяем результат
    console.log('=== KeyQuestionModal AFTER calculateModalSize ===', { modalSize });

    // ✅ GRID SNAPPING: Привязка к пиксельной сетке
    // Чтобы избежать дробных пикселей при BASE_SCALE=4, координаты и размеры должны быть кратны 4 (или 8 для центрирования)

    // Округляем позицию до BASE_SCALE (4)
    const snapToGrid = (val: number) => Math.round(val / BASE_SCALE) * BASE_SCALE;

    // Округляем размер до 2 * BASE_SCALE (8), чтобы половина размера (width/2) тоже попадала в сетку (4)
    const snapToGridDouble = (val: number) => Math.round(val / (BASE_SCALE * 2)) * (BASE_SCALE * 2);

    const modalWidth = snapToGridDouble(modalSize.width);
    const modalHeight = snapToGridDouble(modalSize.height);

    // ✅ Используем modalSize.x и modalSize.y напрямую (уже правильные из calculateModalSize)
    const modalX = snapToGrid(modalSize.x);
    const modalY = snapToGrid(modalSize.y);

    // ... (rest of the code using these values)

    // ✅ ЕДИНОЕ ПОЛЕ ОТСТУПОВ для всех элементов внутри модального окна
    // Используем процент от меньшей стороны для одинакового отступа по всем сторонам
    const MODAL_INTERNAL_PADDING_PERCENT = 0.08; // 8% от меньшей стороны
    const MODAL_INTERNAL_PADDING_MIN = 30; // Минимум 30 виртуальных пикселей

    // Рассчитываем отступ от меньшей стороны (гарантирует одинаковый отступ)
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

    // ✅ ЛОГИРОВАНИЕ РАЗМЕРОВ (для отладки границ блоков)
    const sizes = {
      modalWidth: modalWidth.toFixed(0),
      modalHeight: modalHeight.toFixed(0),
      modalX: modalX.toFixed(0),
      modalY: modalY.toFixed(0),
      internalPadding: internalPadding.toFixed(0),
      contentAreaWidth: contentAreaWidth.toFixed(0),
      contentAreaHeight: contentAreaHeight.toFixed(0)
    };
    console.log('📏 Modal Sizes:', sizes);
    // Also store globally for debugging
    if (DEBUG_MODAL_BOUNDS) {
      (window as any).modalDebugSizes = sizes;
    }

    // Фон (НЕ интерактивный, чтобы не блокировать клики по кнопкам)
    if (AB_TESTING.USE_NINE_SLICE_MODAL) {
      this.background = new NineSliceBackground(
        this.scene,
        modalX,
        modalY,
        modalWidth,
        modalHeight
      ).setDepth(2000).setScrollFactor(0);
    } else {
      this.background = this.scene.add.rectangle(
        modalX, modalY, modalWidth, modalHeight,
        0x1a202c, 0.95
      ).setDepth(2000).setScrollFactor(0).setStrokeStyle(4, 0x4a5568);
    }
    // Важно: фон НЕ интерактивный, чтобы клики проходили к кнопкам

    // ✅ ОТСТУП МЕЖДУ ЭЛЕМЕНТАМИ (одинаковый для всех)
    // Отступ между кнопками = половина отступа от краев модального окна
    let buttonSpacing = internalPadding / 4;

    // ✅ РАСЧЕТ ОБЛАСТЕЙ: ДЕЛИМ РАБОЧУЮ ОБЛАСТЬ НА 5 РАВНЫХ ЧАСТЕЙ
    // Всего блоков: 1 (вопрос) + 1 (фидбэк) + 3 (кнопки) = 5
    const totalBlocks = 5;
    const totalSpacings = totalBlocks - 1; // 4 отступа

    // Общая высота рабочей области
    const totalContentHeight = contentAreaHeight;

    // Высота одного блока (с учетом отступов)
    const blockHeight = (totalContentHeight - (totalSpacings * buttonSpacing)) / totalBlocks;

    console.log('📏 KeyQuestionModal Layout:', `totalBlocks=${totalBlocks}, blockHeight=${blockHeight.toFixed(1)}`);

    // Высоты для каждого блока (все одинаковые)
    const questionAreaHeight = blockHeight;
    const feedbackAreaHeight = blockHeight;

    // ✅ РАСЧЕТ ПОЗИЦИЙ: создаем массив позиций снизу вверх
    // Порядок снизу вверх: кнопка C (index 2), кнопка B (index 1), кнопка A (index 0), фидбэк, вопрос
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

    // Блоки в массиве (снизу вверх): [кнопка C (index 2), кнопка B (index 1), кнопка A (index 0), фидбэк, вопрос]
    // Индексы: [0, 1, 2, 3, 4]
    // При отображении инвертируем: A (index 0) -> blockPositions[2], B (index 1) -> blockPositions[1], C (index 2) -> blockPositions[0]
    const questionY = blockPositions[4]; // Вопрос - самый верхний
    const feedbackY = blockPositions[3]; // Фидбэк

    // ✅ ДЕБАЖНАЯ ВИЗУАЛИЗАЦИЯ: Отрисовка границ блоков
    // Управляется через .env: VITE_DEBUG_MODAL_BOUNDS=true
    if (DEBUG_MODAL_BOUNDS) {
      this.debugGraphics = this.scene.add.graphics();
      // ✅ ВАЖНО: depth 3000 (НИЖЕ UI), disableInteractive() (НЕ БЛОКИРУЕТ!)
      this.debugGraphics.setDepth(3000).setScrollFactor(0).disableInteractive();

      // ✅ Используем modalWidth вместо contentAreaWidth (ширина всего модального окна)
      // Padding должен быть учтен при позиционировании элементов внутри

      // Цвета для разных блоков
      const colors = {
        question: 0x00ff00,    // Зелёный для вопроса
        feedback: 0xffff00,    // Жёлтый для фидбэка
        button: 0xff00ff       // Маджента для кнопок
      };

      // ✅ ИСПРАВЛЕНИЕ: Используем ширину модального окна минус padding
      // contentAreaWidth = modalWidth - (internalPadding * 2)
      const blockWidth = modalWidth - (internalPadding * 2);
      const blockLeft = modalX - blockWidth / 2;

      // Рисуем границы блоков
      this.debugGraphics.lineStyle(2, colors.question, 0.8);
      this.debugGraphics.strokeRect(
        blockLeft,
        questionY - blockHeight / 2,
        blockWidth,
        blockHeight
      );

      this.debugGraphics.lineStyle(2, colors.feedback, 0.8);
      this.debugGraphics.strokeRect(
        blockLeft,
        feedbackY - blockHeight / 2,
        blockWidth,
        blockHeight
      );

      this.debugGraphics.lineStyle(2, colors.button, 0.8);
      for (let i = 0; i < 3; i++) {
        const buttonY = blockPositions[i];
        this.debugGraphics.strokeRect(
          blockLeft,
          buttonY - blockHeight / 2,
          blockWidth,
          blockHeight
        );
      }

      // Логирование
      console.log('🎨 Bounds:', {
        modalX: modalX,
        modalWidth: modalWidth.toFixed(0),
        internalPadding: internalPadding.toFixed(0),
        blockWidth: blockWidth.toFixed(0),
        blockHeight: blockHeight.toFixed(1),
        blockLeft: blockLeft.toFixed(0),
        blockRight: (blockLeft + blockWidth).toFixed(0)
      });
    }

    // ✅ РАСЧЕТ ЕДИНОГО БАЗОВОГО РАЗМЕРА ШРИФТА
    // Используем единый базовый размер для всех модальных окон
    const currentLevel = this.scene.data.get('currentLevel') as number | undefined || 1; // По умолчанию уровень 1
    // ✅ DATA-DRIVEN SIZING: Получаем самые длинные тексты из JSON текущего уровня
    // Это позволяет использовать крупный шрифт, если в JSON только короткие тексты (тесты)
    const quizManager = this.scene.data.get('quizManager');

    // Default fallback - change to SHORT to indicate error visually (Large Font)
    let longestTexts = {
      question: 'Q?',
      answer: 'A',
      feedback: 'OK'
    };

    if (quizManager && typeof quizManager.getLongestMiniQuizTexts === 'function') {
      try {
        // Асинхронно сканируем JSON
        longestTexts = await quizManager.getLongestMiniQuizTexts(currentLevel);
        console.log('🔑 KeyQuestionModal: Got longest texts', longestTexts);
      } catch (e) {
        console.error('Failed to get longest mini quiz texts', e);
      }
    } else {
      console.warn('🔑 KeyQuestionModal: QuizManager not found, using short fallback');
    }

    // ✅ FIX: Recalculate baseFontSize with fetched data!
    // Previously it was calculated BEFORE fetching data, using hardcoded defaults in the utility.
    const baseFontSize = calculateUnifiedBaseFontSize(this.scene, currentLevel, longestTexts);

    console.log('📏 KeyQuestionModal baseFontSize (Data-Driven):', `${baseFontSize.toFixed(2)}px`);
    console.log('📏 KeyQuestionModal Longest Texts (Data-Driven):', `question=${longestTexts.question.length} chars, answer=${longestTexts.answer.length} chars, feedback=${longestTexts.feedback.length} chars`);

    // ✅ ЕДИНЫЙ PADDING ДЛЯ ВСЕХ 5 БЛОКОВ (вопрос, фидбэк, 3 кнопки)
    // Базовые отступы в пикселях исходной графики масштабируются через BASE_SCALE
    // paddingX = BUTTON_PADDING_BASE_X * BASE_SCALE = 3 * 4 = 12px
    // paddingY = BUTTON_PADDING_BASE_Y * BASE_SCALE = 2 * 4 = 8px
    const blockPadding = getButtonPadding(contentAreaWidth, blockHeight);
    const blockAvailableWidth = blockPadding.availableWidth;   // contentAreaWidth - (paddingX * 2)
    const blockAvailableHeight = blockPadding.availableHeight; // blockHeight - (paddingY * 2)

    console.log('📏 KeyQuestionModal Block Padding:', `width=${contentAreaWidth.toFixed(0)}→${blockAvailableWidth.toFixed(0)}, height=${blockHeight.toFixed(1)}→${blockAvailableHeight.toFixed(1)}, paddingX=${blockPadding.paddingX.toFixed(1)}, paddingY=${blockPadding.paddingY.toFixed(1)}`);

    // ✅ УРОВНЕВЫЙ РАСЧЁТ ШРИФТОВ (Tiered Font Logic: A/B/C/D)
    // Размеры рассчитываются динамически на основе доступных размеров поля

    // ✅ FIX: Пересчитываем в НАТИВНЫЕ координаты (компенсация setScale(invZoom))
    // Текст рисуется с fontSize (нативный px), затем сжимается setScale(0.625).
    // Поэтому расчёт charsPerLine должен использовать нативную ширину, а не виртуальную.
    const nativeAvailableWidth = blockAvailableWidth / invZoom;
    const nativeAvailableHeight = blockAvailableHeight / invZoom;

    console.log('📏 KeyQuestionModal Native Dimensions:', `virtual: ${blockAvailableWidth.toFixed(0)}×${blockAvailableHeight.toFixed(1)} → native: ${nativeAvailableWidth.toFixed(0)}×${nativeAvailableHeight.toFixed(1)} (invZoom=${invZoom.toFixed(3)})`);

    // ✅ НОВАЯ СИСТЕМА ABCDEF: чистая символьная арифметика (нативные координаты)
    // Вопрос (sans-serif)
    const questionFontSize = calculateTieredFontSizeSimple(
      nativeAvailableWidth,
      nativeAvailableHeight,
      longestTexts.question,
      CHAR_WIDTH_RATIO_SANS,
      KEY_QUESTION_MODAL_MAX_FONT_SIZE
    );

    // Фидбэк (monospace, bold italic) — используем CHAR_WIDTH_RATIO_MONO
    const feedbackFontSize = calculateTieredFontSizeSimple(
      nativeAvailableWidth,
      nativeAvailableHeight,
      longestTexts.feedback,
      CHAR_WIDTH_RATIO_MONO,
      KEY_QUESTION_MODAL_MAX_FONT_SIZE
    );

    // Кнопки ответов (sans-serif)
    const buttonFontSize = calculateTieredFontSizeSimple(
      nativeAvailableWidth,
      nativeAvailableHeight,
      longestTexts.answer,
      CHAR_WIDTH_RATIO_SANS,
      KEY_QUESTION_MODAL_MAX_FONT_SIZE
    );

    // ✅ КНОПКИ ОТВЕТОВ — размеры
    const buttonCount = this.parsedQuestion.allAnswers.length;
    const buttonWidth = contentAreaWidth;
    const buttonHeight = blockHeight;

    logger.log('MODAL_SIZE', `📏 KeyQuestionModal TIERED: question=${questionFontSize.toFixed(1)}px, feedback=${feedbackFontSize.toFixed(1)}px, button=${buttonFontSize.toFixed(1)}px`);

    // ✅ Размер крестика закрытия
    const closeTextureSize = 14;
    const closeScale = BASE_SCALE;
    const closeSize = closeTextureSize * closeScale;

    // ✅ wordWrap для текста вопроса (компенсация setScale(invZoom))
    const questionWordWrapWidth = blockAvailableWidth / invZoom;

    // ✅ Координаты текста вопроса (округлены до целых пикселей)
    const questionTextX = Math.round(modalX);
    const questionTextY = Math.round(questionY);

    this.questionText = this.scene.add.text(
      questionTextX,
      questionTextY,
      this.parsedQuestion.questionText,
      {
        fontSize: `${Math.round(questionFontSize)}px`,
        fontFamily: DEFAULT_FONT_FAMILY,
        fontStyle: KEY_QUESTION_FONT_STYLE,
        color: KEY_QUESTION_COLOR,
        align: 'center',
        wordWrap: { width: questionWordWrapWidth }
      }
    ).setOrigin(0.5).setDepth(2001).setScrollFactor(0);

    this.questionText.setResolution(textResolution);
    this.questionText.setScale(invZoom);

    // ✅ Поле feedbacks (над кнопками) - показывается только если включено A/B тестирование
    const feedbackTextX = Math.round(modalX);
    const feedbackTextY = Math.round(feedbackY);

    if (AB_TESTING.ENABLE_FEEDBACKS || AB_TESTING.ENABLE_WRONG_FEEDBACKS) {
      this.feedbackText = this.scene.add.text(
        feedbackTextX,
        feedbackTextY,
        '',
        {
          fontSize: `${Math.round(feedbackFontSize)}px`,
          fontFamily: 'monospace',
          fontStyle: KEY_FEEDBACK_FONT_STYLE,
          color: KEY_FEEDBACK_COLOR,
          wordWrap: { width: blockAvailableWidth / invZoom },
          align: 'center'
        }).setOrigin(0.5).setDepth(2001).setScrollFactor(0).setVisible(false);

      this.feedbackText.setResolution(textResolution);
      this.feedbackText.setScale(invZoom);
    }

    // ✅ Используем allAnswers из ParsedQuestion
    if (!this.parsedQuestion.allAnswers || this.parsedQuestion.allAnswers.length === 0) {
      logger.log('MODAL_UI', 'KeyQuestionModal: allAnswers is empty or undefined');
      return;
    }

    this.parsedQuestion.allAnswers.forEach((answer, index) => {
      const isCorrect = answer === this.parsedQuestion.correctAnswer;
      if (isCorrect) this.correctButtonIndex = index;

      // ✅ Кнопки располагаются сверху вниз: A (index 0) - самая верхняя
      // Используем позиции из массива (индексы 0, 1, 2 для кнопок)
      // blockPositions[2] - кнопка index 0 (A) - самая верхняя из кнопок
      // blockPositions[1] - кнопка index 1 (B) - средняя
      // blockPositions[0] - кнопка index 2 (C) - самая нижняя
      const buttonCount = this.parsedQuestion.allAnswers.length;
      const buttonY = blockPositions[buttonCount - 1 - index]; // Инвертируем порядок: index 0 -> blockPositions[2], index 1 -> blockPositions[1], index 2 -> blockPositions[0]

      // ✅ Округляем координаты до целых пикселей для предотвращения размытия
      const buttonX = Math.round(modalX);
      const roundedButtonY = Math.round(buttonY);

      logger.log('BUTTON_EVENTS', `KeyQuestionModal: Button ${index} at Y=${roundedButtonY}`);

      const button = new Button(this.scene, {
        x: buttonX, // ✅ Округлено до целого пикселя
        y: roundedButtonY, // ✅ Округлено до целого пикселя
        width: buttonWidth,
        height: buttonHeight,
        text: answer,
        fontSize: buttonFontSize,
        // ✅ Компенсация setScale для wordWrap: после setScale(0.625) wordPress сжимается
        // Поэтому увеличиваем ширину в 1/invZoom = 1.6 раза
        // ✅ ИСПРАВЛЕНИЕ: используем blockAvailableWidth (единый padding для всех 5 блоков)
        wordWrap: { width: blockAvailableWidth / invZoom }, // Компенсация setScale + padding
        align: 'center', // ✅ Центрирование текста
        onClick: () => this.handleAnswer(index, isCorrect)
      });

      // ✅ Убедимся, что кнопка имеет правильный depth (выше фона 2000, но ниже текста 2001)
      button.setDepth(2002);

      // ✅ Защита от переполнения для кнопок уже реализована в calculateButtonFontSize
      // Дополнительная проверка не требуется, так как размер рассчитывается с учетом самого длинного текста

      logger.log('BUTTON_EVENTS', `KeyQuestionModal: Button ${index} created at (${modalX}, ${buttonY}), fontSize=${buttonFontSize.toFixed(2)}, depth: 2002`);

      this.answerButtons.push(button);
    });

    // ✅ Кнопка закрыть - текстура ui_dialog_close (16x16)
    // Переменные closeTextureSize, closeScale, closeSize уже объявлены выше и рассчитаны корректно

    // ✅ Позиционируем крестик в правом верхнем углу так, чтобы его края совпадали с краями модального окна
    // Переменные closeTextureSize (14), closeScale (4), closeSize (56) уже объявлены выше.
    // Благодаря Grid Snapping (modalWidth кратен 8, modalX кратен 4), деление на 2 дает число кратное 4.
    // closeSize (56) тоже кратно 4. Поэтому все координаты попадают точно в пиксельную сетку.

    const closeButtonX = modalX + modalWidth / 2 - closeSize / 2;
    const closeButtonY = modalY - modalHeight / 2 + closeSize / 2;

    this.closeButton = this.scene.add.image(
      closeButtonX,
      closeButtonY,
      'ui_dialog_close'
    ).setOrigin(0.5).setDepth(2001).setScrollFactor(0).setInteractive({ useHandCursor: true });

    // ✅ ОТЛАДОЧНЫЕ ПРЯМОУГОЛЬНИКИ ДЛЯ ТЕКСТОВЫХ ОБЛАСТЕЙ
    // Показывают WordWrap boundaries — ГДЕ ТЕКСТ МОЖЕТ БЫТЬ (максимальные размеры)
    // ⚠️ ВАЖНО: Размеры в координатах экрана (НЕ делятся на invZoom!)
    // При создании текста wordWrap делится на invZoom для компенсации setScale(invZoom)
    // Но для отрисовки рамок используем исходные координаты (setScale НЕ применяется к graphics)
    if (DEBUG_MODAL_BOUNDS) {
      const textColor = 0x000000; // ✅ Чёрный для wordWrap boundaries
      const textAlpha = 1.0; // ✅ Полностью непрозрачный

      // @ts-ignore — questionWord и другие переменные не найдены в этой области
      // 1. Вопрос - wordWrap boundaries
      // ⚠️ ВАЖНО: Используем исходные размеры (с учётом padding для всех блоков)
      const questionWordWrapWidth = blockAvailableWidth; // ✅ С padding (НЕ делится на invZoom)
      const questionWordWrapHeight = blockAvailableHeight; // ✅ С padding

      const questionTextLeft = questionTextX - questionWordWrapWidth / 2;
      const questionTextTop = questionTextY - questionWordWrapHeight / 2;

      if (this.debugGraphics) {
        this.debugGraphics.lineStyle(1, textColor, textAlpha);
        this.debugGraphics.strokeRect(
          questionTextLeft,
          questionTextTop,
          questionWordWrapWidth,
          questionWordWrapHeight
        );
      }

      // 2. Фидбэк (feedbackText) - если есть
      if (this.feedbackText) {
        const feedbackWordWrapWidth = blockAvailableWidth; // ✅ С padding
        const feedbackWordWrapHeight = blockAvailableHeight; // ✅ С padding

        const feedbackTextLeft = feedbackTextX - feedbackWordWrapWidth / 2;
        const feedbackTextTop = feedbackTextY - feedbackWordWrapHeight / 2;

        if (this.debugGraphics) {
          this.debugGraphics.lineStyle(1, textColor, textAlpha);
          this.debugGraphics.strokeRect(
            feedbackTextLeft,
            feedbackTextTop,
            feedbackWordWrapWidth,
            feedbackWordWrapHeight
          );
        }
      }

      // 3. Кнопки - wordWrap boundaries
      for (let i = 0; i < this.answerButtons.length; i++) {
        const button = this.answerButtons[i];
        if (!button) continue;

        const buttonText = button['text'] as Phaser.GameObjects.Text;
        if (!buttonText) continue;

        // ✅ ИСПРАВЛЕНИЕ: Текст в Button БЕЗ wordWrap — измеряем displayWidth/displayHeight
        // Для других блоков wordWrap указан явно, для кнопок — нужно измерять фактический размер
        const buttonTextDisplayWidth = buttonText.displayWidth / invZoom; // ✅ Фактический размер текста
        const buttonTextDisplayHeight = buttonText.displayHeight / invZoom; // ✅ Фактический размер текста
        const buttonTextWordWrapWidth = blockAvailableWidth; // ✅ С padding (как у вопроса/фидбэка!)
        const buttonTextWordWrapHeight = blockAvailableHeight; // ✅ С padding (как у вопроса/фидбэка!)

        // Позиция Y кнопки из blockPositions (инвертируем как при создании)
        const buttonCount = this.parsedQuestion.allAnswers.length;
        const buttonIndex = buttonCount - 1 - i;
        const buttonTextY = blockPositions[buttonIndex];
        if (buttonTextY === undefined) continue;

        // Обертываем в блок для правильной работы TypeScript flow analysis
        {
          const buttonTextLeft = modalX - buttonTextWordWrapWidth / 2;
          const buttonTextTop = buttonTextY - buttonTextWordWrapHeight / 2;

          // @ts-ignore - textColor и textAlpha определены выше в DEBUG_SHOW_BLOCK_BOUNDS блоке
          this.debugGraphics.lineStyle(1, textColor as any, textAlpha as any);
          // @ts-ignore
          this.debugGraphics.strokeRect(
            buttonTextLeft as any,
            buttonTextTop as any,
            buttonTextWordWrapWidth,
            buttonTextWordWrapHeight
          );
        }
      }

      logger.log('MODAL_SIZE', `🎨 WordWrap boundaries: ALL 5 BLOCKS=${blockAvailableWidth.toFixed(1)}x${blockAvailableHeight.toFixed(1)} (question, feedback, 3 buttons - same padding)`);

    }

    // ✅ Масштабируем как пиксельную графику (BASE_SCALE = 4.0)
    this.closeButton.setScale(closeScale);

    // ✅ FIX BLUR: Выравнивание координат изображения по пиксельной сетке
    if (this.closeButton.displayWidth % 2 !== 0) {
      this.closeButton.x -= 0.5;
    }
    if (this.closeButton.displayHeight % 2 !== 0) {
      this.closeButton.y -= 0.5;
    }

    // ✅ Обработчики для кнопки закрытия - только pointerup для избежания двойного вызова
    let closeClickProcessed = false;
    let closePointerDownTime = 0;

    // ✅ Hover-эффект для кнопки закрытия
    const normalScale = closeScale;
    const hoverScale = closeScale * 1.15; // Увеличиваем на 15% при наведении

    this.closeButton.on('pointerover', () => {
      this.closeButton.setScale(hoverScale);
    });

    this.closeButton.on('pointerout', () => {
      this.closeButton.setScale(normalScale);
    });

    this.closeButton.on('pointerdown', () => {
      logger.log('BUTTON_EVENTS', 'Close button pointerdown');
      closeClickProcessed = false;
      closePointerDownTime = this.scene.time.now;
    });

    this.closeButton.on('pointerup', () => {
      logger.log('BUTTON_EVENTS', 'Close button pointerup');

      // ✅ Проверяем флаг для предотвращения двойного вызова
      if (closeClickProcessed) {
        logger.log('BUTTON_EVENTS', 'Close button: Click already processed');
        return;
      }

      // ✅ Проверяем, что между pointerdown и pointerup прошло достаточно времени
      const clickDuration = this.scene.time.now - closePointerDownTime;
      if (clickDuration < 50) {
        logger.log('BUTTON_EVENTS', 'Close button: Click too fast, ignoring');
        return;
      }

      closeClickProcessed = true;
      logger.log('BUTTON_EVENTS', 'Close button: Closing modal');
      this.handleClose();
    });

  }

  private handleAnswer(buttonIndex: number, isCorrect: boolean): void {
    // ✅ Проверяем инициализацию перед обработкой ответа
    if (!this.isInitialized) {
      logger.warn('MODAL_UI', 'KeyQuestionModal: Cannot handle answer - not initialized');
      return;
    }

    // ✅ Защита от случайных нажатий
    if (!this.buttonsEnabled) {
      return;
    }

    // ✅ Защита от слишком быстрых нажатий (минимум 200мс после создания)
    const timeSinceCreation = this.scene.time.now - this.creationTime;
    if (timeSinceCreation < 200) {
      return;
    }

    const button = this.answerButtons[buttonIndex];

    // ✅ 0. Проверяем, не отключена ли уже эта кнопка
    if (button.getState() === ButtonState.DISABLED) {
      return;
    }

    // Получаем AudioManager из сцены
    const audioManager = this.scene.data.get('audioManager');

    // ✅ Дебаунс: защита от двойных кликов или слишком быстрой реакции
    const DEBOUNCE_TIME = 500; // мс
    const now = this.scene.time.now;
    if (now - this.lastInteractionTime < DEBOUNCE_TIME) {
      return;
    }

    this.lastInteractionTime = now;

    // ❌ REMOVED: this.isAnswered = true; (Moved inside isCorrect check)
    // ❌ REMOVED: this.buttonsEnabled = false; (Not needed globally, wrong answer keeps buttons enabled)

    // ✅ 1. Если ответ уже был дан (правильный), разрешаем клик ТОЛЬКО по правильной кнопке (для подтверждения)
    if (this.isAnswered) {
      if (!isCorrect) {
        logger.log('MODAL_UI', 'KeyQuestionModal: Ignoring click on wrong button after correct answer');
        return;
      }
      // Если isCorrect - проходим дальше во второй блок (подтверждение)
    }

    if (isCorrect) {
      // ✅ ПРАВИЛЬНЫЙ ОТВЕТ (Original Logic)
      if (!this.isAnswered) {
        // Первый клик - включаем мигание (успех)
        this.isAnswered = true;
        this.isCorrect = true;

        if (audioManager && typeof audioManager.playQuestionSuccess === 'function') {
          audioManager.playQuestionSuccess();
        }

        // Показываем случайный фидбэк (если есть)
        if (this.feedbackText) {
          const feedback = (this.parsedQuestion.feedbacks && this.parsedQuestion.feedbacks.length > 0)
            ? this.parsedQuestion.feedbacks[Math.floor(Math.random() * this.parsedQuestion.feedbacks.length)]
            : 'Верно!';
          this.feedbackText.setText(feedback);
          this.feedbackText.setColor(KEY_FEEDBACK_COLOR);
          this.feedbackText.setVisible(true);
        }

        button.setState(ButtonState.BLINKING);

        // ✅ НОВОЕ: Отключаем все остальные кнопки, чтобы нельзя было нажать ошибку
        this.answerButtons.forEach((btn, index) => {
          if (index !== buttonIndex) {
            btn.setState(ButtonState.DISABLED);
          }
        });

      } else {
        // Второй клик (подтверждение) - закрытие
        logger.log('MODAL_UI', 'KeyQuestionModal: Second click on CORRECT answer - calling onCorrectAnswer callback');
        this.config.onCorrectAnswer();
        this.handleClose();
      }

    } else {
      // ✅ НЕПРАВИЛЬНЫЙ ОТВЕТ (Original Logic form Backup: Immediate Fail, Stay Open)
      logger.log('GAME_LOGIC', 'KeyQuestionModal: Wrong answer!');

      const questionDamage = this.parsedQuestion.damage ?? 1;

      // Показываем текст ошибки прямо на кнопке (если есть фидбэки)
      if (this.parsedQuestion.wrongFeedbacks && this.parsedQuestion.wrongFeedbacks.length > 0) {
        const randomWrongFeedback = this.parsedQuestion.wrongFeedbacks[
          Math.floor(Math.random() * this.parsedQuestion.wrongFeedbacks.length)
        ];
        button.setText(randomWrongFeedback);
      } else {
        button.setText('Ошибка');
      }

      if (audioManager && typeof audioManager.playQuestionFailure === 'function') {
        audioManager.playQuestionFailure();
      }

      button.setState(ButtonState.WRONG);
      button.setState(ButtonState.DISABLED);

      logger.log('MODAL_UI', `KeyQuestionModal: Wrong answer clicked - calling onWrongAnswer callback with damage: ${questionDamage}`);
      this.config.onWrongAnswer(questionDamage);

      // Блокировка кнопок НЕ глобальная, можно нажать другую (если есть жизни)
      this.buttonsEnabled = true;
    }
  }



  private handleClose(): void {
    // ✅ Проверяем инициализацию перед закрытием
    if (!this.isInitialized) {
      logger.warn('MODAL_UI', 'KeyQuestionModal: Cannot handle close - not initialized');
      return;
    }

    // Воспроизводим звук закрытия вопроса
    const audioManager = this.scene.data.get('audioManager');
    if (audioManager && typeof audioManager.playQuestionClose === 'function') {
      audioManager.playQuestionClose();
    }

    // Закрываем без ключа, ключ исчезнет
    this.config.onClose();
    this.destroy();
  }

  public destroy(): void {
    // ✅ Проверяем инициализацию перед уничтожением
    // ✅ Проверяем инициализацию перед уничтожением
    /* if (!this.isInitialized) {
        logger.warn('MODAL_UI', 'KeyQuestionModal: Cannot destroy - not initialized');
      return;
    } */

    // ✅ Stop initialization timer if pending
    if (this.initTimer) {
      this.initTimer.remove(false);
      this.initTimer = undefined;
    }

    // ✅ Удаляем слушатель поворота экрана
    if (this.orientationHandler && typeof window !== 'undefined') {
      window.removeEventListener('orientationchange', this.orientationHandler);
      this.orientationHandler = undefined;
    }

    this.background.destroy();
    this.questionText.destroy();
    if (this.feedbackText) {
      this.feedbackText.destroy();
    }
    this.closeButton.destroy();
    this.answerButtons.forEach(button => button.destroy());
    this.answerButtons = [];

    // ✅ ДЕБАГ: Уничтожаем debugGraphics если есть
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = undefined;
    }

    // ✅ Помечаем как неинициализированный после уничтожения
    this.isInitialized = false;
  }

  public setVisible(visible: boolean): void {
    // ✅ Проверяем инициализацию перед изменением видимости
    if (!this.isInitialized) {
      logger.warn('MODAL_UI', 'KeyQuestionModal: Cannot set visibility - not initialized');
      return;
    }

    this.background.setVisible(visible);
    this.questionText.setVisible(visible);
    if (this.feedbackText) {
      this.feedbackText.setVisible(visible);
    }
    this.closeButton.setVisible(visible);
    this.answerButtons.forEach(button => button.setVisible(visible));
  }
}

