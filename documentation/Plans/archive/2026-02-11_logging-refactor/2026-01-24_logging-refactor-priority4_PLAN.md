# План: Рефакторинг системы логирования - Priority 4

**Дата:** 2026-01-24
**Ветка:** `refactor/supernova`
**Статус:** ✅ ЗАВЕРШЕН
**Приоритет:** Medium

---

## Краткое описание

Рефакторинг остаточных неструктурированных `console.log` в категоризированную систему логирования через `Logger.ts`.

**Цель:** Заменить ~113 `console.log` в 19 файлах на `logger.log()` с соответствующими категориями для управления через `.env`.

---

## Контекст

**Выполнено (Priority 1-3):**
- ✅ ~250 console.log рефакторено в 20+ файлах
- ✅ Все UI модальные окна (Priority 3)
- ✅ Критические игровые системы (Priority 1-2)

**Осталось (Priority 4):**
- ~113 console.log в 19 файлах
- Quiz системы, Collision, Game Flow handlers

---

## Затронутые файлы

### Уже проверены:
- `src/utils/Logger.ts` - система категорий
- `src/config/debugConfig.ts` - флаги управления
- `.env` - переменные окружения

### Для рефакторинга (19 файлов):

| Файл | Логов | Категория | Новый флаг (если нужен) |
|------|-------|-----------|------------------------|
| `debugConfig.ts` | 13 | DEBUG_CONFIG | нет |
| `GlobalQuestionManager.ts` | 13 | QUIZ_GLOBAL | DEBUG_QUIZ |
| `GameOverHandler.ts` | 13 | GAME_OVER | DEBUG_GAME_FLOW |
| `KeyQuizHandler.ts` | 10 | QUIZ_KEY | DEBUG_QUIZ |
| `PortalQuizHandler.ts` | 10 | QUIZ_PORTAL | DEBUG_QUIZ |
| `CollisionSystem.ts` | 11 | COLLISION | DEBUG_COLLISION |
| `PortalCollisionHandler.ts` | 9 | COLLISION_PORTAL | DEBUG_COLLISION |
| `ItemCollisionHandler.ts` | 8 | COLLISION_ITEM | DEBUG_COLLISION |
| `BrowserLogger.ts` | 9 | BROWSER_LOG | (оставить?) |
| `LevelTransitionHandler.ts` | 4 | LEVEL_TRANSITION | DEBUG_GAME_FLOW |
| `SpriteAnimationHandler.ts` | 2 | ANIMATION_SPRITE | DEBUG_ANIMATION |
| `PixelFontCalculator.ts` | 5 | PIXEL_FONT | DEBUG_UI |
| `LevelManager.ts` | 1 | LEVEL | DEBUG_SCENES |
| `AbstractPortal.ts` | 1 | PORTAL | DEBUG_ENTITIES |
| `CollisionObjectFactory.ts` | 1 | COLLISION_FACTORY | DEBUG_SYSTEMS |
| `BushCollisionObject.ts` | 1 | COLLISION_BUSH | DEBUG_COLLISION |
| `AbstractCollisionObject.ts` | 1 | COLLISION_ABSTRACT | DEBUG_COLLISION |
| `GrassBackgroundSprite.ts` | 1 | BACKGROUND | DEBUG_ENTITIES |

**Исключить:**
- `MainScene_OLD.ts` (216 логов) - старый код, не рефакторить
- Tests (∼20 логов) - тестовые логи
- `Logger.ts` (1 лог) - системный

---

## План работ

### Шаг 1: Добавить недостающие категории в Logger.ts
- Добавить флаги: `DEBUG_GAME_FLOW`, `DEBUG_COLLISION`
- Добавить категории: `GAME_OVER`, `LEVEL_TRANSITION`, `COLLISION`, `COLLISION_PORTAL`, `COLLISION_ITEM`, `COLLISION_BUSH`, `QUIZ_GLOBAL`, `QUIZ_KEY`, `QUIZ_PORTAL`, `PIXEL_FONT`, `BACKGROUND`

### Шаг 2: debugConfig.ts - добавить флаги
- Добавить `DEBUG_GAME_FLOW` для GameOverHandler, LevelTransitionHandler
- Добавить `DEBUG_COLLISION` для CollisionSystem и handlers
- Убрать/рефакторить собственные console.log (13)

### Шаг 3: Quiz системы (46 логов)
- `GlobalQuestionManager.ts` (13) - QUIZ_GLOBAL
- `KeyQuizHandler.ts` (10) - QUIZ_KEY
- `PortalQuizHandler.ts` (10) - QUIZ_PORTAL
- `GameOverHandler.ts` (13) - GAME_OVER

### Шаг 4: Collision системы (29 логов)
- `CollisionSystem.ts` (11) - COLLISION
- `PortalCollisionHandler.ts` (9) - COLLISION_PORTAL
- `ItemCollisionHandler.ts` (8) - COLLISION_ITEM
- `BushCollisionObject.ts` (1) - COLLISION_BUSH
- `AbstractCollisionObject.ts` (1) - COLLISION_ABSTRACT

### Шаг 5: Game Flow и UI (10 логов)
- `LevelTransitionHandler.ts` (4) - LEVEL_TRANSITION
- `PixelFontCalculator.ts` (5) - PIXEL_FONT
- `SpriteAnimationHandler.ts` (2) - ANIMATION_SPRITE

### Шаг 6: Прочие (5 логов)
- `LevelManager.ts` (1) - LEVEL
- `AbstractPortal.ts` (1) - PORTAL
- `CollisionObjectFactory.ts` (1) - COLLISION_FACTORY
- `GrassBackgroundSprite.ts` (1) - BACKGROUND

### Шаг 7: Проверка и тестирование
- Убедиться что все логи управляются через .env
- Протестировать отключение/включение флагов
- Обновить .env при необходимости

---

## Зависимости

- Шаг 1 должен быть выполнен первым (добавление категорий)
- Шаги 2-6 могут выполняться параллельно
- Шаг 7 выполняется после всех рефакторингов

---

## Примечания

- `BrowserLogger.ts` (9 логов) - системный компонент, возможно стоит оставить как есть
- `MainScene_OLD.ts` - НЕ трогать, подлежит удалению отдельно
- Тестовые файлы - НЕ рефакторить
- `console.error/warn` - НЕ трогать (error handling)

---

**Дата создания:** 2026-01-24
**Ожидаемое выполнение:** ~110 console.log → logger.log()
