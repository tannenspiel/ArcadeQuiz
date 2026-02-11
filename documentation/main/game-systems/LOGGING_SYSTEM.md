# Система логирования ArcadeQuiz

**Версия:** 1.1
**Дата:** 2026-01-24 (обновлено)
**Статус:** ✅ ЗАВЕРШЕНА (обновлено: +20 категорий)

---

## Оглавление

1. [Обзор](#обзор)
2. [Архитектура](#архитектура)
3. [Категории логов](#категории-логов)
4. [Управление через .env](#управление-через-env)
5. [Использование в коде](#использование-в-коде)
6. [BrowserLogger](#browserlogger)
7. [Рефакторинг](#рефакторинг)

---

## Обзор

Система логирования ArcadeQuiz обеспечивает структурированное, фильтруемое логирование с категориями. Все логи управляются через переменные окружения в `.env`.

**Ключевые особенности:**
- **345+ рефакторенных `console.log`** → `logger.log()` с категориями
- **70+ категорий** для тонкой настройки
- **Управление через .env** без изменения кода
- **BrowserLogger** для скачивания логов из браузера
- **Timestamp** в ISO формате для каждого лога

---

## Архитектура

### Компоненты системы

```
src/
├── utils/
│   └── Logger.ts              # Основной класс logger
├── config/
│   └── debugConfig.ts         # Флаги управления и вспомогательные функции
├── utils/
│   └── BrowserLogger.ts       # Перехват консоли для скачивания логов
└── .env                       # Переменные окружения
```

### Поток лога

```
Код проекта
    │
    ├─> logger.log(category, message, data?)
    │       │
    │       ├─> Проверка isCategoryEnabled(category)
    │       │       │
    │       │       ├─> CATEGORY_FLAGS[category] → boolean
    │       │       └─> DEBUG_ENABLED (master switch)
    │       │
    │       ├─> Форматирование: [timestamp] [category] message
    │       │
    │       └─> Вывод:
    │           ├─> console.log (если logToConsole)
    │           └─> logs[] массив (если logToFile)
    │
    └─> logScene/logUI/... (debugConfig.ts)
            │
            └─> console.log (если соответствующий флаг enabled)
```

---

## Категории логов

### Структура категорий

| Категория | Флаг .env | Назначение | Примеры |
|-----------|-----------|------------|---------|
| **COLLISION** | `DEBUG_COLLISION` | Система коллизий | `CollisionSystem` |
| **GAME_OVER** | `DEBUG_GAMEFLOW` | Обработка Game Over | `GameOverHandler` |
| **LEVEL_TRANSITION** | `DEBUG_GAMEFLOW` | Переходы между уровнями | `LevelTransitionHandler` |
| **QUIZ** | `DEBUG_QUIZ` | QuizManager (базовый) | `QuizManager` |
| **QUIZ_GLOBAL** | `DEBUG_QUIZ` | Глобальные вопросы | `GlobalQuestionManager` |
| **QUIZ_KEY** | `DEBUG_QUIZ` | Вопросы ключей | `KeyQuizHandler` |
| **QUIZ_PORTAL** | `DEBUG_QUIZ` | Вопросы порталов | `PortalQuizHandler` |
| **COLLISION_PORTAL** | `DEBUG_COLLISION` | Коллизии порталов | `PortalCollisionHandler` |
| **COLLISION_ITEM** | `DEBUG_COLLISION` | Коллизии предметов | `ItemCollisionHandler` |
| **COLLISION_BUSH** | `DEBUG_COLLISION` | Коллизии кустов | `BushCollisionObject` |
| **COLLISION_FACTORY** | `DEBUG_SYSTEMS` | Factory коллизий | `CollisionObjectFactory` |
| **MODAL_UI** | `DEBUG_UI` | Модальные окна | `KeyQuestionModal`, `PortalModal` |
| **MODAL_SIZE** | `DEBUG_UI` | Расчёт размеров | `ModalSizeCalculator` |
| **BUTTON_EVENTS** | `DEBUG_UI` | События кнопок | `Button` |
| **PIXEL_FONT** | `DEBUG_UI` | Пиксельные шрифты | `PixelFontCalculator` |
| **SCENE_INIT** | `DEBUG_SCENE_INIT` | Инициализация сцен | `MainScene`, `BaseScene` |
| **SCENE_CREATE** | `DEBUG_SCENE_INIT` | Create() сцен | `MainScene.create()` |
| **SCENE_PHYSICS** | `DEBUG_SCENE_INIT` | Настройка физики | `BaseScene.setupPhysics()` |
| **SCENE_CAMERA** | `DEBUG_SCENE_INIT` | Настройка камеры | `MainScene.setupCamera()` |
| **SCENE_SYSTEMS** | `DEBUG_SCENE_INIT` | Инициализация систем | `MainScene.initializeSystems()` |
| **EVENT_BUS** | `DEBUG_SCENE_INIT` | События EventBus | `EventBus.emit()` |
| **AUDIO** | `DEBUG_SCENES` | Загрузка аудио | `AssetLoader.loadAudio()` |
| **VIEWPORT_RESIZE** | *всегда вкл* | Изменение вьюпорта | `handleResize()` |
| **BOOTSTRAP** | `DEBUG_BOOTSTRAP` | Загрузка игры | `PhaserGame.tsx` |
| **ASSET_LOAD** | `DEBUG_ASSETS` | Загрузка ассетов | `AssetLoader` |
| **PLAYER_STATE** | `DEBUG_ENTITIES` | Состояние игрока | `Player` |
| **PLAYER_ANIMATION** | `DEBUG_ANIMATION` | Анимация игрока | `Player` |
| **ENEMY_INIT** | `DEBUG_ENTITIES` | Инициализация врагов | `AbstractEnemy` |
| **ENEMY_STATE** | `DEBUG_ENTITIES` | Состояние врагов | `AbstractEnemy.update()` |
| **ENEMY_ANIMATION** | `DEBUG_ANIMATION` | Анимация врагов | `SpriteAnimationHandler` |
| **ENEMY_CLONE** | `DEBUG_ENTITIES` | Клонирование врагов | `EnemyFlam` |
| **SPAWN_SYSTEM** | `DEBUG_SYSTEMS` | Система спавна | `SpawnSystem` |
| **WORLD_GENERATOR** | `DEBUG_SYSTEMS` | Генератор мира | `WorldGenerator` |
| **ENTITY_FACTORY** | `DEBUG_SYSTEMS` | Factory сущностей | `EntityFactory` |
| **PORTAL** | `DEBUG_SYSTEMS` | Создание порталов | `EntityFactory` |
| **ORACLE** | `DEBUG_SYSTEMS` | Создание оракула | `EntityFactory` |
| **BACKGROUND** | `DEBUG_ENTITIES` | Фоновые спрайты | `GrassBackgroundSprite` |
| **ANIMATION_CREATE** | `DEBUG_ANIMATION` | Создание анимаций | `AnimationManager` |
| **FLOW** | `DEBUG_GAMEFLOW` | Игровой поток (синоним GAMEFLOW) | GameFlow handlers |
| **PERF** | `DEBUG_PERF` | Производительность | Performance monitoring |
| **SPAWN_VERBOSE** | `DEBUG_SPAWN_VERBOSE` | Детальные логи сетки спавна | SpawnSystem |
| **SPAWN_GRID** | `DEBUG_SPAWN_VERBOSE` | Логи сетки (синоним SPAWN_VERBOSE) | SpawnSystem |
| **PLAYER_VISUAL** | `DEBUG_ENTITIES` | Визуальное состояние игрока | Player |
| **PLAYER_DAMAGE** | `DEBUG_ENTITIES` | Получение урона игроком | Player |
| **PLAYER_FLASH** | `DEBUG_ENTITIES` | Мигание игрока (неуязвимость) | Player |
| **FLASH_PLAYER** | `DEBUG_ENTITIES` | Мигание игрока (синоним PLAYER_FLASH) | Player |
| **QUIZ_QUESTION** | `DEBUG_QUIZ` | Логи вопросов викторины | QuizHandlers |
| **QUIZ_ANSWER** | `DEBUG_QUIZ` | Логи ответов викторины | QuizHandlers |
| **QUIZ_FEEDBACK** | `DEBUG_QUIZ` | Логи фидбэка викторины | QuizHandlers |
| **ENEMY_SPAWNING** | `DEBUG_ENTITIES` | Спавн врагов | AbstractEnemy |
| **ENEMY_DETECTION** | `DEBUG_ENTITIES` | Обнаружение игрока врагами | AbstractEnemy |
| **ENEMY_COLLISION** | `DEBUG_ENTITIES` | Коллизии врагов | AbstractEnemy |
| **ENEMY_DESTROY** | `DEBUG_ENTITIES` | Уничтожение врагов | AbstractEnemy |
| **ENEMY_DEATH** | `DEBUG_ENTITIES` | Смерть врагов | AbstractEnemy |
| **ENEMY_CONTROL** | `DEBUG_ENTITIES` | Управление врагами (AI) | AbstractEnemy |
| **ENEMY_VISUAL_STATE** | `DEBUG_ENTITIES` | Визуальное состояние врагов | AbstractEnemy |
| **BOOT** | `DEBUG_BOOTSTRAP` | Загрузка игры (синоним BOOTSTRAP) | PhaserGame.tsx |
| **PWA** | `DEBUG_BOOTSTRAP` | PWA события | PhaserGame.tsx |
| **ITEM** | `DEBUG_ENTITIES` | Создание и сбор предметов. **Примечание:** Механики монет (Coin) используют базовые категории QUIZ. | `AbstractItem`, `Coin` |
| **GAME_PHASE** | `DEBUG_GAMEFLOW` | Смена фаз игры | `GameState`, `Oracle` |
| **ASSET_CACHE** | `DEBUG_ASSETS` | Кэширование ассетов | AssetLoader |

### Полная карта категорий

```typescript
// Logger.ts - CATEGORY_FLAGS
const CATEGORY_FLAGS: Record<string, boolean> = {
  // Collision → DEBUG_COLLISION
  'COLLISION': DEBUG_COLLISION,
  'COLLISION_PORTAL': DEBUG_COLLISION,
  'COLLISION_ITEM': DEBUG_COLLISION,
  'COLLISION_BUSH': DEBUG_COLLISION,

  // GameFlow → DEBUG_GAMEFLOW
  'GAMEFLOW': DEBUG_GAMEFLOW,
  'GAME_OVER': DEBUG_GAMEFLOW,
  'LEVEL_TRANSITION': DEBUG_GAMEFLOW,

  // Quiz → DEBUG_QUIZ
  'QUIZ': DEBUG_QUIZ,
  'QUIZ_QUESTION': DEBUG_QUIZ,
  'QUIZ_ANSWER': DEBUG_QUIZ,
  'QUIZ_FEEDBACK': DEBUG_QUIZ,
  'QUIZ_GLOBAL': DEBUG_QUIZ,
  'QUIZ_KEY': DEBUG_QUIZ,
  'QUIZ_PORTAL': DEBUG_QUIZ,

  // UI → DEBUG_UI
  'UI': DEBUG_UI,
  'MODAL_UI': DEBUG_UI,
  'MODAL_SIZE': DEBUG_UI,
  'BUTTON_EVENTS': DEBUG_UI,
  'PIXEL_FONT': DEBUG_UI,

  // Entities → DEBUG_ENTITIES
  'PLAYER_STATE': DEBUG_ENTITIES,
  'PLAYER_VISUAL': DEBUG_ENTITIES,
  'PLAYER_DAMAGE': DEBUG_ENTITIES,
  'PLAYER_FLASH': DEBUG_ENTITIES,
  'PLAYER_ANIMATION': DEBUG_ANIMATION,
  'ENEMY_INIT': DEBUG_ENTITIES,
  'ENEMY_STATE': DEBUG_ENTITIES,
  'ENEMY_VISUAL_STATE': DEBUG_ENTITIES,
  'ENEMY_SPAWNING': DEBUG_ENTITIES,
  'ENEMY_DETECTION': DEBUG_ENTITIES,
  'ENEMY_COLLISION': DEBUG_ENTITIES,
  'ENEMY_DESTROY': DEBUG_ENTITIES,
  'ENEMY_DEATH': DEBUG_ENTITIES,
  'ENEMY_CONTROL': DEBUG_ENTITIES,
  'ENEMY_CLONE': DEBUG_ENTITIES,
  'ENEMY_ANIMATION': DEBUG_ANIMATION,
  'ENEMY_ANIMATION_SYNC': DEBUG_ANIMATION,
  'PORTAL': DEBUG_SYSTEMS,
  'ORACLE': DEBUG_SYSTEMS,
  'BACKGROUND': DEBUG_ENTITIES,

  // Systems → DEBUG_SYSTEMS
  'SPAWN_SYSTEM': DEBUG_SYSTEMS,
  'WORLD_GENERATOR': DEBUG_SYSTEMS,
  'ENTITY_FACTORY': DEBUG_SYSTEMS,

  // Scene Init → DEBUG_SCENE_INIT
  'SCENE_INIT': DEBUG_SCENE_INIT,
  'SCENE_CREATE': DEBUG_SCENE_INIT,
  'SCENE_PHYSICS': DEBUG_SCENE_INIT,
  'SCENE_CAMERA': DEBUG_SCENE_INIT,
  'SCENE_SYSTEMS': DEBUG_SCENE_INIT,
  'EVENT_BUS': DEBUG_SCENE_INIT,

  // Animation → DEBUG_ANIMATION
  'ANIMATION_CREATE': DEBUG_ANIMATION,

  // Other
  'AUDIO': DEBUG_SCENES,
  'VIEWPORT_RESIZE': true,  // всегда включен
  'BOOTSTRAP': DEBUG_BOOTSTRAP,
  'BOOT': DEBUG_BOOTSTRAP,
  'PWA': DEBUG_BOOTSTRAP,
  'ASSET_LOAD': DEBUG_ASSETS,
  'ASSET_CACHE': DEBUG_ASSETS,
  'PERF': DEBUG_PERF,
  'SPAWN_VERBOSE': DEBUG_SPAWN_VERBOSE,
  'SPAWN_GRID': DEBUG_SPAWN_VERBOSE,
};
```

---

## Управление через .env

### Флаги управления

```bash
# Глобальные флаги
ARCADE_LOG_ALL=true              # Включает ВСЁ (опасно много спама!)
ARCADE_LOG_ENABLED=true          # Базовый режим (минимальные логи)

# Модульные флаги
ARCADE_LOG_SCENES=true           # Сцены (init, create, update)
ARCADE_LOG_UI=true               # UI (модалки, кнопки)
ARCADE_LOG_ENTITIES=true         # Сущности (Player, Enemy)
ARCADE_LOG_SYSTEMS=true          # Системы (Spawn, Collision, World)
VITE_DISABLE_COLLISION_LOGS=false # Коллизии (false=включены, true=отключены)
ARCADE_LOG_ANIMATION=true        # Анимации (кадры)
ARCADE_LOG_QUIZ=true             # Викторины
ARCADE_LOG_GAMEFLOW=true         # Игровой поток (Game Over, Level)
ARCADE_LOG_BOOTSTRAP=true        # Загрузка игры (PhaserGame.tsx)
ARCADE_LOG_ASSETS=true           # Загрузка ассетов
ARCADE_LOG_SCENE_INIT=true       # Детальная инициализация сцен
ARCADE_LOG_PERF=true             # Производительность
ARCADE_LOG_SPAWN_VERBOSE=true    # Детальные логи сетки

# Визуальные флаги (Debug Overlay)
ARCADE_LOG_OVERLAY_ENABLED=true          # Текстовый оверлей
ARCADE_LOG_VISUAL_GRID_ENABLED=true      # Визуальная сетка
ARCADE_LOG_SPAWN_GRID_ENABLED=true       # Логи сетки в консоли
```

### ⚠️ Важно: Настройка Vite для `ARCADE_LOG_*` переменных

По умолчанию Vite загружает в браузер только переменные с префиксом `VITE_`. Чтобы переменные `ARCADE_LOG_*` были доступны в клиентском коде, необходимо настроить `vite.config.ts`:

**`vite.config.ts`:**
```typescript
export default defineConfig({
  plugins: [react()],
  // Разрешаем загрузку переменных окружения с префиксами VITE_ и ARCADE_LOG_
  envPrefix: ['VITE_', 'ARCADE_LOG_'],
  // ... остальные настройки
});
```

**Без этой настройки переменные `ARCADE_LOG_*` не будут доступны в браузере!**

### ⚠️ Критично: Комментарии в .env файлах

**ВАЖНО:** В `.env` файлах **НЕЛЬЗЯ** писать inline-комментарии на той же строке, что и значение переменной.

Функция `cleanEnvValue()` в `debugConfig.ts` обрезает значение по символу `#`:

```bash
# ❌ НЕПРАВИЛЬНО - комментарий сломает значение!
VITE_DISABLE_COLLISION_LOGS=true  # false = логи включены
# ↑ cleanEnvValue() вернёт "true  # false = логи включены" → обрежется → "true"

# ✅ ПРАВИЛЬНО - комментарий на отдельной строке
# VITE_DISABLE_COLLISION_LOGS: true = логи коллизий ОТКЛЮЧЕНЫ, false = включены
VITE_DISABLE_COLLISION_LOGS=true
```

**Правило:** Всегда пишите комментарии на отдельной строке ПЕРЕД значением, а не ПОСЛЕ него.

### Группировка категорий

#### 🎮 Игровые сущности
```bash
ARCADE_LOG_ENTITIES=true
# Включает:
#   ├─ PLAYER_STATE, PLAYER_VISUAL, PLAYER_DAMAGE
#   ├─ ENEMY_INIT, ENEMY_STATE, ENEMY_CLONE
#   ├─ PORTAL, ORACLE (создание)
#   └─ BACKGROUND
```

#### 🖼️ UI и модальные окна
```bash
ARCADE_LOG_UI=true
# Включает:
#   ├─ MODAL_SIZE (расчёт размеров)
#   ├─ BUTTON_EVENTS (события кнопок)
#   └─ MODAL_UI (прочие логи модалок)
```

#### 📋 Викторины
```bash
ARCADE_LOG_QUIZ=true
# Включает:
#   ├─ QUIZ (QuizManager базовый + CoinBubbleQuiz)
#   ├─ QUIZ_GLOBAL (GlobalQuestionManager)
#   ├─ QUIZ_KEY (KeyQuizHandler)
#   └─ QUIZ_PORTAL (PortalQuizHandler)
```

#### 🔄 Игровой поток
```bash
ARCADE_LOG_GAMEFLOW=true
# Включает:
#   ├─ GAME_OVER (GameOverHandler)
#   └─ LEVEL_TRANSITION (LevelTransitionHandler)
```

#### 💥 Коллизии
```bash
VITE_DISABLE_COLLISION_LOGS=false
# Включает:
#   ├─ COLLISION (CollisionSystem)
#   ├─ COLLISION_PORTAL (PortalCollisionHandler)
#   ├─ COLLISION_ITEM (ItemCollisionHandler)
#   └─ COLLISION_BUSH (BushCollisionObject)
```

### Рекомендуемые пресеты

```bash
# 🚨 Минимум (только критические логи)
ARCADE_LOG_ENABLED=false
ARCADE_LOG_OVERLAY_ENABLED=true

# 🐛 Отладка UI
ARCADE_LOG_UI=true

# 🎮 Отладка игровых сущностей
ARCADE_LOG_ENTITIES=true
ARCADE_LOG_ANIMATION=true

# 💥 Отладка коллизий
VITE_DISABLE_COLLISION_LOGS=false

# 📊 Полная диагностика
ARCADE_LOG_ALL=true  # Осторожно!
```

---

## Использование в коде

### logger.log() - Основной метод

```typescript
import { logger } from '@/utils/Logger';

// Базовое использование
logger.log('CATEGORY', 'message');

// С данными
logger.log('PLAYER_STATE', 'Health changed', {
  current: 2,
  max: 3,
  delta: -1
});

// Категория должна быть определена в CATEGORY_FLAGS
// Если категория не найдена - лог не будет выведен
```

### logger.warn() - Предупреждения

```typescript
logger.warn('COLLISION', 'No collision body found', {
  entity: entityKey,
  type: entityType
});
// Вывод: [2026-01-24T...] [WARN] [COLLISION] No collision body found {...}
```

### Вспомогательные функции (debugConfig.ts)

```typescript
import {
  logScene,
  logUI,
  logEntity,
  logSystem,
  logCollision,
  logAnimation,
  logQuiz,
  logGameflow,
  logPerf,
  logBootstrap,
  logAsset,
  logSceneInit
} from '@/config/debugConfig';

// Использование
logScene('MainScene created');
logUI('Modal shown', { modalType: 'KEY_QUESTION' });
logEntity('Enemy spawned', { type: 'chaser', x: 100, y: 200 });
logSystem('SpawnSystem initialized');
```

### Добавление новой категории

1. **Добавить флаг в `debugConfig.ts`:**
```typescript
export const DEBUG_MY_FEATURE = DEBUG_ALL || import.meta.env.ARCADE_LOG_MY_FEATURE === 'true';
```

2. **Добавить категорию в `Logger.ts`:**
```typescript
const CATEGORY_FLAGS: Record<string, boolean> = {
  // ...
  'MY_FEATURE': DEBUG_MY_FEATURE,
  'MY_FEATURE_SUBCATEGORY': DEBUG_MY_FEATURE,
};
```

3. **Использовать в коде:**
```typescript
logger.log('MY_FEATURE', 'Something happened', { data: 'value' });
```

4. **Добавить в `.env`:**
```bash
ARCADE_LOG_MY_FEATURE=true
```

---

## BrowserLogger

### Назначение

**BrowserLogger** (`src/utils/BrowserLogger.ts`) перехватывает все `console.log/warn/error` вызовы для последующего скачивания логов из браузера.

### Функции консоли

```javascript
// В консоли браузера

// Скачать все логи как файл
downloadLogs()           // Скачивает 'animation_debug.log'

// Получить количество логов
getLogCount()            // Число логов в памяти

// Очистить логи
clearLogs()              // Удаляет все логи из памяти

// Скачать с кастомным именем
logger.downloadLogs('my-game-session.log')
```

### Формат лога

```
[2026-01-24T18:19:55.285Z] [VIEWPORT_RESIZE] Virtual screen size (adaptive): 1484.7073023536514 x 1280
[2026-01-24T18:19:55.428Z] [EVENT_BUS] EventBus.emit: viewport-update [{"realWidth":1922,"realHeight":1657}]
[2026-01-24T18:19:56.496Z] [SCENE_CREATE] MainScene: create() called - starting scene initialization
```

---

## Рефакторинг

### Статистика рефакторинга

| Priority | Файлов | Логов | Статус |
|----------|--------|-------|--------|
| Priority 1-3 | 20+ | ~250 | ✅ Завершено |
| Priority 4 | 19 | ~95 | ✅ Завершено |
| **ИТОГО** | **39+** | **~345** | ✅ **Завершено** |

### Выполненные работы

#### Priority 1-3 (Критические системы)
- ✅ MainScene.ts, BaseScene.ts, LoadingScene.ts
- ✅ UIManager, KeyQuestionModal, PortalModal, GameOverModal
- ✅ QuizManager, AudioManager, SpawnSystem, CollisionSystem
- ✅ WorldGenerator, AnimationManager, AssetLoader
- ✅ Player, AbstractEnemy, Oracle, Portal

#### Priority 4 (Остаточные логи)
- ✅ GlobalQuestionManager.ts (13 логов → QUIZ_GLOBAL)
- ✅ GameOverHandler.ts (13 логов → GAME_OVER)
- ✅ KeyQuizHandler.ts (10 логов → QUIZ_KEY)
- ✅ PortalQuizHandler.ts (10 логов → QUIZ_PORTAL)
- ✅ CollisionSystem.ts (11 логов → COLLISION)
- ✅ PortalCollisionHandler.ts (9 логов → COLLISION_PORTAL)
- ✅ ItemCollisionHandler.ts (8 логов → COLLISION_ITEM)
- ✅ LevelTransitionHandler.ts (4 логов → LEVEL_TRANSITION)
- ✅ PixelFontCalculator.ts (4 логов → PIXEL_FONT)
- ✅ SpriteAnimationHandler.ts (2 логов → ANIMATION_SPRITE)
- ✅ Прочие (LevelManager, BushCollisionObject, GrassBackgroundSprite)

### Остаточные (не требуют рефакторинга)

| Файл | Логов | Причина |
|------|-------|---------|
| `Logger.ts` | 1 | Системный |
| `BrowserLogger.ts` | 9 | Системный |
| `debugConfig.ts` | 13 | Вспомогательные функции |
| `AbstractPortal.ts` | 1 | Закомментирован |
| `MainScene_OLD.ts` | 216 | Старый код (на удаление) |

---

## Связанные документы

- **[DEBUG_OVERLAY.md](DEBUG_OVERLAY.md)** - Отладочный UI и визуализация
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Руководство по разработке
- **[DEBUGGING.md](DEBUGGING.md)** - Руководство по отладке

---

**Дата создания:** 2026-01-24
**Последнее обновление:** 2026-01-24
