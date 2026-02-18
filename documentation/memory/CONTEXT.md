# Current Context - Snapshot

**Last Updated:** 2026-02-18 (session)
**Branch:** `main`
**Status:** MCP Chrome DevTools Integration ✅ DONE

---

## Environment

| Setting | Value |
|---------|-------|
| **Port** | `3000` (dev) + `9222` (Chrome debug) |
| **Start Command** | `npm run dev:debug` |
| **Browser** | Chrome (chrome-devtools-mcp) |
| **Tests** | ✅ 670/675 passed |
| **Git** | 📝 Modified |

---

## Current Focus

**ТЕКУЩАЯ ЗАДАЧА:** Интеграция MCP Chrome DevTools ✅ DONE

**Выполнено:**
- ✅ Создан файл правил `.claude/rules/06-mcp-devtools.md` (+370 строк)
- ✅ Обновлён `ui-architect` с командами `capture_screenshot` и `evaluate_script` (+80 строк)
- ✅ Обновлён `phaser-expert` с командами инспекции сцены (+95 строк)
- ✅ Обновлён `game-systems` с командами GameState инспекции (+110 строк)
- ✅ Обновлён `00-workflow.md` с проверкой MCP окружения (+45 строк)
- ✅ Обновлён `00-main-rules.md` и `04-skills.md` с навигацией (+14 строк)

**Новые возможности MCP:**
| Скилл | MCP команды |
|-------|-------------|
| `ui-architect` | `capture_screenshot`, `evaluate_script` (Grid Snapping) |
| `phaser-expert` | `evaluate_script` (сцена, tweens, камера, physics) |
| `game-systems` | `evaluate_script` (quiz, health, score, spawn, audio, level) |

**Доступ к GameState:**
```javascript
// Через MCP evaluate_script:
const scene = window.__PHASER_GAME__.scene.getScene('MainScene');
// scene.levelManager, scene.scoreSystem, scene.healthSystem, scene.quizManager...
```

---

## Next Steps

**Ожидание новых задач от пользователя.**

---

## Recent Completed Tasks

| Дата | Задача | Статус |
|------|---------|---------|
| 2026-02-18 | MCP Chrome DevTools Integration | ✅ COMPLETED |
| 2026-02-17 | MAX_FONT_SIZE limits for modal windows | ✅ COMPLETED |
| 2026-02-16 | Documentation Sync (MODAL_GUIDE.md, FONT_SIZING_SYSTEM.md) | ✅ COMPLETED |
| 2026-02-16 | Modal Font Logic Documentation | ✅ COMPLETED |

---

## Documentation Archive Structure

**Новый план:**
- `2026-02-18_mcp-devtools-integration/` — ✅ COMPLETED

**Созданы архивы в `documentation/memory/archive/`:**
- `HISTORY_modal-font-system_20260218.md` — предыдущая тема (шрифты/модалки)

---

## MCP Environment Status

**Для работы MCP требуется:**
1. ✅ npm run dev:debug запущен
2. ✅ Порт 9222 доступен (Chrome remote debugging)
3. ✅ `window.__PHASER_GAME__` экспонирован (PhaserGame.tsx:136)

**Проверка MCP:**
```bash
# Проверить статус MCP сервера
/mcp

# Проверить порт 9222
curl http://localhost:9222/json/version

# Если недоступен
npm run dev:debug
```

---

## Rules Reminders

- **Tests coverage reports:** Генерируются в `coverage/` командой `npm run test:coverage`
- **Temp docs:** Удалять через 7 дней если суть не перенесена в `HISTORY.md`
- **MCP скриншоты:** Только в `documentation/temp_docs/*.png`
- **Plans rotation:** Архивировать выполненные планы, обновлять STATUS в README.md

---

**Remember:** Update this file when starting a new task or when environment changes.
