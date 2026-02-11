/**
 * Класс кнопки с управлением состояниями
 * Используется для всех кнопок в игре
 */

import Phaser from 'phaser';
import {
  DEFAULT_FONT_FAMILY,
  BUTTON_DEFAULT_FONT_SIZE_MULTIPLIER,
  BUTTON_DEFAULT_FONT_STYLE,
  BUTTON_FEEDBACK_FONT_SIZE,
  BUTTON_FEEDBACK_FONT_STYLE,
  BUTTON_TEXT_COLOR,
  BUTTON_FEEDBACK_COLOR
} from '../../constants/textStyles';
import { logger } from '../../utils/Logger';
import { AB_TESTING } from '../../config/gameConfig';
import { NineSliceBackground } from './NineSliceBackground';


export enum ButtonState {
  NORMAL = 'normal',        // Обычное состояние
  HOVER = 'hover',          // Наведение мыши
  ACTIVE = 'active',        // Активная (нажата)
  DISABLED = 'disabled',    // Неактивная (отключена)
  BLINKING = 'blinking',    // Мигающая (для правильного ответа)
  WRONG = 'wrong',          // Неправильный ответ (с wrongFeedback)
  CORRECT = 'correct'       // Правильный ответ (для подтверждения)
}

export interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize?: number; // Добавлено для адаптивного размера шрифта
  wordWrap?: { width: number }; // ✅ Добавлено для переноса строки
  align?: 'left' | 'center' | 'right'; // ✅ Добавлено для выравнивания текста
  onClick?: () => void;
  initialState?: ButtonState;
}

export class Button {
  private scene: Phaser.Scene;
  private config: ButtonConfig;
  private state: ButtonState;
  private background!: Phaser.GameObjects.Rectangle | NineSliceBackground; // Инициализируется в конструкторе через createUI
  private text!: Phaser.GameObjects.Text; // Инициализируется в конструкторе через createUI
  private feedbackText?: Phaser.GameObjects.Text;
  private isInteractive: boolean = true;
  private blinkTween?: Phaser.Tweens.Tween;
  private glowBackground?: Phaser.GameObjects.Graphics; // ✅ Слой свечения (Graphics)


  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    this.scene = scene;
    this.config = config;
    this.state = config.initialState || ButtonState.NORMAL;

    // ✅ Убедимся, что сцена имеет активный input
    if (!scene.input) {
      logger.warn('BUTTON_EVENTS', 'Button: Scene input not available');
      return;
    }

    // Создаем фон кнопки
    if (AB_TESTING.USE_NINE_SLICE_BUTTON) {
      this.background = new NineSliceBackground(
        scene,
        config.x,
        config.y,
        Math.round(config.width),
        Math.round(config.height),
        'ui_dialog_button',
        5, // Размер плитки для кнопок
        true // useStretch: true для кнопок
      ).setDepth(1002);

      // ✅ Настраиваем интерактивность для контейнера явно
      (this.background as NineSliceBackground).setupInteractive();

      // Применяем начальный цвет через тинт
      // Для Normal состояния используем белый цвет (без тинта), чтобы оставить оригинальный цвет ассета
      const tintColor = this.state === ButtonState.NORMAL ? 0xffffff : this.getColorForState(this.state);
      (this.background as NineSliceBackground).setTint(tintColor);
    } else {
      this.background = scene.add.rectangle(
        config.x,
        config.y,
        config.width,
        config.height,
        this.getColorForState(this.state)
      ).setOrigin(0.5, 0.5) // ✅ Устанавливаем origin в центр
        .setScrollFactor(0)
        .setDepth(1002);

      // ✅ Создаем интерактивность для прямоугольника
      this.background.setInteractive({
        useHandCursor: true
      });
    }

    // Устанавливаем курсор для 9-slice отдельно
    if (this.background instanceof NineSliceBackground && this.background.input) {
      this.background.input.cursor = 'pointer';
    }

    logger.log('BUTTON_EVENTS', `Button created: "${config.text}" at (${config.x}, ${config.y}), size: ${config.width}x${config.height}, depth: 1002`);

    // ✅ Создаем текст кнопки - работает в виртуальном разрешении 720×1280
    // ✅ Используем константы из textSizes.ts
    // ✅ ВАЖНО: fontSize должен быть передан с учетом setScale(invZoom)
    // Вызывающий код (KeyQuestionModal) отвечает за правильный расчет
    const fontSize = config.fontSize || config.height * BUTTON_DEFAULT_FONT_SIZE_MULTIPLIER;
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: `${Math.round(fontSize)}px`, // ✅ Размер с компенсацией setScale
      fontFamily: DEFAULT_FONT_FAMILY, // ✅ Используем Nunito
      color: BUTTON_TEXT_COLOR, // ✅ Используем константу
      fontStyle: BUTTON_DEFAULT_FONT_STYLE, // ✅ Используем константу
      align: config.align || 'center' // ✅ Выравнивание текста
    };

    // ✅ Добавляем wordWrap если указан
    // ✅ ИСПРАВЛЕНИЕ: НЕ умножаем на zoom! setScale(invZoom) ниже компенсирует масштаб
    // wordWrap.width должен быть в виртуальном разрешении БЕЗ zoom, как fontSize
    if (config.wordWrap) {
      const wordWrapConfig = config.wordWrap as any;

      textStyle.wordWrap = {
        width: config.wordWrap.width, // ✅ БЕЗ умножения на zoom!
        useAdvancedWrap: wordWrapConfig.useAdvancedWrap,
        callback: wordWrapConfig.callback,
        callbackScope: wordWrapConfig.callbackScope
      };
    }

    // ✅ Округляем координаты до целых пикселей для предотвращения размытия
    const textX = Math.round(config.x);
    const textY = Math.round(config.y);

    this.text = scene.add.text(
      textX,
      textY,
      config.text,
      textStyle
    ).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(1003);

    // ✅ FIX BLUR: Принудительное выравнивание координат текста по пиксельной сетке
    // Если ширина/высота текста нечетная, центрирование (0.5) приведет к дробным координатам углов
    // Мы сдвигаем объект так, чтобы верхний левый угол был в целых координатах
    if (this.text.displayWidth % 2 !== 0) {
      this.text.x -= 0.5;
    }
    if (this.text.displayHeight % 2 !== 0) {
      this.text.y -= 0.5;
    }

    // ✅ Устанавливаем разрешение = 1 для пиксельного шрифта
    const textResolution = 1;
    this.text.setResolution(textResolution);

    // ✅ ВАЖНО: Применяем setScale(invZoom) для четкости текста при zoom камеры
    // invZoom = 1/1.6 = 0.625, что дает визуальный размер fontSize * 0.625
    const invZoom = 1 / this.scene.cameras.main.zoom;
    this.text.setScale(invZoom);

    // ✅ Обработчики событий - используем только pointerup для избежания двойного вызова
    // ✅ Флаг как свойство класса для правильной работы между событиями
    let clickProcessed = false; // ✅ Флаг для предотвращения двойного вызова
    let pointerDownTime = 0; // ✅ Время нажатия для проверки длительности

    this.background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      logger.log('BUTTON_EVENTS', `Button pointerdown: ${config.text}, state: ${this.state}, interactive: ${this.isInteractive}`);
      clickProcessed = false; // Сбрасываем флаг при нажатии
      pointerDownTime = this.scene.time.now; // ✅ Сохраняем время нажатия
    });

    this.background.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      logger.log('BUTTON_EVENTS', `Button pointerup: ${config.text}, state: ${this.state}, interactive: ${this.isInteractive}`);

      // ✅ ПРИОРИТЕТНАЯ проверка: если кнопка отключена, игнорируем клик
      if (this.state === ButtonState.DISABLED) {
        logger.warn('BUTTON_EVENTS', `Button: Click ignored - button is DISABLED (${config.text})`);
        return;
      }

      // ✅ Проверяем флаг для предотвращения двойного вызова
      if (clickProcessed) {
        logger.log('BUTTON_EVENTS', `Button: Click already processed, ignoring (${config.text})`);
        return;
      }

      // ✅ Проверяем интерактивность
      if (!this.isInteractive) {
        logger.warn('BUTTON_EVENTS', `Button: Click ignored - button is not interactive (${config.text})`);
        return;
      }

      // ✅ Проверяем, что между pointerdown и pointerup прошло достаточно времени (минимум 30мс)
      // Уменьшено с 50мс до 30мс для более отзывчивого интерфейса
      const clickDuration = this.scene.time.now - pointerDownTime;
      if (clickDuration < 30) {
        logger.log('BUTTON_EVENTS', `Button: Click too fast, ignoring (duration: ${clickDuration}ms, button: ${config.text})`);
        return;
      }

      // ✅ Проверяем, что pointerdown был на этой же кнопке
      // Это предотвращает случайные клики при перетаскивании между элементами
      if (pointerDownTime === 0) {
        logger.log('BUTTON_EVENTS', `Button: No pointerdown event recorded, ignoring (${config.text})`);
        return;
      }

      // ✅ Устанавливаем флаг ПЕРЕД вызовом handleClick
      clickProcessed = true;
      logger.log('BUTTON_EVENTS', `Button: Calling handleClick from pointerup for: ${config.text}`);

      try {
        this.handleClick();
      } catch (error) {
        logger.log('BUTTON_EVENTS', '❌ Button: Error in handleClick', error);
        // ✅ При ошибке сбрасываем флаг, чтобы можно было попробовать снова
        clickProcessed = false;
      }

      // ✅ Сбрасываем флаг через небольшую задержку для следующего клика
      this.scene.time.delayedCall(300, () => {
        clickProcessed = false;
        pointerDownTime = 0; // ✅ Сбрасываем время нажатия
      });
    });

    // Hover эффекты только для десктопа (без логирования для чистоты консоли)
    this.background.on('pointerover', () => {
      // logger.log('BUTTON_EVENTS', `Button pointerover: ${config.text}`); // ✅ v7 - Отключено для уменьшения спама
      if (this.isInteractive && this.state === ButtonState.NORMAL) {
        this.setState(ButtonState.HOVER);
      }
    });

    this.background.on('pointerout', () => {
      if (this.state === ButtonState.HOVER) {
        this.setState(ButtonState.NORMAL);
      }
    });
  }



  private getColorForState(state: ButtonState): number {
    switch (state) {
      case ButtonState.NORMAL:
        return 0x4a5568; // Серый
      case ButtonState.HOVER:
        return 0x718096; // Светло-серый
      case ButtonState.ACTIVE:
        return 0x38a169; // Зеленый
      case ButtonState.DISABLED:
        return 0x2d3748; // Темно-серый
      case ButtonState.BLINKING:
        return 0x48bb78; // Ярко-зеленый
      case ButtonState.WRONG:
        return 0xe53e3e; // Красный
      case ButtonState.CORRECT:
        return 0x48c774; // Зеленый
      default:
        return 0x4a5568;
    }
  }

  public setState(newState: ButtonState): void {
    if (this.state === newState) return;

    // Останавливаем предыдущую анимацию
    if (this.blinkTween) {
      this.blinkTween.stop();
      this.blinkTween = undefined;
    }
    // ✅ Скрываем свечение, если оно было
    if (this.glowBackground) {
      this.glowBackground.setAlpha(0);
    }

    // ✅ Сбрасываем тинт/альфу при смене состояния
    if (this.state === ButtonState.BLINKING && newState !== ButtonState.BLINKING) {
      // Цвет будет сброшен ниже через setTint/setFillStyle, здесь спец действия не нужны
    }

    this.state = newState;

    // ✅ FIX: Для состояния BLINKING базовый фон должен оставаться NORMAL (серый/белый),
    // чтобы эффект свечения (Glow) был виден поверх него.
    // Если и база и свечение зеленые, кнопка просто выглядит сплошной зеленой.
    const visualState = (this.state === ButtonState.BLINKING) ? ButtonState.NORMAL : this.state;
    const color = this.getColorForState(visualState);

    if (this.background instanceof Phaser.GameObjects.Rectangle) {
      this.background.setFillStyle(color);
    } else if (this.background instanceof NineSliceBackground) {
      // Для Normal состояния используем белый цвет (без тинта), чтобы оставить оригинальный цвет ассета
      const tintColor = visualState === ButtonState.NORMAL ? 0xffffff : color;
      this.background.setTint(tintColor);
    }

    // Специальная обработка для мигания
    if (newState === ButtonState.BLINKING) {
      this.startBlinking();
    } else {
      this.background.setAlpha(1);
    }

    // Обновляем интерактивность
    this.isInteractive = newState !== ButtonState.DISABLED;

    // ✅ Если кнопка отключена, отключаем интерактивность спрайта
    if (newState === ButtonState.DISABLED) {
      this.background.disableInteractive();
      logger.log('BUTTON_EVENTS', `Button: Disabled interactive for button: ${this.config.text}`);
    } else {
      // ✅ Если кнопка активна, включаем интерактивность
      this.background.setInteractive();
    }
  }

  /**
   * ✅ Создать слой свечения для мигания
   * Клонирует текущий фон и настраивает его для эффекта Glow
   */

  private createGlowBackground(): void {
    if (this.glowBackground) this.glowBackground.destroy();

    const w = this.config.width;
    const h = this.config.height;

    // Свечение должно быть точно по размеру кнопки
    const padding = 0;

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffaa00, 1); // Золотисто-оранжевый
    graphics.fillRect(0, 0, w, h); // ✅ Убраны закругления углов (было fillRoundedRect)

    this.glowBackground = graphics;

    const glowX = this.config.x - w / 2;
    const glowY = this.config.y - h / 2;

    this.glowBackground.setPosition(glowX, glowY);
    this.glowBackground.setAlpha(0); // Скрыт по умолчанию
    this.glowBackground.setScrollFactor(0); // Привязываем к камере (UI)

    // ✅ ВАЖНО: Если кнопка находится в контейнере, свечение тоже нужно добавить в контейнер!
    if (this.background.parentContainer) {
      this.background.parentContainer.add(this.glowBackground);
      // Сортировка: помещаем свечение ПОВЕРХ кнопки (Overlay)
      this.background.parentContainer.moveAbove(this.glowBackground, this.background as unknown as Phaser.GameObjects.GameObject);
    } else {
      // Если контейнера нет,
      this.glowBackground.setDepth(this.background.depth + 1);
    }

    // Применяем BlendMode для свечения (ADD - для яркости)
    this.glowBackground.setBlendMode(Phaser.BlendModes.ADD);
  }

  public startBlinking(): void {
    if (this.blinkTween) {
      this.blinkTween.remove();
      this.blinkTween = undefined;
    }

    // Если свечения нет, создаем
    if (!this.glowBackground || !this.glowBackground.scene) {
      this.createGlowBackground();
    }

    // ✅ Убеждаемся, что база непрозрачна
    this.background.setAlpha(1);
    // И сбрасываем тинт базы на всякий случай
    if (this.background instanceof NineSliceBackground) {
      this.background.clearTint();
    }


    if (!this.glowBackground) return;

    // ✅ Яркая пульсация для Graphics (ADD blend mode делает ярко даже на темном фоне)
    this.blinkTween = this.scene.tweens.add({
      targets: this.glowBackground,
      alpha: { from: 0, to: 0.8 }, // Высокая яркость
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    logger.log('EVENT_BUS', `startBlinking (Graphics) started for button: ${this.config.text}`);
  }

  private handleClick(): void {
    logger.log('BUTTON_EVENTS', `Button handleClick called for: ${this.config.text}`);

    // Воспроизводим звук клика, если AudioManager доступен
    const audioManager = this.scene.data.get('audioManager');
    if (audioManager && typeof audioManager.playButtonClick === 'function') {
      audioManager.playButtonClick();
    }

    if (this.config.onClick) {
      logger.log('BUTTON_EVENTS', `Button: Executing onClick callback (${this.config.text})`);
      try {
        this.config.onClick();
        logger.log('BUTTON_EVENTS', `Button: onClick callback executed successfully (${this.config.text})`);
      } catch (error) {
        logger.log('BUTTON_EVENTS', '❌ Button: Error executing onClick callback', error);
      }
    } else {
      logger.warn('BUTTON_EVENTS', `Button: onClick callback is undefined for: ${this.config.text}`);
    }
  }

  public setText(text: string): void {
    // ✅ При обновлении текста wordWrap и align уже установлены при создании
    // Просто обновляем текст - Phaser сохраняет стиль
    this.text.setText(text);

    // ✅ Убедимся, что текст остается центрированным
    this.text.setOrigin(0.5, 0.5);
  }

  public setFeedback(feedback: string): void {
    // ✅ Старый метод - оставляем для обратной совместимости
    // Но теперь feedback показывается через setText() в самой кнопке
    if (!this.feedbackText) {
      this.feedbackText = this.scene.add.text(
        this.config.x,
        this.config.y + this.config.height / 2 + 10,
        feedback,
        {
          fontSize: `${Math.round(BUTTON_FEEDBACK_FONT_SIZE)}px`, // ✅ Используем константу (округлено)
          fontFamily: DEFAULT_FONT_FAMILY, // ✅ Используем Nunito
          color: BUTTON_FEEDBACK_COLOR, // ✅ Используем константу
          fontStyle: BUTTON_FEEDBACK_FONT_STYLE, // ✅ Используем константу
          wordWrap: { width: this.config.width - 20 }
        }
      ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(this.background.depth + 1);
    } else {
      this.feedbackText.setText(feedback);
      this.feedbackText.setVisible(true);
    }
  }

  public hideFeedback(): void {
    if (this.feedbackText) {
      this.feedbackText.setVisible(false);
    }
  }

  public getState(): ButtonState {
    return this.state;
  }

  public destroy(): void {
    if (this.blinkTween) {
      this.blinkTween.stop();
    }
    this.background.destroy();
    if (this.glowBackground) { // ✅ Очистка
      this.glowBackground.destroy();
    }
    this.text.destroy();
    if (this.feedbackText) {
      this.feedbackText.destroy();
    }
  }

  public setVisible(visible: boolean): void {
    this.background.setVisible(visible);
    if (this.glowBackground) { // ✅ Видимость
      this.glowBackground.setVisible(visible);
    }
    this.text.setVisible(visible);
    if (this.feedbackText) {
      this.feedbackText.setVisible(visible);
    }
  }

  public setDepth(depth: number): void {
    this.background.setDepth(depth);
    if (this.glowBackground) { // ✅ Глубина
      this.glowBackground.setDepth(depth + 1); // Свечение чуть выше фона (Graphics Overlay)
      // В createGlowBackground мы делаем moveAbove, так что порядок в контейнере важнее.
      // Но если без контейнера, то depth важен.
    }
    this.text.setDepth(depth + 2); // Текст всегда выше всех
    if (this.feedbackText) {
      this.feedbackText.setDepth(depth + 2);
    }
  }
}

