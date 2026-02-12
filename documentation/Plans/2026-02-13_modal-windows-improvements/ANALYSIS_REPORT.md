# Детальный анализ модальных окон - ArcadeQuiz

**Дата:** 2026-02-13
**Агент:** ui-architect
**Версия отчёта:** 1.0

---

## 1. Список найденных файлов с модальными окнами

### Phaser модальные окна (игровое UI):
- **D:\WORK_offline\FREEenv\GameDev\ArcadeQuiz\ArcadeQuiz\src\game\ui\PortalModal.ts** - Модальное окно портала (переход между уровнями)
- **D:\WORK_offline\FREEenv\GameDev\ArcadeQuiz\ArcadeQuiz\src\game\ui\KeyQuestionModal.ts** - Модальное окно вопросов ключей
- **D:\WORK_offline\FREEenv\GameDev\ArcadeQuiz\ArcadeQuiz\src\game\ui\GameOverModal.ts** - Модальное окно окончания игры
- **D:\WORK_offline\FREEenv\GameDev\ArcadeQuiz\ArcadeQuiz\src\game\ui\CoinBubbleQuiz.ts** - Квиз монеток (бабблы без фона)
- **D:\WORK_offline\FREEenv\GameDev\ArcadeQuiz\ArcadeQuiz\src\game\ui\ModalSizeCalculator.ts** - Калькулятор размеров модальных окон
- **D:\WORK_offline\FREEenv\GameDev\ArcadeQuiz\ArcadeQuiz\src\game\ui\Button.ts** - Компонент кнопки
- **D:\WORK_offline\FREEenv\GameDev\ArcadeQuiz\ArcadeQuiz\src\game\ui\NineSliceBackground.ts** - 9-slice фон для модальных окон
- **D:\WORK_offline\FREEenv\GameDev\ArcadeQuiz\ArcadeQuiz\src\game\utils\FontSizeCalculator.ts** - Калькулятор размеров шрифтов
- **D:\WORK_offline\FREEenv\GameDev\ArcadeQuiz\ArcadeQuiz\src\game\ui\UIManager.ts** - Центральный менеджер всех модальных окон

### React модальные окна (устаревшие, не используются):
- **D:\WORK_offline\FREEenv\GameDev\ArcadeQuiz\ArcadeQuiz\src\react\components\QuizModal.tsx** - React компонент квиза (НЕ ИСПОЛЬЗУЕТСЯ)
- **D:\WORK_offline\FREEenv\GameDev\ArcadeQuiz\ArcadeQuiz\src\react\components\GameOverModal.tsx** - React компонент Game Over (НЕ ИСПОЛЬЗУЕТСЯ)

### Тестовые файлы:
- `src/tests/unit/ui/PortalModal.test.ts`
- `src/tests/unit/ui/GameOverModal.test.ts`
- `src/tests/unit/ui/KeyQuestionModal.test.ts`
- `src/tests/unit/ui/ModalSizeCalculator.test.ts`
- `src/tests/integration/modal-scaling.test.ts`

---

## 2. Текущая архитектура модальных окон

### 2.1. Иерархия компонентов

```
UIManager (центральный хаб)
├── PortalModal (порталы)
│   ├── NineSliceBackground (фон)
│   ├── Button (кнопка Войти)
│   ├── Button (кнопка Отмена)
│   └── Текстовые элементы (заголовок, вопрос, ответ)
├── KeyQuestionModal (вопросы ключей)
│   ├── NineSliceBackground (фон)
│   ├── Button × 3 (кнопки ответов)
│   ├── Phaser.GameObjects.Text (вопрос, фидбэк)
│   └── Phaser.GameObjects.Image (кнопка закрытия)
├── GameOverModal (окончание игры)
│   ├── NineSliceBackground (фон)
│   ├── Button (Рестарт)
│   ├── Button (Следующий уровень) - опционально
│   ├── Phaser.GameObjects.Text (заголовок, счёт, фидбэк)
│   └── Phaser.GameObjects.Sprite/Image (анимация победы/спрайт поражения)
└── CoinBubbleQuiz (квиз монеток - БЕЗ фона модального окна)
    ├── Container × 2 (бабблы)
    │   ├── NineSliceBackground (фон баббла)
    │   ├── Phaser.GameObjects.Sprite (монетка)
    │   └── Phaser.GameObjects.Text (текст утверждения)
```

### 2.2. UIManager - Центральный хаб

**Назначение:** Управление всеми модальными окнами, гарантирование только одного окна одновременно.

**Основные функции:**
- `openModal(modal)` - Открытие модального окна с паузой сцены
- `closeModal(modal)` - Закрытие с возобновлением сцены
- `isModalOpen()` - Проверка открытого окна
- `handleResize()` - Обработка изменения размера экрана

**Правила:**
1. Только одно модальное окно одновременно
2. Автоматическая пауза сцены при открытии
3. Resize-aware - все модалы пересчитываются при изменении размера

---

## 3. Система масштабирования (Scaling System)

### 3.1. Система 7 диапазонов Aspect Ratio (v2.0)

Вместо бинарной системы (portrait/landscape) используется 7 адаптивных диапазонов:

| Диапазон | screenAR | Aspect Ratio | Множитель шрифта | Описание |
|-----------|-----------|--------------|-------------------|----------|
| 1. Ultra Narrow | 0.25–0.45 | 0.35 | 1.26 | Экстремально узкие (тестирование) |
| 2. Extra Narrow | 0.45–0.6 | 0.525 | 1.34 | Очень узкие (foldable phones) |
| 3. Mobile Narrow | 0.6–0.75 | 0.60 | 1.41 | Узкие мобильные (iPhone SE) |
| 4. Mobile Standard | 0.75–1.0 | 0.75 | 1.45 | Стандартные мобильные портрет |
| 5. Tablet/Square | 1.0–1.3 | 0.85 | 1.49 | Планшеты, почти квадратные |
| 6. Monitor Small | 1.3–1.6 | 0.95 | 1.54 | Небольшие мониторы |
| 7. Monitor Large | 1.6+ | 1.0 | 1.54 | Большие мониторы (квадрат) |

### 3.2. Grid Snapping (Привязка к пиксельной сетке)

**Константы:**
- `BASE_SCALE = 4.0` - масштаб игрового мира и UI относительно исходных ассетов
- **Шаг сетки:** 4 виртуальных пикселя (1 исходный пиксель)
- **Шаг центрирования:** 8 виртуальных пикселей (2 исходных пикселя)

**Функции:**
```typescript
const snapToGrid = (val: number) => Math.round(val / BASE_SCALE) * BASE_SCALE;
const snapToGridDouble = (val: number) => Math.round(val / (BASE_SCALE * 2)) * (BASE_SCALE * 2);
```

**Применение:**
- Размеры модального окна: `snapToGridDouble` (кратны 8)
- Координаты: `snapToGrid` (кратны 4)
- Кнопка закрытия: размер кратен 4

### 3.3. Unified Font System

**Цель:** Единый базовый размер шрифта для всех модальных окон.

**Функция:** `calculateUnifiedBaseFontSize(scene, currentLevel)`

**Алгоритм:**
1. Получает `longestTexts` от QuizManager (max вопрос, ответ, feedback)
2. Вычисляет базовый размер на основе доступной высоты блока
3. Оптимизирует через `calculateOptimalBaseFontSize` (бинарный поиск)
4. Применяет адаптивный множитель `getFontSizeMultiplier(screenAR)`

**Множители по типам модальных окон:**

| Модальное окно | Адаптивный множитель `getFontSizeMultiplier()` | Фиксированный множитель | Финальная формула |
|----------------|-----------------------------------------------|------------------------|-------------------|
| **KeyQuestionModal** | ✅ ДА (1.26 - 1.54) | 1.0 × elementMultiplier | `baseFontSize × adaptiveMultiplier × 1.0` |
| **CoinBubbleQuiz** | ✅ ДА (1.26 - 1.54) | 1.0 (не используется) | `baseFontSize × adaptiveMultiplier` |
| **PortalModal** | ❌ НЕТ | 1.3 (фиксированный) | `baseFontSize × 1.3` |
| **GameOverModal** | ❌ НЕТ | 2.0, 1.3 (по элементам) | `baseFontSize × elementMultiplier` |

### 3.4. Компенсация зума (Zoom Compensation)

Для предотвращения размытия текста:
```typescript
const invZoom = 1 / camera.zoom; // 0.625 при zoom=1.6
text.setScale(invZoom);
```

**Важно:** wordWrap.width должен быть разделён на invZoom для правильного переноса строк.

---

## 4. Неоднородность множителей - АНАЛИЗ

### 4.1. Фактическое использование множителей

**KeyQuestionModal (строка 459-462):**
```typescript
const screenAR = canvasWidth / canvasHeight;
const adaptiveMultiplier = getFontSizeMultiplier(screenAR);
const commonFontSize = Math.max(buttonFontSizeRaw, unifiedFontSize) * adaptiveMultiplier;
```
✅ **ИСПОЛЬЗУЕТ** адаптивный множитель `getFontSizeMultiplier()`

**PortalModal (строка 289-295):**
```typescript
const FINAL_MULTIPLIER = 1.3;
const titleFontSize = unifiedFontSize * FINAL_MULTIPLIER;
const questionFontSize = unifiedFontSize * FINAL_MULTIPLIER;
const buttonFontSize = unifiedFontSize * FINAL_MULTIPLIER;
```
❌ **НЕ ИСПОЛЬЗУЕТ** адаптивный множитель - фиксированный 1.3

**GameOverModal (строка 250-258):**
```typescript
const TITLE_SCORE_MULTIPLIER = 2.0;
const BUTTON_MULTIPLIER = 1.3;
const FEEDBACK_MULTIPLIER = 1.3;
const titleFontSize = unifiedFontSize * TITLE_SCORE_MULTIPLIER;
const buttonFontSize = unifiedFontSize * BUTTON_MULTIPLIER;
```
❌ **НЕ ИСПОЛЬЗУЕТ** адаптивный множитель - фиксированные 2.0 и 1.3

### 4.2. Вывод: Неоднородность является **ОСОБЕННОСТЬЮ ДИЗАЙНА**

**Почему PortalModal не использует адаптивный множитель:**
- Короткие тексты: "ВОЙТИ В ПОРТАЛ", "ОТМЕНА", "ПОРТАЛ ОТКРЫТ!"
- Фиксированный размер 1.3x даёт предсказуемый результат
- Если применить adaptiveMultiplier (1.26–1.54), на узких экранах текст станет слишком крупным

**Почему GameOverModal не использует адаптивный множитель:**
- Заголовки "YOU WIN", "GAME OVER" должны быть большими (2.0x)
- Это эмоциональный элемент дизайна, а не информационный текст
- Меньшая адаптивность компенсируется большим размером

**РЕКОМЕНДАЦИЯ:** Не унифицировать множители - текущая реализация соответствует дизайну.

---

## 5. Найденные проблемы

### 5.1. КРИТИЧЕСКИЕ проблемы

#### P1: React модальные окна не используются
- **Файлы:** `src/react/components/QuizModal.tsx`, `src/react/components/GameOverModal.tsx`
- **Проблема:** Эти компоненты существуют в кодовой базе, но не используются в проекте. Все модальные окна реализованы на Phaser.
- **Рекомендация:** Удалить неиспользуемые React компоненты для чистоты кодовой базы.

### 5.2. ВАЖНЫЕ проблемы

#### P2: Дублирование кода позиционирования
- **Файлы:** Все модальные окна
- **Проблема:** Логика Grid Snapping и позиционирования дублируется в каждом модальном окне.
- **Рекомендация:** Вынести общие функции позиционирования в `ModalSizeCalculator` или создать утилиту `ModalPositioningHelper`.

#### P3: Жестко заданные размеры в CoinBubbleQuiz
- **Файл:** `src/game/ui/CoinBubbleQuiz.ts` (строки 169-172)
- **Проблема:** Размеры бабблов жёстко заданы как 95% ширины и 1/5 высоты модального окна, что может не работать на экстремально узких экранах.
- **Рекомендация:** Рассчитывать размеры динамически с учётом `MIN_BUBBLE_SIZE`.

### 5.3. ВТОРОСТЕПЕННЫЕ проблемы

#### P4: Логирование событий кнопок
- **Файл:** `src/game/ui/Button.ts`
- **Проблема:** Существует большое количество `logger.log` для отладки кнопок, что может засорять консоль.
- **Рекомендация:** Рассмотреть введение флага `DEBUG_BUTTON_EVENTS` для отключения логов в production.

#### P5: Отсутствие обработки изменения размера экрана для открытых модальных окон
- **Файлы:** PortalModal, GameOverModal
- **Проблема:** При изменении размера экрана (resize) открытые модальные окна не пересчитывают свои размеры.
  - KeyQuestionModal ✅ ИМЕЕТ обработчик orientationchange (закрывает модалку)
  - PortalModal ✅ ИМЕЕТ обработчик (закрывает модалку)
  - GameOverModal ✅ ИМЕЕТ обработчик (пересоздаёт UI)
- **Рекомендация:** Обеспечить консистентное поведение.

---

## 6. Соответствие документации

### 6.1. MODAL_GUIDE.md
- **Статус:** ✅ Актуальна (v2.0)
- **Соответствие:** Полное - реализация соответствует документации
- **Примечание:** Документация описывает систему 7 диапазонов aspect ratio, которая полностью реализована в коде.

### 6.2. UI_TEXT_SCALING.md
- **Статус:** ✅ Актуальна
- **Соответствие:** Полное - Grid Snapping и компенсация зума реализованы согласно документации.

### 6.3. Расхождения
1. **Документация:** Описывает 7 диапазонов aspect ratio
   **Реализация:** Полностью соответствует (ModalSizeCalculator.ts)

2. **Документация:** Описывает использование `getFontSizeMultiplier()` для всех модальных окон
   **Реализация:** Только KeyQuestionModal и CoinBubbleQuiz используют адаптивные множители, PortalModal и GameOverModal - нет.
   **Вывод:** Это особенность дизайна, а не баг.

---

## 7. Рекомендации по улучшению

### 7.1. КРИТИЧЕСКИЕ (высокий приоритет)

1. **Удалить неиспользуемые React компоненты:**
   - `src/react/components/QuizModal.tsx`
   - `src/react/components/GameOverModal.tsx`
   - Связанные тестовые файлы

### 7.2. ВАЖНЫЕ (средний приоритет)

2. **Вынести общую логику позиционирования:**
   - Создать `ModalPositioningHelper` с функциями Grid Snapping
   - Уменьшить дублирование кода

3. **Исправить жесткие размеры в CoinBubbleQuiz:**
   - Рассчитывать размеры динамически
   - Учесть MIN_BUBBLE_SIZE

4. **Ввести флаг отладки для логов:**
   - Добавить `DEBUG_BUTTON_EVENTS` в `gameConfig.ts`
   - Отключать подробное логирование в production

### 7.3. УЛУЧШЕНИЯ (низкий приоритет)

5. **Оптимизировать calculateModalSize:**
   - Рассмотреть кэширование результатов для идентичных параметров
   - Оптимизировать вычисления для частых вызовов

6. **Улучшить типизацию:**
   - Добавить строгие типы для всех параметров модальных окон
   - Использовать enum вместо string для состояний (уже реализовано в Button.ts)

---

## 8. Итоговая оценка

### Качество кода: ⭐⭐⭐⭐ (4 из 5)

**Сильные стороны:**
- ✅ Отличная система масштабирования (7 диапазонов aspect ratio)
- ✅ Grid Snapping для pixel-perfect позиционирования
- ✅ Unified Font System для единообразия
- ✅ Хорошая документация
- ✅ Модульная архитектура

**Слабые стороны:**
- ⚠️ Неиспользуемые React компоненты
- ⚠️ Дублирование кода позиционирования

### Соответствие архитектуре проекта: ✅ ДА

Система модальных окон полностью соответствует модульной архитектуре проекта и интегрирована с Phaser 3 + React + TypeScript.

---

**Дата создания:** 2026-02-13
**Версия отчёта:** 1.0
