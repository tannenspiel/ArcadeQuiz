/**
 * CoinBubbleQuiz - Quiz UI for coin collection (NO modal window)
 *
 * **Key Features:**
 * - Two button-bubbles with true/false statements (no modal background)
 * - Positioned in Screen Space using setScrollFactor(0)
 * - Randomly selects 1 true + 1 false statement from coin-quiz.json
 * - Emits COIN_QUIZ_COMPLETED event with result
 * - ✅ Bubble sizes: 95% of modal width, 1/5 of modal height (from backup project)
 *
 * **Flow:**
 * 1. Player touches coin → physics pauses
 * 2. Two bubbles appear (stacked vertically at screen center)
 * 3. Player clicks a bubble
 * 4. Result emitted via COIN_QUIZ_COMPLETED event
 * 5. Bubbles disappear, physics resumes
 *
 * ⚠️ CRITICAL: All UI elements MUST use setScrollFactor(0) for Screen Space positioning
 * ⚠️ CRITICAL: Use canvasWidth/Height for center (NOT cameraWidth/Height) for setScrollFactor(0) elements!
 */

import Phaser from 'phaser';
import { logger } from '../../utils/Logger';
import { EVENTS, BASE_SCALE, KEYS, DEPTHS } from '../../constants/gameConstants';
import { BUTTON_HOVER_GOLD, BUTTON_PRESSED_GOLD } from '../../constants/textStyles';
import { QuizStatements } from '../../systems/QuizManager';
import { snapToGrid, snapToGridDouble } from './ModalPositioningHelper';

// ==================== КОНСТАНТЫ ДЛЯ 9-SLICE БАББЛОВ ====================
// ui_coin_bubble использует frameWidth=10, frameHeight=10
// scaledTileSize = 10 * BASE_SCALE(4) = 40px
const BUBBLE_TILE_SIZE = 10 * BASE_SCALE; // 40px - размер одной нарезки

// Минимальный размер баббла без пересечения нарезок
// 3 нарезки = угол + минимум центра + угол
const MIN_BUBBLE_SIZE = BUBBLE_TILE_SIZE * 3; // 120px - минимум для корректного отображения
import {
  DEFAULT_FONT_FAMILY,
  COIN_BUTTON_FONT_SIZE_MULTIPLIER,
  COIN_BUTTON_FONT_STYLE,
  MIN_FONT_SIZE_BUTTON
} from '../../constants/textStyles';
import {
  calculateBaseFontSize,
  calculateUnifiedBaseFontSize,
  getButtonPadding,
  getFontSizeMultiplier,
  getCoinBubbleFontMultiplier
} from '../utils/FontSizeCalculator';
import { calculateModalSize } from './ModalSizeCalculator';
import { NineSliceBackground } from './NineSliceBackground';

export interface CoinBubbleQuizConfig {
  coinSprite: Phaser.Physics.Arcade.Sprite;
  onCorrect: (statementText: string) => void;  // ✅ Изменено: передаем текст утверждения
  onWrong: () => void;
}

interface QuizStatements {
  true: string;
  false: string;
}

/**
 * CoinBubbleQuiz - Two button-bubbles for coin quiz (no modal window)
 */
export class CoinBubbleQuiz {
  private scene: Phaser.Scene;
  private config: CoinBubbleQuizConfig;

  // UI elements
  private bubble1Bg!: Phaser.GameObjects.Container;
  private bubble2Bg!: Phaser.GameObjects.Container;
  private text1!: Phaser.GameObjects.Text;
  private text2!: Phaser.GameObjects.Text;
  private coin1Sprite!: Phaser.GameObjects.Sprite;
  private coin2Sprite!: Phaser.GameObjects.Sprite;

  // State
  private correctBubbleIndex: number = -1;
  private currentStatements: QuizStatements | null = null;  // ✅ НОВОЕ: Храним выбранные утверждения
  private isAnswered: boolean = false;
  private isInitializing: boolean = false; // ✅ Guard to prevent concurrent initialization

  // ✅ Static guard to prevent multiple quiz instances globally
  private static activeQuiz: CoinBubbleQuiz | null = null;

  constructor(scene: Phaser.Scene, config: CoinBubbleQuizConfig) {
    this.scene = scene;
    this.config = config;

    // ✅ GUARD: Prevent multiple concurrent quiz instances
    if (CoinBubbleQuiz.activeQuiz) {
      logger.warn('COIN_BUBBLE_QUIZ', `Quiz already active, destroying previous instance`);
      CoinBubbleQuiz.activeQuiz.destroy();
      CoinBubbleQuiz.activeQuiz = null;
    }

    CoinBubbleQuiz.activeQuiz = this;
    this.isInitializing = true;

    logger.log('COIN_BUBBLE_QUIZ', `Creating CoinBubbleQuiz`, {
      coinX: config.coinSprite.x,
      coinY: config.coinSprite.y
    });

    // Delay creation to ensure canvas is ready
    this.scene.time.delayedCall(1, () => {
      this.createUI();
    });
  }

  /**
   * Create the UI - two button-bubbles with statements
   * ⚠️ CRITICAL: All elements use setScrollFactor(0) for Screen Space
   */
  private async createUI(): Promise<void> {
    try {
      // ✅ Check if already initialized
      if (!this.isInitializing) {
        logger.warn('COIN_BUBBLE_QUIZ', `Already initialized or cancelled, skipping UI creation`);
        return;
      }

      // Load statements
      const statements = await this.loadStatements();

      // ✅ НОВОЕ: Сохраняем утверждения для последующей передачи в callback
      this.currentStatements = statements;

      // Determine which bubble is correct (random)
      this.correctBubbleIndex = Math.random() < 0.5 ? 0 : 1;

      // Assign statements to bubbles
      const bubble1Text = this.correctBubbleIndex === 0 ? statements.true : statements.false;
      const bubble2Text = this.correctBubbleIndex === 1 ? statements.true : statements.false;

      // ✅ Находим самый длинный текст для расчёта fontSize (гарантирует влезание обоих)
      const longestText = bubble1Text.length > bubble2Text.length ? bubble1Text : bubble2Text;

      // ✅ Defensive: Validate statements before using
      if (!bubble1Text || !bubble2Text) {
        logger.error('COIN_BUBBLE_QUIZ', `Statements invalid`, { bubble1Text, bubble2Text, statements });
        return; // Don't create UI if statements are invalid
      }

      logger.log('COIN_BUBBLE_QUIZ', `Statements loaded`, {
        bubble1: bubble1Text.substring(0, 20) + '...',
        bubble2: bubble2Text.substring(0, 20) + '...',
        longest: longestText.substring(0, 20) + '...',
        correctIndex: this.correctBubbleIndex
      });

      // Calculate screen position (centered, two bubbles stacked vertically)
      const canvasWidth = this.scene.scale.canvas.width;
      const canvasHeight = this.scene.scale.canvas.height;
      const cameraWidth = this.scene.cameras.main.width;
      const cameraHeight = this.scene.cameras.main.height;

      // ✅ Use ModalSizeCalculator to get consistent sizing (from backup project)
      const modalSize = calculateModalSize(
        cameraWidth,
        cameraHeight,
        canvasWidth,
        canvasHeight,
        40,             // padding
        'CoinBubbleQuiz' // Имя модального окна для логов
      );

      // === ЕДИНОЕ ПОЛЕ ОТСТУПОВ (как в KeyQuestionModal) ===
      const MODAL_INTERNAL_PADDING_PERCENT = 0.08; // 8% от меньшей стороны
      const MODAL_INTERNAL_PADDING_MIN = 30; // Минимум 30 виртуальных пикселей

      const modalMinSize = Math.min(modalSize.width, modalSize.height);
      const internalPadding = Math.max(
        MODAL_INTERNAL_PADDING_MIN,
        modalMinSize * MODAL_INTERNAL_PADDING_PERCENT
      );

      // Доступная область для контента
      const contentAreaWidth = modalSize.width - (internalPadding * 2);
      const contentAreaHeight = modalSize.height - (internalPadding * 2);

      // === УНИФИЦИРОВАННЫЙ РАСЧЁТ ВЫСОТЫ БАББЛОВ ===
      // Используем ту же формулу, что и для блоков в KeyQuestionModal
      // ⚠️ ВАЖНО: totalBlocks = 5 чтобы баббл был равен ОДНОМУ блоку из 5 в KeyQuestionModal
      // Каждый баббл = 1/5 высоты контента (20%), а не 1/2 (50%)
      const totalBlocks = 5; // 5 блоков как в KeyQuestionModal
      const totalSpacings = totalBlocks - 1; // 4 отступа
      const bubbleSpacing = internalPadding / 4; // Отступ = internalPadding / 4 (как в KeyQuestionModal)

      const totalContentHeight = contentAreaHeight;
      const bubbleHeight = (totalContentHeight - (totalSpacings * bubbleSpacing)) / totalBlocks;

      // ✅ Width: 95% of modal width (оставлено как было)
      // ✅ Height: УНИФИЦИРОВАН с блоками KeyQuestionModal!
      // Используем snapToGridDouble для выравнивания к сетке и соблюдения MIN_BUBBLE_SIZE

      let bubbleBtnWidth = snapToGridDouble(modalSize.width * 0.95);
      let bubbleBtnHeight = snapToGridDouble(bubbleHeight);

      // ✅ ЗАЩИТА ОТ ПЕРЕСЕЧЕНИЯ НАРЕЗОК 9-SLICE
      // Проверяем, что размер баббла не меньше минимального (120px = 3 × tileSize)
      // Используем snapToGridDouble для выравнивания и соблюдения MIN_BUBBLE_SIZE
      if (bubbleBtnWidth < MIN_BUBBLE_SIZE || bubbleBtnHeight < MIN_BUBBLE_SIZE) {
        logger.warn('COIN_BUBBLE_QUIZ', `Bubble size too small for 9-slice! ` +
          `width=${bubbleBtnWidth.toFixed(1)} (min=${MIN_BUBBLE_SIZE}), ` +
          `height=${bubbleBtnHeight.toFixed(1)} (min=${MIN_BUBBLE_SIZE}). ` +
          `Using snapToGridDouble to ensure grid alignment.`);
        bubbleBtnWidth = Math.max(bubbleBtnWidth, MIN_BUBBLE_SIZE);
        bubbleBtnHeight = Math.max(bubbleBtnHeight, MIN_BUBBLE_SIZE);
      }

      // ✅ Positioning: Centered, stacked with gap
      // ✅ CRITICAL: Use canvasWidth/Height for center (NOT cameraWidth/Height)!
      // For UI with setScrollFactor(0), coordinates are relative to canvas, not world space
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const gap = 20;

      const bubble1X = centerX;
      const bubble1Y = centerY - bubbleBtnHeight / 2 - gap / 2;
      const bubble2X = centerX;
      const bubble2Y = centerY + bubbleBtnHeight / 2 + gap / 2;

      // ✅ УНИФИЦИРОВАННЫЙ РАСЧЁТ РАЗМЕРА ШРИФТА с модальными окнами
      // Используем calculateUnifiedBaseFontSize как в KeyQuestionModal, PortalModal, GameOverModal
      const baseFontSize = calculateUnifiedBaseFontSize(this.scene, 1); // level=1 для унификации

      // ✅ АДАПТИВНЫЕ ОТСТУПЫ: используем getButtonPadding для вычисления отступов
      // Базовые отступы в пикселях исходной графики масштабируются через BASE_SCALE
      const bubblePadding = getButtonPadding(bubbleBtnWidth, bubbleBtnHeight);
      const bubbleAvailableWidth = bubblePadding.availableWidth;
      const bubbleAvailableHeight = bubblePadding.availableHeight;

      // ✅ Используем самый длинный текст для расчёта fontSize (гарантирует влезание обоих бабблов)
      const bubbleFontSizeRaw = calculateBaseFontSize(
        this.scene,
        bubbleAvailableWidth,
        bubbleAvailableHeight,
        longestText,  // ✅ Самый длинный текст
        baseFontSize,
        3 // maxLines
      );

      // ✅ АДАПТИВНЫЙ МНОЖИТЕЛЬ: используем getCoinBubbleFontMultiplier вместо фиксированного 1.3
      const screenAR = canvasWidth / canvasHeight;
      const adaptiveMultiplier = getCoinBubbleFontMultiplier(screenAR);
      const fontSize = bubbleFontSizeRaw * adaptiveMultiplier;

      logger.log('COIN_BUBBLE_QUIZ', `Unified sizing: baseFont=${baseFontSize.toFixed(2)}px, bubbleRaw=${bubbleFontSizeRaw.toFixed(2)}px, final=${fontSize.toFixed(2)}px (×${adaptiveMultiplier.toFixed(2)})`);
      logger.log('COIN_BUBBLE_QUIZ', `Font calculation details:`, {
        bubblePaddingX: bubblePadding.paddingX.toFixed(1),
        bubblePaddingY: bubblePadding.paddingY.toFixed(1),
        bubbleAvailableWidth: bubbleAvailableWidth.toFixed(0),
        bubbleAvailableHeight: bubbleAvailableHeight.toFixed(0),
        finalFontSize: fontSize.toFixed(2),
        bubble1Text: bubble1Text.substring(0, 30) + '...',
        bubble2Text: bubble2Text.substring(0, 30) + '...',
        usedForCalc: longestText.substring(0, 30) + '...' // ✅ Показываем, какой текст использовался
      });

      // ✅ Create interactive bubble buttons using simple containers
      this.bubble1Bg = this.createBubbleButton(bubble1X, bubble1Y, bubbleBtnWidth, bubbleBtnHeight, bubble1Text, fontSize, 0);
      this.bubble2Bg = this.createBubbleButton(bubble2X, bubble2Y, bubbleBtnWidth, bubbleBtnHeight, bubble2Text, fontSize, 1);

      logger.log('COIN_BUBBLE_QUIZ', `UI created`, {
        bubble1: { x: bubble1X, y: bubble1Y },
        bubble2: { x: bubble2X, y: bubble2Y }
      });

      // ✅ Mark initialization as complete
      this.isInitializing = false;
    } catch (error) {
      // ✅ Enhanced error logging
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cause: error instanceof Error ? (error as any).cause : undefined
      };
      logger.error('COIN_BUBBLE_QUIZ', `Error creating UI`, errorDetails);
      console.error('🪙 CoinBubbleQuiz: Error details:', errorDetails);
      this.isInitializing = false;
      this.destroy(); // Clean up on error
    }
  }

  /**
   * Load statements from coin-quiz.json
   * ✅ ИСПОЛЬЗУЕТ УНИКАЛЬНЫЕ УТВЕРЖДЕНИЯ через QuizManager
   * Returns one true and one false statement (filtered by used statements)
   */
  private async loadStatements(): Promise<QuizStatements> {
    try {
      // ✅ Получаем текущий уровень и менеджер вопросов из сцены
      const levelManager = (this.scene as any).levelManager;
      const currentLevel = levelManager?.getCurrentLevel() || 1;
      const quizManager = (this.scene as any).quizManager;
      const gameState = (this.scene as any).gameState;

      if (!quizManager) {
        logger.error('COIN_BUBBLE_QUIZ', `QuizManager not found in scene`);
        return { true: '2 + 2 = 4', false: '2 + 2 = 5' };
      }

      // ✅ Получаем список уже использованных утверждений
      const usedTrueStatements = gameState?.getUsedTrueStatements() || [];
      const usedFalseStatements = gameState?.getUsedFalseStatements() || [];

      console.log('🪙 CoinBubbleQuiz: Loading unique statements', {
        level: currentLevel,
        usedTrue: usedTrueStatements.length,
        usedFalse: usedFalseStatements.length
      });

      // ✅ Используем QuizManager для получения уникальных утверждений
      const statements = await quizManager.getUniqueCoinStatements(
        currentLevel,
        usedTrueStatements,
        usedFalseStatements
      );

      console.log('🪙 CoinBubbleQuiz: Selected statements', { true: statements.true, false: statements.false });

      // ✅ Помечаем утверждения как использованные в GameState
      if (gameState) {
        gameState.addUsedTrueStatement(statements.true);
        gameState.addUsedFalseStatement(statements.false);
        console.log('🪙 CoinBubbleQuiz: Marked statements as used', {
          totalUsedTrue: gameState.getUsedTrueStatements().length,
          totalUsedFalse: gameState.getUsedFalseStatements().length
        });
      }

      return statements;
    } catch (error) {
      logger.error('COIN_BUBBLE_QUIZ', `Failed to load statements`, error);
      // Fallback statements
      return {
        true: '2 + 2 = 4',
        false: '2 + 2 = 5'
      };
    }
  }

  /**
   * Create a bubble button with coin decoration
   * ✅ Uses ui_coin_bubble texture (UI.CoinBubble_30x30.png) with 9-slice rendering
   */
  private createBubbleButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    fontSize: number,
    bubbleIndex: number
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setDepth(DEPTHS.SCREEN.MODAL_BG); // ✅ CRITICAL: Set depth on the container itself!
    container.setScrollFactor(0); // ✅ CRITICAL: Screen Space!

    // ✅ Use ui_coin_bubble texture with NineSliceBackground
    // Texture is 30x30 with 3x3 grid (frameWidth: 10, frameHeight: 10)
    const bubbleBg = new NineSliceBackground(
      this.scene,
      0,
      0,
      width,
      height,
      'ui_coin_bubble',
      10, // Size of each tile (from spritesheetConfigs)
      true // useStretch: true for buttons
    );
    container.add(bubbleBg);

    // ✅ Make the background interactive (как в бэкапе!)
    bubbleBg.setupInteractive();

    // ✅ Add coin sprite decoration on the left side
    // ✅ v2 - Подвинем монетку БЛИЖЕ К ЛЕВОМУ КРАЮ (уменьшаем отступ)
    const coinOffsetFromLeft = 25; // Было 40, стало 25px от левого края (ближе к краю)
    const coinSprite = this.scene.add.sprite(-width / 2 + coinOffsetFromLeft, 0, KEYS.COIN);
    coinSprite.setScale(3); // Make coin visible
    coinSprite.play('coin_idle', true); // ✅ Use 'coin_idle' animation
    container.add(coinSprite);

    // Store coin sprite reference for cleanup
    if (bubbleIndex === 0) {
      this.coin1Sprite = coinSprite;
    } else {
      this.coin2Sprite = coinSprite;
    }

    // ✅ Add text
    // Fix blurry text: Ensure integer coordinates and inverse zoom scaling
    const cam = this.scene.cameras.main;
    const invZoom = 1 / cam.zoom; // ✅ FIX BLUR: Calculate inverse zoom

    // ✅ v2 - ВЫРАВНИВАНИЕ текста: небольшое смещение вправо с учётом монетки
    // Монетка теперь ближе к левому краю (25px), поэтому текст смещён меньше
    const textX = Math.round(width * 0.05); // 5% вправо от центра (было 15%)
    const textY = 0;

    // Use resolution: 1 (consistent with KeyQuestionModal)
    const resolution = 1;

    // ✅ АДАПТИВНЫЕ ОТСТУПЫ для wordWrap с учётом монетки
    const bubblePadding = getButtonPadding(width, height);
    // Доступная ширина для текста с учётом монетки слева
    const textAvailableWidth = bubblePadding.availableWidth - 80; // 80px для монетки
    // ✅ Компенсация setScale(invZoom) для wordWrap
    const textWordWrapWidth = Math.max(50, textAvailableWidth) / invZoom;

    const textObj = this.scene.add.text(textX, textY, text, {
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: `${fontSize}px`,
      fontStyle: COIN_BUTTON_FONT_STYLE,
      color: '#000000',
      align: 'center', // ✅ Центрирование текста
      wordWrap: { width: textWordWrapWidth },
      resolution: resolution
    });

    // ✅ Apply inverse zoom scaling for sharpness
    textObj.setScale(invZoom);
    textObj.setOrigin(0.5);

    container.add(textObj);

    // Store text reference
    if (bubbleIndex === 0) {
      this.text1 = textObj;
    } else {
      this.text2 = textObj;
    }

    // ✅ Add hover/click effects on the background (same UX as modal buttons)
    // NineSliceBackground is the interactive container itself
    // ✅ UX: Hover state (pointerover)
    bubbleBg.on('pointerover', () => {
      if (!this.isAnswered) {
        bubbleBg.setTint(BUTTON_HOVER_GOLD); // Lighter gold on hover
      }
    });

    // ✅ UX: Reset to normal (pointerout)
    bubbleBg.on('pointerout', () => {
      if (!this.isAnswered) {
        bubbleBg.clearTint();
      }
    });

    // ✅ UX: Click detection with proper state management (same as Button class)
    let clickProcessed = false;
    let pointerDownTime = 0;

    // ✅ Record pointerdown time (but don't change visual yet)
    bubbleBg.on('pointerdown', () => {
      if (!this.isAnswered) {
        clickProcessed = false;
        pointerDownTime = this.scene.time.now;
        // ✅ PRESSED state - darker tint
        bubbleBg.setTint(BUTTON_PRESSED_GOLD); // Darker gold (pressed)
      }
    });

    // ✅ Handle click on release (pointerup)
    bubbleBg.on('pointerup', () => {
      // ✅ Restore hover tint
      if (!this.isAnswered) {
        bubbleBg.setTint(0xFFEC8B); // Back to hover tint
      }

      // ✅ Same validation as Button class
      if (this.isAnswered) {
        return;
      }

      if (clickProcessed) {
        return;
      }

      // ✅ Check minimum click duration (30ms)
      const clickDuration = this.scene.time.now - pointerDownTime;
      if (clickDuration < 30) {
        return;
      }

      if (pointerDownTime === 0) {
        return;
      }

      // ✅ Mark as processed
      clickProcessed = true;

      // ✅ Play click sound (same as modal buttons)
      const audioManager = (this.scene as any).audioManager;
      if (audioManager && typeof audioManager.playButtonClick === 'function') {
        audioManager.playButtonClick();
      }

      // ✅ Handle the click
      this.handleBubbleClick(bubbleIndex);
    });

    return container;
  }

  /**
   * Handle bubble click
   */
  private handleBubbleClick(bubbleIndex: number): void {
    if (this.isAnswered) {
      logger.log('COIN_BUBBLE_QUIZ', `Already answered, ignoring click`);
      return;
    }

    this.isAnswered = true;
    const isCorrect = bubbleIndex === this.correctBubbleIndex;

    logger.log('COIN_BUBBLE_QUIZ', `Bubble clicked`, {
      bubbleIndex,
      isCorrect,
      correctBubbleIndex: this.correctBubbleIndex
    });

    // Call appropriate callback
    if (isCorrect) {
      // ✅ НОВОЕ: Передаем текст true-утверждения для отслеживания уникальности
      const statementText = this.currentStatements?.true || '';
      this.config.onCorrect(statementText);
    } else {
      this.config.onWrong();
    }

    // Destroy UI after delay
    this.scene.time.delayedCall(200, () => {
      this.destroy();
    });
  }

  /**
   * Destroy the quiz UI
   */
  public destroy(): void {
    logger.log('COIN_BUBBLE_QUIZ', `Destroying CoinBubbleQuiz`);

    // Destroy containers (includes all children: background, coin sprite, text)
    if (this.bubble1Bg) {
      this.bubble1Bg.destroy();
      this.bubble1Bg = null as any;
    }
    if (this.bubble2Bg) {
      this.bubble2Bg.destroy();
      this.bubble2Bg = null as any;
    }

    // ✅ Clear static guard if this is the active quiz
    if (CoinBubbleQuiz.activeQuiz === this) {
      CoinBubbleQuiz.activeQuiz = null;
    }

    // ✅ Clear static guard if this is the active quiz
    if (CoinBubbleQuiz.activeQuiz === this) {
      CoinBubbleQuiz.activeQuiz = null;
    }

    this.isInitializing = false;
  }

  // ⚠️ TESTING ONLY: Public method to simulate bubble click in tests
  // ✅ Updated for new UX pattern (pointerdown -> wait -> pointerup)
  public simulateBubbleClick(bubbleIndex: number): void {
    const container = bubbleIndex === 0 ? this.bubble1Bg : this.bubble2Bg;
    if (container && (container as any).list) {
      // Find the NineSliceBackground in the container
      const bubbleBg = (container as any).list.find((obj: any) => obj.emit && typeof obj.emit === 'function');
      if (bubbleBg) {
        // ✅ Simulate proper click sequence: pointerdown -> wait -> pointerup
        bubbleBg.emit('pointerdown');

        // ✅ Wait for minimum click duration (30ms) before pointerup
        this.scene.time.delayedCall(50, () => {
          if (!this.isAnswered) {
            bubbleBg.emit('pointerup');
          }
        });
      }
    }
  }
}
