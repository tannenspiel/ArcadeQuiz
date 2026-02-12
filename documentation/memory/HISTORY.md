# Project History - Milestones

**Purpose:** Chronology of completed work. This file is for major milestones, not minor edits.

---

## 2026-02-12: PWA Update Button Mobile Fix

**Status:** ✅ COMPLETED

### Summary
Исправление тапабельности кнопки "ОБНОВИТЬ" в PWA уведомлении на мобильных устройствах. На мобильных устройствах `onClick` событие не срабатывает без `onTouchStart` обработчика.

### Выполненные действия

**1. Анализ проблемы:**
- Кнопка "ОБНОВИТЬ" в модальном окне не тапалась на мобильных
- `TEST PWA` кнопка (для теста) работала, значит проблема в React onClick
- Eruda консоль не работала из-за z-index конфликтов с Phaser canvas

**2. Исправление PhaserGame.tsx:**
- Добавлен `onTouchStart={handleUpdate}` к кнопке "ОБНОВИТЬ"
- Добавлен `touchAction: 'manipulation'` для быстрого отклика
- Код:
  ```tsx
  <button
    onClick={handleUpdate}
    onTouchStart={handleUpdate}  // ✅ Добавлено
    style={{ ..., touchAction: 'manipulation' }}
  >
  ```

**3. Упрощение PWA обновления:**
- Убрана проверка на `window.showUpdateNotification` в index.html
- Теперь Service Worker автоматически перезагружает страницу при обнаружении обновления
- Задержка 1 секунда перед перезагрузкой для плавности

**4. Тестирование:**
- На телефоне (Android): кнопка "ОБНОВИТЬ" стала тапабельной ✅
- Автоматическое обновление через изменение версии кэша работает ✅

### Изменённые файлы
- `src/react/PhaserGame.tsx` — добавлен `onTouchStart` для мобильных тач-событий
- `index.html` — упрощена логика авто-обновления (убрана зависимость от `window.showUpdateNotification`)
- `.cache-version.json` — изменена версия для тестирования
- `public/sw.js` — синхронизирована версия
- `.gitignore` — добавлен `nul` для предотвращения случайных файлов

### Финальное решение
**Выбрано:** Автоматическое обновление PWA (без кнопки "ОБНОВИТЬ")
- ✅ Service Worker автоматически перезагружает страницу при обнаружении новой версии
- ✅ Задержка 1 секунда перед перезагрузкой для плавности
- ✅ Фикс `onTouchStart` остаётся в коде на случайfuture изменений

**Тестирование:**
- На Android (телефон): авто-обновление работает корректно
- Кнопка "ОБНОВИТЬ" с `onTouchStart` тапабельна (проверено через TEST PWA кнопку)

---

## 2026-02-12: OracleCollisionHandler Fix + UI Layout Documentation

**Status:** ✅ COMPLETED

### Summary
Фикс бага `TypeError: this.handleKeyPhase is not a function` в OracleCollisionHandler при столкновении с Оракулом в KEY фазе. Дополнительно задокументированы критически важные правила по работе с UI-лейаутом модальных окон.

### Выполненные действия

**1. Исправление OracleCollisionHandler:**
- Добавлен метод `handleKeyPhase()` (строки 143-202 в `OracleCollisionHandler.ts`)
- Логика: проверка ключей → депозит в оракул → обновление HUD
- **ВАЖНО:** Ключи НЕ отображаются над игроком (в отличие от монеток)
- Добавлена защитная проверка: `if (typeof (this as any).handleKeyPhase === 'function')` перед вызовом

**2. Build исправление:**
- Скопирован `public/manifest.json` → `dist/` (Vite не копирует автоматически)
- Проверены относительные пути (`base: './'`) — корректны для portable dist
- `DEPLOYMENT.md` скопирован в `dist/`

**3. Документация UI-Layout критичности:**

**⚠️ КРИТИЧЕСКИ ВАЖНОЕ ПРАВИЛО ПРИ РАБОТЕ С UI КОМПОНЕНТАМИ:**

> При работе с `OracleCollisionHandler`, `HUDManager`, `EventBusManager` и другими системами, которые влияют на gameState или обновляют UI — **НИКОГДА не добавлять новые импорты** и **НЕ менять** файлы расчёта размеров шрифтов:
> - `FontSizeCalculator.ts`
> - `ModalSizeCalculator.ts`
> - `KeyQuestionModal.ts` (особенно метод `createUI()`)

**Почему это важно:**

Расчёт размеров шрифтов в `KeyQuestionModal.createUI()` происходит в момент создания модального окна и зависит:
1. От `calculateUnifiedBaseFontSize(scene, currentLevel)` — зависит ТОЛЬКО от уровня
2. От `getBoundingClientRect()` — реальные размеры canvas
3. От `cam.width`, `cam.height` — размеры камеры
4. От `modalSize` из `ModalSizeCalculator`

**⚠️ НЕ зависит от:**
- ❌ `GamePhase` — фаза игры НЕ используется в расчётах
- ❌ `hudManager.update()` — только обновляет текст HUD, не влияет на модалки
- ❌ `gameState.setOracleActivated()` — только флаг, не триггерит перерасчёт

**⚠️ ОПАСНЫЕ ВЫЗОВЫ (которые сломали шрифты в прошлом):**
- Добавление новых импортов в начало файла — может изменить порядок инициализации
- Изменение `player.applyKey()` — может повлиять на состояние игрока
- Вызов `player.updateKeys()` для ключей — ключи не отображаются над игроком!
- Изменение `camera.zoom()` или позиций — может сломать `calculateModalSize`

**4. Тестирование:**
- `npm run build` — успешно
- `npm run preview` — протестировано на `http://localhost:4173/`
- COIN → KEY фаза переход работает
- Депозит ключей в Оракул работает
- ✅ 1828/1828 tests passing

**⚠️ Browser Warnings (npm run preview):**
При `npm run preview` в консоли браузера присутствуют предупреждения:

```
phaser-CaeXhmZs.js:63 The AudioContext was not allowed to start.
It must be resumed (or created) after a user gesture on the page.
https://goo.gl/7K7WLu

[Violation] 'setTimeout' handler took <N>ms (x5)
```

**Объяснение:**
1. **AudioContext warning:** Chrome блокирует автозапуск аудио без пользовательского жеста (click/touch)
   - В dev (`npm run dev`) это не критично
   - В production (релиз) это может мешать игрокам
   - **Решение:** Аудио запускается только после первого взаимодействия пользователя с игрой

2. **Long Tasks Violations:** setTimeout handler выполняется >100ms
   - Это нарушение Long Tasks API (https://web.dev/longtasks)
   - В dev (`npm run dev`) не критично, можно игнорировать
   - **В production:** НЕ.should быть таких нарушений (оптимизировать код!)

**Примечание для релиза:**
- Эти предупреждения показываются ТОЛЬКО в `npm run preview`
- В production (на GitHub Pages) их НЕ должно быть
- Если появятся — нужно оптимизировать код для соблюдения Long Tasks API

### Изменённые файлы
- `src/game/scenes/collision/OracleCollisionHandler.ts` — добавлен `handleKeyPhase()`

---

## Archived Entries

Previous milestones have been archived to:
**→ [archive/HISTORY_oracle-collision-handler-fix_2026-02-12.md](archive/HISTORY_oracle-collision-handler-fix_2026-02-12.md)**

---

**Rotation Policy:** Новая задача = новый файл (жёсткое правило).

**Last rotation:** 2026-02-12
