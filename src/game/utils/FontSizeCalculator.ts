/**
 * Калькулятор размера шрифта с проверкой дефолтного размера
 * Всегда стремится использовать дефолтный размер, уменьшает только если текст не влезает
 */

import Phaser from 'phaser';
import {
  DEFAULT_FONT_FAMILY,
  MIN_FONT_SIZE_TEXT,
  MIN_FONT_SIZE_BUTTON,
  MAX_FONT_SIZE,
  BUTTON_PADDING_BASE_X,
  BUTTON_PADDING_BASE_Y,
  FONT_SIZE_MULTIPLIERS
} from '../../constants/textStyles';
import { calculateModalSize } from '../ui/ModalSizeCalculator';
import { QuizManager } from '../systems/QuizManager';
import { calculatePixelBaseFontSize, calculatePixelButtonFontSize } from './PixelFontCalculator';
import { logger } from '../../utils/Logger';
import { BASE_SCALE } from '../../constants/gameConstants';
import { ASPECT_RATIO_RANGES } from '../ui/ModalSizeCalculator';

export const MAX_OPTIMAL_FONT_SIZE = 48; // Максимальный оптимальный размер (48px × 0.625 = 30px визуально)

/**
* Рассчитывает оптимальный базовый размер шрифта на основе доступной высоты и текста
* Использует бинарный поиск для нахождения максимального размера, который влезает
* @param scene - Phaser сцена для создания временного текстового объекта
* @param availableWidth - доступная ширина для текста
* @param availableHeight - доступная высота для текста
* @param longestText - самый длинный текст, который должен влезть
* @param initialBaseSize - начальный базовый размер (например, blockHeight * 0.6)
* @param maxSize - опциональный максимальный размер (по умолчанию MAX_OPTIMAL_FONT_SIZE)
* @returns оптимальный базовый размер шрифта
*/
export function calculateOptimalBaseFontSize(
  scene: Phaser.Scene,
  availableWidth: number,
  availableHeight: number,
  longestText: string,
  initialBaseSize: number,
  maxSize?: number
): number {
  const maxHeight = availableHeight;
  const effectiveMaxSize = maxSize !== undefined ? maxSize : MAX_OPTIMAL_FONT_SIZE;

  // Проверяем, влезает ли текст с начальным размером
  let tempText = scene.add.text(0, 0, longestText, {
    fontSize: `${initialBaseSize}px`,
    fontFamily: DEFAULT_FONT_FAMILY,
    wordWrap: { width: availableWidth },
    align: 'center'
  });

  // ✅ ВАЖНО: НЕ применяем setScale к временному тексту!
  // Измерения должны быть в виртуальном разрешении БЕЗ учёта zoom

  if (tempText.height <= maxHeight) {
    // Если влезает - используем initialBaseSize, но не больше effectiveMaxSize
    const result = Math.min(MAX_FONT_SIZE, initialBaseSize);
    tempText.destroy();
    logger.log('MODAL_SIZE', `📏 calculateOptimalBaseFontSize: text fits (${tempText.height.toFixed(1)} <= ${maxHeight.toFixed(1)}), using initial: ${result.toFixed(2)}`);
    return Math.max(MIN_FONT_SIZE_TEXT, Math.min(effectiveMaxSize, result));
  }

  tempText.destroy();

  // Если не влезает - используем бинарный поиск для нахождения максимального размера
  // Диапазон поиска: от MIN_FONT_SIZE_TEXT до initialBaseSize
  let minSize = MIN_FONT_SIZE_TEXT;
  let maxSearchSize = Math.min(initialBaseSize, MAX_FONT_SIZE, effectiveMaxSize);
  let optimalSize = minSize;
  const tolerance = 0.5; // Точность поиска (0.5px)

  // Бинарный поиск
  while (maxSearchSize - minSize > tolerance) {
    const testSize = (minSize + maxSearchSize) / 2;

    tempText = scene.add.text(0, 0, longestText, {
      fontSize: `${testSize}px`,
      fontFamily: DEFAULT_FONT_FAMILY,
      wordWrap: { width: availableWidth },
      align: 'center'
    });

    // ✅ ВАЖНО: НЕ применяем setScale к временному тексту!
    // Измерения должны быть в виртуальном разрешении БЕЗ учёта zoom

    if (tempText.height <= maxHeight) {
      // Текст влезает - можно попробовать больший размер
      optimalSize = testSize;
      minSize = testSize;
    } else {
      // Текст не влезает - нужно уменьшить размер
      maxSearchSize = testSize;
    }

    tempText.destroy();
  }

  // Ограничения: минимум MIN_FONT_SIZE_TEXT, максимум effectiveMaxSize
  const clampedSize = Math.max(MIN_FONT_SIZE_TEXT, Math.min(effectiveMaxSize, optimalSize));
  logger.log('MODAL_SIZE', `📏 calculateOptimalBaseFontSize: binary search result: ${clampedSize.toFixed(2)}px (range: ${MIN_FONT_SIZE_TEXT}-${Math.min(initialBaseSize, MAX_FONT_SIZE, effectiveMaxSize).toFixed(2)})`);
  return clampedSize;
}

/**
 * Рассчитывает размер шрифта для вопроса/фидбэка с проверкой дефолтного размера
 * @param scene - Phaser сцена для создания временного текстового объекта
 * @param availableWidth - доступная ширина для текста
 * @param availableHeight - доступная высота для текста
 * @param longestText - самый длинный текст, который должен влезть
 * @param defaultFontSize - дефолтный размер шрифта
 * @param maxLines - максимальное количество строк (по умолчанию 3)
 * @returns размер шрифта (дефолтный, если влезает, или уменьшенный)
 */
export function calculateBaseFontSize(
  scene: Phaser.Scene,
  availableWidth: number,
  availableHeight: number,
  longestText: string,
  defaultFontSize: number,
  maxLines: number = 3
): number {
  // Создаем временный текстовый объект с дефолтным размером
  const tempText = scene.add.text(0, 0, longestText, {
    fontSize: `${defaultFontSize}px`,
    fontFamily: DEFAULT_FONT_FAMILY,
    wordWrap: { width: availableWidth },
    align: 'center'
  });

  // ✅ ВАЖНО: НЕ применяем setScale к временному тексту!
  // И tempText.height, и availableHeight - оба в виртуальном разрешении БЕЗ учёта zoom
  // Измерения должны быть в одной системе координат

  // ✅ Если используем кастомный пиксельный шрифт, используем специальный калькулятор
  if (DEFAULT_FONT_FAMILY === 'PixeloidSans') {
    tempText.destroy();
    return calculatePixelBaseFontSize(scene, availableWidth, availableHeight, longestText);
  }

  // Проверяем, влезает ли текст (100% доступной высоты для максимального использования пространства)
  // Используем всю доступную высоту, а не делим на maxLines
  // maxLines используется только для справки, фактическая высота определяется wordWrap
  const maxHeight = availableHeight; // Используем 100% доступной высоты
  const fits = tempText.height <= maxHeight;

  let finalFontSize: number;

  if (fits) {
    // Если влезает - используем дефолтный размер
    finalFontSize = defaultFontSize;
    logger.log('MODAL_SIZE', `📏 calculateBaseFontSize: text fits (${tempText.height.toFixed(1)} <= ${maxHeight.toFixed(1)}), using default: ${finalFontSize.toFixed(2)}`);
  } else {
    // Если не влезает - уменьшаем пропорционально
    const scaleFactor = maxHeight / tempText.height;
    finalFontSize = defaultFontSize * scaleFactor;
    logger.log('MODAL_SIZE', `📏 calculateBaseFontSize: text doesn't fit (${tempText.height.toFixed(1)} > ${maxHeight.toFixed(1)}), scaleFactor: ${scaleFactor.toFixed(3)}, adjusted: ${finalFontSize.toFixed(2)}`);
  }

  // Уничтожаем временный объект
  tempText.destroy();

  // Ограничения: минимум MIN_FONT_SIZE_TEXT, максимум MAX_FONT_SIZE
  const clampedSize = Math.max(MIN_FONT_SIZE_TEXT, Math.min(MAX_FONT_SIZE, finalFontSize));
  if (clampedSize !== finalFontSize) {
    logger.log('MODAL_SIZE', `📏 calculateBaseFontSize: clamped from ${finalFontSize.toFixed(2)} to ${clampedSize.toFixed(2)}`);
  }
  return clampedSize;
}

/**
 * Рассчитывает размер шрифта для кнопок с проверкой дефолтного размера
 * @param scene - Phaser сцена для создания временного текстового объекта
 * @param availableWidth - доступная ширина для текста (с учётом отступов)
 * @param availableHeight - доступная высота для текста (с учётом отступов)
 * @param longestAnswer - самый длинный ответ, который должен влезть
 * @param defaultFontSize - дефолтный размер шрифта
 * @param minFontSize - минимальный размер шрифта (опционально, по умолчанию MIN_FONT_SIZE_BUTTON)
 * @returns размер шрифта (дефолтный, если влезает, или уменьшенный)
 */
export function calculateButtonFontSize(
  scene: Phaser.Scene,
  availableWidth: number,
  availableHeight: number,
  longestAnswer: string,
  defaultFontSize: number,
  minFontSize?: number
): number {
  // ✅ ВАЖНО: wordWrap.width должен быть доступной шириной для текста (с учётом отступов)
  const wordWrapWidth = availableWidth; // Доступная ширина для текста

  const tempText = scene.add.text(0, 0, longestAnswer, {
    fontSize: `${defaultFontSize}px`,
    fontFamily: DEFAULT_FONT_FAMILY,
    wordWrap: { width: wordWrapWidth },
    align: 'center'
  });

  // ✅ Если используем кастомный пиксельный шрифт, используем специальный калькулятор
  if (DEFAULT_FONT_FAMILY === 'PixeloidSans') {
    tempText.destroy();
    return calculatePixelButtonFontSize(scene, availableWidth, availableHeight, longestAnswer);
  }

  // ✅ УПРОЩЕННАЯ ЛОГИКА: Проверяем, влезает ли текст в кнопку БЕЗ применения setScale
  // Button.ts применяет setScale(invZoom) для ЧЕТКОСТИ, но это визуальный эффект.
  // Проверяем исходную высоту текста с wordWrap (может быть несколько строк)
  const textHeight = tempText.height;
  const maxHeight = availableHeight;

  tempText.destroy();

  // ✅ Если текст влезает в кнопку по высоте - используем MAX_OPTIMAL_FONT_SIZE (40px)
  // Это даёт максимальный размер шрифта для кнопок
  if (textHeight <= maxHeight) {
    logger.log('MODAL_SIZE', `📏 calculateButtonFontSize: text fits (${textHeight.toFixed(1)} <= ${maxHeight.toFixed(1)}), using MAX_OPTIMAL_FONT_SIZE: ${MAX_OPTIMAL_FONT_SIZE}px`);
    return MAX_OPTIMAL_FONT_SIZE;
  }

  // ✅ Если не влезает - уменьшаем пропорционально
  const scaleFactor = maxHeight / textHeight;
  const finalFontSize = defaultFontSize * scaleFactor;
  logger.log('MODAL_SIZE', `📏 calculateButtonFontSize: text doesn't fit (${textHeight.toFixed(1)} > ${maxHeight.toFixed(1)}), scaleFactor: ${scaleFactor.toFixed(3)}, adjusted: ${finalFontSize.toFixed(2)}`);

  // Ограничения: минимум minFontSize (или MIN_FONT_SIZE_BUTTON по умолчанию), максимум MAX_OPTIMAL_FONT_SIZE
  const minSize = minFontSize !== undefined ? minFontSize : MIN_FONT_SIZE_BUTTON;
  const clampedSize = Math.max(minSize, Math.min(MAX_OPTIMAL_FONT_SIZE, finalFontSize));
  if (clampedSize !== finalFontSize) {
    logger.log('MODAL_SIZE', `📏 calculateButtonFontSize: clamped from ${finalFontSize.toFixed(2)} to ${clampedSize.toFixed(2)}`);
  }
  return clampedSize;
}

/**
 * Рассчитывает единый базовый размер шрифта для всех модальных окон
 * Использует логику KeyQuestionModal: размеры модального окна вопросов и longestTexts.question
 * Этот размер должен использоваться во всех модальных окнах (KeyQuestionModal, PortalModal, GameOverModal)
 * 
 * @param scene - Phaser сцена для создания временных объектов
 * @param currentLevel - текущий уровень (по умолчанию 1)
 * @returns единый базовый размер шрифта
 */
export function calculateUnifiedBaseFontSize(
  scene: Phaser.Scene,
  currentLevel: number = 1
): number {
  const cam = scene.cameras.main;

  // ✅ ИСПОЛЬЗУЕМ ТОЧНО КАК В БЭКАПЕ: getBoundingClientRect() для реальных CSS размеров
  // Но с защитой от ошибок (проверяем что canvas существует и имеет метод)
  let canvasWidth: number;
  let canvasHeight: number;

  if (scene.game.canvas && typeof scene.game.canvas.getBoundingClientRect === 'function') {
    const canvasRect = scene.game.canvas.getBoundingClientRect();
    canvasWidth = canvasRect.width;
    canvasHeight = canvasRect.height;
  } else {
    // Fallback: используем scale.width/height
    canvasWidth = scene.scale.width;
    canvasHeight = scene.scale.height;
  }

  // Используем функцию расчета размеров (из бэкапного проекта)
  let modalSize = calculateModalSize(
    cam.width,
    cam.height,
    canvasWidth,
    canvasHeight,
    40 // padding (по умолчанию в бэкапной версии)
  );

  // ✅ ЗАЩИТА ОТ СЛИШКОМ МАЛЕНЬКОГО ОКНА
  if (modalSize.height < 400) {
    logger.warn('MODAL_SIZE', '⚠️ calculateUnifiedBaseFontSize: Modal too small, recalculating with larger padding');
    modalSize = calculateModalSize(cam.width, cam.height, canvasWidth, canvasHeight, 60);
  }

  const modalWidth = modalSize.width;
  const modalHeight = modalSize.height;

  // ✅ ЕДИНОЕ ПОЛЕ ОТСТУПОВ для всех элементов внутри модального окна (как в KeyQuestionModal)
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

  // ✅ ОТСТУП МЕЖДУ ЭЛЕМЕНТАМИ (как в KeyQuestionModal)
  let buttonSpacing = internalPadding / 4;

  // ✅ РАСЧЕТ ОБЛАСТЕЙ: ДЕЛИМ РАБОЧУЮ ОБЛАСТЬ НА 5 РАВНЫХ ЧАСТЕЙ (как в KeyQuestionModal)
  // Всего блоков: 1 (вопрос) + 1 (фидбэк) + 3 (кнопки) = 5
  const totalBlocks = 5;
  const totalSpacings = totalBlocks - 1; // 4 отступа

  // Высота одного блока (с учетом отступов)
  const blockHeight = (contentAreaHeight - (totalSpacings * buttonSpacing)) / totalBlocks;

  // Высота области вопроса (как в KeyQuestionModal)
  const questionAreaHeight = blockHeight;

  // ✅ РАСЧЕТ ЕДИНОГО БАЗОВОГО РАЗМЕРА ШРИФТА (как в KeyQuestionModal)
  // Получаем quizManager и текущий уровень
  const quizManager = scene.data.get('quizManager') as QuizManager | undefined;

  // Получаем самый длинный текст
  let longestTexts;
  if (quizManager) {
    longestTexts = quizManager.getLongestTexts(currentLevel);
  } else {
    // Fallback: используем дефолтные значения (как в KeyQuestionModal)
    logger.warn('MODAL_SIZE', '⚠️ calculateUnifiedBaseFontSize: QuizManager not found, using default longest texts');
    longestTexts = {
      question: 'Какая планета известна как \'Красная планета\'?',
      answer: 'Кошка говорит мяу! Она маукает, мяунькает! Намяукивает!',
      feedback: 'Правильно! Кошка говорит \'Мяу\'! Ты прям ваще красава! Угадал про кошку!',
      maxLength: 76
    };
  }

  // ✅ ОПТИМИЗИРОВАННЫЙ РАСЧЕТ БАЗОВОГО РАЗМЕРА (как в KeyQuestionModal)
  // ✅ ИСПРАВЛЕНИЕ: Используем САМЫЙ ДЛИННЫЙ текст среди всех типов (question, answer, feedback)
  // Это гарантирует, что даже самый длинный текст любого типа влезет в блоки
  const longestText = longestTexts.question.length >= longestTexts.answer.length
    ? (longestTexts.question.length >= longestTexts.feedback.length ? longestTexts.question : longestTexts.feedback)
    : (longestTexts.answer.length >= longestTexts.feedback.length ? longestTexts.answer : longestTexts.feedback);

  // Сначала рассчитываем начальный размер на основе высоты блока
  const initialBaseSize = blockHeight * 0.65; // 65% от высоты блока (верхняя граница для поиска)

  // Затем оптимизируем его на основе реальной высоты самого длинного текста (из всех типов)
  const optimizedBaseSize = calculateOptimalBaseFontSize(
    scene,
    contentAreaWidth,
    questionAreaHeight,
    longestText, // ✅ Используем самый длинный из question/answer/feedback
    initialBaseSize
  );

  logger.log('MODAL_SIZE', '🔍 calculateUnifiedBaseFontSize: Unified base font size calculation:');
  logger.log('MODAL_SIZE', `  modalWidth: ${modalWidth}, modalHeight: ${modalHeight}`);
  logger.log('MODAL_SIZE', `  blockHeight: ${blockHeight.toFixed(1)}`);
  logger.log('MODAL_SIZE', `  longestTexts lengths: Q=${longestTexts.question.length}, A=${longestTexts.answer.length}, F=${longestTexts.feedback.length}`);
  logger.log('MODAL_SIZE', `  longestText: "${longestText.substring(0, 30)}..." (${longestText.length} chars)`);
  logger.log('MODAL_SIZE', `  initialBaseSize (blockHeight * 0.65): ${initialBaseSize.toFixed(2)}px`);
  logger.log('MODAL_SIZE', `  optimizedBaseSize: ${optimizedBaseSize.toFixed(2)}px`);
  logger.log('MODAL_SIZE', `  unifiedBaseFontSize (final): ${optimizedBaseSize.toFixed(2)}px`);

  return optimizedBaseSize;
}

/**
 * Вычисляет адаптивные отступы для кнопок
 *
 * Базовые отступы в пикселях исходной графики масштабируются через BASE_SCALE.
 *
 * @param buttonWidth - ширина кнопки в виртуальных пикселях
 * @param buttonHeight - высота кнопки в виртуальных пикселях
 * @returns объект с paddingX, paddingY, availableWidth, availableHeight
 */
export function getButtonPadding(buttonWidth: number, buttonHeight: number): {
  paddingX: number;
  paddingY: number;
  availableWidth: number;
  availableHeight: number;
} {
  // Базовые отступы из пикселей исходной графики (масштабируем через BASE_SCALE)
  const paddingX = BUTTON_PADDING_BASE_X * BASE_SCALE; // 3 * 4 = 12px
  const paddingY = BUTTON_PADDING_BASE_Y * BASE_SCALE; // 2 * 4 = 8px

  return {
    paddingX: paddingX,
    paddingY: paddingY,
    availableWidth: buttonWidth - paddingX * 2,
    availableHeight: buttonHeight - paddingY * 2
  };
}

/**
 * Возвращает множитель размера шрифта для заданного соотношения сторон экрана
 *
 * Использует систему 7 диапазонов aspect ratio для выбора оптимального множителя.
 * Меньшие множители для узких экранов позволяют вместить больше текста.
 *
 * @param screenAR - соотношение сторон экрана (canvasWidth / canvasHeight)
 * @returns множитель размера шрифта (от 1.0 до 1.3)
 */
export function getFontSizeMultiplier(screenAR: number): number {
  // Находим соответствующий диапазон aspect ratio
  const range = ASPECT_RATIO_RANGES.find(r =>
    screenAR >= r.minAR && screenAR < r.maxAR
  );

  if (range && range.name in FONT_SIZE_MULTIPLIERS) {
    const multiplier = FONT_SIZE_MULTIPLIERS[range.name as keyof typeof FONT_SIZE_MULTIPLIERS];
    logger.log('MODAL_SIZE', `🎯 FontSize: ${range.displayName} | screenAR=${screenAR.toFixed(2)} | multiplier=${multiplier.toFixed(2)} (${range.name})`);
    return multiplier;
  }

  // Fallback: используем стандартный множитель
  logger.log('MODAL_SIZE', `🎯 FontSize: ❌ Fallback | screenAR=${screenAR.toFixed(2)} | multiplier=1.3`);
  return 1.3;
}

/**
 * Логирует текущий диапазон aspect ratio для заданного размера экрана
 * Полезно для отладки при изменении размера окна — показывает, какой тип модального окна будет использован
 *
 * @param canvasWidth - ширина canvas в CSS-пикселях
 * @param canvasHeight - высота canvas в CSS-пикселях
 * @param source - источник вызова (например, "resize", "init", "manual")
 */
export function logAspectRatioRange(canvasWidth: number, canvasHeight: number, source: string = 'unknown'): void {
  const screenAR = canvasWidth / canvasHeight;

  // Находим соответствующий диапазон
  const range = ASPECT_RATIO_RANGES.find(r =>
    screenAR >= r.minAR && screenAR < r.maxAR
  );

  if (range) {
    const multiplier = FONT_SIZE_MULTIPLIERS[range.name as keyof typeof FONT_SIZE_MULTIPLIERS];
    logger.log('VIEWPORT_RESIZE', `🎯 ASPECT RANGE: ${range.displayName} | canvas=${canvasWidth}×${canvasHeight} | screenAR=${screenAR.toFixed(2)} | modalAR=${range.aspectRatio.toFixed(2)} | font×${multiplier.toFixed(2)} | [${source}]`);
  } else {
    logger.log('VIEWPORT_RESIZE', `⚠️ ASPECT RANGE: Unknown | canvas=${canvasWidth}×${canvasHeight} | screenAR=${screenAR.toFixed(2)} | [${source}]`);
  }
}

