# AnimationManager - Универсальная система управления анимациями

## Описание

`AnimationManager` - это универсальная система для загрузки спрайтшитов и создания анимаций из них. Она поддерживает разные форматы расположения кадров и избавляет от необходимости хардкодить каждый спрайтшит отдельно.

## Преимущества

- ✅ **Единая точка конфигурации** - все спрайтшиты настраиваются в одном месте
- ✅ **Поддержка разных форматов** - горизонтальные полосы, вертикальные полосы, сетки
- ✅ **Автоматическая генерация кадров** - встроенные функции для популярных форматов
- ✅ **Легко расширять** - добавление нового спрайтшита = добавление одной конфигурации

## Использование

### 1. Добавление нового спрайтшита

Откройте `src/config/spritesheetConfigs.ts` и добавьте новую конфигурацию:

```typescript
{
  load: {
    key: 'my_sprite_sheet',
    path: 'MySprite.png',
    frameWidth: 16,
    frameHeight: 16,
    layout: SpritesheetLayout.HORIZONTAL, // или GRID, VERTICAL, CUSTOM
    frameCount: 4 // для HORIZONTAL/VERTICAL
  },
  animations: [
    {
      key: 'my_animation',
      frames: AnimationManager.generateHorizontalFrames(0, 3),
      frameRate: 8,
      repeat: -1
    }
  ]
}
```

### 2. Форматы расположения кадров

#### Горизонтальная полоса (HORIZONTAL)
Кадры идут слева направо: `[0, 1, 2, 3, ...]`

```typescript
frames: AnimationManager.generateHorizontalFrames(0, 3)
```

#### Вертикальная полоса (VERTICAL)
Кадры идут сверху вниз: `[0, cols, 2*cols, 3*cols, ...]`

```typescript
frames: AnimationManager.generateVerticalFrames(0, 3, cols)
```

#### Сетка 4x4 (GRID) - для направлений
Формат: 4 колонки (направления) x 4 строки (кадры анимации)
- Колонка 0 = вниз
- Колонка 1 = вверх
- Колонка 2 = влево
- Колонка 3 = вправо

```typescript
frames: AnimationManager.generateGridDirectionFrames('down', 4, 4)
// Генерирует: [0, 4, 8, 12]
```

#### Произвольная сетка (GRID)
```typescript
frames: AnimationManager.generateGridFrames(
  startRow, endRow,
  startCol, endCol,
  cols
)
```

#### Кастомные кадры (CUSTOM)
```typescript
frames: [0, 5, 10, 15] // явное указание кадров
// или
frames: [
  { frame: 0, duration: 100 },
  { frame: 5, duration: 150 }
]
```

### 3. Примеры конфигураций

#### Простая горизонтальная анимация (ключ)
```typescript
{
  load: {
    key: 'key_sheet',
    path: 'Key_64x16.png',
    frameWidth: 16,
    frameHeight: 16,
    layout: SpritesheetLayout.HORIZONTAL,
    frameCount: 4
  },
  animations: [
    {
      key: 'key_idle',
      frames: AnimationManager.generateHorizontalFrames(0, 3),
      frameRate: 8,
      repeat: -1
    }
  ]
}
```

#### Сетка с 4 направлениями (игрок, враги)
```typescript
{
  load: {
    key: 'boy_walk_sheet',
    path: 'BoyWalk.png',
    frameWidth: 16,
    frameHeight: 16,
    layout: SpritesheetLayout.GRID,
    rows: 4,
    cols: 4
  },
  animations: [
    {
      key: 'boy_down',
      frames: AnimationManager.generateGridDirectionFrames('down', 4, 4),
      frameRate: 8,
      repeat: -1
    },
    // ... остальные направления
  ]
}
```

## Текущие конфигурации

Все спрайтшиты уже настроены в `src/config/spritesheetConfigs.ts`:

- ✅ `beast_sheet` - Beast (4 направления)
- ✅ `dragon_sheet` - Dragon (4 направления)
- ✅ `flam_sheet` - Flam (4 направления)
- ✅ `boy_walk_sheet` - Игрок (4 направления)
- ✅ `key_sheet` - Руна (горизонтальная полоса)
- ✅ `boy_jump` - Анимация окончания игры (горизонтальная полоса)

## API

### AnimationManager

```typescript
// Загрузить спрайтшит
loadSpritesheet(config: SpritesheetLoadConfig): void

// Создать анимации (после загрузки)
createAnimations(spritesheetKey: string, animations: AnimationConfig[]): void

// Загрузить и создать (полная конфигурация)
loadAndCreateAnimations(config: SpritesheetConfig): void

// Проверка загрузки
isSpritesheetLoaded(key: string): boolean
isAnimationCreated(key: string): boolean
```

### Генераторы кадров

```typescript
// Горизонтальная полоса
AnimationManager.generateHorizontalFrames(start: number, end: number): number[]

// Вертикальная полоса
AnimationManager.generateVerticalFrames(start: number, end: number, cols: number): number[]

// Сетка с направлениями
AnimationManager.generateGridDirectionFrames(
  direction: 'down' | 'up' | 'left' | 'right',
  frameCount: number,
  cols: number
): number[]

// Произвольная сетка
AnimationManager.generateGridFrames(
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  cols: number
): number[]
```

## Ручная синхронизация кадров для physics спрайтов

**Важно:** Phaser не обновляет кадры анимаций автоматически для physics спрайтов (`Phaser.Physics.Arcade.Sprite`). Для таких спрайтов требуется ручная синхронизация кадров.

### SpriteAnimationHandler

Для игрока и врагов используется `SpriteAnimationHandler`, который автоматически синхронизирует кадры:

```typescript
// В Player.ts и AbstractEnemy.ts
this.animationHandler = new SpriteAnimationHandler(scene, sprite, 'boy');
this.animationHandler.playDirectionAnimation(velocityX, velocityY);
this.animationHandler.syncFrame(); // Вызывается в update()
```

### Ручная синхронизация для других спрайтов

Для ключей и BoyJump (в GameOverModal) используется ручная синхронизация в `MainScene.update()`:

```typescript
// Для ключей
if (rune.anims.isPlaying) {
  rune._animationTimer += delta;
  if (rune._animationTimer >= rune._animationInterval) {
    rune._animationTimer = 0;
    rune._animationFrameIndex = (rune._animationFrameIndex + 1) % anim.frames.length;
    rune.setFrame(anim.frames[rune._animationFrameIndex].frame.index);
  }
}
```

**Примечание:** Обычные спрайты (`Phaser.GameObjects.Sprite`) обновляются автоматически Phaser'ом.

## Миграция со старого кода

Старый хардкод:
```typescript
// ❌ Старый способ
this.load.spritesheet('key_sheet', path, { frameWidth: 16, frameHeight: 16 });
this.anims.create({
  key: 'key_idle',
  frames: [{ key: 'key_sheet', frame: 0 }, ...],
  frameRate: 8
});
```

Новый способ:
```typescript
// ✅ Новый способ - просто добавьте в SPRITESHEET_CONFIGS
// Всё остальное делается автоматически!
// Для physics спрайтов используйте SpriteAnimationHandler или ручную синхронизацию
```

