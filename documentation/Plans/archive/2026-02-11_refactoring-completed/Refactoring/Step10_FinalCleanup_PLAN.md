# План: Шаг 10 - Итоговая очистка MainScene

**Родительский лог:** [Refactoring_MASTER_LOG.md](./Refactoring_MASTER_LOG.md)
**Статус:** TODO
**Приоритет:** HIGH
**Дата:** 2026-01-19

---

## Цель

Привести MainScene к финальному виду (~400-500 строк), удалив дублирующийся и устаревший код.

---

## Ресурсы и Референсы

**Критически важно:** При очистке использовать `src/game/scenes/MainScene_OLD.ts` как эталон работающего функционала.

*   Это God-файл с исходной реализацией.
*   **Внимание:** Файл огромный (>4500 строк). Читать только опираясь на карту проекта и поиск, не загружать целиком без необходимости.
*   Использовать для проверки логики, если при переносе возникли сомнения.

---

## Текущее состояние

**Размер MainScene.ts:** 2887 строк (было 4624, цель: ~400-500)
**Уменьшение:** 37.6%

---

## Проблема

После шагов 1-9 в MainScene остались **дублирующиеся методы**, которые были вынесены в handlers/managers, но старые версии не были удалены.

---

## Удаляемые методы (дубликаты)

### 1. Collision Handlers (дубликаты)
**Эти методы заменены на handler classes в шаге 3:**

- `handlePlayerEnemyCollision()` (~80 строк) → заменён на `enemyCollisionHandler.handle()`
- `handlePlayerHeartCollision()` (~10 строк) → заменён на `itemCollisionHandler.handleHeart()`
- `handlePlayerOracleCollision()` (~70 строк) → заменён на `oracleCollisionHandler.handle()`
- `handlePortalSolidCollision()` (~120 строк) → заменён на `portalCollisionHandler.handleSolidCollision()`

**Проверка:** Эти методы НЕ вызываются напрямую в MainScene (collision system использует handlers)

**Итого удаление:** ~280 строк

### 2. Quiz Handlers (нужно проверить)
**Методы, которые могли быть вынесены в шаге 6:**

- `handleKeyQuizCorrect()` → проверить, используется ли `keyQuizHandler`
- `handleKeyQuizWrong()` → проверить, используется ли `keyQuizHandler`
- `handleKeyQuizClose()` → проверить, используется ли `keyQuizHandler`

### 3. UI/Effects (нужно проверить)
**Методы, которые могли быть вынесены в шаге 7:**

- `flashSprite()` → проверить EffectsManager
- `flashPlayerLoseKey()` → проверить EffectsManager
- `flashPlayerGetKey()` → проверить EffectsManager
- `showFloatingText()` → проверить EffectsManager
- `createHUD()` → проверить HUDManager
- `updateHUD()` → проверить HUDManager
- `getZoomCompensatedHUDPosition()` → проверить HUDManager

### 4. Game Over Handlers (нужно проверить)
**Методы, которые могли быть вынесены в шаге 8:**

- `handleGameOver()` → проверить GameOverHandler
- `restartGame()` → проверить GameOverHandler
- `handleGameWin()` → проверить GameOverHandler
- `handleFullGameRestart()` → проверить GameOverHandler
- `handleNextLevel()` → проверить LevelTransitionHandler

### 5. Global Question (нужно проверить)
**Методы, которые могли быть вынесены в шаге 6:**

- `showGlobalQuestion()` → проверить GlobalQuestionManager
- `showFallbackGlobalQuestion()` → проверить GlobalQuestionManager

---

## Сохраняемые методы

Эти методы всё ещё используются MainScene напрямую:

✅ **EventBus методы:**
- `setupEventListeners()` - настройка событий
- `handleOrientationChange()` - обработка поворота экрана
- `handleWindowResize()` - обработка изменения размера
- `handlePhaserResize()` - обработка изменения размера Phaser

✅ **Portal методы (используются EventBus):**
- `handlePortalEnter()` - вход в портал
- `handlePortalEnterConfirmed()` - подтверждение входа
- `handlePortalEnterCancelled()` - отмена входа
- `handlePortalOverlapByMask()` - overlap через маску

✅ **Quiz методы (используются EventBus):**
- `handleQuizCompleted()` - завершение викторины

✅ **Initialization методы:**
- `initializeSystems()` - инициализация всех систем
- `initQuizHandlers()` - инициализация quiz handlers
- `initUIManagers()` - инициализация UI managers
- `initGameFlowHandlers()` - инициализация game flow handlers

✅ **Create методы:**
- `create()` - главный метод создания
- `createOracle()` - создание оракула
- `createPlayer()` - создание игрока

✅ **Camera методы:**
- `setupCameraBounds()` - настройка границ камеры
- `calculateCameraZoom()` - расчет зума
- `setupCameraFollow()` - настройка слежения камеры
- `handleResize()` - обработка изменения размера

✅ **Setup методы:**
- `setupOracleClickHandler()` - настройка клика по оракулу
- `setupPortalClickHandlers()` - настройка кликов по порталам
- `setupEventBus()` - настройка EventBus

✅ **Utility методы:**
- `triggerRingLossEffect()` - эффект потери кольца
- `resumeGame()` - возобновление игры
- `isPositionInOverlapMask()` - проверка позиции в маске

✅ **Public методы (делегаты):**
- `createEnemyClone()` - делегат для EnemySpawner

---

## План действий

1. **Проверить существующие managers/handlers** - убедиться, что они реализуют нужную функциональность
2. **Удалить дублирующиеся collision методы** (~280 строк)
3. **Проверить и удалить дубликаты из других категорий** (Quiz, UI/Effects, Game Over, Global Question)
4. **Проверить, что игра работает** после удаления
5. **Обновить документацию**
6. **Сделать commit и tag**

---

## Ожидаемый результат

**Удаление:** ~300-500 строк дублирующегося кода
**Размер MainScene:** 2887 → ~2400-2600 строк (пока не достигнем 400-500, но значительно чище)

---

## Примечания

**Важно:** Перед удалением каждого метода проверить:
1. Не вызывается ли он напрямую в MainScene
2. Не используется ли он в EventBus
3. Заменен ли на соответствующий handler/manager

**Если цель 400-500 строк недостижима** без breaking changes, то шаг 10 может быть расширен дополнительными подшагами для дальнейшего выноса функциональности.
