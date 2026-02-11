# Система масштабирования (Scaling System)

**Дата создания:** 2026-02-07
**Назначение:** Документация по правилам масштабирования графики в проекте

---

## Обзор

Проект использует пиксельную графику с базовым разрешением **180×320** (в 4 раза меньше виртуального экрана **720×1280**). Все графические элементы масштабируются с помощью множителей для сохранения чёткости пикселей.

---

## Константы масштабирования

### `BASE_SCALE = 4.0`

**Расположение:** `src/constants/gameConstants.ts`

```typescript
export const BASE_SCALE = 4.0;
```

**Назначение:** Общий множитель масштабирования для всей графики.

- Исходные текстуры: **180×320** (4× меньше виртуального экрана)
- Виртуальный экран: **720×1280**
- Каждый пиксель исходной графики = 4 виртуальных пикселя

---

## Типы элементов и их масштабирование

### 1. Игровые акторы (World Objects)

**Типы:** Player, Enemy, Key, Coin, Portal, Oracle, и т.д.

**Формула:**
```typescript
setScale(BASE_SCALE * ACTOR_SIZES[тип] * invZoom)
```

**Где:**
- `BASE_SCALE = 4.0` - базовый множитель
- `ACTOR_SIZES[тип] = 1.0` - индивидуальный множитель (обычно 1.0)
- `invZoom = 1 / camera.zoom` - компенсация зума камеры

**Пример:** Персонаж 16×16px
```
displaySize = 16 × 4.0 × 1.0 × 0.625 = 40px (при zoom=1.6)
```

---

### 2. UI элементы (Screen Objects)

**Типы:** Текст, кнопки, иконки на HUD

**Особенности:**
- Имеют `scrollFactor: 0` (фиксированы на экране)
- **UI спрайты используют `BASE_SCALE` (БЕЗ invZoom)**
- **Текст использует `invZoom`** (для компенсации zoom камеры)

**Формула для UI спрайтов:**
```typescript
setScale(BASE_SCALE)  // Просто 4.0, БЕЗ invZoom!
// Примеры: ui_dialog_close, ui_sound_toggle, question_bubble
```

**Формула для текста:**
```typescript
setScale(invZoom)  // Компенсация zoom камеры
```

**Почему разница:**
- UI спрайты (кнопки, иконки) имеют правильный масштаб при `BASE_SCALE = 4.0`
- Текст имеет fontSize в пикселях (32px, 24px и т.д.), который уже учитывает масштаб
- `invZoom` для текста нужен только для компенсации zoom камеры, чтобы текст не "поплавал" при зуме

---

## ACTOR_SIZES

**Расположение:** `src/constants/gameConstants.ts`

```typescript
export const ACTOR_SIZES = {
    PLAYER: 1.0,      // 16×16px → 64×64px
    ENEMY: 1.0,       // 16×16px → 64×64px
    KEY: 1.0,         // 16×16px → 64×64px
    COIN: 1.0,        // 16×16px → 64×64px
    PORTAL: 1.0,      // 32×48px → 128×192px
    ORACLE: 1.0,      // 32×56px → 128×224px
    HEART: 1.0,       // 16×16px → 64×64px
    GRASS: 1.0,       // 16×16px → 64×64px
    BUSH: 1.0,        // 32×32px → 128×128px
    QUESTION_BUBBLE: 1.0,  // 160×64px → 640×256px
} as const;
```

---

## Примеры расчёта

### Пример 1: Персонаж (Player)
- **Исходный размер:** 16×16px
- **BASE_SCALE:** 4.0
- **ACTOR_SIZES.PLAYER:** 1.0
- **zoom камеры:** 1.6
- **invZoom:** 0.625

```
scale = 4.0 × 1.0 × 0.625 = 2.5
displaySize = 16 × 2.5 = 40px
```

### Пример 2: UI кнопка звука
- **Исходный размер:** 8×8px
- **Множитель:** BASE_SCALE = 4.0
- **scrollFactor:** 0 (фиксирована на экране)

```
scale = 4.0 (просто BASE_SCALE, БЕЗ invZoom!)
displaySize = 8 × 4 = 32px
```

**ВАЖНО:** UI спрайты используют чистый `BASE_SCALE`, так как они имеют `scrollFactor: 0`.

### Пример 3: Текст HUD
- **fontSize:** 32px
- **zoom камеры:** 1.6

```
scale = 0.625 (только invZoom)
displayHeight ≈ 35px (с padding)
```

---

## Фильтрация текстур (Pixel Art)

Для чёткости пикселей используется **NEAREST** фильтр:

```typescript
// В PhaserGame.tsx
render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
}

// Применение к текстурам
texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
```

---

## Правила для разработчиков

### ✅ ДЛЯ ИГРОВЫХ СПРАЙТОВ (World, scrollFactor=1):
```typescript
sprite.setScale(BASE_SCALE * ACTOR_SIZES[ТИП] * invZoom);
```

### ✅ ДЛЯ UI СПРАЙТОВ (Screen, scrollFactor=0):
```typescript
sprite.setScale(BASE_SCALE);  // Просто 4.0, БЕЗ invZoom!
// Примеры: ui_dialog_close, ui_sound_toggle, question_bubble
```

### ✅ ДЛЯ ТЕКСТА UI (scrollFactor=0):
```typescript
text.setScale(invZoom);  // Компенсация zoom камеры
```

### ❌ НЕ ДЕЛАТЬ:
```typescript
// ❌ Неправильные примеры
sprite.setScale(2.5);              // Жёстко заданный scale
sprite.setScale(invZoom);          // UI спрайт будет слишком мелким
sprite.setScale(BASE_SCALE * invZoom);  // Лишний invZoom для UI!
```

---

## Zoom компенсация

**Когда нужен `invZoom`:**
- ✅ Игровые спрайты в мире (`scrollFactor=1`): ДА
- ✅ Текст UI (`scrollFactor=0`): ДА
- ❌ UI спрайты (`scrollFactor=0`): НЕТ!

При zoom камеры > 1, объекты в мире увеличиваются. `invZoom` компенсирует это для объектов, которые должны сохранять визуальный размер.

---

## Таблица размеров

| Элемент | Исходный | Scale | Размер на экране |
|---------|----------|-------|------------------|
| Player | 16×16px | BASE_SCALE × invZoom | 40×40px |
| Key | 16×16px | BASE_SCALE × invZoom | 40×40px |
| Coin | 16×16px | BASE_SCALE × invZoom | 40×40px |
| Portal | 32×48px | BASE_SCALE × invZoom | 80×120px |
| UI Button (звук) | 8×8px | BASE_SCALE | 32×32px |
| UI DialogClose | 14×14px | BASE_SCALE | 56×56px |
| Question Bubble | 160×64px | BASE_SCALE | 640×256px |
| HUD Text | 32px font | invZoom | 35px height |

---

## Связанные файлы

- `src/constants/gameConstants.ts` - BASE_SCALE, ACTOR_SIZES
- `src/react/PhaserGame.tsx` - render config (pixelArt, antialias)
- `src/game/scenes/ui/HUDManager.ts` - пример масштабирования UI
