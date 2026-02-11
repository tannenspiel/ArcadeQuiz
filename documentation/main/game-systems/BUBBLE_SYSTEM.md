# Система бабблов (QuestionBubble)

**Версия:** 1.0  
**Дата создания:** 2025-12-08  
**Статус:** Актуален

---

## Краткое описание

Система бабблов (`QuestionBubble`) — это UI-компонент для отображения вопросов и ответов непосредственно в игровом мире (World Space). Бабблы используются для показа глобальных вопросов Оракула и ответов порталов. 

> [!NOTE]
> Не путать с `CoinBubbleQuiz`, который является экранным интерфейсом (Screen Space) и не относится к данной системе.

---

## Содержание

1. [Обзор системы](#обзор-системы)
2. [Типы бабблов](#типы-бабблов)
3. [Архитектура](#архитектура)
4. [Компоненты](#компоненты)
5. [Интеграция с игровыми сущностями](#интеграция-с-игровыми-сущностями)
6. [Z-иерархия (Depth)](#z-иерархия-depth)
7. [Стилизация текста](#стилизация-текста)
8. [Анимации](#анимации)
9. [Константы и конфигурация](#константы-и-конфигурация)
10. [API и методы](#api-и-методы)

---

## Обзор системы

### Назначение

Бабблы используются для:
- **Оракул:** Отображение глобальных вопросов, которые появляются при активации Оракула
- **Порталы:** Отображение текста ответа после активации портала

### Основные возможности

- ✅ Поддержка двух типов бабблов (Oracle и Portal) с разными размерами
- ✅ Автоматический расчет размера шрифта на основе самого длинного текста
- ✅ Поддержка текстовых вопросов и вопросов с изображениями
- ✅ Анимация появления/исчезновения (fade in/out)
- ✅ Подсказки для пользователя (hint text) с циклической анимацией
- ✅ Управление видимостью через тап/клик по родительскому объекту
- ✅ Позиционирование относительно родительского спрайта (Oracle/Portal)
- ✅ Поддержка Tiled Map: точное позиционирование через объекты `PortalMsg` и `OracleMsg`
- ✅ Глобальный размер шрифта для всех бабблов (оптимизация производительности)

---

## Типы бабблов

### 1. Oracle Bubble (`'oracle'`)

**Текстура:** `BubbleMsg.Transparent152x56.png`  
**Размеры:**
- Ширина: 152px
- Высота: 56px
- Рабочая область для текста: 134×36px

**Использование:** Отображение глобальных вопросов Оракула

### 2. Portal Bubble (`'portal'`)

**Текстура:** `BubbleMsg.Transparent136x48.png`  
**Размеры:**
- Ширина: 136px
- Высота: 48px
- Рабочая область для текста: 118×28px

**Использование:** Отображение текста ответа портала после активации

---

## Архитектура

### Класс QuestionBubble

**Путь:** `src/game/ui/QuestionBubble.ts`

**Основные компоненты:**
- `bubbleSprite` — спрайт фона баббла
- `questionText` — текст вопроса/ответа
- `questionImage` — опциональное изображение вопроса
- `hintText` — текст подсказки для пользователя

### Глобальный размер шрифта

Система использует глобальный размер шрифта (`globalBubbleFontSize`), который рассчитывается один раз на основе самого длинного текста из всех вопросов уровня. Это обеспечивает:
- Единообразие размера шрифта во всех бабблах
- Оптимизацию производительности (расчет выполняется один раз)
- Автоматическую адаптацию под длину текста

**Функции управления:**
- `getGlobalBubbleFontSize()` — получить текущий глобальный размер
- `resetGlobalBubbleFontSize()` — сбросить для пересчета

---

## Компоненты

### 1. Спрайт баббла (`bubbleSprite`)

- **Тип:** `Phaser.GameObjects.Image`
- **Текстура:** Зависит от типа (`QUESTION_BUBBLE` или `PORTAL_QUESTION_BUBBLE`)
- **Масштаб:** `BASE_SCALE * ACTOR_SIZES.QUESTION_BUBBLE`
- **Depth:** `10` (максимальный слой)
- **Origin:** `(0.5, 0.5)` (центр)

### 2. Текст вопроса (`questionText`)

- **Тип:** `Phaser.GameObjects.Text`
- **Стиль:** Жирный, черный, без обводки
- **Выравнивание:** Центр (или право, если есть изображение)
- **Word wrap:** Автоматический перенос текста
- **Depth:** `10` (максимальный слой)

### 3. Изображение вопроса (`questionImage`)

- **Тип:** `Phaser.GameObjects.Image` (опционально)
- **Позиционирование:** Правая часть баббла (1/4 ширины)
- **Масштабирование:** Автоматическое под размер области
- **Depth:** `10` (максимальный слой)

### 4. Текст подсказки (`hintText`)

- **Тип:** `Phaser.GameObjects.Text`
- **Стиль:** Белый с черной обводкой
- **Позиционирование:** Под родительским объектом (Oracle/Portal)
- **Анимация:** Циклическая ping-pong (75% → 25% → 75%)
- **Depth:** `4` (выше кустов и травы, ниже предметов и персонажа)

---

## Интеграция с игровыми сущностями

### Oracle (Оракул)

**Путь:** `src/game/entities/Oracle.ts`

**Интеграция:**
- Баббл создается в методе `createQuestionBubble()`
- Управляется через методы:
  - `setQuestion()` — установка вопроса
  - `toggleQuestionBubble()` — переключение видимости
  - `showQuestionBubble()` — показать
  - `hideQuestionBubble()` — скрыть
  - `updateBubblePosition()` — обновление позиции

**Позиционирование:**
- Нижняя граница баббла совпадает с верхней границей Оракула
- Позиция обновляется при движении Оракула

### AbstractPortal (Портал)

**Путь:** `src/game/entities/portals/AbstractPortal.ts`

**Интеграция:**
- Баббл создается в методе `createLabels()`
- Показывается при активации портала (`setActivatedState()`)
- Скрывается при деактивации (`setBaseState()`)

**Позиционирование:**
- Нижняя граница баббла совпадает с верхней границей портала
- Отображает текст ответа портала

---

## Z-иерархия (Depth)

Бабблы имеют максимальный приоритет отображения:

```
Depth 10: Бабблы (bubbleSprite, questionText, questionImage)
Depth 9:  Персонаж (Player)
Depth 8:  Оракул (Oracle)
Depth 7:  Враги (Enemies)
Depth 5:  Предметы (Hearts, Keys)
Depth 4:  Подсказки (hintText)
Depth 3:  Кусты (Bushes)
Depth 2:  Названия (Oracle Label, Portal Labels)
Depth 1:  Трава (Grass)
Depth -100: Фон карты (mapBackground)
Depth -200: Тайловый фон (mapBackgroundTileSprite)
```

---

## Стилизация текста

### Текст вопроса/ответа

**Константы:** `src/constants/textStyles.ts`
- `BUBBLE_QUESTION_FONT_STYLE` — `BOLD` (жирный)
- `BUBBLE_QUESTION_COLOR` — `BLACK` (черный)
- `BUBBLE_QUESTION_STROKE_THICKNESS` — `0` (без обводки)

### Текст подсказки

**Константы:** `src/constants/textStyles.ts`
- `BUBBLE_HINT_COLOR` — `WHITE` (белый)
- `BUBBLE_HINT_STROKE` — `BLACK` (черная обводка)
- `BUBBLE_HINT_STROKE_THICKNESS` — `4` (толщина обводки)

---

## Анимации

### 1. Анимация прозрачности (Fade In/Out)

**Метод:** `animateOpacity(targetOpacity)`

**Параметры:**
- Длительность: `300ms`
- Easing: `Power2`
- Применяется к: `bubbleSprite`, `questionText`, `questionImage`

**Состояния:**
- `opacity: 0.0` — скрыт
- `opacity: 0.75` — видим (базовая непрозрачность)

### 2. Анимация подсказки (Ping-Pong)

**Метод:** `startHintTextAnimation()`

**Параметры:**
- Длительность цикла: `1500ms`
- Easing: `Sine.easeInOut`
- Диапазон: `0.75` → `0.25` → `0.75`
- Режим: `yoyo: true, repeat: -1` (бесконечное повторение)

---

## Константы и конфигурация

### Размеры бабблов

**Файл:** `src/constants/gameConstants.ts`

```typescript
export const BUBBLE_SIZES = {
    ORACLE: {
        WIDTH: 152,
        HEIGHT: 56,
        TEXT_AREA_WIDTH: 134,
        TEXT_AREA_HEIGHT: 36
    },
    PORTAL: {
        WIDTH: 136,
        HEIGHT: 48,
        TEXT_AREA_WIDTH: 118,
        TEXT_AREA_HEIGHT: 28
    }
}
```

### Смещения подсказок

**Файл:** `src/constants/gameConstants.ts`

```typescript
export const HINT_OFFSETS = {
    ORACLE_Y: 20,  // Смещение подсказки относительно нижней границы Оракула
    PORTAL_Y: 20   // Смещение подсказки относительно нижней границы портала
}
```

### Ключи текстур

**Файл:** `src/constants/gameConstants.ts`

```typescript
export const KEYS = {
    QUESTION_BUBBLE: 'question_bubble',           // Oracle bubble
    PORTAL_QUESTION_BUBBLE: 'portal_question_bubble' // Portal bubble
}
```

---

## API и методы

### Конструктор

```typescript
constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    quizManager?: QuizManager,
    currentLevel: number = 1,
    bubbleType: BubbleType = 'oracle'
)
```

### Основные методы

#### `setQuestion(questionData: ParsedQuestion, assetLoader: any): Promise<void>`

Устанавливает вопрос и опциональное изображение в баббл.

**Параметры:**
- `questionData` — данные вопроса (текст, изображение)
- `assetLoader` — загрузчик ресурсов для изображений

**Особенности:**
- Автоматически обрабатывает вопросы с изображениями (текст занимает 3/4 ширины, изображение — 1/4)
- Использует глобальный размер шрифта для единообразия

#### `toggleVisibility(): void`

Переключает видимость баббла (показ/скрытие с анимацией).

#### `show(): void`

Показывает баббл с анимацией fade in.

#### `hide(): void`

Скрывает баббл с анимацией fade out.

#### `setOpacity(value: number): void`

Устанавливает прозрачность мгновенно (без анимации).

#### `showHint(parentX: number, parentY: number, parentType: 'oracle' | 'portal'): void`

Показывает подсказку под родительским объектом.

**Параметры:**
- `parentX`, `parentY` — координаты родительского объекта
- `parentType` — тип родителя ('oracle' или 'portal')

**Тексты подсказок:**
- Oracle: "Тапни, чтобы показать/спрятать вопрос"
- Portal: "Тапни, чтобы показать/спрятать ответ"

#### `updatePosition(x: number, y: number): void`

Обновляет позицию баббла и всех его элементов.

#### `updateHintPosition(parentX: number, parentY: number, parentType: 'oracle' | 'portal'): void`

Обновляет позицию подсказки относительно родительского объекта.

#### `getBounds(): Phaser.Geom.Rectangle`

Возвращает границы баббла для проверки пересечений.

#### `destroy(): void`

Уничтожает баббл и все его компоненты, останавливает анимации.

### Геттеры

- `getIsVisible(): boolean` — проверка видимости
- `getX(): number` — текущая X координата
- `getY(): number` — текущая Y координата
- `getHintText(): Phaser.GameObjects.Text | undefined` — получить текст подсказки

---

## Примеры использования

### Создание баббла для Оракула

```typescript
// В Oracle.createQuestionBubble()
const bubbleY = calculateBubbleY(oracleY, 'oracle', 'oracle');
this.questionBubble = new QuestionBubble(
    this.scene,
    oracleX,
    bubbleY,
    quizManager,
    currentLevel,
    'oracle'
);
```

### Установка вопроса

```typescript
// В Oracle.setQuestion()
await this.questionBubble.setQuestion(questionData, assetLoader);
this.questionBubble.show();
this.questionBubble.showHint(this.sprite.x, this.sprite.y, 'oracle');
```

### Переключение видимости

```typescript
// В MainScene (обработчик клика по Оракулу)
this.oracle.toggleQuestionBubble();
```

---

## Тестирование

**Путь:** `src/tests/unit/ui/QuestionBubble.test.ts`

**Покрытие:**
- Создание бабблов разных типов
- Установка вопросов (текст, текст + изображение)
- Управление видимостью (show/hide/toggle)
- Позиционирование
- Подсказки
- Уничтожение

**Запуск тестов:**
```bash
npm test -- src/tests/unit/ui/QuestionBubble.test.ts
```

**Сохранение результатов:**
```bash
npm run test:bubble:save
```

---

---

## Coin Bubble Quiz (CoinBubbleQuiz)

> [!IMPORTANT]
> `CoinBubbleQuiz` — это отдельная система от `QuestionBubble`. Это **Screen Space UI** для викторины при сборе монет.

### Назначение

Бабблы монеток используются для:
- **Викторина при сборе монет:** Показ двух вариантов утверждений (одно верное, одно ложное)
- **Клик по бабблу:** Игрок выбирает правильный ответ

### Основные отличия от QuestionBubble

| Характеристика | QuestionBubble | CoinBubbleQuiz |
|----------------|----------------|----------------|
| **Пространство** | World Space | Screen Space |
| **setScrollFactor** | Следует за камерой | `0` (фиксирован на экране) |
| **Текстура** | Image (PNG) | 9-slice (`ui_coin_bubble`) |
| **Размер** | Фиксированный (152×56 / 136×48) | Адаптивный (95%×1/5 modal size) |
| **Кол-во бабблов** | 1 (Oracle/Portal) | 2 (верный+ложный ответ) |
| **Font Calculator** | `calculateOptimalBaseFontSize` с maxSize=25 | `calculateButtonFontSize` (40px) |

### Размеры и позиционирование

**Путь:** `src/game/ui/CoinBubbleQuiz.ts`

**Размеры баббла:**
```typescript
// Размеры рассчитываются от модального окна
const bubbleBtnWidth = modalSize.width * 0.95;  // 95% ширины модального окна
const bubbleBtnHeight = modalSize.height / 5;   // 1/5 высоты модального окна

// Позиционирование: два баббла вертикально по центру экрана
const bubble1Y = centerY - bubbleBtnHeight / 2 - gap / 2;  // Верхний
const bubble2Y = centerY + bubbleBtnHeight / 2 + gap / 2;  // Нижний
```

**Текст и шрифт:**
```typescript
// Используем calculateButtonFontSize для кнопочного текста (40px если влезает)
const fontSize = calculateButtonFontSize(
  scene,
  bubbleAvailableWidth,   // bubbleBtnWidth - 40
  bubbleAvailableHeight,  // bubbleBtnHeight - 20
  bubble1Text,
  40  // MAX_OPTIMAL_FONT_SIZE
);
```

### 9-Slice Rendering

Бабблы монеток используют 9-slice текстуру для растягивания:
- **Текстура:** `ui_coin_bubble` (30×30px, сетка 3×3, tile 10×10)
- **Растягивание:** `useStretch: true` для кнопок
- **Класс:** `NineSliceBackground`

### Стейт-менеджмент

```typescript
// Guard от множественных экземпляров
private static activeQuiz: CoinBubbleQuiz | null = null;
private isInitializing: boolean = false;
private isAnswered: boolean = false;
```

### Поток работы

1. Игрок касается монеты → физика паузится
2. Загружаются случайные true/false утверждения из `questions/level1.coin-quiz.json`
3. Создаются два баббла (верный ответ случайно в верхнем или нижнем)
4. Игрок кликает баббл → событие `COIN_QUIZ_COMPLETED`
5. Бабблы исчезают, физика резюмится

### Связанные файлы

- `src/game/ui/CoinBubbleQuiz.ts` — основной компонент
- `src/game/scenes/quiz/CoinQuizHandler.ts` — обработчик викторины
- `src/assets/Game_01/questions/level1.coin-quiz.json` — вопросы для монеток

---

## История изменений

### Версия 1.1 (2026-02-03)

- ✅ Добавлена секция про CoinBubbleQuiz (монеточные бабблы)
- ✅ Обновлен размер шрифта с `calculateBaseFontSize` на `calculateButtonFontSize` (40px)
- ✅ Увеличен размер бабблов: width 90%→95%, height 1/7→1/5
- ✅ Документация различий между QuestionBubble и CoinBubbleQuiz

### Версия 1.0 (2025-12-08)

- ✅ Создана система бабблов с поддержкой двух типов
- ✅ Интеграция с Oracle и Portal
- ✅ Автоматический расчет размера шрифта
- ✅ Поддержка вопросов с изображениями
- ✅ Анимации появления/исчезновения
- ✅ Подсказки с циклической анимацией
- ✅ Управление через тап/клик
- ✅ Настроена Z-иерархия
- ✅ Стилизация текста (черный жирный для вопросов, белый с обводкой для подсказок)
- ✅ Документация

---

## Связанные документы

- [ProjectMap.md](ProjectMap.md) — карта проекта
- [ARCHITECTURE.md](ARCHITECTURE.md) — архитектура проекта
- [TESTING.md](TESTING.md) — руководство по тестированию













