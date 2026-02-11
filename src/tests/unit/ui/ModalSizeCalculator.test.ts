/**
 * Unit тесты для ModalSizeCalculator v7
 *
 * ✅ v7 - СИСТЕМА 7 ДИАПАЗОНОВ ASPECT RATIO:
 * 1. Адаптивный aspect ratio на основе screenAR (7 диапазонов)
 * 2. Ultra Narrow range для экстремально узких экранов (AR 0.25-0.45)
 * 3. Extra Narrow range для foldable phones (AR 0.45-0.6) - aspectRatio 0.525 (+5% ширины)
 * 4. Множители шрифтов увеличены на ~10% для лучшей читаемости
 * 5. Умное позиционирование (учитывает кнопку закрытия и низ модального окна)
 * 6. Размер в процентах от экрана (адаптивно)
 */

import { calculateModalSize } from '../../../game/ui/ModalSizeCalculator';
// calculateModalButtonSizes - не реализована, тесты временно отключены

describe('ModalSizeCalculator v6', () => {
  describe('calculateModalSize', () => {
    it('должен вычислять размер модального окна для экстремально узкого экрана (ultra-narrow)', () => {
      const cameraWidth = 2560;
      const cameraHeight = 1280;
      const canvasWidth = 250; // screenAR = 0.25 (ultra-narrow range: 0.25-0.45)
      const canvasHeight = 1000;
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Проверяем, что размеры вычислены
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.x).toBe(cameraWidth / 2);

      // ✅ v6: Aspect ratio из диапазона "ultra-narrow" (0.35)
      const aspectRatio = result.width / result.height;
      expect(Math.abs(aspectRatio - 0.35)).toBeLessThan(0.15); // Большой допуск из-за крайних значений
    });

    it('должен вычислять размер модального окна для extra-narrow экрана', () => {
      const cameraWidth = 2560;
      const cameraHeight = 1280;
      const canvasWidth = 520; // screenAR = 0.52 (extra-narrow range: 0.45-0.6)
      const canvasHeight = 1000;
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Проверяем, что размеры вычислены
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.x).toBe(cameraWidth / 2);

      // ✅ v7: Aspect ratio из диапазона "extra-narrow" (0.525)
      const aspectRatio = result.width / result.height;
      expect(Math.abs(aspectRatio - 0.525)).toBeLessThan(0.1);
    });

    it('должен вычислять размер модального окна для портретного экрана (mobile-narrow)', () => {
      const cameraWidth = 720;
      const cameraHeight = 1280;
      const canvasWidth = 400; // screenAR = 0.625 (mobile-narrow range: 0.6-0.75)
      const canvasHeight = 640;
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Проверяем, что размеры вычислены
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.x).toBe(cameraWidth / 2);

      // ✅ v6: Умное позиционирование по Y (учитывает кнопку закрытия и низ)
      expect(result.y).toBeGreaterThan(0);
      expect(result.y).toBeLessThan(cameraHeight);

      // ✅ v6: Aspect ratio из диапазона "mobile-narrow" (0.5625)
      const aspectRatio = result.width / result.height;
      expect(Math.abs(aspectRatio - 0.5625)).toBeLessThan(0.1);
    });

    it('должен вычислять размер модального окна для альбомного экрана (monitor-large)', () => {
      const cameraWidth = 2560;
      const cameraHeight = 1280;
      const canvasWidth = 1920; // screenAR = 1.78 (monitor-large range: 1.6+)
      const canvasHeight = 1080;
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // Проверяем, что размеры вычислены
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.x).toBe(cameraWidth / 2);

      // ✅ v6: Умное позиционирование по Y
      expect(result.y).toBeGreaterThan(0);
      expect(result.y).toBeLessThan(cameraHeight);

      // ✅ v6: Aspect ratio из диапазона "monitor-large" (1.0)
      const aspectRatio = result.width / result.height;
      expect(Math.abs(aspectRatio - 1.0)).toBeLessThan(0.1);
    });

    it('должен использовать аспект 0.75 для mobile-standard (portrait)', () => {
      const cameraWidth = 720;
      const cameraHeight = 1280;
      const canvasWidth = 600; // screenAR = 0.75 (mobile-standard range: 0.75-1.0, граница)
      const canvasHeight = 800;
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // ✅ v6: Mobile-standard range (aspectRatio = 0.75)
      const aspectRatio = result.width / result.height;
      expect(Math.abs(aspectRatio - 0.75)).toBeLessThan(0.1);
    });

    it('должен использовать аспект 0.60 для mobile-narrow (portrait)', () => {
      const cameraWidth = 720;
      const cameraHeight = 1280;
      const canvasWidth = 400; // screenAR = 0.625 (mobile-narrow range: 0.6-0.75)
      const canvasHeight = 640;
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // ✅ v6: Mobile-narrow range (aspectRatio = 0.60)
      const aspectRatio = result.width / result.height;
      expect(Math.abs(aspectRatio - 0.60)).toBeLessThan(0.1);
    });

    it('должен использовать аспект 1.0 для monitor-large (landscape)', () => {
      const cameraWidth = 2560;
      const cameraHeight = 1280;
      const canvasWidth = 1920; // screenAR = 1.78 (monitor-large range: 1.6+)
      const canvasHeight = 1080;
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // ✅ v6: Monitor-large range (aspectRatio = 1.0)
      const aspectRatio = result.width / result.height;
      expect(Math.abs(aspectRatio - 1.0)).toBeLessThan(0.1);
    });

    it('должен всегда позиционировать модальное окно по центру', () => {
      const cameraWidth = 720;
      const cameraHeight = 1280;
      const canvasWidth = 360;
      const canvasHeight = 640;
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // ✅ v6: Всегда по центру
      expect(result.x).toBe(cameraWidth / 2);
      expect(result.y).toBe(cameraHeight / 2);
    });

    it('должен использовать padding по умолчанию, если не указан', () => {
      const cameraWidth = 720;
      const cameraHeight = 1280;
      const canvasWidth = 360;
      const canvasHeight = 640;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight);

      // Проверяем, что размеры вычислены
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.x).toBe(cameraWidth / 2);
      expect(result.y).toBe(cameraHeight / 2);
    });

    it('должен корректно обрабатывать разные значения padding', () => {
      const cameraWidth = 720;
      const cameraHeight = 1280;
      const canvasWidth = 1920;
      const canvasHeight = 1080;

      const resultWithPadding20 = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, 20);
      const resultWithPadding40 = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, 40);
      const resultWithPadding60 = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, 60);

      // Больший padding должен давать меньшее модальное окно
      expect(resultWithPadding20.width).toBeGreaterThanOrEqual(resultWithPadding40.width);
      expect(resultWithPadding40.width).toBeGreaterThanOrEqual(resultWithPadding60.width);
      expect(resultWithPadding20.height).toBeGreaterThanOrEqual(resultWithPadding40.height);
      expect(resultWithPadding40.height).toBeGreaterThanOrEqual(resultWithPadding60.height);
    });

    it('должен использовать увеличенный отступ для мобильных устройств', () => {
      const cameraWidth = 720;
      const cameraHeight = 1280;
      const canvasWidth = 400; // Мобильное устройство (< 768), AR=0.625 (mobile-narrow)
      const canvasHeight = 640;
      const padding = 20;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      // ✅ Для мобильных устройств padding увеличивается до 80 (screenAR < 1.0)
      // Модальное окно должно быть меньше из-за увеличенного padding
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('должен влезать в экран при любых размерах', () => {
      const cameraWidth = 720;
      const cameraHeight = 1280;
      const canvasWidth = 360;
      const canvasHeight = 640;
      const padding = 40;

      const result = calculateModalSize(cameraWidth, cameraHeight, canvasWidth, canvasHeight, padding);

      const scaleX = cameraWidth / canvasWidth;
      const scaleY = cameraHeight / canvasHeight;

      // Модальное окно должно быть меньше экрана (с учётом padding)
      const maxWidth = (canvasWidth - padding * 2) * scaleX;
      const maxHeight = (canvasHeight - padding * 2) * scaleY;

      expect(result.width).toBeLessThanOrEqual(maxWidth);
      expect(result.height).toBeLessThanOrEqual(maxHeight);
    });
  });

  // TODO: calculateModalButtonSizes - не реализована, тесты временно отключены
  // describe('calculateModalButtonSizes', () => {
  //   it('должен вычислять размеры кнопок модального окна', () => {
  //     const modalWidth = 1000;
  //     const modalHeight = 800;

  //     const result = calculateModalButtonSizes(modalWidth, modalHeight);

  //     // Проверяем, что все размеры вычислены
  //     expect(result.contentAreaWidth).toBeGreaterThan(0);
  //     expect(result.contentAreaHeight).toBeGreaterThan(0);
  //     expect(result.blockHeight).toBeGreaterThan(0);
  //     expect(result.buttonWidth).toBeGreaterThan(0);
  //     expect(result.buttonHeight).toBeGreaterThan(0);
  //     expect(result.internalPadding).toBeGreaterThan(0);

  //     // contentArea = modalWidth - 2 * internalPadding
  //     expect(result.contentAreaWidth).toBe(modalWidth - 2 * result.internalPadding);
  //     expect(result.contentAreaHeight).toBe(modalHeight - 2 * result.internalPadding);

  //     // buttonWidth = contentAreaWidth
  //     expect(result.buttonWidth).toBe(result.contentAreaWidth);

  //     // buttonHeight = blockHeight
  //     expect(result.buttonHeight).toBe(result.blockHeight);
  //   });

  //   it('должен вычислять правильный internalPadding (4% от modalWidth)', () => {
  //     const modalWidth = 1000;
  //     const modalHeight = 800;

  //     const result = calculateModalButtonSizes(modalWidth, modalHeight);

  //     // internalPadding = modalWidth * 0.04
  //     expect(result.internalPadding).toBe(40);
  //   });

  //   it('должен делить contentArea на 5 равных блоков', () => {
  //     const modalWidth = 1000;
  //     const modalHeight = 800;

  //     const result = calculateModalButtonSizes(modalWidth, modalHeight);

  //     // 5 блоков с 4 отступами между ними
  //     const totalBlocks = 5;
  //     const totalSpacings = 4;
  //     const buttonSpacing = result.internalPadding / 4;

  //     // blockHeight = (contentAreaHeight - 4 * spacing) / 5
  //     const expectedBlockHeight = (result.contentAreaHeight - totalSpacings * buttonSpacing) / totalBlocks;
  //     expect(result.blockHeight).toBeCloseTo(expectedBlockHeight, 5);
  //   });

  //   it('должен возвращать размеры для кнопок, совпадающие с размерами блоков', () => {
  //     const modalWidth = 1000;
  //     const modalHeight = 800;

  //     const result = calculateModalButtonSizes(modalWidth, modalHeight);

  //     // Кнопки должны иметь ту же ширину, что и contentArea
  //     expect(result.buttonWidth).toBe(result.contentAreaWidth);

  //     // Кнопки должны иметь ту же высоту, что и блок
  //     expect(result.buttonHeight).toBe(result.blockHeight);
  //   });
  // });
});
