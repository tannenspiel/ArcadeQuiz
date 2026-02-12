/**
 * Модальное окно для подтверждения входа в портал
 * Отображается в Phaser сцене
 */

import Phaser from 'phaser';
import { Button, ButtonState } from './Button';
import {
  DEFAULT_FONT_FAMILY,
  PORTAL_TITLE_FONT_SIZE,
  PORTAL_TITLE_FONT_STYLE,
  PORTAL_QUESTION_FONT_STYLE,
  PORTAL_INFO_FONT_STYLE,
  PORTAL_BUTTON_FONT_STYLE,
  PORTAL_TITLE_COLOR,
  PORTAL_QUESTION_COLOR,
  PORTAL_INFO_CORRECT_COLOR,
  PORTAL_INFO_CORRECT_COLOR_DEBUG,
  PORTAL_INFO_WRONG_COLOR,
  PORTAL_INFO_BACKGROUND_COLOR,
  KEY_QUESTION_FONT_SIZE_MULTIPLIER,
  KEY_BUTTON_FONT_SIZE_MULTIPLIER,
  MIN_FONT_SIZE_TEXT,
  MAX_FONT_SIZE,
  GLOBAL_QUESTION_BACKGROUND_COLOR
} from '../../constants/textStyles';
import { DEPTHS } from '../../constants/gameConstants';
import { PortalConfig } from '../../types/portalTypes';
import { ParsedQuestion } from '../../types/questionTypes';
import { calculateModalSize } from './ModalSizeCalculator';
import { calculateBaseFontSize, calculateButtonFontSize, calculateUnifiedBaseFontSize } from '../utils/FontSizeCalculator';
import { QuizManager } from '../systems/QuizManager';
import { AssetLoader } from '../core/AssetLoader';
import { AB_TESTING } from '../../config/gameConfig';
import { NineSliceBackground } from './NineSliceBackground';
import { logger } from '../../utils/Logger';
import { DEBUG_QUIZ_PORTAL } from '../../config/debugConfig';
import { BASE_SCALE } from '../../constants/gameConstants';
import { snapToGrid, snapToGridDouble } from './ModalPositioningHelper';

export interface PortalModalConfig {
  portalConfig: PortalConfig;
  globalQuestion?: ParsedQuestion; // ✅ Данные глобального вопроса (текст и картинка)
  onEnter: () => void;
  onCancel: () => void;
}

export class PortalModal {
  private scene: Phaser.Scene;
  private config: PortalModalConfig;

  // UI элементы
  private background!: Phaser.GameObjects.Rectangle | NineSliceBackground; // Инициализируется в createUI()
  private titleText!: Phaser.GameObjects.Text; // Инициализируется в createUI()
  private questionText!: Phaser.GameObjects.Text; // Инициализируется в createUI()
  private portalInfoText!: Phaser.GameObjects.Text; // Инициализируется в createUI()
  private imageArea!: Phaser.GameObjects.Rectangle; // ✅ Зарезервированная область для картинки
  private questionImage?: Phaser.GameObjects.Image; // ✅ Изображение глобального вопроса
  private enterButton!: Button; // Инициализируется в createUI()
  private cancelButton!: Button; // Инициализируется в createUI()

  // ✅ Защита от случайных нажатий
  private buttonsEnabled: boolean = false; // ✅ Кнопки активны только после задержки

  // ✅ Обработчик поворота экрана
  private orientationHandler?: () => void;

  constructor(scene: Phaser.Scene, config: PortalModalConfig) {
    this.scene = scene;
    this.config = config;

    // ✅ Кнопки изначально отключены
    this.buttonsEnabled = false;

    // ✅ Настройка input - убеждаемся, что input активен
    if (scene.input) {
      scene.input.enabled = true;
      scene.input.setTopOnly(false); // ✅ Разрешаем клики по всем слоям

      // ✅ Останавливаем все активные pointer события перед созданием UI
      try {
        // ✅ Безопасная очистка pointer событий
        if (scene.input.activePointer && typeof scene.input.activePointer.reset === 'function') {
          scene.input.activePointer.reset();
        }
      } catch (e) {
        logger.warn('MODAL_UI', 'PortalModal: Error clearing pointer state', e);
        // Продолжаем создание UI даже если очистка не удалась
      }
    }

    // ✅ Откладываем создание UI на 1 кадр, чтобы Phaser.Scale.FIT завершил масштабирование
    // Это гарантирует, что getBoundingClientRect() вернет правильные размеры canvas
    scene.time.delayedCall(1, async () => {
      try {
        await this.createUI();

        // ✅ Включаем кнопки через задержку (после того, как палец будет поднят)
        // ✅ Уменьшена задержка для более отзывчивого интерфейса
        scene.time.delayedCall(150, () => {
          this.buttonsEnabled = true;
          logger.log('MODAL_UI', 'PortalModal: Buttons enabled after delay');
        });
      } catch (error) {
        logger.log('MODAL_UI', '❌ PortalModal: Error creating UI', error);
      }
    });

    // ✅ Слушатель поворота экрана - закрывает модальное окно при изменении ориентации
    if (typeof window !== 'undefined') {
      this.orientationHandler = () => {
        logger.log('MODAL_UI', 'PortalModal: Orientation change detected, closing modal');
        this.destroy();
      };
      window.addEventListener('orientationchange', this.orientationHandler);
    }

    logger.log('MODAL_UI', `PortalModal: Created for portal: ${config.portalConfig.answerText}`);
  }

  private async createUI(): Promise<void> {
    logger.log('MODAL_UI', 'PortalModal: createUI() started');

    // ✅ Разрешение текста = 1 для пиксельного шрифта (единое для всех текстовых элементов)
    const textResolution = 1;

    const cam = this.scene.cameras.main;
    const invZoom = 1 / cam.zoom; // ✅ FIX BLUR: Компенсация zoom для всех текстов модального окна
    logger.log('MODAL_UI', 'PortalModal: Camera obtained');

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
      'PortalModal'   // Имя модального окна для логов
    );

    // ✅ GRID SNAPPING: Привязка к пиксельной сетке (используем ModalPositioningHelper)
    // Чтобы избежать дробных пикселей при BASE_SCALE=4, координаты и размеры должны быть кратны 4 (или 8 для центрирования)

    const modalWidth = snapToGridDouble(modalSize.width);
    const modalHeight = snapToGridDouble(modalSize.height);
    const modalX = snapToGrid(modalSize.x);
    const modalY = snapToGrid(modalSize.y);

    logger.log('MODAL_SIZE', `PortalModal: Camera size: ${cam.width} x ${cam.height}, Modal size: ${modalWidth} x ${modalHeight}`);

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

    // Получаем quizManager для получения самых длинных текстов
    const quizManager = this.scene.data.get('quizManager') as QuizManager | undefined;
    const currentLevel = this.scene.data.get('currentLevel') as number | undefined || 1;

    // ✅ РАСЧЕТ ЕДИНОГО БАЗОВОГО РАЗМЕРА ШРИФТА (перенесено вверх)
    const baseFontSize = calculateUnifiedBaseFontSize(this.scene, currentLevel);
    logger.log('MODAL_SIZE', `PortalModal: Using unified base font size: ${baseFontSize.toFixed(2)}px`);

    let longestTexts;
    if (quizManager) {
      longestTexts = quizManager.getLongestTexts(currentLevel);
    } else {
      longestTexts = {
        question: this.config.globalQuestion?.questionText || 'Do you want to enter this portal?',
        answer: 'ENTER PORTAL',
        feedback: this.config.portalConfig.answerText,
        maxLength: 50
      };
    }

    // Фон (неинтерактивный, чтобы клики проходили к кнопкам)
    if (AB_TESTING.USE_NINE_SLICE_MODAL) {
      this.background = new NineSliceBackground(
        this.scene,
        modalX,
        modalY,
        modalWidth,
        modalHeight
      ).setDepth(DEPTHS.SCREEN.MODAL_BG).setScrollFactor(0);
    } else {
      this.background = this.scene.add.rectangle(
        modalX, modalY, modalWidth, modalHeight,
        0x2d3748, 0.95
      ).setDepth(DEPTHS.SCREEN.MODAL_BG).setScrollFactor(0).setStrokeStyle(4, 0x4a5568);
    }

    // ✅ ОТСТУП МЕЖДУ ЭЛЕМЕНТАМИ (одинаковый для всех)
    // Отступ между элементами = половина отступа от краев модального окна
    let buttonSpacing = internalPadding / 4;

    // ✅ РАСЧЕТ ОБЛАСТЕЙ: ДЕЛИМ РАБОЧУЮ ОБЛАСТЬ НА 5 РАВНЫХ ЧАСТЕЙ
    // Всего блоков: 1 (заголовок) + 1 (вопрос+картинка) + 1 (ответ) + 2 (кнопки) = 5
    // Картинка размещается справа от текста вопроса в том же блоке
    const totalBlocks = 5;
    const totalSpacings = totalBlocks - 1; // 4 отступа

    // Общая высота рабочей области
    const totalContentHeight = contentAreaHeight;

    // Высота одного блока (с учетом отступов)
    const blockHeight = (totalContentHeight - (totalSpacings * buttonSpacing)) / totalBlocks;

    logger.log('MODAL_SIZE', `PortalModal Layout: totalBlocks=${totalBlocks}, totalSpacings=${totalSpacings}, blockHeight=${blockHeight.toFixed(1)}, totalContentHeight=${totalContentHeight.toFixed(1)}`);

    // Высоты для каждого блока (все одинаковые)
    const titleAreaHeight = blockHeight;
    const questionAreaHeight = blockHeight; // Включает и текст, и картинку
    const answerAreaHeight = blockHeight;
    const buttonHeight = blockHeight;

    // ✅ РАСЧЕТ ПОЗИЦИЙ: создаем массив позиций снизу вверх
    // Порядок снизу вверх: кнопка Отмена (index 0), кнопка Войти (index 1), ответ (index 2), вопрос+картинка (index 3), заголовок (index 4)
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

    // Блоки в массиве (снизу вверх): [кнопка Отмена, кнопка Войти, ответ, вопрос+картинка, заголовок]
    // Индексы: [0, 1, 2, 3, 4]
    const titleY = blockPositions[4]; // Заголовок - самый верхний
    const questionY = blockPositions[3]; // Вопрос + картинка (в одном блоке)
    const answerY = blockPositions[2]; // Ответ
    const enterButtonY = blockPositions[1]; // Кнопка Войти
    const cancelButtonY = blockPositions[0]; // Кнопка Отмена - самая нижняя

    // ✅ Единый базовый размер шрифта уже рассчитан в начале метода (baseFontSize)

    logger.log('MODAL_SIZE', `PortalModal: baseFontSize (unified): ${baseFontSize.toFixed(2)}px`);

    // ✅ Единый базовый размер шрифта уже рассчитан в начале метода (baseFontSize)
    // ✅ Используем его напрямую для всех элементов, как в KeyQuestionModal
    const questionFontSizeRaw = baseFontSize;
    const answerFontSizeRaw = baseFontSize;
    const titleFontSizeRaw = baseFontSize;
    logger.log('MODAL_SIZE', `PortalModal: All elements use baseFontSize: ${baseFontSize.toFixed(2)}px`);

    // ✅ Кнопки: рассчитываем размер для кнопок с тем же базовым размером
    const buttonWidth = contentAreaWidth;
    logger.log('MODAL_SIZE', `PortalModal: buttonWidth: ${buttonWidth}, buttonHeight: ${buttonHeight}`);

    // ✅ ВАЖНО: Используем тот же baseFontSize для кнопок, что и для текстовых элементов
    // ✅ Кнопки используют unifiedFontSize (как в KeyQuestionModal)
    let buttonFontSizeRaw = baseFontSize; // ✅ Используем baseFontSize напрямую, без отдельного расчёта
    logger.log('MODAL_SIZE', `PortalModal: Button: base=${baseFontSize.toFixed(2)}px, final=${buttonFontSizeRaw.toFixed(2)}px`);

    // ✅ Находим минимальный размер для всех элементов (включая кнопки)
    // Это гарантирует единообразие размера текста во всех элементах
    let unifiedFontSize = Math.min(titleFontSizeRaw, questionFontSizeRaw, answerFontSizeRaw, buttonFontSizeRaw);
    logger.log('MODAL_SIZE', `PortalModal: unifiedFontSize (all elements): ${unifiedFontSize.toFixed(2)}px`);

    const baseFitsOverall = Math.abs(unifiedFontSize - baseFontSize) < 0.01;
    const unifiedClamped = unifiedFontSize === MIN_FONT_SIZE_TEXT || unifiedFontSize === MAX_FONT_SIZE;
    logger.log('MODAL_SIZE', `PortalModal: Final unified: base=${baseFontSize.toFixed(2)}px, final=${unifiedFontSize.toFixed(2)}px, baseFits=${baseFitsOverall}, clamped=${unifiedClamped}`);

    // ✅ Применяем единый множитель 1.3 как в KeyQuestionModal
    const FINAL_MULTIPLIER = 1.3;
    const titleFontSize = unifiedFontSize * FINAL_MULTIPLIER;
    const questionFontSize = unifiedFontSize * FINAL_MULTIPLIER;
    const answerFontSize = unifiedFontSize * FINAL_MULTIPLIER;
    // ✅ Кнопки используют тот же unifiedFontSize, что и текстовые элементы
    const buttonFontSize = unifiedFontSize * FINAL_MULTIPLIER;

    logger.log('MODAL_SIZE', `PortalModal: FINAL_MULTIPLIER: ${FINAL_MULTIPLIER}, FINAL SIZES: title=${titleFontSize.toFixed(2)}, question=${questionFontSize.toFixed(2)}, answer=${answerFontSize.toFixed(2)}, button=${buttonFontSize.toFixed(2)}`);

    // ✅ Заголовок - самый верхний блок (как в GameOverModal)
    // ✅ Округляем координаты до целых пикселей для предотвращения размытия
    const titleTextX = Math.round(modalX);
    const titleTextY = Math.round(titleY);

    logger.log('MODAL_SIZE', `PortalModal: Title position - X=${titleTextX}, Y=${titleTextY}`);

    // ✅ wordWrap width должен учитывать invZoom для правильного переноса строк
    const titleWordWrapWidth = (contentAreaWidth * 0.95) / invZoom;

    this.titleText = this.scene.add.text(
      titleTextX, // ✅ Округлено до целого пикселя
      titleTextY, // ✅ Округлено до целого пикселя
      'ПОРТАЛ ОТКРЫТ!',
      {
        fontSize: `${Math.round(titleFontSize)}px`,
        fontFamily: DEFAULT_FONT_FAMILY, // ✅ Унифицировано с KeyQuestionModal
        fontStyle: PORTAL_TITLE_FONT_STYLE,
        color: PORTAL_TITLE_COLOR,
        wordWrap: { width: titleWordWrapWidth }, // ✅ Учтён invZoom для правильного переноса
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_CLOSE).setScrollFactor(0);

    // ✅ Устанавливаем разрешение = 1 для пиксельного шрифта
    this.titleText.setResolution(textResolution);

    // ✅ ВАЖНО: Применяем setScale(invZoom) для четкости текста при zoom камеры (invZoom объявлен в начале createUI)
    this.titleText.setScale(invZoom);

    // ✅ Защита от переполнения убрана - размер уже рассчитан корректно через calculateUnifiedBaseFontSize

    // ✅ Вопрос и картинка - в одном блоке
    const questionTextToDisplay = this.config.globalQuestion?.questionText || 'Do you want to enter this portal?';
    const hasImage = !!this.config.globalQuestion?.image;

    // ✅ Определяем размещение в зависимости от наличия картинки
    if (hasImage) {
      // === С КАРТИНКОЙ: текст слева (align: 'right'), картинка справа ===
      // ✅ Правый край контента (где заканчиваются кнопки)
      const contentRightEdge = modalX + contentAreaWidth / 2;
      const gap = 15; // Отступ между текстом и картинкой (в виртуальных пикселях)

      // ✅ Сначала загружаем картинку, чтобы узнать её размеры после масштабирования
      let scaledImageWidth = 0;
      let imageKey = '';

      try {
        const assetLoader = (this.scene as any).assetLoader as AssetLoader | undefined;
        if (assetLoader) {
          imageKey = this.config.globalQuestion!.image.replace('.png', '').replace('.jpg', '').replace('.jpeg', '');
          imageKey = imageKey.replace(/^QuizGame_/, '');
          let imagePath = this.config.globalQuestion!.image.replace(/^QuizGame_/, '');

          logger.log('MODAL_UI', `PortalModal: Loading question image: ${imageKey} (${imagePath})`);
          await assetLoader.loadImage(imageKey, imagePath);

          if (this.scene.textures.exists(imageKey)) {
            // ✅ Вычисляем масштаб картинки
            const maxImgHeight = questionAreaHeight * 0.9;
            const maxImgWidth = contentAreaWidth * 0.45; // Ограничение ширины (45%)

            const tempImage = this.scene.add.image(0, 0, imageKey); // Временный образец для получения размеров
            const scale = Math.min(maxImgWidth / tempImage.width, maxImgHeight / tempImage.height);
            scaledImageWidth = tempImage.width * scale;
            tempImage.destroy();

            logger.log('MODAL_UI', `PortalModal: Image scaled width: ${scaledImageWidth.toFixed(1)}, scale: ${scale.toFixed(3)}`);
          } else {
            logger.warn('MODAL_UI', `PortalModal: Image texture not found: ${imageKey}`);
          }
        } else {
          logger.warn('MODAL_UI', 'PortalModal: AssetLoader not available');
        }
      } catch (error) {
        logger.log('MODAL_UI', '❌ PortalModal: Error loading question image', error);
      }

      // ✅ Позиционируем изображение: правый край совпадает с правым краем контента (кнопок)
      // Image origin (0, 0.5) значит позиция - это левый край изображения
      // Чтобы правый край был на contentRightEdge: imageLeftEdge = contentRightEdge - scaledImageWidth
      const imageLeftEdge = contentRightEdge - scaledImageWidth; // ✅ Без internalPadding
      const imageX = Math.round(imageLeftEdge);
      const imageY = Math.round(questionY);

      // ✅ Текст вопроса: правый край текста у левого края картинки (с отступом gap)
      // Text origin (1, 0.5) значит позиция - это правый край текста
      const textRightEdge = imageLeftEdge - gap;
      const questionTextX = Math.round(textRightEdge);
      const questionTextY = Math.round(questionY);

      // ✅ Ширина текста для wordWrap: от левого края контента до правого края текста
      const textWidthAvailable = textRightEdge - (modalX - contentAreaWidth / 2);
      const questionWordWrapWidth = Math.max(50, textWidthAvailable) / invZoom;

      // ✅ Уменьшаем размер шрифта текста вопроса на 0.8 при наличии картинки
      const questionFontSizeWithImage = questionFontSize * 0.8;

      this.questionText = this.scene.add.text(
        questionTextX,
        questionTextY,
        questionTextToDisplay,
        {
          fontSize: `${questionFontSizeWithImage}px`,
          fontFamily: DEFAULT_FONT_FAMILY,
          fontStyle: PORTAL_QUESTION_FONT_STYLE,
          color: PORTAL_QUESTION_COLOR,
          wordWrap: { width: questionWordWrapWidth },
          align: 'right' // ✅ Выравнивание по правому краю
        }
      ).setOrigin(1, 0.5).setDepth(DEPTHS.SCREEN.MODAL_BUTTON).setScrollFactor(0);

      this.questionText.setResolution(textResolution);
      this.questionText.setScale(invZoom);

      // ✅ Создаем изображение после расчета позиции
      if (imageKey && this.scene.textures.exists(imageKey)) {
        this.questionImage = this.scene.add.image(imageX, imageY, imageKey)
          .setOrigin(0, 0.5).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);

        // ✅ Применяем масштаб (уже вычислен выше)
        const maxImgHeight = questionAreaHeight * 0.9;
        const maxImgWidth = contentAreaWidth * 0.45;
        const scale = Math.min(maxImgWidth / this.questionImage.width, maxImgHeight / this.questionImage.height);
        this.questionImage.setScale(scale);

        logger.log('MODAL_UI', `PortalModal: Question image created at (${imageX}, ${imageY}), scaled width: ${(this.questionImage.width * scale).toFixed(1)}`);
      }
    } else {
      // === БЕЗ КАРТИНКИ: текст по центру ===
      const questionTextX = Math.round(modalX);
      const questionTextY = Math.round(questionY);
      const questionWordWrapWidth = (contentAreaWidth * 0.95) / invZoom;

      this.questionText = this.scene.add.text(
        questionTextX,
        questionTextY,
        questionTextToDisplay,
        {
          fontSize: `${questionFontSize}px`,
          fontFamily: DEFAULT_FONT_FAMILY,
          fontStyle: PORTAL_QUESTION_FONT_STYLE,
          color: PORTAL_QUESTION_COLOR,
          wordWrap: { width: questionWordWrapWidth },
          align: 'center'
        }
      ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_BUTTON).setScrollFactor(0);

      this.questionText.setResolution(textResolution);
      this.questionText.setScale(invZoom);
    }

    // ✅ Логирование размера шрифта вопроса
    logger.log('MODAL_SIZE', `PortalModal: Question text: fontSize=${questionFontSize.toFixed(2)}px, hasImage=${hasImage}, text="${questionTextToDisplay.substring(0, 50)}..."`);

    // ✅ Создаем невидимую область для картинки (только если картинки нет)
    if (!hasImage) {
      this.imageArea = this.scene.add.rectangle(
        Math.round(modalX),
        Math.round(questionY),
        contentAreaWidth,
        questionAreaHeight,
        0x1a202c,
        0.0 // Полностью прозрачный фон (невидимый)
      ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);
    }

    // ✅ Ответ на глобальный вопрос - убираем "Destination: " и черный фон
    // ✅ В debug режиме правильный портал зелёный, в обычном - красно-оранжевый
    const portalColor = this.config.portalConfig.isCorrect
      ? (DEBUG_QUIZ_PORTAL ? PORTAL_INFO_CORRECT_COLOR_DEBUG : PORTAL_INFO_CORRECT_COLOR)
      : PORTAL_INFO_WRONG_COLOR;

    // ✅ Округляем координаты до целых пикселей для предотвращения размытия
    const answerTextX = Math.round(modalX);
    const answerTextY = Math.round(answerY);

    // ✅ Используем только текст ответа, без "Destination: "
    const answerTextToDisplay = this.config.portalConfig.answerText;

    // ✅ wordWrap width должен учитывать invZoom для правильного переноса строк
    const answerWordWrapWidth = (contentAreaWidth * 0.95) / invZoom;

    this.portalInfoText = this.scene.add.text(
      answerTextX, // ✅ Округлено до целого пикселя
      answerTextY, // ✅ Округлено до целого пикселя
      answerTextToDisplay, // ✅ Только текст ответа
      {
        fontSize: `${answerFontSize}px`,
        fontFamily: DEFAULT_FONT_FAMILY, // ✅ Унифицировано с KeyQuestionModal
        fontStyle: PORTAL_INFO_FONT_STYLE,
        color: portalColor,
        // ✅ Убраны backgroundColor и padding
        wordWrap: { width: answerWordWrapWidth }, // ✅ Учтён invZoom для правильного переноса
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);

    // ✅ Устанавливаем разрешение для четкости текста (предотвращает размытие)
    this.portalInfoText.setResolution(textResolution);

    // ✅ ВАЖНО: Применяем setScale(invZoom) для четкости текста при zoom камеры (invZoom объявлен в начале createUI)
    this.portalInfoText.setScale(invZoom);

    // ✅ Защита от переполнения убрана - размер уже рассчитан корректно через calculateUnifiedBaseFontSize

    // ✅ Логирование размера шрифта ответа
    logger.log('MODAL_SIZE', `PortalModal: Answer text: fontSize=${answerFontSize.toFixed(2)}px, text="${answerTextToDisplay}"`);

    // ✅ Кнопка Войти
    // ✅ Округляем координаты до целых пикселей для предотвращения размытия
    const enterButtonX = Math.round(modalX);
    const roundedEnterButtonY = Math.round(enterButtonY);

    this.enterButton = new Button(this.scene, {
      x: enterButtonX, // ✅ Округлено до целого пикселя
      y: roundedEnterButtonY, // ✅ Округлено до целого пикселя
      width: contentAreaWidth,
      height: buttonHeight,
      text: 'ВОЙТИ В ПОРТАЛ',
      fontSize: buttonFontSize, // ✅ В 1.5 раза больше общего размера
      wordWrap: { width: contentAreaWidth }, // ✅ Максимальная ширина для переноса
      onClick: () => {
        logger.log('BUTTON_EVENTS', 'PortalModal: Enter button onClick triggered');
        this.handleEnter();
      }
    });
    this.enterButton.setDepth(DEPTHS.SCREEN.MODAL_BUTTON);

    // ✅ Логирование размера шрифта кнопки Войти
    logger.log('MODAL_SIZE', `PortalModal: Enter button: fontSize=${buttonFontSize.toFixed(2)}px`);

    // ✅ Кнопка Отмена
    // ✅ Округляем координаты до целых пикселей для предотвращения размытия
    const cancelButtonX = Math.round(modalX);
    const roundedCancelButtonY = Math.round(cancelButtonY);

    this.cancelButton = new Button(this.scene, {
      x: cancelButtonX, // ✅ Округлено до целого пикселя
      y: roundedCancelButtonY, // ✅ Округлено до целого пикселя
      width: contentAreaWidth,
      height: buttonHeight,
      text: 'ОТМЕНА',
      fontSize: buttonFontSize, // ✅ В 1.5 раза больше общего размера
      wordWrap: { width: contentAreaWidth }, // ✅ Максимальная ширина для переноса
      onClick: () => {
        logger.log('BUTTON_EVENTS', 'PortalModal: Cancel button onClick triggered');
        this.handleCancel();
      }
    });
    this.cancelButton.setDepth(DEPTHS.SCREEN.MODAL_BUTTON);

    // ✅ Логирование размера шрифта кнопки Отмена
    logger.log('MODAL_SIZE', `PortalModal: Cancel button: fontSize=${buttonFontSize.toFixed(2)}px`);
  }

  private handleEnter(): void {
    // ✅ Защита от случайных нажатий - только проверка buttonsEnabled
    if (!this.buttonsEnabled) {
      logger.log('BUTTON_EVENTS', 'PortalModal: Enter button click ignored - buttons not enabled yet');
      return;
    }

    logger.log('BUTTON_EVENTS', 'PortalModal: Enter button clicked - calling onEnter');

    // Воспроизводим звук входа в портал
    const audioManager = this.scene.data.get('audioManager');
    if (audioManager && typeof audioManager.playPortalEnter === 'function') {
      audioManager.playPortalEnter();
    }

    // ✅ Отключаем кнопки сразу, чтобы предотвратить повторные нажатия
    this.buttonsEnabled = false;

    // ✅ Сохраняем callback перед уничтожением
    const enterCallback = this.config.onEnter;

    // ✅ Уничтожаем модальное окно СРАЗУ
    this.destroy();

    // ✅ Вызываем callback ПОСЛЕ уничтожения
    if (enterCallback) {
      try {
        enterCallback();
        logger.log('MODAL_UI', 'PortalModal: onEnter callback executed successfully');
      } catch (error) {
        logger.log('MODAL_UI', '❌ PortalModal: Error in onEnter callback', error);
      }
    } else {
      logger.log('MODAL_UI', '❌ PortalModal: onEnter callback is undefined');
    }
  }

  private handleCancel(): void {
    logger.log('BUTTON_EVENTS', `PortalModal: handleCancel() called, buttonsEnabled: ${this.buttonsEnabled}`);

    // ✅ Защита от случайных нажатий - только проверка buttonsEnabled
    if (!this.buttonsEnabled) {
      logger.log('BUTTON_EVENTS', 'PortalModal: Cancel button click ignored - buttons not enabled yet');
      return;
    }

    logger.log('BUTTON_EVENTS', 'PortalModal: Cancel button clicked - calling onCancel callback');

    // Воспроизводим звук отмены портала
    const audioManager = this.scene.data.get('audioManager');
    if (audioManager && typeof audioManager.playPortalCancel === 'function') {
      audioManager.playPortalCancel();
    }

    // ✅ Отключаем кнопки сразу, чтобы предотвратить повторные нажатия
    this.buttonsEnabled = false;

    // ✅ Сохраняем callback перед уничтожением
    const cancelCallback = this.config.onCancel;
    logger.log('MODAL_UI', `PortalModal: cancelCallback exists: ${!!cancelCallback}`);

    // ✅ Вызываем callback ПЕРЕД уничтожением (чтобы гарантировать выполнение)
    if (cancelCallback) {
      try {
        logger.log('MODAL_UI', 'PortalModal: Executing onCancel callback...');
        cancelCallback();
        logger.log('MODAL_UI', 'PortalModal: onCancel callback executed successfully');
      } catch (error) {
        logger.log('MODAL_UI', '❌ PortalModal: Error in onCancel callback', error);
      }
    } else {
      logger.log('MODAL_UI', '❌ PortalModal: onCancel callback is undefined');
    }

    // ✅ Уничтожаем модальное окно ПОСЛЕ вызова callback
    logger.log('MODAL_UI', 'PortalModal: Destroying modal...');
    this.destroy();
    logger.log('MODAL_UI', 'PortalModal: Modal destroyed');
  }

  public destroy(): void {
    // ✅ Удаляем слушатель поворота экрана
    if (this.orientationHandler && typeof window !== 'undefined') {
      window.removeEventListener('orientationchange', this.orientationHandler);
      this.orientationHandler = undefined;
    }

    this.background.destroy();
    this.titleText.destroy();
    this.questionText.destroy();
    if (this.imageArea) {
      this.imageArea.destroy();
    }
    if (this.questionImage) {
      this.questionImage.destroy();
    }
    this.portalInfoText.destroy();
    this.enterButton.destroy();
    this.cancelButton.destroy();
  }

  public setVisible(visible: boolean): void {
    this.background.setVisible(visible);
    this.titleText.setVisible(visible);
    this.questionText.setVisible(visible);
    if (this.imageArea) {
      this.imageArea.setVisible(visible);
    }
    if (this.questionImage) {
      this.questionImage.setVisible(visible);
    }
    this.portalInfoText.setVisible(visible);
    this.enterButton.setVisible(visible);
    this.cancelButton.setVisible(visible);
  }
}