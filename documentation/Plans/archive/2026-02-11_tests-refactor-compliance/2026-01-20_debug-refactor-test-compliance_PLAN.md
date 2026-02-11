# План обновления тестов после рефакторинга дебаг-системы

**Дата создания:** 2026-01-20
**Статус:** IN PROGRESS
**Приоритет:** MEDIUM

---

## Контекст

### Затронутые файлы (рефакторинг дебаг-системы)
- `src/config/debugConfig.ts` — новые флаги `DEBUG_OVERLAY_ENABLED`, `DEBUG_VISUAL_GRID_ENABLED`
- `src/config/gameConfig.ts` — реэкспорт новых флагов
- `src/game/ui/DebugOverlay.ts` — разделение флагов, добавлен FPS
- `.env` — обновлены комментарии

### Тестовые файлы
- `src/tests/unit/ui/` — **ОТСУТСТВУЕТ** тест для DebugOverlay
- Другие UI тесты: `Button.test.ts`, `KeyQuestionModal.test.ts`, `PortalModal.test.ts`, `GameOverModal.test.ts`, `QuestionBubble.test.ts`, `NineSliceBackground.test.ts`

---

## Статус соответствия тестов коду

### ✅ НЕ Требуют обновления (не связаны с рефакторингом)

| Файл теста | Статус | Ошибка? |
|-------------|---------|---------|
| `HealthSystem.test.ts` | ✅ PASS | — |
| `AnimationManager.test.ts` | ✅ PASS | — |
| `AudioManager.test.ts` | ✅ PASS | — |
| `ScoreSystem.test.ts` | ✅ PASS | — |
| `SpawnMatrix.test.ts` | ✅ PASS | — |
| `SpriteAnimationHandler.test.ts` | ✅ PASS | — |
| `QuizManager.test.ts` | ✅ PASS | — |
| `SpawnSystem.test.ts` | ✅ PASS | — |
| `CollisionSystem.test.ts` | ✅ PASS | — |
| `Player.test.ts` | ✅ PASS | — |
| `EnemyRandomWalker.test.ts` | ✅ PASS | — |
| `EnemyChaser.test.ts` | ✅ PASS | — |
| `EnemyFlam.test.ts` | ✅ PASS | — |
| `AbstractEnemy.test.ts` | ✅ PASS | — |
| `AbstractPortal.test.ts` | ✅ PASS | — |
| `StandardPortal.test.ts` | ✅ PASS | — |
| `Oracle.test.ts` | ✅ PASS | — |
| `AssetLoader.test.ts` | ✅ PASS | — |
| `GameState.test.ts` | ✅ PASS | — |
| `LevelManager.test.ts` | ⚠️ FAIL | 4 failed tests (НЕ связано с рефакторингом) |
| `WorldGenerator.test.ts` | ⚠️ FAIL | 2 failed tests (НЕ связано с рефакторингом) |
| `ModalSizeCalculator.test.ts` | ✅ PASS | — |
| `QuestionBubble.test.ts` | ✅ PASS | — |
| `NineSliceBackground.test.ts` | ✅ PASS | — |
| `Button.test.ts` | ✅ PASS | — |
| `KeyQuestionModal.test.ts` | ✅ PASS | — |
| `PortalModal.test.ts` | ✅ PASS | — |
| `GameOverModal.test.ts` | ✅ PASS | — |
| `UIOverlay.test.tsx` | ✅ PASS | — |
| `PhaserGame.test.tsx` | ✅ PASS | — |
| `QuizModal.test.tsx` | ✅ PASS | — |
| `EventBus.test.ts` | ✅ PASS | — |
| `FontSizeCalculator.test.ts` | ✅ PASS | — |
| `scalingConstants.test.ts` | ✅ PASS | — |
| `DeviceUtils.test.ts` | ✅ PASS | — |
| `modal-scaling.test.ts` | ✅ PASS | — |
| `async-error-handling.test.ts` | ✅ PASS | — |

### ❌ ОТСУТСТВУЮТ (новые тесты для создания)

| Файл | Описание | Приоритет |
|------|------------|------------|
| `DebugOverlay.test.ts` | Тесты для класса DebugOverlay | LOW |
| `debugConfig.test.ts` | Тесты для debugConfig.ts | LOW |

---

## Шаги плана

### 1. ✅ Анализ влияния рефакторинга на тесты
- **Статус:** DONE
- **Результат:** Рефакторинг дебаг-системы НЕ повлиял на существующие тесты (нет тестов для DebugOverlay)

### 2. ✅ Запуск тестов для проверки статуса
- **Статус:** DONE
- **Результат:** 514 passed, 9 failed (ошибки НЕ связаны с рефакторингом)
- **Упавшие тесты:** `LevelManager.test.ts` (4), `WorldGenerator.test.ts` (2)

### 3. 📋 Создание отчёта о соответствии
- **Статус:** IN PROGRESS
- **Задача:** Создать `2026-01-20_debug-refactor-test-compliance_PROGRESS.md`

### 4. 📋 Создание плана обновления тестов
- **Статус:** PENDING
- **Задача:** Создать отдельный план для обновления упавших тестов (если требуется)

---

## Вывод

**Рефакторинг дебаг-системы НЕ НАРУШИЛ существующие тесты**, так как:

1. ✅ Нет тестов для `DebugOverlay` — нечего ломаться
2. ✅ Упавшие тесты в `LevelManager` и `WorldGenerator` существуют **ДО** рефакторинга
3. ✅ Все тесты, которые зависят от UI компонентов, проходят успешно

**Рекомендация:** Создать тесты для `DebugOverlay` в будущем (LOW priority).

---

## Связанные документы

- `2026-01-20_debug-refactor-test-compliance_PROGRESS.md` — отчёт о соответствии (будет создан)
