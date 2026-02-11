# Project History - Milestones

**Purpose:** Chronology of completed work. This file is for major milestones, not minor edits.

---

## 2026-02-10: Production Release Preparation ✅

**Status:** ✅ COMPLETED

### Summary
Подготовка релиза: отключение debug-фич в production сборке при сохранении игрового UI. Исправлен критический баг — элементы HUD (счётчики, кнопка звука) создавались только при `DEBUG_UI_ENABLED === true`.

### Changes

**src/config/debugConfig.ts:**
- Добавлена функция `isProductionMode()` для проверки production режима
- Визуальные debug флаги теперь принудительно отключены в production:
  - `DEBUG_OVERLAY_ENABLED` — текстовый оверлей с FPS/координатами
  - `DEBUG_VISUAL_GRID_ENABLED` — визуальная сетка спавна
  - `DEBUG_SPAWN_GRID_ENABLED` — детальные логи сетки

**src/config/gameConfig.ts:**
- Возвращено оригинальное значение `DEBUG_UI_ENABLED` (флаг логирования, не создания UI)

**src/game/scenes/MainScene.ts:**
- **КРИТИЧНО:** Убрано условие `if (DEBUG_UI_ENABLED)` для создания HUD
- HUD теперь создаётся ВСЕГДА — это не debug фича, а основной игровой UI

### Результаты проверки (production build)

| Элемент | Dev | Production |
|---------|-----|------------|
| Console logs | ✅ Включены | ❌ Отключены (esbuild) |
| Debug Overlay | ✅ Виден | ❌ Не виден |
| Счётчик уровня/очка | ✅ Виден | ✅ Виден |
| Кнопка звука | ✅ Видна | ✅ Видна |
| Подсказка (ключи/монеты) | ✅ Видна | ✅ Видна |

**Tests:** ✅ 1822/1822 passing

### Архитектурное решение

**Проблема:** `esbuild: { drop: ['console'] }` удаляет только console.log, но Phaser GameObjects (debug overlay) не затрагиваются.

**Решение:** Добавлена проверка `import.meta.env.MODE === 'production'` в debugConfig.ts для визуальных debug флагов.

**Важно:** Разделение понятий:
- `DEBUG_UI_ENABLED` — логирование UI событий (может быть включено в dev)
- `DEBUG_OVERLAY_ENABLED` — визуальный оверлей (всегда отключён в production)
- HUD (счётчики, кнопки) — игровой UI, не debug фича

---

## Archived Entries

Previous milestones have been archived to:
**→ [archive/HISTORY_sound-button-state-persistence_20260210.md](archive/HISTORY_sound-button-state-persistence_20260210.md)**

---

**Rotation Policy:** Новая задача = новый файл (жёсткое правило).

**Last rotation:** 2026-02-10
