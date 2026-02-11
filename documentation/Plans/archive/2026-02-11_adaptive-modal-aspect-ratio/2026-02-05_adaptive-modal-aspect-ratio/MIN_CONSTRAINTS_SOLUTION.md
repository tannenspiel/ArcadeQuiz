# Minimum Constraints Solution

**Дата:** 2026-02-05
**Связано с:** Риск 3 (CoinBubbleQuiz 9-slice)

---

## 🎯 Проблема

При очень узких экранах (screenAR < 0.5) элементы UI сжимаются до размеров, при которых:
1. 9-slice углы пересекаются
2. Текст становится нечитаемым
3. Интерактивные элементы слишком маленькие для тача

---

## 💡 Решение: Минимальные пределы размеров

### Архитектура

```
┌─────────────────────────────────────┐
│   gameConstants.ts (новые константы)  │
├─────────────────────────────────────┤
│   MODAL_CONSTRAINTS = {               │
│     MIN_MODAL_WIDTH: 320,              │
│     MIN_MODAL_HEIGHT: 480,             │
│     MIN_BUBBLE_WIDTH: 280,             │
│     MIN_BUBBLE_HEIGHT: 80,             │
│   }                                   │
└─────────────────────────────────────┘
              │
              ├──→ ModalSizeCalculator.ts (применяет к модальным окнам)
              │
              └──→ CoinBubbleQuiz.ts (применяет к бабблам)
```

---

## 📝 Шаги реализации

### Шаг 1: Добавить константы

**Файл:** `src/constants/gameConstants.ts`

```typescript
// ✅ Минимальные размеры UI элементов для предотвращения поломки 9-slice
// При слишком узких экранах элементы не могут сжиматься меньше этих размеров
export const MODAL_CONSTRAINTS = {
  // Модальные окна (KeyQuestionModal, PortalModal, GameOverModal)
  MIN_MODAL_WIDTH: 320,    // Минимальная ширина (ширина iPhone SE)
  MIN_MODAL_HEIGHT: 480,   // Минимальная высота

  // Бабблы монеток (CoinBubbleQuiz)
  MIN_BUBBLE_WIDTH: 280,   // Минимальная ширина баббла
  MIN_BUBBLE_HEIGHT: 80,   // Минимальная высота баббла

  // Пороговое значение screenAR для применения ограничений
  NARROW_SCREEN_THRESHOLD: 0.5,  // Если screenAR < 0.5, применить MIN размеры
} as const;
```

---

### Шаг 2: Применить в ModalSizeCalculator

**Файл:** `src/game/ui/ModalSizeCalculator.ts`

```typescript
import { MODAL_CONSTRAINTS } from '../../constants/gameConstants';

export function calculateModalSize(
  cameraWidth: number,
  cameraHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 40
): { width: number; height: number; x: number; y: number } {

  // ... существующий код расчёта modalWidth, modalHeight ...

  // ✅ ПРИМЕНИТЬ ОГРАНИЧЕНИЯ МИНИМАЛЬНЫХ РАЗМЕРОВ
  let wasConstrained = false;

  if (modalWidth < MODAL_CONSTRAINTS.MIN_MODAL_WIDTH) {
    logger.warn('MODAL_SIZE', `Modal too narrow: ${modalWidth.toFixed(0)} < ${MODAL_CONSTRAINTS.MIN_MODAL_WIDTH}, applying constraint`);
    modalWidth = MODAL_CONSTRAINTS.MIN_MODAL_WIDTH;
    wasConstrained = true;
  }

  if (modalHeight < MODAL_CONSTRAINTS.MIN_MODAL_HEIGHT) {
    logger.warn('MODAL_SIZE', `Modal too short: ${modalHeight.toFixed(0)} < ${MODAL_CONSTRAINTS.MIN_MODAL_HEIGHT}, applying constraint`);
    modalHeight = MODAL_CONSTRAINTS.MIN_MODAL_HEIGHT;
    wasConstrained = true;
  }

  // ⚠️ Если применены ограничения, модальное окно может выйти за границы экрана
  // Это приемлемо, так как контент останется читаемым
  if (wasConstrained) {
    logger.warn('MODAL_SIZE', `Modal constrained to minimum size: ${modalWidth.toFixed(0)}x${modalHeight.toFixed(0)}`);
  }

  // ... продолжение функции (позиционирование) ...
}
```

---

### Шаг 3: Применить в CoinBubbleQuiz

**Файл:** `src/game/ui/CoinBubbleQuiz.ts`

```typescript
import { MODAL_CONSTRAINTS } from '../../constants/gameConstants';

private async createUI(): Promise<void> {
  // ... существующий код получения modalSize ...

  // ✅ РАСЧЕТ БАББЛОВ С МИНИМАЛЬНЫМИ ОГРАНИЧЕНИЯМИ
  let bubbleBtnWidth = modalSize.width * 0.95;
  let bubbleBtnHeight = modalSize.height / 5;

  // Применить минимальные размеры
  const wasBubbleConstrained =
    bubbleBtnWidth < MODAL_CONSTRAINTS.MIN_BUBBLE_WIDTH ||
    bubbleBtnHeight < MODAL_CONSTRAINTS.MIN_BUBBLE_HEIGHT;

  bubbleBtnWidth = Math.max(bubbleBtnWidth, MODAL_CONSTRAINTS.MIN_BUBBLE_WIDTH);
  bubbleBtnHeight = Math.max(bubbleBtnHeight, MODAL_CONSTRAINTS.MIN_BUBBLE_HEIGHT);

  if (wasBubbleConstrained) {
    logger.warn('COIN_BUBBLE_QUIZ', `Bubble constrained to minimum: ${bubbleBtnWidth.toFixed(0)}x${bubbleBtnHeight.toFixed(0)}`);
  }

  // ✅ АЛЬТЕРНАТИВНЫЙ LAYOUT для экстремально узких экранов
  const screenAR = canvasWidth / canvasHeight;

  if (screenAR < MODAL_CONSTRAINTS.NARROW_SCREEN_THRESHOLD) {
    // Экстремально узкий экран: бабблы друг под другом, а не рядом
    logger.warn('COIN_BUBBLE_QUIZ', `Extremely narrow screen (AR=${screenAR.toFixed(2)}), using vertical layout`);

    // Переключиться на вертикальный layout
    bubbleBtnWidth = Math.max(canvasWidth * 0.9, MODAL_CONSTRAINTS.MIN_BUBBLE_WIDTH);
    bubbleBtnHeight = Math.max(canvasHeight * 0.2, MODAL_CONSTRAINTS.MIN_BUBBLE_HEIGHT);

    // Бабблы друг под другом
    const bubble1X = centerX;
    const bubble1Y = centerY - bubbleBtnHeight / 2 - 10;
    const bubble2X = centerX;
    const bubble2Y = centerY + bubbleBtnHeight / 2 + 10;

    // ... создать бабблы с новыми координатами ...
  } else {
    // Обычный layout: бабблы рядом по горизонтали
    // ... существующий код ...
  }
}
```

---

## 🧪 Тестовые случаи

### Тест 1: Очень узкий экран (screenAR = 0.4)

**Вход:** canvasWidth = 400, canvasHeight = 1000

**Ожидаемое поведение:**
- ModalSizeCalculator применяет MIN_MODAL_WIDTH = 320
- CoinBubbleQuiz переключается на вертикальный layout

**Проверка:**
```javascript
// chrome-devtools-mcp emulate viewport
{ width: 400, height: 1000, deviceScaleFactor: 1 }
```

---

### Тест 2: Граничный случай (screenAR = 0.5)

**Вход:** canvasWidth = 500, canvasHeight = 1000

**Ожидаемое поведение:**
- Минимальные ограничения ещё не применяются
- Бабблы в обычном layout

---

### Тест 3: Нормальный экран (screenAR = 0.6)

**Вход:** canvasWidth = 600, canvasHeight = 1000

**Ожидаемое поведение:**
- Ограничения не применяются
- Всё работает как раньше

---

## 📊 Таблица минимальных размеров

| Элемент | Мин. ширина | Мин. высота | Обоснование |
|---------|-------------|-------------|-------------|
| Модальное окно | 320px | 480px | iPhone SE (375×667) с запасом |
| Баббл монетки | 280px | 80px | 9-slice корректен, текст читаем |
| Порог вертикального layout | - | screenAR < 0.5 | Экстремально узкие экраны |

---

## ⚠️ Торгов-offs (Compromises)

### 1. Модальное окно может выходить за границы

**Проблема:** При применении MIN_WIDTH на узком экране (300px), модальное окно (320px) выйдет за границы.

**Решение:** Приемлемо, так как:
- Центр модального окна остаётся видимым
- Контент читаем (не сжат)
- Кнопки кликабельны

### 2. Вертикальный layout для бабблов

**Проблема:** При screenAR < 0.5 бабблы размещаются друг под другом.

**Решение:** Это лучше, чем:
- Бабблы наезжают друг на друга
- 9-slice ломается
- Текст нечитаем

---

## 🔄 Порядок реализации

1. ✅ Добавить `MODAL_CONSTRAINTS` в `gameConstants.ts`
2. ✅ Применить в `ModalSizeCalculator.ts`
3. ✅ Применить в `CoinBubbleQuiz.ts` (с вертикальным layout)
4. ✅ Тестирование на узких экранах (400×1000, 300×1000)
5. ✅ Логирование применённых ограничений

---

## 📝 Заметки для будущего

**Возможные улучшения:**
1. Динамический расчёт минимальных размеров на основе fontSize
2. Отключение 9-slice для очень маленьких элементов
3. Scrollable контент для экстремально узких экранов

**Мониторинг:**
- Следить за логами `Modal constrained` и `Bubble constrained`
- Если появляются часто — пересмотреть пороги
