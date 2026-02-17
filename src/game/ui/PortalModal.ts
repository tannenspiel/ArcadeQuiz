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
  GLOBAL_QUESTION_BACKGROUND_COLOR,
  PORTAL_TITLE_FONT_MULTIPLIER,
  PORTAL_QUESTION_FONT_MULTIPLIER,
  PORTAL_ANSWER_FONT_MULTIPLIER,
  PORTAL_BUTTON_FONT_MULTIPLIER
} from '../../constants/textStyles';
import { DEPTHS } from '../../constants/gameConstants';
import { PortalConfig } from '../../types/portalTypes';
import { ParsedQuestion } from '../../types/questionTypes';
import { calculateModalSize } from './ModalSizeCalculator';
import { calculateBaseFontSize, calculateButtonFontSize, calculateUnifiedBaseFontSize, calculatePortalFontSize, getButtonPadding, calculateTieredFontSizeSimple, calculatePortalTieredFontSize } from '../utils/FontSizeCalculator';
import { QuizManager } from '../systems/QuizManager';
import { AssetLoader } from '../core/AssetLoader';
import { AB_TESTING } from '../../config/gameConfig';
import { NineSliceBackground } from './NineSliceBackground';
import { logger } from '../../utils/Logger';
import { DEBUG_QUIZ_PORTAL, DEBUG_MODAL_BOUNDS } from '../../config/debugConfig';
import { BASE_SCALE } from '../../constants/gameConstants';

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

  // ✅ ДЕБАГ: Ссылка на debugGraphics для уничтожения
  private debugGraphics?: Phaser.GameObjects.Graphics;

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
        this.destroy(); // Удаляем текущий UI
        this.createUI(); // Создаем новый UI
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

    // Получаем реальный размер canvas (с защитой)
    let canvasWidth: number;
    let canvasHeight: number;
    if (this.scene.game.canvas && typeof this.scene.game.canvas.getBoundingClientRect === 'function') {
      const canvasRect = this.scene.game.canvas.getBoundingClientRect();
      canvasWidth = canvasRect.width;
      canvasHeight = canvasRect.height;
    } else {
      canvasWidth = this.scene.scale.width;
      canvasHeight = this.scene.scale.height;
    }

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

    // ✅ GRID SNAPPING: Привязка к пиксельной сетке (как в KeyQuestionModal)
    // Чтобы избежать дробных пикселей при BASE_SCALE=4, координаты и размеры должны быть кратны 4 (или 8 для центрирования)
    const snapToGrid = (val: number) => Math.round(val / BASE_SCALE) * BASE_SCALE;
    const snapToGridDouble = (val: number) => Math.round(val / (BASE_SCALE * 2)) * (BASE_SCALE * 2);

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

    // Тексты
    const titleTextContent = 'ПОРТАЛ ОТКРЫТ!';
    const questionTextContent = this.config.globalQuestion?.questionText || 'Do you want to enter this portal?';
    const answerTextContent = this.config.portalConfig.answerText;
    const enterButtonText = 'ВОЙТИ В ПОРТАЛ';
    const cancelButtonText = 'ОТМЕНА';

    // Фон (неинтерактивный, чтобы клики проходили к кнопкам)
    if (AB_TESTING.USE_NINE_SLICE_MODAL) {
      // ✅ RESTORED: Используем дефолтные параметры (без аргументов texture/tileSize), как в бэкапе
      this.background = new NineSliceBackground(
        this.scene,
        modalX,
        modalY,
        modalWidth,
        modalHeight
        // texture по умолчанию 'ui_dialog_box', tileSize по умолчанию 8
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

    // ✅ ЕДИНЫЙ PADDING ДЛЯ ВСЕХ 5 БЛОКОВ (вопрос, ответ, 3 кнопки/элемента)
    // Базовые отступы в пикселях исходной графики масштабируются через BASE_SCALE
    // Аналогично KeyQuestionModal
    const blockPadding = getButtonPadding(contentAreaWidth, blockHeight);
    const blockAvailableWidth = blockPadding.availableWidth;   // contentAreaWidth - (paddingX * 2)
    const blockAvailableHeight = blockPadding.availableHeight; // blockHeight - (paddingY * 2)

    logger.log('MODAL_SIZE', `PortalModal Block Padding: width=${contentAreaWidth.toFixed(0)}→${blockAvailableWidth.toFixed(0)}, height=${blockHeight.toFixed(1)}→${blockAvailableHeight.toFixed(1)}`);

    // ✅ УРОВНЕВЫЙ РАСЧЁТ ШРИФТОВ (Tiered Font Logic: A/B/C/D)
    // Размеры рассчитываются динамически на основе доступных размеров поля
    // ПОЛНАЯ КОПИЯ ЛОГИКИ ИЗ KeyQuestionModal

    // ✅ FIX: Пересчитываем в НАТИВНЫЕ координаты (компенсация setScale(invZoom))
    const nativeAvailableWidth = blockAvailableWidth / invZoom;
    const nativeAvailableHeight = blockAvailableHeight / invZoom;

    logger.log('MODAL_SIZE', `PortalModal Native Dimensions: virtual: ${blockAvailableWidth.toFixed(0)}×${blockAvailableHeight.toFixed(1)} → native: ${nativeAvailableWidth.toFixed(0)}×${nativeAvailableHeight.toFixed(1)} (invZoom=${invZoom.toFixed(3)})`);

    // ✅ НОВАЯ СИСТЕМА ABCDEF: чистая символьная арифметика (нативные координаты)

    // ═══════════════════════════════════════════════════════
    // ✅ РАСЧЕТ ШРИФТОВ:
    // ═══════════════════════════════════════════════════════

    // ✅ НОВАЯ СИСТЕМА ABCDEF: чистая символьная арифметика (нативные координаты)

    // Title (sans-serif)
    const titleFontSize = calculatePortalTieredFontSize(
      nativeAvailableWidth,
      nativeAvailableHeight,
      titleTextContent
    ) * PORTAL_TITLE_FONT_MULTIPLIER;

    // Question (sans-serif)
    // Используем тот же алгоритм, что и в KeyQuestionModal, но в независимой функции
    const questionFontSize = calculatePortalTieredFontSize(
      nativeAvailableWidth,
      nativeAvailableHeight,
      questionTextContent
    ) * PORTAL_QUESTION_FONT_MULTIPLIER;

    // Answer (sans-serif)
    const answerFontSize = calculatePortalTieredFontSize(
      nativeAvailableWidth,
      nativeAvailableHeight,
      answerTextContent
    ) * PORTAL_ANSWER_FONT_MULTIPLIER;

    // Buttons (sans-serif)
    const enterBtnFontSize = calculatePortalTieredFontSize(
      nativeAvailableWidth,
      nativeAvailableHeight,
      enterButtonText
    ) * PORTAL_BUTTON_FONT_MULTIPLIER;

    const cancelBtnFontSize = calculatePortalTieredFontSize(
      nativeAvailableWidth,
      nativeAvailableHeight,
      cancelButtonText
    ) * PORTAL_BUTTON_FONT_MULTIPLIER;

    // Берем минимальный, чтобы кнопки были одинаковые
    const buttonFontSize = Math.min(enterBtnFontSize, cancelBtnFontSize);

    logger.log('MODAL_SIZE', `PortalModal [SYNCED]: title=${titleFontSize.toFixed(1)}, question=${questionFontSize.toFixed(1)}, answer=${answerFontSize.toFixed(1)}, button=${buttonFontSize.toFixed(1)}`);

    // ═══════════════════════════════════════════════════════
    // ✅ DEBUG: ОТРИСОВКА РАМОК БЛОКОВ И ТЕКСТА
    // ═══════════════════════════════════════════════════════
    if (DEBUG_MODAL_BOUNDS) {
      if (this.debugGraphics) this.debugGraphics.destroy(); // Safety check
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(3000).setScrollFactor(0).disableInteractive();

      // Цвета для каждого блока
      const colors = {
        title: 0xff00ff, question: 0x00ff00, answer: 0x00ffff, enter: 0xffff00, cancel: 0xff8800
      };

      const contentAreaLeft = modalX - contentAreaWidth / 2;

      // 1. Рамки самих блоков (Occupied Layout Blocks)
      this.debugGraphics.lineStyle(2, colors.title, 0.8);
      this.debugGraphics.strokeRect(contentAreaLeft, titleY - blockHeight / 2, contentAreaWidth, blockHeight);
      this.debugGraphics.lineStyle(2, colors.question, 0.8);
      this.debugGraphics.strokeRect(contentAreaLeft, questionY - blockHeight / 2, contentAreaWidth, blockHeight);
      this.debugGraphics.lineStyle(2, colors.answer, 0.8);
      this.debugGraphics.strokeRect(contentAreaLeft, answerY - blockHeight / 2, contentAreaWidth, blockHeight);
      this.debugGraphics.lineStyle(2, colors.enter, 0.8);
      this.debugGraphics.strokeRect(contentAreaLeft, enterButtonY - blockHeight / 2, contentAreaWidth, blockHeight);
      this.debugGraphics.lineStyle(2, colors.cancel, 0.8);
      this.debugGraphics.strokeRect(contentAreaLeft, cancelButtonY - blockHeight / 2, contentAreaWidth, blockHeight);

      // 2. Рамки ДОСТУПНОГО пространства для текста (Blue) - показываем AVAILABLE area
      // Теперь это использует blockAvailableWidth (с учетом паддинга из getButtonPadding)
      const availableColor = 0x0088ff; // Blue
      this.debugGraphics.lineStyle(1, availableColor, 1.0);

      const debugAvailableW = blockAvailableWidth;
      const debugAvailableH = blockAvailableHeight;

      const drawAvailableRect = (centerY: number) => {
        this.debugGraphics!.strokeRect(
          modalX - debugAvailableW / 2,
          centerY - debugAvailableH / 2,
          debugAvailableW,
          debugAvailableH
        );
      };

      drawAvailableRect(titleY);
      drawAvailableRect(questionY); // для вопроса - общий случай (без картинки)
      drawAvailableRect(answerY);
      drawAvailableRect(enterButtonY);
      drawAvailableRect(cancelButtonY);
    }


    // ✅ Заголовок - самый верхний блок
    // ✅ Округляем координаты до целых пикселей
    const titleTextX = Math.round(modalX);
    const titleTextY = Math.round(titleY);

    // ✅ wordWrap width должен учитывать invZoom для правильного переноса строк
    // Используем nativeAvailableWidth!
    const titleWordWrapWidth = nativeAvailableWidth;

    this.titleText = this.scene.add.text(
      titleTextX,
      titleTextY,
      titleTextContent,
      {
        fontSize: `${Math.round(titleFontSize)}px`,
        fontFamily: DEFAULT_FONT_FAMILY,
        fontStyle: PORTAL_TITLE_FONT_STYLE,
        color: PORTAL_TITLE_COLOR,
        wordWrap: { width: titleWordWrapWidth },
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_CLOSE).setScrollFactor(0);

    this.titleText.setResolution(textResolution);
    this.titleText.setScale(invZoom);


    // ✅ Вопрос и картинка - в одном блоке
    const hasImage = !!this.config.globalQuestion?.image;

    // ✅ Определяем размещение в зависимости от наличия картинки
    if (hasImage) {
      // === С КАРТИНКОЙ ===
      const contentRightEdge = modalX + contentAreaWidth / 2;
      const gap = 15;

      let scaledImageWidth = 0;
      let imageKey = '';

      try {
        const assetLoader = (this.scene as any).assetLoader as AssetLoader | undefined;
        if (assetLoader) {
          imageKey = this.config.globalQuestion!.image!.replace('.png', '').replace('.jpg', '').replace('.jpeg', '');
          imageKey = imageKey.replace(/^QuizGame_/, '');
          let imagePath = this.config.globalQuestion!.image!.replace(/^QuizGame_/, '');

          await assetLoader.loadImage(imageKey, imagePath);

          if (this.scene.textures.exists(imageKey)) {
            const maxImgHeight = questionAreaHeight * 0.9;
            const maxImgWidth = contentAreaWidth * 0.45;

            const tempImage = this.scene.add.image(0, 0, imageKey);
            const scale = Math.min(maxImgWidth / tempImage.width, maxImgHeight / tempImage.height);
            scaledImageWidth = tempImage.width * scale;
            tempImage.destroy();
          }
        }
      } catch (error) {
        logger.log('MODAL_UI', '❌ PortalModal: Error loading question image', error);
      }

      const imageLeftEdge = contentRightEdge - scaledImageWidth; // ✅ Без internalPadding
      const imageX = Math.round(imageLeftEdge);
      const imageY = Math.round(questionY);

      const textRightEdge = imageLeftEdge - gap;
      const questionTextX = Math.round(textRightEdge);
      const questionTextY = Math.round(questionY);

      const textWidthAvailable = textRightEdge - (modalX - contentAreaWidth / 2);

      // Используем нативную ширину для WordWrap
      const questionWordWrapWidth = Math.max(50, textWidthAvailable) / invZoom;

      const questionFontSizeWithImage = questionFontSize; // No longer scaled by 0.8

      // ✅ DEBUG DRAW for Question Text Area (Available)
      if (DEBUG_MODAL_BOUNDS && this.debugGraphics) {
        const availX = modalX - contentAreaWidth / 2; // Left edge of content area
        const availW = textWidthAvailable;
        const availH = blockAvailableHeight; // Use blockAvailableHeight
        // Draw blue box for text available area
        this.debugGraphics.strokeRect(availX, questionY - availH / 2, availW, availH);
      }

      this.questionText = this.scene.add.text(
        questionTextX,
        questionTextY,
        questionTextContent,
        {
          fontSize: `${questionFontSizeWithImage}px`,
          fontFamily: DEFAULT_FONT_FAMILY,
          fontStyle: PORTAL_QUESTION_FONT_STYLE,
          color: PORTAL_QUESTION_COLOR,
          wordWrap: { width: questionWordWrapWidth },
          align: 'right'
        }
      ).setOrigin(1, 0.5).setDepth(DEPTHS.SCREEN.MODAL_BUTTON).setScrollFactor(0);

      this.questionText.setResolution(textResolution);
      this.questionText.setScale(invZoom);

      if (imageKey && this.scene.textures.exists(imageKey)) {
        this.questionImage = this.scene.add.image(imageX, imageY, imageKey)
          .setOrigin(0, 0.5).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);

        // Повторный расчет масштаба для установки
        const maxImgHeight = questionAreaHeight * 0.9;
        const maxImgWidth = contentAreaWidth * 0.45;
        const scale = Math.min(maxImgWidth / this.questionImage.width, maxImgHeight / this.questionImage.height);
        this.questionImage.setScale(scale);
      }
    } else {
      // === БЕЗ КАРТИНКИ ===
      const questionTextX = Math.round(modalX);
      const questionTextY = Math.round(questionY);

      // Используем нативную ширину для WordWrap
      const questionWordWrapWidth = nativeAvailableWidth;

      // ✅ DEBUG DRAW for Question Text Area (Available) - Full width
      if (DEBUG_MODAL_BOUNDS && this.debugGraphics) {
        const availW = blockAvailableWidth;
        const availH = blockAvailableHeight;
        this.debugGraphics.strokeRect(modalX - availW / 2, questionY - availH / 2, availW, availH);
      }

      this.questionText = this.scene.add.text(
        questionTextX,
        questionTextY,
        questionTextContent,
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

    // ✅ Создаем невидимую область для картинки
    if (!hasImage) {
      this.imageArea = this.scene.add.rectangle(
        Math.round(modalX),
        Math.round(questionY),
        contentAreaWidth,
        questionAreaHeight,
        0x1a202c, 0.0
      ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);
    }

    // ✅ Ответ на глобальный вопрос
    const portalColor = this.config.portalConfig.isCorrect
      ? (DEBUG_QUIZ_PORTAL ? PORTAL_INFO_CORRECT_COLOR_DEBUG : PORTAL_INFO_CORRECT_COLOR)
      : PORTAL_INFO_WRONG_COLOR;

    const answerTextX = Math.round(modalX);
    const answerTextY = Math.round(answerY);

    const answerWordWrapWidth = (contentAreaWidth * 0.95) / invZoom;

    this.portalInfoText = this.scene.add.text(
      answerTextX,
      answerTextY,
      answerTextContent,
      {
        fontSize: `${answerFontSize}px`,
        fontFamily: DEFAULT_FONT_FAMILY,
        fontStyle: PORTAL_INFO_FONT_STYLE,
        color: portalColor,
        wordWrap: { width: answerWordWrapWidth },
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);

    this.portalInfoText.setResolution(textResolution);
    this.portalInfoText.setScale(invZoom);

    // ✅ Кнопка Войти
    const enterButtonX = Math.round(modalX);
    const roundedEnterButtonY = Math.round(enterButtonY);
    // ✅ FIX: Нативные пиксели для wordWrap
    const buttonWordWrapWidth = (contentAreaWidth * 0.95) / invZoom;

    this.enterButton = new Button(this.scene, {
      x: enterButtonX,
      y: roundedEnterButtonY,
      width: contentAreaWidth,
      height: buttonHeight,
      text: enterButtonText,
      fontSize: buttonFontSize,
      wordWrap: { width: buttonWordWrapWidth }, // ✅ FIXED: native pixels
      onClick: () => {
        logger.log('BUTTON_EVENTS', 'PortalModal: Enter button onClick triggered');
        this.handleEnter();
      }
    });
    this.enterButton.setDepth(DEPTHS.SCREEN.MODAL_BUTTON);

    // ✅ Кнопка Отмена
    const cancelButtonX = Math.round(modalX);
    const roundedCancelButtonY = Math.round(cancelButtonY);

    this.cancelButton = new Button(this.scene, {
      x: cancelButtonX,
      y: roundedCancelButtonY,
      width: contentAreaWidth,
      height: buttonHeight,
      text: cancelButtonText,
      fontSize: buttonFontSize,
      wordWrap: { width: buttonWordWrapWidth }, // ✅ FIXED: native pixels
      onClick: () => {
        logger.log('BUTTON_EVENTS', 'PortalModal: Cancel button onClick triggered');
        this.handleCancel();
      }
    });
    this.cancelButton.setDepth(DEPTHS.SCREEN.MODAL_BUTTON);
  }

  private handleEnter(): void {
    if (!this.buttonsEnabled) return;

    // Воспроизводим звук входа в портал
    const audioManager = this.scene.data.get('audioManager');
    if (audioManager && typeof audioManager.playPortalEnter === 'function') {
      audioManager.playPortalEnter();
    }

    this.buttonsEnabled = false;
    const enterCallback = this.config.onEnter;
    this.destroy();

    if (enterCallback) {
      try {
        enterCallback();
      } catch (error) {
        logger.log('MODAL_UI', '❌ PortalModal: Error in onEnter callback', error);
      }
    }
  }

  private handleCancel(): void {
    if (!this.buttonsEnabled) return;

    // Воспроизводим звук отмены портала
    const audioManager = this.scene.data.get('audioManager');
    if (audioManager && typeof audioManager.playPortalCancel === 'function') {
      audioManager.playPortalCancel();
    }

    this.buttonsEnabled = false;
    const cancelCallback = this.config.onCancel;

    if (cancelCallback) {
      try {
        cancelCallback();
      } catch (error) {
        logger.log('MODAL_UI', '❌ PortalModal: Error in onCancel callback', error);
      }
    }
    this.destroy();
  }

  public destroy(): void {
    if (this.orientationHandler && typeof window !== 'undefined') {
      window.removeEventListener('orientationchange', this.orientationHandler);
      this.orientationHandler = undefined;
    }

    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = undefined;
    }

    if (this.background) this.background.destroy();
    if (this.titleText) this.titleText.destroy();
    if (this.questionText) this.questionText.destroy();
    if (this.imageArea) this.imageArea.destroy();
    if (this.questionImage) this.questionImage.destroy();
    if (this.portalInfoText) this.portalInfoText.destroy();
    if (this.enterButton) this.enterButton.destroy();
    if (this.cancelButton) this.cancelButton.destroy();
  }

  public setVisible(visible: boolean): void {
    if (this.background) this.background.setVisible(visible);
    if (this.titleText) this.titleText.setVisible(visible);
    if (this.questionText) this.questionText.setVisible(visible);
    if (this.imageArea) this.imageArea.setVisible(visible);
    if (this.questionImage) this.questionImage.setVisible(visible);
    if (this.portalInfoText) this.portalInfoText.setVisible(visible);
    if (this.enterButton) this.enterButton.setVisible(visible);
    if (this.cancelButton) this.cancelButton.setVisible(visible);
  }
}