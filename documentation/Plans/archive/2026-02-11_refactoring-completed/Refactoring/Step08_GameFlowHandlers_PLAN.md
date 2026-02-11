# План рефакторинга: Шаг 8 - GameFlowHandlers

**Родительский план:** [Refactoring_MASTER_PLAN.md](./Refactoring_MASTER_PLAN.md)
**Статус:** IN PROGRESS
**Дата начала:** 2026-01-19
**Цель:** Вынести логику Game Over, переходов между уровнями и управление EventBus из MainScene в специализированные обработчики

---

## Контекст

В данный момент `MainScene.ts` содержит множество методов для управления игровым потоком:

**Game Over (~260 строк):**
- `handleGameOver()` (4223-4284) - обработка win/lose
- `restartGame()` (4286-4481) - перезапуск сцены с полной очисткой (~196 строк!)
- `handleGameWin()` (4516-4524) - победа в игре
- `handleFullGameRestart()` (4526-4532) - полный рестарт

**Level Transition (~33 строки):**
- `handleNextLevel()` (4482-4514) - переход на следующий уровень

**EventBus (~350 строк):**
- `setupEventListeners()` (680-695) - настройка слушателей окна (resize, orientation)
- `setupEventBus()` (1905-2030) - настройка EventBus подписчиков
- Handler свойства (1860-1899) - arrow functions для EventBus

**Затронутые файлы:**
- `src/game/scenes/MainScene.ts` (основной файл для рефакторинга)
- Создаётся новая папка `src/game/scenes/gameflow/`

---

## Создаваемые компоненты

### 1. `src/game/scenes/gameflow/GameOverHandler.ts`

**Назначение:** Управление состоянием Game Over (победа/поражение)

**Выносимые методы:**
- `handleGameOver(result: 'win' | 'lose')` → публичный метод
- `restartGame()` → публичный метод
- `handleGameWin(score, feedbackText)` → публичный метод
- `handleFullGameRestart()` → публичный метод

**Зависимости:**
```typescript
interface GameOverDependencies {
    scene: Phaser.Scene;
    player: Player;
    audioManager: AudioManager;
    physics: Phaser.Physics.Arcade.ArcadePhysics;
    input: Phaser.Input.InputPlugin;
    time: Phaser.Time.Clock;
    game: Phaser.Game;
    scale: Phaser.Scale.Manager;
    levelManager: LevelManager;
    scoreSystem: ScoreSystem;
    healthSystem: HealthSystem;
    gameState: GameState;
    uiManager: UIManager;
    quizManager: QuizManager;
    // Объекты для очистки
    grassBackground?: Phaser.GameObjects.TileSprite;
    bushCollisionObjects?: Phaser.Physics.Arcade.StaticGroup;
    debugOverlay?: DebugOverlay;
    enemies: Phaser.Physics.Arcade.Group;
    chasers: Phaser.Physics.Arcade.Group;
    hearts: Phaser.Physics.Arcade.Group;
    keys: Phaser.Physics.Arcade.Group;
    portals: Phaser.Physics.Arcade.Group;
    oracle: Oracle;
}

interface GameOverCallbacks {
    destroyGrassBackground: () => void;
    destroyBushCollisionObjects: () => void;
    destroyDebugOverlay: () => void;
    destroyEnemyInstances: () => void;
    destroyPortalInstances: () => void;
    resetOracle: () => void;
    resetOracleLabel: () => void;
    resumePhysics: () => void;
    resumeScene: () => void;
    enableInput: () => void;
    showGameWinModal: (score: number, feedbackText: string, onRestart: () => void) => void;
}
```

**Особенности:**
- `restartGame()` очень длинный (~196 строк) - содержит полную очистку всех объектов
- Нужно аккуратно перенести всю логику очистки (floatingTextPool, enemyInstances, portalInstances, таймеры)
- Обработать MAX_LEVELS проверку в handleGameOver

---

### 2. `src/game/scenes/gameflow/LevelTransitionHandler.ts`

**Назначение:** Управление переходом между уровнями

**Выносимые методы:**
- `handleNextLevel()` → публичный метод

**Зависимости:**
```typescript
interface LevelTransitionDependencies {
    scene: Phaser.Scene;
    levelManager: LevelManager;
    scoreSystem: ScoreSystem;
    registry: Phaser.Data.Registry;
}

interface LevelTransitionCallbacks {
    restartGame: () => void;
    handleGameWin: (score: number, feedbackText: string) => void;
}
```

**Особенности:**
- Проверяет MAX_LEVELS для определения конца игры
- Сохраняет score в registry перед переходом
- Вызывает restartGame() или handleGameWin() через callbacks

---

### 3. `src/game/scenes/gameflow/EventBusManager.ts`

**Назначение:** Управление EventBus и слушателями событий

**Выносимые методы:**
- `setupEventListeners()` → публичный метод
- `setupEventBus()` → публичный метод
- Все handler свойства (onPortalEnterConfirmedHandler, onKeyQuizCompletedHandler, и т.д.) → приватные свойства

**Зависимости:**
```typescript
interface EventBusManagerDependencies {
    scene: Phaser.Scene;
    events: Phaser.Events.EventEmitter;
    scale: Phaser.Scale.Manager;
    levelManager: LevelManager;
    // Объекты для очистки
    resizeTimeout?: NodeJS.Timeout;
    playerFlashLoseKeyInterval?: Phaser.Time.TimerEvent;
    playerFlashGetKeyInterval?: Phaser.Time.TimerEvent;
    playerFlashGetKeyPositionTimer?: Phaser.Time.TimerEvent;
    playerFlashGetKeySprites?: Phaser.GameObjects.Sprite[];
    floatingTextPool?: Phaser.GameObjects.Text[];
}

interface EventBusManagerCallbacks {
    onPortalEnterConfirmed: (data: { portal: AbstractPortal }) => void;
    onPortalEnterCancelled: () => void;
    onKeyQuizCompleted: (data: { result: 'correct' | 'wrong' | 'closed', damage?: number }) => void;
    onRestartGame: () => void;
    onNextLevel: () => void;
    onQuizCompleted: (data: { correct: boolean, context: string }) => void;
    onViewportUpdate: ({ realWidth, realHeight }: { realWidth: number; realHeight: number }) => void;
    handleWindowResize: () => void;
    handleOrientationChange: () => void;
    handlePhaserResize: (gameSize: Phaser.Structs.Size) => void;
    resumeGame: () => void;
    updateDebugOverlay: () => void;
    createExtendedBackground: () => void;
}
```

**Особенности:**
- Обработчики являются arrow function свойствами класса для сохранения контекста
- cleanup логика в `shutdown` и `destroy` событиях
- Важно: removeEventListener не работает корректно с bind(this) - нужен хранить bound функции

---

## План действий

### 1. Подготовка
- [ ] Создать папку `src/game/scenes/gameflow/`
- [ ] Создать barrel export `index.ts`

### 2. EventBusManager (сначала, т.к. от него зависят другие)
- [ ] Создать `EventBusManager.ts`
- [ ] Перенести все handler свойства (arrow functions)
- [ ] Перенести `setupEventListeners()` логику
- [ ] Перенести `setupEventBus()` логику с cleanup
- [ ] Интегрировать в MainScene

### 3. GameOverHandler
- [ ] Создать `GameOverHandler.ts`
- [ ] Перенести `handleGameOver()` логику
- [ ] Перенести `restartGame()` логику (самый длинный метод!)
- [ ] Перенести `handleGameWin()` логику
- [ ] Перенести `handleFullGameRestart()` логику
- [ ] Интегрировать в MainScene

### 4. LevelTransitionHandler
- [ ] Создать `LevelTransitionHandler.ts`
- [ ] Перенести `handleNextLevel()` логику
- [ ] Интегрировать в MainScene

### 5. Интеграция в MainScene
- [ ] Инициализировать обработчики в `create()` или `initializeSystems()`
- [ ] Заменить методы на thin delegates
- [ ] Удалить старые реализации
- [ ] Удалить старые свойства (resizeTimeout, handler функции)

### 6. Верификация
- [ ] Билд успешен
- [ ] Игра запускается без ошибок
- [ ] Game Over работает (победа/поражение)
- [ ] Кнопка RESTART GAME возвращает на 1 уровень
- [ ] Кнопка NEXT LEVEL переходит на следующий уровень
- [ ] Переход на уровень 2 работает корректно
- [ ] Полная победа (после уровня 2) показывает Game Win экран

---

## Ожидаемый результат

**Уменьшение MainScene:** ~350-400 строк вынесено

**Новые файлы:**
- `GameOverHandler.ts` (~300 строк)
- `LevelTransitionHandler.ts` (~60 строк)
- `EventBusManager.ts` (~200 строк)
- `index.ts` (barrel export)

**Delegates в MainScene:**
```typescript
// Game Over
handleGameOver(result: 'win' | 'lose') {
    this.gameOverHandler?.handle(result);
}

restartGame() {
    this.gameOverHandler?.restart();
}

// Level Transition
async handleNextLevel() {
    await this.levelTransitionHandler?.handleNext();
}

// EventBus управляется через EventBusManager
```

---

## Примечания

- **Порядок важен:** EventBusManager должен быть создан первым, т.к. его handlers используются в callbacks
- **restartGame() очень длинный** - содержит полную очистку всех объектов игры, нужно быть очень внимательным
- **MAX_LEVELS** - константа из constants/gameConstants.ts
- **Registry persistence** - score и currentLevel сохраняются в registry между уровнями
- **Cleanup** - многие объекты требуют безопасной очистки с try-catch

---

**Критерии завершения:**
- [ ] Все 3 handler класса созданы
- [ ] MainScene уменьшен на ~350-400 строк
- [ ] Билд успешен
- [ ] Game Over/Win работает корректно
- [ ] Переходы между уровнями работают
- [ ] Cleanup не оставляет утечек памяти
