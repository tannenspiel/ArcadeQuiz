# ArcadeQuiz

**Версия:** 1.0.0
**Дата обновления:** 2026-01-29
**Проект:** Игра-викторина на Phaser 3 + React + TypeScript

---

## Описание

ArcadeQuiz - это игра-викторина с элементами аркады, где игрок собирает руны, отвечает на вопросы и активирует порталы для победы. Игра использует модульную архитектуру с четким разделением ответственности между компонентами.

---

## Технологии

- **Phaser 3.90.0** - игровой движок
- **React 19.2.0** - UI компоненты (минимальное использование)
- **TypeScript 5.9.3** - типизация
- **Vite 7.2.4** - сборщик
- **Jest** - unit и integration тесты
- **Cypress** - E2E тесты

---

## Быстрый старт

### Установка зависимостей

```bash
npm install
```

### Запуск в режиме разработки

```bash
npm run dev
```

Игра будет доступна по адресу `http://localhost:3000`

### Сборка проекта

```bash
npm run build
```

Собранные файлы будут в папке `dist/`

### Запуск тестов

```bash
# Все тесты
npm test

# Unit тесты
npm run test:unit

# Integration тесты
npm run test:integration

# E2E тесты
npm run test:e2e

# С покрытием кода
npm run test:coverage
```

---

## Структура проекта

```
ArcadeQuiz/
├── src/                    # Исходный код
│   ├── game/              # Phaser игровая логика
│   │   ├── scenes/        # Игровые сцены (LoadingScene, MainScene)
│   │   │   ├── animation/      # Менеджеры синхронизации анимаций
│   │   │   ├── collision/      # Обработчики коллизий
│   │   │   ├── enemy/          # Менеджеры врагов
│   │   │   ├── gameflow/       # Handlers (GameOver, LevelTransition, EventBus)
│   │   │   ├── quiz/           # Handlers (KeyQuiz, PortalQuiz, GlobalQuestion)
│   │   │   ├── ui/             # UI менеджеры (Camera, Effects, HUD)
│   │   │   └── world/          # Фабрики (Entity, World, CollisionObject)
│   │   ├── entities/      # Игровые сущности (Player, Enemies, Portals, Oracle)
│   │   ├── systems/       # Игровые системы (Health, Score, Spawn, Collision, Audio, Animation)
│   │   ├── ui/            # UI элементы Phaser (Button, Modals, DebugOverlay)
│   │   └── utils/         # Утилиты (Logger, FontSizeCalculator, TextAnalyzer)
│   ├── react/             # React компоненты
│   ├── config/            # Конфигурация (gameConfig, levelConfigs, spritesheetConfigs)
│   ├── constants/         # Константы (gameConstants, textStyles, scalingConstants)
│   ├── types/             # TypeScript типы
│   └── utils/             # Общие утилиты
├── documentation/          # Документация проекта
│   ├── main/              # Основная документация
│   │   ├── game-systems/  # Игровые системы (Bubble, SpawnMatrix, GoldenHearts, Logging)
│   │   ├── ui/            # UI документация (GUIDE, MODAL, COMPONENTS, SCALING)
│   │   ├── development/   # Для разработчиков (TESTING, DEBUGGING, BUILD, DEVELOPMENT)
│   │   ├── project/       # О проекте (ARCHITECTURE, ProjectMap, GameDescription, TILED)
│   │   └── planning/      # Планы и прогресс
│   ├── export_llm/        # Документация для LLM
│   ├── temp_docs/         # Временные документы и логи
│   └── memory/            # Система памяти (CONTEXT, HISTORY, DECISIONS)
├── scripts/               # JS скрипты для сборки и тестирования
└── public/                # Статические файлы
```

---

## Документация

### Основная документация

#### О проекте (`documentation/main/project/`)
- **[ProjectMap.md](documentation/main/project/ProjectMap.md)** - Карта проекта с детальным описанием всех компонентов
- **[ARCHITECTURE.md](documentation/main/project/ARCHITECTURE.md)** - Подробное описание архитектуры
- **[GameDescription.md](documentation/main/project/GameDescription.md)** - Описание игры
- **[TILED_MAP_IMPLEMENTATION.md](documentation/main/project/TILED_MAP_IMPLEMENTATION.md)** - Реализация уровней с использованием Tiled Map

#### Игровые системы (`documentation/main/game-systems/`)
- **[BUBBLE_SYSTEM.md](documentation/main/game-systems/BUBBLE_SYSTEM.md)** - Система всплывающих сообщений (бабблов)
- **[SPAWN_MATRIX_SYSTEM.md](documentation/main/game-systems/SPAWN_MATRIX_SYSTEM.md)** - Матричная система позиционирования объектов
- **[GOLDEN_HEARTS_SYSTEM.md](documentation/main/game-systems/GOLDEN_HEARTS_SYSTEM.md)** - Система золотых сердечек (ключи)
- **[LOGGING_SYSTEM.md](documentation/main/game-systems/LOGGING_SYSTEM.md)** - Система логирования

#### UI документация (`documentation/main/ui/`)
- **[UI_GUIDE.md](documentation/main/ui/UI_GUIDE.md)** - Комплексное руководство по UI
- **[MODAL_GUIDE.md](documentation/main/ui/MODAL_GUIDE.md)** - Руководство по модальным окнам
- **[UI_COMPONENTS.md](documentation/main/ui/UI_COMPONENTS.md)** - UI компоненты
- **[UI_TEXT_SCALING.md](documentation/main/ui/UI_TEXT_SCALING.md)** - Масштабирование текста
- **[FONT_SIZING_SYSTEM.md](documentation/main/ui/FONT_SIZING_SYSTEM.md)** - Размеры шрифтов

#### Для разработчиков (`documentation/main/development/`)
- **[DEBUGGING_GUIDE.md](documentation/main/development/DEBUGGING_GUIDE.md)** - Руководство по отладке
- **[TESTING.md](documentation/main/development/TESTING.md)** - Руководство по тестированию
- **[BUILD.md](documentation/main/development/BUILD.md)** - Инструкции по сборке и запуску
- **[DEVELOPMENT.md](documentation/main/development/DEVELOPMENT.md)** - Руководство по разработке
- **[VIEWPORT_SCALING.md](documentation/main/development/VIEWPORT_SCALING.md)** - Система масштабирования окна и камеры
- **[GRAPHICS_SCALING.md](documentation/main/development/GRAPHICS_SCALING.md)** - Правила масштабирования графики

### Документация для LLM (`documentation/export_llm/`)

- **[PROJECT_MAP.md](documentation/export_llm/PROJECT_MAP.md)** - Упрощенная карта проекта (v2.1)
- **[QUICK_START.md](documentation/export_llm/QUICK_START.md)** - Быстрый старт для LLM

---

## Ключевые особенности

### Система масштабирования

- **Адаптивное виртуальное разрешение:** Высота фиксирована (1280), ширина вычисляется динамически на основе соотношения сторон экрана (360-2560)
- **Базовый масштаб:** 4.0 (для игрового мира)
- **Phaser.Scale.FIT:** Автоматическое масштабирование с сохранением пропорций
- **Letterboxing:** Автоматически создается при несоответствии соотношения сторон, закрывается расширенным фоном

### Модульная архитектура

- **Scenes:** BaseScene, LoadingScene, MainScene (2665 строк, модульная структура)
  - `animation/` - менеджеры синхронизации анимаций
  - `collision/` - обработчики коллизий
  - `enemy/` - менеджеры врагов
  - `gameflow/` - handlers игрового процесса
  - `quiz/` - handlers квизов
  - `ui/` - UI менеджеры
  - `world/` - фабрики мира
- **Entities:** Player, Enemies (AbstractEnemy и наследники), Portals, Oracle
- **Systems:** HealthSystem, ScoreSystem, SpawnSystem, CollisionSystem, AudioManager, AnimationManager, QuizManager

### Система расчета размеров шрифтов

- **Унифицированная логика:** Все тексты во всех модальных окнах (включая кнопки) используют единую логику расчета
- **Единый базовый размер:** Все элементы рассчитываются с одним и тем же `baseFontSize`
- **Единый множитель:** Ко всем элементам применяется множитель `1.5` для одинакового визуального размера
- **Адаптивность:** Размеры автоматически подстраиваются под доступное пространство и длину текста
- **Оптимизация:** Используется бинарный поиск для нахождения оптимального базового размера

### Конфигурация уровней

Уровни настраиваются через JSON файлы (`src/config/levelConfigs/level1.config.json`):
- Спавн врагов (количество, типы, задержки)
- Скорости врагов (базовая и chaseSpeed для преследования)
- Здоровье врагов
- Поведение врагов (chaseRadius, chaseSpeed, cloneDetectionRadius, cloneCount)
- Спавн предметов (сердечки, руны)
- Фоновые спрайты (трава)
- Объекты коллизии (кусты)

---

## Основные команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск в режиме разработки |
| `npm run dev:clean` | Остановить процесс на порту 3000 и запустить |
| `npm run dev:log` | Запуск с сохранением логов в файл |
| `npm run build` | Сборка проекта |
| `npm test` | Запуск всех тестов |
| `npm run test:unit` | Запуск unit тестов |
| `npm run test:integration` | Запуск integration тестов |
| `npm run test:e2e` | Запуск E2E тестов (Cypress) |
| `npm run test:coverage` | Тесты с покрытием кода |
| `npm run cleanup:temp` | Очистка временных файлов |

---

## Переменные окружения

Создайте файл `.env` в корне проекта:

```env
VITE_CURRENT_THEME=Game_01
VITE_ENABLE_FEEDBACKS=true
VITE_ENABLE_WRONG_FEEDBACKS=true
```

---

## Лицензия

Проект разработан для образовательных целей.

---

## Контакты

Для вопросов и предложений обращайтесь к разработчикам проекта.

---

**Последнее обновление:** 2026-01-29

