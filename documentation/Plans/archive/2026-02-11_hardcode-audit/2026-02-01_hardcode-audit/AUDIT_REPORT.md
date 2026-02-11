# Детальный аудит хардкода в проекте ArcadeQuiz

**Дата:** 2026-02-01
**Аудитор:** Claude Code Analysis
**Область:** Production code в `src/`
**Фокус:** Magic numbers, строки, цвета, UI значения, пути к аудио

---

## Executive Summary

Аудит выявил **множество категорий захардкоженных значений** по всей кодовой базе. Многие значения уже правильно централизованы в константах (`gameConstants.ts`, `textStyles.ts`), но numerous захардкоженные значения остаются разбросанными по коду, которые должны быть рефакторены в константы для лучшей поддерживаемости, консистентности и конфигурируемости.

### Ключевые метрики

| Категория | Найдено | Подлежит рефакторингу | Оставить как есть |
|-----------|---------|----------------------|-------------------|
| Magic Numbers (тайминги) | ~30 | ~25 | ~5 |
| Z-Depth значения | ~20 | ~20 | 0 |
| Animation Keys | ~15 | ~15 | 0 |
| Audio Paths | ~50 | ~50 | 0 |
| UI Тексты | ~10 | ~8 | ~2 |
| Цвета | ~5 | ~3 | ~2 |

---

## Часть 1: Magic Numbers (Тайминги, длительности, размеры)

### 1.1 Игровые механики (Game Mechanics)

#### `src/game/entities/Player.ts`

| Строка | Значение | Контекст | Анализ | Рекомендация |
|--------|----------|----------|---------|--------------|
| 71 | `200` | Knockback force (отталкивание) | **Рефакторить** - параметр игровой механики | `KNOCKBACK_FORCE: 200` в `gameConstants.ts` |
| 71 | `300` | Knockback duration (ms) | **Рефакторить** - параметр игровой механики | `KNOCKBACK_DURATION: 300` в `gameConstants.ts` |
| 384 | `100` | Damage animation duration | **Рефакторить** - параметр визуального эффекта | `DAMAGE_ANIMATION_DURATION: 100` в `gameConstants.ts` |
| 1064, 1160, 1251 | `16` | Animation delay (~60 FPS) | **Оставить** - техническая константа для 60 FPS | Техническая деталь реализации |
| 1387 | `500` | Key apply animation duration | **Рефакторить** - параметр анимации | `KEY_APPLY_DURATION: 500` в `gameConstants.ts` |

#### `src/game/entities/enemies/AbstractEnemy.ts`

| Строка | Значение | Контекст | Анализ | Рекомендация |
|--------|----------|----------|---------|--------------|
| 23 | `500` | Collision cooldown (ms) | **Рефакторить** - параметр игровой механики | `ENEMY_COLLISION_COOLDOWN: 500` в `gameConstants.ts` |
| 49 | `2000` | Detection cooldown (ms) | **Рефакторить** - параметр игровой механики | `ENEMY_DETECTION_COOLDOWN: 2000` в `gameConstants.ts` |
| 659, 767 | `1000` | Damage blink duration | **Рефакторить** - параметр визуального эффекта | `DAMAGE_BLINK_DURATION: 1000` в `gameConstants.ts` |
| 660, 768 | `50` | Damage blink interval | **Рефакторить** - параметр визуального эффекта | `DAMAGE_BLINK_INTERVAL: 50` в `gameConstants.ts` |
| 1142 | `100` | Death animation fallback duration | **Рефакторить** - fallback значение | `DEATH_ANIMATION_FALLBACK_DURATION: 100` в `gameConstants.ts` |
| 1353, 1362 | `16` | Update delay (~60 FPS) | **Оставить** - техническая константа | Техническая деталь реализации |

#### `src/game/entities/Oracle.ts`

| Строка | Значение | Контекст | Анализ | Рекомендация |
|--------|----------|----------|---------|--------------|
| 34 | `3` | Maximum keys | **Рефакторить** - параметр игровой механики | `ORACLE_MAX_KEYS: 3` в `gameConstants.ts` |
| 37 | `3` | Maximum coins | **Рефакторить** - параметр игровой механики | `ORACLE_MAX_COINS: 3` в `gameConstants.ts` |

### 1.2 UI и визуальные эффекты

#### `src/game/scenes/ui/EffectsManager.ts`

| Строка | Значение | Контекст | Анализ | Рекомендация |
|--------|----------|----------|---------|--------------|
| 72 | `1000` | Shake duration | **Рефакторить** - параметр эффекта | `SHAKE_DURATION: 1000` в `gameConstants.ts` |
| 95 | `100` | Flash duration | **Рефакторить** - параметр эффекта | `FLASH_DURATION: 100` в `gameConstants.ts` |
| 134 | `200` | Delay before effects | **Рефакторить** - параметр тайминга | `EFFECTS_START_DELAY: 200` в `gameConstants.ts` |
| 262 | `16` | Update delay (~60 FPS) | **Оставить** - техническая константа | Техническая деталь реализации |
| 321 | `500` | Fade duration | **Рефакторить** - параметр эффекта | `FADE_DURATION: 500` в `gameConstants.ts` |

#### `src/game/ui/Button.ts`

| Строка | Значение | Контекст | Анализ | Рекомендация |
|--------|----------|----------|---------|--------------|
| 396 | `600` | Button animation duration | **Рефакторить** - параметр UI анимации | `BUTTON_ANIMATION_DURATION: 600` в `gameConstants.ts` |

#### `src/game/scenes/collision/PortalCollisionHandler.ts`

| Строка | Значение | Контекст | Анализ | Рекомендация |
|--------|----------|----------|---------|--------------|
| 29 | `100` | Portal interaction duration | **Рефакторить** - параметр игровой механики | `PORTAL_INTERACTION_DURATION: 100` в `gameConstants.ts` |

#### `src/game/ui/QuestionBubble.ts`

| Строка | Значение | Контекст | Анализ | Рекомендация |
|--------|----------|----------|---------|--------------|
| 351 | `300` | Animation duration | **Рефакторить** - параметр UI анимации | `QUESTION_BUBBLE_ANIMATION_DURATION: 300` в `gameConstants.ts` |

---

## Часть 2: Z-Depth значения (КРИТИЧНО)

### Текущая ситуация

Z-depth значения разбросаны по всем UI компонентам и создают риск ошибок при нарушении иерархии слоёв.

### Найденные hardcoded Z-depth значения

| Файл | Строка | Значение | Контекст | Анализ |
|------|-------|----------|----------|---------|
| `DebugOverlay.ts` | 147 | `999999` | Debug overlay depth | **Рефакторить** |
| `DebugOverlay.ts` | 294 | `-50` | Spawn matrix grid depth | **Рефакторить** |
| `CoinBubbleQuiz.ts` | 252 | `2000` | Coin bubble container | **Рефакторить** |
| `Button.ts` | 78, 96 | `1002` | Button background/icon | **Рефакторить** |
| `Button.ts` | 150 | `1003` | Button text | **Рефакторить** |
| `QuestionBubble.ts` | 98 | `100` | Question bubble | **Рефакторить** |
| `QuestionBubble.ts` | 437 | `0.75` | Hint opacity | **Рефакторить** |
| `GameOverModal.ts` | 149, 155 | `2000` | Modal elements | **Рефакторить** |
| `GameOverModal.ts` | 294, 352 | `2001` | Modal text | **Рефакторить** |
| `GameOverModal.ts` | 325, 385, 412 | `2002` | Modal buttons | **Рефакторить** |
| `PortalModal.ts` | 310 | `9999` | Close button | **Рефакторить** |
| `KeyQuestionModal.ts` | 237, 242 | `2000` | Modal elements | **Рефакторить** |
| `KeyQuestionModal.ts` | 404, 441, 523 | `2001` | Modal text | **Рефакторить** |
| `KeyQuestionModal.ts` | 498 | `2002` | Modal buttons | **Рефакторить** |
| `Coin.ts`, `Key.ts`, `Heart.ts` | - | `100` | Items depth | **Рефакторить** |

### Рекомендуемая централизованная структура

```typescript
// В gameConstants.ts добавить:
export const DEPTHS = {
  // === Background Layers ===
  BACKGROUND_BASE: -100,
  BACKGROUND_STRUCT: 1,

  // === Game Objects ===
  TILED_MAP_LAYERS: 0,       // Tiled Map слои (обычно 0-10)
  ITEMS: 100,                // Coin, Key, Heart
  PORTAL: 150,               // Portals
  PLAYER: 200,               // Player character

  // === Entities ===
  ENEMY: 7,
  ORACLE: 8,
  ORACLE_COIN_INDICATOR: 8.1,

  // === Effects ===
  HEART_GLOW: 10,
  HEART_BASE: 11,

  // === UI (Screen Space) ===
  QUESTION_BUBBLE: 100,
  UI_BUTTON_BG: 1002,
  UI_BUTTON_ICON: 1002,
  UI_BUTTON_TEXT: 1003,

  // === Modals ===
  MODAL_BG: 2000,
  MODAL_CONTENT: 2000,
  MODAL_TEXT: 2001,
  MODAL_BUTTON: 2002,

  // === Overlays ===
  DEBUG_OVERLAY: 999999,
  UI_MAX: 9999,

  // === Special ===
  SPAWN_MATRIX_GRID: -50
} as const;
```

---

## Часть 3: Animation Keys (Анимационные ключи)

### Проблема

Ключи анимаций захардкожены в виде строк по всей кодовой базе:

```typescript
// Примеры hardcoded keys:
'boy_down', 'boy_up', 'boy_left', 'boy_right'
'beast_down', 'dragon_down', 'flam_down'
'coin_idle', 'key_idle'
'enemy_death'
'portal_idle', 'portal_activating', 'portal_activated'
```

### Найденные location

| Файл | Использование | Анализ |
|------|---------------|---------|
| `SpriteAnimationHandler.ts:131-143` | Префиксы `'dragon'`, `'flam'`, `'beast'` | **Рефакторить** |
| `SpriteAnimationHandler.ts:131-143` | Суффиксы `'_down'`, `'_up'`, `'_left'`, `'_right'` | **Рефакторить** |
| `Coin.ts:35` | `'coin_idle'` | **Рефакторить** |
| `Key.ts:35` | `'key_idle'` | **Рефакторить** |
| `AbstractEnemy.ts` | `'enemy_death'` | **Рефакторить** |

### Рекомендуемая структура

```typescript
// В gameConstants.ts добавить:
export const ANIMATION_KEYS = {
  PLAYER: {
    DOWN: 'boy_down',
    UP: 'boy_up',
    LEFT: 'boy_left',
    RIGHT: 'boy_right',
    IDLE: 'boy_idle'
  },
  ENEMIES: {
    BEAST: {
      DOWN: 'beast_down',
      UP: 'beast_up',
      LEFT: 'beast_left',
      RIGHT: 'beast_right'
    },
    DRAGON: {
      DOWN: 'dragon_down',
      UP: 'dragon_up',
      LEFT: 'dragon_left',
      RIGHT: 'dragon_right'
    },
    FLAM: {
      DOWN: 'flam_down',
      UP: 'flam_up',
      LEFT: 'flam_left',
      RIGHT: 'flam_right'
    }
  },
  ITEMS: {
    COIN_IDLE: 'coin_idle',
    KEY_IDLE: 'key_idle'
  },
  EFFECTS: {
    DEATH: 'enemy_death'
  },
  PORTAL: {
    IDLE: 'portal_idle',
    ACTIVATING: 'portal_activating',
    ACTIVATED: 'portal_activated'
  },
  ORACLE: {
    IDLE: 'oracle_idle',
    ACTIVATING: 'oracle_activating',
    ACTIVATED: 'oracle_activated'
  }
} as const;

// Для генерации ключей:
export const ANIMATION_DIRECTIONS = ['down', 'up', 'left', 'right'] as const;
export const ANIMATION_PREFIXES = {
  PLAYER: 'boy',
  BEAST: 'beast',
  DRAGON: 'dragon',
  FLAM: 'flam'
} as const;
```

---

## Часть 4: Audio Paths (Пути к аудио файлам)

### Проблема

Все пути к аудио файлам захардкожены в `AudioManager.ts`:

```typescript
await this.loadSound(SOUND_KEYS.MUSIC_BASE, 'mp3/Music.Base.mp3');
await this.loadSound(SOUND_KEYS.MUSIC_WIN, 'mp3/Music.Win.mp3');
await this.loadSound(SOUND_KEYS.SFX_BTN_CLICK, 'mp3/SFX_Btn.CLICK.mp3');
// ... и ещё ~50 таких строк
```

### Полный список захардкоженных путей

**Music:**
- `'mp3/Music.Base.mp3'`
- `'mp3/Music.Win.mp3'`
- `'mp3/Music.GameOver.mp3'`

**SFX - Buttons:**
- `'mp3/SFX_Btn.CLICK.mp3'`
- `'mp3/SFX_Btn.Question.CLOSE.mp3'`

**SFX - Character:**
- `'mp3/SFX_Character.Damage.mp3'`
- `'mp3/SFX_Character.PickUp.Key.mp3'`
- `'mp3/SFX_Character.PickUp.Coin.mp3'`
- `'mp3/SFX_Character.Coin.Success.mp3'`
- `'mp3/SFX_Character.Damage.Coin.mp3'`
- `'mp3/SFX_Character.LoseKey.mp3'`
- `'mp3/SFX_Character.LoseLife.mp3'`

**SFX - Game:**
- `'mp3/SFX_Game.WrongAnswer.mp3'`
- `'mp3/SFX_Game.CorrectAnswer.mp3'`
- `'mp3/SFX_Game.LevelComplete.mp3'`
- `'mp3/SFX_Game.AllKeysCollected.mp3'`
- `'mp3/SFX_Game.PortalOpen.mp3'`

### Рекомендуемая структура

```typescript
// В gameConstants.ts добавить:
export const AUDIO_PATHS = {
  MUSIC: {
    BASE: 'mp3/Music.Base.mp3',
    WIN: 'mp3/Music.Win.mp3',
    GAME_OVER: 'mp3/Music.GameOver.mp3'
  },
  SFX: {
    BUTTONS: {
      CLICK: 'mp3/SFX_Btn.CLICK.mp3',
      QUESTION_CLOSE: 'mp3/SFX_Btn.Question.CLOSE.mp3'
    },
    CHARACTER: {
      DAMAGE: 'mp3/SFX_Character.Damage.mp3',
      PICKUP_KEY: 'mp3/SFX_Character.PickUp.Key.mp3',
      PICKUP_COIN: 'mp3/SFX_Character.PickUp.Coin.mp3',
      COIN_SUCCESS: 'mp3/SFX_Character.Coin.Success.mp3',
      DAMAGE_COIN: 'mp3/SFX_Character.Damage.Coin.mp3',
      LOSE_KEY: 'mp3/SFX_Character.LoseKey.mp3',
      LOSE_LIFE: 'mp3/SFX_Character.LoseLife.mp3'
    },
    GAME: {
      WRONG_ANSWER: 'mp3/SFX_Game.WrongAnswer.mp3',
      CORRECT_ANSWER: 'mp3/SFX_Game.CorrectAnswer.mp3',
      LEVEL_COMPLETE: 'mp3/SFX_Game.LevelComplete.mp3',
      ALL_KEYS_COLLECTED: 'mp3/SFX_Game.AllKeysCollected.mp3',
      PORTAL_OPEN: 'mp3/SFX_Game.PortalOpen.mp3'
    }
  }
} as const;
```

---

## Часть 5: Цвета (Colors)

### Уже есть в textStyles.ts

```typescript
export const COLORS = {
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GOLD: '#FFD700',
  LIGHT_GRAY: '#cbd5e0',
  PURPLE: '#4B0082',
  MODAL_BORDER: '#60422f',
  PORTAL_CORRECT: '#00FF00',
  PORTAL_WRONG: '#FF4444',
  PORTAL_CORRECT_NORMAL: '#FF4500',
  DEBUG_GREEN: '#00ff00',
  ORACLE_ACTIVE: '#FF8C00',
  WIN_COLOR: '#00FF00',
  PORTAL_OPEN: '#00FFFF'
};
```

### Найденные hardcoded цвета (не используют константы)

| Файл | Строка | Значение | Контекст | Рекомендация |
|------|-------|----------|----------|--------------|
| `Button.ts:85` | `0xffffff` | Normal state tint | Использовать `COLORS.WHITE` |
| `CoinBubbleQuiz.ts:141` | `0x000000` | Text stroke color | Использовать `COLORS.BLACK` |
| `CoinBubbleQuiz.ts:329` | `0xFFEC8B` | Hover tint (gold) | Добавить в `COLORS` как `BUTTON_HOVER_GOLD` |
| `CoinBubbleQuiz.ts:350` | `0xD4A017` | Pressed tint (dark gold) | Добавить в `COLORS` как `BUTTON_PRESSED_GOLD` |

---

## Часть 6: UI Text Strings (Текстовые строки UI)

### Найденные hardcoded тексты

| Файл | Строка | Значение | Контекст | Рекомендация |
|------|-------|----------|----------|--------------|
| `GameOverModal.ts:144` | `"Score: "` | Префикс счёта | `TEXT_SCORE_PREFIX: "Score: "` в `textStyles.ts` |
| `KeyQuestionModal.ts:585` | `"Close"` | Текст кнопки закрытия | `TEXT_CLOSE_BUTTON: "Close"` в `textStyles.ts` |
| `HUDManager.ts` | `"Счёт: "` | HUD счёт на русском | `TEXT_SCORE_RU: "Счёт: "` в `textStyles.ts` |
| `HUDManager.ts` | `"Ключей: "` | HUD ключей на русском | `TEXT_KEYS_RU: "Ключей: "` в `textStyles.ts` |

---

## Часть 7: Оправданный хардкод (Оставить как есть)

### 7.1 Frame Dimensions (Размеры кадров спрайтов)

**Файл:** `src/config/spritesheetConfigs.ts`

Эти значения получены из actual assets и НЕ должны быть абстрагированы:

```typescript
// Примеры ОПРАВДАННОГО хардкода:
{ frameWidth: 16, frameHeight: 16 }  // character sprites
{ frameWidth: 32, frameHeight: 32 }  // portal animations
{ frameWidth: 64, frameHeight: 48 }  // oracle animations
```

**Причина:** Это технические параметры assets, полученные из графических файлов. Изменение этих значений без изменения actual assets сломает рендеринг.

### 7.2 FPS Values (Частота кадров анимации)

```typescript
// Примеры ОПРАВДАННОГО хардкода:
frameRate: 8   // Базовая скорость анимации (design choice)
frameRate: 12  // Специальные анимации (design choice)
frameRate: 24  // Oracle activation (design choice)
```

**Причина:** Это художественные решения (artistic choices) для визуального стиля игры.

### 7.3 Простые значения (Simple Values)

```typescript
// Примеры ОПРАВДАННОГО хардкода:
0, 1, -1           // Значения по умолчанию
true / false       // Boolean значения
[]                 // Пустые массивы
```

**Причина:** Универсальные программные константы.

### 7.4 Технические константы (Technical Constants)

```typescript
// Примеры ОПРАВДАННОГО хардкода:
16  // ~60 FPS (1000ms / 60 ≈ 16ms)
Math.round() // Для pixel-perfect позиционирования
```

**Причина:** Технические детали реализации, не относящиеся к игровой логике.

---

## Рекомендации по приоритетам

### 🔴 Высокий приоритет (Критично для поддерживаемости)

1. **Централизовать Z-Depth значения**
   - Создать константу `DEPTHS` в `gameConstants.ts`
   - Заменить все hardcoded `setDepth()` вызовы
   - Обеспечить консистентную иерархию слоёв

2. **Вынести пути к аудио файлам**
   - Создать константу `AUDIO_PATHS` в `gameConstants.ts`
   - Обновить `AudioManager.ts` для использования этих констант

3. **Стандартизировать ключи анимаций**
   - Создать константы `ANIMATION_KEYS` и `ANIMATION_DIRECTIONS`
   - Централизовать всю логику генерации ключей анимаций

### 🟡 Средний приоритет (Важно для консистентности)

4. **Константы UI текстов**
   - Вынести все hardcoded UI строки в `textStyles.ts`
   - Подготовка к i18n (интернационализации)

5. **Константы игровых механик**
   - Переместить timing значения (knockback, cooldowns) в `gameConstants.ts`
   - Сделать игровые параметры легко конфигурируемыми

### 🟢 Низкий приоритет (Полезно, но не критично)

6. **Цвета для кнопок**
   - Добавить hover/pressed tint цвета в `COLORS`

---

## План реализации

### Фаза 1: Z-Depth стандартизация (2-3 часа)
1. Создать константу `DEPTHS` в `gameConstants.ts`
2. Обновить все UI компоненты для использования depth констант
3. Верифицировать визуальную иерархию

### Фаза 2: Audio paths централизация (1-2 часа)
1. Создать константу `AUDIO_PATHS`
2. Обновить `AudioManager.ts`
3. Обновить все asset loading референсы

### Фаза 3: Animation keys стандартизация (2-3 часа)
1. Создать animation константы
2. Обновить `SpriteAnimationHandler.ts`
3. Обновить весь animation-related код

### Фаза 4: UI тексты и механики (3-4 часа)
1. Вынести UI текст строки
2. Централизовать game mechanics timing
3. Обновить затронутые компоненты

---

## Impact Assessment

### Benefits (Преимущества)

- ✅ Улучшенная поддерживаемость
- ✅ Консистентная визуальная иерархия
- ✅ Лёгкое управление assets
- ✅ Лучшая конфигурируемость
- ✅ Меньше багов от hardcoded значений
- ✅ Готовность к i18n (интернационализации)

### Effort Estimate (Оценка усилий)

| Фаза | Время | Риск |
|------|-------|------|
| Фаза 1: Z-Depth | 2-3 часа | Низкий |
| Фаза 2: Audio | 1-2 часа | Низкий |
| Фаза 3: Animation | 2-3 часа | Средний |
| Фаза 4: UI + Mechanics | 3-4 часа | Средний |
| **Total** | **8-12 часов** | |

---

## Заключение

Кодовая база показывает хорошие практики с многими значениями, уже централизованными в constants files. Однако остаются значительные возможности для улучшения, особенно в Z-depth management, audio paths, и animation keys. Реализация этих рекомендаций сделает кодовую базу более поддерживаемой и консистентной.

---

**Аудит завершён:** 2026-02-01
**Следующий шаг:** Создать план рефакторинга (PLAN.md)
