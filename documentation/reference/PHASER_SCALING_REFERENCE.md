# Справочник: Система масштабирования Phaser 3

**Версия:** 1.0
**Дата создания:** 2026-02-06
**Проект:** ArcadeQuiz
**Назначение:** Справочный материал для будущих проектов на Phaser 3

---

## 📋 Оглавление

1. [Обзор подхода](#обзор-подхода)
2. [Виртуальный экран](#виртуальный-экран)
3. [Масштабирование игрового мира](#масштабирование-игрового-мира)
4. [Система камеры](#система-камеры)
5. [Модальные окна и UI](#модальные-окна-и-ui)
6. [Устранение letterboxing](#устранение-letterboxing)
7. [Реактивность на resize](#реактивность-на-resize)
8. [Кодовые шаблоны](#кодовые-шаблоны)
9. [Константы и конфигурация](#константы-и-конфигурация)
10. [FAQ](#faq)

---

## Обзор подхода

### Трехуровневая система масштабирования

```
┌─────────────────────────────────────────────────────────────┐
│                    РЕАЛЬНЫЙ ЭКРАН                            │
│              (любое разрешение устройства)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ Phaser.Scale.FIT
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              АДАПТИВНЫЙ ВИРТУАЛЬНЫЙ ЭКРАН                    │
│         Высота: 1280 (фиксирована)                           │
│         Ширина: 1280 × aspect (360-2560, ограничена)         │
└───────────────────────┬─────────────────────────────────────┘
                        │ BASE_SCALE (4.0) + Zoom камеры
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              ИГРОВОЙ МИР (2048×2048)                         │
│         Карта: 512×512 базовых → 2048×2048 виртуальных       │
└─────────────────────────────────────────────────────────────┘
```

### Ключевые принципы

| Принцип | Описание |
|---------|----------|
| **Фиксированная высота** | `BASE_GAME_HEIGHT = 1280` — высота виртуального экрана всегда постоянна |
| **Адаптивная ширина** | Ширина вычисляется как `height × aspect`, ограничена `MIN_GAME_WIDTH` и `MAX_GAME_WIDTH` |
| **Phaser.Scale.FIT** | Автоматическое масштабирование с сохранением пропорций |
| **BASE_SCALE = 4.0** | Все игровые объекты масштабируются от базовых ассетов |
| **Динамический zoom** | Камера настраивается так, чтобы игрок занимал фиксированный % экрана |

---

## Виртуальный экран

### Конфигурация Phaser

**Файл:** `src/react/PhaserGame.tsx`

```typescript
import Phaser from 'phaser';

// Константы
const BASE_GAME_HEIGHT = 1280;
const MIN_GAME_WIDTH = 360;
const MAX_GAME_WIDTH = 2560;

// Вычисление адаптивного разрешения
const getGameSize = () => {
    const w = window.visualViewport?.width || window.innerWidth;
    const h = window.visualViewport?.height || window.innerHeight;

    const height = BASE_GAME_HEIGHT;
    const aspect = w / h;
    let width = height * aspect;
    width = Math.max(MIN_GAME_WIDTH, Math.min(MAX_GAME_WIDTH, width));

    return { width, height };
};

// Конфигурация Phaser
const config: Phaser.Types.Core.GameConfig = {
    ...getGameSize(),
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    parent: 'game-container',
    backgroundColor: '#1a202c'
};
```

### CSS контейнера

**Файл:** `index.html`

```css
#game-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    /* ❌ НЕ использовать display: flex — Phaser сам центрирует canvas */
}
```

**Важно:**
- ✅ `position: fixed` с `inset: 0`
- ✅ Phaser сам центрирует через `autoCenter: CENTER_BOTH`
- ❌ Не использовать CSS flexbox — конфликтует с Phaser при повороте экрана

---

## Масштабирование игрового мира

### Базовый масштаб

**Файл:** `src/constants/gameConstants.ts`

```typescript
export const BASE_SCALE = 4.0;   // Масштаб всех игровых объектов
export const MAP_WIDTH = 512;     // Базовый размер карты
export const MAP_HEIGHT = 512;    // Базовый размер карты

// Множители размеров акторов
export const ACTOR_SIZES = {
    PLAYER: 1.0,
    ENEMY: 1.0,
    HEART: 1.0,
    KEY: 1.0,
    PORTAL: 1.0
};

// Центр карты в виртуальных координатах
export const MAP_CENTER_X = (MAP_WIDTH * BASE_SCALE) / 2;  // 1024
export const MAP_CENTER_Y = (MAP_HEIGHT * BASE_SCALE) / 2; // 1024
```

### Создание карты

**Файл:** `src/game/scenes/MainScene.ts`

```typescript
private createGameWorld(): void {
    // Карта: 512×512 базовых → 2048×2048 виртуальных
    const mapBackground = this.add.image(
        MAP_CENTER_X,
        MAP_CENTER_Y,
        KEYS.MAP_BACKGROUND
    );
    mapBackground.setScale(BASE_SCALE);

    // Граница карты
    const mapWidthScaled = MAP_WIDTH * BASE_SCALE;   // 2048
    const mapHeightScaled = MAP_HEIGHT * BASE_SCALE; // 2048
    this.add.rectangle(
        MAP_CENTER_X,
        MAP_CENTER_Y,
        mapWidthScaled,
        mapHeightScaled
    ).setStrokeStyle(1, 0xffffff);
}
```

### Создание акторов

```typescript
// Спрайт игрока: 16×16 базовых → 64×64 виртуальных
const player = this.physics.add.sprite(x, y, 'player');
player.setScale(BASE_SCALE * ACTOR_SIZES.PLAYER); // 4.0 × 1.0 = 4.0

// Спрайт врага
const enemy = this.physics.add.sprite(x, y, 'enemy');
enemy.setScale(BASE_SCALE * ACTOR_SIZES.ENEMY);
```

---

## Система камеры

### Настройка границ и следования

```typescript
private setupCameraFollow(player: Phaser.Physics.Arcade.Sprite): void {
    const mapWidthScaled = MAP_WIDTH * BASE_SCALE;   // 2048
    const mapHeightScaled = MAP_HEIGHT * BASE_SCALE; // 2048

    // Границы камеры в виртуальных координатах игрового мира
    this.cameras.main.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
    this.physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);

    // Центрируем на игроке
    this.cameras.main.centerOn(player.x, player.y);

    // Динамический zoom
    const zoom = this.calculateCameraZoom();
    this.cameras.main.setZoom(zoom);

    // Следование за игроком
    this.cameras.main.startFollow(player, true, 0.15, 0.15);
    this.cameras.main.roundPixels = true;
    this.cameras.main.setDeadzone(0, 0);
}

private calculateCameraZoom(): number {
    const PLAYER_HEIGHT_PERCENT = 0.08; // 8% высоты экрана
    const PLAYER_FRAME_HEIGHT = 16;

    const playerHeightInWorld = PLAYER_FRAME_HEIGHT * BASE_SCALE; // 64
    const desiredPlayerHeightOnScreen = this.cameras.main.height * PLAYER_HEIGHT_PERCENT;

    return desiredPlayerHeightOnScreen / playerHeightInWorld;
}
```

### Константы зума

```typescript
export const PLAYER_HEIGHT_PERCENT = 0.08;  // Игрок = 8% высоты экрана
export const PLAYER_FRAME_WIDTH = 16;       // Базовый размер спрайта
export const PLAYER_FRAME_HEIGHT = 16;
```

---

## Модальные окна и UI

### Система 7 диапазонов aspect ratio

**Файл:** `src/constants/textStyles.ts`

```typescript
export const FONT_SIZE_MULTIPLIERS = {
    ULTRA_NARROW: 1.26,   // AR 0.25-0.45 (тестирование)
    EXTRA_NARROW: 1.34,   // AR 0.45-0.6  (foldable)
    MOBILE_NARROW: 1.41,  // AR 0.6-0.75  (iPhone SE)
    MOBILE_STANDARD: 1.45, // AR 0.75-1.0  (стандарт)
    TABLET_SQUARE: 1.49,  // AR 1.0-1.3   (планшеты)
    MONITOR_SMALL: 1.54,  // AR 1.3-1.6   (мониторы)
    MONITOR_LARGE: 1.54   // AR 1.6+      (большие)
} as const;

export function getFontSizeMultiplier(screenAR: number): number {
    if (screenAR < 0.45) return FONT_SIZE_MULTIPLIERS.ULTRA_NARROW;
    if (screenAR < 0.6) return FONT_SIZE_MULTIPLIERS.EXTRA_NARROW;
    if (screenAR < 0.75) return FONT_SIZE_MULTIPLIERS.MOBILE_NARROW;
    if (screenAR < 1.0) return FONT_SIZE_MULTIPLIERS.MOBILE_STANDARD;
    if (screenAR < 1.3) return FONT_SIZE_MULTIPLIERS.TABLET_SQUARE;
    if (screenAR < 1.6) return FONT_SIZE_MULTIPLIERS.MONITOR_SMALL;
    return FONT_SIZE_MULTIPLIERS.MONITOR_LARGE;
}
```

### Grid Snapping (привязка к пиксельной сетке)

```typescript
const BASE_SCALE = 4.0;

// Округление до ближайшего целого пикселя исходного разрешения (шаг 4)
const snapToGrid = (val: number) => Math.round(val / BASE_SCALE) * BASE_SCALE;

// Округление до 2-х пикселей (шаг 8), для корректного центрирования
const snapToGridDouble = (val: number) => Math.round(val / (BASE_SCALE * 2)) * (BASE_SCALE * 2);

// Применение для модального окна
const modalWidth = snapToGridDouble(desiredWidth);  // Кратно 8
const modalHeight = snapToGridDouble(desiredHeight); // Кратно 8
const modalX = snapToGrid(cameraX - modalWidth / 2);  // Кратно 4
const modalY = snapToGrid(cameraY - modalHeight / 2); // Кратно 4
```

### Компенсация зума для UI элементов

```typescript
// Для текста
text.setScale(1 / camera.zoom);
text.setResolution(2); // Повышенная четкость

// Для фона модального окна
background.setScale(1 / camera.zoom);

// Формула позиционирования с учетом зума
const adjustedX = x * camera.zoom;
const adjustedY = y * camera.zoom;
```

### Перенос строк в кнопках

```typescript
// wordWrap.width применяется к НЕмасштабированному тексту
// При zoom = 0.5, scale = 2 — текст визуально в 2 раза длиннее

const zoom = this.scene.cameras.main.zoom;
const wordWrapWidth = (buttonWidth * 0.95) * zoom; // Компенсация зума

this.text = this.scene.add.text(0, 0, buttonText, {
    wordWrap: {
        width: wordWrapWidth,
        useAdvancedWrap: true
    }
});
this.text.setScale(1 / zoom);
```

---

## Устранение letterboxing

### Что такое letterboxing

**Letterboxing** — черные полосы по краям экрана, возникающие при несовпадении соотношения сторон реального экрана и виртуального экрана.

### Примеры letterboxing

```
Реальный экран: 1920×1080 (16:9, landscape)
Виртуальный экран: 720×1280 (9:16, portrait)
Масштаб: min(1920/720, 1080/1280) = 0.84x
Letterboxing: ~658px по бокам
```

### Решение: Расширенный фон (TileSprite)

**Концепция:** Создать TileSprite под основной картой, который визуально заполняет letterboxing.

```typescript
private calculateLetterboxExtension(): number {
    if (typeof window === 'undefined') return 0;

    const realScreenWidth = window.innerWidth;
    const realScreenHeight = window.innerHeight;

    // Адаптивное виртуальное разрешение
    const height = BASE_GAME_HEIGHT;
    const aspect = realScreenWidth / realScreenHeight;
    let width = height * aspect;
    width = Math.max(MIN_GAME_WIDTH, Math.min(MAX_GAME_WIDTH, width));

    // Масштаб виртуального экрана
    const scaleX = realScreenWidth / width;
    const scaleY = realScreenHeight / height;
    const scale = Math.min(scaleX, scaleY);

    if (scale <= 0) return 0;

    // Размер letterboxing в реальных пикселях
    const letterboxRealPixels = (realScreenWidth - width * scale) / 2;
    const extensionVirtual = letterboxRealPixels / scale;

    // Не расширяем при малом letterboxing
    const MIN_LETTERBOX_SIZE = 50;
    return extensionVirtual > MIN_LETTERBOX_SIZE ? extensionVirtual : 0;
}

private createExtendedBackground(): void {
    const extensionVirtual = this.calculateLetterboxExtension();

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

### Границы камеры с расширением

```typescript
private setupCameraBounds(): void {
    const mapWidthScaled = MAP_WIDTH * BASE_SCALE;
    const mapHeightScaled = MAP_HEIGHT * BASE_SCALE;

    if (this.mapExtensionWidth > 0) {
        // Расширенные границы для видимости фона
        this.cameras.main.setBounds(
            -this.mapExtensionWidth,
            0,
            mapWidthScaled + 2 * this.mapExtensionWidth,
            mapHeightScaled
        );
    } else {
        // Стандартные границы
        this.cameras.main.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
    }

    // Физика всегда 2048×2048
    this.physics.world.setBounds(0, 0, mapWidthScaled, mapHeightScaled);
}
```

### Система слоев (Depth)

```typescript
// От нижнего слоя к верхнему
extendedBackground.setDepth(-200); // Расширенный фон
mapBackground.setDepth(-100);      // Основная карта
grass.setDepth(1);
bushes.setDepth(6);
portals.setDepth(5);
oracle.setDepth(50);
player.setDepth(100);
enemies.setDepth(200);
```

---

## Реактивность на resize

### Обработчики событий

**Файл:** `src/react/PhaserGame.tsx`

```typescript
// Debounce для resize
let resizeTimeout: NodeJS.Timeout;
let orientationTimeout: NodeJS.Timeout;

const updateGameSize = () => {
    const { width: newW, height: newH } = getGameSize();
    const game = gameInstance.current;
    const currentWidth = game.scale.gameSize.width;
    const currentHeight = game.scale.gameSize.height;
    const aspectChanged = Math.abs(newW / newH - currentWidth / currentHeight) > 0.01;

    if (aspectChanged) {
        game.scale.setGameSize(newW, newH);
    }
    game.scale.refresh();
    game.scale.updateCenter(); // Явное центрирование
};

const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        updateGameSize();
    }, 100);
};

const handleOrientationChange = () => {
    clearTimeout(orientationTimeout);
    orientationTimeout = setTimeout(() => {
        resizeTimeout = setTimeout(() => {
            updateGameSize();
            // Дополнительное центрирование после поворота
            setTimeout(() => {
                gameInstance.current?.scale.updateCenter();
            }, 50);
        }, 100);
    }, 300); // Ждем завершения поворота
};

// Регистрация обработчиков
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleOrientationChange);
window.visualViewport?.addEventListener('resize', handleResize);
```

### Пересоздание расширенного фона при resize

```typescript
private checkLetterboxing(): void {
    const newExtension = this.calculateLetterboxExtension();

    if (Math.abs(newExtension - this.mapExtensionWidth) > 10) {
        this.createLetterboxBackground();
        this.setupCameraBounds();
    }
}
```

---

## Кодовые шаблоны

### Шаблон инициализации PhaserGame

```typescript
import Phaser from 'phaser';
import MainScene from './game/scenes/MainScene';

const BASE_GAME_HEIGHT = 1280;
const MIN_GAME_WIDTH = 360;
const MAX_GAME_WIDTH = 2560;

const getGameSize = () => {
    const w = window.visualViewport?.width || window.innerWidth;
    const h = window.visualViewport?.height || window.innerHeight;

    const height = BASE_GAME_HEIGHT;
    const aspect = w / h;
    let width = height * aspect;
    width = Math.max(MIN_GAME_WIDTH, Math.min(MAX_GAME_WIDTH, width));

    return { width, height };
};

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    ...getGameSize(),
    parent: 'game-container',
    backgroundColor: '#1a202c',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MainScene]
};

export default function PhaserGame() {
    return <div id="game-container" />;
}
```

### Шаблон модального окна

```typescript
export default class MyModal extends Phaser.GameObjects.Container {
    private background: NineSliceBackground;
    private content: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, options: MyModalOptions) {
        super(scene, 0, 0);
        scene.add.existing(this);
        this.create();
    }

    private create(): void {
        const cam = this.scene.cameras.main;

        // Grid Snapping
        const modalWidth = snapToGridDouble(options.width);
        const modalHeight = snapToGridDouble(options.height);
        const modalX = snapToGrid(cam.midPoint.x - modalWidth / 2);
        const modalY = snapToGrid(cam.midPoint.y - modalHeight / 2);

        // Фон
        this.background = new NineSliceBackground(this.scene, modalWidth, modalHeight);
        this.background.setPosition(modalX, modalY);
        this.background.setScale(1 / cam.zoom);
        this.add(this.background);

        // Контент с адаптивным шрифтом
        const baseFontSize = FontSizeCalculator.calculateUnifiedBaseFontSize(this.scene, 1);
        const screenAR = this.scene.scale.width / this.scene.scale.height;
        const adaptiveMultiplier = getFontSizeMultiplier(screenAR);
        const finalFontSize = baseFontSize * adaptiveMultiplier;

        this.content = this.scene.add.text(0, 0, options.text, {
            fontSize: `${finalFontSize}px`,
            wordWrap: { width: modalWidth * 0.9 * cam.zoom, useAdvancedWrap: true }
        });
        this.content.setScale(1 / cam.zoom);
        this.content.setPosition(modalX + modalWidth / 2, modalY + modalHeight / 4);
        this.add(this.content);
    }

    public destroy(): void {
        this.content.destroy();
        this.background.destroy();
        super.destroy();
    }
}
```

---

## Константы и конфигурация

### Основные константы

```typescript
// Виртуальный экран
export const BASE_GAME_HEIGHT = 1280;
export const MIN_GAME_WIDTH = 360;
export const MAX_GAME_WIDTH = 2560;

// Масштабирование игрового мира
export const BASE_SCALE = 4.0;
export const MAP_WIDTH = 512;
export const MAP_HEIGHT = 512;

// Центр карты
export const MAP_CENTER_X = (MAP_WIDTH * BASE_SCALE) / 2;  // 1024
export const MAP_CENTER_Y = (MAP_HEIGHT * BASE_SCALE) / 2; // 1024

// Зум камеры
export const PLAYER_HEIGHT_PERCENT = 0.08;
export const PLAYER_FRAME_WIDTH = 16;
export const PLAYER_FRAME_HEIGHT = 16;

// Letterboxing
export const LETTERBOXING_CONFIG = {
    MIN_LETTERBOX_SIZE: 50,
    EXTENSION_FACTOR: 2.0,
    ENABLED_ON_MOBILE: false,
    ENABLED_ON_TABLET: true,
    FORCE_ENABLE_ON_PC: true
} as const;
```

### Адаптивные множители шрифтов

```typescript
export const FONT_SIZE_MULTIPLIERS = {
    ULTRA_NARROW: 1.26,
    EXTRA_NARROW: 1.34,
    MOBILE_NARROW: 1.41,
    MOBILE_STANDARD: 1.45,
    TABLET_SQUARE: 1.49,
    MONITOR_SMALL: 1.54,
    MONITOR_LARGE: 1.54
} as const;
```

---

## FAQ

### Q: Почему фиксированная высота 1280?

**A:** Высота 1280 обеспечивает:
- Достаточное вертикальное пространство для UI
- Стабильность позиционирования элементов по вертикали
- Хорошую читаемость текста на мобильных устройствах

### Q: Почему BASE_SCALE = 4.0?

**A:**
- Базовые ассеты созданы в низком разрешении (16×16, 512×512)
- Масштаб 4× дает хорошее разрешение при ретро-стиле
- Упрощает математические расчеты (четные числа)

### Q: Когда нужно использовать snapToGrid vs snapToGridDouble?

**A:**
- `snapToGrid` (шаг 4) — для координат и размеров элементов
- `snapToGridDouble` (шаг 8) — для размеров контейнеров, где используется деление на 2 (центрирование)

### Q: Зачем компенсировать zoom для UI?

**A:** Текст и UI элементы должны оставаться одного размера на экране независимо от зума камеры. Компенсация `setScale(1 / zoom)` обеспечивает визуальную стабильность.

### Q: Почему letterboxing закрывается фоном, а не меняется virtual resolution?

**A:**
- Изменение virtual resolution ломает координатную систему
- Расширенный фон — чисто визуальное решение
- Физика и логика игры остаются стабильными

### Q: Как обрабатывать поворот экрана?

**A:**
1. Задержка 300ms для завершения анимации поворота
2. Пересчет virtual resolution
3. Вызов `game.scale.updateCenter()` для центрирования
4. Дополнительное центрирование через 50ms для гарантии

### Q: Можно ли использовать разные virtual resolution для portrait/landscape?

**A:** Теоретически да, но требует:
- Определения ориентации при инициализации
- Разных констант для каждой ориентации
- Пересоздания игры при смене ориентации

Текущий подход (фиксированный portrait) проще и надежнее.

---

## Связанная документация

- `SCALING_SYSTEM.md` — Детальная документация текущей реализации
- `MODAL_GUIDE.md` — Руководство по модальным окнам
- `UI_TEXT_SCALING.md` — Grid Snapping и масштабирование текста

---

**Дата создания:** 2026-02-06
**Версия:** 1.0
**Статус:** ✅ Актуально
