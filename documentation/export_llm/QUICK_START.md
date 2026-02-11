# Quick Start - ArcadeQuiz

**Версия:** 2.0 (LLM)
**Дата:** 2026-01-28

---

## Запуск проекта

```bash
npm install
npm run dev
```

Проект будет доступен на `http://localhost:3000`

---

## Основные технологии

- **Phaser 3** - Игровой движок
- **React** - UI компоненты
- **TypeScript** - Типизация
- **Vite** - Сборщик

---

## Важные файлы

### Точка входа
- `src/main.tsx` - Точка входа React

### Игровые сцены
- `src/game/scenes/LoadingScene.ts` - Загрузка ресурсов
- `src/game/scenes/MainScene.ts` - Основная сцена

### Игрок и враги
- `src/game/entities/Player.ts` - Игрок
- `src/game/entities/enemies/` - Папка с врагами

### UI
- `src/game/ui/Button.ts` - Кнопки
- `src/game/ui/KeyQuestionModal.ts` - Модальные окна

### Системы
- `src/game/systems/HealthSystem.ts` - Здоровье
- `src/game/systems/QuizManager.ts` - Квиз система

---

## Отладка

Включите в `.env`:
```env
ARCADE_LOG_OVERLAY_ENABLED=true
```

**Другие флаги отладки:**
- `ARCADE_LOG_VISUAL_GRID_ENABLED` - Визуальная сетка на карте
- `ARCADE_LOG_SPAWN_GRID_ENABLED` - Детальные логи спавна

Подробнее: `documentation/main/game-systems/LOGGING_SYSTEM.md`

---

## Документация (новая структура)

```
documentation/main/
├── game-systems/   # Игровые системы (Bubble, SpawnMatrix, GoldenHearts, Logging)
├── ui/             # UI документация (GUIDE, MODAL, COMPONENTS, SCALING)
├── development/    # Для разработчиков (TESTING, DEBUGGING, BUILD)
├── project/        # О проекте (ARCHITECTURE, ProjectMap, GameDescription)
├── planning/       # Планы и прогресс
└── reference/      # Справочная информация
```

---

## Для подробной информации

- **Полная карта проекта:** `documentation/main/project/ProjectMap.md`
- **Быстрый старт по UI:** `documentation/main/ui/UI_GUIDE.md`
- **Отладка:** `documentation/main/development/DEBUGGING_GUIDE.md`
