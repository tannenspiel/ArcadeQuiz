# Project Map - ArcadeQuiz (Simplified for LLM)

**Версия:** 2.9 (LLM)
**Дата:** 2026-02-11

**Изменения в v2.9:**
- ✅ **DOCUMENTATION AUDIT:** Полная проверка документации на соответствие коду
- ✅ **BUILD.md v2.2:** Добавлена информация о Universal Relative Paths (v2.0)
- ✅ **BUILD.md:** Добавлена секция про Service Worker fix для GitHub Pages
- ✅ **DEPLOYMENT.md:** Добавлена ссылка на инструкцию для системных администраторов
- ✅ **ARCHITECTURE.md v3.1:** Исправлены значения наград (соответствуют scoreConstants.ts)

**Изменения в v2.8:**
- ✅ **DOCUMENTATION REORGANIZATION:** Система масштабирования разделена на два файла.
  - `VIEWPORT_SCALING.md` — Масштабирование окна, камеры, letterboxing
  - `GRAPHICS_SCALING.md` — Правила масштабирования спрайтов и UI
- ✅ **SOUND TOGGLE BUTTON:** Кнопка звука со спрайтом вместо эмодзи.
- ✅ **MUSIC AUTOPLAY:** Музыка запускается автоматически при включении звука.
- ✅ **TESTS:** Поддержка 1220 тестов.

**Изменения в v2.7:**
- ✅ **PERFORMANCE:** FCP 1.4s (Hybrid Loading), TBT improvements.
- ✅ **BUILD:** Production logs removed, modulePreload disabled.

**Изменения в v2.6:**
- ✅ **DYNAMIC LEVEL SYSTEM:** Рефакторинг системы уровней для поддержки N уровней.
  - LoadingScene использует `for (1..MAX_LEVELS)` для динамической загрузки
  - LevelManager загружает конфиги из Phaser.Cache вместо статических импортов
  - Dynamic Asset Keys через `getLevelAssetKey()` и `LevelAssetKeys`
  - MAX_LEVELS централизован в `gameConstants.ts` (текущее значение: 3)
  - **N-Level Support VERIFIED** - Level 3 создан и работает!

**Изменения в v2.5:**
- ✅ **HARDCODE REMOVAL:** Централизация констант (`DEPTHS`, `AUDIO_PATHS`) в `gameConstants.ts`.
- ✅ **BUGFIX:** Grass generation uses correct spritesheet and logic.

**Изменения в v2.4:**
- ✅ **ASSETS RESTRUCTURE:** Map files moved to `level_maps/`, coin-quiz.json moved to `questions/`
- ✅ **ORACLE INDICATORS:** Односпрайтовый индикатор монеток (4 кадра) вместо 3 отдельных монеток
- ✅ **DEBUG OVERLAY:** Добавлены поля Coins Collected / Coins on Map

**Изменения в v2.3:**
- ✅ **UI:** Динамический HUD (приветственные сообщения фаз).

**Изменения в v2.2:**
- ✅ **COIN MECHANIC:** Полная интеграция сбора монет и квизов в бабблах.
- ✅ **DISTANCE INTERACTIONS:** Отказ от `overlap` физики для айтемов в пользу `distance < 50`.
- ✅ **AUDIO:** Новые звуки для сбора и потери монет.
- ✅ **TESTS:** Поддержка 1207 тестов.

---

## Быстрый поиск

### Сцены
- **LoadingScene** → `src/game/scenes/LoadingScene.ts` - Загрузка ресурсов
- **MainScene** → `src/game/scenes/MainScene.ts` - Основная игровая сцена (2665 строк, модульная архитектура)
- **BaseScene** → `src/game/scenes/BaseScene.ts` - Базовый класс для всех сцен

### Модули MainScene (scenes/)
- **AnimationSyncManager** → `src/game/scenes/animation/AnimationSyncManager.ts` - Менеджер синхронизации анимаций
- **KeyAnimationSync** → `src/game/scenes/animation/KeyAnimationSync.ts` - Синхронизация анимации ключей
- **PortalAnimationSync** → `src/game/scenes/animation/PortalAnimationSync.ts` - Синхронизация анимации порталов
- **OracleAnimationSync** → `src/game/scenes/animation/OracleAnimationSync.ts` - Синхронизация анимации оракула
- **PlayerAnimationSync** → `src/game/scenes/animation/PlayerAnimationSync.ts` - Синхронизация анимации игрока
- **EnemyAnimationSync** → `src/game/scenes/animation/EnemyAnimationSync.ts` - Синхронизация анимации врагов
- **CollisionManager** → `src/game/scenes/collision/CollisionManager.ts` - Core collision orchestrator
- **ItemCollisionHandler** → `src/game/scenes/collision/ItemCollisionHandler.ts` - Hearts, Coins, Keys - phase aware
- **OracleCollisionHandler** → `src/game/scenes/collision/OracleCollisionHandler.ts` - Coin deposit, Phase Change
- **PortalCollisionHandler** → `src/game/scenes/collision/PortalCollisionHandler.ts` - Обработка коллизий с порталами
- **EnemyManager** → `src/game/scenes/enemy/EnemyManager.ts` - Менеджер врагов
- **EnemySpawner** → `src/game/scenes/enemy/EnemySpawner.ts` - Спавнер врагов
- **EnemyCloneFactory** → `src/game/scenes/enemy/EnemyCloneFactory.ts` - Фабрика клонов врагов
- **EventBusManager** → `src/game/scenes/gameflow/EventBusManager.ts` - Менеджер событий
- **GameOverHandler** → `src/game/scenes/gameflow/GameOverHandler.ts` - Обработка окончания игры
- **LevelTransitionHandler** → `src/game/scenes/gameflow/LevelTransitionHandler.ts` - Обработка перехода уровней
- **GlobalQuestionManager** → `src/game/scenes/quiz/GlobalQuestionManager.ts` - Менеджер глобальных вопросов
- **KeyQuizHandler** → `src/game/scenes/quiz/KeyQuizHandler.ts` - Key pickup logic
- **CoinQuizHandler** → `src/game/scenes/quiz/CoinQuizHandler.ts` - Coin pickup logic
- **PortalQuizHandler** → `src/game/scenes/quiz/PortalQuizHandler.ts` - Portal selection logic
- **CameraManager** → `src/game/scenes/ui/CameraManager.ts` - Менеджер камеры
- **EffectsManager** → `src/game/scenes/ui/EffectsManager.ts` - Менеджер эффектов
- **HUDManager** → `src/game/scenes/ui/HUDManager.ts` - Менеджер HUD
- **EntityFactory** → `src/game/scenes/world/EntityFactory.ts` - Фабрика сущностей
- **WorldFactory** → `src/game/scenes/world/WorldFactory.ts` - Фабрика мира
- **CollisionObjectFactory** → `src/game/scenes/world/CollisionObjectFactory.ts` - Фабрика объектов коллизии (Standard Mode only)

### Сущности
- **AbstractItem** → `src/game/entities/items/AbstractItem.ts` - BASE for all collectible items
- **Coin** → `src/game/entities/items/Coin.ts` - Specific item type
- **Key** → `src/game/entities/items/Key.ts` - Specific item type
- **Heart** → `src/game/entities/items/Heart.ts` - Specific item type
- **Player** → `src/game/entities/Player.ts` - Игрок
- **AbstractEnemy** → `src/game/entities/enemies/AbstractEnemy.ts` - Базовый класс врагов
- **EnemyRandomWalker** → Случайное блуждание
- **EnemyChaser** → Преследователь
- **EnemyFlam** → Универсальный враг
- **AbstractPortal** → `src/game/entities/portals/AbstractPortal.ts` - Базовый класс порталов
- **StandardPortal** → Стандартный портал
- **Oracle** → `src/game/entities/Oracle.ts` - Оракул

### Системы
- **HealthSystem** → `src/game/systems/HealthSystem.ts` - Здоровье
- **ScoreSystem** → `src/game/systems/ScoreSystem.ts` - Очки
- **QuizManager** → `src/game/systems/QuizManager.ts` - Вопросы
- **SpawnSystem** → `src/game/systems/SpawnSystem.ts` - Спавн
- **CollisionSystem** → `src/game/systems/CollisionSystem.ts` - Коллизии
- **AudioManager** → `src/game/systems/AudioManager.ts` - Звук
- **AnimationManager** → `src/game/systems/AnimationManager.ts` - Анимации

### UI компоненты
- **Button** → `src/game/ui/Button.ts` - Кнопка с состояниями
- **UIManager** → `src/game/ui/UIManager.ts` - Stateful UI manager
- **CoinBubbleQuiz** → `src/game/ui/CoinBubbleQuiz.ts` - Screen-space lightweight quiz
- **KeyQuestionModal** → `src/game/ui/KeyQuestionModal.ts` - Phaser-React hybrid
- **PortalModal** → `src/game/ui/PortalModal.ts` - Модальное окно портала
- **GameOverModal** → `src/game/ui/GameOverModal.ts` - Game Over
- **DebugOverlay** → `src/game/ui/DebugOverlay.ts` - Отладочный UI

### Утилиты
- **Logger** → `src/utils/Logger.ts` - Логирование
- **BrowserLogger** → `src/utils/BrowserLogger.ts` - Перехват консоли для логов
- **FontSizeCalculator** → `src/game/utils/FontSizeCalculator.ts` - Размер шрифта
- **PixelFontCalculator** → `src/game/utils/PixelFontCalculator.ts` - Калькулятор пиксельных шрифтов
- **TextAnalyzer** → `src/game/utils/TextAnalyzer.ts` - Анализ текстов вопросов
- **BubblePositionCalculator** → `src/game/utils/BubblePositionCalculator.ts` - Позиция бабблов

---

## Документация (новая структура)

### game-systems/ (4 файла)
- **BUBBLE_SYSTEM** → `documentation/main/game-systems/BUBBLE_SYSTEM.md` - Система бабблов
- **SPAWN_MATRIX_SYSTEM** → `documentation/main/game-systems/SPAWN_MATRIX_SYSTEM.md` - Матрица спавна
- **GOLDEN_HEARTS_SYSTEM** → `documentation/main/game-systems/GOLDEN_HEARTS_SYSTEM.md` - Золотые сердечки
- **LOGGING_SYSTEM** → `documentation/main/game-systems/LOGGING_SYSTEM.md` - Логирование

### ui/ (5 файлов)
- **UI_GUIDE** → `documentation/main/ui/UI_GUIDE.md` - Комплексное руководство по UI
- **MODAL_GUIDE** → `documentation/main/ui/MODAL_GUIDE.md` - Модальные окна
- **UI_COMPONENTS** → `documentation/main/ui/UI_COMPONENTS.md` - UI компоненты
- **UI_TEXT_SCALING** → `documentation/main/ui/UI_TEXT_SCALING.md` - Масштабирование текста
- **FONT_SIZING_SYSTEM** → `documentation/main/ui/FONT_SIZING_SYSTEM.md` - Размеры шрифтов

### development/ (15 файлов)
**Тестирование и разработка:**
- **DEBUGGING_GUIDE** → `documentation/main/development/DEBUGGING_GUIDE.md` - Отладка
- **DEBUGGING** → `documentation/main/development/DEBUGGING.md` - Отладка (краткая)
- **DEBUG_OVERLAY** → `documentation/main/development/DEBUG_OVERLAY.md` - Отладочный оверлей
- **TESTING** → `documentation/main/development/TESTING.md` - Тестирование
- **TESTING_SIMPLE** → `documentation/main/development/TESTING_SIMPLE.md` - Упрощённое тестирование
- **TESTING_TECHNICAL** → `documentation/main/development/TESTING_TECHNICAL.md` - Технические детали тестов
- **TEST_COVERAGE** → `documentation/main/development/TEST_COVERAGE.md` - Покрытие тестами

**Сборка и разработка:**
- **BUILD** → `documentation/main/development/BUILD.md` - Сборка
- **DEVELOPMENT** → `documentation/main/development/DEVELOPMENT.md` - Разработка
- **DEPLOYMENT** → `dist/DEPLOYMENT.md` - Инструкция для системных администраторов по развёртыванию на сервере

**Масштабирование:**
- **VIEWPORT_SCALING** → `documentation/main/development/VIEWPORT_SCALING.md` - Система масштабирования окна и камеры
- **GRAPHICS_SCALING** → `documentation/main/development/GRAPHICS_SCALING.md` - Правила масштабирования графики (спрайты, UI)

### project/ (4 файла)
- **ProjectMap** → `documentation/main/project/ProjectMap.md` - Полная карта проекта
- **ARCHITECTURE** → `documentation/main/project/ARCHITECTURE.md` - Архитектура
- **GameDescription** → `documentation/main/project/GameDescription.md` - Описание игры
- **TILED_MAP_IMPLEMENTATION** → `documentation/main/project/TILED_MAP_IMPLEMENTATION.md` - Уровни Tiled

---

## Ключевые файлы конфигурации

- `src/config/gameConfig.ts` - Конфигурация игры
- `src/config/debugConfig.ts` - Флаги отладки
- `src/constants/gameConstants.ts` - Константы (включая MAX_LEVELS = 3)
- `src/config/spritesheetConfigs.ts` - Спрайтшиты

---

## Система уровней (Level System)

### ✅ Динамическая загрузка уровней (v2.6)

**Поддержка N уровней** через динамическую загрузку ассетов и конфигураций.

### MAX_LEVELS
- **Значение:** `3` (в `src/constants/gameConstants.ts`)
- **Назначение:** Управляет количеством уровней в игре
- **Изменение:** Чтобы добавить Level 4, измените на `4` и создайте файлы Level 4

### Level Assets Structure
```
src/config/levelConfigs/
├── level1.config.json
├── level2.config.json
└── level3.config.json

src/assets/Game_01/
├── questions/
│   ├── level1.questions.json
│   ├── level1.coin-quiz.json
│   ├── level2.questions.json
│   ├── level2.coin-quiz.json
│   ├── level3.questions.json
│   └── level3.coin-quiz.json
├── level_maps/
│   ├── Level1_map.json
│   ├── Level2_map.json
│   └── Level3_map.json
└── images/
    ├── Bg.Base_Standard_Level1_512x512.png
    ├── Bg.Base_Tiled_Level1_512x512.png
    ├── Bg.Struct_Tiled_Level1_512x512.png
    ├── Bg.Overlay_Tiled_Level1_512x512.png
    └── ... (Level2, Level3 variants)
```

### Dynamic Asset Keys
- `getLevelAssetKey(level, type)` — Генерирует ключ ассета (например, `map_bg_standard_l1`)
- `LevelAssetKeys.getMapBgStandard(level)` — Получить ключ фона для уровня
- `LevelAssetKeys.getLevelConfig(level)` — Получить ключ конфига для уровня

### Как добавить новый уровень:
1. Создайте `level{N}.config.json` в `src/config/levelConfigs/`
2. Создайте 4 фоновых изображения `src/assets/Game_01/images/Bg.*_Level{N}_512x512.png`
3. Создайте `src/assets/Game_01/questions/level{N}.questions.json` и `level{N}.coin-quiz.json`
4. Создайте `src/assets/Game_01/level_maps/Level{N}_map.json` (опционально)
5. Измените `MAX_LEVELS` в `gameConstants.ts`

---

## Структура проекта

```
src/
├── game/
│   ├── scenes/         # Сцены (LoadingScene, MainScene)
│   ├── entities/       # Сущности (Player, Enemy, Portal)
│   ├── systems/        # Системы (Health, Score, Quiz)
│   ├── ui/            # UI компоненты
│   ├── utils/         # Утилиты
│   └── core/          # Ядро (AssetLoader, GameState)
├── types/             # TypeScript типы
├── constants/         # Константы
└── config/            # Конфигурация
```

---

## Для подробной информации

Полная карта проекта: `documentation/main/project/ProjectMap.md`
