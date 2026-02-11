# План проверки соответствия тестов коду после рефакторинга проекта

**Дата создания:** 2026-01-20
**Статус:** IN PROGRESS
**Приоритет:** HIGH

---

## Контекст

### Рефакторинг проекта (MainScene.ts)
**Дата:** Декабрь 2025 - Январь 2026
**Цель:** Разбиение God Object (MainScene ~4600 строк) на модули

**Выполненные шаги:**
- ✅ Шаг 8: GameFlowHandlers (EventBusManager, GameOverHandler, LevelTransitionHandler)
- ✅ Шаг 9: Удаление тестового кода
- ✅ Шаг 10: Итоговая очистка MainScene (до ~2400 строк)

**Созданные новые файлы:**

#### Менеджеры и обработчики:
- `src/game/scenes/animation/AnimationSyncManager.ts`
- `src/game/scenes/animation/KeyAnimationSync.ts`
- `src/game/scenes/animation/PortalAnimationSync.ts`
- `src/game/scenes/animation/OracleAnimationSync.ts`
- `src/game/scenes/animation/PlayerAnimationSync.ts`
- `src/game/scenes/animation/EnemyAnimationSync.ts`

- `src/game/scenes/collision/EnemyCollisionHandler.ts`
- `src/game/scenes/collision/ItemCollisionHandler.ts`
- `src/game/scenes/collision/OracleCollisionHandler.ts`
- `src/game/scenes/collision/PortalCollisionHandler.ts`

- `src/game/scenes/quiz/KeyQuizHandler.ts`
- `src/game/scenes/quiz/PortalQuizHandler.ts`
- `src/game/scenes/quiz/GlobalQuestionManager.ts`

- `src/game/scenes/ui/HUDManager.ts`
- `src/game/scenes/ui/CameraManager.ts`
- `src/game/scenes/ui/EffectsManager.ts`

- `src/game/scenes/gameflow/EventBusManager.ts`
- `src/game/scenes/gameflow/GameOverHandler.ts`
- `src/game/scenes/gameflow/LevelTransitionHandler.ts`

- `src/game/scenes/enemy/EnemyManager.ts`
- `src/game/scenes/enemy/EnemyCloneFactory.ts`
- `src/game/scenes/enemy/EnemySpawner.ts`

- `src/game/scenes/world/WorldFactory.ts`
- `src/game/scenes/world/EntityFactory.ts`
- `src/game/scenes/world/CollisionObjectFactory.ts`

---

## Цели проверки

1. **Выявить отсутствующие тесты** для новых классов
2. **Проверить работоспособность** существующих тестов
3. **Убедиться**, что рефакторинг не сломал функциональность
4. **Создать отчёт** о соответствии тестов коду

---

## Шаги плана

### 1. 📋 Анализ новых файлов и проверка существующих тестов
**Задача:** Сопоставить список новых файлов с существующими тестами

**Новые файлы для проверки:**
- [ ] `AnimationSyncManager.ts`
- [ ] `KeyAnimationSync.ts`
- [ ] `PortalAnimationSync.ts`
- [ ] `OracleAnimationSync.ts`
- [ ] `PlayerAnimationSync.ts`
- [ ] `EnemyAnimationSync.ts`
- [ ] `EnemyCollisionHandler.ts`
- [ ] `ItemCollisionHandler.ts`
- [ ] `OracleCollisionHandler.ts`
- [ ] `PortalCollisionHandler.ts`
- [ ] `KeyQuizHandler.ts`
- [ ] `PortalQuizHandler.ts`
- [ ] `GlobalQuestionManager.ts`
- [ ] `HUDManager.ts`
- [ ] `CameraManager.ts`
- [ ] `EffectsManager.ts`
- [ ] `EventBusManager.ts`
- [ ] `GameOverHandler.ts`
- [ ] `LevelTransitionHandler.ts`
- [ ] `EnemyManager.ts`
- [ ] `EnemyCloneFactory.ts`
- [ ] `EnemySpawner.ts`
- [ ] `WorldFactory.ts`
- [ ] `EntityFactory.ts`
- [ ] `CollisionObjectFactory.ts`

**Существующие тесты (38 файлов):**
- `HealthSystem.test.ts`
- `AnimationManager.test.ts`
- `AudioManager.test.ts`
- `ScoreSystem.test.ts`
- `SpawnMatrix.test.ts`
- `SpawnSystem.test.ts`
- `CollisionSystem.test.ts`
- `SpriteAnimationHandler.test.ts`
- `QuizManager.test.ts`
- `Player.test.ts`
- `EnemyRandomWalker.test.ts`
- `EnemyChaser.test.ts`
- `EnemyFlam.test.ts`
- `AbstractEnemy.test.ts`
- `AbstractPortal.test.ts`
- `StandardPortal.test.ts`
- `Oracle.test.ts`
- `AssetLoader.test.ts`
- `GameState.test.ts`
- `LevelManager.test.ts`
- `WorldGenerator.test.ts`
- `ModalSizeCalculator.test.ts`
- `QuestionBubble.test.ts`
- `NineSliceBackground.test.ts`
- `Button.test.ts`
- `KeyQuestionModal.test.ts`
- `PortalModal.test.ts`
- `GameOverModal.test.ts`
- `UIOverlay.test.tsx`
- `PhaserGame.test.tsx`
- `QuizModal.test.tsx`
- `EventBus.test.ts`
- `FontSizeCalculator.test.ts`
- `scalingConstants.test.ts`
- `DeviceUtils.test.ts`
- `modal-scaling.test.ts`
- `async-error-handling.test.ts`

---

### 2. 🧪 Запуск полного набора тестов
**Задача:** Запустить `npm test` и проанализировать результаты

**Ожидаемые результаты:**
- Некоторые тесты могут упасть из-за изменений в структуре
- Новые классы могут не иметь тестов
- Упавшие тесты нужно классифицировать по типам ошибок

---

### 3. 📊 Анализ упавших тестов
**Классификация ошибок:**
- **Критические:** нарушения контрактов, сломанные зависимости
- **Важные:** устаревшие моки, неправильные ожидания
- **Минорные:** изменения в именах, путях

**Категории:**
- `REFACTOR_BREAKING` — тест сломан из-за рефакторинга
- `PRE_EXISTING` — тест был сломан до рефакторинга
- `MISSING_TEST` — нет теста для нового класса

---

### 4. 📝 Создание отчёта о соответствии
**Задача:** Создать детальный отчёт с классификацией всех проблем

**Файл:** `2026-01-20_refactor-test-compliance_PROGRESS.md`

**Содержание:**
- Список новых файлов без тестов
- Список упавших тестов с анализом причин
- Рекомендации по приоритетам исправления

---

## Критерии оценки

### Оценка покрытия тестами

| Категория | Файлов | Покрытие | Цель |
|-----------|---------|----------|-------|
| Менеджеры (animation, ui, gameflow) | 11 | ? | ≥ 80% |
| Обработчики (collision, quiz) | 8 | ? | ≥ 70% |
| Фабрики (world, enemy) | 3 | ? | ≥ 60% |
| **ИТОГО** | **22** | **?** | **≥ 70%** |

### Приоритеты исправления

| Приоритет | Категория | Срок |
|----------|----------|------|
| HIGH | Критические тесты (REFACTOR_BREAKING) | ASAP |
| MEDIUM | Важные тесты (PRE_EXISTING) | 1 неделя |
| LOW | Создание тестов для новых классов | 2 недели |

---

## Связанные документы

- `Refactoring_MASTER_PLAN.md` — план рефакторинга
- `Step08_GameFlowHandlers_PROGRESS.md` — прогресс шага 8
- `Step09_RemoveDebugCode_PROGRESS.md` — прогресс шага 9
- `Step10_FinalCleanup_PROGRESS.md` — прогресс шага 10
- `2026-01-20_refactor-test-compliance_PROGRESS.md` — отчёт о соответствии

---

## Примечания

**Важно:** Рефакторинг был направлен на улучшение архитектуры, а не на изменение функциональности. Тесты должны подтвердить, что поведение игры не изменилось.

**Риски:** Новые классы тесно интегрированы с MainScene, что может затруднять unit-тестирование. Возможно, потребуется использовать интеграционные тесты.
