/**
 * Утилита для расчета позиции баббла сообщения
 * Правила позиционирования:
 * - По X: месседж баббл всегда посередине Оракула/портала
 * - По Y: месседж баббл своей нижней границей совпадает с верхней границей Оракула/портала
 */

import { BASE_SCALE, ACTOR_SIZES, BUBBLE_SIZES, SPRITE_SIZES } from '../../constants/gameConstants';

export type BubbleType = 'oracle' | 'portal';

/**
 * Вычислить позицию Y баббла относительно спрайта
 * Правило: нижняя граница баббла совпадает с верхней границей спрайта
 * @param spriteY Y координата центра спрайта (Оракула или портала)
 * @param bubbleType Тип баббла ('oracle' или 'portal')
 * @param spriteType Тип спрайта ('oracle' или 'portal')
 * @returns Y координата центра баббла
 */
export function calculateBubbleY(
    spriteY: number,
    bubbleType: BubbleType,
    spriteType: BubbleType
): number {
    // Размеры спрайта (базовые, до масштабирования)
    const spriteSize = spriteType === 'oracle' ? SPRITE_SIZES.ORACLE : SPRITE_SIZES.PORTAL;
    const spriteScale = BASE_SCALE * (spriteType === 'oracle' ? ACTOR_SIZES.ORACLE : ACTOR_SIZES.PORTAL);
    const spriteFinalHeight = spriteSize.HEIGHT * spriteScale;
    
    // Размеры баббла (базовые, до масштабирования)
    const bubbleSize = bubbleType === 'oracle' ? BUBBLE_SIZES.ORACLE : BUBBLE_SIZES.PORTAL;
    const bubbleScale = BASE_SCALE * ACTOR_SIZES.QUESTION_BUBBLE;
    const bubbleFinalHeight = bubbleSize.HEIGHT * bubbleScale;
    
    // Верхняя граница спрайта (spriteY - это центр спрайта с origin 0.5)
    const spriteTop = spriteY - (spriteFinalHeight / 2);
    
    // Нижняя граница баббла должна совпадать с верхней границей спрайта
    // Центр баббла = нижняя граница - (высота / 2)
    const bubbleY = spriteTop - (bubbleFinalHeight / 2);
    
    return bubbleY;
}
















