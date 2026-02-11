# Реализация уровней с использованием Tiled Map

**Версия:** 1.0  
**Дата создания:** 2025-01-XX  
**Дата последнего обновления:** 2025-01-XX  
**Статус:** ✅ Реализовано

---

## Краткое описание

Документация описывает новую реализацию уровней с использованием Tiled Map для A/B тестирования. Реализация позволяет переключаться между случайным спавном объектов (старая система) и размещением объектов на основе Tiled Map JSON файла (новая система).

---

## Содержание

1. [Обзор](#обзор)
2. [A/B тестирование](#ab-тестирование)
3. [Конфигурация](#конфигурация)
4. [Структура Tiled Map](#структура-tiled-map)
5. [Загрузка ресурсов](#загрузка-ресурсов)
6. [Создание игрового мира](#создание-игрового-мира)
7. [Интеграция с SpawnMatrix](#интеграция-с-spawnmatrix)
8. [Иерархия слоев (Z-order)](#иерархия-слоев-z-order)
9. [Координаты и масштабирование](#координаты-и-масштабирование)
10. [Отличия от старой реализации](#отличия-от-старой-реализации)

---

## Обзор

Новая реализация использует Tiled Map Editor для создания уровней. Вместо случайного размещения объектов (порталы, оракул, коллизии) все статические объекты размещаются вручную в Tiled Map, что позволяет дизайнерам точно контролировать расположение элементов уровня.

### Основные преимущества:

- **Точное размещение объектов** — дизайнеры могут визуально размещать порталы и оракул
- **Визуальное проектирование коллизий** — коллизии создаются в Tiled Map, а не программно
- **Легкое изменение уровней** — достаточно отредактировать JSON файл
- **A/B тестирование** — можно переключаться между старой и новой реализацией

---

## A/B тестирование

Реализация поддерживает A/B тестирование через флаг `useTiledMap` в конфигурации уровня.

### Переключение режимов

В файле `src/config/levelConfigs/level1.config.json`:

```json
{
  "levelConfig": {
    "useTiledMap": true,  // true = Tiled Map, false = Random Spawn
    "tiledMapKey": "level1_json"
  }
}
```

### Логика переключения

В `MainScene.createGameWorld()`:

```typescript
const levelConfig = await this.levelManager.getLevelConfig();
const useTiledMap = levelConfig?.useTiledMap ?? false;

if (useTiledMap) {
    await this.createGameWorldTiled(tiledMapKey, mapWidthScaled, mapHeightScaled);
} else {
    await this.createGameWorldRandom(mapWidthScaled, mapHeightScaled);
}
```

---

## Конфигурация

### Типы

В `src/types/levelTypes.ts`:

```typescript
export interface LevelConfig {
  // ... другие поля
  levelConfig?: {
    useTiledMap?: boolean;
    tiledMapKey?: string;
  };
}
```

### Константы

В `src/constants/gameConstants.ts` добавлены ключи для новых текстур:

```typescript
export const KEYS = {
  // ... существующие ключи
  MAP_BASE_BG: 'map_base_bg',           // Bg.Base_512x512.png
  MAP_STRUCT_BG: 'map_struct_bg',       // Bg.Struct_512x512.png
  MAP_OVERLAY_BG: 'map_overlay_bg',     // Bg.Overlay_512x512.png
  PORTAL_BASE_NEW: 'portal_base_new',   // Portal.Base_32x48.png
  PORTAL_ACTIVATION_NEW: 'portal_activation_new', // Portal.Activation_32x48.png
  PORTAL_ACTIVATED_NEW: 'portal_activated_new'    // Portal.Activated_32x48.png
};
```

---

## Структура Tiled Map

### JSON файл

Tiled Map JSON файл (`Level1_map.json`) содержит:

1. **Tile Layer "Collision Mask"**
   - Сетка 64×64 тайлов (тайлы 8×8 пикселей)
   - Определяет зоны коллизий
   - Используется для интеграции с SpawnMatrix

2. **Object Layer "InteractiveObjects"**
   - **Oracle**: Объект оракула.
   - **Portal**: Объект портала (свойство `portalId` int).
   - **OracleMsg**: Объект для позиционирования баббла оракула.
   - **PortalMsg**: Объект для позиционирования баббла портала (свойство `portalMsgId` int должно совпадать с `portalId` портала).
   - Координаты всех объектов задаются в пикселях Tiled Map.

3. **Tile Layer "Overlap Mask"** (GID 12, Зеленый тайл)
   - Определяет зоны, где физическая коллизия игрока с объектами (например, порталами) **заменяется на сенсорную**.
   - **Физика:** "Твердые" воксели коллизии НЕ генерируются в этих ячейках.
   - **Интеракция:** Спрайты объектов (Оракул, Порталы) работают как триггеры (`overlap`).
   - Позволяет игроку визуально "заходить" в портал, но при этом упираться в заднюю стенку (где маски нет).

### Пример структуры

```json
{
  "width": 64,
  "height": 64,
  "tilewidth": 8,
  "tileheight": 8,
  "layers": [
    {
      "name": "Collision Mask",
      "type": "tilelayer",
      "data": [/* массив индексов тайлов */]
    },
    {
      "name": "InteractiveObjects",
      "type": "objectgroup",
      "objects": [
        {
          "type": "Oracle",
          "x": 240,
          "y": 224,
          "width": 32,
          "height": 64
        },
        {
          "type": "Portal",
          "x": 96,
          "y": 372,
          "width": 32,
          "height": 48,
          "properties": [
            {
              "name": "portalId",
              "type": "int",
              "value": 1
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Загрузка ресурсов

### LoadingScene

В `src/game/scenes/LoadingScene.ts` добавлена загрузка:

```typescript
// Новые текстуры фона
this.load.image(KEYS.MAP_BASE_BG, `${ASSETS_BASE_PATH}/images/Bg.Base_512x512.png`);
this.load.image(KEYS.MAP_STRUCT_BG, `${ASSETS_BASE_PATH}/images/Bg.Struct_512x512.png`);
this.load.image(KEYS.MAP_OVERLAY_BG, `${ASSETS_BASE_PATH}/images/Bg.Overlay_512x512.png`);

// Новые текстуры порталов
this.load.image(KEYS.PORTAL_BASE_NEW, `${ASSETS_BASE_PATH}/images/Portal.Base_32x48.png`);
this.load.image(KEYS.PORTAL_ACTIVATION_NEW, `${ASSETS_BASE_PATH}/images/Portal.Activation_32x48.png`);
this.load.image(KEYS.PORTAL_ACTIVATED_NEW, `${ASSETS_BASE_PATH}/images/Portal.Activated_32x48.png`);

// Текстура баббла портала
this.load.image(KEYS.PORTAL_QUESTION_BUBBLE, `${ASSETS_BASE_PATH}/images/BubbleMsg.Transparent136x48.png`);
```

**Примечание:** Tiled Map JSON загружается напрямую через `assetLoader.loadJSON()` в `MainScene`, так как Phaser tilemap требует внешние tileset файлы, которые не нужны для работы с коллизиями.

---

## Создание игрового мира

### Метод createGameWorldTiled()

Основной метод создания мира с Tiled Map находится в `MainScene.createGameWorldTiled()`.

#### Порядок создания:

1. **Визуальные слои фона**
   - Base BG (depth: -100)
   - Struct BG (depth: 1)
   - Overlay BG (depth: 10)

2. **Загрузка Tiled Map JSON**
   - Загрузка через `assetLoader.loadJSON()`
   - Извлечение данных коллизий и объектов

3. **Создание физических коллизий**
   - Создание `StaticGroup` для коллизий
   - Интеграция с SpawnMatrix

4. **Спавн статических объектов**
   - Оракул из Object Layer
   - Порталы из Object Layer

5. **Создание игрока**
   - Под оракулом (если создан)

6. **Спавн предметов**
   - Ключи и сердечки через SpawnSystem

7. **Объекты коллизии (кусты/камни)**
   - ⚠️ **ОТКЛЮЧЕНО:** Процедурная генерация кустов и камней отключена в режиме Tiled Map
   - Дизайнер уровня должен размещать препятствия вручную в Tiled Map (слой "Collision Mask")

---

## Интеграция с SpawnMatrix

### Коллизии из Tiled Map

Коллизии из слоя "Collision Mask" интегрируются в SpawnMatrix:

```typescript
// Конвертация координат Tiled Map → SpawnMatrix
// Tiled Map: тайлы 8×8 пикселей, карта 64×64 тайлов
// SpawnMatrix: ячейки 64×64 пикселей, матрица 32×32 ячейки
// Коэффициент: 8 / 64 = 1/8, но для сетки 32×32: 32 / 64 = 1/2

const worldX = (col * tileWidth + tileWidth / 2) * BASE_SCALE;
const worldY = (row * tileHeight + tileHeight / 2) * BASE_SCALE;
this.spawnSystem.occupyPositionMatrix(worldX, worldY, 1, 1, 'permanent');
```

### Порталы из Tiled Map

Порталы занимают точную область 2×3 ячейки:

```typescript
// Вычисляем центр объекта из координат Tiled Map
const centerX = obj.x + obj.width / 2;
const centerY = obj.y + obj.height / 2;
const worldX = centerX * BASE_SCALE;
const worldY = centerY * BASE_SCALE;

// Занимаем зону 2×3 ячейки
this.spawnSystem.occupyTiledPortal(worldX, worldY, 2, 3);
```

### Метод occupyTiledPortal()

Новый метод в `SpawnSystem` для точного размещения порталов:

```typescript
public occupyTiledPortal(
  worldX: number,
  worldY: number,
  widthInCells: number,
  heightInCells: number
): void {
  const cell = this.spawnMatrix.worldToCell(worldX, worldY);
  let offsetCol = cell.col - Math.floor(widthInCells / 2);
  let offsetRow = cell.row - Math.floor(heightInCells / 2);
  
  // Проверка границ матрицы
  const matrixSize = this.spawnMatrix.getMatrixSize();
  // ... корректировка координат
  
  this.spawnMatrix.occupyRect(offsetCol, offsetRow, widthInCells, heightInCells, 'permanent');
}
```

---

## Иерархия слоев (Z-order)

### Порядок отрисовки (снизу вверх):

1. **Bg.Base_512x512.png** - depth `-100`
2. **Порталы** - depth `0`
3. **Bg.Struct_512x512.png** - depth `1`
4. **Ключи и сердечки** - depth `3`
5. **Враги** - depth `7`
6. **Оракул** - depth `8`
7. **Персонаж** - depth `9`
8. **Bg.Overlay_512x512.png** - depth `10`
9. **Бабблы (месседж)** - depth `100` (самый верхний слой)

### Настройка depth

- Порталы: `AbstractPortal.ts` → `sprite.setDepth(0)`
- Overlay BG: `MainScene.ts` → `overlayBg.setDepth(10)`
- Бабблы: `QuestionBubble.ts` → `setDepth(100)`

---

## Координаты и масштабирование

### Конвертация координат Tiled Map → Мировые координаты

**Важно:** В Tiled Map координаты объектов (`obj.x`, `obj.y`) — это **левый верхний угол**, а не центр!

```typescript
// Вычисляем центр объекта
const centerX = obj.x + obj.width / 2;
const centerY = obj.y + obj.height / 2;

// Конвертируем в мировые координаты
const worldX = centerX * BASE_SCALE;
const worldY = centerY * BASE_SCALE;
```

### Размеры объектов

- **Порталы Tiled Map:** 32×48 пикселей (базовый размер)
  - После масштабирования: 128×192 пикселей
  - Занимают 2×3 ячейки SpawnMatrix

- **Оракул:** 32×64 пикселей (базовый размер)
  - После масштабирования: 128×256 пикселей
  - Занимает 2×4 ячейки SpawnMatrix

### Коллизии

- **Tiled Map тайлы:** 8×8 пикселей
- **SpawnMatrix ячейки:** 64×64 пикселей
- **Коэффициент:** 1 тайл Tiled Map = 1/8 ячейки SpawnMatrix
- **Для сетки 32×32:** 32 тайла = 16 ячеек (коэффициент 1/2)

---

## Отличия от старой реализации

### Старая реализация (Random Spawn)

- Порталы размещаются случайно на окружности вокруг центра
- Коллизии создаются программно (кусты)
- Один слой фона
- Порталы используют анимированные спрайтшиты
- Размер порталов: 64×46 (4×3 ячейки)

### Новая реализация (Tiled Map)

- Порталы размещаются вручную в Tiled Map
- Коллизии определяются в Tiled Map (слой "Collision Mask")
- Три слоя фона (Base, Struct, Overlay)
- Порталы используют статичные текстуры (32×48)
- Размер порталов: 32×48 (2×3 ячейки)
- Координаты объектов из Tiled Map (точное размещение)
- **Процедурная генерация кустов/камней отключена** (полный контроль дизайнера)

### Совместимость

- Обе реализации используют одну и ту же SpawnMatrix
- Обе реализации используют одни и те же системы (Health, Score, Quiz)
- Переключение происходит через флаг `useTiledMap` в конфиге

---

## Физические коллизии

### Создание коллизий

Вместо использования Phaser tilemap (который требует внешние tileset файлы), коллизии создаются вручную:

```typescript
// Создаем StaticGroup для коллизий
const collisionBodies = this.physics.add.staticGroup();

// Для каждого тайла коллизии создаем физическое тело
const collisionBody = this.add.rectangle(
  bodyX + bodyWidth / 2,
  bodyY + bodyHeight / 2,
  bodyWidth,
  bodyHeight,
  0xff0000, 0  // Невидимый (alpha = 0)
collisionBodies.add(collisionBody);
```

### Sensor Bodies (Интеракция)

В режиме `useTiledMap`, стандартные коллайдеры Порталов и Оракула (которые обычно являются твердыми телами) отключаются в `CollisionSystem`. Вместо этого:
1. "Твердость" обеспечивается воксельными коллизиями (см. выше).
2. Интеракция обеспечивается через **Sensor Bodies** - физические тела самих спрайтов.
3. **Sensor Expansion:** Тела спрайтов расширяются на `COLLISION_CONFIG.TILED_SENSOR_EXPANSION` (2px, по 1px с каждой стороны).
   - Это гарантирует, что событие `overlap` сработает даже если игрок уперся в воксельную стену.
   - Без этого расширения игрок блокировался бы стеной до того, как коснулся бы триггера.

### Коллайдеры

Коллайдеры настраиваются в `setupCollisions()`:

```typescript
// Коллайдеры для врагов с Tiled Map коллизиями
this.physics.add.collider(this.enemies, this.tiledMapCollisionBodies);
this.physics.add.collider(this.chasers, this.tiledMapCollisionBodies);
```

---

## Портал конфигурация

### Использование новых текстур

Порталы в режиме Tiled Map используют статичные текстуры:

```typescript
const portalConfig: PortalConfig = {
  id: portalId,
  type: PortalType.STANDARD,
  isCorrect: isCorrect,
  answerText: answer,
  useTiledMapTextures: true  // ✅ Используем статичные текстуры
};
```

### Переключение текстур в AbstractPortal

```typescript
protected getBaseSheetKey(): string {
  if (this.useTiledMapTextures) {
    return KEYS.PORTAL_BASE_NEW;
  }
  // ... старая логика со спрайтшитами
}
```

---

## Примеры использования

### Создание уровня с Tiled Map

1. **Создайте Tiled Map JSON файл** в `src/assets/Game_01/level_maps/Level1_map.json`
2. **Добавьте слой "Collision Mask"** с тайлами коллизий
3. **Добавьте Object Layer "InteractiveObjects"** с объектами Oracle и Portal
4. **Установите флаг в конфиге:**
   ```json
   {
     "levelConfig": {
       "useTiledMap": true,
       "tiledMapKey": "level1_json"
     }
   }
   ```

### Переключение на старую реализацию

```json
{
  "levelConfig": {
    "useTiledMap": false
  }
}
```

---

## Связанные документы

- [ARCHITECTURE.md](ARCHITECTURE.md) — общая архитектура проекта
- [SPAWN_MATRIX_SYSTEM.md](SPAWN_MATRIX_SYSTEM.md) — описание матричной системы
- [BUBBLE_SYSTEM.md](BUBBLE_SYSTEM.md) — система бабблов для вопросов

---

## История изменений

| Дата | Версия | Изменения | Автор |
|------|--------|-----------|-------|
| 2025-01-XX | 1.0 | Создан документ о Tiled Map реализации | Auto |

---

**Последнее обновление:** 2025-01-XX






