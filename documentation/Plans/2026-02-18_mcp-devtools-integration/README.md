# MCP Chrome DevTools Integration Plan

**Дата создания:** 2026-02-18
**Статус:** 🔄 IN PROGRESS
**Приоритет:** HIGH

---

## 📋 Обзор задачи

**Цель:** Интегрировать MCP Chrome DevTools в систему правил и скиллов проекта ArcadeQuiz для визуальной отладки UI, модальных окон и Phaser игровых объектов.

**Контекст:**
- chrome-devtools MCP сервер успешно протестирован
- Порт 9222 работает для удалённой отладки
- npm скрипт `dev:debug` готов к использованию
- `.temp/chrome-debug` профиль создан

---

## 🎯 Задачи интеграции

### 1. Создать новый файл правил `06-mcp-devtools.md`
**Расположение:** `.claude/rules/06-mcp-devtools.md`

**Содержание:**
- Обзор MCP Chrome DevTools
- Требования для использования (npm run dev:debug)
- Доступные MCP инструменты
- Примеры команд для Phaser инспекции
- Правила путей для Windows/Git Bash

### 2. Обновить `ui-architect` скилл
**Файл:** `.claude/skills/ui-architect/SKILL.md`

**Добавить:**
- Инструкции по использованию `capture_screenshot` для верификации UI
- Примеры проверки центрирования модальных окон
- Проверка grid snapping через визуальный анализ

### 3. Обновить `phaser-expert` скилл
**Файл:** `.claude/skills/phaser-expert/SKILL.md`

**Добавить:**
- Инструкции по использованию `evaluate_script` для инспекции Phaser сцены
- JS команды для получения game state
- Проверка GameObject position, scale, visible
- Анализ tweens и timeline через консоль

### 4. Обновить `game-systems` скилл
**Файл:** `.claude/skills/game-systems/SKILL.md`

**Добавить:**
- Инструкции по проверке систем через `evaluate_script`
- Доступ к QuizManager, HealthSystem, ScoreSystem состояниям
- Проверка object pooling

### 5. Обновить `00-workflow.md`
**Файл:** `.claude/rules/00-workflow.md`

**Добавить секцию "Проверка MCP окружения":**
- Проверка `/mcp` статуса при старте сессии
- Верификация порта 9222
- Запуск `npm run dev:debug` если MCP недоступен

### 6. Обновить `04-skills.md` (опционально)
**Файл:** `.claude/rules/04-skills.md`

**Добавить:**
- Ссылку на новый `06-mcp-devtools.md`
- Обновлённое описание скиллов с MCP инструкциями

---

## 📝 Детальные спецификации

### Файл `06-mcp-devtools.md` - Структура

```markdown
# MCP Chrome DevTools Rules

## Обзор
- chrome-devtools MCP сервер для управления браузером
- Порт 9222 для удалённой отладки Chrome
- Пример: `npm run dev:debug`

## Требования
1. npm run dev:debug для запуска с Chrome debugging
2. .temp/chrome-debug профиль для изоляции
3. Порт 3000 (Vite) + 9222 (Chrome debug)

## MCP Инструменты
- capture_screenshot - скриншоты для UI проверки
- evaluate_script - JS код для Phaser инспекции
- take_snapshot - анализ DOM элементов
- list_pages - открытые вкладки

## Phaser Инспекция (JS через evaluate_script)
```javascript
// Получить game instance
const game = window.__PHASER_GAME__;

// Текущая сцена
const scene = game.scene.getScene('MainScene');

// GameObject по ключу
const obj = scene.children.getByName('player');

// Все объекты на сцене
const children = scene.children.list;
```

## Windows/Git Bash Совместимость
- Использовать ${PWD} вместо $pwd
- Экранировать ` в PowerShell через npm: \`
- Пути: .temp/chrome-debug (относительно проекта)
```

### ui-architect - Добавления

```markdown
## MCP DevTools для UI отладки

**Требование:** `npm run dev:debug` должен быть запущен

### Скриншоты модальных окон
```typescript
// 1. Навигация к localhost:3000
navigate_page: { type: "url", url: "http://localhost:3000" }

// 2. Скриншот
take_screenshot: { filePath: "documentation/temp_docs/ui-modal-check.png" }

// 3. Анализ через 4.5v_mcp
analyze_image: { prompt: "опиши центрирование кнопки закрытия" }
```

### Проверка Grid Snapping
```javascript
// Через evaluate_script:
const buttons = document.querySelectorAll('canvas');
// Анализ позиций кратных BASE_SCALE = 4
```
```

### phaser-expert - Добавления

```markdown
## MCP DevTools для Phaser инспекции

### Получение состояния сцены
```javascript
// В evaluate_script:
() => {
  const game = window.__PHASER_GAME__;
  const scene = game.scene.getScene('MainScene');
  return {
    camera: scene.cameras.main.getWorldPoint(0, 0),
    children: scene.children.list.length,
    tweens: scene.tweens.getLength()
  };
}
```

### Инспекция конкретного GameObject
```javascript
(el) => {
  return {
    x: el.x,
    y: el.y,
    scale: el.scale,
    visible: el.visible,
    alpha: el.alpha
  };
}
```
```

### game-systems - Добавления

```markdown
## MCP DevTools для системной отладки

### Доступ к GameState
```javascript
() => {
  const game = window.__PHASER_GAME__;
  const scene = game.scene.getScene('MainScene');
  return {
    score: scene.score,
    health: scene.health,
    keys: scene.keys,
    level: scene.level
  };
}
```

### Проверка object pool
```javascript
() => {
  const spawnSystem = window.__PHASER_GAME__.scene.getScene('MainScene').spawnSystem;
  return {
    poolSize: spawnSystem.pool.getLength(),
    active: spawnSystem.activeCount
  };
}
```
```

### 00-workflow.md - Добавления

```markdown
## 🔌 ПРОВЕРКА MCP ОКРУЖЕНИЯ

**ПРАВИЛО:** При начале новой сессии проверить статус MCP:

1. **Проверка MCP сервера:**
   ```
   /mcp
   ```
   Должен показать `chrome-devtools` в списке активных

2. **Проверка порта 9222:**
   ```bash
   curl http://localhost:9222/json/version
   ```

3. **Если MCP недоступен:**
   - Остановить текущий сервер: `npm run dev:stop`
   - Запустить с debug: `npm run dev:debug`
   - Подождать запуск Chrome и Vite

**Интеграция в старт сессии:**
Выполнять после чтения CONTEXT.md, перед проверкой порта 3000.
```

---

## 🔗 Затронутые файлы

| Файл | Действие | Причина |
|------|----------|---------|
| `.claude/rules/06-mcp-devtools.md` | CREATE | Новый файл правил MCP |
| `.claude/skills/ui-architect/SKILL.md` | UPDATE | Добавить MCP команды для UI |
| `.claude/skills/phaser-expert/SKILL.md` | UPDATE | Добавить MCP для Phaser |
| `.claude/skills/game-systems/SKILL.md` | UPDATE | Добавить MCP для систем |
| `.claude/rules/00-workflow.md` | UPDATE | Добавить проверку MCP |
| `.claude/rules/04-skills.md` | UPDATE | Ссылка на 06-mcp-devtools.md |

---

## ⚠️ Критические ограничения

### Windows/Git Bash совместимость

**В npm скриптах (package.json):**
- Использовать `${PWD}` вместо `$pwd`
- Экранировать `: `"\"` для вложенных кавычек
- Пути: относительные `.temp/chrome-debug`

**В MCP командах:**
- Пути к файлам: абсолютные или корректные относительные
- Снимки экрана: `documentation/temp_docs/*.png`

### Пути для скриншотов
- ✅ Правильно: `documentation/temp_docs/ui-check-2026-02-18.png`
- ❌ Неправильно: `temp.png` в корне проекта

---

## 📋 Порядок выполнения

1. **Phase 1: Создание правил**
   - [ ] Создать `06-mcp-devtools.md`
   - [ ] Добавить в `00-main-rules.md` ссылку

2. **Phase 2: Обновление скиллов**
   - [ ] Обновить `ui-architect/SKILL.md`
   - [ ] Обновить `phaser-expert/SKILL.md`
   - [ ] Обновить `game-systems/SKILL.md`

3. **Phase 3: Обновление workflow**
   - [ ] Обновить `00-workflow.md` с MCP проверкой
   - [ ] Обновить `04-skills.md` с новой ссылкой

4. **Phase 4: Верификация**
   - [ ] Тест новой команды `/mcp` в workflow
   - [ ] Запуск `npm run dev:debug` из workflow
   - [ ] Проверка скриншотов через ui-architect

---

## 🔄 Связанные документы

- `package.json` — скрипт `dev:debug`
- `src/react/PhaserGame.tsx` — глобальный `window.__PHASER_GAME__`
- `documentation/memory/CONTEXT.md` — статус окружения
- `documentation/memory/DECISIONS.md` — запись решения о MCP

---

## 📊 Success Criteria

**Интеграция считается успешной когда:**
1. ✅ Все файлы обновлены согласно плану
2. ✅ MCP проверка добавлена в workflow
3. ✅ ui-architect может делать скриншоты для проверки
4. ✅ phaser-expert может инспектировать сцену через evaluate_script
5. ✅ Windows/Git Bash синтаксис корректен во всех командах
6. ✅ Пути соответствуют правилам из `03-files-and-logs-rules.md`
