/**
 * Модальное окно окончания игры
 * Поддерживает 3 типа: выигрыш всей игры, выигрыш уровня, проигрыш
 */

import Phaser from 'phaser';
import { Button } from './Button';
import {
  calculateBaseFontSize,
  calculateButtonFontSize,
  calculateUnifiedBaseFontSize,
  getButtonPadding,
  calculateGameOverTieredFontSize
} from '../utils/FontSizeCalculator';
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
  UI_TEXT,
  GAMEOVER_TITLE_FONT_MULTIPLIER,
  GAMEOVER_FEEDBACK_FONT_MULTIPLIER,
  GAMEOVER_SCORE_FONT_MULTIPLIER,
  GAMEOVER_BUTTON_FONT_MULTIPLIER
} from '../../constants/textStyles';
import { ACTOR_SIZES, BASE_SCALE, DEPTHS } from '../../constants/gameConstants';
import { calculateModalSize } from './ModalSizeCalculator';
import { AB_TESTING } from '../../config/gameConfig';
import { NineSliceBackground } from './NineSliceBackground';
import { logger } from '../../utils/Logger';
import { snapToGrid, snapToGridDouble } from './ModalPositioningHelper';
import { DEBUG_MODAL_BOUNDS } from '../../config/debugConfig';

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
    let modalSize = calculateModalSize(
      cam.width,      // Camera width (виртуальные пиксели)
      cam.height,     // Camera height (виртуальные пиксели)
      canvasWidth,    // Canvas width (реальные пиксели)
      canvasHeight,   // Canvas height (реальные пиксели)
      40,             // Padding (по умолчанию, как в KeyQuestionModal)
      'GameOverModal' // Имя модального окна для логов
    );

    // ✅ GRID SNAPPING: Привязка к пиксельной сетке
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
    const contentAreaBottom = modalY + modalHeight / 2 - internalPadding;

    // Фон
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
        0x1a202c, 0.98
      ).setDepth(DEPTHS.SCREEN.MODAL_BG).setScrollFactor(0).setStrokeStyle(4, 0x4a5568);
    }

    // ✅ Устанавливаем разрешение для четкости текста
    const textResolution = 1;

    // ✅ ОТСТУП МЕЖДУ ЭЛЕМЕНТАМИ (одинаковый для всех)
    let buttonSpacing = internalPadding / 4;

    // ✅ РАСЧЕТ ОБЛАСТЕЙ: ДЕЛИМ РАБОЧУЮ ОБЛАСТЬ НА 6 РАВНЫХ ЧАСТЕЙ
    // 6. Title
    // 5. Feedback
    // 4. Score
    // 3. Character
    // 2. Next Level (или пусто)
    // 1. Restart
    const totalBlocks = 6;
    const totalSpacings = totalBlocks - 1;

    // Общая высота рабочей области
    const totalContentHeight = contentAreaHeight;

    // Высота одного блока (с учетом отступов)
    const blockHeight = (totalContentHeight - (totalSpacings * buttonSpacing)) / totalBlocks;

    // ✅ РАСЧЕТ ПОЗИЦИЙ: создаем массив позиций снизу вверх
    const blockPositions: number[] = [];
    let currentY = contentAreaBottom;

    for (let i = 0; i < totalBlocks; i++) {
      currentY -= blockHeight / 2; // Центр текущего блока
      blockPositions.push(currentY);
      currentY -= blockHeight / 2; // Переходим к следующему блоку
      if (i < totalBlocks - 1) {
        currentY -= buttonSpacing; // Отступ между блоками
      }
    }

    // Индексы блоки (снизу вверх):
    // 0: Restart Button
    // 1: Next Level Button (или пусто)
    // 2: Character
    // 3: Score
    // 4: Feedback
    // 5: Title
    const titleY = blockPositions[5];
    const feedbackY = blockPositions[4];
    const scoreY = blockPositions[3];
    const charY = blockPositions[2];
    const nextLevelButtonY = blockPositions[1];
    const restartButtonY = blockPositions[0];

    // ✅ ЕДИНЫЙ PADDING ДЛЯ БЛОКОВ (как в KeyQuestionModal)
    const blockPadding = getButtonPadding(contentAreaWidth, blockHeight);
    const blockAvailableWidth = blockPadding.availableWidth;
    const blockAvailableHeight = blockPadding.availableHeight;

    // ✅ FIX: Пересчитываем в НАТИВНЫЕ координаты
    const nativeAvailableWidth = blockAvailableWidth / invZoom;
    const nativeAvailableHeight = blockAvailableHeight / invZoom;

    // ═══════════════════════════════════════════════════════
    // ✅ РАСЧЕТ ШРИФТОВ (Independent GameOver Logic)
    // ═══════════════════════════════════════════════════════

    // Title
    const titleTextContent = this.getTitleText();
    const titleFontSize = calculateGameOverTieredFontSize(
      nativeAvailableWidth,
      nativeAvailableHeight,
      titleTextContent
    ) * GAMEOVER_TITLE_FONT_MULTIPLIER;

    // Feedback
    const feedbackTextContent = this.config.feedbackText || ' ';
    const feedbackFontSize = calculateGameOverTieredFontSize(
      nativeAvailableWidth,
      nativeAvailableHeight,
      feedbackTextContent
    ) * GAMEOVER_FEEDBACK_FONT_MULTIPLIER;

    // Score (Block 3 - Standard Text Block)
    const scoreTextContent = `${UI_TEXT.SCORE_PREFIX}${this.config.score}`;

    const scoreFontSize = calculateGameOverTieredFontSize(
      nativeAvailableWidth,
      nativeAvailableHeight,
      scoreTextContent
    ) * GAMEOVER_SCORE_FONT_MULTIPLIER;

    // Buttons
    // Restart
    const restartBtnText = 'ИГРАТЬ ЗАНОВО';
    const restartBtnFontSize = calculateGameOverTieredFontSize(
      nativeAvailableWidth,
      nativeAvailableHeight,
      restartBtnText
    ) * GAMEOVER_BUTTON_FONT_MULTIPLIER;

    // Next Level
    const nextLevelBtnText = 'СЛЕДУЮЩИЙ УРОВЕНЬ';
    let nextLevelBtnFontSize = restartBtnFontSize; // Default
    if (this.config.type === GameOverType.WIN_LEVEL) {
      nextLevelBtnFontSize = calculateGameOverTieredFontSize(
        nativeAvailableWidth,
        nativeAvailableHeight,
        nextLevelBtnText
      ) * GAMEOVER_BUTTON_FONT_MULTIPLIER;
    }

    // Unified Button Font (min)
    const buttonFontSize = Math.min(restartBtnFontSize, nextLevelBtnFontSize);

    // ═══════════════════════════════════════════════════════
    // ✅ UI RENDERING
    // ═══════════════════════════════════════════════════════

    // 1. Title
    this.titleText = this.scene.add.text(
      Math.round(modalX),
      Math.round(titleY),
      titleTextContent,
      {
        fontSize: `${Math.round(titleFontSize)}px`,
        fontFamily: DEFAULT_FONT_FAMILY, // Default font
        fontStyle: GAMEOVER_TITLE_FONT_STYLE,
        color: this.getTitleColor(),
        wordWrap: { width: nativeAvailableWidth },
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);
    this.titleText.setResolution(textResolution).setScale(invZoom);

    // 2. Feedback
    if (this.config.feedbackText) {
      this.feedbackText = this.scene.add.text(
        Math.round(modalX),
        Math.round(feedbackY),
        feedbackTextContent,
        {
          fontSize: `${Math.round(feedbackFontSize)}px`,
          fontFamily: DEFAULT_FONT_FAMILY,
          fontStyle: KEY_FEEDBACK_FONT_STYLE,
          color: KEY_FEEDBACK_COLOR,
          wordWrap: { width: nativeAvailableWidth },
          align: 'center'
        }
      ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_BUTTON).setScrollFactor(0);
      this.feedbackText.setResolution(textResolution).setScale(invZoom);
    }

    // 3. Score (Block 3) - Standard Text Block
    this.scoreText = this.scene.add.text(
      Math.round(modalX),
      Math.round(scoreY),
      scoreTextContent,
      {
        fontSize: `${Math.round(scoreFontSize)}px`,
        fontFamily: DEFAULT_FONT_FAMILY,
        fontStyle: GAMEOVER_SCORE_FONT_STYLE,
        color: GAMEOVER_SCORE_COLOR,
        wordWrap: { width: nativeAvailableWidth },
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);
    this.scoreText.setResolution(textResolution).setScale(invZoom);

    // 4. Character (Block 2) - Centered
    this.createPlayerAnimation(modalX, charY);

    // 4. Buttons
    // Restart (Block 0)
    const buttonWidth = contentAreaWidth;

    this.restartButton = new Button(this.scene, {
      x: Math.round(modalX),
      y: Math.round(restartButtonY),
      width: buttonWidth,
      height: blockHeight, // Full block height
      text: restartBtnText,
      fontSize: buttonFontSize,
      wordWrap: { width: nativeAvailableWidth },
      onClick: () => {
        this.config.onRestart();
        this.destroy();
      }
    });
    this.restartButton.setDepth(DEPTHS.SCREEN.MODAL_BUTTON);

    // Next Level (Block 1) - Only if WIN_LEVEL
    if (this.config.type === GameOverType.WIN_LEVEL && this.config.onNextLevel) {
      this.nextLevelButton = new Button(this.scene, {
        x: Math.round(modalX),
        y: Math.round(nextLevelButtonY),
        width: buttonWidth,
        height: blockHeight,
        text: nextLevelBtnText,
        fontSize: buttonFontSize,
        wordWrap: { width: nativeAvailableWidth },
        onClick: () => {
          if (this.config.onNextLevel) this.config.onNextLevel();
          this.destroy();
        }
      });
      this.nextLevelButton.setDepth(DEPTHS.SCREEN.MODAL_BUTTON);
    }

    // ═══════════════════════════════════════════════════════
    // ✅ DEBUG GRAPHICS
    // ═══════════════════════════════════════════════════════
    if (DEBUG_MODAL_BOUNDS) {
      const graphics = this.scene.add.graphics();
      graphics.setDepth(3000).setScrollFactor(0);

      // Block bounds
      const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff];
      blockPositions.forEach((y, idx) => {
        graphics.lineStyle(2, colors[idx % colors.length], 0.8);
        graphics.strokeRect(modalX - contentAreaWidth / 2, y - blockHeight / 2, contentAreaWidth, blockHeight);

        // Block Label
        const label = this.scene.add.text(
          modalX - contentAreaWidth / 2 + 5,
          y - blockHeight / 2 + 5,
          `Block ${idx}`,
          { fontSize: '10px', color: '#ffffff' }
        ).setDepth(3001).setScrollFactor(0);
      });

      // Available Text Area (Blue)
      graphics.lineStyle(1, 0x0088ff, 1.0);
      const w = blockAvailableWidth;
      const h = blockAvailableHeight;
      blockPositions.forEach(y => {
        graphics.strokeRect(modalX - w / 2, y - h / 2, w, h);
      });
    }
  }

  private getTitleText(): string {
    switch (this.config.type) {
      case GameOverType.WIN_GAME:
        return 'ПОБЕДА!';
      case GameOverType.WIN_LEVEL:
        return 'УРОВЕНЬ ПРОЙДЕН!';
      case GameOverType.LOSE:
        return 'ПРОИГРАЛИ:(';
      default:
        return 'ПРОИГРАЛИ:(';
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

  private createPlayerAnimation(x: number, y: number): void {
    // ✅ Для проигрыша используем статическую текстуру Character.GameOver_16x16.png
    if (this.config.type === GameOverType.LOSE) {
      const gameOverKey = 'character_gameover';

      // Проверяем, загружена ли текстура
      if (!this.scene.textures.exists(gameOverKey)) {
        logger.warn('MODAL_UI', 'GameOverModal: Character.GameOver texture not loaded, skipping');
        return;
      }

      // Создаем статическое изображение
      this.playerSprite = this.scene.add.image(
        x,
        y,
        gameOverKey
      ).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);

      // ✅ Масштабируем персонажа используя стандартный игровой масштаб (User Request)
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
        x,
        y,
        spriteKey
      ).setDepth(DEPTHS.SCREEN.MODAL_TEXT).setScrollFactor(0);

      // Сохраняем спрайт в поле класса
      this.playerSprite = sprite;

      // ✅ Используем анимацию из конфигурации
      const animKey = 'boy_jump_win';

      if (!this.scene.anims.exists(animKey)) {
        logger.warn('MODAL_UI', `GameOverModal: Animation "${animKey}" not found.`);
        return;
      }

      // Запускаем анимацию нативно
      sprite.play(animKey, true);

      // ✅ ВНЕДРЯЕМ РУЧНУЮ СИНХРОНИЗАЦИЮ КАДРОВ
      const anim = this.scene.anims.get(animKey);
      if (anim && anim.frames && anim.frames.length > 0) {
        let currentFrameIdx = 0;
        const frameRate = anim.frameRate || 8;
        const interval = 1000 / frameRate;

        this.animationTimer = this.scene.time.addEvent({
          delay: interval,
          callback: () => {
            if (!sprite || !sprite.active) return;
            currentFrameIdx = (currentFrameIdx + 1) % anim.frames.length;
            const animFrame = anim.frames[currentFrameIdx];
            if (animFrame && animFrame.frame) {
              const animFrameObj = animFrame.frame;
              let frameIndex: number | undefined;

              if (typeof (animFrameObj as any).index === 'number') {
                frameIndex = (animFrameObj as any).index;
              } else if (typeof animFrameObj.name === 'string') {
                frameIndex = parseInt(animFrameObj.name, 10);
              }

              if (frameIndex !== undefined) {
                sprite.setFrame(frameIndex);
              }
            }
          },
          loop: true
        });
      }

      // ✅ Масштабируем персонажа используя стандартный игровой масштаб (User Request)
      sprite.setScale(BASE_SCALE * ACTOR_SIZES.PLAYER);
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