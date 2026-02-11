# Система динамического расчета размеров шрифтов

## Версия: 2.0
## Последнее обновление: 2026-02-06

---

## Обзор

Система динамического расчета размеров шрифтов обеспечивает единообразное отображение текста во всех модальных окнах игры, автоматически подстраивая размер шрифта под доступное пространство и длину текста.

**Ключевые особенности v2.0:**
- ✅ **Система 7 диапазонов aspect ratio** — вместо бинарной portrait/landscape
- ✅ **Адаптивные множители шрифтов** — разные для каждого типа экрана (1.26–1.54)
- ✅ **Единый базовый размер** — для всех элементов модального окна
- ✅ **Уменьшение при длинном тексте** — сохранено и работает

---

## ✨ v2.0 - Адаптивные множители шрифтов

### Таблица множителей по диапазонам

| # | Диапазон | screenAR | Множитель шрифта | Описание |
|---|----------|-----------|------------------|----------|
| 1 | Ultra Narrow | 0.25–0.45 | **1.26** | Экстремально узкие (тестирование) |
| 2 | Extra Narrow | 0.45–0.6 | **1.34** | Очень узкие (foldable phones) |
| 3 | Mobile Narrow | 0.6–0.75 | **1.41** | Узкие мобильные (iPhone SE) |
| 4 | Mobile Standard | 0.75–1.0 | **1.45** | Стандартные мобильные портрет |
| 5 | Tablet/Square | 1.0–1.3 | **1.49** | Планшеты, почти квадратные |
| 6 | Monitor Small | 1.3–1.6 | **1.54** | Небольшие мониторы |
| 7 | Monitor Large | 1.6+ | **1.54** | Большие мониторы (квадрат) |

**Изменения v2.0:**
- Все множители увеличены на ~10% для лучшей читаемости
- Ultra Narrow: 1.15 → 1.26 (+9.6%)
- Extra Narrow: 1.22 → 1.34 (+9.8%)
- Mobile Narrow: 1.28 → 1.41 (+10.2%)
- Mobile Standard: 1.32 → 1.45 (+9.8%)
- Tablet/Square: 1.35 → 1.49 (+10.4%)
- Monitor Small/Large: 1.4 → 1.54 (+10%)

### Какие модальные окна используют адаптивные множители

| Модальное окно | Адаптивный множитель | Финальная формула |
|----------------|---------------------|-------------------|
| **KeyQuestionModal** | ✅ **ДА** (1.26–1.54) | `baseFontSize × adaptiveMultiplier × elementMultiplier` |
| **CoinBubbleQuiz** | ✅ **ДА** (1.26–1.54) | `baseFontSize × adaptiveMultiplier` |
| **PortalModal** | ❌ НЕТ | `baseFontSize × 1.3` (фиксированный) |
| **GameOverModal** | ❌ НЕТ | `baseFontSize × elementMultiplier` (2.0, 1.3) |

---

## Архитектура

### Компоненты системы

1. **Константы** (`src/constants/textStyles.ts`)
   - `FONT_SIZE_MULTIPLIERS` — адаптивные множители по диапазонам
   - `BUTTON_PADDING_BASE_X/Y` — отступы в пикселях исходной графики
   - Ограничения размеров шрифта (минимум/максимум)
   - Стили и цвета текстов

2. **Калькулятор размеров** (`src/game/utils/FontSizeCalculator.ts`)
   - `calculateOptimalBaseFontSize()` — бинарный поиск оптимального базового размера
   - `calculateBaseFontSize()` — проверка влезания дефолтного размера
   - `calculateButtonFontSize()` — расчет для кнопок с учетом внутренних отступов
   - `calculateUnifiedBaseFontSize()` — единый базовый размер для всех модалов
   - `getFontSizeMultiplier()` — адаптивный множитель по aspect ratio
   - `getButtonPadding()` — адаптивные отступы для кнопок
   - `logAspectRatioRange()` — логирование текущего диапазона

3. **Calculator размеров модалов** (`src/game/ui/ModalSizeCalculator.ts`)
   - `calculateModalSize()` — расчет размеров модального окна
   - Система 7 диапазонов aspect ratio
   - Адаптивный aspect ratio для каждого диапазона

4. **UI компоненты**
   - `KeyQuestionModal.ts` — модальное окно вопросов
   - `PortalModal.ts` — модальное окно порталов
   - `GameOverModal.ts` — модальное окно окончания игры
   - `CoinBubbleQuiz.ts` — бабблы для квиза монеток

---

## Принципы работы

### 1. Единый базовый размер для всех элементов

Все текстовые элементы в модальном окне используют **один и тот же базовый размер шрифта** (`baseFontSize`), рассчитанный с помощью бинарного поиска:

```typescript
// Используем бинарный поиск для нахождения максимального размера
const initialBaseSize = blockHeight * 0.65; // 65% от высоты блока
const baseFontSize = calculateOptimalBaseFontSize(
  scene,
  contentAreaWidth,
  blockHeight,
  longestText,
  initialBaseSize
);
```

### 2. Самый длинный текст для каждого типа модального окна

| Модальное окно | Использует calculateUnifiedBaseFontSize | Самый длинный текст (источник) |
|----------------|----------------------------------------|-------------------------------|
| KeyQuestionModal | ✅ ДА | `getLongestTexts()` от QuizManager → **max(question, answer, feedback)** |
| PortalModal | ✅ ДА | `getLongestTexts()` от QuizManager → **max(question, answer, feedback)** |
| GameOverModal | ✅ ДА | `getLongestTexts()` от QuizManager → **max(question, answer, feedback)** |
| CoinBubbleQuiz | ✅ ДА | **Собственный расчет** → **max(bubble1Text, bubble2Text)** |

**Важно:** `calculateUnifiedBaseFontSize()` использует `getLongestTexts()` от QuizManager для получения самого длинного текста из **всех вопросов уровня**. Это гарантирует, что базовый размер будет достаточен для любого текста.

### 3. Уменьшение размера шрифта при длинном тексте

**✅ СОХРАНЕНО:** Система **всё ещё уменьшает** размер шрифта, если текст не влезает!

**Механизм:**
```typescript
// В calculateBaseFontSize()
const tempText = scene.add.text(0, 0, longestText, {
  fontSize: `${defaultFontSize}px`,
  wordWrap: { width: availableWidth },
  align: 'center'
});

const fits = tempText.height <= maxHeight;

if (fits) {
  // Текст влезает — используем дефолтный размер
  finalFontSize = defaultFontSize;
} else {
  // Текст не влезает — уменьшаем пропорционально
  const scaleFactor = maxHeight / tempText.height;
  finalFontSize = defaultFontSize * scaleFactor;
}
```

**Пример:**
- `defaultFontSize = 40px`
- `longestText = "Очень длинный текст который не влезает в одну строку"`
- `maxHeight = 60px`
- `tempText.height = 80px` (не влезает!)
- `scaleFactor = 60 / 80 = 0.75`
- `finalFontSize = 40 × 0.75 = 30px` (уменьшен на 25%)

### 4. Адаптивные множители (v2.0)

**Для KeyQuestionModal и CoinBubbleQuiz:**
```typescript
const screenAR = canvasWidth / canvasHeight;
const adaptiveMultiplier = getFontSizeMultiplier(screenAR);
const finalFontSize = baseFontSize * adaptiveMultiplier;
```

**Примеры:**
- Ultra Narrow (screenAR = 0.35): `finalFontSize = baseFontSize × 1.26`
- Mobile Standard (screenAR = 0.89): `finalFontSize = baseFontSize × 1.45`
- Monitor Large (screenAR = 1.78): `finalFontSize = baseFontSize × 1.54`

**Для PortalModal и GameOverModal:**
- Фиксированные множители (1.3, 2.0)
- Не используют `getFontSizeMultiplier()`

---

## Детали реализации по модальным окнам

### KeyQuestionModal

**Элементы:** вопрос, фидбэк, кнопки (3 варианта ответа)

**Логика:**
1. Базовый размер рассчитывается через `calculateUnifiedBaseFontSize()`
2. Адаптивный множитель из `getFontSizeMultiplier(screenAR)`
3. Применяются фиксированные множители элементов (все = 1.0)

```typescript
const baseFontSize = calculateUnifiedBaseFontSize(this.scene, currentLevel);
const screenAR = canvasWidth / canvasHeight;
const adaptiveMultiplier = getFontSizeMultiplier(screenAR);
const commonFontSize = baseFontSize * adaptiveMultiplier;

// Применение
questionText.setFontSize(commonFontSize * KEY_QUESTION_FONT_SIZE_MULTIPLIER); // × 1.0
feedbackText.setFontSize(commonFontSize * KEY_FEEDBACK_FONT_SIZE_MULTIPLIER); // × 1.0
buttons.forEach(btn => btn.setFontSize(commonFontSize * KEY_BUTTON_FONT_SIZE_MULTIPLIER)); // × 1.0
```

### CoinBubbleQuiz

**Элементы:** два баббла с утверждениями (Да/Нет)

**Логика:**
1. Базовый размер рассчитывается через `calculateUnifiedBaseFontSize(scene, 1)`
2. **Самый длинный текст:** собственный расчет `max(bubble1Text, bubble2Text)`
3. Адаптивный множитель из `getFontSizeMultiplier(screenAR)`
4. Фиксированные множители не используются (равны 1.0, но не применяются)

```typescript
const baseFontSize = calculateUnifiedBaseFontSize(this.scene, 1); // level=1 для унификации
const longestText = bubble1Text.length > bubble2Text.length ? bubble1Text : bubble2Text;

const bubbleFontSizeRaw = calculateBaseFontSize(
  this.scene,
  bubbleAvailableWidth,
  bubbleAvailableHeight,
  longestText,  // ✅ Собственный longestText
  baseFontSize,
  3 // maxLines
);

const screenAR = canvasWidth / canvasHeight;
const adaptiveMultiplier = getFontSizeMultiplier(screenAR);
const fontSize = bubbleFontSizeRaw * adaptiveMultiplier;
```

### PortalModal

**Элементы:** вопрос, ответ, кнопки (ENTER PORTAL, CANCEL)

**Логика:**
1. Базовый размер рассчитывается через `calculateUnifiedBaseFontSize()`
2. Фиксированный множитель `FINAL_MULTIPLIER = 1.3`
3. Адаптивный множитель **НЕ используется**

```typescript
const baseFontSize = calculateUnifiedBaseFontSize(this.scene, currentLevel);
const FINAL_MULTIPLIER = 1.3;

const questionFontSize = baseFontSize * FINAL_MULTIPLIER;
const answerFontSize = baseFontSize * FINAL_MULTIPLIER;
const buttonFontSize = baseFontSize * FINAL_MULTIPLIER;
```

### GameOverModal

**Элементы:** заголовок, счетчик, кнопки (RESTART GAME, NEXT LEVEL)

**Логика:**
1. Базовый размер рассчитывается через `calculateUnifiedBaseFontSize(scene, 1)`
2. Фиксированные множители по элементам
3. Адаптивный множитель **НЕ используется**

```typescript
const baseFontSize = calculateUnifiedBaseFontSize(this.scene, 1); // ✅ Фиксированный level=1

const TITLE_SCORE_MULTIPLIER = 2.0;
const BUTTON_MULTIPLIER = 1.3;
const FEEDBACK_MULTIPLIER = 1.3;

const titleFontSize = baseFontSize * TITLE_SCORE_MULTIPLIER;
const buttonFontSize = baseFontSize * BUTTON_MULTIPLIER;
```

---

## Адаптивные отступы для кнопок (v2.0)

**Файл:** `src/constants/textStyles.ts` и `src/game/utils/FontSizeCalculator.ts`

### Базовые отступы в пикселях исходной графики

```typescript
export const BUTTON_PADDING_BASE_X = 3; // 3px исходной графики → 12px виртуальных (×4)
export const BUTTON_PADDING_BASE_Y = 2; // 2px исходной графики → 8px виртуальных (×4)
```

### Функция получения адаптивных отступов

```typescript
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
```

### Использование в модальных окнах

```typescript
// KeyQuestionModal
const buttonPadding = getButtonPadding(buttonWidth, buttonHeight);
const buttonAvailableWidth = buttonPadding.availableWidth;
const buttonAvailableHeight = buttonPadding.availableHeight;

const buttonFontSizeRaw = calculateButtonFontSize(
  this.scene,
  buttonAvailableWidth,  // ✅ С учётом отступов
  buttonAvailableHeight, // ✅ С учётом отступов
  longestText,
  baseFontSize
);

// ✅ wordWrap.width должен быть доступной шириной для текста (с учётом отступов)
wordWrap: { width: buttonAvailableWidth / invZoom }
```

---

## Layout модальных окон

### Разделение на блоки

Рабочая область модального окна делится на **равные части**:

**KeyQuestionModal (5 блоков):**
1. Вопрос (верхний блок)
2. Фидбэк (второй блок)
3. Кнопка 1 (третий блок)
4. Кнопка 2 (четвертый блок)
5. Кнопка 3 (пятый блок)

**PortalModal (5 блоков):**
1. Заголовок (верхний блок)
2. Вопрос + картинка (второй блок)
3. Ответ (третий блок)
4. Кнопка Войти (четвертый блок)
5. Кнопка Отмена (пятый блок)

**GameOverModal (6 блоков):**
1. Заголовок (верхний блок)
2. Фидбэк (второй блок)
3. Счетчик (третий блок)
4. Персонаж (четвертый блок)
5. Кнопка Рестарт (пятый блок)
6. Кнопка "Следующий уровень" (шестой блок, только для WIN_LEVEL)

---

## Логирование

### Логи при ресайзе экрана

```
🎯 ASPECT RANGE: 📱 Mobile Standard | canvas=1056×1184 | screenAR=0.89 | modalAR=0.75 | font×1.45 | [resize]
```

### Ручная проверка в консоли

```javascript
// Проверка текущего экрана
window.logAspectRatioRange()

// Проверка конкретного размера
window.logAspectRatioRange(375, 667)  // iPhone SE
window.logAspectRatioRange(1920, 1080) // Full HD
```

### Логи расчета размера шрифта

```
🔍 calculateUnifiedBaseFontSize: Unified base font size calculation:
  modalWidth: 756, modalHeight: 756
  blockHeight: 111.8
  longestText: "Какая планета известна как 'Красная планета'?"
  initialBaseSize (blockHeight * 0.65): 72.67px
  optimizedBaseSize: 45.23px
  unifiedBaseFontSize (final): 45.23px
```

---

## Примеры использования

### Изменение множителя для диапазона

Чтобы изменить множитель для конкретного диапазона:

```typescript
// В src/constants/textStyles.ts
export const FONT_SIZE_MULTIPLIERS = {
  ULTRA_NARROW: 1.30,   // Увеличить с 1.26 до 1.30
  // ...
} as const;
```

### Изменение aspect ratio модального окна

Чтобы изменить aspect ratio для конкретного диапазона:

```typescript
// В src/game/ui/ModalSizeCalculator.ts
const EXTRA_NARROW: AspectRatioRange = {
  name: 'EXTRA_NARROW',
  displayName: '📱 Extra Narrow',
  minAR: 0.45,
  maxAR: 0.6,
  aspectRatio: 0.55  // Увеличить с 0.525 до 0.55
};
```

### Добавление нового диапазона

```typescript
// В src/game/ui/ModalSizeCalculator.ts
const NEW_RANGE: AspectRatioRange = {
  name: 'NEW_RANGE',
  displayName: '📱 New Range',
  minAR: 2.0,
  maxAR: 2.5,
  aspectRatio: 1.1
};

export const ASPECT_RATIO_RANGES: AspectRatioRange[] = [
  // ... существующие диапазоны
  NEW_RANGE,
];

// В src/constants/textStyles.ts
export const FONT_SIZE_MULTIPLIERS = {
  // ... существующие множители
  NEW_RANGE: 1.6,
} as const;
```

---

## Важные моменты

### ✅ Правильно

- Использовать единый `baseFontSize` для всех элементов в модальном окне
- Использовать `calculateOptimalBaseFontSize()` для поиска оптимального базового размера
- Включать все элементы (включая кнопки) в расчет `unifiedFontSize`
- Применять адаптивный множитель `getFontSizeMultiplier()` для KeyQuestionModal и CoinBubbleQuiz
- Использовать `getButtonPadding()` для вычисления отступов кнопок
- Проверять влезание дефолтного размера перед уменьшением
- Учитывать отступы в `wordWrap.width`

### ❌ Неправильно

- Использовать разные базовые размеры для разных элементов
- Рассчитывать кнопки отдельно от текстовых элементов
- Забывать об отступах при расчете `wordWrap.width`
- Применять адаптивный множитель в PortalModal или GameOverModal
- Использовать фиксированные отступы вместо `getButtonPadding()`
- Пропускать проверку влезания дефолтного размера

---

## Связанные файлы

- `src/constants/textStyles.ts` — Константы размеров, стилей и цветов
- `src/game/utils/FontSizeCalculator.ts` — Калькулятор размеров шрифтов
- `src/game/ui/ModalSizeCalculator.ts` — Калькулятор размеров модальных окон
- `src/game/ui/KeyQuestionModal.ts` — Модальное окно вопросов
- `src/game/ui/PortalModal.ts` — Модальное окно порталов
- `src/game/ui/GameOverModal.ts` — Модальное окно окончания игры
- `src/game/ui/CoinBubbleQuiz.ts` — Бабблы для квиза монеток
- `src/game/systems/QuizManager.ts` — Менеджер вопросов (getLongestTexts)

---

## История изменений

### Версия 2.0 (2026-02-06)
- ✅ **СИСТЕМА 7 ДИАПАЗОНОВ ASPECT RATIO** — вместо бинарной portrait/landscape
- ✅ **АДАПТИВНЫЕ МНОЖИТЕЛИ ШРИФТОВ** — разные для каждого диапазона (1.26–1.54)
- ✅ **Увеличение множителей на ~10%** — для лучшей читаемости
- ✅ **Адаптивные отступы кнопок** — через getButtonPadding()
- ✅ **Таблицы множителей и longestText** — для наглядности
- ✅ **CoinBubbleQuiz использует getFontSizeMultiplier()** — унификация с модалами
- ✅ **Подтверждение:** уменьшение размера шрифта при длинном тексте сохранено

### Версия 1.1 (2025-01-27)
- Унифицирована логика расчета размеров шрифтов для PortalModal и GameOverModal
- Все элементы (включая кнопки) используют единый `baseFontSize`
- Использование `calculateOptimalBaseFontSize()` для поиска оптимального базового размера

### Версия 1.0 (2025-12-05)
- Создана система динамического расчета размеров шрифтов
- Реализован гибридный подход (build-time константы + runtime fallback)
- Добавлена проверка влезания дефолтного размера
- Реализовано единообразие размеров для всех элементов
