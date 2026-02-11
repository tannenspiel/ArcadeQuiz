# Руководство по разработке проекта ArcadeQuiz

**Версия:** 1.1  
**Дата создания:** 2025-01-26  
**Дата последнего обновления:** 2025-01-27  
**Статус:** Актуален

---

## Краткое описание

Руководство по разработке проекта ArcadeQuiz, включая настройку окружения, работу с кодом, взаимодействие React-Phaser через EventBus и лучшие практики.

---

## Содержание

1. [Настройка окружения разработки](#настройка-окружения-разработки)
2. [Структура проекта](#структура-проекта)
3. [Взаимодействие React-Phaser](#взаимодействие-react-phaser)
4. [Работа с EventBus](#работа-с-eventbus)
5. [Добавление новых компонентов](#добавление-новых-компонентов)
6. [Отладка](#отладка)
7. [Лучшие практики](#лучшие-практики)

---

## Настройка окружения разработки

### Рекомендуемые инструменты:

- **VS Code** — редактор кода
- **Расширения VS Code:**
  - ESLint
  - Prettier
  - TypeScript и JavaScript Language Features
  - Phaser 3 Snippets (опционально)

### Настройка VS Code:

Создайте `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Структура проекта

### Основные папки:

```
src/
├── game/          # Phaser игровая логика
│   ├── core/      # Ядро (AssetLoader, LevelManager, GameState)
│   ├── entities/  # Сущности (Player, Enemies, Portals)
│   ├── systems/   # Системы (Health, Score, Quiz, Spawn, Collision, Audio)
│   ├── scenes/    # Сцены (BaseScene, LoadingScene, MainScene)
│   └── ui/        # UI элементы Phaser (Button, Modals)
├── react/         # React компоненты
│   ├── components/ # UI компоненты (UIOverlay, Modals)
│   ├── App.tsx    # Главный компонент
│   └── PhaserGame.tsx # Обертка Phaser
├── config/        # Конфигурация
├── types/         # TypeScript типы
├── constants/     # Константы
├── assets/        # Ресурсы игры
└── vite-env.d.ts  # Типы для Vite environment variables
```

---

## Взаимодействие React-Phaser

### Архитектура коммуникации:

```
React Components
    ↕ EventBus
Phaser Scenes
```

### Правильная последовательность:

1. **React** рендерит `PhaserGame` компонент
2. **Phaser** инициализируется и подписывается на EventBus
3. **Игровые события** → EventBus → React состояние
4. **UI действия** → EventBus → Phaser логика

### Пример инициализации:

```typescript
// src/react/PhaserGame.tsx
const PhaserGame = forwardRef<Phaser.Game | null, {}>((props, ref) => {
  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      scene: [LoadingScene, MainScene],
      // ...
    };
    
    const game = new Phaser.Game(config);
    if (ref && 'current' in ref) {
      ref.current = game;
    }
    
    return () => {
      game.destroy(true);
    };
  }, [ref]);
  
  return <div id="phaser-game" />;
});
```

---

## Работа с EventBus

### Импорт EventBus:

```typescript
import { EventBus } from '../game/EventBus';
```

### Отправка событий (Phaser → React):

```typescript
// В Phaser сцене
EventBus.emit('update-hud', {
  health: this.gameState.getHealth(),
  runes: this.gameState.getKeys(), // ключи (параметр события называется runes для обратной совместимости)
  altarActive: this.isAltarActivated
});
```

### Подписка на события (React):

```typescript
// В React компоненте
useEffect(() => {
  const handleUpdateHUD = (data: { health: number; runes: number; altarActive: boolean }) => {
    setHealth(data.health);
    setRunes(data.runes);
    setAltarActive(data.altarActive);
  };
  
  EventBus.on('update-hud', handleUpdateHUD);
  
  return () => {
    EventBus.off('update-hud', handleUpdateHUD);
  };
}, []);
```

### Типизация событий:

Всегда типизируйте данные событий:

```typescript
// Создайте типы для событий
interface UpdateHUDEvent {
  health: number;
  runes: number;
  altarActive: boolean;
}

EventBus.emit('update-hud', data as UpdateHUDEvent);
```

---

## Добавление новых компонентов

### Добавление новой системы:

1. Создайте файл в `src/game/systems/YourSystem.ts`
2. Реализуйте класс системы
3. Инициализируйте в `BaseScene` или `MainScene`
4. Обновите `ProjectMap.md`

**Пример:**

```typescript
// src/game/systems/YourSystem.ts
export class YourSystem {
  constructor(private scene: Phaser.Scene) {}
  
  public init(): void {
    // Инициализация
  }
  
  public update(): void {
    // Обновление
  }
}
```

### Добавление нового типа врага:

1. Создайте класс, наследующий `AbstractEnemy`
2. Реализуйте метод `updateAI()`
3. Добавьте в `SpawnSystem`
4. Обновите типы в `src/types/enemyTypes.ts`

**Пример:**

```typescript
// src/game/entities/enemies/YourEnemy.ts
export class YourEnemy extends AbstractEnemy {
  protected updateAI(player: Player): void {
    // Ваша логика AI
  }
}
```

### Работа со звуками:

**Важно:** Звук `damage` воспроизводится только при столкновении с врагами на карте. Не используйте `playDamage()` в модальных окнах (ключи, порталы) - урон наносится, но звук должен быть только при физическом столкновении.

**Добавление нового звука:**

1. Добавьте ключ в `SOUND_KEYS` в `src/constants/gameConstants.ts`
2. Добавьте громкость в `SOUND_VOLUMES` в `src/constants/gameConstants.ts`
3. Загрузите звук в `AudioManager.loadAllSounds()`
4. Создайте метод `playYourSound()` в `AudioManager`

### Создание уровней (Tiled Map):

1. **Инструмент:** Tiled Map Editor (экспорт в JSON).
2. **Слои:**
   - `Collision Mask` (Tile Layer): тайлы коллизий.
   - `Overlap Mask` (Tile Layer, GID 12): зеленые тайлы для "сенсорных" зон (входы в порталы).
   - `InteractiveObjects` (Object Layer): объекты `Portal` и `Oracle`.
3. **Подключение:**
   - Сохраните JSON в `src/assets/{THEME}/...`
   - В конфиге уровня (`level1.config.json`): `"useTiledMap": true`, `"tiledMapKey": "your_map_json"`.
4. **Коллизии:** Используйте `COLLISION_CONFIG.TILED_SENSOR_EXPANSION` для настройки чувствительности сенсоров.

---

## Отладка

### Включение debug режима:

```typescript
// В MainScene
this.physics.world.createDebugGraphic();
```

### Логирование EventBus:

```typescript
// Добавьте логирование всех событий
EventBus.on('*', (event: string, ...args: any[]) => {
  console.log(`[EventBus] ${event}`, args);
});
```

### React DevTools:

- Установите расширение React DevTools для браузера
- Используйте для отладки состояния React компонентов

### Phaser Debug:

- Используйте `this.add.text()` для отображения debug информации
- Включите `debug: true` в physics конфигурации

---

## Лучшие практики

### 1. Разделение ответственности

- **Phaser** — игровая логика, физика, рендеринг
- **React** — UI, модальные окна, HUD
- **EventBus** — коммуникация между слоями

### 2. Управление состоянием

- Используйте `GameState` для глобального состояния игры
- Используйте React state для UI состояния
- Синхронизируйте через EventBus

### 3. Производительность

- Минимизируйте перерендеры React компонентов
- Используйте `useMemo` и `useCallback` где необходимо
- Оптимизируйте физические расчеты в Phaser
- Используйте группы для управления множеством объектов

### 4. Типизация

- Всегда типизируйте данные EventBus
- Используйте enum для константных значений
- Проверяйте наличие свойств через optional chaining
- Для работы с переменными окружения Vite используйте `import.meta.env` (типы определены в `src/vite-env.d.ts`)

### 5. Обработка ошибок

```typescript
try {
  // Код
} catch (error) {
  console.error('Error:', error);
  // Обработка ошибки
}
```

---

## Связанные документы

- [BUILD.md](BUILD.md) — инструкции по сборке
- [DEBUGGING.md](DEBUGGING.md) — отладка и диагностики
- [ARCHITECTURE.md](../project/ARCHITECTURE.md) — архитектура проекта

---

## История изменений

| Дата | Версия | Изменения | Автор |
|------|--------|-----------|-------|
| 2025-01-26 | 1.0 | Создание документа | AI Assistant |
| 2025-01-27 | 1.1 | Добавлено упоминание о `vite-env.d.ts` для типизации переменных окружения | AI Assistant |
| 2025-01-27 | 1.1 | Добавлена информация об ограничениях на звук `damage` - только при столкновении с врагами | AI Assistant |

---

**Последнее обновление:** 2025-01-27




