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
  MAX_FONT_SIZE
} from '../../constants/textStyles';
import { calculateModalSize } from './ModalSizeCalculator';
import {
  calculateBaseFontSize,
  calculateButtonFontSize,
  calculateUnifiedBaseFontSize,
  getButtonPadding,
  getFontSizeMultiplier
} from '../utils/FontSizeCalculator';
import { QuizManager } from '../systems/QuizManager';
import { NineSliceBackground } from './NineSliceBackground';
import { logger } from '../../utils/Logger';

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
    this.initTimer = scene.time.delayedCall(1, () => {
      try {
        this.createUI();
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

  private createUI(): void {
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
    (window as any).modalDebugSizes = sizes;

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
    const DEBUG_SHOW_BLOCK_BOUNDS = false; // Отключено после тестирования
    if (DEBUG_SHOW_BLOCK_BOUNDS) {
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(2999).setScrollFactor(0); // Поверх элементов, привязка к UI

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
    const baseFontSize = calculateUnifiedBaseFontSize(this.scene, currentLevel);

    // Получаем quizManager для получения самых длинных текстов (для расчета размеров элементов)
    const quizManager = this.scene.data.get('quizManager') as QuizManager | undefined;
    let longestTexts;
    if (quizManager) {
      longestTexts = quizManager.getLongestTexts(currentLevel);
    } else {
      // Fallback: используем дефолтные значения
      logger.warn('MODAL_SIZE', 'KeyQuestionModal: QuizManager not found, using default longest texts');
      longestTexts = {
        question: 'Какая планета известна как \'Красная планета\'?',
        answer: 'Кошка говорит мяу! Она маукает, мяунькает! Намяукивает!',
        feedback: 'Правильно! Кошка говорит \'Мяу\'! Ты прям ваще красава! Угадал про кошку!',
        maxLength: 76
      };
    }

    console.log('📏 KeyQuestionModal baseFontSize:', `${baseFontSize.toFixed(2)}px`);

    // ✅ ВАЖНО: Рассчитываем размеры для всех элементов, но используем МИНИМАЛЬНЫЙ из них
    // Это гарантирует, что все элементы будут иметь одинаковый размер шрифта
    const questionFontSizeRaw = calculateBaseFontSize(
      this.scene,
      contentAreaWidth,
      questionAreaHeight,
      longestTexts.question,
      baseFontSize,
      3
    );
    const questionFits = Math.abs(questionFontSizeRaw - baseFontSize) < 0.01; // Влез ли базовый (с учетом округления)
    const questionClamped = questionFontSizeRaw === MIN_FONT_SIZE_TEXT || questionFontSizeRaw === MAX_FONT_SIZE; // Был ли применен clamp
    console.log('📏 KeyQuestionModal Question:', `base=${baseFontSize.toFixed(2)}px, final=${questionFontSizeRaw.toFixed(2)}px`);

    const feedbackFontSizeRaw = calculateBaseFontSize(
      this.scene,
      contentAreaWidth,
      feedbackAreaHeight,
      longestTexts.feedback,
      baseFontSize,
      3
    );
    const feedbackFits = Math.abs(feedbackFontSizeRaw - baseFontSize) < 0.01;
    const feedbackClamped = feedbackFontSizeRaw === MIN_FONT_SIZE_TEXT || feedbackFontSizeRaw === MAX_FONT_SIZE;
    console.log('📏 KeyQuestionModal Feedback:', `base=${baseFontSize.toFixed(2)}px, final=${feedbackFontSizeRaw.toFixed(2)}px`);

    // ✅ Находим минимальный размер, который влезает во все элементы
    // Это гарантирует единый размер для всех текстов
    let unifiedFontSize = Math.min(questionFontSizeRaw, feedbackFontSizeRaw);
    console.log('📏 KeyQuestionModal unifiedFontSize:', `${unifiedFontSize.toFixed(2)}px`);

    // ✅ КНОПКИ ОТВЕТОВ: используем blockHeight (одинаковая высота для всех блоков)
    const buttonCount = this.parsedQuestion.allAnswers.length;
    const buttonWidth = contentAreaWidth;
    const buttonHeight = blockHeight; // ✅ Используем высоту блока (одинаковую для всех элементов)

    // ✅ АДАПТИВНЫЕ ОТСТУПЫ: используем getButtonPadding для вычисления отступов
    // Базовые отступы в пикселях исходной графики масштабируются через BASE_SCALE
    const buttonPadding = getButtonPadding(buttonWidth, buttonHeight);
    const buttonAvailableWidth = buttonPadding.availableWidth;
    const buttonAvailableHeight = buttonPadding.availableHeight;

    // ✅ Рассчитываем размер шрифта для кнопок используя calculateButtonFontSize
    // Передаём ДОСТУПНУЮ ширину/высоту (с отступами)!
    const buttonFontSizeRaw = calculateButtonFontSize(
      this.scene,
      buttonAvailableWidth,  // ✅ С отступами!
      buttonAvailableHeight, // ✅ С отступами!
      longestTexts.answer,
      40 // defaultFontSize = MAX_OPTIMAL_FONT_SIZE
    );

    console.log('📏 KeyQuestionModal Button:', `button=${buttonWidth}x${buttonHeight}, paddingX=${buttonPadding.paddingX.toFixed(1)}, paddingY=${buttonPadding.paddingY.toFixed(1)}, available=${buttonAvailableWidth.toFixed(1)}x${buttonAvailableHeight.toFixed(1)}, fontSize=${buttonFontSizeRaw.toFixed(2)}px`);

    // ✅ ВАЖНО: Логика выбора unifiedFontSize для всех текстовых элементов (вопрос, фидбэк, кнопки)
    const baseFitsOverall = Math.abs(unifiedFontSize - baseFontSize) < 0.01;
    const unifiedClamped = unifiedFontSize === MIN_FONT_SIZE_TEXT || unifiedFontSize === MAX_FONT_SIZE;
    logger.log('MODAL_SIZE', `KeyQuestionModal: Final unified (all elements): base=${baseFontSize.toFixed(2)}px, final=${unifiedFontSize.toFixed(2)}px, baseFits=${baseFitsOverall}, clamped=${unifiedClamped}`);

    // Применяем мультипликаторы (для тонкой настройки)
    const questionMultiplier = KEY_QUESTION_FONT_SIZE_MULTIPLIER;
    const feedbackMultiplier = KEY_FEEDBACK_FONT_SIZE_MULTIPLIER;

    // ✅ АДАПТИВНЫЙ МНОЖИТЕЛЬ: используем getFontSizeMultiplier вместо фиксированного 1.3
    const screenAR = canvasWidth / canvasHeight;
    const adaptiveMultiplier = getFontSizeMultiplier(screenAR);
    const zoom = this.scene.cameras.main.zoom; // 1.6
    const commonFontSize = Math.max(buttonFontSizeRaw, unifiedFontSize) * adaptiveMultiplier;

    // Размеры шрифтов теперь кратны общему размеру
    const questionFontSize = commonFontSize; // Такой же, как кнопки
    const feedbackFontSize = commonFontSize; // Такой же, как кнопки
    const buttonFontSize = commonFontSize;   // Единый размер

    // ✅ Подробный лог расчёта fontSize
    logger.log('MODAL_SIZE', `📏 KeyQuestionModal: buttonRaw=${buttonFontSizeRaw.toFixed(1)}px, unified=${unifiedFontSize.toFixed(1)}px, multiplier=${adaptiveMultiplier.toFixed(2)}, final=${commonFontSize.toFixed(1)}px`);

    console.log('📏 KeyQuestionModal FINAL SIZES:', `question=${questionFontSize.toFixed(2)}, feedback=${feedbackFontSize.toFixed(2)}, button=${buttonFontSize.toFixed(2)}`);

    // Текст вопроса - используем contentAreaWidth для wordWrap
    // ✅ ОГРАНИЧЕНИЕ МАКСИМАЛЬНОЙ ВЫСОТЫ ДЛЯ ТЕКСТА
    const questionMaxHeight = questionAreaHeight; // Используем высоту области вопроса

    // ✅ ЗАЩИТА ОТ ПЕРЕСЕЧЕНИЯ С КРЕСТИКОМ
    // Рассчитываем размер крестика заранее, чтобы уменьшить доступную ширину для текста
    const closeTextureSize = 14;
    const closeScale = BASE_SCALE;
    const closeSize = closeTextureSize * closeScale; // 64px
    const closeButtonMargin = closeSize + 16; // Размер крестика + дополнительный отступ

    // ✅ Уменьшаем ширину wordWrap справа, чтобы текст не пересекался с крестиком
    // UPD: Теперь используем полную ширину, так как крестик в углу и не должен сужать весь текст
    // ✅ Компенсация setScale(invZoom): делим на invZoom для правильного переноса строк
    const questionWordWrapWidth = contentAreaWidth / invZoom;
    logger.log('MODAL_SIZE', `KeyQuestionModal: wordWrap width set to ${questionWordWrapWidth} (contentAreaWidth / invZoom)`);

    // ✅ Округляем координаты до целых пикселей для предотвращения размытия
    const questionTextX = Math.round(modalX);
    const questionTextY = Math.round(questionY);

    this.questionText = this.scene.add.text(
      questionTextX, // ✅ Округлено до целого пикселя
      questionTextY, // ✅ Округлено до целого пикселя
      this.parsedQuestion.questionText,
      {
        fontSize: `${Math.round(questionFontSize)}px`,
        fontFamily: DEFAULT_FONT_FAMILY,
        fontStyle: KEY_QUESTION_FONT_STYLE,
        color: KEY_QUESTION_COLOR,
        align: 'center',
        wordWrap: { width: questionWordWrapWidth } // ✅ Учтён отступ от крестика
      }
    ).setOrigin(0.5).setDepth(2001).setScrollFactor(0);

    // ✅ Устанавливаем разрешение для четкости текста (предотвращает размытие)
    this.questionText.setResolution(textResolution);

    // ✅ ВАЖНО: Применяем setScale(invZoom) для четкости текста при zoom камеры (invZoom объявлен в начале createUI)
    this.questionText.setScale(invZoom);

    // ✅ Дополнительная защита от переполнения для вопроса
    if (this.questionText && typeof this.questionText.height === 'number' && typeof questionFontSize === 'number' && typeof questionMaxHeight === 'number') {
      logger.log('MODAL_SIZE', `KeyQuestionModal: Question text created: fontSize=${questionFontSize.toFixed(2)}, height=${this.questionText.height.toFixed(1)}, maxHeight=${questionMaxHeight.toFixed(1)}`);
      if (this.questionText.height > questionMaxHeight) {
        const scaleFactor = questionMaxHeight / this.questionText.height;
        const adjustedFontSize = Math.max(MIN_FONT_SIZE_TEXT, questionFontSize * scaleFactor);
        this.questionText.setFontSize(`${adjustedFontSize}px`);
        logger.warn('MODAL_SIZE', `KeyQuestionModal: Question text too large, reduced from ${questionFontSize.toFixed(2)} to ${adjustedFontSize.toFixed(2)}`);
      }
    }

    // ✅ Поле feedbacks (над кнопками) - показывается только если включено A/B тестирование
    // ✅ Фидбэк использует рассчитанный размер с проверкой влезания
    if (AB_TESTING.ENABLE_FEEDBACKS || AB_TESTING.ENABLE_WRONG_FEEDBACKS) {
      // ✅ Округляем координаты до целых пикселей для предотвращения размытия
      const feedbackTextX = Math.round(modalX);
      const feedbackTextY = Math.round(feedbackY);

      this.feedbackText = this.scene.add.text(
        feedbackTextX, // ✅ Округлено до целого пикселя
        feedbackTextY, // ✅ Округлено до целого пикселя
        '',
        {
          fontSize: `${Math.round(feedbackFontSize)}px`, // ✅ Размер равен размеру вопроса
          fontFamily: 'monospace', // ✅ Моноширинный шрифт для четкости
          fontStyle: KEY_FEEDBACK_FONT_STYLE, // ✅ Используем константу
          color: KEY_FEEDBACK_COLOR, // ✅ Используем константу
          wordWrap: { width: contentAreaWidth / invZoom }, // ✅ Компенсация setScale(invZoom)
          align: 'center'
        }).setOrigin(0.5).setDepth(2001).setScrollFactor(0).setVisible(false);

      // ✅ Устанавливаем разрешение для четкости текста (предотвращает размытие)
      this.feedbackText.setResolution(textResolution);

      // ✅ ВАЖНО: Применяем setScale(invZoom) для четкости текста при zoom камеры (invZoom объявлен в начале createUI)
      this.feedbackText.setScale(invZoom);

      // ✅ Дополнительная защита от переполнения для фидбэка
      logger.log('MODAL_SIZE', `KeyQuestionModal: Feedback text created: fontSize=${feedbackFontSize.toFixed(2)}, height=${this.feedbackText.height.toFixed(1)}, maxHeight=${feedbackAreaHeight.toFixed(1)}`);
      if (this.feedbackText.height > feedbackAreaHeight) {
        const scaleFactor = feedbackAreaHeight / this.feedbackText.height;
        const adjustedFontSize = Math.max(MIN_FONT_SIZE_TEXT, feedbackFontSize * scaleFactor);
        this.feedbackText.setFontSize(`${adjustedFontSize}px`);
        logger.warn('MODAL_SIZE', `KeyQuestionModal: Feedback text too large, reduced from ${feedbackFontSize.toFixed(2)} to ${adjustedFontSize.toFixed(2)}`);
      }
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
        // ✅ ИСПРАВЛЕНИЕ: используем buttonAvailableWidth вместо buttonWidth для учёта отступов
        wordWrap: { width: buttonAvailableWidth / invZoom }, // Компенсация setScale + отступы
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

