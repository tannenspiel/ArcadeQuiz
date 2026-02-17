# Modal Guide - Руководство по модальным окнам

**Версия:** 3.0
**Дата создания:** 2026-01-28
**Последнее обновление:** 2026-02-16
**Назначение:** Комплексное руководство по всем модальным окнам игры
**Затронутые файлы:**
- `src/game/ui/KeyQuestionModal.ts`
- `src/game/ui/PortalModal.ts`
- `src/game/ui/GameOverModal.ts`
- `src/game/ui/CoinBubbleQuiz.ts`
- `src/game/ui/UIManager.ts`
- `src/game/ui/ModalSizeCalculator.ts`
- `src/game/utils/FontSizeCalculator.ts`
- `src/constants/textStyles.ts`

---

## Обзор

Модальные окна — основной способ взаимодействия с игроком вне геймплея. Все модальные окна:

- **Паузят** игровую сцену при открытии
- **Блокируют** ввод до закрытия
- **Используют** Tiered Font System v3 (бинарный поиск) для расчёта размеров шрифтов
- **Поддерживают** Grid Snapping для pixel-perfect позиционирования
- **Автоматически адаптируются** к любым размерам экрана без таблиц множителей

---

## ✨ v3.0 - Система Бинарного Поиска (Tiered Font System)

**Текущая система** — прямой бинарный поиск размера шрифта без таблиц множителей.

**Принцип работы (v3):**
1. Текстовый блок имеет строго заданные размеры (в процентах от высоты окна или фиксированные).
2. Алгоритм (`calculateTieredFontSizeSimple`) подбирает **максимально возможный размер шрифта**, при котором текст с полным переносом слов (wordWrap) помещается в этот блок.
3. **Адаптация автоматическая** — без таблиц множителей:
   - Узкий экран → больше строк → меньше шрифт.
   - Широкий экран → меньше строк → больше шрифт.

**Функции расчёта по компонентам:**
| Компонент | Функция |
|-----------|---------|
| KeyQuestionModal | `calculateTieredFontSizeSimple` |
| CoinBubbleQuiz | `calculateTieredFontSizeSimple` |
| QuestionBubble | `calculateTieredFontSizeSimple` |
| PortalModal | `calculatePortalTieredFontSize` (изолированная копия v3) |
| GameOverModal | `calculateGameOverTieredFontSize` (изолированная копия v3) |

**Преимущества:**
- ✅ Гарантирует, что текст всегда поместится.
- ✅ Использует максимально возможное пространство.
- ✅ Работает для любых языков и длин строк.
- ✅ Не требует обновления таблиц при изменении размеров экрана.

---

## UIManager

**Файл:** `src/game/ui/UIManager.ts`

Центральный хаб управления всеми модальными окнами.

### Функции

| Функция | Описание |
|---------|----------|
| `openModal(modal)` | Открывает модальное окно (паузит сцену) |
| `closeModal(modal)` | Закрывает модальное окно (возобновляет сцену) |
| `handleResize()` | Обрабатывает изменение размера экрана |
| `isModalOpen()` | Проверяет, открыто ли окно |

### Правила

1. **Только одно окно одновременно** — UIManager гарантирует это
2. **Автопауза** — сцена паузится при открытии, резюмится при закрытии
3. **Resize-aware** — все модалы пересчитываются при изменении размера

---

## Модальные окна

### KeyQuestionModal

**Файл:** `src/game/ui/KeyQuestionModal.ts`

Окно, отображающее вопрос при подборе ключа.

#### Структура

```
┌──────────────────────────────────────┐
│         [×] Кнопка закрытия          │  ← Grid Snapping (кратно 4)
├──────────────────────────────────────┤
│                                      │
│        ВОПРОС (Question)             │  ← baseFontSize × adaptiveMultiplier
│                                      │
│   ┌──────────┐ ┌──────────┐          │
│   │  Ответ 1 │ │  Ответ 2 │  ...     │  ← Кнопки с blink для подсказки
│   └──────────┘ └──────────┘          │
│                                      │
│  "Нажмите еще раз для подтверждения" │  ← Текст подтверждения
└──────────────────────────────────────┘
```

#### Расчёт размера шрифта (v3)

Три независимых размера шрифта рассчитываются через `calculateTieredFontSizeSimple`:

| Элемент | Функция | Особенности |
|---------|---------|-------------|
| Вопрос | `calculateTieredFontSizeSimple` | sans-serif |
| Фидбэк | `calculateTieredFontSizeSimple` | monospace (`CHAR_WIDTH_RATIO_MONO`) |
| Кнопки | `calculateTieredFontSizeSimple` | sans-serif |

```typescript
// Пример расчёта (нативные координаты!)
const invZoom = 1 / this.scene.cameras.main.zoom;
const nativeAvailableWidth = blockAvailableWidth / invZoom;
const nativeAvailableHeight = blockAvailableHeight / invZoom;

const questionFontSize = calculateTieredFontSizeSimple(
  nativeAvailableWidth,
  nativeAvailableHeight,
  longestTexts.question  // полный текст для wordWrap симуляции
);
```

#### Логика двойного клика

Для предотвращения случайных нажатий:

**Правильный ответ:**
1. **Первое нажатие:** Зелёный цвет, текст подтверждения, блокировка остальных
2. **Второе нажатие:** Анимация победы, закрытие

**Неправильный ответ:**
- Красный цвет, показ правильного ответа, закрытие через 2с

#### Источник текста

Текст вопроса получается из **QuizManager** → **`getLongestTexts()`** → `max(question, answer, feedback)`

---

### PortalModal

**Файл:** `src/game/ui/PortalModal.ts`

Окно портала для перехода между уровнями.

#### Структура

```
┌──────────────────────────────────────┐
│         [×] Кнопка закрытия          │
├──────────────────────────────────────┤
│                                      │
│     ПОРТАЛ (Portal Title)            │  ← baseFontSize × 1.3
│                                      │
│  Выберите уровень для перехода:      │  ← baseFontSize × 1.3
│                                      │
│   ┌────────────┐  ┌────────────┐     │
│   │  Уровень 1 │  │  Уровень 2 │ ... │  ← Кнопки выбора уровня
│   └────────────┘  └────────────┘     │
│                                      │
└──────────────────────────────────────┘
```

#### Расчёт размера шрифта (v3)

Все элементы используют **изолированную копию** функции v3:

```typescript
// PortalModal использует calculatePortalTieredFontSize
const titleFontSize = calculatePortalTieredFontSize(
  nativeAvailableWidth,
  nativeAvailableHeight,
  longestText
);
// Аналогично для question, answer, buttons
```

**Примечание:** `calculatePortalTieredFontSize` — это изолированная копия `calculateTieredFontSizeSimple` с идентичной логикой бинарного поиска.

#### Особенности

- **Кнопки уровня** — динамически генерируются на основе доступных уровней
- **Подсветка** — текущий уровень подсвечен
- **Блокировка** — закрытые уровни неактивны
- **Изображение** — может показывать картинку глобального вопроса (справа от текста)

#### Источник текста

Текст портала получается из **QuizManager** → **`getLongestTexts()`** → `max(question, answer, feedback)`

---

### GameOverModal

**Файл:** `src/game/ui/GameOverModal.ts`

Окно окончания игры (победа или поражение).

#### Структура

```
┌──────────────────────────────────────┐
│         [×] Кнопка закрытия          │
├──────────────────────────────────────┤
│                                      │
│   GAME OVER / VICTORY                │  ← baseFontSize × 2.0
│                                      │
│   Ваш счёт: 1500                     │  ← baseFontSize × 2.0
│   Макс. возможный: 2000              │
│                                      │
│   ┌──────────────┐                  │
│   │   Главная    │                  │  ← Кнопка возврата в меню
│   └──────────────┘                  │
│                                      │
└──────────────────────────────────────┘
```

#### Расчёт размера шрифта (v3)

Все элементы используют **изолированную копию** функции v3:

```typescript
// GameOverModal использует calculateGameOverTieredFontSize
const titleFontSize = calculateGameOverTieredFontSize(
  nativeAvailableWidth,
  nativeAvailableHeight,
  longestText
);
// Аналогично для feedback, score, buttons
```

**Примечание:** `calculateGameOverTieredFontSize` — это изолированная копия `calculateTieredFontSizeSimple` с идентичной логикой бинарного поиска.

#### Состояния

| Состояние | Заголовок | Цвет темы |
|-----------|-----------|-----------|
| `VICTORY` | "VICTORY!" | Золотой |
| `GAME_OVER` | "GAME OVER" | Красный |

#### Отображаемая информация

- **Текущий счёт** — `scoreSystem.getScore()`
- **Максимальный возможный (уровень)** — `scoreSystem.getMaxPossibleScore()`
- **Максимальный возможный (общий)** — `scoreSystem.getTotalMaxPossibleScore()`

---

### CoinBubbleQuiz

**Файл:** `src/game/ui/CoinBubbleQuiz.ts`

Бабблы для квиза монеток (утверждения Да/Нет).

#### Структура

```
         ┌─────────────┐
         │   Утверждение   │  ← Текст вопроса
         └─────────────┘
         ┌─────────────┐
         │     ДА      │  ← Баббл 1
         └─────────────┘
         ┌─────────────┐
         │     НЕТ     │  ← Баббл 2
         └─────────────┘
```

#### Расчёт размера шрифта (v3)

Один размер шрифта для обоих бабблов через `calculateTieredFontSizeSimple`:

```typescript
// CoinBubbleQuiz использует calculateTieredFontSizeSimple
const fontSize = calculateTieredFontSizeSimple(
  nativeAvailableWidth,
  nativeAvailableHeight,
  longestText  // max(bubble1Text, bubble2Text)
);
```

#### Особенности расчёта

- **Учёт монетки:** Ширина текстовой области уменьшена на 80px (COIN_OFFSET_SPACE) для иконки монеты
- **Собственный longestText:** `max(bubble1Text, bubble2Text)` по длине
- **Единый fontSize:** Оба баббла используют одинаковый размер

#### Защита от 9-slice пересечения

```typescript
const MIN_BUBBLE_SIZE = BUBBLE_TILE_SIZE * 3; // 120px минимум
if (bubbleBtnWidth < MIN_BUBBLE_SIZE || bubbleBtnHeight < MIN_BUBBLE_SIZE) {
  logger.warn('Bubble size too small...');
  bubbleBtnWidth = Math.max(bubbleBtnWidth, MIN_BUBBLE_SIZE);
  bubbleBtnHeight = Math.max(bubbleBtnHeight, MIN_BUBBLE_SIZE);
}
```

---

## Таблица множителей шрифтов по типам модальных окон

| Модальное окно | Система | Логика |
|----------------|---------|--------|
| **KeyQuestionModal** | ✅ **Tiered v3** | `calculateTieredFontSizeSimple` (Бинарный поиск) |
| **CoinBubbleQuiz** | ✅ **Tiered v3** | `calculateTieredFontSizeSimple` (Бинарный поиск) |
| **PortalModal** | ✅ **Tiered v3** | `calculatePortalTieredFontSize` (Изолированная копия v3) |
| **GameOverModal** | ✅ **Tiered v3** | `calculateGameOverTieredFontSize` (Изолированная копия v3) |

---

## Таблица источников текста по модальным окнам

| Модальное окно | Источник самого длинного текста |
|----------------|-------------------------------|
| KeyQuestionModal | QuizManager → `getLongestTexts()` → max(question, answer, feedback) |
| PortalModal | QuizManager → `getLongestTexts()` → max(question, answer, feedback) |
| GameOverModal | QuizManager → `getLongestTexts()` → max(question, answer, feedback) |
| CoinBubbleQuiz | **Собственный расчет** → max(bubble1Text, bubble2Text) |

---

## Константы и настройки

### Отступы для кнопок

```typescript
// src/constants/textStyles.ts
export const BUTTON_PADDING_BASE_X = 3; // 3px исходной графики → 12px виртуальных (×4)
export const BUTTON_PADDING_BASE_Y = 2; // 2px исходной графики → 8px виртуальных (×4)
```

---

## Общие паттерны

### 1. Grid Snapping для кнопки закрытия

```typescript
// Размеры модального окна (кратны 8)
const modalWidth = snapToGridDouble(desiredWidth);
const modalHeight = snapToGridDouble(desiredHeight);

// Координаты (кратны 4)
const modalX = snapToGrid(cameraX - modalWidth / 2);
const modalY = snapToGrid(cameraY - modalHeight / 2);

// Размер кнопки закрытия (кратен 4)
const closeSize = 14 * 4; // 56

// Позиция кнопки (гарантированно кратно 4)
const closeX = modalX + modalWidth / 2 - closeSize / 2;
const closeY = modalY - closeSize / 2;
```

### 2. Tiered Font System v3 (Бинарный поиск)

```typescript
// Пересчёт в нативные координаты (компенсация setScale(invZoom))
const invZoom = 1 / scene.cameras.main.zoom;
const nativeAvailableWidth = blockAvailableWidth / invZoom;
const nativeAvailableHeight = blockAvailableHeight / invZoom;

// Бинарный поиск максимального fontSize
import { calculateTieredFontSizeSimple } from '../utils/FontSizeCalculator';

const fontSize = calculateTieredFontSizeSimple(
  nativeAvailableWidth,
  nativeAvailableHeight,
  longestText  // полный текст для wordWrap симуляции
);

// Применение
text.setFontSize(`${fontSize}px`);
text.setScale(invZoom);  // компенсация зума для чёткости
```

### 3. Компенсация зума

```typescript
// Для текста
text.setScale(1 / camera.zoom);

// Для фона
background.setScale(1 / camera.zoom);

// Для позиционирования
const adjustedX = x * camera.zoom;
const adjustedY = y * camera.zoom;
```

### 4. Жизненный цикл

```typescript
// 1. Create
constructor(scene, options);
create();
createBackground();
createContent();
createButtons();

// 2. Update
update(); // Опционально, для анимаций

// 3. Destroy
destroy();
cleanup(); // Удаление listeners, остановка tweens
```

---

## Логирование при ресайзе

При изменении размера экрана выводятся логи:

```
🎯 ASPECT RANGE: 📱 Mobile Standard | canvas=1056×1184 | screenAR=0.89 | modalAR=0.75 | font×1.45 | [resize]
```

Также доступна ручная проверка в консоли браузера:

```javascript
window.logAspectRatioRange(520, 1000)  // Extra Narrow
window.logAspectRatioRange(1920, 1080) // Monitor Large
```

---

## Создание нового модального окна

### Шаблон

```typescript
import { calculateTieredFontSizeSimple } from '../utils/FontSizeCalculator';
import { snapToGrid, snapToGridDouble } from './ModalPositioningHelper';

export default class NewModal extends Phaser.GameObjects.Container {
    private background: NineSliceBackground;
    private closeButton: Button;
    private content: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, options: NewModalOptions) {
        super(scene, 0, 0);
        scene.add.existing(this);

        this.create();
    }

    private create(): void {
        this.createBackground();
        this.createContent();
        this.createCloseButton();
        this.setupPositioning();
    }

    private createBackground(): void {
        // Grid Snapping для размеров
        const width = snapToGridDouble(options.width);
        const height = snapToGridDouble(options.height);

        this.background = new NineSliceBackground(this.scene, width, height);
        this.add(this.background);
    }

    private createContent(): void {
        // Tiered Font System v3 (Бинарный поиск)
        const invZoom = 1 / this.scene.cameras.main.zoom;
        const nativeWidth = contentWidth / invZoom;
        const nativeHeight = contentHeight / invZoom;

        const fontSize = calculateTieredFontSizeSimple(
          nativeWidth,
          nativeHeight,
          options.longestText
        );

        this.content = this.scene.add.text(0, 0, options.text, {
            fontSize: `${fontSize}px`
        });
        this.content.setScale(invZoom);  // Компенсация зума
        this.add(this.content);
    }

    private createCloseButton(): void {
        this.closeButton = new Button(this.scene, {
            text: "×",
            onClick: () => this.close()
        });
        this.add(this.closeButton);
    }

    private setupPositioning(): void {
        // Центрирование по камере
        const cam = this.scene.cameras.main;
        this.setPosition(cam.midPoint.x, cam.midPoint.y);
    }

    public close(): void {
        UIManager.getInstance().closeModal(this);
    }

    public destroy(): void {
        // Cleanup
        this.closeButton.destroy();
        this.background.destroy();
        this.content.destroy();
        super.destroy();
    }
}
```

---

## Troubleshooting

### Модальное окно не центрируется

**Проверьте:**
1. Используется `snapToGridDouble` для размеров
2. Используется `snapToGrid` для координат
3. Позиция устанавливается через `setPosition(cam.midPoint.x, cam.midPoint.y)`

### Текст размыт

**Проверьте:**
1. `text.setScale(1 / camera.zoom)` применён
2. `text.setResolution()` установлен (обычно > 1)
3. Font size рассчитан через `FontSizeCalculator`

### Кнопка закрытия не на месте

**Проверьте:**
1. Размер модального окна кратен 8
2. Размер кнопки кратен 4
3. Позиция рассчитана правильно: `modalX + modalWidth / 2 - closeSize / 2`

### Модальное окно не закрывается

**Проверьте:**
1. UIManager знает об этом модале
2. `close()` вызывает `UIManager.closeModal(this)`
3. Нет blockers или locked state

### Шрифты слишком мелкие/крупные

**Проверьте:**
1. Используется `calculateTieredFontSizeSimple` (или изолированная копия)
2. Переданы нативные координаты (разделены на `invZoom`)
3. `longestText` содержит полный текст (для корректной wordWrap симуляции)
4. `LINE_HEIGHT_RATIO` в FontSizeCalculator.ts настроен правильно

---

## Связанные документы

- **UI_GUIDE.md** — Общее руководство по UI компонентам
- **SCALING_SYSTEM.md** — Система масштабирования и letterboxing
- **FONT_SIZING_SYSTEM.md** — Расчёт размеров шрифтов

---

## История изменений

### Версия 3.0 (2026-02-16)
- ✅ **ТИРОВАНАЯ СИСТЕМА ШРИФТОВ (Tiered Font System)** — бинарный поиск вместо адаптивных множителей
- ✅ **Убраны таблицы множителей** — автоматическая адаптация без FONT_SIZE_MULTIPLIERS
- ✅ **Обновлён шаблон модального окна** — использование calculateTieredFontSizeSimple
- ✅ **Актуализированы все секции** — соответствие коду v3

### Версия 2.0 (2026-02-06)
- ✅ **СИСТЕМА 7 ДИАПАЗОНОВ ASPECT RATIO** — вместо бинарной portrait/landscape
- ✅ **АДАПТИВНЫЕ МНОЖИТЕЛИ ШРИФТОВ** — разные для каждого диапазона (1.26–1.54)
- ⚠️ *Устарело в v3.0*

### Версия 1.0 (2026-01-28)
- Первичная документация
- Grid Snapping
- Lifecycle паттерны

---

| Дата | Версия | Изменение |
|------|--------|-----------|
| 2026-02-16 | 3.0 | Tiered Font System (бинарный поиск), убраны множители |
| 2026-02-06 | 2.0 | Система 7 диапазонов aspect ratio, адаптивные множители |
| 2026-01-28 | 1.0 | Первичная документация |
