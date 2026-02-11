/**
 * Класс для управления бабблом сообщения с вопросом
 * Поддерживает два типа бабблов:
 * - 'oracle': BubbleMsg.Transparent152x56.png (для Оракула)
 * - 'portal': BubbleMsg.Transparent136x48.png (для порталов)
 */

import Phaser from 'phaser';
import { KEYS, ACTOR_SIZES, BASE_SCALE, MAP_CENTER_X, MAP_CENTER_Y, BUBBLE_SIZES, HINT_OFFSETS, SPRITE_SIZES, DEPTHS } from '../../constants/gameConstants';
import {
  DEFAULT_FONT_FAMILY,
  BUBBLE_QUESTION_FONT_STYLE,
  BUBBLE_QUESTION_COLOR,
  BUBBLE_QUESTION_STROKE,
  BUBBLE_QUESTION_STROKE_THICKNESS,
  BUBBLE_HINT_COLOR,
  BUBBLE_HINT_STROKE,
  BUBBLE_HINT_STROKE_THICKNESS
} from '../../constants/textStyles';
import { ParsedQuestion } from '../../types/questionTypes';
import { calculateOptimalBaseFontSize } from '../utils/FontSizeCalculator';
import { QuizManager } from '../systems/QuizManager';
import { BubbleType } from '../utils/BubblePositionCalculator';
import { logger } from '../../utils/Logger';

/**
 * Статическое свойство для хранения единого размера шрифта всех бабблов
 */
let globalBubbleFontSize: number | null = null;

/**
 * Получить глобальный размер шрифта для всех бабблов
 */
export function getGlobalBubbleFontSize(): number | null {
  return globalBubbleFontSize;
}

export class QuestionBubble {
  private scene: Phaser.Scene;
  private bubbleSprite: Phaser.GameObjects.Image;
  private questionText: Phaser.GameObjects.Text;
  private questionImage?: Phaser.GameObjects.Image;
  private hintText?: Phaser.GameObjects.Text;
  private opacity: number = 0.0; // ✅ Начальная непрозрачность 0 (баббл скрыт до вызова show())
  private readonly baseOpacity: number = 0.75; // ✅ Базовая непрозрачность 90
  private readonly scale: number = BASE_SCALE * ACTOR_SIZES.QUESTION_BUBBLE;

  // Тип баббла (oracle или portal)
  private readonly bubbleType: BubbleType;

  // Размеры баббла (базовые, до масштабирования) - зависят от типа
  private readonly BUBBLE_WIDTH: number;
  private readonly BUBBLE_HEIGHT: number;

  // Рабочая область для текста - зависит от типа
  private readonly TEXT_AREA_WIDTH: number;
  private readonly TEXT_AREA_HEIGHT: number;

  // Позиция баббла (обновляемая для следования за родительским спрайтом)
  private x: number;
  private y: number;

  // ✅ Анимация прозрачности
  private opacityTween?: Phaser.Tweens.Tween;
  private hintTextTween?: Phaser.Tweens.Tween; // ✅ Отдельная анимация для hintText

  // ✅ Состояние видимости
  private isVisible: boolean = false; // Видимость баббла (показывается/скрывается по клику)

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    quizManager?: QuizManager,
    currentLevel: number = 1,
    bubbleType: BubbleType = 'oracle'
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.bubbleType = bubbleType;

    // Определяем размеры баббла в зависимости от типа
    const bubbleSize = bubbleType === 'oracle' ? BUBBLE_SIZES.ORACLE : BUBBLE_SIZES.PORTAL;
    this.BUBBLE_WIDTH = bubbleSize.WIDTH;
    this.BUBBLE_HEIGHT = bubbleSize.HEIGHT;
    this.TEXT_AREA_WIDTH = bubbleSize.TEXT_AREA_WIDTH;
    this.TEXT_AREA_HEIGHT = bubbleSize.TEXT_AREA_HEIGHT;

    // Выбираем текстуру в зависимости от типа
    const textureKey = bubbleType === 'oracle' ? KEYS.QUESTION_BUBBLE : KEYS.PORTAL_QUESTION_BUBBLE;

    // Создаем спрайт баббла
    // ✅ Округляем координаты
    this.bubbleSprite = scene.add.image(this.x, this.y, textureKey);
    this.bubbleSprite.setOrigin(0.5);
    this.bubbleSprite.setScale(this.scale);
    this.bubbleSprite.setDepth(DEPTHS.SCREEN.QUESTION_BUBBLE); // ✅ Бабблы - самый верхний слой (выше всех объектов, включая Overlay BG)
    this.bubbleSprite.setAlpha(0.0); // ✅ Скрываем сразу при создании

    // ✅ РАСЧЕТ РАЗМЕРА ШРИФТА НА ОСНОВЕ САМОГО ДЛИННОГО ТЕКСТА
    // Рабочая область для текста (с учетом масштаба) - используется всегда
    const availableWidth = this.TEXT_AREA_WIDTH * this.scale;
    const availableHeight = this.TEXT_AREA_HEIGHT * this.scale;

    // Используем глобальный размер, если он уже рассчитан, иначе рассчитываем новый
    let optimalFontSize: number;

    if (globalBubbleFontSize !== null) {
      // Используем уже рассчитанный размер
      optimalFontSize = globalBubbleFontSize;
      logger.log('UI', `QuestionBubble: Using cached global font size: ${optimalFontSize.toFixed(2)} px`);
    } else {
      // Рассчитываем новый размер на основе самого длинного текста
      let longestQuestionText = 'What is the capital of France?'; // Fallback
      if (quizManager) {
        try {
          const longestTexts = quizManager.getLongestTexts(currentLevel);
          longestQuestionText = longestTexts.question || longestQuestionText;
        } catch (error) {
          // Если уровень еще не загружен, используем fallback текст
          logger.warn('UI', `QuestionBubble: Level not loaded yet, using fallback text: ${error}`);
          longestQuestionText = 'What is the capital of France?'; // Fallback
        }
      }

      // Начальный размер шрифта (65% от высоты рабочей области, как в модальных окнах)
      const initialBaseSize = availableHeight * 0.65;

      // Рассчитываем оптимальный размер шрифта
      // ✅ Для бабблов используем независимый maxSize (25px × 0.625 = 15.6px визуально)
      optimalFontSize = calculateOptimalBaseFontSize(
        scene,
        availableWidth,
        availableHeight,
        longestQuestionText,
        initialBaseSize,
        25 // ✅ Максимальный размер для бабблов (с учётом setScale будет ~15px визуально)
      );

      // Сохраняем глобальный размер для всех бабблов
      globalBubbleFontSize = optimalFontSize;

      logger.log('UI', 'QuestionBubble: Font size calculation', {
        availableWidth: availableWidth.toFixed(1),
        availableHeight: availableHeight.toFixed(1),
        longestQuestionText,
        initialBaseSize: `${initialBaseSize.toFixed(2)}px`,
        optimalFontSize: `${optimalFontSize.toFixed(2)}px (saved as global)`
      });
    }

    // Создаем текст вопроса с рассчитанным размером шрифта
    // ✅ Используем константы из textStyles.ts и округленные координаты
    this.questionText = scene.add.text(this.x, this.y, '', {
      fontSize: `${optimalFontSize}px`,
      fontFamily: DEFAULT_FONT_FAMILY,
      fontStyle: BUBBLE_QUESTION_FONT_STYLE, // ✅ Константа из textStyles.ts
      color: BUBBLE_QUESTION_COLOR, // ✅ Константа из textStyles.ts
      stroke: BUBBLE_QUESTION_STROKE, // ✅ Константа из textStyles.ts
      strokeThickness: BUBBLE_QUESTION_STROKE_THICKNESS, // ✅ Константа из textStyles.ts
      align: 'center',
      wordWrap: { width: availableWidth }
    });
    this.questionText.setOrigin(0.5);
    this.questionText.setDepth(DEPTHS.SCREEN.QUESTION_BUBBLE); // ✅ Бабблы - самый верхний слой (выше всех объектов, включая Overlay BG)
    this.questionText.setAlpha(0.0); // ✅ Скрываем сразу при создании
    // ✅ Бабблы НЕ используют setScrollFactor(0) - они должны следовать за картой/камерой

    // ✅ Устанавливаем разрешение = 1 для пиксельной четкости (как в модальных окнах)
    this.questionText.setResolution(1);

    // ✅ ВАЖНО: Применяем setScale(invZoom) для четкости текста при zoom камеры
    const invZoom = 1 / scene.cameras.main.zoom;
    this.questionText.setScale(invZoom);

    logger.log('UI', `QuestionBubble created at ${x}, ${y} with font size: ${optimalFontSize.toFixed(2)} px`);
  }

  /**
   * Установить вопрос и картинку
   */
  public async setQuestion(questionData: ParsedQuestion, assetLoader: any): Promise<void> {
    // Устанавливаем текст вопроса
    this.questionText.setText(questionData.questionText);

    // ✅ Убеждаемся, что шрифт жирный
    // ✅ Используем константу из textStyles.ts для жирного стиля
    this.questionText.setFontStyle(BUBBLE_QUESTION_FONT_STYLE);

    // Если есть изображение, загружаем и отображаем его
    if (questionData.image) {
      try {
        // Обрабатываем имя файла (убираем расширения и префиксы)
        let imageKey = questionData.image.replace('.png', '').replace('.jpg', '').replace('.jpeg', '');
        imageKey = imageKey.replace(/^QuizGame_/, '');

        let imagePath = questionData.image;
        imagePath = imagePath.replace(/^QuizGame_/, '');

        // Загружаем изображение
        await assetLoader.loadImage(imageKey, imagePath);

        if (!this.scene.textures.exists(imageKey)) {
          throw new Error(`Image texture not found after loading: ${imageKey}`);
        }

        // Удаляем старое изображение, если было
        if (this.questionImage) {
          this.questionImage.destroy();
        }

        // Создаем новое изображение
        // Если есть картинка: первые 3/4 ширины (106.5px) - текст (выравнивание по правому краю), последняя 1/4 (35.5px) - картинка
        const textAreaWidth = this.TEXT_AREA_WIDTH * this.scale;
        const imageAreaWidth = textAreaWidth / 4; // 1/4 ширины для картинки
        const textAreaWidthForText = (textAreaWidth * 3) / 4; // 3/4 ширины для текста

        const imageX = Math.round(this.x + (textAreaWidth / 2) - (imageAreaWidth / 2));
        const imageY = Math.round(this.y);

        this.questionImage = this.scene.add.image(imageX, imageY, imageKey);
        this.questionImage.setOrigin(0.5);
        this.questionImage.setDepth(DEPTHS.SCREEN.QUESTION_BUBBLE); // ✅ Бабблы - самый верхний слой (выше всех объектов, включая Overlay BG)
        this.questionImage.setAlpha(0.0); // ✅ Скрываем сразу при создании

        // Масштабируем изображение под размер области
        const maxImageSize = imageAreaWidth * 0.8; // 80% от области для картинки
        if (this.questionImage.width > maxImageSize || this.questionImage.height > maxImageSize) {
          const scaleX = maxImageSize / this.questionImage.width;
          const scaleY = maxImageSize / this.questionImage.height;
          const scale = Math.min(scaleX, scaleY);
          this.questionImage.setScale(scale);
        }

        // Обновляем позицию и ширину текста (текст занимает 3/4 ширины, выравнивание по правому краю)
        const textX = Math.round(this.x - (textAreaWidth / 2) + (textAreaWidthForText / 2));
        this.questionText.setX(textX);
        this.questionText.setWordWrapWidth(textAreaWidthForText);
        this.questionText.setAlign('right');

        // ✅ При наличии картинки текст занимает только 3/4 ширины, поэтому нужно пересчитать размер шрифта
        // Используем самый длинный текст для расчета (как в конструкторе)
        // Получаем quizManager из scene.data (как в модальных окнах)
        const quizManager = (this.scene as any).data?.get('quizManager') as QuizManager | undefined;
        let longestQuestionText = 'What is the capital of France?'; // Fallback
        if (quizManager) {
          const longestTexts = quizManager.getLongestTexts();
          longestQuestionText = longestTexts.question || longestQuestionText;
        }

        // ✅ Используем глобальный размер шрифта (одинаковый для всех бабблов)
        // При наличии картинки текст занимает меньше места, но размер шрифта остается тем же
        if (globalBubbleFontSize !== null) {
          this.questionText.setFontSize(`${globalBubbleFontSize}px`);
          logger.log('UI', `QuestionBubble: Using global font size for image case: ${globalBubbleFontSize.toFixed(2)} px (width: ${textAreaWidthForText.toFixed(1)})`);
        } else {
          // Fallback: пересчитываем, если глобальный размер еще не установлен
          const availableHeight = this.TEXT_AREA_HEIGHT * this.scale;
          const initialBaseSize = availableHeight * 0.65;
          const optimalFontSizeWithImage = calculateOptimalBaseFontSize(
            this.scene,
            textAreaWidthForText,
            availableHeight,
            longestQuestionText,
            initialBaseSize
          );
          globalBubbleFontSize = optimalFontSizeWithImage;
          this.questionText.setFontSize(`${optimalFontSizeWithImage}px`);
          logger.log('UI', `QuestionBubble: Font size recalculated for image case: ${optimalFontSizeWithImage.toFixed(2)} px (width: ${textAreaWidthForText.toFixed(1)})`);
        }

        logger.log('UI', `QuestionBubble: Question image loaded and displayed: ${questionData.image}`);
      } catch (imageError) {
        logger.warn('UI', `QuestionBubble: Failed to load question image: ${questionData.image}`, imageError);
        // Если изображение не загрузилось, используем только текст по центру
        this.questionText.setX(this.x);
        this.questionText.setWordWrapWidth(this.TEXT_AREA_WIDTH * this.scale);
        this.questionText.setAlign('center');
      }
    } else {
      // Если нет изображения, текст по центру
      this.questionText.setX(this.x);
      this.questionText.setWordWrapWidth(this.TEXT_AREA_WIDTH * this.scale);
      this.questionText.setAlign('center');

      // Удаляем изображение, если было
      if (this.questionImage) {
        this.questionImage.destroy();
        this.questionImage = undefined;
      }
    }
  }

  /**
   * Переключить видимость баббла с анимацией
   */
  public toggleVisibility(): void {
    this.isVisible = !this.isVisible;
    this.animateOpacity(this.isVisible ? this.baseOpacity : 0.0);
  }

  /**
   * Показать баббл с анимацией
   */
  public show(): void {
    this.isVisible = true;
    this.animateOpacity(this.baseOpacity);
  }

  /**
   * Скрыть баббл с анимацией
   */
  public hide(): void {
    this.isVisible = false;
    this.animateOpacity(0.0);
  }

  /**
   * Установить прозрачность (мгновенно, без анимации)
   * hintText не затрагивается - он анимируется отдельно
   */
  public setOpacity(value: number): void {
    // Останавливаем текущую анимацию, если она есть
    if (this.opacityTween) {
      this.opacityTween.stop();
      this.opacityTween = undefined;
    }

    this.opacity = Math.max(0, Math.min(1, value));
    this.bubbleSprite.setAlpha(this.opacity);
    this.questionText.setAlpha(this.opacity);
    if (this.questionImage) {
      this.questionImage.setAlpha(this.opacity);
    }
    // hintText не трогаем - он анимируется отдельно
  }

  /**
   * Анимировать прозрачность от текущего значения к целевому
   * Применяется ко всем элементам баббла (кроме hintText, который анимируется отдельно)
   */
  private animateOpacity(targetOpacity: number): void {
    // Останавливаем текущую анимацию, если она есть
    if (this.opacityTween) {
      this.opacityTween.stop();
      this.opacityTween = undefined;
    }

    const startOpacity = this.opacity;
    const duration = 300; // 300ms для плавной анимации

    // Создаем временный объект для анимации
    const tweenTarget = { opacity: startOpacity };

    this.opacityTween = this.scene.tweens.add({
      targets: tweenTarget,
      opacity: targetOpacity,
      duration: duration,
      ease: 'Power2',
      onUpdate: () => {
        this.opacity = Math.max(0, Math.min(1, tweenTarget.opacity));
        // ✅ Применяем прозрачность ко всем элементам баббла (кроме hintText)
        this.bubbleSprite.setAlpha(this.opacity);
        this.questionText.setAlpha(this.opacity);
        if (this.questionImage) {
          this.questionImage.setAlpha(this.opacity);
        }
        // hintText не трогаем - он анимируется отдельно
      },
      onComplete: () => {
        this.opacity = targetOpacity;
        this.opacityTween = undefined;
      }
    });
  }

  /**
   * Установить состояние оверлапа (удалено - больше не используется)
   * Оставлено для обратной совместимости, но ничего не делает
   * @deprecated Эффект прозрачности при пересечении удален
   */
  public setOverlapState(isOverlapping: boolean): void {
    // Метод оставлен для обратной совместимости, но больше не выполняет никаких действий
  }

  /**
   * Проверить, видим ли баббл
   */
  public getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Показать подсказку под Оракулом или Порталом
   */
  public showHint(parentX: number, parentY: number, parentType: 'oracle' | 'portal' = 'oracle'): void {
    if (this.hintText) {
      // Обновляем позицию существующего текста
      this.updateHintPosition(parentX, parentY, parentType);
      this.hintText.setVisible(true);
      return;
    }

    // Размер шрифта такой же, как у вопроса в баббле
    const fontSize = parseInt(this.questionText.style.fontSize as string) || 16;

    let hintY: number;
    let hintText: string;

    if (parentType === 'oracle') {
      // ✅ Вычисляем нижнюю границу Оракула
      const oracleHeight = SPRITE_SIZES.ORACLE.HEIGHT * BASE_SCALE * ACTOR_SIZES.ORACLE;
      const oracleBottomY = parentY + (oracleHeight / 2);
      hintY = oracleBottomY + HINT_OFFSETS.ORACLE_Y;
      hintText = 'Тапни, чтобы показать/спрятать вопрос';
    } else {
      // ✅ Для портала: вычисляем нижнюю границу портала
      const portalHeight = SPRITE_SIZES.PORTAL.HEIGHT * BASE_SCALE * ACTOR_SIZES.PORTAL;
      const portalBottomY = parentY + (portalHeight / 2);
      hintY = portalBottomY + HINT_OFFSETS.PORTAL_Y;
      hintText = 'Тапни, чтобы показать/спрятать ответ';
    }

    this.hintText = this.scene.add.text(parentX, hintY, hintText, {
      fontSize: `${fontSize}px`,
      fontFamily: DEFAULT_FONT_FAMILY,
      color: BUBBLE_HINT_COLOR, // ✅ Константа из textStyles.ts
      stroke: BUBBLE_HINT_STROKE, // ✅ Константа из textStyles.ts
      strokeThickness: BUBBLE_HINT_STROKE_THICKNESS, // ✅ Константа из textStyles.ts
      align: 'center',
      wordWrap: { width: 400 }
    });
    // ✅ Устанавливаем origin в (0.5, 0) - центр по X, верхняя граница по Y
    this.hintText.setOrigin(0.5, 0);
    this.hintText.setDepth(DEPTHS.SCREEN.QUESTION_BUBBLE); // ✅ Подсказки - самый верхний слой (выше всех объектов, включая Overlay BG)
    this.hintText.setAlpha(0.75); // ✅ Базовая непрозрачность 75
    // ✅ HintText НЕ использует setScrollFactor(0) - он должен следовать за камерой

    // ✅ Устанавливаем разрешение = 1 для пиксельной четкости (как в модальных окнах)
    this.hintText.setResolution(1);

    // ✅ ВАЖНО: Применяем setScale(invZoom) для четкости текста при zoom камеры
    const invZoom = 1 / this.scene.cameras.main.zoom;
    this.hintText.setScale(invZoom);
    logger.log('UI', `✅ Hint text created at Y: ${hintY} for ${parentType}`);

    // ✅ Запускаем циклическую анимацию ping-pong для hintText (75-25)
    this.startHintTextAnimation();
  }

  /**
   * Запустить циклическую анимацию для hintText (75-25 ping-pong)
   */
  private startHintTextAnimation(): void {
    if (!this.hintText) {
      return;
    }

    // Останавливаем предыдущую анимацию, если есть
    if (this.hintTextTween) {
      this.hintTextTween.stop();
      this.hintTextTween = undefined;
    }

    const baseOpacity = 0.75;
    const minOpacity = 0.25;
    const duration = 1500; // 1.5 секунды на один цикл

    // Создаем ping-pong анимацию
    const tweenTarget = { opacity: baseOpacity };

    this.hintTextTween = this.scene.tweens.add({
      targets: tweenTarget,
      opacity: minOpacity,
      duration: duration,
      ease: 'Sine.easeInOut',
      yoyo: true, // ✅ Ping-pong режим
      repeat: -1, // ✅ Бесконечное повторение
      onUpdate: () => {
        if (this.hintText) {
          this.hintText.setAlpha(Math.max(0, Math.min(1, tweenTarget.opacity)));
        }
      }
    });
  }

  /**
   * Обновить позицию подсказки (используется при обновлении позиции баббла)
   */
  public updateHintPosition(parentX: number, parentY: number, parentType: 'oracle' | 'portal' = 'oracle'): void {
    if (!this.hintText) {
      return;
    }

    let hintY: number;

    if (parentType === 'oracle') {
      // ✅ Вычисляем нижнюю границу Оракула
      const oracleHeight = SPRITE_SIZES.ORACLE.HEIGHT * BASE_SCALE * ACTOR_SIZES.ORACLE;
      const oracleBottomY = parentY + (oracleHeight / 2);
      hintY = oracleBottomY + HINT_OFFSETS.ORACLE_Y;
    } else {
      // ✅ Для портала
      const portalHeight = SPRITE_SIZES.PORTAL.HEIGHT * BASE_SCALE * ACTOR_SIZES.PORTAL;
      const portalBottomY = parentY + (portalHeight / 2);
      hintY = portalBottomY + HINT_OFFSETS.PORTAL_Y;
    }

    this.hintText.setPosition(parentX, hintY);
  }

  /**
   * Скрыть подсказку
   */
  public hideHint(): void {
    if (this.hintText) {
      this.hintText.setVisible(false);
    }
  }

  /**
   * Обновить позицию баббла и всех его элементов
   * Используется для позиционирования баббла относительно родительского спрайта (Оракула или портала)
   * @param x Новая X координата центра баббла
   * @param y Новая Y координата центра баббла
   */
  public updatePosition(x: number, y: number): void {
    // ✅ Округляем координаты до целых чисел для pixel-perfect рендеринга
    this.x = Math.round(x);
    this.y = Math.round(y);

    // Обновляем позицию спрайта баббла
    this.bubbleSprite.setPosition(this.x, this.y);

    // Обновляем позицию текста
    // Если есть изображение, текст позиционируется относительно центра с учетом смещения
    if (this.questionImage) {
      const textAreaWidth = this.TEXT_AREA_WIDTH * this.scale;
      const textAreaWidthForText = (textAreaWidth * 3) / 4; // 3/4 ширины для текста
      const textX = Math.round(this.x - (textAreaWidth / 2) + (textAreaWidthForText / 2));
      this.questionText.setX(textX);
      this.questionText.setY(this.y);

      // Обновляем позицию изображения
      const imageAreaWidth = textAreaWidth / 4; // 1/4 ширины для картинки
      const imageX = Math.round(this.x + (textAreaWidth / 2) - (imageAreaWidth / 2));
      this.questionImage.setPosition(imageX, this.y);
    } else {
      // Если нет изображения, текст по центру
      this.questionText.setPosition(this.x, this.y);
    }

    // Обновляем позицию подсказки, если она есть (позиционируется относительно Oracle)
    // Подсказка обновляется через updateHintPosition, так как она зависит от позиции Oracle
    if (this.hintText && this.hintText.visible) {
      // Получаем позицию Oracle из scene (через questionBubble, который хранится в Oracle)
      // Но так как мы не знаем позицию Oracle здесь, обновление будет происходить через showHint
      // при вызове из Oracle.setQuestion()
    }
  }

  /**
   * Получить текущую X координату баббла
   */
  public getX(): number {
    return this.x;
  }

  /**
   * Получить текущую Y координату баббла
   */
  public getY(): number {
    return this.y;
  }

  /**
   * Получить текст подсказки
   */
  public getHintText(): Phaser.GameObjects.Text | undefined {
    return this.hintText;
  }

  /**
   * Получить границы баббла для проверки оверлапов
   */
  public getBounds(): Phaser.Geom.Rectangle {
    const width = this.BUBBLE_WIDTH * this.scale;
    const height = this.BUBBLE_HEIGHT * this.scale;
    return new Phaser.Geom.Rectangle(
      this.x - width / 2,
      this.y - height / 2,
      width,
      height
    );
  }

  /**
   * Уничтожить баббл
   */
  public destroy(): void {
    // Останавливаем анимации, если они есть
    if (this.opacityTween) {
      this.opacityTween.stop();
      this.opacityTween = undefined;
    }
    if (this.hintTextTween) {
      this.hintTextTween.stop();
      this.hintTextTween = undefined;
    }

    this.bubbleSprite.destroy();
    this.questionText.destroy();
    if (this.questionImage) {
      this.questionImage.destroy();
    }
    if (this.hintText) {
      this.hintText.destroy();
    }
    logger.log('UI', '✅ QuestionBubble destroyed');
  }
}

