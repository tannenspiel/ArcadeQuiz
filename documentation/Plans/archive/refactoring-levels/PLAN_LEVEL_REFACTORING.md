# Refactoring Plan: Dynamic Level System
**Дата:** 2026-02-01
**Цель:** Обеспечить поддержку `N` уровней без изменения кода. Добавление уровня = добавление файлов + изменение 1 константы.

## 1. Архитектурные Изменения

### 1.0. Risk Mitigation Strategies (New!)
**Loader Integrity & Cache Sync:**
- Внедрение `loading_manifest.json` (опционально) или строгий `try/catch` при загрузке ассетов.
- Добавление `onLoadComplete` проверки целостности загруженных данных перед стартом сцены.

**Type Safety:**
- Сохранение объекта `KEYS` как "Source of Truth", но с добавлением динамического API.
- Использование TypeScript `template literal types` (если версия TS позволяет) или runtime-валидации ключей.

**Breaking Changes:**
- Поэтапный рефакторинг: Сначала внедрить новые динамические методы, отметить старые ключи как `@deprecated`, затем заменить использование.

### 1.1. Dynamic Asset Keys (GameConstants.ts)

### 1.1. Dynamic Asset Keys (GameConstants.ts)
Вместо явного перечисления ключей для каждого уровня (`MAP_BG_STANDARD_L1`, `L2`...), ввести утилиту или конвенцию генерации ключей.
**Proposed Change:**
- Удалить hardcoded ключи из `KEYS`.
- Написать утилиту `getLevelAssetKey(level: number, type: string): string`.
  - Пример: `getMapBgKey(3)` -> `'map_bg_standard_l3'`

### 1.2. LoadingScene Loop
Рефакторинг `LoadingScene.ts` для циклической загрузки ресурсов.
**Реализовано:**
```typescript
// В startLoading() - циклическая загрузка изображений
for (let i = 1; i <= MAX_LEVELS; i++) {
    // 1. Load Backgrounds
    this.load.image(LevelAssetKeys.getMapBgStandard(i), ...);
    this.load.image(LevelAssetKeys.getMapBgTiledBase(i), ...);
    // Configs загружаются через dynamic import (ниже)
}

// В load.once('complete') - загрузка конфигов через dynamic import
await this.loadLevelConfigs();

private async loadLevelConfigs(): Promise<void> {
    for (let i = 1; i <= MAX_LEVELS; i++) {
        // Dynamic import работает в Vite для файлов в src/
        const configModule = await import(`../../config/levelConfigs/level${i}.config.json`);
        const configData = configModule.default || configModule;
        this.cache.json.add(LevelAssetKeys.getLevelConfig(i), configData);
    }
}
```
**Примечание:** Используется `dynamic import()` вместо `this.load.json()`, так как Vite не обслуживает файлы из `src/` через HTTP.

### 1.3. Dynamic LevelManager
Рефакторинг `LevelManager.ts` для отказа от статических импортов.
**Логика:**
- Удалить `import level1Config ...`.
- В `loadLevelConfig(levelNumber)`:
  1. Проверить, есть ли JSON в кеше Phaser (`this.scene.cache.json.get(...)`).
  2. Если нет — попытаться загрузить (если сцена работает) или использовать Fallback.
  3. Вернуть конфиг.

### 1.4. WorldFactory Logic
Обновление `WorldFactory.ts` для использования динамических ключей.
**Логика:**
- Вместо `level === 1 ? KEY_1 : KEY_2` использовать `getMapBgKey(currentLevel)`.

## 2. План Реализации

### Шаг 1: Подготовка (`gameConstants.ts`)
- [ ] Добавить helper-функции для генерации ключей ассетов.
- [ ] Обновить `KEYS`, удалив специфичные для уровней поля (или оставив их как deprecated).

### Шаг 2: Загрузчик (`LoadingScene.ts`)
- [ ] Внедрить цикл `for (1..MAX_LEVELS)` в `preload()`.
- [ ] Добавить загрузку `levelN.config.json` как JSON-ассетов Phaser.

### Шаг 3: Менеджер Уровней (`LevelManager.ts`)
- [ ] Удалить статические импорты конфигов.
- [ ] Переписать `loadLevelConfig` на получение данных из `Phaser.Cache`.
- [ ] **Validation:** Добавить проверку структуры JSON (валидация схемы) при получении конфига. Если обязательные поля (например, `spawnInterval`) отсутствуют — использовать дефолтные значения и логировать предупреждение.

### Шаг 4: Фабрика Мира (`WorldFactory.ts`)
- [ ] Заменить тернарные операторы выбора ассетов на динамические ключи.

### Шаг 5: Переходы (`LevelTransitionHandler.ts`)
- [ ] Удалить дубликат `MAX_LEVELS`.
- [ ] Импортировать `MAX_LEVELS` из `gameConstants`.

## 3. Ожидаемый Результат
Для добавления Level 3 нужно будет только:
1. Создать `src/config/levelConfigs/level3.config.json`.
2. Создать ассеты (картинки, json карты) с правильным неймингом (L3).
3. Изменить `MAX_LEVELS = 3` в `gameConstants.ts`.
4. (Опционально) Если мы сделаем авто-детект количества уровней через манифест, то пункт 3 тоже уйдет. Но пока оставим `MAX_LEVELS`.
