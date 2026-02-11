# Audit Report: Level System Architecture
**Дата:** 2026-02-01
**Цель:** Анализ ограничений архитектуры для автоматического добавления новых уровней.

## 1. Проблема
Текущая архитектура игры жестко привязана к фиксированному количеству уровней (Level 1 и Level 2). Добавление новых уровней (Level 3+) требует вмешательства программиста в исходный код (`LevelManager`, `LoadingScene`, `WorldFactory`, `gameConstants`), что нарушает принцип Data-Driven Design.

## 2. Выявленные Блокирующие Факторы

### 2.1. Hardcoded Level Limits
**Файл:** `src/constants/gameConstants.ts`
```typescript
export const MAX_LEVELS = 2; // Жесткое ограничение
```
**Файл:** `src/game/scenes/gameflow/LevelTransitionHandler.ts`
```typescript
const MAX_LEVELS = 2; // Дублирование константы, блокирует переход на L3
```
- **Влияние:** Игра считает победой прохождение 2-го уровня и не пытается загрузить следующий.

### 2.2. Static Asset Loading
**Файл:** `src/game/scenes/LoadingScene.ts`
- Загрузка ресурсов прописана вручную для каждого уровня:
  ```typescript
  this.load.image(KEYS.MAP_BG_STANDARD_L1, ...);
  this.load.image(KEYS.MAP_BG_STANDARD_L2, ...);
  ```
- **Влияние:** Ассеты для Level 3 не будут загружены в память, даже если файлы существуют в папке.

### 2.3. Static Configuration Import
**Файл:** `src/game/core/LevelManager.ts`
- Конфигурации уровней импортируются статически:
  ```typescript
  import level1Config from '../../config/levelConfigs/level1.config.json';
  import level2Config from '../../config/levelConfigs/level2.config.json';
  ```
- **Влияние:** `LevelManager` не умеет подгружать `level3.config.json` динамически. Использование `AssetLoader.loadJSON` отсутствует для конфигов уровней.

### 2.4. Hardcoded World Generation
**Файл:** `src/game/scenes/world/WorldFactory.ts`
- Логика выбора текстур фона использует условные операторы, знающие только о 2 уровнях:
  ```typescript
  this.deps.levelManager.getCurrentLevel() === 1 ? KEYS.MAP_BG_STANDARD_L1 : KEYS.MAP_BG_STANDARD_L2
  ```
- **Влияние:** При запуске Level 3 игра упадет или загрузит неправильный фон.

### 2.5. Asset Keys Hardcoding
**Файл:** `src/constants/gameConstants.ts`
- Объект `KEYS` содержит явные поля для каждого уровня: `MAP_BG_STANDARD_L1`, `MAP_BG_STANDARD_L2`.
- **Влияние:** Отсутствует системный подход к генерации ключей (например, `getMapBgKey(level)`).

## 3. Заключение
Система требует рефакторинга для перехода от "Hardcoded Levels" к "Dynamic Level Loading". Необходимо внедрить циклическую загрузку ресурсов и динамическое формирование ключей на основе номера уровня.
