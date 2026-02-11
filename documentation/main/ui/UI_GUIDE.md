# UI Guide - Руководство по пользовательскому интерфейсу

**Версия:** 1.0
**Дата создания:** 2026-01-28
**Назначение:** Комплексное руководство по UI компонентам, масштабированию и позиционированию
**Затронутые файлы:**
- `src/game/ui/Button.ts`
- `src/game/ui/NineSliceBackground.ts`
- `src/game/ui/KeyQuestionModal.ts`
- `src/game/ui/UIManager.ts`
- `src/game/utils/FontSizeCalculator.ts`

---

## Часть 1: Grid Snapping (Привязка к пиксельной сетке)

### Концепция

Все элементы интерфейса (модальные окна, кнопки, иконки) должны быть выровнены по виртуальной пиксельной сетке, определяемой `BASE_SCALE`.

**Константы:**
- `BASE_SCALE = 4.0` — масштаб игрового мира и UI относительно исходных ассетов
- **Шаг сетки:** 4 виртуальных пикселя (1 исходный пиксель)
- **Шаг центрирования:** 8 виртуальных пикселей (2 исходных пикселя)

### Реализация

В `KeyQuestionModal.ts` и других UI компонентах:

```typescript
// Округление до ближайшего целого пикселя исходного разрешения (шаг 4)
const snapToGrid = (val: number) => Math.round(val / BASE_SCALE) * BASE_SCALE;

// Округление до 2-х пикселей (шаг 8), для корректного центрирования
const snapToGridDouble = (val: number) => Math.round(val / (BASE_SCALE * 2)) * (BASE_SCALE * 2);
```

### Применение для кнопки закрытия

Для идеального позиционирования:
1. Размеры модального окна округляются через `snapToGridDouble` (кратны 8)
2. Координаты модального окна округляются через `snapToGrid` (кратны 4)
3. Размер кнопки закрытия кратен 4 (например, 14 * 4 = 56)
4. **Результат:** Формула `modalX + modalWidth / 2 - closeSize / 2` гарантированно даёт целое число, кратное 4

**Ассет кнопки закрытия:** `UI.DialogClose_14x14.png` (без внутренних отступов)

---

## Часть 2: Масштабирование текста (Text Scaling)

### Проблема размытия

При масштабировании canvas браузером или зуме камеры стандартный текст Phaser может размываться.

### Решение: Pixel-Perfect Rendering

1. Текстовые объекты создаются с `fontSize`, рассчитанным для конкретного контейнера
2. Применяется **компенсация зума**:
   ```typescript
   textObj.setScale(1 / camera.zoom);
   ```
   Это делает текст визуально одинакового размера, но рендерит его в высоком разрешении
3. Устанавливается `setResolution(textResolution)` (обычно > 1)

### Перенос строк в кнопках (Button WordWrap)

**Проблема:** Свойство `wordWrap.width` в Phaser применяется к *немасштабированному* тексту. При зуме `0.5` текст увеличивается в 2 раза и вылезает за границы.

**Решение:** Ширина переноса должна быть **умножена на зум**:

```typescript
const zoom = this.scene.cameras.main.zoom;
const wordWrapWidth = (this.width * 0.95) * zoom; // 0.95 - коэффициент безопасности

this.text = this.scene.add.text(..., {
   wordWrap: { width: wordWrapWidth, useAdvancedWrap: true }
});
this.text.setScale(1 / zoom);
```

---

## Часть 3: Button System (Кнопки)

**Файл:** `src/game/ui/Button.ts`

Класс `Button` — универсальный компонент для всех интерактивных элементов UI.

### Архитектура кнопки

Кнопка состоит из следующих слоев (от нижнего к верхнему):

| Слой | Тип | Назначение |
|------|-----|------------|
| **Background** | Rectangle / NineSliceBackground | Фон кнопки |
| **Glow Overlay** | Graphics (опционально) | Свечение в состоянии BLINKING |
| **Text** | Text | Основной текст кнопки |
| **Feedback Text** | Text (опционально) | Текст обратной связи (устаревший) |

### Состояния кнопки (ButtonState)

| Состояние | Описание | Визуализация |
|-----------|----------|--------------|
| `NORMAL` | Обычное состояние | Базовый цвет / Белый тинт |
| `HOVER` | Наведение мыши | Осветление |
| `ACTIVE` | Нажатие | Затемнение / Зелёный |
| `DISABLED` | Отключена | Тёмно-серый, не кликабельна |
| `BLINKING` | Мигание (подсказка) | База NORMAL + Пульсирующее золотое свечение |
| `WRONG` | Ошибка | Красный цвет |
| `CORRECT` | Правильный ответ | Ярко-зелёный цвет |

### Механика мигания (Blinking)

**Текущая реализация:**

```typescript
private createGlowBackground(): void {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffaa00, 1); // Золотисто-оранжевый
    graphics.fillRoundedRect(0, 0, w, h, cornerRadius);
    this.glowBackground = graphics;
    this.glowBackground.setBlendMode(Phaser.BlendModes.ADD);
}

// Мигание через пульсацию alpha
this.blinkTween = this.scene.tweens.add({
    targets: this.glowBackground,
    alpha: { from: 0, to: 0.8 },
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
});
```

**Почему Graphics + ADD blend mode:**
- `ADD` поверх обычной кнопки создаёт эффект свечения
- Использование `Graphics` гарантирует корректный рендеринг режима наложения
- Отброшенные варианты: Tint Tween (затемнял), Cloned NineSlice (неработоспособен)

---

## Часть 4: NineSliceBackground

**Файл:** `src/game/ui/NineSliceBackground.ts`

Кастомная реализация 9-slice (растягиваемого) фона.

**Характеристики:**
- Тип: `Phaser.GameObjects.Container`
- Структура: 9 отдельных `Image` или `TileSprite` (углы, стороны, центр)
- **Особенность:** Методы `setAlpha`, `setTint`, `setBlendMode` реализованы вручную через итерацию детей

---

## Часть 5: Модальные окна

### KeyQuestionModal

**Файл:** `src/game/ui/KeyQuestionModal.ts`

Окно, отображающее вопрос при подборе ключа.

#### Логика двойного клика (Double Click Logic)

Для предотвращения случайных нажатий:

**Правильный ответ:**
1. **Первое нажатие:**
   - Кнопка → состояние `CORRECT` (Зелёная)
   - Появляется текст "Нажмите еще раз для подтверждения"
   - Остальные кнопки блокируются
2. **Второе нажатие на ТУ ЖЕ кнопку:**
   - Ответ засчитывается
   - Запускается анимация победы

**Неправильный ответ:**
- Срабатывает сразу (без подтверждения)
- Кнопка → состояние `WRONG` (Красная)
- Показывается правильный ответ (мигающая кнопка)
- Через задержку окно закрывается

### Другие модальные окна

- **PortalModal** — `src/game/ui/PortalModal.ts`
- **GameOverModal** — `src/game/ui/GameOverModal.ts`

---

## Часть 6: UIManager

**Файл:** `src/game/ui/UIManager.ts`

Центральный хаб управления всеми модальными окнами.

**Функции:**
- Гарантирует, что открыто только одно окно
- Управляет паузой сцены (`scene.pause()` / `resume()`)
- Обрабатывает `resize` событий экрана

---

## Часть 7: FontSizeCalculator

**Файл:** `src/game/utils/FontSizeCalculator.ts`

Утилита для расчёта оптимального размера шрифта.

### Методы

| Метод | Назначение |
|-------|------------|
| `calculateOptimalBaseFontSize()` | Бинарный поиск максимального влезающего шрифта |
| `calculateBaseFontSize()` | Проверка, влезает ли дефолтный размер |
| `calculateButtonFontSize()` | Расчёт для кнопок |
| `calculateUnifiedBaseFontSize()` | Единый базовый размер для всех модальных элементов |

### Unified Font System

Единый `baseFontSize` для всех элементов модального окна:
- Текст вопроса: `baseFontSize`
- Текст кнопок: `baseFontSize`
- Заголовки: `baseFontSize * TITLE_MULTIPLIER`

---

## Часть 8: Ассеты UI

### Кнопка закрытия

- **Файл:** `UI.DialogClose_14x14.png`
- **Размер:** 14x14 пикселей (исходный)
- **Особенности:** Текстура занимает всю площадь, без прозрачных полей

### Конфигурация

```typescript
// spritesheetConfigs.ts
{
  load: {
    key: 'ui_dialog_close',
    path: 'UI.DialogClose_14x14.png',
    frameWidth: 14,
    frameHeight: 14,
  }
}
```

---

## Часть 9: Best Practices

### При создании новых кнопок

1. Используйте Grid Snapping для позиционирования
2. Применяйте `setScale(1 / zoom)` для текста
3. Умножайте `wordWrap.width` на zoom
4. Используйте коэффициент безопасности 0.95 для отступов

### При создании модальных окон

1. Размеры окна округляйте через `snapToGridDouble` (кратны 8)
2. Координаты округляйте через `snapToGrid` (кратны 4)
3. Используйте `FontSizeCalculator` для расчёта шрифтов
4. Применяйте Unified Font System

### Производительность

1. Останавливайте tweens при уничтожении объектов
2. Уничтожайте Graphics объекты при закрытии модалок
3. Используйте object pooling для часто создаваемых элементов

---

## Связанные документы

- **SCALING_SYSTEM.md** — Детальная система масштабирования и letterboxing
- **FONT_SIZING_SYSTEM.md** — Технические детали расчёта шрифтов
- **DEBUGGING.md** — Отладка UI компонентов

---

## История изменений

| Дата | Версия | Изменение |
|------|--------|-----------|
| 2026-01-28 | 1.0 | Слияние UI_TEXT_SCALING и UI_COMPONENTS в единый гайд |
