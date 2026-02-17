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
  MODAL_FONT_MULTIPLIERS
} from '../../constants/textStyles';
import { calculateModalSize } from '../ui/ModalSizeCalculator';
import { QuizManager } from '../systems/QuizManager';
import { calculatePixelBaseFontSize, calculatePixelButtonFontSize } from './PixelFontCalculator';
import { logger } from '../../utils/Logger';
import { getCanvasDimensions } from './CanvasDimensions';
import { ASPECT_RATIO_RANGES } from './AspectRatioRanges';

export const MAX_OPTIMAL_FONT_SIZE = 48; // Максимальный оптимальный размер (48px × 0.625 = 30px визуально)

/**
 * Рассчитывает оптимальный базовый размер шрифта
 * Сначала проверяет дефолтный размер, уменьшает только если текст не влезает
 *
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
    // Текст влезает - можно попробовать больший размер
    tempText.destroy();
    const result = Math.min(MAX_FONT_SIZE, initialBaseSize);
    logger.log('MODAL_SIZE', `📏 calculateOptimalBaseFontSize: text fits (${tempText.height.toFixed(1)} <= ${maxHeight.toFixed(1)}), using initial: ${result.toFixed(2)}px`);
    return result;
  }

  // Текст не влезает - используем бинарный поиск для нахождения максимального размера
  // Диапазон поиска: от MIN_FONT_SIZE_TEXT до initialBaseSize
  let minSize = MIN_FONT_SIZE_TEXT;
  let maxSearchSize = Math.min(initialBaseSize, MAX_FONT_SIZE, effectiveMaxSize);
  let optimalSize = minSize;

  // Бинарный поиск
  const tolerance = 0.5; // Точность поиска (0.5px)

  while (maxSearchSize - minSize > tolerance) {
    const testSize = (minSize + maxSearchSize) / 2;

    tempText = scene.add.text(0, 0, longestText, {
      fontSize: `${testSize}px`,
      fontFamily: DEFAULT_FONT_FAMILY,
      wordWrap: { width: availableWidth },
      align: 'center'
    });

    // ✅ ВАЖНО: НЕ применяем setScale к временному тексту!
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
 * Рассчитывает множитель для шрифтов модальных окон
 * Сначала проверяет MODAL_FONT_MULTIPLIERS, затем fallback на FONT_SIZE_MULTIPLIERS
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
 * Рассчитывает множитель для бабблов монеток (CoinBubbleQuiz)
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

  // Fallback для бабблов — используем общие множители
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
 * Рассчитывает множитель для кнопок
 *
 * @param screenAR - aspect ratio экрана (canvasWidth / canvasHeight)
 * @returns множитель для кнопок
 */
export function getFontSizeMultiplier(screenAR: number): number {
  const range = ASPECT_RATIO_RANGES.find(r =>
    screenAR >= r.minAR && screenAR < r.maxAR
  );

  if (range && range.name in FONT_SIZE_MULTIPLIERS) {
    const multiplier = FONT_SIZE_MULTIPLIERS[range.name as keyof typeof FONT_SIZE_MULTIPLIERS];
    return multiplier;
  }

  return 1.0;
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
