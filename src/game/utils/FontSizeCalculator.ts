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
  FONT_SIZE_MULTIPLIERS,
  COIN_BUBBLE_FONT_MULTIPLIERS,
  MODAL_FONT_MULTIPLIERS,
  KEY_QUESTION_MODAL_MAX_FONT_SIZE,
  PORTAL_MODAL_MAX_FONT_SIZE,
  GAMEOVER_MODAL_MAX_FONT_SIZE
} from '../../constants/textStyles';
import { calculateModalSize } from '../ui/ModalSizeCalculator';
import { QuizManager } from '../systems/QuizManager';
import { calculatePixelBaseFontSize, calculatePixelButtonFontSize } from './PixelFontCalculator';
import { logger } from '../../utils/Logger';
import { BASE_SCALE } from '../../constants/gameConstants';
import { ASPECT_RATIO_RANGES } from '../ui/ModalSizeCalculator';

export const MAX_OPTIMAL_FONT_SIZE = 48; // ✅ Максимальный оптимальный размер (был 125, возвращено к 48)

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
  minFontSize?: number,
  fontFamily?: string,
  fontStyle?: string
): number {
  // ✅ ВАЖНО: wordWrap.width должен быть доступной шириной для текста (с учётом отступов)
  const wordWrapWidth = availableWidth; // Доступная ширина для текста
  const maxHeight = availableHeight;

  // ✅ КРИТИЧЕСКОЕ: Вычисляем invZoom для применения setScale к временному тексту
  const invZoom = 1 / scene.cameras.main.zoom;

  // ✅ Используем переданные fontFamily/fontStyle или значения по умолчанию
  const useFontFamily = fontFamily || DEFAULT_FONT_FAMILY;
  const useFontStyle = fontStyle || '';

  // ✅ Если используем кастомный пиксельный шрифт, используем специальный калькулятор
  if (DEFAULT_FONT_FAMILY === 'PixeloidSans') {
    return calculatePixelButtonFontSize(scene, availableWidth, availableHeight, longestAnswer);
  }

  // ✅ Ограничение: максимум 3 строки текста в блоке
  const MAX_LINES = 3;

  // ✅ КРИТИЧЕСКОЕ: wordWrap.width работает в нативных координатах текста (до scale)
  // Чтобы displayWidth совпадал с availableWidth: nativeWidth = availableWidth / invZoom
  // Идентично тому, как KeyQuestionModal создаёт реальный текст: blockAvailableWidth / invZoom
  const nativeWrapWidth = wordWrapWidth / invZoom;

  // ✅ Конфигурация шрифта для temp-текстов (идентична реальному тексту)
  const textConfig = {
    fontFamily: useFontFamily,
    fontStyle: useFontStyle,
    wordWrap: { width: nativeWrapWidth },
    align: 'center' as const,
    lineSpacing: 0
  };

  // ✅ Проверяем с MAX_OPTIMAL_FONT_SIZE (48px) — быстрая проверка
  const tempTextMax = scene.add.text(0, 0, longestAnswer, {
    ...textConfig,
    fontSize: `${MAX_OPTIMAL_FONT_SIZE}px`,
  });

  tempTextMax.setScale(invZoom);
  const maxTextHeight = tempTextMax.displayHeight;
  const maxTextLines = tempTextMax.getWrappedText().length;
  tempTextMax.destroy();

  // ✅ Если влезает с MAX_OPTIMAL_FONT_SIZE И не больше MAX_LINES строк
  if (maxTextHeight <= maxHeight && maxTextLines <= MAX_LINES) {
    logger.log('MODAL_SIZE', `📏 calculateButtonFontSize: text fits with MAX (h=${maxTextHeight.toFixed(1)}≤${maxHeight.toFixed(1)}, lines=${maxTextLines}≤${MAX_LINES}), using ${MAX_OPTIMAL_FONT_SIZE}px [font: ${useFontFamily} ${useFontStyle}]`);
    return MAX_OPTIMAL_FONT_SIZE;
  }

  // ✅ Бинарный поиск максимального размера с ограничением по высоте И числу строк
  const minSize = minFontSize !== undefined ? minFontSize : MIN_FONT_SIZE_BUTTON;
  let low = minSize;
  let high = MAX_OPTIMAL_FONT_SIZE;
  let optimalSize = low;
  const tolerance = 0.5;

  // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ
  logger.log('MODAL_SIZE', `📏 calculateButtonFontSize DEBUG:`);
  logger.log('MODAL_SIZE', `  Text: "${longestAnswer.substring(0, 30)}${longestAnswer.length > 30 ? '...' : ''}" (${longestAnswer.length} chars)`);
  logger.log('MODAL_SIZE', `  Params: wrapWidth=${wordWrapWidth.toFixed(1)}px, nativeWrap=${nativeWrapWidth.toFixed(1)}px, maxH=${maxHeight.toFixed(1)}px, invZoom=${invZoom.toFixed(3)}, maxLines=${MAX_LINES}, font="${useFontFamily} ${useFontStyle}"`);

  while (high - low > tolerance) {
    const testSize = (low + high) / 2;

    const tempText = scene.add.text(0, 0, longestAnswer, {
      ...textConfig,
      fontSize: `${testSize}px`,
    });

    tempText.setScale(invZoom);
    const testHeight = tempText.displayHeight;
    const testLines = tempText.getWrappedText().length;
    tempText.destroy();

    if (testHeight <= maxHeight && testLines <= MAX_LINES) {
      // Текст влезает и не больше MAX_LINES строк — пробуем больший размер
      optimalSize = testSize;
      low = testSize;
    } else {
      // Текст не влезает или слишком много строк — уменьшаем
      high = testSize;
    }
  }

  // Ограничения: минимум minSize, максимум MAX_OPTIMAL_FONT_SIZE
  const clampedSize = Math.max(minSize, Math.min(MAX_OPTIMAL_FONT_SIZE, optimalSize));
  logger.log('MODAL_SIZE', `📏 calculateButtonFontSize: binary search result: ${clampedSize.toFixed(2)}px (range: ${minSize}-${MAX_OPTIMAL_FONT_SIZE})`);
  if (clampedSize !== optimalSize) {
    logger.log('MODAL_SIZE', `📏 calculateButtonFontSize: clamped from ${optimalSize.toFixed(2)} to ${clampedSize.toFixed(2)}`);
  }
  return clampedSize;
}

/**
 * Уровневая система размера шрифта (Tiered Font Logic).
 * 4 уровня: A (1 строка, крупнейший) → B (2 строки) → C (3 строки) → D (4 строки, мелкий).
 *
 * Размер A: 20 символов "M" влезают в availableWidth (динамический расчёт).
 * Размеры B/C/D: ограничены высотой для соответствующего числа строк.
 * Все размеры динамические — зависят от фактической ширины/высоты поля (7 размеров экрана).
 *
 * @param scene - Phaser сцена
 * @param availableWidth - доступная ширина поля (display-координаты, после padding)
 * @param availableHeight - доступная высота поля (display-координаты, после padding)
 * @param longestText - самый длинный текст, который должен влезть
 * @param fontFamily - семейство шрифта (идентично реальному тексту)
 * @param fontStyle - стиль шрифта (идентично реальному тексту)
 * @returns выбранный размер шрифта (в px, нативный — до setScale)
 */
export function calculateTieredFontSize(
  scene: Phaser.Scene,
  availableWidth: number,
  availableHeight: number,
  longestText: string,
  fontFamily?: string,
  fontStyle?: string
): number {
  const invZoom = 1 / scene.cameras.main.zoom;
  const nativeWrapWidth = availableWidth / invZoom;
  const useFontFamily = fontFamily || DEFAULT_FONT_FAMILY;
  const useFontStyle = fontStyle || '';

  // --- Шаг 1: Измерение метрик шрифта при эталонном размере ---
  const REF_SIZE = 48;
  const CHARS_FOR_SIZE_A = 20;

  const refText = scene.add.text(0, 0, 'M'.repeat(CHARS_FOR_SIZE_A), {
    fontSize: `${REF_SIZE}px`,
    fontFamily: useFontFamily,
    fontStyle: useFontStyle,
  });
  refText.setScale(invZoom);
  const refDisplayWidth = refText.displayWidth;
  const refDisplayHeight = refText.displayHeight;
  refText.destroy();

  // Пропорция: displayHeight на 1px fontSize
  const heightPerFontPx = refDisplayHeight / REF_SIZE;

  // --- Шаг 2: Вычисление размеров A, B, C, D ---
  // Size A: 20 "M" = availableWidth (ограничение по ширине + 1 строка высоты + MAX)
  // ✅ FIX: Для очень коротких текстов (менее 20 символов) позволяем шрифту быть больше
  // Если текст короткий (например, 10 символов), используем фактическую длину для расчета
  const effectiveChars = Math.max(longestText.length, 10); // Минимум 10 символов для расчета ширины
  const widthRatio = availableWidth / (effectiveChars * (refDisplayWidth / CHARS_FOR_SIZE_A));

  const sizeA_byWidth = REF_SIZE * widthRatio;
  const sizeA_byHeight = availableHeight / (1 * heightPerFontPx);

  // ✅ Allow slightly larger font than MAX_OPTIMAL_FONT_SIZE if text is very short and fits
  const sizeA = Math.min(sizeA_byWidth, sizeA_byHeight, MAX_OPTIMAL_FONT_SIZE);

  // Size B/C/D/E/F: ограничены высотой для N строк, гарантированно ≤ A
  const sizeB = Math.min(availableHeight / (2 * heightPerFontPx), sizeA);
  const sizeC = Math.min(availableHeight / (3 * heightPerFontPx), sizeA);
  const sizeD = Math.min(availableHeight / (4 * heightPerFontPx), sizeA);
  const sizeE = Math.min(availableHeight / (5 * heightPerFontPx), sizeA);
  const sizeF = Math.min(availableHeight / (6 * heightPerFontPx), sizeA);

  const tiers = [
    { name: 'A', fontSize: sizeA, maxLines: 1 },
    { name: 'B', fontSize: sizeB, maxLines: 2 },
    { name: 'C', fontSize: sizeC, maxLines: 3 },
    { name: 'D', fontSize: sizeD, maxLines: 4 },
    { name: 'E', fontSize: sizeE, maxLines: 5 },
    { name: 'F', fontSize: sizeF, maxLines: 6 },
  ];

  logger.log('MODAL_SIZE', `📏 TieredFont: A=${sizeA.toFixed(1)} B=${sizeB.toFixed(1)} C=${sizeC.toFixed(1)} D=${sizeD.toFixed(1)} E=${sizeE.toFixed(1)} F=${sizeF.toFixed(1)} | w=${availableWidth.toFixed(0)} h=${availableHeight.toFixed(0)} | "${longestText.substring(0, 25)}..." (${longestText.length}ch) [${useFontFamily} ${useFontStyle}]`);

  // --- Шаг 3: Проверяем каждый уровень с реальным текстом ---
  for (const tier of tiers) {
    if (tier.fontSize < MIN_FONT_SIZE_BUTTON) continue;

    const tempText = scene.add.text(0, 0, longestText, {
      fontSize: `${tier.fontSize}px`,
      fontFamily: useFontFamily,
      fontStyle: useFontStyle,
      wordWrap: { width: nativeWrapWidth },
      align: 'center',
      lineSpacing: 0,
    });
    tempText.setScale(invZoom);
    const lines = tempText.getWrappedText().length;
    const height = tempText.displayHeight;
    tempText.destroy();

    if (lines <= tier.maxLines && height <= availableHeight) {
      logger.log('MODAL_SIZE', `📏 TieredFont → ${tier.name}: ${tier.fontSize.toFixed(1)}px (lines=${lines}/${tier.maxLines}, h=${height.toFixed(1)}/${availableHeight.toFixed(1)})`);
      return tier.fontSize;
    }
  }

  // Fallback: F (с клампом до минимума)
  const fallback = Math.max(sizeF, MIN_FONT_SIZE_BUTTON);
  logger.warn('MODAL_SIZE', `📏 TieredFont → FALLBACK: ${fallback.toFixed(1)}px (текст не влезает ни в один уровень)`);
  return fallback;
}

/** Средняя ширина символа относительно fontSize для sans-serif (кириллица) */
export const CHAR_WIDTH_RATIO_SANS = 0.45;
/** Средняя ширина символа относительно fontSize для monospace */
export const CHAR_WIDTH_RATIO_MONO = 0.50;
/** Коэффициент межстрочного интервала (используется для оценки высоты строки) */
const LINE_HEIGHT_RATIO = 1.55;

/**
 * Симуляция пословного переноса строк (как делает Phaser wordWrap).
 *
 * Phaser переносит по словам, а не по символам. Если слово не помещается
 * в оставшееся место строки, оно целиком переносится на следующую.
 * Простая формула ceil(textLen / charsPerLine) даёт заниженный результат
 * при наличии длинных слов.
 *
 * @param text — текст для симуляции
 * @param charsPerLine — макс. количество символов в строке
 * @returns количество строк
 */
function simulateWordWrapLines(text: string, charsPerLine: number): number {
  if (charsPerLine <= 0) return 999;
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 1;

  let lines = 1;
  let currentLineChars = 0;

  for (const word of words) {
    const wordLen = word.length;

    if (currentLineChars === 0) {
      // Начало строки — слово всегда ставится (даже если длиннее charsPerLine)
      currentLineChars = wordLen;
    } else {
      // +1 за пробел между словами
      const neededWithSpace = currentLineChars + 1 + wordLen;
      if (neededWithSpace <= charsPerLine) {
        // Помещается в текущую строку
        currentLineChars = neededWithSpace;
      } else {
        // Не помещается — перенос на новую строку
        lines++;
        currentLineChars = wordLen;
      }
    }
  }

  return lines;
}

/**
 * Находит МАКСИМАЛЬНЫЙ fontSize, при котором текст (с пословным wordWrap)
 * полностью помещается в блок заданных размеров.
 *
 * Без ограничения по количеству строк — шрифт автоматически адаптируется:
 * - На широком экране: мало строк → крупный шрифт
 * - На узком экране: больше строк → шрифт чуть меньше, но максимально возможный
 *
 * Использует бинарный поиск для эффективности.
 *
 * @param fieldWidth  — ширина текстового поля (нативные px)
 * @param fieldHeight — высота текстового поля (нативные px)
 * @param longestText — самый длинный текст (строка, для wordWrap-симуляции)
 * @param charWidthRatio — средняя ширина символа / fontSize
 * @param maxSize — опциональный максимальный размер шрифта (по умолчанию MAX_OPTIMAL_FONT_SIZE)
 * @returns fontSize (px)
 */
export function calculateTieredFontSizeSimple(
  fieldWidth: number,
  fieldHeight: number,
  longestText: string,
  charWidthRatio: number = CHAR_WIDTH_RATIO_SANS,
  maxSize?: number
): number {
  // Бинарный поиск: максимальный fontSize, при котором текст влезает
  const effectiveMaxSize = maxSize ?? MAX_OPTIMAL_FONT_SIZE;
  let lo = MIN_FONT_SIZE_BUTTON;
  let hi = Math.min(fieldHeight, effectiveMaxSize);
  let bestSize = lo;

  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    const charsPerLine = Math.floor(fieldWidth / (mid * charWidthRatio));

    if (charsPerLine <= 0) {
      hi = mid;
      continue;
    }

    const lines = simulateWordWrapLines(longestText, charsPerLine);
    const totalHeight = lines * mid * LINE_HEIGHT_RATIO;

    if (totalHeight <= fieldHeight) {
      bestSize = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  bestSize = Math.min(bestSize, effectiveMaxSize);

  const charsPerLine = Math.floor(fieldWidth / (bestSize * charWidthRatio));
  const lines = charsPerLine > 0 ? simulateWordWrapLines(longestText, charsPerLine) : 1;

  logger.log('MODAL_SIZE', `📏 FontAuto: ${bestSize.toFixed(1)}px, ${lines} строк (charsPerLine=${charsPerLine}, textLen=${longestText.length}, fieldW=${fieldWidth.toFixed(0)}, fieldH=${fieldHeight.toFixed(0)})`);

  return bestSize;
}

/**
 * Находит МАКСИМАЛЬНЫЙ fontSize, при котором текст (с пословным wordWrap)
 * полностью помещается в блок заданных размеров.
 *
 * Специальная версия для PortalModal (копия calculateTieredFontSizeSimple),
 * чтобы можно было настраивать логику независимо от KeyQuestionModal.
 *
 * @param fieldWidth  — ширина текстового поля (нативные px)
 * @param fieldHeight — высота текстового поля (нативные px)
 * @param longestText — самый длинный текст (строка, для wordWrap-симуляции)
 * @param charWidthRatio — средняя ширина символа / fontSize
 * @returns fontSize (px)
 */
export function calculatePortalTieredFontSize(
  fieldWidth: number,
  fieldHeight: number,
  longestText: string,
  charWidthRatio: number = CHAR_WIDTH_RATIO_SANS
): number {
  // Бинарный поиск: максимальный fontSize, при котором текст влезает
  const effectiveMaxSize = PORTAL_MODAL_MAX_FONT_SIZE;
  let lo = MIN_FONT_SIZE_BUTTON;
  let hi = Math.min(fieldHeight, effectiveMaxSize);
  let bestSize = lo;

  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    const charsPerLine = Math.floor(fieldWidth / (mid * charWidthRatio));

    if (charsPerLine <= 0) {
      hi = mid;
      continue;
    }

    const lines = simulateWordWrapLines(longestText, charsPerLine);
    const totalHeight = lines * mid * LINE_HEIGHT_RATIO;

    if (totalHeight <= fieldHeight) {
      bestSize = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  bestSize = Math.min(bestSize, effectiveMaxSize);

  const charsPerLine = Math.floor(fieldWidth / (bestSize * charWidthRatio));
  const lines = charsPerLine > 0 ? simulateWordWrapLines(longestText, charsPerLine) : 1;

  logger.log('MODAL_SIZE', `📏 PortalFont (Independent): ${bestSize.toFixed(1)}px, ${lines} lines (charsPerLine=${charsPerLine}, textLen=${longestText.length}, fieldW=${fieldWidth.toFixed(0)}, fieldH=${fieldHeight.toFixed(0)})`);

  return bestSize;
}

/**
 * Находит МАКСИМАЛЬНЫЙ fontSize для текстовых блоков GameOverModal.
 *
 * Специальная версия для GameOverModal (копия calculateTieredFontSizeSimple),
 * чтобы можно было настраивать логику независимо.
 *
 * @param fieldWidth  — ширина текстового поля (нативные px)
 * @param fieldHeight — высота текстового поля (нативные px)
 * @param longestText — самый длинный текст (строка, для wordWrap-симуляции)
 * @param charWidthRatio — средняя ширина символа / fontSize
 * @returns fontSize (px)
 */
export function calculateGameOverTieredFontSize(
  fieldWidth: number,
  fieldHeight: number,
  longestText: string,
  charWidthRatio: number = CHAR_WIDTH_RATIO_SANS
): number {
  // Бинарный поиск: максимальный fontSize, при котором текст влезает
  const effectiveMaxSize = GAMEOVER_MODAL_MAX_FONT_SIZE;
  let lo = MIN_FONT_SIZE_BUTTON;
  let hi = Math.min(fieldHeight, effectiveMaxSize);
  let bestSize = lo;

  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    const charsPerLine = Math.floor(fieldWidth / (mid * charWidthRatio));

    if (charsPerLine <= 0) {
      hi = mid;
      continue;
    }

    const lines = simulateWordWrapLines(longestText, charsPerLine);
    const totalHeight = lines * mid * LINE_HEIGHT_RATIO;

    if (totalHeight <= fieldHeight) {
      bestSize = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  bestSize = Math.min(bestSize, effectiveMaxSize);

  const charsPerLine = Math.floor(fieldWidth / (bestSize * charWidthRatio));
  const lines = charsPerLine > 0 ? simulateWordWrapLines(longestText, charsPerLine) : 1;

  logger.log('MODAL_SIZE', `📏 GameOverFont (Independent): ${bestSize.toFixed(1)}px, ${lines} lines (charsPerLine=${charsPerLine}, textLen=${longestText.length}, fieldW=${fieldWidth.toFixed(0)}, fieldH=${fieldHeight.toFixed(0)})`);

  return bestSize;
}

/**
 * Находит МАКСИМАЛЬНЫЙ fontSize для текстовых блоков PortalModal.
 *
 * Идентична calculateTieredFontSizeSimple, но выделена отдельно для
 * возможной независимой модификации в будущем.
 *
 * @param fieldWidth  — ширина текстового поля (нативные px)
 * @param fieldHeight — высота текстового поля (нативные px)
 * @param longestText — самый длинный текст (строка, для wordWrap-симуляции)
 * @param charWidthRatio — средняя ширина символа / fontSize
 * @returns fontSize (px)
 */
export function calculatePortalFontSize(
  fieldWidth: number,
  fieldHeight: number,
  longestText: string,
  charWidthRatio: number = CHAR_WIDTH_RATIO_SANS
): number {
  // Бинарный поиск: максимальный fontSize, при котором текст влезает
  let lo = MIN_FONT_SIZE_BUTTON;
  let hi = Math.min(fieldHeight, MAX_OPTIMAL_FONT_SIZE);
  let bestSize = lo;

  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    const charsPerLine = Math.floor(fieldWidth / (mid * charWidthRatio));

    if (charsPerLine <= 0) {
      hi = mid;
      continue;
    }

    const lines = simulateWordWrapLines(longestText, charsPerLine);
    const totalHeight = lines * mid * LINE_HEIGHT_RATIO;

    if (totalHeight <= fieldHeight) {
      bestSize = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  bestSize = Math.min(bestSize, MAX_OPTIMAL_FONT_SIZE);

  const charsPerLine = Math.floor(fieldWidth / (bestSize * charWidthRatio));
  const lines = charsPerLine > 0 ? simulateWordWrapLines(longestText, charsPerLine) : 1;

  logger.log('MODAL_SIZE', `📏 PortalFont: ${bestSize.toFixed(1)}px, ${lines} строк (charsPerLine=${charsPerLine}, textLen=${longestText.length}, fieldW=${fieldWidth.toFixed(0)}, fieldH=${fieldHeight.toFixed(0)})`);

  return bestSize;
}

/**
 * Рассчитывает единый базовый размер шрифта для всех модальных окон
 * Использует логику KeyQuestionModal: размеры модального окна вопросов и longestTexts.question
 *
 * ⚠️ **ЗАРЕЗЕРВИРОВАНО (v3 Tiered Font System):**
 * Эта функция НЕ ИСПОЛЬЗУЕТСЯ в текущей системе. Модальные окна теперь используют
 * `calculateTieredFontSizeSimple` напрямую с бинарным поиском.
 * Функция оставлена для обратной совместимости и возможного будущего использования.
 *
 * @param scene - Phaser сцена для создания временных объектов
 * @param currentLevel - текущий уровень (по умолчанию 1)
 * @param customLongestTexts - (Опционально) Переданные данные о самых длинных текстах (например, из KeyQuestionModal)
 * @returns единый базовый размер шрифта
 * @deprecated Используйте calculateTieredFontSizeSimple для v3 Tiered Font System
 */
export function calculateUnifiedBaseFontSize(
  scene: Phaser.Scene,
  currentLevel: number = 1,
  customLongestTexts?: { question: string, answer: string, feedback: string }
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

  if (customLongestTexts) {
    // ✅ Если переданы кастомные тексты (из KeyQuestionModal) - используем их приоритетно
    longestTexts = customLongestTexts;
    logger.log('MODAL_SIZE', '✅ calculateUnifiedBaseFontSize: Using provided customLongestTexts');
  } else if (quizManager) {
    // Если есть QuizManager - берем из него (синхронно, если кешировано, или дефолт)
    // ⚠️ ВАЖНО: getLongestTexts должен быть синхронным или мы должны ждать data loading
    // Но QuizManager сейчас асинхронный. Поэтому лучше передавать customLongestTexts извне.
    // Если метод асинхронный, здесь мы не можем его вызвать без await.
    // Поэтому fallback на константы, если customLongestTexts не переданы.
    logger.warn('MODAL_SIZE', '⚠️ calculateUnifiedBaseFontSize: customLongestTexts not provided, quizManager is async. Falling back to default constants or cached values if available.');

    // Попытка получить из кеша, если реализуем синхронный геттер. Пока fallback.
    longestTexts = {
      question: 'Какая планета известна как \'Красная планета\'?',
      answer: 'Кошка говорит мяу! Она маукает, мяунькает! Намяукивает!',
      feedback: 'Правильно! Кошка говорит \'Мяу\'! Ты прям ваще красава! Угадал про кошку!',
      maxLength: 76
    };
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
  // ✅ ИСПРАВЛЕНИЕ: Используем САМЫЙ ДЛИННЫЙ текст СРЕДИ ВСЕХ ТИПОВ (question, answer, feedback)
  // Это гарантирует, что даже самый длинный текст любого типа влезет в блоки
  const longestText = longestTexts.question.length >= longestTexts.answer.length && longestTexts.question.length >= longestTexts.feedback.length
    ? longestTexts.question
    : longestTexts.answer.length >= longestTexts.feedback.length
      ? longestTexts.answer
      : longestTexts.feedback;

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
 * ✅ Получает множитель для модальных окон (KeyQuestionModal, PortalModal, GameOverModal)
 * Для больших экранов использует уменьшенные множители из MODAL_FONT_MULTIPLIERS
 *
 * @param screenAR - aspect ratio экрана (canvasWidth / canvasHeight)
 * @returns множитель для модальных окон
 */
export function getModalFontMultiplier(screenAR: number): number {
  // Находим соответствующий диапазон aspect ratio
  const range = ASPECT_RATIO_RANGES.find(r =>
    screenAR >= r.minAR && screenAR < r.maxAR
  );

  // Сначала проверяем модальные множители
  if (range && range.name in MODAL_FONT_MULTIPLIERS) {
    const multiplier = MODAL_FONT_MULTIPLIERS[range.name as keyof typeof MODAL_FONT_MULTIPLIERS];
    logger.log('MODAL_SIZE', `🎯 Modal: ${range.displayName} | screenAR=${screenAR.toFixed(2)} | multiplier=${multiplier.toFixed(2)} (${range.name})`);
    return multiplier;
  }

  // Fallback на базовые множители
  if (range && range.name in FONT_SIZE_MULTIPLIERS) {
    const multiplier = FONT_SIZE_MULTIPLIERS[range.name as keyof typeof FONT_SIZE_MULTIPLIERS];
    logger.log('MODAL_SIZE', `🎯 Modal (fallback): ${range.displayName} | screenAR=${screenAR.toFixed(2)} | multiplier=${multiplier.toFixed(2)} (${range.name})`);
    return multiplier;
  }

  // Fallback на случай, если диапазон не найден
  logger.log('MODAL_SIZE', `🎯 Modal: ❌ Fallback | screenAR=${screenAR.toFixed(2)} | multiplier=1.0`);
  return 1.0;
}

/**
 * ✅ Получает множитель для бабблов монеток (CoinBubbleQuiz)
 * Сначала проверяет COIN_BUBBLE_FONT_MULTIPLIERS, затем fallback на FONT_SIZE_MULTIPLIERS
 *
 * @param screenAR - aspect ratio экрана (canvasWidth / canvasHeight)
 * @returns множитель для бабблов
 */
export function getCoinBubbleFontMultiplier(screenAR: number): number {
  // Находим соответствующий диапазон aspect ratio
  const range = ASPECT_RATIO_RANGES.find(r =>
    screenAR >= r.minAR && screenAR < r.maxAR
  );

  // Используем множители для бабблов
  if (range && range.name in COIN_BUBBLE_FONT_MULTIPLIERS) {
    const multiplier = COIN_BUBBLE_FONT_MULTIPLIERS[range.name as keyof typeof COIN_BUBBLE_FONT_MULTIPLIERS];
    logger.log('MODAL_SIZE', `🎯 CoinBubble: ${range.displayName} | screenAR=${screenAR.toFixed(2)} | multiplier=${multiplier.toFixed(2)} (${range.name})`);
    return multiplier;
  }

  // Fallback для бабблов — используем общие множители (теперь они правильные из бэкапа)
  if (range && range.name in FONT_SIZE_MULTIPLIERS) {
    const multiplier = FONT_SIZE_MULTIPLIERS[range.name as keyof typeof FONT_SIZE_MULTIPLIERS];
    logger.log('MODAL_SIZE', `🎯 CoinBubble (fallback): ${range.displayName} | screenAR=${screenAR.toFixed(2)} | multiplier=${multiplier.toFixed(2)} (${range.name})`);
    return multiplier;
  }

  // Fallback на случай, если диапазон не найден
  logger.log('MODAL_SIZE', `🎯 CoinBubble: ❌ Fallback | screenAR=${screenAR.toFixed(2)} | multiplier=1.3`);
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

