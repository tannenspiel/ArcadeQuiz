# Анализ системы размера шрифтов в KeyQuestionModal

**Дата:** 2026-02-13
**Цель:** Изучить как формируется размер шрифта в 5 блоках модального окна ключа

---

## 1. СТРУКТУРА 5 БЛОКОВ

```
┌─────────────────────────────┐
│        ЗАГОЛОВОК          │  ← internalPadding
├─────────────────────────────┤
│                           │
│   БЛОК 1: Вопрос        │  ← blockHeight (1/5 контента)
│   questionAreaHeight       │
│                           │
├─────────────────────────────┤  ← buttonSpacing
│   БЛОК 2: Фидбэк      │  ← blockHeight (1/5 контента)
│   feedbackAreaHeight       │
│                           │
├─────────────────────────────┤  ← buttonSpacing
│   БЛОК 3: Кнопка C    │  ← blockHeight (1/5 контента)
│                           │
├─────────────────────────────┤  ← buttonSpacing
│   БЛОК 4: Кнопка B    │  ← blockHeight (1/5 контента)
│                           │
├─────────────────────────────┤  ← buttonSpacing
│   БЛОК 5: Кнопка A    │  ← blockHeight (1/5 контента)
│                           │
└─────────────────────────────┘  ← internalPadding
```

**Все блоки имеют одинаковую высоту:** `blockHeight = contentAreaHeight / 5`

---

## 2. ОГРАНИЧЕНИЯ РАЗМЕРА ШРИФТА

### 2.1. Жёсткие ограничения (из textStyles.ts)

| Параметр | Значение | Описание |
|---------|----------|------------|
| `MIN_FONT_SIZE_TEXT` | 16 px | Минимальный размер для текста (вопрос, фидбэк) |
| `MIN_FONT_SIZE_BUTTON` | 16 px | Минимальный размер для кнопок |
| `MAX_FONT_SIZE` | 64 px | Максимальный размер для всех элементов |
| `MAX_OPTIMAL_FONT_SIZE` | 48 px | Максимальный оптимальный размер |

### 2.2. Ограничения при расчёте

```typescript
// calculateOptimalBaseFontSize (FontSizeCalculator.ts:38-106)
const clampedSize = Math.max(MIN_FONT_SIZE_TEXT, Math.min(effectiveMaxSize, optimalSize));

// calculateBaseFontSize (FontSizeCalculator.ts:168)
const clampedSize = Math.max(MIN_FONT_SIZE_TEXT, Math.min(MAX_FONT_SIZE, finalFontSize));

// calculateButtonFontSize (FontSizeCalculator.ts:231)
const clampedSize = Math.max(minSize, Math.min(MAX_OPTIMAL_FONT_SIZE, finalFontSize));
```

---

## 3. МНОЖИТЕЛИ РАЗМЕРА ШРИФТА

### 3.1. Базовые множители (FONT_SIZE_MULTIPLIERS)

| Диапазон | Множитель | AR | Описание |
|----------|-----------|-----|------------|
| ULTRA_NARROW | 1.26 | 0.25-0.45 | Экстремально узкие |
| EXTRA_NARROW | 1.34 | 0.45-0.60 | Очень узкие |
| MOBILE_NARROW | 1.25 | 0.60-0.75 | Узкие мобильные |
| MOBILE_STANDARD | 1.00 | 0.75-1.00 | Стандартные мобильные |
| TABLET_SQUARE | 1.00 | 1.00-1.30 | Планшеты |
| MONITOR_SMALL | 1.00 | 1.30-1.60 | Небольшие мониторы |
| MONITOR_LARGE | 1.00 | 1.60+ | Большие мониторы |

### 3.2. Множители для модальных окон (MODAL_FONT_MULTIPLIERS)

| Диапазон | Множитель | AR | Описание |
|----------|-----------|-----|------------|
| MOBILE_NARROW | 1.36 | 0.60-0.75 | Узкие мобильные |
| MOBILE_STANDARD | 0.80 | 0.75-1.00 | Стандартные мобильные |
| TABLET_SQUARE | 0.82 | 1.00-1.30 | Планшеты |
| MONITOR_SMALL | 0.84 | 1.30-1.60 | Небольшие мониторы |
| MONITOR_LARGE | 0.85 | 1.60+ | Большие мониторы |

**Важно:** Множители для модальных окон **МЕНЬШЕ** чем базовые!

### 3.3. Множители для бабблов монеток (COIN_BUBBLE_FONT_MULTIPLIERS)

| Диапазон | Множитель | AR | Описание |
|----------|-----------|-----|------------|
| ULTRA_NARROW | 0.89 | 0.25-0.45 | Экстремально узкие |
| EXTRA_NARROW | 1.02 | 0.45-0.60 | Очень узкие |
| MOBILE_NARROW | 1.12 | 0.60-0.75 | Узкие мобильные |
| MOBILE_STANDARD | 1.45 | 0.75-1.00 | Стандартные мобильные |
| TABLET_SQUARE | 1.50 | 1.00-1.30 | Планшеты |
| MONITOR_SMALL | 1.55 | 1.30-1.60 | Небольшие мониторы |
| MONITOR_LARGE | 1.55 | 1.60+ | Большие мониторы |

---

## 4. ПОРЯДОК РАСЧЁТА РАЗМЕРА ШРИФТА

### 4.1. Шаг 1: Расчёт размера модального окна

```typescript
// KeyQuestionModal.ts:229-261
const modalSize = calculateModalSize(
  camWidth, camHeight,      // Виртуальное разрешение
  canvasWidth, canvasHeight  // CSS-размеры
);

// Возврат: { width, height } с учётом aspect ratio
```

### 4.2. Шаг 2: Расчёт internalPadding

```typescript
// KeyQuestionModal.ts:265-278
const MODAL_INTERNAL_PADDING_PERCENT = 0.08; // 8% от меньшей стороны
const MODAL_INTERNAL_PADDING_MIN = 30; // Минимум 30 px

const modalMinSize = Math.min(modalSize.width, modalSize.height);
const internalPadding = Math.max(
  MODAL_INTERNAL_PADDING_MIN,
  modalMinSize * MODAL_INTERNAL_PADDING_PERCENT
);
```

### 4.3. Шаг 3: Расчёт contentArea

```typescript
// KeyQuestionModal.ts:281-282
const contentAreaWidth = modalSize.width - (internalPadding * 2);
const contentAreaHeight = modalSize.height - (internalPadding * 2);
```

### 4.4. Шаг 4: Расчёт высоты одного блока

```typescript
// KeyQuestionModal.ts:282
const totalBlocks = 5; // 1 вопрос + 1 фидбэк + 3 кнопки
const totalSpacings = totalBlocks - 1; // 4 отступа
const buttonSpacing = internalPadding / 4;

const blockHeight = (contentAreaHeight - (totalSpacings * buttonSpacing)) / totalBlocks;
```

**Все 5 блоков имеют одинаковую высоту!**

### 4.5. Шаг 5: Расчёт базового размера шрифта

```typescript
// FontSizeCalculator.ts:247-361 (calculateUnifiedBaseFontSize)
const initialBaseSize = blockHeight * 0.65; // 65% от высоты блока

const optimizedBaseSize = calculateOptimalBaseFontSize(
  scene,
  contentAreaWidth,
  questionAreaHeight,
  longestText, // Самый длинный текст из question/answer/feedback
  initialBaseSize
);
```

**calculateOptimalBaseFontSize использует бинарный поиск** для нахождения максимального размера, который влезает.

### 4.6. Шаг 6: Применение множителя

```typescript
// KeyQuestionModal.ts:458-462
const screenAR = canvasWidth / canvasHeight;
const adaptiveMultiplier = getModalFontMultiplier(screenAR); // из MODAL_FONT_MULTIPLIERS
const zoom = scene.cameras.main.zoom; // 1.6

const commonFontSize = Math.max(buttonFontSizeRaw, unifiedFontSize) * adaptiveMultiplier;
```

**Финальный размер:** `baseFontSize * adaptiveMultiplier`

---

## 5. ЗАВИСИМОСТЬ ОТ РАЗМЕРОВ БЛОКОВ

### 5.1. Для вопроса и фидбэка

```typescript
// KeyQuestionModal.ts:397-404
const questionFontSizeRaw = calculateBaseFontSize(
  scene,
  contentAreaWidth,           // ✅ Ширина контента
  questionAreaHeight,         // ✅ Высота блока
  longestTexts.question,     // ✅ Самый длинный текст
  baseFontSize
);
```

### 5.2. Для кнопок

```typescript
// KeyQuestionModal.ts:437-445
const buttonPadding = getButtonPadding(buttonWidth, buttonHeight);
// paddingX = 12px, paddingY = 8px (масштабировано)
const buttonAvailableWidth = buttonWidth - (paddingX * 2);
const buttonAvailableHeight = buttonHeight - (paddingY * 2);

const buttonFontSizeRaw = calculateButtonFontSize(
  scene,
  buttonAvailableWidth,  // ✅ С учётом отступов!
  buttonAvailableHeight, // ✅ С учётом отступов!
  longestTexts.answer,
  MAX_OPTIMAL_FONT_SIZE // 48px
);
```

**Критично:** Для кнопок используется **availableWidth/Height** (с отступами), а не полные размеры блока!

### 5.3. Унификация размера

```typescript
// KeyQuestionModal.ts:421-424
// Все элементы используют МИНИМАЛЬНЫЙ размер
let unifiedFontSize = Math.min(questionFontSizeRaw, feedbackFontSizeRaw, buttonFontSizeRaw);

// Финальный множитель применяется к унифицированному размеру
const commonFontSize = unifiedFontSize * adaptiveMultiplier;
```

---

## 6. WORDWRAP И ПЕРЕНОСЫ СТРОК

### 6.1. Для вопроса

```typescript
// KeyQuestionModal.ts:474-476
const questionMaxHeight = questionAreaHeight; // Используем высоту области вопроса

const questionText = scene.add.text(0, 0, parsedQuestion.question, {
  fontSize: `${questionFontSize}px`,
  fontFamily: DEFAULT_FONT_FAMILY,
  color: KEY_QUESTION_COLOR,
  align: 'center',
  wordWrap: { width: contentAreaWidth }, // ✅ Переносы по ширине контента
  maxLines: 3 // ✅ Максимум 3 строки
});
```

### 6.2. Для кнопок

```typescript
// KeyQuestionModal.ts:602
const invZoom = 1 / zoom; // Компенсация setScale(0.625)
wordWrap: { width: buttonAvailableWidth / invZoom }
```

**Важно:** wordWrap.width для кнопок **компенсирует zoom** (делится на invZoom = 1.6).

---

## 7. СЛЕДУЮЩИЕ ШАГИ ДЛЯ ОТЛАДКИ

Для визуализации текстовых областей нужно добавить отладочные прямоугольники:

1. **Блок 1 (Вопрос):** Показать contentAreaWidth × questionAreaHeight
2. **Блок 2 (Фидбэк):** Показать contentAreaWidth × feedbackAreaHeight
3. **Блоки 3-5 (Кнопки):** Показать:
   - buttonAvailableWidth × buttonAvailableHeight (текстовая область)
   - Или buttonWidth × buttonHeight (весь блок)

Цвета для прямоугольников уже заданы в KeyQuestionModal.ts:327-358

---

## 8. РЕЗЮМИЕ

### 8.1. Основная формула

```
finalFontSize = baseFontSize × adaptiveMultiplier

где:
baseFontSize = min(questionRaw, feedbackRaw, buttonRaw)
adaptiveMultiplier = getModalFontMultiplier(screenAR)
```

### 8.2. Ограничения

- **Минимум:** 16 px (MIN_FONT_SIZE_TEXT / MIN_FONT_SIZE_BUTTON)
- **Максимум:** 64 px (MAX_FONT_SIZE) для базовых
- **Оптимум:** 48 px (MAX_OPTIMAL_FONT_SIZE) для кнопок

### 8.3. Ключевые особенности

1. **Унификация:** Все 5 блоков используют **одинаковый** размер шрифта
2. **Адаптивность:** Множитель зависит от **aspect ratio экрана**
3. **Бинарный поиск:** calculateOptimalBaseFontSize находит оптимальный размер
4. **Отступы кнопок:** Существуют! (12px по X, 8px по Y)
5. **Компенсация zoom:** wordWrap для кнопок делится на invZoom

---

**Следующий шаг:** Добавить отладочные прямоугольники для визуализации
