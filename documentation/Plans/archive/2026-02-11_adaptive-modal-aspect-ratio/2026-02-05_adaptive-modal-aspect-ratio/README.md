# Adaptive Modal Aspect Ratio System

**Дата создания:** 2026-02-05
**Дата завершения:** 2026-02-09
**Статус:** ✅ COMPLETE (10/10 шагов)
**Приоритет:** Medium
**Затронутые файлы:**
- `src/game/ui/ModalSizeCalculator.ts`
- `src/game/ui/KeyQuestionModal.ts` (тестирование)
- `src/game/ui/PortalModal.ts` (тестирование)
- `src/game/ui/GameOverModal.ts` (тестирование)
- `src/game/ui/CoinBubbleQuiz.ts` (тестирование, наследует)

---

## Краткое описание

Внедрить систему 5 адаптивных диапазонов aspect ratio для модальных окон вместо текущей 2-режимной системы (portrait/landscape). Система будет автоматически подбирать оптимальные пропорции модального окна в зависимости от соотношения сторон экрана устройства.

---

## Контекст

**Текущая проблема:**
- Почти квадратные экраны (например, 1000×1050) получают вытянутое портретное окно (aspect ratio 0.5625)
- Резкий переход между режимами на границе portrait/landscape
- Нет промежуточных вариантов для планшетов и небольших мониторов

**Текущая система:**
| Ориентация | Условие | Aspect Ratio |
|------------|----------|--------------|
| Portrait | `canvasHeight > canvasWidth` | 0.5625 |
| Landscape | `canvasWidth ≥ canvasHeight` | 1.0 |

**Целевая система (5 диапазонов):**
| Диапазон | screenAR | Aspect Ratio | Описание |
|----------|-----------|--------------|----------|
| 1. Mobile Narrow | 0.0 – 0.6 | 0.5625 | Очень узкие мобильные |
| 2. Mobile Standard | 0.6 – 0.75 | 0.70 | Стандартные мобильные портрет |
| 3. Tablet/Square | 0.75 – 1.0 | 0.85 | Планшеты, почти квадратные |
| 4. Monitor Small | 1.0 – 1.3 | 0.95 | Небольшие мониторы |
| 5. Monitor Large | 1.3+ | 1.0 | Большие мониторы (квадрат) |

---

## План реализации

### Шаг 1: Создать типы и константы

**Файл:** `src/game/ui/ModalSizeCalculator.ts`

```typescript
interface AspectRatioRange {
  name: string;           // Название для логов
  minAR: number;          // Минимальное соотношение экрана
  maxAR: number;          // Максимальное соотношение экрана
  aspectRatio: number;    // Aspect ratio модального окна
}

const ASPECT_RATIO_RANGES: AspectRatioRange[] = [
  { name: 'mobile-narrow', minAR: 0, maxAR: 0.6, aspectRatio: 0.5625 },
  { name: 'mobile-standard', minAR: 0.6, maxAR: 0.75, aspectRatio: 0.70 },
  { name: 'tablet-square', minAR: 0.75, maxAR: 1.0, aspectRatio: 0.85 },
  { name: 'monitor-small', minAR: 1.0, maxAR: 1.3, aspectRatio: 0.95 },
  { name: 'monitor-large', minAR: 1.3, maxAR: Infinity, aspectRatio: 1.0 },
];
```

### Шаг 2: Заменить логику выбора aspect ratio

**Файл:** `src/game/ui/ModalSizeCalculator.ts`

**Было:**
```typescript
const isPortrait = canvasHeight > canvasWidth;
const aspectRatio = isPortrait ? 0.5625 : 1.0;
```

**Станет:**
```typescript
const screenAR = canvasWidth / canvasHeight;
const selectedRange = ASPECT_RATIO_RANGES.find(
  range => screenAR >= range.minAR && screenAR < range.maxAR
);
const aspectRatio = selectedRange?.aspectRatio ?? 1.0;

logger.log('MODAL_SIZE', `Selected range: ${selectedRange?.name || 'fallback'} (screenAR=${screenAR.toFixed(2)})`);
```

### Шаг 3: Удалить неиспользуемый код

Удалить переменные `isPortrait` и `isLandscape`, если они больше нигде не используются в `calculateModalSize`.

### Шаг 4: Обновить документацию

Добавить комментарий в `ModalSizeCalculator.ts` с описанием новой системы.

### Шаг 5: Тестирование

Протестировать все модальные окна на разных размерах экрана:
- KeyQuestionModal
- PortalModal
- GameOverModal
- CoinBubbleQuiz (наследует автоматически)

---

## Зависимости и примечания

**Зависимости:** Нет

**Заметки:**
- CoinBubbleQuiz наследует aspect ratio автоматически через `calculateModalSize()`
- Все модальные окна используют общую функцию `calculateModalSize()`
- Изменения только в одном файле (`ModalSizeCalculator.ts`)

---

## Критерии завершения

- [x] Система 7 диапазонов реализована в `ModalSizeCalculator.ts` ✅
- [x] Логи показывают выбранный диапазон ✅
- [x] Console тестирование всех диапазонов пройдено ✅
- [x] Тесты обновлены и проходят (9/9 passing) ✅
- [x] Документация обновлена ✅
- [x] Визуальная проверка модальных окон (проверено в браузере 2026-02-09) ✅

**Текущий статус:** 10/10 шагов выполнено. План завершён. ✅
