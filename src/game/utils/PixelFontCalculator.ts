/**
 * Калькулятор размера шрифта специально для PixeloidSans
 * Обеспечивает строгое соответствие пиксельной сетке игры
 */

import Phaser from 'phaser';
import { DEFAULT_FONT_FAMILY, MIN_FONT_SIZE_TEXT, MIN_FONT_SIZE_BUTTON, MAX_FONT_SIZE } from '../../constants/textStyles';
import { logger } from '../../utils/Logger';

// Базовый размер пикселя шрифта PixeloidSans = 9px
// Глобальный масштаб игры BASE_SCALE = 4.0
// Идеальный размер шрифта = 9 * 2 = 18px (по просьбе пользователя уменьшили в 2 раза)
const TARGET_PIXEL_FONT_SIZE = 18;
const FALLBACK_PIXEL_FONT_SIZE = 9; // Половинный размер, если совсем не влезает (хотя 9px это очень мало)

/**
 * Рассчитывает размер шрифта для PixeloidSans, стремясь к 36px
 */
export function calculatePixelBaseFontSize(
    scene: Phaser.Scene,
    availableWidth: number,
    availableHeight: number,
    text: string
): number {
    // 1. Пробуем идеальный размер (36px)
    const idealSize = TARGET_PIXEL_FONT_SIZE;
    const tempText = scene.add.text(0, 0, text, {
        fontSize: `${idealSize}px`,
        fontFamily: DEFAULT_FONT_FAMILY,
        wordWrap: { width: availableWidth },
        align: 'center'
    });

    const fitsIdeal = tempText.height <= availableHeight;

    if (fitsIdeal) {
        logger.log('PIXEL_FONT', `  👾 PixelFontCalculator: Text fits at ideal size ${idealSize}px`);
        tempText.destroy();
        return idealSize;
    }

    // ✅ FORCE 36px: User prefers pixel consistency over fit
    console.warn(`  ⚠️ PixelFontCalculator: Text DOES NOT FIT at ${idealSize}px, but FORCING it to match pixel grid.`);
    // Log details for debugging
    logger.log('PIXEL_FONT', `    Height: ${tempText.height.toFixed(1)} > ${availableHeight.toFixed(1)}`);
    tempText.destroy();
    return idealSize;

    /* FALLBACK REMOVED
    // 2. Если не влезает, пробуем половинный размер (18px)
    const fallbackSize = FALLBACK_PIXEL_FONT_SIZE;
    const tempTextFallback = scene.add.text(0, 0, text, {
        fontSize: `${fallbackSize}px`,
        fontFamily: DEFAULT_FONT_FAMILY,
        wordWrap: { width: availableWidth },
        align: 'center'
    });

    const fitsFallback = tempTextFallback.height <= availableHeight;
    tempTextFallback.destroy();

    if (fitsFallback) {
        console.warn(`  Warning PixelFontCalculator: Text DOES NOT FIT at ${idealSize}px, using fallback ${fallbackSize}px`);
        return fallbackSize;
    }

    // 3. Если даже 18px не влезает, возвращаем минимальный (но это уже будет выглядеть плохо)
    console.error(`  Error PixelFontCalculator: Text DOES NOT FIT even at ${fallbackSize}px! Returning min ${MIN_FONT_SIZE_TEXT}px`);
    return MIN_FONT_SIZE_TEXT;
    */
}

/**
 * Рассчитывает размер шрифта кнопки для PixeloidSans
 */
export function calculatePixelButtonFontSize(
    scene: Phaser.Scene,
    buttonWidth: number,
    buttonHeight: number,
    text: string
): number {
    // Логика та же - стремимся к 36px, но для кнопок может быть критичнее высота
    // Обычно кнопки имеют фиксированную высоту.
    // TARGET_PIXEL_FONT_SIZE (36px) может быть слишком большим для кнопки высотой 40px (с паддингами)
    // Проверим, влезает ли 36px в высоту кнопки

    // 1. Пробуем идеальный размер (36px)
    const idealSize = TARGET_PIXEL_FONT_SIZE;
    const tempText = scene.add.text(0, 0, text, {
        fontSize: `${idealSize}px`,
        fontFamily: DEFAULT_FONT_FAMILY,
        wordWrap: { width: buttonWidth * 0.9 }, // Паддинг 10%
        align: 'center'
    });

    const fitsIdeal = tempText.height <= buttonHeight && tempText.width <= buttonWidth * 0.95;

    if (fitsIdeal) {
        logger.log('PIXEL_FONT', `  👾 PixelFontCalculator (Button): Text fits at ideal size ${idealSize}px`);
        tempText.destroy();
        return idealSize;
    }

    // ✅ FORCE 36px
    console.warn(`  ⚠️ PixelFontCalculator (Button): Text DOES NOT FIT at ${idealSize}px, but FORCING it.`);
    logger.log('PIXEL_FONT', `    Height: ${tempText.height.toFixed(1)} > ${buttonHeight.toFixed(1)} OR Width: ${tempText.width.toFixed(1)} > ${(buttonWidth * 0.95).toFixed(1)}`);
    tempText.destroy();
    return idealSize;

    /* FALLBACK REMOVED
    // 2. Пробуем половинный размер (18px)
    const fallbackSize = FALLBACK_PIXEL_FONT_SIZE;
    const tempTextFallback = scene.add.text(0, 0, text, {
        fontSize: `${fallbackSize}px`,
        fontFamily: DEFAULT_FONT_FAMILY,
        wordWrap: { width: buttonWidth * 0.9 },
        align: 'center'
    });

    const fitsFallback = tempTextFallback.height <= buttonHeight && tempTextFallback.width <= buttonWidth * 0.95;
    tempTextFallback.destroy();

    if (fitsFallback) {
        logger.log('PIXEL_FONT', `  👾 PixelFontCalculator (Button): Using fallback size ${fallbackSize}px`);
        return fallbackSize;
    }

    console.warn(`  Warning PixelFontCalculator (Button): Text DOES NOT FIT even at ${fallbackSize}px! Returning min ${MIN_FONT_SIZE_BUTTON}px`);
    return MIN_FONT_SIZE_BUTTON;
    */
}
