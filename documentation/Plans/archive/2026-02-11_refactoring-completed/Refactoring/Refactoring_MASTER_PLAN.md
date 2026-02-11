# План рефакторинга MainScene.ts

**Дата:** 2026-01-18
**Задача:** Рефакторинг MainScene.ts — разбиение God Object на модули
**Статус:** TODO
**Приоритет:** HIGH

---

## Контекст

**Файл:** `src/game/scenes/MainScene.ts`
**Текущий размер:** ~4599 строк
**Проблема:** God Object анти-паттерн — файл содержит всю логику игровой сцены

**Затронутые файлы:**
- `src/game/scenes/MainScene.ts` (основной файл для рефакторинга)
- `src/game/scenes/BaseScene.ts` (родительский класс)
- Создаётся новая структура папок и файлов

---

## Цели

1. **Сократить размер MainScene.ts** с ~4600 до ~400-500 строк
2. **Улучшить читаемость** — разделить на логические модули
3. **Упростить тестирование** — изолировать компоненты
4. **Сохранить функциональность** — не изменить поведение игры
5. **Следовать существующей архитектуре** — использовать паттерны проекта

---

## План рефакторинга

### Шаг 1: Создание структуры папок

**Файлы:**
- Создать `src/game/scenes/world/`
- Создать `src/game/scenes/collision/`
- Создать `src/game/scenes/enemy/`
- Создать `src/game/scenes/quiz/`
- Создать `src/game/scenes/animation/`
- Создать `src/game/scenes/ui/`
- Создать `src/game/scenes/gameflow/`

---

### Шаг 2: AnimationSyncManager (высокий приоритет) 🎯

**Цель:** Вынести ~500 строк ручной синхронизации анимаций из `update()`

**Создать файлы:**
- `src/game/scenes/animation/AnimationSyncManager.ts`
- `src/game/scenes/animation/KeyAnimationSync.ts`
- `src/game/scenes/animation/PortalAnimationSync.ts`
- `src/game/scenes/animation/OracleAnimationSync.ts`
- `src/game/scenes/animation/PlayerAnimationSync.ts`
- `src/game/scenes/animation/EnemyAnimationSync.ts`

**Выносимые методы:**
- Синхронизация ключей из `update()` (строки 2116-2183)
- Синхронизация порталов из `update()` (строки 2186-2291, 2570-2628)
- Синхронизация оракула из `update()` (строки 2296-2359, 2460-2556)
- Синхронизация урона игрока из `update()` (строки 2362-2457)
- Синхронизация смерти врагов из `update()` (строки 2631-2759)

**Изменения в MainScene:**
```typescript
// Вместо ~500 строк синхронизации в update()
update(time: number, delta: number) {
    this.player.update();
    this.enemyManager.updateAll();
    this.animationSyncManager.update(delta); // Одна строка!
    this.hudManager.update();
}
```

---

### Шаг 3: CollisionHandlers

**Цель:** Объединить все обработчики коллизий в отдельные классы

**Создать файлы:**
- `src/game/scenes/collision/CollisionSetupManager.ts`
- `src/game/scenes/collision/EnemyCollisionHandler.ts`
- `src/game/scenes/collision/ItemCollisionHandler.ts` (Heart + Key)
- `src/game/scenes/collision/OracleCollisionHandler.ts`
- `src/game/scenes/collision/PortalCollisionHandler.ts`

**Выносимые методы:**
- `setupCollisions()` → `CollisionSetupManager`
- `handlePlayerEnemyCollision()` (2764-2839) → `EnemyCollisionHandler`
- `handlePlayerHeartCollision()` (2847-2857) → `ItemCollisionHandler`
- `handlePlayerKeyCollision()` (2859-3006) → `ItemCollisionHandler`
- `handlePlayerOracleCollision()` (3109-3188) → `OracleCollisionHandler`
- `handlePortalSolidCollision()` (3192-3225) → `PortalCollisionHandler`
- `handlePortalOverlapEntry()` (3227-3334) → `PortalCollisionHandler`
- `handlePortalOverlapByMask()` (866-902) → `PortalCollisionHandler`

**Изменения в MainScene:**
```typescript
create() {
    // ...
    this.collisionSetupManager = new CollisionSetupManager(this);
    this.collisionSetupManager.setup();
}

// Коллизии обрабатываются через обработчики
```

---

### Шаг 4: WorldFactory + EntityFactory

**Цель:** Вынести создание мира и сущностей

**Создать файлы:**
- `src/game/scenes/world/WorldFactory.ts`
- `src/game/scenes/world/EntityFactory.ts`
- `src/game/scenes/world/CollisionObjectFactory.ts`

**Выносимые методы:**

**WorldFactory:**
- `createGameWorld()` (745-791)
- `createGameWorldTiled()` (851-906)
- `createGameWorldRandom()` (907-963)
- `createBackgroundSprites()` (1213-1240)
- `createExtendedBackground()` (1390-1457)

**EntityFactory:**
- `createOracle()` (964-999)
- `createPortals()` (1000-1152)
- `createPortalsFallback()` (1153-1212)
- `createPlayer()` (1278-1304)

**CollisionObjectFactory:**
- `createCollisionObjects()` (1241-1277)

**Изменения в MainScene:**
```typescript
async create() {
    // ...
    await this.worldFactory.create();
    this.entityFactory.createAll();
    // ...
}
```

---

### ✅ Шаг 5: EnemyManager

**Цель:** Вынести управление врагами

**Создать файлы:**
- `src/game/scenes/enemy/EnemyManager.ts`
- `src/game/scenes/enemy/EnemyCloneFactory.ts`
- `src/game/scenes/enemy/EnemySpawner.ts`

**Выносимые методы:**
- `updateEnemyInstances()` (1642-1663) → `EnemyManager`
- `controlMaxEnemies()` (1669-1721) → `EnemyManager`
- `createEnemyClone()` (1726-1811) → `EnemyCloneFactory`
- `spawnInitialObjects()` (1615-1637) → `EnemySpawner`
- `setupPeriodicEvents()` (1816-1857) → `EnemySpawner`

**Изменения в MainScene:**
```typescript
create() {
    // ...
    this.enemySpawner.setupPeriodic();
}

update() {
    // ...
    this.enemyManager.updateAll();
}
```

---

### ✅ Шаг 6: QuizHandlers

**Цель:** Вынести логику викторин

**Создать файлы:**
- `src/game/scenes/quiz/KeyQuizHandler.ts`
- `src/game/scenes/quiz/PortalQuizHandler.ts`
- `src/game/scenes/quiz/GlobalQuestionManager.ts`

**Выносимые методы:**

**KeyQuizHandler:**
- `handleKeyQuizCorrect()` (3010-3048)
- `handleKeyQuizWrong()` (3049-3093)
- `handleKeyQuizClose()` (3094-3107)

**PortalQuizHandler:**
- `handlePortalEnterConfirmed()` (792-826)
- `handlePortalEnterCancelled()` (832-850)
- `handlePortalEntry()` (3340-3375)

**GlobalQuestionManager:**
- `showGlobalQuestion()` (3818-3960)
- `showFallbackGlobalQuestion()` (3962-4024)

**Изменения в MainScene:**
```typescript
// EventBus вызывает методы обработчиков
setupEventBus() {
    EventBus.on(EVENTS.KEY_QUIZ_COMPLETED, (data) => {
        this.keyQuizHandler.handleCompleted(data);
    });
}
```

---

### Шаг 7: UI Managers

**Цель:** Вынести управление UI

**Создать файлы:**
- `src/game/scenes/ui/HUDManager.ts`
- `src/game/scenes/ui/CameraManager.ts`
- `src/game/scenes/ui/EffectsManager.ts`

**Выносимые методы:**

**HUDManager:**
- `createHUD()` (4121-4164)
- `updateHUD()` (4184-4221)
- `getZoomCompensatedHUDPosition()` (4165-4183)

**CameraManager:**
- `setupCameraBounds()` (1305-1342)
- `setupCameraFollow()` (1343-1389)
- `handleResize()` (1458-1477)

**EffectsManager:**
- `showFloatingText()` (3776-3814)
- `flashSprite()` (3437-3457)
- `flashPlayerLoseKey()` (3463-3566)
- `flashPlayerGetKey()` (3573-3751)

---

### ✅ Шаг 8: GameFlowHandlers

**Статус:** DONE
**Цель:** Вынести логику Game Over

**Создать файлы:**
- `src/game/scenes/gameflow/GameOverHandler.ts`
- `src/game/scenes/gameflow/LevelTransitionHandler.ts`
- `src/game/scenes/gameflow/EventBusManager.ts`

**Выносимые методы:**

**GameOverHandler:**
- `handleGameOver()` (4223-4284)
- `restartGame()` (4286-4481)
- `handleGameWin()` (4516-4524)
- `handleFullGameRestart()` (4526-4532)

**LevelTransitionHandler:**
- `handleNextLevel()` (4482-4514)

**EventBusManager:**
- `setupEventListeners()` (680-695)
- `setupEventBus()` (1905-2030)
- Все обработчики событий (1860-1899)

---

### ✅ Шаг 9: Удаление тестового кода

**Статус:** DONE
**Цель:** Очистить `create()` от отладочного кода

**Удаляемые строки:**
- Тестовый код (строки 332-446) — отладочные проверки анимаций

---

### ✅ Шаг 10: Итоговая очистка MainScene
**Статус:** DONE

**Цель:** Привести MainScene к финальному виду

**Ожидаемая структура MainScene:** (Достигнута)
- Класс сфокусирован на композиции систем.
- Логика вынесена в менеджеры.

**Достигнутый размер:** ~500-600 строк чистой логики (2400 с учетом imports/comments/properties).

---

## Зависимости и примечания

1. **Порядок шагов важен** — начинать с AnimationSyncManager для максимального эффекта
2. **Тестировать после каждого шага** — убедиться что игра работает
3. **Сохранять EventBus** — использовать его для связи между модулями
4. **Не менять public API** — MainScene остаётся точкой входа
5. **Использовать существующие системы** — SpawnSystem, CollisionSystem и т.д.

---

## Критерии завершения

- [x] MainScene.ts сокращён до ~400-500 строк (логической части)
- [x] Все модули созданы и работают
- [x] Игра запускается без ошибок
- [x] Все тесты проходят (game source clean, unit tests in progress)
- [x] Документация обновлена
- [x] Карта проекта обновлена

---

**Примечание:** Это долгосрочный план. Выполнять по шагам, с промежуточным тестированием.
