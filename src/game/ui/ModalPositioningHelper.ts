/**
 * ModalPositioningHelper - Утилиты для позиционирования модальных окон
 *
 * Выносит общие функции Grid Snapping, используемые в нескольких модальных окнах.
 * НЕ меняет логику расчёта размеров - только позиционирование.
 */

import { BASE_SCALE } from '../../constants/gameConstants';

/**
 * Округляет значение до кратного BASE_SCALE (4 виртуальных пикселя)
 * Используется для координат элементов.
 *
 * Пример: val=5 → 4, val=6 → 8
 *
 * @param val - Значение для округления
 * @param baseScale - Множитель масштабирования (по умолчанию BASE_SCALE=4)
 * @returns Округлённое значение, кратное baseScale
 */
export const snapToGrid = (val: number, baseScale: number = BASE_SCALE): number => {
  return Math.round(val / baseScale) * baseScale;
};

/**
 * Округляет значение до кратного 2*BASE_SCALE (8 виртуальных пикселей)
 * Используется для размеров элементов, чтобы половина размера тоже попадала в сетку.
 *
 * Пример: val=10 → 8, val=12 → 16
 *
 * @param val - Значение для округления
 * @param baseScale - Множитель масштабирования (по умолчанию BASE_SCALE=4)
 * @returns Округлённое значение, кратное 2*baseScale
 */
export const snapToGridDouble = (val: number, baseScale: number = BASE_SCALE): number => {
  return Math.round(val / (baseScale * 2)) * (baseScale * 2);
};

/**
 * Типы для типизации позиций модальных окон
 */
export interface ModalPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Создаёт объект позиции с округлёнными координатами
 *
 * @param x - Координата X (не округлена)
 * @param y - Координата Y (не округлена)
 * @param width - Ширина (не округлена)
 * @param height - Высота (не округлена)
 * @param baseScale - Множитель масштабирования
 * @returns Позиция с округлёнными значениями
 */
export const createSnappedPosition = (
  x: number,
  y: number,
  width: number,
  height: number,
  baseScale: number = BASE_SCALE
): ModalPosition => {
  return {
    x: snapToGrid(x, baseScale),
    y: snapToGrid(y, baseScale),
    width: snapToGridDouble(width, baseScale),
    height: snapToGridDouble(height, baseScale)
  };
};

/**
 * Проверяет, что значение кратно заданному шагу сетки
 *
 * @param val - Проверяемое значение
 * @param step - Шаг сетки (по умолчанию BASE_SCALE)
 * @returns true, если значение кратно шагу
 */
export const isGridAligned = (val: number, step: number = BASE_SCALE): boolean => {
  return Math.abs(val % step) < 0.001; // Учёт плавающей погрешности
};
