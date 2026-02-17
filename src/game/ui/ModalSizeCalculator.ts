/**
 * Рассчитывает безопасный размер модального окна, гарантируя, что оно:
 * - помещается в видимую область canvas,
 * - учитывает паддинги,
 * - использует адаптивный aspect ratio на основе 7 диапазонов,
 * - работает при любом соотношении сторон экрана.
 *
 * === СИСТЕМА 7 ДИАПАЗОНОВ ASPECT RATIO ===
 *
 * Вместо бинарной системы (portrait/landscape) используется 7 адаптивных диапазонов
 * для более точной подстройки под различные экраны:
 *
 * | Диапазон | screenAR | Aspect Ratio | Описание |
 * |----------|-----------|--------------|----------|
 * | 1. Ultra Narrow | 0.25 – 0.45 | 0.35 | Экстремально узкие (тестирование) |
 * | 2. Extra Narrow | 0.45 – 0.6 | 0.525 | Очень узкие (foldable phones) |
 * | 3. Mobile Narrow | 0.6 – 0.75 | 0.60 | Узкие мобильные (iPhone SE) |
 * | 4. Mobile Standard | 0.75 – 1.0 | 0.75 | Стандартные мобильные портрет |
 * | 5. Tablet/Square | 1.0 – 1.3 | 0.85 | Планшеты, почти квадратные |
 * | 6. Monitor Small | 1.3 – 1.6 | 0.95 | Небольшие мониторы |
 * | 7. Monitor Large | 1.6+ | 1.0 | Большие мониторы (квадрат) |
 *
 * Не зависит от `window`, работает полностью внутри Phaser, использует фактический размер canvas.
 *
 * @param cameraWidth  — ширина камеры (виртуальные пиксели, например 2560)
 * @param cameraHeight — высота камеры (виртуальные пиксели, фиксировано 1280)
 * @param canvasWidth  — реальная ширина canvas в CSS-пикселях (например, 1920)
 * @param canvasHeight — реальная высота canvas в CSS-пикселях (например, 1080)
 * @param padding      — отступы от краёв (в виртуальных пикселях, по умолчанию 40)
 * @returns { width, height, x, y } в виртуальных координатах камеры
 */

import { logger } from '../../utils/Logger';
import { FONT_SIZE_MULTIPLIERS } from '../../constants/textStyles';

/**
 * Интерфейс для диапазона aspect ratio
 */
interface AspectRatioRange {
  name: string;           // Название для логов (короткий ID)
  displayName: string;    // Понятное название для отображения
  minAR: number;          // Минимальное соотношение экрана (screenAR)
  maxAR: number;          // Максимальное соотношение экрана (screenAR)
  aspectRatio: number;    // Aspect ratio модального окна
}

// ==================== ИМЕНОВАННЫЕ КОНСТАНТЫ ДИАПАЗОНОВ ====================
// Используются для удобного обращения к конкретным диапазонам в коде

/** Диапазон 0: Экстремально узкие экраны (тестирование пограничных состояний) */
const ULTRA_NARROW: AspectRatioRange = {
  name: 'ULTRA_NARROW',
  displayName: '📱 Ultra Narrow',
  minAR: 0.25,  // Минимальный реалистичный AR
  maxAR: 0.45,
  aspectRatio: 0.35  // Экстремально узкое модальное окно
};

/** Диапазон 1: Очень узкие (foldable phones, unconventional devices) */
const EXTRA_NARROW: AspectRatioRange = {
  name: 'EXTRA_NARROW',
  displayName: '📱 Extra Narrow',
  minAR: 0.45,
  maxAR: 0.6,
  aspectRatio: 0.525  // ✅ v7 - Увеличено до 0.525 на 5% для более широкого окна (было 0.50)
};

/** Диапазон 2: Узкие мобильные (iPhone SE: 0.56) */
const MOBILE_NARROW: AspectRatioRange = {
  name: 'MOBILE_NARROW',
  displayName: '📱 Mobile Narrow',
  minAR: 0.6,
  maxAR: 0.75,
  aspectRatio: 0.60  // Увеличено с 0.5625 для более широкого окна
};

/** Диапазон 3: Стандартные мобильные портрет */
const MOBILE_STANDARD: AspectRatioRange = {
  name: 'MOBILE_STANDARD',
  displayName: '📱 Mobile Standard',
  minAR: 0.75,
  maxAR: 1.0,
  aspectRatio: 0.75  // Увеличено с 0.70 для более широкого окна
};

/** Диапазон 4: Планшеты, почти квадратные (iPad: 0.75) */
const TABLET_SQUARE: AspectRatioRange = {
  name: 'TABLET_SQUARE',
  displayName: '📱 Tablet/Square',
  minAR: 1.0,   // ✅ FIX: Было 0.75, создавало дублирование с MOBILE_STANDARD
  maxAR: 1.3,   // ✅ FIX: Было 1.0, создавало дыру 1.0-1.3
  aspectRatio: 0.85
};

/** Диапазон 5: Небольшие мониторы */
const MONITOR_SMALL: AspectRatioRange = {
  name: 'MONITOR_SMALL',
  displayName: '🖥️ Monitor Small',
  minAR: 1.3,
  maxAR: 1.6,
  aspectRatio: 0.95
};

/** Диапазон 6: Большие мониторы (квадрат) */
const MONITOR_LARGE: AspectRatioRange = {
  name: 'MONITOR_LARGE',
  displayName: '🖥️ Monitor Large',
  minAR: 1.6,
  maxAR: Infinity,
  aspectRatio: 1.0
};

/**
 * Массив всех диапазонов aspect ratio
 * От самого узкого (ultra narrow) до самого широкого (monitor large)
 */
export const ASPECT_RATIO_RANGES: AspectRatioRange[] = [
  ULTRA_NARROW,
  EXTRA_NARROW,
  MOBILE_NARROW,
  MOBILE_STANDARD,
  TABLET_SQUARE,
  MONITOR_SMALL,
  MONITOR_LARGE
];

export function calculateModalSize(
  cameraWidth: number,
  cameraHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 40,
  modalName: string = 'Modal'
): { width: number; height: number; x: number; y: number } {
  // === СНАЧАЛА ВЫЧИСЛЯЕМ screenAR (используется в нескольких местах) ===
  const screenAR = canvasWidth / canvasHeight;

  // === АДАПТИВНЫЙ PADDING ===
  // Определяем ориентацию и тип устройства
  const isMobile = canvasWidth < 768; // Мобильные устройства

  // Увеличиваем padding для мобильных устройств в портретной ориентации
  // Это необходимо для учета адресной строки браузера (до 15% высоты экрана)
  const adaptivePadding = (isMobile && screenAR < 1.0) ? 80 : padding;

  // === ШАГ 1: Вычисляем, сколько виртуальных пикселей видно на 1 реальный пиксель ===
  const scaleX = cameraWidth / canvasWidth;
  const scaleY = cameraHeight / canvasHeight;

  // === ШАГ 2: Доступная область в виртуальных координатах с адаптивным padding ===
  // canvasWidth * scaleX = cameraWidth (виртуальных пикселей)
  // ✅ ДОПОЛНИТЕЛЬНЫЙ ОТСТУП СВЕРХУ для кнопки закрытия
  // Кнопка закрытия находится в правом верхнем углу на расстоянии closeSize от верха модального окна
  // closeSize = modalWidth * 0.06, что для типичного модального окна составляет ~30-40px
  // Нужно гарантировать видимость кнопки + небольшой отступ сверху
  const closeButtonTopPadding = 120; // Увеличено с 80 до 120 для гарантированной видимости кнопки закрытия
  const availableVirtualWidth = canvasWidth * scaleX - adaptivePadding * 2;
  const availableVirtualHeight = canvasHeight * scaleY - adaptivePadding * 2 - closeButtonTopPadding;

  // === ШАГ 3: Базовые пропорции (СИСТЕМА 7 ДИАПАЗОНОВ) ===
  // ✅ Используем систему 7 диапазонов вместо бинарной (portrait/landscape)
  // Это обеспечивает более точную подстройку под различные экраны

  // Находим соответствующий диапазон
  const selectedRange = ASPECT_RATIO_RANGES.find(
    range => screenAR >= range.minAR && screenAR < range.maxAR
  );

  // Используем aspect ratio из выбранного диапазона, или fallback
  const aspectRatio = selectedRange?.aspectRatio ?? 1.0;

  // 🎯 Логируем выбранный диапазон для отладки (с эмодзи для наглядности)
  const rangeDisplay = selectedRange?.displayName || '❌ Fallback';
  const rangeName = selectedRange?.name || 'FALLBACK';

  // Получаем множитель шрифта для этого диапазона
  const fontMultiplier = FONT_SIZE_MULTIPLIERS[rangeName as keyof typeof FONT_SIZE_MULTIPLIERS] ?? 1.3;

  logger.log('MODAL_SIZE', `🎯 [${modalName}] ${rangeDisplay} | screenAR=${screenAR.toFixed(2)} → modalAR=${aspectRatio.toFixed(2)} | fontMultiplier=${fontMultiplier.toFixed(2)}`);

  let modalWidth: number;
  let modalHeight: number;

  // === ШАГ 4: Подбираем размер с сохранением пропорций ===
  // ✅ Уменьшаем размер модального окна для гарантии видимости счётчиков (верхний и нижний HUD)
  // ✅ ДОПОЛНИТЕЛЬНОЕ УМЕНЬШЕНИЕ для мобильных landscape (высота экрана очень маленькая)
  const modalHeightMultiplier = (isMobile && screenAR >= 1.0) ? 0.6 : 0.65; // 60% для мобильных landscape, 65% для остальных
  modalHeight = availableVirtualHeight * modalHeightMultiplier;

  // ✅ Для landscape: используем aspectRatio из выбранного диапазона
  // Для portrait: используем aspectRatio из выбранного диапазона
  // Система 5 диапазонов автоматически подбирает оптимальное соотношение
  if (screenAR >= 1.0) {
    // В landscape больше места по ширине, используем выбранный aspectRatio
    // Для мониторов это обычно 0.95-1.0 (почти квадрат)
    modalWidth = modalHeight * aspectRatio;
    // Если не помещается по ширине — вписываем по ширине
    if (modalWidth > availableVirtualWidth) {
      modalWidth = availableVirtualWidth * 0.95;
      modalHeight = modalWidth / aspectRatio;
    }
  } else {
    // В portrait используем выбранный aspectRatio
    // Для мобильных это обычно 0.5625-0.85
    modalWidth = modalHeight * aspectRatio;
    // Если ширина не помещается — вписываем по ширине
    if (modalWidth > availableVirtualWidth) {
      modalWidth = availableVirtualWidth * 0.95;
      modalHeight = modalWidth / aspectRatio;
    }
  }

  // === ШАГ 5: Финальная защита ===
  modalWidth = Math.min(modalWidth, availableVirtualWidth * 0.98);
  modalHeight = Math.min(modalHeight, availableVirtualHeight * 0.98);

  // === ШАГ 6: Позиционируем модальное окно с учетом кнопки закрытия ===
  // Центрируем по горизонтали
  const x = cameraWidth / 2;

  // ✅ Умное позиционирование: гарантируем видимость кнопки закрытия, но не выходим за нижнюю границу
  // Проблема: модальные окна с setScrollFactor(0) позиционируются в виртуальных координатах камеры,
  // но отображаются относительно canvas. Нужно учитывать реальные координаты браузера.

  // Рассчитываем минимальную позицию Y для видимости кнопки закрытия
  // closeSize уже в виртуальных координатах (modalWidth * 0.06)
  // closeButtonTopMargin - в реальных пикселях, конвертируем в виртуальные
  const closeSize = modalWidth * 0.06; // Размер кнопки закрытия в виртуальных координатах
  // ✅ Уменьшено до 60px для лучшего баланса между видимостью кнопки и размещением окна
  // Слишком большой отступ приводит к тому, что модальное окно выходит за пределы
  const closeButtonTopMarginReal = 60; // Отступ сверху в реальных пикселях (уменьшено с 120 до 60)
  const closeButtonTopMarginVirtual = closeButtonTopMarginReal * scaleY; // Конвертируем в виртуальные координаты
  const closeButtonOffset = closeSize + closeButtonTopMarginVirtual; // Общий отступ в виртуальных координатах
  const minY = modalHeight / 2 + closeButtonOffset; // Минимальная Y для видимости кнопки

  // Рассчитываем максимальную позицию Y, чтобы низ не выходил за пределы
  // ✅ ДОПОЛНИТЕЛЬНЫЙ PADDING СНИЗУ для мобильных landscape устройств
  // При повороте смартфона горизонтально высота экрана очень маленькая,
  // нужно больше отступ снизу для гарантии видимости нижней части модального окна
  const bottomPadding = (isMobile && screenAR >= 1.0) ? adaptivePadding + 30 : adaptivePadding; // +30px для мобильных landscape (увеличено с 20)
  const maxY = cameraHeight - modalHeight / 2 - bottomPadding;

  // ✅ УМНАЯ ЛОГИКА: Учитываем обе границы одновременно
  // Приоритет: видимость кнопки закрытия И нижней части модального окна
  const centerY = cameraHeight / 2;

  // Если minY > maxY, модальное окно слишком большое для экрана
  // В этом случае уменьшаем размер модального окна или используем компромисс
  if (minY > maxY) {
    // Вариант 1: Используем компромисс - среднее значение
    // Это гарантирует, что и верх, и низ будут частично видны
    const y = (minY + maxY) / 2;
        logger.warn('MODAL_SIZE', `ModalSizeCalculator: Modal too large! minY (${minY.toFixed(1)}) > maxY (${maxY.toFixed(1)}). Using compromise: ${y.toFixed(1)}`);
        logger.warn('MODAL_SIZE', 'ModalSizeCalculator: Modal will be partially visible. Consider reducing modal size or closeButtonTopMarginReal.');
    return { width: modalWidth, height: modalHeight, x, y };
  }

  // Если minY <= maxY, выбираем позицию между minY и maxY, ближе к центру
  // Гарантируем видимость кнопки закрытия (не меньше minY) и нижней части (не больше maxY)
  const y = Math.max(minY, Math.min(centerY, maxY));

  // ✅ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: убеждаемся, что низ не выходит за пределы
  // Используем bottomPadding вместо adaptivePadding для консистентности
  const modalBottom = y + modalHeight / 2;
  const maxBottom = cameraHeight - bottomPadding;
  if (modalBottom > maxBottom) {
    // Если низ все равно выходит, используем maxY
    const correctedY = maxY;
        logger.warn('MODAL_SIZE', `ModalSizeCalculator: Modal bottom (${modalBottom.toFixed(1)}) exceeds max (${maxBottom.toFixed(1)}). Using maxY: ${correctedY.toFixed(1)}`);
    return { width: modalWidth, height: modalHeight, x, y: correctedY };
  }

  // === ЛОГИРОВАНИЕ и ПРОВЕРКА ВЫХОДА ЗА ПРЕДЕЛЫ ===
  // Получаем размер окна браузера с учетом адресной строки
  let browserWidth: number | null = null;
  let browserHeight: number | null = null;

  if (typeof window !== 'undefined') {
    // visualViewport учитывает адресную строку браузера (если доступен)
    if (window.visualViewport) {
      browserWidth = window.visualViewport.width;
      browserHeight = window.visualViewport.height;
    } else {
      // Fallback: используем innerHeight и вычитаем примерную высоту адресной строки
      browserWidth = window.innerWidth;
      // На мобильных устройствах адресная строка может занимать 50-100px
      // Используем консервативное значение 80px для мобильных портретных
      const addressBarHeight = (isMobile && screenAR < 1.0) ? 80 : 0;
      browserHeight = window.innerHeight - addressBarHeight;
    }
  }

  // Конвертируем размер модального окна из виртуальных координат в реальные CSS пиксели
  // Модальное окно в виртуальных координатах, нужно перевести в реальные
  const modalWidthReal = modalWidth / scaleX; // Реальная ширина в CSS пикселях
  const modalHeightReal = modalHeight / scaleY; // Реальная высота в CSS пикселях

  // Проверяем, не выходит ли модальное окно за пределы браузера
  let exceedsBounds = false;
  let exceedsInfo = '';
  if (browserWidth !== null && browserHeight !== null) {
    if (modalWidthReal > browserWidth) {
      exceedsBounds = true;
      exceedsInfo += `width (${modalWidthReal.toFixed(1)} > ${browserWidth}) `;
    }
    if (modalHeightReal > browserHeight) {
      exceedsBounds = true;
      exceedsInfo += `height (${modalHeightReal.toFixed(1)} > ${browserHeight}) `;
    }
  }

  // Выводим значения для удобства отладки
  const browserInfo = browserWidth !== null && browserHeight !== null
    ? `browser=${browserWidth.toFixed(0)}x${browserHeight.toFixed(0)}`
    : 'browser=N/A';
  const modalInfo = `modal(virtual)=${modalWidth.toFixed(1)}x${modalHeight.toFixed(1)}, modal(real)=${modalWidthReal.toFixed(1)}x${modalHeightReal.toFixed(1)}`;
  const exceedsStatus = exceedsBounds ? `⚠️ EXCEEDS` : '✅ OK';
  const exceedsWarning = exceedsBounds ? ` ⚠️ EXCEEDS BROWSER BOUNDS: ${exceedsInfo.trim()}` : '';
  logger.log('MODAL_SIZE', `${browserInfo}, canvas=${canvasWidth}x${canvasHeight}, camera=${cameraWidth.toFixed(1)}x${cameraHeight}, padding=${adaptivePadding}, available=${availableVirtualWidth.toFixed(1)}x${availableVirtualHeight.toFixed(1)}, ${modalInfo}, status=${exceedsStatus}${exceedsWarning}`);

  // Предупреждение в консоль, если выходит за пределы
  if (exceedsBounds) {
        logger.warn('MODAL_SIZE', `ModalSizeCalculator: Modal window exceeds browser bounds! ${exceedsInfo.trim()}`);
  }

  return { width: modalWidth, height: modalHeight, x, y };
}

/**
 * === УТИЛИТА ДЛЯ ТЕСТИРОВАНИЯ ===
 *
 * Функция для тестирования всех 7 диапазонов aspect ratio.
 * Показывает, какой диапазон будет выбран для заданного размера экрана.
 *
 * Использование в browser console:
 * ```javascript
 * // Тест текущего экрана
 * window.testModalRanges()
 *
 * // Тест конкретного размера
 * window.testModalRanges(375, 667)  // iPhone SE
 * ```
 */
export function getAspectRangeInfo(canvasWidth: number, canvasHeight: number): {
  screenAR: number;
  rangeName: string;
  aspectRatio: number;
  rangeDescription: string;
} {
  const screenAR = canvasWidth / canvasHeight;
  const selectedRange = ASPECT_RATIO_RANGES.find(
    range => screenAR >= range.minAR && screenAR < range.maxAR
  );

  return {
    screenAR,
    rangeName: selectedRange?.name || 'fallback',
    aspectRatio: selectedRange?.aspectRatio ?? 1.0,
    rangeDescription: selectedRange
      ? `Range: ${selectedRange.minAR} - ${selectedRange.maxAR}`
      : 'Fallback to 1.0'
  };
}

// Экспортируем для использования в browser console (если нужно)
declare global {
  interface Window {
    testModalRanges?: (width?: number, height?: number) => void;
  }
}
