# Система масштабирования игрового окна и Letterboxing

**Версия:** 4.3  
**Дата создания:** 2025-01-27  
**Последнее обновление:** 2025-12-05  
**Назначение:** Полное описание системы масштабирования для анализа LLM, включая реализованную систему закрытия letterboxing, адаптивное виртуальное разрешение, динамический зум камеры, поддержку поворота экрана с автоматическим центрированием canvas

---

## Оглавление

1. [Обзор системы масштабирования](#обзор-системы-масштабирования)
2. [Архитектура масштабирования](#архитектура-масштабирования)
3. [Ключевые файлы и их роли](#ключевые-файлы-и-их-роли)
4. [Виртуальное разрешение](#виртуальное-разрешение)
5. [Масштабирование игрового мира](#масштабирование-игрового-мира)
6. [Система камеры](#система-камеры)
7. [Поведение карты](#поведение-карты)
8. [Letterboxing и адаптация к экранам](#letterboxing-и-адаптация-к-экранам)
9. [Поток выполнения](#поток-выполнения)
10. [Детальный анализ Letterboxing для LLM](#детальный-анализ-letterboxing-для-llm)
11. [Тестирование системы масштабирования](#тестирование-системы-масштабирования)
12. [Будущие улучшения](#будущие-улучшения)

**Связанная документация:**
- `../ui/MODAL_GUIDE.md` - Руководство по модальным окнам
- `../ui/UI_TEXT_SCALING.md` - Grid Snapping и масштабирование текста в UI
- `../ui/FONT_SIZING_SYSTEM.md` - Система размеров шрифтов
- `GRAPHICS_SCALING.md` - Правила масштабирования графики (спрайты, UI)

---

## Обзор системы масштабирования

### Концепция

Игра использует **трехуровневую систему масштабирования**:

1. **Адаптивное виртуальное разрешение экрана** - высота фиксирована (BASE_GAME_HEIGHT = 1280), ширина вычисляется динамически на основе соотношения сторон экрана
2. **Базовое масштабирование игрового мира** (BASE_SCALE = 4.0) - масштабирование всех игровых объектов
3. **Динамический зум камеры** - автоматическая настройка зума для фиксации размера игрока на экране

### Ключевые принципы

- **Адаптивный виртуальный экран:** Высота фиксирована (1280), ширина вычисляется как `BASE_GAME_HEIGHT * aspect`, ограничена MIN_GAME_WIDTH (360) и MAX_GAME_WIDTH (2560)
- **Phaser.Scale.FIT:** Автоматически масштабирует виртуальный экран на реальный экран с сохранением пропорций
- **Закрытие letterboxing:** Расширенный фон (TileSprite) заполняет области letterboxing, создавая визуально бесшовный фон
- **Динамический зум камеры:** Камера автоматически настраивает зум так, чтобы игрок всегда занимал фиксированный процент высоты экрана (PLAYER_HEIGHT_PERCENT = 0.08)
- **Игровой мир:** Карта и акторы масштабируются через BASE_SCALE (4.0) от базовых размеров до виртуальных
- **Поддержка поворота экрана:** Автоматическая пересчет виртуального разрешения при изменении ориентации устройства

---

## Архитектура масштабирования

### Схема работы

```
┌─────────────────────────────────────────────────────────────┐
│                    РЕАЛЬНЫЙ ЭКРАН УСТРОЙСТВА                 │
│              (любое разрешение, например 1920×1080)          │
└───────────────────────┬─────────────────────────────────────┘
                        │ Phaser.Scale.FIT
                        │ (масштабирование с сохранением пропорций)
                        │ + window.visualViewport (для мобильных)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│        АДАПТИВНЫЙ ВИРТУАЛЬНЫЙ ЭКРАН (BASE_GAME_HEIGHT × aspect)│
│         Высота: 1280 (фиксирована)                            │
│         Ширина: 1280 * aspect (360-2560, ограничена)         │
│         Пример: 1920×1080 → ~2275×1280 (на ultrawide)         │
└───────────────────────┬─────────────────────────────────────┘
                        │ BASE_SCALE (4.0)
                        │ (масштабирование игрового мира)
                        │ + Динамический зум камеры
                        │   (PLAYER_HEIGHT_PERCENT = 0.08)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              ИГРОВОЙ МИР (2048×2048 виртуальных пикселей)    │
│         Карта: 512×512 базовых → 2048×2048 виртуальных       │
│         Акторы: масштабируются через BASE_SCALE × ACTOR_SIZES│
│         Расширенный фон: TileSprite заполняет letterboxing     │
└─────────────────────────────────────────────────────────────┘
```

### Уровни координат

1. **Реальные координаты экрана** - физические пиксели устройства (получаются через `window.visualViewport` или `window.innerWidth/Height`)
2. **Адаптивные виртуальные координаты UI** (0-adaptiveWidth по X, 0-1280 по Y) - для позиционирования UI элементов, где `adaptiveWidth = BASE_GAME_HEIGHT * aspect` (ограничено 360-2560)
3. **Виртуальные координаты игрового мира** (0-2048 по X, 0-2048 по Y) - для позиционирования игровых объектов

---

## Ключевые файлы и их роли

### 1. `src/react/PhaserGame.tsx`

**Роль:** Инициализация Phaser игры и настройка масштабирования виртуального экрана

**Ключевые элементы:**

```typescript
const getGameSize = () => {
    // Используем visualViewport для мобильных устройств (учитывает адресную строку)
    const w = window.visualViewport?.width || window.innerWidth;
    const h = window.visualViewport?.height || window.innerHeight;
    
    const height = BASE_GAME_HEIGHT; // 1280 - фиксированная высота
    const aspect = w / h;
    let width = height * aspect; // Адаптивная ширина
    // Защита от слишком узких/широких экранов
    width = Math.max(MIN_GAME_WIDTH, Math.min(MAX_GAME_WIDTH, width));
    return { width, height };
};

const config: Phaser.Types.Core.GameConfig = {
    ...getGameSize(), // Адаптивное виртуальное разрешение
    scale: {
        mode: Phaser.Scale.FIT,              // Масштабирование с сохранением пропорций
        autoCenter: Phaser.Scale.CENTER_BOTH  // Центрирование на экране
    }
}
```

**Что делает:**
- Создает адаптивный виртуальный экран (высота 1280, ширина вычисляется динамически)
- Использует `window.visualViewport` для точного определения размера экрана на мобильных устройствах
- Настраивает Phaser.Scale.FIT для автоматического масштабирования
- Обрабатывает изменения размера viewport (resize, orientationchange) с дебаунсом
- Автоматически создает letterboxing при несоответствии соотношения сторон (закрывается расширенным фоном)

**Обработчики событий:**
- `window.resize` - изменение размера окна
- `window.orientationchange` - изменение ориентации устройства
- `window.visualViewport.resize` - изменение видимой области (включая адресную строку браузера)

**Логика обработки resize:**
```typescript
const updateGameSize = () => {
    const { width: newW, height: newH } = getGameSize();
    const game = gameInstance.current;
    const currentWidth = game.scale.gameSize.width;
    const currentHeight = game.scale.gameSize.height;
    const aspectChanged = Math.abs(newW / newH - currentWidth / currentHeight) > 0.01;
    
    if (aspectChanged) {
        game.scale.setGameSize(newW, newH);
        game.scale.refresh();
        // ✅ Явно центрируем canvas после изменения размера
        game.scale.updateCenter();
    } else {
        game.scale.refresh();
        // ✅ Также центрируем при обычном refresh
        game.scale.updateCenter();
    }
};

const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        updateGameSize();
    }, 100);
};
```

**Логика обработки поворота экрана:**
```typescript
const handleOrientationChange = () => {
    // Ждем завершения поворота (300ms)
    orientationTimeout = setTimeout(() => {
        // Дебаунс 100ms для финального обновления
        resizeTimeout = setTimeout(() => {
            updateGameSize();
            
            // ✅ Дополнительное центрирование после поворота экрана
            setTimeout(() => {
                if (gameInstance.current && gameInstance.current.scale) {
                    gameInstance.current.scale.updateCenter();
                    // Логирование позиции canvas для диагностики
                }
            }, 50);
        }, 100);
    }, 300);
};
```

**Важно:** 
- Этот файл отвечает ТОЛЬКО за масштабирование виртуального экрана на реальный. Он не влияет на масштабирование игрового мира.
- При resize вызывается только `game.scale.refresh()` - Phaser автоматически пересчитывает масштаб и центрирует canvas без ручных вычислений.

---

### 1.1. `index.html` - CSS стили контейнера

**Роль:** Определение стилей контейнера Phaser для корректного центрирования и масштабирования

**Ключевые стили:**

```css
#game-container { 
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    /* ✅ Убрали display: flex - Phaser сам центрирует canvas через autoCenter: CENTER_BOTH */
    /* Flexbox может конфликтовать с Phaser центрированием при повороте экрана */
}
```

**Что делает:**
- `position: fixed` - фиксированное позиционирование относительно viewport
- `inset: 0` (через `top: 0; left: 0; width: 100vw; height: 100vh`) - контейнер занимает весь viewport
- `overflow: hidden` - предотвращает появление скроллбаров
- **НЕТ** `display: flex`, `align-items: center`, `justify-content: center` - Phaser сам центрирует canvas через `autoCenter: CENTER_BOTH`
- **НЕТ** `margin: auto` или других ручных CSS-позиционирований

**Важно:** 
- Контейнер должен быть `position: fixed` с `inset: 0` для корректной работы Phaser.Scale.FIT
- Phaser автоматически центрирует canvas внутри контейнера через `autoCenter: CENTER_BOTH`
- **CSS flexbox удален** - он конфликтовал с Phaser центрированием при повороте экрана, вызывая смещение canvas вправо
- Явное центрирование через `game.scale.updateCenter()` гарантирует корректное позиционирование после поворота

---

### 2. `src/constants/gameConstants.ts`

**Роль:** Определение всех констант масштабирования

**Ключевые константы:**

```typescript
// Адаптивное виртуальное разрешение экрана
export const BASE_GAME_HEIGHT = 1280;  // Фиксированная высота виртуального экрана
export const MIN_GAME_WIDTH = 360;     // Минимальная ширина (защита от узких экранов)
export const MAX_GAME_WIDTH = 2560;    // Максимальная ширина (защита от ultrawide)

// Базовый масштаб для игрового мира
export const BASE_SCALE = 4.0;   // Масштаб всех игровых объектов

// Размеры карты (базовый размер, масштабируется до виртуального)
export const MAP_WIDTH = 512;   // Базовый размер карты
export const MAP_HEIGHT = 512;  // Базовый размер карты

// Центр карты в виртуальных координатах
export const MAP_CENTER_X = (MAP_WIDTH * BASE_SCALE) / 2;  // 1024
export const MAP_CENTER_Y = (MAP_HEIGHT * BASE_SCALE) / 2; // 1024

// Настройки зума камеры
export const PLAYER_HEIGHT_PERCENT = 0.08;  // Игрок должен занимать 8% высоты экрана
export const PLAYER_FRAME_WIDTH = 16;       // Базовый размер спрайта игрока
export const PLAYER_FRAME_HEIGHT = 16;      // Базовый размер спрайта игрока
```

**Множители размеров акторов:**

```typescript
export const ACTOR_SIZES = {
    PLAYER: 1.0,    // Финальный масштаб = BASE_SCALE × 1.0 = 4.0
    ENEMY: 1.0,     // Финальный масштаб = BASE_SCALE × 1.0 = 4.0
    HEART: 1.0,     // Финальный масштаб = BASE_SCALE × 1.0 = 4.0
    KEY: 1.0,       // Финальный масштаб = BASE_SCALE × 1.0 = 4.0
    PORTAL: 1.0,    // Финальный масштаб = BASE_SCALE × 1.0 = 4.0
    ORACLE: 1.0     // Финальный масштаб = BASE_SCALE × 1.0 = 4.0
}
```

**Важно:** Все размеры акторов задаются в базовых пикселях, затем масштабируются через `BASE_SCALE × ACTOR_SIZES[тип]`.

---

### 3. `src/game/scenes/BaseScene.ts`

**Роль:** Базовый класс для всех сцен с общими настройками физики и камеры

**Ключевые методы:**

```typescript
protected setupPhysics(): void {
    const mapWidthScaled = MAP_WIDTH * BASE_SCALE;   // 2048
    const mapHeightScaled = MAP_HEIGHT * BASE_SCALE; // 2048
    this.physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
}

protected setupCamera(bounds?: { x: number; y: number; width: number; height: number }): void {
    if (bounds) {
        this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    } else {
        const mapWidthScaled = MAP_WIDTH * BASE_SCALE;   // 2048
        const mapHeightScaled = MAP_HEIGHT * BASE_SCALE; // 2048
        this.cameras.main.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
    }
}
```

**Что делает:**
- Устанавливает границы физического мира в виртуальных координатах (0-2048)
- Устанавливает границы камеры в виртуальных координатах (0-2048)

**Важно:** Границы устанавливаются в виртуальных координатах игрового мира, а не виртуального экрана.

---

### 4. `src/game/scenes/MainScene.ts`

**Роль:** Основная игровая сцена с настройкой камеры и созданием игрового мира

**Создание карты:**

```typescript
private async createGameWorld(): Promise<void> {
    // Карта создается с базовым размером 512×512 и масштабируется до 2048×2048
    const mapBackground = this.add.image(MAP_CENTER_X, MAP_CENTER_Y, KEYS.MAP_BACKGROUND);
    mapBackground.setScale(BASE_SCALE); // Масштабируем до 2048×2048
    
    // Граница карты (прямоугольник)
    const mapWidthScaled = MAP_WIDTH * BASE_SCALE;   // 2048
    const mapHeightScaled = MAP_HEIGHT * BASE_SCALE; // 2048
    this.add.rectangle(MAP_CENTER_X, MAP_CENTER_Y, mapWidthScaled, mapHeightScaled)
        .setStrokeStyle(1, 0xffffff); // Толщина 1 базовый, после масштабирования = 4
}
```

**Настройка камеры:**

```typescript
private setupCameraFollow(): void {
    // Границы камеры в виртуальных координатах игрового мира
    const mapWidthScaled = MAP_WIDTH * BASE_SCALE;   // 2048
    const mapHeightScaled = MAP_HEIGHT * BASE_SCALE; // 2048
    this.cameras.main.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
    this.physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
    
    // Центрируем камеру на игроке (который находится в центре карты)
    this.cameras.main.centerOn(playerSprite.x, playerSprite.y);
    
    // Вычисляем динамический зум для фиксации размера игрока
    const zoom = this.calculateCameraZoom();
    this.cameras.main.setZoom(zoom);
    
    // Следование за игроком
    this.cameras.main.startFollow(playerSprite, true, 0.15, 0.15);
    this.cameras.main.roundPixels = true;
    
    // Отключение deadzone для четкого центра
    this.cameras.main.setDeadzone(0, 0);
}

private calculateCameraZoom(): number {
    // Вычисляем зум так, чтобы игрок занимал PLAYER_HEIGHT_PERCENT высоты экрана
    const playerHeightInWorld = PLAYER_FRAME_HEIGHT * BASE_SCALE; // 64 виртуальных пикселя
    const desiredPlayerHeightOnScreen = this.cameras.main.height * PLAYER_HEIGHT_PERCENT;
    return desiredPlayerHeightOnScreen / playerHeightInWorld;
}
```

**Создание расширенного фона (закрытие letterboxing):**

```typescript
private createExtendedBackground(): void {
    // Создаем расширенный фон, который заполняет области letterboxing
    const extendedBaseWidth = MAP_WIDTH * 2; // 1024 базовых → 4096 виртуальных
    const extendedBaseHeight = MAP_HEIGHT;   // 512 базовых
    
    this.mapBackgroundTileSprite = this.add.tileSprite(
        MAP_CENTER_X, MAP_CENTER_Y,
        extendedBaseWidth, extendedBaseHeight,
        KEYS.MAP_BACKGROUND
    );
    this.mapBackgroundTileSprite.setOrigin(0.5, 0.5);
    this.mapBackgroundTileSprite.setTileScale(BASE_SCALE, BASE_SCALE);
    this.mapBackgroundTileSprite.setScrollFactor(1, 1); // Синхронно с камерой
    this.mapBackgroundTileSprite.setDepth(-200);
}
}
```

**Важно:** 
- Камера работает в виртуальных координатах игрового мира (0-2048)
- Размер камеры равен виртуальному разрешению экрана (720×1280)
- Камера следует за игроком с плавностью (0.15, 0.15)

---

## Виртуальное разрешение

### Определение

**Адаптивное виртуальное разрешение** - это разрешение с фиксированной высотой (BASE_GAME_HEIGHT = 1280) и динамической шириной, вычисляемой на основе соотношения сторон экрана. Ширина ограничена MIN_GAME_WIDTH (360) и MAX_GAME_WIDTH (2560).

**Формула расчета:**
```typescript
const height = BASE_GAME_HEIGHT; // 1280 - фиксированная высота
const aspect = window.visualViewport?.width / window.visualViewport?.height || window.innerWidth / window.innerHeight;
let width = height * aspect; // Адаптивная ширина
width = Math.max(MIN_GAME_WIDTH, Math.min(MAX_GAME_WIDTH, width)); // Ограничение
```

### Зачем нужно

1. **Устранение letterboxing:** Адаптивная ширина позволяет canvas занимать 100% ширины экрана на широких устройствах
2. **Единообразие:** Высота фиксирована, что обеспечивает стабильность UI по вертикали
3. **Предсказуемость:** Позиции элементов зависят от адаптивного виртуального разрешения, но остаются стабильными
4. **Адаптивность:** Игра автоматически адаптируется к различным соотношениям сторон экрана
3. **Упрощение разработки:** Не нужно адаптировать UI под каждое устройство

### Как работает

```
Реальный экран: 1080×1920 (соотношение 9:16)
         ↓ Phaser.Scale.FIT
Виртуальный экран: 720×1280 (соотношение 9:16)
         ↓ Масштаб: 1.5x
Итоговый размер на экране: 1080×1920 (заполняет весь экран)

Реальный экран: 1440×2560 (соотношение 9:16)
         ↓ Phaser.Scale.FIT
Виртуальный экран: 720×1280 (соотношение 9:16)
         ↓ Масштаб: 2.0x
Итоговый размер на экране: 1440×2560 (заполняет весь экран)

Реальный экран: 1920×1080 (соотношение 16:9, landscape)
         ↓ Phaser.Scale.FIT
Виртуальный экран: 720×1280 (соотношение 9:16, portrait)
         ↓ Масштаб: min(1920/720, 1080/1280) = min(2.67, 0.84) = 0.84x
Итоговый размер на экране: 604×1075 (центрировано, letterboxing по бокам)
```

---

## Масштабирование игрового мира

### Концепция

Игровой мир (карта и акторы) масштабируется отдельно от виртуального экрана через `BASE_SCALE = 4.0`.

### Карта

**Базовый размер:** 512×512 пикселей  
**Виртуальный размер:** 512 × BASE_SCALE = 2048×2048 пикселей

**Создание:**
```typescript
// Текстура фона: Bg.Base.512x512.png (базовый размер 512×512)
const mapBackground = this.add.image(MAP_CENTER_X, MAP_CENTER_Y, KEYS.MAP_BACKGROUND);
mapBackground.setScale(BASE_SCALE); // Масштабируем до 2048×2048
```

**Важно:** Карта создается в виртуальных координатах игрового мира (центр в 1024, 1024).

### Акторы

**Базовые размеры:**
- Игрок: 16×16 пикселей (базовый)
- Враги: 16×16 пикселей (базовый)
- Предметы: 16×16 пикселей (базовый)

**Масштабирование:**
```typescript
// Финальный масштаб = BASE_SCALE × ACTOR_SIZES[тип]
sprite.setScale(BASE_SCALE * ACTOR_SIZES.PLAYER);  // 4.0 × 1.0 = 4.0
sprite.setScale(BASE_SCALE * ACTOR_SIZES.KEY);    // 4.0 × 1.0 = 4.0
```

**Позиционирование:**
- Все акторы создаются в виртуальных координатах игрового мира (0-2048)
- `SpawnSystem.getSafePosition()` возвращает позиции в виртуальных координатах

---

## Система камеры

### Размер камеры

**Размер камеры** равен виртуальному разрешению экрана: **720×1280 пикселей**

Это означает:
- Камера видит область игрового мира размером 720×1280 виртуальных пикселей
- При масштабировании виртуального экрана на реальный, камера также масштабируется
- Камера всегда показывает одинаковую область игрового мира на всех устройствах

### Границы камеры

**Границы камеры** установлены в виртуальных координатах игрового мира:
- Минимум: (0, 0)
- Максимум: (2048, 2048)

**Настройка:**
```typescript
this.cameras.main.setBounds(0, 0, MAP_WIDTH * BASE_SCALE, MAP_HEIGHT * BASE_SCALE);
```

### Следование за игроком

**Настройки:**
```typescript
this.cameras.main.startFollow(playerSprite, true, 0.15, 0.15);
```

**Параметры:**
- `playerSprite` - объект для следования
- `true` - следование по обеим осям
- `0.15, 0.15` - плавность следования (lerp factor)

**Deadzone:**
```typescript
this.cameras.main.setDeadzone(0, 0); // Отключена для четкого центра
```

### Zoom камеры

**Zoom = 1.0** (не используется для масштабирования)

Zoom камеры не используется для масштабирования, так как:
- Масштабирование виртуального экрана происходит через Phaser.Scale.FIT
- Масштабирование игрового мира происходит через BASE_SCALE
- Zoom используется только для эффектов (например, приближение при победе)

---

## Поведение карты

### Размеры карты

**Базовый размер:** 512×512 пикселей  
**Виртуальный размер:** 2048×2048 пикселей (512 × BASE_SCALE)

### Позиционирование

**Центр карты:**
- X: `MAP_CENTER_X = 1024` (виртуальные координаты)
- Y: `MAP_CENTER_Y = 1024` (виртуальные координаты)

### Границы

**Физические границы:**
```typescript
this.physics.world.setBounds(0, 0, 2048, 2048);
```

**Границы камеры:**
```typescript
this.cameras.main.setBounds(0, 0, 2048, 2048);
```

### Текстура фона

**Текстура:** `Bg.Base.512x512.png`  
**Размер текстуры:** 512×512 пикселей (базовый)  
**Отображение:** Масштабируется до 2048×2048 через `setScale(BASE_SCALE)`

**Важно:** Текстура покрывает всю карту целиком (1:1 соответствие).

---

## Letterboxing и адаптация к экранам

### Что такое Letterboxing

**Letterboxing** - это черные полосы по краям экрана, которые появляются когда соотношение сторон реального экрана не совпадает с виртуальным экраном (9:16).

### Когда появляется

Letterboxing появляется когда:
- Реальный экран имеет соотношение сторон отличное от 9:16
- Реальный экран в landscape ориентации (16:9, 18:9 и т.д.)
- Реальный экран имеет другое соотношение (например, 4:3)

### Как работает

Phaser.Scale.FIT автоматически:
1. Вычисляет масштаб для каждой оси: `scaleX = realWidth / 720`, `scaleY = realHeight / 1280`
2. Выбирает минимальный масштаб: `scale = min(scaleX, scaleY)`
3. Вычисляет размер виртуального экрана на реальном: `virtualWidth = 720 * scale`, `virtualHeight = 1280 * scale`
4. Центрирует виртуальный экран: `offsetX = (realWidth - virtualWidth) / 2`, `offsetY = (realHeight - virtualHeight) / 2`
5. Черные полосы появляются автоматически в областях `offsetX` и `offsetY`

### Примеры

**Пример 1: Соответствие соотношения сторон**
```
Реальный экран: 1080×1920 (9:16)
Виртуальный экран: 720×1280 (9:16)
Масштаб: 1.5x
Итог: Заполняет весь экран, letterboxing отсутствует
```

**Пример 2: Landscape ориентация**
```
Реальный экран: 1920×1080 (16:9, landscape)
Виртуальный экран: 720×1280 (9:16, portrait)
Масштаб: min(1920/720, 1080/1280) = min(2.67, 0.84) = 0.84x
Виртуальный размер на экране: 604×1075
Letterboxing: (1920-604)/2 = 658px по бокам
```

**Пример 3: Широкий экран**
```
Реальный экран: 2560×1440 (16:9)
Виртуальный экран: 720×1280 (9:16)
Масштаб: min(2560/720, 1440/1280) = min(3.56, 1.125) = 1.125x
Виртуальный размер на экране: 810×1440
Letterboxing: (2560-810)/2 = 875px по бокам
```

---

## Поток выполнения

### Инициализация игры

1. **PhaserGame.tsx** создает Phaser.Game с виртуальным разрешением 720×1280
2. **Phaser.Scale.FIT** настраивается для автоматического масштабирования
3. **LoadingScene** загружает ресурсы (включая текстуру карты Bg.Base.512x512.png)
4. **MainScene** создается и инициализируется

### Создание игрового мира

1. **createGameWorld()** создает карту:
   - Загружает текстуру `KEYS.MAP_BACKGROUND` (512×512)
   - Создает `image` в позиции (MAP_CENTER_X, MAP_CENTER_Y) = (1024, 1024)
   - Применяет `setScale(BASE_SCALE)` для масштабирования до 2048×2048

2. **setupPhysics()** устанавливает границы физического мира:
   - `setBounds(0, 0, 2048, 2048)`

3. **setupCameraFollow()** настраивает камеру:
   - `setBounds(0, 0, 2048, 2048)` - границы в виртуальных координатах игрового мира
   - `startFollow(playerSprite)` - следование за игроком
   - Размер камеры = 720×1280 (виртуальное разрешение экрана)

### Спавн объектов

1. **SpawnSystem.getSafePosition()** генерирует позиции:
   - В виртуальных координатах игрового мира
   - **Динамические границы:** от `max(radius, 64)` до `2048 - max(radius, 64)`
   - Учитывает размер объекта (radius) для предотвращения выхода за границы карты
   - Учитывает занятые зоны в виртуальных координатах
   - **Пример:** Для портала (radius=512) границы: от 512 до 1536, гарантируя полное размещение внутри карты

2. **Создание акторов:**
   - Позиция задается в виртуальных координатах игрового мира
   - Применяется `setScale(BASE_SCALE * ACTOR_SIZES[тип])`

### Обработка изменений размера

1. **window.resize** событие:
   - `PhaserGame.tsx` вызывает `game.scale.refresh()` с debounce 100ms
   - Phaser автоматически пересчитывает масштаб виртуального экрана
   - Phaser автоматически центрирует canvas через `autoCenter: CENTER_BOTH`
   - Letterboxing обновляется автоматически и остается симметричным
   - **БЕЗ** ручных вычислений позиции или размера canvas

2. **window.orientationchange** событие:
   - Задержка 300ms для завершения поворота (браузеру нужно время для обновления размеров)
   - Пересчитывается виртуальное разрешение на основе новых размеров экрана
   - Вызывается `updateGameSize()` → `game.scale.setGameSize()` → `game.scale.refresh()` → `game.scale.updateCenter()`
   - **Дополнительное центрирование:** через 50ms после поворота для гарантии корректного позиционирования
   - **Логирование позиции:** для диагностики проблем с центрированием (canvas position before/after centering)
   - Масштабирование и центрирование обновляются автоматически
   - **Проблема решена:** Удален CSS flexbox из `#game-container`, который конфликтовал с Phaser центрированием

3. **window.visualViewport.resize** событие:
   - Отслеживает изменения видимой области (адресная строка браузера)
   - Вызывается `handleResize()` → `game.scale.refresh()`
   - Автоматически обновляет масштабирование

**Критерий успеха:**
- При любом изменении размера окна браузера canvas остается точно по центру
- Letterboxing появляется симметрично (слева и справа)
- Игровой мир не смещается, игрок остается в центре

---

## Детальный анализ Letterboxing для LLM

### Проблема Letterboxing

**Текущая ситуация:**
- Виртуальный экран имеет фиксированное соотношение сторон 9:16 (720×1280)
- На устройствах с другим соотношением сторон (например, 16:9 в landscape) появляются черные полосы (letterboxing)
- Letterboxing создается автоматически Phaser.Scale.FIT для сохранения пропорций

### Математика Letterboxing

**Формула вычисления масштаба:**
```typescript
// Виртуальное разрешение вычисляется динамически
const height = BASE_GAME_HEIGHT; // 1280 - фиксированная высота
const aspect = window.visualViewport?.width / window.visualViewport?.height || window.innerWidth / window.innerHeight;
let width = height * aspect; // Адаптивная ширина
width = Math.max(MIN_GAME_WIDTH, Math.min(MAX_GAME_WIDTH, width)); // Ограничение

const scaleX = realScreenWidth / width;   // realWidth / adaptiveWidth
const scaleY = realScreenHeight / height; // realHeight / 1280
const scale = Math.min(scaleX, scaleY);  // Выбираем минимальный масштаб
```

**Формула вычисления размера виртуального экрана на реальном:**
```typescript
const virtualWidthOnScreen = width * scale;   // adaptiveWidth * scale
const virtualHeightOnScreen = height * scale; // 1280 * scale
```

**Формула вычисления letterboxing:**
```typescript
const letterboxX = (realScreenWidth - virtualWidthOnScreen) / 2;
const letterboxY = (realScreenHeight - virtualHeightOnScreen) / 2;
```

### Примеры вычислений для разных экранов

#### Пример 1: Портретное устройство (9:16)
```
Реальный экран: 1080×1920
Виртуальный экран: 720×1280

scaleX = 1080 / 720 = 1.5
scaleY = 1920 / 1280 = 1.5
scale = min(1.5, 1.5) = 1.5

virtualWidthOnScreen = 720 * 1.5 = 1080
virtualHeightOnScreen = 1280 * 1.5 = 1920

letterboxX = (1080 - 1080) / 2 = 0
letterboxY = (1920 - 1920) / 2 = 0

Результат: Нет letterboxing, экран заполнен полностью
```

#### Пример 2: Landscape устройство (16:9)
```
Реальный экран: 1920×1080 (landscape)
Виртуальный экран: 720×1280 (portrait)

scaleX = 1920 / 720 = 2.67
scaleY = 1080 / 1280 = 0.84
scale = min(2.67, 0.84) = 0.84

virtualWidthOnScreen = 720 * 0.84 = 604.8 ≈ 605
virtualHeightOnScreen = 1280 * 0.84 = 1075.2 ≈ 1075

letterboxX = (1920 - 605) / 2 = 657.5 ≈ 658
letterboxY = (1080 - 1075) / 2 = 2.5 ≈ 3

Результат: Letterboxing по бокам (658px слева и справа), минимальный сверху/снизу (3px)
```

#### Пример 3: Широкий экран (21:9)
```
Реальный экран: 2560×1080 (21:9, landscape)
Виртуальный экран: 720×1280 (9:16, portrait)

scaleX = 2560 / 720 = 3.56
scaleY = 1080 / 1280 = 0.84
scale = min(3.56, 0.84) = 0.84

virtualWidthOnScreen = 720 * 0.84 = 604.8 ≈ 605
virtualHeightOnScreen = 1280 * 0.84 = 1075.2 ≈ 1075

letterboxX = (2560 - 605) / 2 = 977.5 ≈ 978
letterboxY = (1080 - 1075) / 2 = 2.5 ≈ 3

Результат: Большой letterboxing по бокам (978px слева и справа)
```

### Текущая реализация Letterboxing

**Где создается:**
- Phaser.Scale.FIT автоматически создает letterboxing при несоответствии соотношения сторон
- Letterboxing - это черные области вокруг canvas, создаваемые Phaser автоматически
- Цвет letterboxing определяется `backgroundColor` в конфиге Phaser (по умолчанию `#1a202c`)

**Как работает:**
1. Phaser вычисляет масштаб для виртуального экрана
2. Phaser центрирует canvas через `autoCenter: CENTER_BOTH`
3. Области вокруг canvas остаются пустыми (letterboxing)
4. Цвет letterboxing = `backgroundColor` из конфига

**Реализованное решение:**
- ✅ Letterboxing закрывается расширенным фоном (TileSprite)
- ✅ Динамический расчет расширения на основе реального размера letterboxing
- ✅ Фон движется синхронно с картой (`scrollFactor = 1`)
- ✅ Расширение границ камеры для видимости расширенного фона
- ✅ Физика остается строго ограниченной 2048×2048

### Реализованное решение для закрытия Letterboxing

#### Реализованное решение: Расширенный фон с динамическим расчетом

**Концепция:**
- Динамический расчет размера letterboxing на основе реального экрана
- Создание TileSprite под основной картой для визуального расширения
- Фон движется синхронно с картой (`scrollFactor = 1`)
- Расширение границ камеры только для видимости расширенного фона
- Физика остается строго ограниченной 2048×2048

**Ключевые особенности:**
1. **Динамический расчет:** Размер расширения вычисляется на основе реального размера letterboxing
2. **Синхронное движение:** Фон движется точно так же, как карта (без parallax)
3. **Минимальный порог:** Расширение включается только если letterboxing > 50px
4. **Автоматическая адаптация:** При изменении размера окна фон пересоздается

**Реализация:**

**1. Метод расчета расширения:**
```typescript
private calculateLetterboxExtension(): number {
    if (typeof window === 'undefined') return 0;

    const realScreenWidth = window.innerWidth;
    const realScreenHeight = window.innerHeight;

    // Вычисляем адаптивное виртуальное разрешение
    const height = BASE_GAME_HEIGHT; // 1280
    const aspect = realScreenWidth / realScreenHeight;
    let width = height * aspect;
    width = Math.max(MIN_GAME_WIDTH, Math.min(MAX_GAME_WIDTH, width));

    const scaleX = realScreenWidth / width;
    const scaleY = realScreenHeight / height;
    const scale = Math.min(scaleX, scaleY);

    // Защита от деления на 0 и некорректных значений
    if (scale <= 0) return 0;

    const letterboxRealPixels = (realScreenWidth - width * scale) / 2;
    const extensionVirtual = letterboxRealPixels / scale;

    // Не расширяем, если letterboxing <= MIN_LETTERBOX_SIZE
    const MIN_LETTERBOX_SIZE = LETTERBOXING_CONFIG.MIN_LETTERBOX_SIZE; // 50
    return extensionVirtual > MIN_LETTERBOX_SIZE ? extensionVirtual : 0;
}
```

**2. Создание расширенного фона:**
```typescript
private createLetterboxBackground(): void {
    // Удаляем старый, если есть
    if (this.mapBackgroundTileSprite) {
        this.mapBackgroundTileSprite.destroy();
        this.mapBackgroundTileSprite = null;
    }

    const extensionVirtual = this.calculateLetterboxExtension();
    this.mapExtensionWidth = extensionVirtual;

    if (extensionVirtual > 0) {
        const extensionBase = extensionVirtual / BASE_SCALE;
        const extendedBaseWidth = MAP_WIDTH + extensionBase * 2;

        this.mapBackgroundTileSprite = this.add.tileSprite(
            MAP_CENTER_X,
            MAP_CENTER_Y,
            extendedBaseWidth,
            MAP_HEIGHT,
            KEYS.MAP_BACKGROUND
        );

        this.mapBackgroundTileSprite.setTileScale(BASE_SCALE, BASE_SCALE);
        this.mapBackgroundTileSprite.setScrollFactor(1, 1); // Синхронно с камерой
        this.mapBackgroundTileSprite.setDepth(-200); // Под основной картой
    }
}
```

**3. Расширение границ камеры:**
```typescript
private setupCameraBounds(): void {
    const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
    const mapHeightScaled = MAP_HEIGHT * BASE_SCALE;

    if (this.mapExtensionWidth > 0) {
        this.cameras.main.setBounds(
            -this.mapExtensionWidth,
            0,
            mapWidthScaled + 2 * this.mapExtensionWidth,
            mapHeightScaled
        );
    } else {
        this.cameras.main.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
    }

    // Физика всегда остается 2048×2048
    this.physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
}
```

**Система слоев (Depth):**
- Расширенный фон: `depth = -200` (самый нижний слой)
- Основная карта: `depth = -100` (выше расширенного фона)
- Трава: `depth = 1`
- Кусты: `depth = 6`
- Порталы: `depth = 5`
- Оракул: `depth = 50`
- Игрок: `depth = 100`
- Враги: `depth = 200`

**Конфигурация:**
```typescript
export const LETTERBOXING_CONFIG = {
    MIN_LETTERBOX_SIZE: 50, // минимальный размер letterboxing для включения (в виртуальных пикселях)
    EXTENSION_FACTOR: 2.0, // максимальное расширение (fallback, если нужно)
    ENABLED_ON_MOBILE: false,
    ENABLED_ON_TABLET: true,
    FORCE_ENABLE_ON_PC: true
} as const;
```

**Преимущества реализации:**
- ✅ Абсолютная синхронизация с картой (фон движется как единая текстура)
- ✅ Чисто визуальное расширение (физика не изменяется)
- ✅ Динамическая адаптация под реальный letterboxing
- ✅ Оптимизация производительности (один TileSprite)
- ✅ Нет ручного управления в `update()`
- ✅ Автоматическое пересоздание при resize

**Файлы реализации:**
- `src/game/scenes/MainScene.ts` - основная логика расширенного фона
- `src/constants/gameConstants.ts` - конфигурация LETTERBOXING_CONFIG

---

## Тестирование системы масштабирования

### Unit тесты

Система масштабирования покрыта unit-тестами для обеспечения корректности работы:

#### 1. `src/tests/unit/utils/DeviceUtils.test.ts`

**Покрытие:** 24 теста для утилит определения устройства

**Тестируемые методы:**
- `isTouchDevice()` - определение touch-устройств (5 тестов)
- `getOrientation()` - определение ориентации экрана (4 теста)
- `isInIframe()` - определение iframe окружения (4 теста)
- `getPixelRatio()` - получение pixel ratio (3 теста)
- `getDeviceType()` - определение типа устройства: mobile/tablet/desktop (6 тестов)
- `getDeviceInfo()` - полная информация об устройстве (2 теста)

**Граничные случаи:**
- Поведение при `window === undefined`
- Различные размеры экранов
- Различные типы устройств

#### 2. `src/tests/unit/constants/scalingConstants.test.ts`

**Покрытие:** 20+ тестов для констант масштабирования

**Тестируемые константы:**
- Адаптивное виртуальное разрешение (BASE_GAME_HEIGHT, MIN_GAME_WIDTH, MAX_GAME_WIDTH)
- Базовый масштаб (BASE_SCALE)
- Размеры карты (MAP_WIDTH, MAP_HEIGHT, MAP_CENTER_X, MAP_CENTER_Y)
- Множители акторов (ACTOR_SIZES)

**Математические проверки:**
- Корректность вычисления центра карты
- Соотношение виртуального размера карты и экрана
- Корректность вычисления финальных масштабов акторов

### Запуск тестов

```bash
# Запуск всех тестов масштабирования
npm run test:scaling

# Запуск с записью результатов в файл
npm run test:scaling:log
```

**Результаты сохраняются в:** `documentation/temp_docs/TEST_SCALING.log`

### Статус тестов

- ✅ **DeviceUtils.test.ts** - 24 теста, все проходят
- ✅ **scalingConstants.test.ts** - 20+ тестов, все проходят
- **Общее покрытие:** 49 тестов, все проходят

### Важность тестирования

Тесты системы масштабирования критичны, так как:
1. **Кросс-платформенность:** Убеждаются, что определение типа устройства работает корректно
2. **Математическая точность:** Проверяют корректность вычислений констант
3. **Регрессионное тестирование:** Защищают от случайных изменений, ломающих масштабирование
4. **Документация:** Тесты служат примерами использования API

---

## Детальное описание реализации закрытия Letterboxing

### Архитектура решения

Решение основано на создании расширенного фона (TileSprite) под основной картой, который визуально заполняет letterboxing, не влияя на игровую логику.

**Схема слоев:**
```
┌─────────────────────────────────────────────────────────┐
│                    Браузер/Экран                          │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Расширенный фон (TileSprite)             │   │
│  │         Depth: -200                              │   │
│  │         ScrollFactor: 1 (синхронно с камерой)   │   │
│  │         Размер: динамический, зависит от          │   │
│  │                  размера letterboxing            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Основная карта (Image)                   │   │
│  │         Depth: -100                              │   │
│  │         512×512 базовых → 2048×2048 виртуальных │   │
│  │         Физика ограничена этими границами        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Камера (Bounds: динамические)           │   │
│  │         Если расширение > 0:                     │   │
│  │           (-extensionWidth, 0,                   │   │
│  │            2048 + 2*extensionWidth, 2048)       │   │
│  │         Иначе: (0, 0, 2048, 2048)                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Математика расчета расширения

**Шаг 1: Вычисление адаптивного виртуального разрешения**
```typescript
const height = BASE_GAME_HEIGHT; // 1280 - фиксированная высота
const aspect = window.visualViewport?.width / window.visualViewport?.height || window.innerWidth / window.innerHeight;
let width = height * aspect; // Адаптивная ширина
width = Math.max(MIN_GAME_WIDTH, Math.min(MAX_GAME_WIDTH, width)); // Ограничение
```

**Шаг 2: Вычисление масштаба виртуального экрана**
```typescript
const scaleX = realScreenWidth / width;   // realWidth / adaptiveWidth
const scaleY = realScreenHeight / height; // realHeight / 1280
const scale = Math.min(scaleX, scaleY);  // Выбираем минимальный масштаб
```

**Шаг 3: Вычисление размера letterboxing в реальных пикселях**
```typescript
const virtualWidthOnScreen = width * scale;   // adaptiveWidth * scale
const letterboxRealPixels = (realScreenWidth - virtualWidthOnScreen) / 2;
```

**Шаг 3: Конвертация в виртуальные координаты игры**
```typescript
const extensionVirtual = letterboxRealPixels / scale;
```

**Шаг 4: Проверка минимального порога**
```typescript
const MIN_LETTERBOX_SIZE = 50; // виртуальные пиксели
return extensionVirtual > MIN_LETTERBOX_SIZE ? extensionVirtual : 0;
```

### Примеры расчетов

#### Пример 1: ПК монитор (1920×1080, landscape)
```
Реальный экран: 1920×1080
Виртуальный экран: 720×1280

scaleX = 1920 / 720 = 2.67
scaleY = 1080 / 1280 = 0.84
scale = min(2.67, 0.84) = 0.84

virtualWidthOnScreen = 720 * 0.84 = 604.8
letterboxRealPixels = (1920 - 604.8) / 2 = 657.6
extensionVirtual = 657.6 / 0.84 = 783.4

Результат: Расширение включено (783.4 > 50)
Расширенная ширина фона: 512 + (783.4 / 4) * 2 = 512 + 391.7 * 2 = 1295 базовых пикселей
```

#### Пример 2: Узкий экран (360×640, portrait)
```
Реальный экран: 360×640
Виртуальный экран: 720×1280

scaleX = 360 / 720 = 0.5
scaleY = 640 / 1280 = 0.5
scale = min(0.5, 0.5) = 0.5

virtualWidthOnScreen = 720 * 0.5 = 360
letterboxRealPixels = (360 - 360) / 2 = 0
extensionVirtual = 0 / 0.5 = 0

Результат: Расширение не включено (0 <= 50)
```

### Обработка изменения размера окна

При изменении размера окна (`handleResize()`):

1. **Перепроверка необходимости расширения:**
   ```typescript
   this.checkLetterboxing(); // Использует calculateLetterboxExtension()
   ```

2. **Пересоздание фона:**
   ```typescript
   this.createLetterboxBackground(); // Удаляет старый и создает новый
   ```

3. **Обновление границ камеры:**
   ```typescript
   this.setupCameraBounds(); // Пересчитывает границы с учетом нового расширения
   ```

**Важно:** Phaser не позволяет безопасно менять размер TileSprite после создания, поэтому фон полностью пересоздается при каждом изменении размера окна.

### Система координат расширенного фона

**Создание TileSprite:**
- Позиция: `(MAP_CENTER_X, MAP_CENTER_Y)` = `(1024, 1024)` - виртуальные координаты
- Ширина: `MAP_WIDTH + extensionBase * 2` - базовые пиксели
- Высота: `MAP_HEIGHT` - базовые пиксели
- Масштаб тайла: `setTileScale(BASE_SCALE, BASE_SCALE)` = `(4, 4)`

**Результирующий размер в виртуальных координатах:**
- Ширина: `(MAP_WIDTH + extensionBase * 2) * BASE_SCALE`
- Высота: `MAP_HEIGHT * BASE_SCALE` = `2048`

**Пример:**
Если `extensionVirtual = 800`:
- `extensionBase = 800 / 4 = 200` базовых пикселей
- `extendedBaseWidth = 512 + 200 * 2 = 912` базовых пикселей
- Результирующая ширина: `912 * 4 = 3648` виртуальных пикселей

### Границы камеры и физики

**Границы камеры (динамические):**
```typescript
if (mapExtensionWidth > 0) {
    // Расширенные границы для видимости расширенного фона
    camera.setBounds(
        -mapExtensionWidth,                    // Смещение влево
        0,                                      // Верхняя граница
        mapWidthScaled + 2 * mapExtensionWidth, // Расширенная ширина
        mapHeightScaled                        // Высота без изменений
    );
} else {
    // Стандартные границы
    camera.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
}
```

**Границы физики (всегда фиксированные):**
```typescript
// Физика всегда остается строго ограниченной основной картой
physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
```

**Важно:** Игрок и все игровые объекты не могут выйти за пределы 2048×2048, независимо от расширения фона.

### Производительность

**Оптимизации:**
- Фон создается только при необходимости (`extensionVirtual > MIN_LETTERBOX_SIZE`)
- Используется один TileSprite вместо множества отдельных спрайтов
- Нет обновлений в `update()` - фон движется автоматически через `scrollFactor = 1`
- Пересоздание происходит только при изменении размера окна

**Оценка производительности:**
- Создание TileSprite: ~1-2ms
- Пересоздание при resize: ~1-2ms (происходит редко)
- Влияние на FPS: минимальное (< 1%)

## Интеграция с системой шрифтов

Модальные окна используют систему динамического расчета размеров шрифтов (см. `FONT_SIZING_SYSTEM.md`):

- **Единый базовый размер** рассчитывается как 10% от минимальной стороны модального окна
- **Автоматическая подстройка** под доступное пространство и длину текста
- **Единообразие** - все элементы (вопрос, фидбэк, кнопки) используют один размер шрифта
- **Гибридный подход** - константы на этапе сборки + runtime fallback

Рабочая область модального окна делится на **5 равных блоков** (1 для вопроса, 1 для фидбэка, 3 для кнопок) с одинаковыми отступами между ними.

---

## Будущие улучшения

### Возможные расширения:

1. **Вертикальное расширение:** Поддержка расширения по вертикали для горизонтальных экранов
2. **Анимация появления:** Плавное появление/исчезновение фона при изменении размера
3. **Разные текстуры:** Использование разных текстур для боковых зон расширения
4. **Кэширование расчетов:** Кэширование результатов `calculateLetterboxExtension()` для оптимизации

### Адаптация под разные форматы экранов

**Проблема:** Текущая система работает только для portrait ориентации (9:16).

**Решение:**
- Определять ориентацию экрана
- Адаптировать виртуальное разрешение под ориентацию
- Или использовать разные виртуальные разрешения для portrait/landscape

**Файлы для модификации:**
- `src/react/PhaserGame.tsx` - определение ориентации
- `src/constants/gameConstants.ts` - разные константы для portrait/landscape

---

## Резюме

### Ключевые моменты

1. **Двухуровневое масштабирование:**
   - Виртуальный экран (720×1280) → Реальный экран (через Phaser.Scale.FIT)
   - Игровой мир (512×512 базовый) → Виртуальный мир (2048×2048 через BASE_SCALE)

2. **Координатные системы:**
   - Виртуальные координаты UI: 0-720 по X, 0-1280 по Y
   - Виртуальные координаты игрового мира: 0-2048 по X, 0-2048 по Y

3. **Камера:**
   - Размер: 720×1280 (виртуальное разрешение экрана)
   - Границы: 0-2048 (виртуальные координаты игрового мира)
   - Следование: за игроком с плавностью

4. **Letterboxing:**
   - Автоматически создается Phaser.Scale.FIT
   - Появляется при несоответствии соотношения сторон
   - ✅ Реализовано закрытие расширенным фоном (TileSprite)
   - ✅ Динамический расчет расширения на основе реального размера letterboxing
   - ✅ Фон движется синхронно с картой (`scrollFactor = 1`)
   - ✅ Расширение границ камеры для видимости расширенного фона
   - ✅ Физика остается строго ограниченной 2048×2048

5. **Поворот экрана:**
   - ✅ Автоматическая обработка `orientationchange` события
   - ✅ Задержка 300ms для завершения поворота браузера
   - ✅ Пересчет виртуального разрешения на основе новых размеров
   - ✅ Явное центрирование canvas через `game.scale.updateCenter()`
   - ✅ Дополнительное центрирование через 50ms после поворота
   - ✅ Логирование позиции canvas для диагностики проблем
   - ✅ Удален CSS flexbox для предотвращения конфликтов с Phaser центрированием

### Файлы для анализа

- `src/react/PhaserGame.tsx` - масштабирование виртуального экрана
- `src/constants/gameConstants.ts` - все константы масштабирования
- `src/game/scenes/BaseScene.ts` - базовые настройки камеры и физики
- `src/game/scenes/MainScene.ts` - создание карты и настройка камеры
- `src/game/systems/SpawnSystem.ts` - спавн в виртуальных координатах
- `src/utils/DeviceUtils.ts` - утилиты определения типа устройства
- `index.html` - CSS стили контейнера

---

**Конец документа**
