# 2026-01-29: Coin Mechanic - Implementation Plan (v3 - Technical Audit)

**Status:** PENDING
**Branch:** `feature/coin-mechanic` (to be created)
**Priority:** HIGH

**Revision Notes:**
- v1: Initial plan (19 steps)
- v2: COIN BUBBLE QUIZ - Добавлена механика "коин-бабблов" (26 шагов)
- v3: **TECHNICAL AUDIT** - +2 шага mitigation, критические риски решены (28 шагов)

---

## Context

Новая механика игры: двухэтапная система сбора айтемов.

**Этап 1 (Coin Phase):**
- На поле спавнятся монетки (Coin_192x16.png, 12 кадров 16x16)
- При сборе монетки появляется **коин-квиз с бабблами** (без модального окна!)
- Две кнопки-баббла с утверждениями (одно верное, одно неверное)
- Правильный ответ → +очки, +монетка
- Неправильный ответ → -жизнь, без монетки
- Игрок несёт монетки Оракулу
- После передачи 3 монеток Оракулу → переход к этапу 2

**Этап 2 (Key Phase):**
- Все монетки исчезают (анимация смерти)
- На поле начинают спавниться ключи (Key_64x16.png)
- При сборе ключа появляется **модальное окно** (как и раньше)
- Ключи заносятся в порталы (не Оракулу!)

---

## Affected Files/Modules

**Новые файлы:**
- `src/game/entities/items/AbstractItem.ts`
- `src/game/entities/items/Coin.ts`
- `src/game/entities/items/Key.ts`
- `src/game/entities/items/Heart.ts`
- `src/game/entities/items/index.ts`
- `src/game/scenes/animation/CoinAnimationSync.ts`
- `src/game/ui/CoinBubbleQuiz.ts` ⚠️ **НОВОЕ** - UI для коин-квиза (бабблы без модального окна)
- `src/game/scenes/quiz/CoinQuizHandler.ts` ⚠️ **НОВОЕ** - Логика обработки ответов монеток
- `public/assets/data/coin-quiz.json` ⚠️ **НОВОЕ** - Утверждения для коин-квиза

**Модификация:**
- `src/config/spritesheetConfigs.ts` - добавить UI.CoinBubble_30x30 и Coin
- `src/constants/gameConstants.ts` - добавить GamePhase, ItemType, ACTOR_SIZES.COIN, **NEW EVENTS**
- `src/types/levelTypes.ts` - добавить coins в ItemSpawnConfig
- `src/config/levelConfigs/level1.config.json` - секция coins
- `src/config/levelConfigs/level2.config.json` - секция coins
- `src/game/core/LevelManager.ts` - дефолтные значения для coins
- `src/game/core/GameState.ts` - добавить метод getGamePhase(), coins, **isQuizActive**
- `src/game/entities/Oracle.ts` - логика приёма монеток
- `src/game/scenes/collision/OracleCollisionHandler.ts` - обработка передачи монеток
- `src/game/scenes/collision/PortalCollisionHandler.ts` - только для Key Phase
- `src/game/scenes/collision/ItemCollisionHandler.ts` - ⚠️ **РЕФАКТОРИНГ**: разные квизы для Coin/Key
- `src/game/systems/SpawnSystem.ts` - спавн монеток или ключей + coinsGroup
- `src/game/scenes/MainScene.ts` - coinsGroup, CoinAnimationSync, CoinBubbleQuiz регистрация
- `src/game/scenes/ui/HUDManager.ts` - отображение "Монеток: X/3" или "Ключей: X"
- `src/game/ui/UIManager.ts` - ⚠️ **НОВОЕ** - добавить handleShowCoinQuiz

---

## Critical Risks (All Mitigated)

### Риск 1: "Застывшие" монетки (AnimationSyncManager)
**Проблема:** Physics спрайты требуют ручного `syncFrame()` через AnimationSyncManager
**Решение:** Создать `CoinAnimationSync` по аналогии с `KeyAnimationSync`
**Status:** ✅ Mitigated in Step 1.4

### Риск 2: Утечка ячеек в SpawnMatrix
**Проблема:** При `destroy()` ячейки не освобождаются автоматически
**Решение:** `AbstractItem` должен вызывать `spawnMatrix.freeRect()` в `playDeathAnimation()`
**Status:** ✅ Mitigated in Step 1.1

### Риск 3: ItemCollisionHandler логика
**Проблема:** Монетки и ключи функционально идентичны, но идут к разным получателям
**Решение:** Проверять `gameState.getGamePhase()` для определения типа квиза
**Status:** ✅ Mitigated in Step 5.2

### Риск 4: LevelManager не знает про монетки
**Проблема:** `ItemSpawnConfig` не имеет поля `coins`, SpawnSystem получит `undefined`
**Решение:** Расширить `ItemSpawnConfig` и добавить дефолтные значения
**Status:** ✅ Mitigated in Step 1.6

### Риск 5: ItemCollisionHandler перегружен
**Проблема:** Метод `handleKey` уже ~150 строк, добавление фазовой логики сделает его нечитаемым
**Решение:** Вынести общую логику (запуск квиза, пауза физики) в приватный метод
**Status:** ✅ Mitigated in Step 5.2

### Риск 6: Анимация смерти не центрирована
**Проблема:** Монетка 16x16, enemy_death 32x32 - взрыв будет смещён
**Решение:** Центрировать спрайт взрыва относительно 16-пиксельной монетки
**Status:** ✅ Mitigated in Step 2.1

### Риск 7: CoinBubbleQuiz UI позиционирование ⚠️ AUDITED
**Проблема:** Бабблы должны быть в Screen Space, а не в мировых координатах
**Решение:** Использовать `setScrollFactor(0)` для всех UI элементов бабблов
**Status:** ✅ Mitigated in Step 3.2

### Риск 8: UIManager не знает про CoinBubbleQuiz ⚠️ AUDITED (NEW)
**Проблема:** Конфликт между KeyQuestionModal и CoinBubbleQuiz
**Решение:** Расширить UIManager с handleShowCoinQuiz + currentCoinBubbleQuiz
**Status:** ✅ Mitigated in Step 3.4 (НОВЫЙ)

### Риск 9: Конфликт состояния квиза ⚠️ AUDITED (NEW)
**Проблема:** Только один квиз может быть активен одновременно
**Решение:** Добавить `isQuizActive` и `quizType` в GameState
**Status:** ✅ Mitigated in Step 5.5 (НОВЫЙ)

### Риск 10: Destruction Order ⚠️ AUDITED (NEW)
**Проблема:** CoinBubbleQuiz не включён в UIManager.destroy()
**Решение:** Добавить cleanup в UIManager.destroy()
**Status:** ✅ Mitigated in Step 3.4

---

## Step-by-Step Plan (FINAL - v3)

### Phase 1: Architecture Foundation (6 steps)

#### Step 1.1: Create AbstractItem with SpawnMatrix integration
**File:** `src/game/entities/items/AbstractItem.ts`

**Задачи:**
- Создать абстрактный базовый класс для всех айтемов
- ⚠️ **КРИТИЧНО:** Автоматическое взаимодействие со SpawnMatrix
- Общие свойства: sprite, scene, itemType, spawnMatrix, cellPosition
- Абстрактные методы: `onCollect()`, `playDeathAnimation()`
- Базовые методы: `spawn()`, `destroy()` с вызовом `freePositionMatrix`

**Acceptance Criteria:**
- [ ] AbstractItem.ts создан
- [ ] SpawnMatrix.freeRect() вызывается автоматически
- [ ] Нет риска утечки ячеек

---

#### Step 1.2: Add game constants
**File:** `src/constants/gameConstants.ts`

**Задачи:**
- Добавить enum `GamePhase`:
  ```typescript
  export enum GamePhase {
    COIN = 'coin',      // Сбор монеток для Оракула
    KEY = 'key'         // Сбор ключей для порталов
  }
  ```
- Добавить enum `ItemType`:
  ```typescript
  export enum ItemType {
    COIN = 'coin',
    KEY = 'key',
    HEART = 'heart'
  }
  ```
- Добавить `ACTOR_SIZES.COIN = 1.0`
- ⚠️ **НОВОЕ:** Добавить новые EVENTS:
  ```typescript
  SHOW_COIN_QUIZ: 'show_coin_quiz',
  COIN_QUIZ_COMPLETED: 'coin_quiz_completed',
  ```
- ⚠️ **НОВОЕ:** Добавить новый звук:
  ```typescript
  PICKUP_COIN: 'pickup_coin',  // Аналогично PICKUP_KEY
  ```

**Acceptance Criteria:**
- [ ] GamePhase enum добавлен
- [ ] ItemType enum добавлен
- [ ] ACTOR_SIZES.COIN добавлен
- [ ] SHOW_COIN_QUIZ event добавлен
- [ ] COIN_QUIZ_COMPLETED event добавлен
- [ ] PICKUP_COIN sound добавлен

---

#### Step 1.3: Add Coin spritesheet config
**File:** `src/config/spritesheetConfigs.ts`

**Задачи:**
- Добавить конфигурацию для `Coin_192x16.png`:
  ```typescript
  {
    load: {
      key: 'coin_sheet',
      path: 'Coin_192x16.png',
      frameWidth: 16,
      frameHeight: 16,
      layout: SpritesheetLayout.HORIZONTAL,
      frameCount: 12
    },
    animations: [
      {
        key: 'coin_idle',
        frames: [0,1,2,3,4,5,6,7,8,9,10,11],
        frameRate: 8,
        repeat: -1
      }
    ]
  }
  ```

**Acceptance Criteria:**
- [ ] Конфигурация coin_sheet добавлена
- [ ] Анимация coin_idle создана

---

#### Step 1.4: Create CoinAnimationSync
**File:** `src/game/scenes/animation/CoinAnimationSync.ts`

**Задачи:**
- Создать класс по аналогии с `KeyAnimationSync`
- Реализовать интерфейс `AnimationSyncer`
- Синхронизировать анимации всех монеток в `coinsGroup`

**Acceptance Criteria:**
- [ ] CoinAnimationSync создан
- [ ] Реализует AnimationSyncer
- [ ] Синхронизирует монетки

---

#### Step 1.5: Extend LevelConfig for coins
**Files:**
- `src/types/levelTypes.ts`
- `src/game/core/LevelManager.ts`
- `src/config/levelConfigs/level1.config.json`
- `src/config/levelConfigs/level2.config.json`

**Задачи:**
1. Обновить `ItemSpawnConfig` в `levelTypes.ts` - добавить поле `coins`
2. Обновить `getDefaultLevelConfig` в `LevelManager.ts` - добавить дефолтные значения
3. Обновить JSON конфиги уровней

**Acceptance Criteria:**
- [ ] ItemSpawnConfig имеет поле coins
- [ ] getDefaultLevelConfig возвращает дефолтные значения для coins
- [ ] level1.config.json обновлён
- [ ] level2.config.json обновлён

---

#### Step 1.6: Add UI.CoinBubble spritesheet config
**File:** `src/config/spritesheetConfigs.ts`

**Задачи:**
- Добавить конфигурацию для `UI.CoinBubble_30x30.png` (9-sliced):
  ```typescript
  {
    load: {
      key: 'ui_coin_bubble',
      path: 'UI.CoinBubble_30x30.png',
      frameWidth: 10,  // 30 / 3 = 10
      frameHeight: 10, // 30 / 3 = 10
      layout: SpritesheetLayout.GRID,
      rows: 3,
      cols: 3
    },
    animations: [] // Статические кадры для 9-slice кнопок
  }
  ```

**Acceptance Criteria:**
- [ ] Конфигурация ui_coin_bubble добавлена
- [ ] 9-slice слайсы 10x10 правильно настроены

---

### Phase 2: Item Classes Implementation (4 steps)

#### Step 2.1: Create Coin class with centered death animation
**File:** `src/game/entities/items/Coin.ts`

**Задачи:**
- Наследовать от AbstractItem
- Использовать spritesheet 'coin_sheet'
- Реализовать `onCollect()`: добавить монетку в GameState
- Реализовать `playDeathAnimation()` с ⚠️ **ЦЕНТРИРОВАНИЕМ**

**Acceptance Criteria:**
- [ ] Coin класс создан
- [ ] onCollect() реализован
- [ ] playDeathAnimation() с центрированием
- [ ] Взрыв визуально центрирован по монетке

---

#### Step 2.2: Create Key class
**File:** `src/game/entities/items/Key.ts`

**Acceptance Criteria:**
- [ ] Key класс создан
- [ ] Логика сбора реализована

---

#### Step 2.3: Create Heart class
**File:** `src/game/entities/items/Heart.ts`

**Acceptance Criteria:**
- [ ] Heart класс создан
- [ ] Логика сбора реализована

---

#### Step 2.4: Create items index
**File:** `src/game/entities/items/index.ts`

**Acceptance Criteria:**
- [ ] Все классы экспортируются
- [ ] Factory функция создана

---

### Phase 3: Quiz Data & UI (4 steps) ⚠️ БЫЛО 3, +Step 3.4

#### Step 3.1: Create coin-quiz.json with statements
**File:** `public/assets/data/coin-quiz.json`

**Задачи:**
- Создать JSON с утверждениями (верные/неверные)
- Структура:
  ```json
  {
    "true": [
      { "text": "2 + 2 = 4" },
      { "text": "Земля вращается вокруг Солнца" }
    ],
    "false": [
      { "text": "Пингвины живут в Арктике" },
      { "text": "Луна сделана из сыра" }
    ]
  }
  ```

**Acceptance Criteria:**
- [ ] coin-quiz.json создан
- [ ] Минимум 20 верных утверждений
- [ ] Минимум 20 неверных утверждений

---

#### Step 3.2: Create CoinBubbleQuiz class
**File:** `src/game/ui/CoinBubbleQuiz.ts`

**Задачи:**
- Создать класс по аналогии с `KeyQuestionModal`, но **без модального окна**
- Две кнопки-баббла (одна над другой)
- Размеры кнопок как в модальных окнах
- Расчёт размеров через game.scale.width/height
- Текст утверждений из coin-quiz.json
- Логика выбора: рандомно одно верное + одно неверное
- ⚠️ **КРИТИЧНО:** Использовать `setScrollFactor(0)` для всех UI элементов

**Ключевой код:**
```typescript
export class CoinBubbleQuiz {
  private bubble1: Button;
  private bubble2: Button;
  private correctBubbleIndex: number;

  constructor(scene: MainScene, coinSprite: Phaser.Physics.Arcade.Sprite) {
    // Позиционирование по центру экрана
    // ⚠️ КРИТИЧНО: setScrollFactor(0) для Screen Space
  }

  private async loadStatements(): Promise<{true: string, false: string}> {
    // Загрузка из coin-quiz.json
    // Рандомный выбор одного верного + одного неверного
  }

  private createUI(): void {
    // ⚠️ КРИТИЧНО:
    this.bubble1.setScrollFactor(0);  // Screen Space!
    this.bubble2.setScrollFactor(0);  // Screen Space!
  }
}
```

**Acceptance Criteria:**
- [ ] CoinBubbleQuiz создан
- [ ] 2 кнопки-баббла отображаются
- [ ] Размеры как у кнопок модальных окон
- [ ] Рандомный выбор утверждений работает
- [ ] ⚠️ setScrollFactor(0) применён ко всем UI элементам

---

#### Step 3.3: Create CoinQuizHandler
**File:** `src/game/scenes/quiz/CoinQuizHandler.ts`

**Задачи:**
- Создать класс по аналогии с `KeyQuizHandler`
- Логика обработки правильного/неправильного ответа
- Правильно: +очки, +монетка, возврат к игре
- Неправильно: -жизнь, без монетки, возврат к игре

**Acceptance Criteria:**
- [ ] CoinQuizHandler создан
- [ ] handleCorrect() реализован
- [ ] handleWrong() реализован

---

#### Step 3.4: Extend UIManager for CoinBubbleQuiz ⚠️ НОВЫЙ (AUDITED)
**File:** `src/game/ui/UIManager.ts`

**Задачи:**
- Добавить `private currentCoinBubbleQuiz: CoinBubbleQuiz | null = null`
- Добавить обработчик события:
  ```typescript
  this.eventBus.on(EVENTS.SHOW_COIN_QUIZ, this.handleShowCoinQuiz, this);
  ```
- Создать метод `handleShowCoinQuiz`:
  ```typescript
  private handleShowCoinQuiz(data: { coinSprite: Phaser.Physics.Arcade.Sprite }): void {
    if (this.currentCoinBubbleQuiz) {
      this.currentCoinBubbleQuiz.destroy();
    }
    this.currentCoinBubbleQuiz = new CoinBubbleQuiz(this.scene, {
      coinSprite: data.coinSprite,
      onCorrect: () => this.eventBus.emit(EVENTS.COIN_QUIZ_COMPLETED, { result: 'correct' }),
      onWrong: () => this.eventBus.emit(EVENTS.COIN_QUIZ_COMPLETED, { result: 'wrong' })
    });
  }
  ```
- Обновить `destroy()` для очистки

**Acceptance Criteria:**
- [ ] currentCoinBubbleQuiz добавлен в UIManager
- [ ] handleShowCoinQuiz реализован
- [ ] SHOW_COIN_QUIZ listener добавлен
- [ ] destroy() включает cleanup для currentCoinBubbleQuiz

---

### Phase 4: Game State & Oracle Logic (3 steps)

#### Step 4.1: Extend GameState
**File:** `src/game/core/GameState.ts`

**Задачи:**
- Добавить `currentPhase: GamePhase`
- Добавить методы: `getGamePhase()`, `setGamePhase()`
- Добавить `coins: number`
- Добавить методы: `addCoin()`, `removeCoin()`, `getCoins()`
- ⚠️ **НОВОЕ:** Добавить защиту от одновременных квизов:
  ```typescript
  isQuizActive: boolean = false;
  quizType: 'coin' | 'key' | 'portal' | null = null;
  ```

**Acceptance Criteria:**
- [ ] GamePhase отслеживается
- [ ] Coins отслеживаются отдельно
- [ ] isQuizActive добавлен
- [ ] quizType добавлен

---

#### Step 4.2: Update Oracle for coins
**File:** `src/game/entities/Oracle.ts`

**Задачи:**
- В COIN Phase: принимать монетки через `depositItem()`
- При 3 монетках: вызывать `setGamePhase(GamePhase.KEY)`
- В KEY Phase: не принимать монетки

**Acceptance Criteria:**
- [ ] Oracle принимает монетки в COIN Phase
- [ ] Переход на KEY Phase при 3 монетках

---

#### Step 4.3: Update OracleCollisionHandler
**File:** `src/game/scenes/collision/OracleCollisionHandler.ts`

**Acceptance Criteria:**
- [ ] Правильная логика для каждой фазы

---

### Phase 5: Animation & Collision System (5 steps) ⚠️ БЫЛО 4, +Step 5.5

#### Step 5.1: Register CoinAnimationSync in MainScene
**File:** `src/game/scenes/MainScene.ts`

**Задачи:**
- Создать `coinsGroup: Phaser.Physics.Arcade.Group`
- Зарегистрировать `CoinAnimationSync` в `AnimationSyncManager`
- Передать `coinsGroup` в `SpawnSystem`

**Acceptance Criteria:**
- [ ] coinsGroup создан
- [ ] CoinAnimationSync зарегистрирован
- [ ] Монетки анимируются

---

#### Step 5.2: Refactor ItemCollisionHandler with phase check ⚠️ КРИТИЧНО
**File:** `src/game/scenes/collision/ItemCollisionHandler.ts`

**Задачи:**
- ⚠️ **РЕФАКТОРИНГ:** Вынести общую логику в приватный метод
- ⚠️ Проверять `gameState.getGamePhase()` в `handleKey()`
- В COIN Phase: запускать CoinBubbleQuiz
- В KEY Phase: запускать KeyQuestionModal
- ⚠️ **НОВОЕ:** Добавить защиту от одновременных квизов:
  ```typescript
  if ((this.scene as any).gameState.isQuizActive) return;
  (this.scene as any).gameState.isQuizActive = true;
  (this.scene as any).gameState.quizType = 'coin' | 'key';
  ```

**Ключевой код:**
```typescript
export class ItemCollisionHandler {
  async handleKey(item: Phaser.Physics.Arcade.Sprite): Promise<void> {
    const phase = (this.scene as any).gameState.getGamePhase();

    if (phase === GamePhase.COIN) {
      await this.collectCoin(item);
    } else if (phase === GamePhase.KEY) {
      await this.collectKey(item);
    }
  }

  private async collectCoin(item: Phaser.Physics.Arcade.Sprite): Promise<void> {
    // ⚠️ Защита от одновременных квизов
    const gameState = (this.scene as any).gameState;
    if (gameState.isQuizActive) return;

    gameState.isQuizActive = true;
    gameState.quizType = 'coin';

    try {
      // Пауза физики, запуск CoinBubbleQuiz
      const eventBus = (this.scene as any).uiManager.eventBus;
      eventBus.emit(EVENTS.SHOW_COIN_QUIZ, { coinSprite: item });
    } catch (e) {
      gameState.isQuizActive = false;
      gameState.quizType = null;
      throw e;
    }
  }

  private async collectKey(item: Phaser.Physics.Arcade.Sprite): Promise<void> {
    // Аналогичная защита для ключей
  }
}
```

**Acceptance Criteria:**
- [ ] Общая логика вынесена в приватные методы
- [ ] Проверка фазы реализована
- [ ] CoinBubbleQuiz запускается для монеток
- [ ] KeyQuestionModal запускается для ключей
- [ ] ⚠️ Защита isQuizActive реализована

---

#### Step 5.3: Update SpawnSystem with coinsGroup
**File:** `src/game/systems/SpawnSystem.ts`

**Acceptance Criteria:**
- [ ] coinsGroup добавлен в SpawnSystem
- [ ] itemConfig.coins доступен без ошибок
- [ ] Спавн по фазам работает

---

#### Step 5.4: Register CoinBubbleQuiz in MainScene
**File:** `src/game/scenes/MainScene.ts`

**Задачи:**
- Создать экземпляр `CoinBubbleQuiz`
- Интегрировать с `CoinQuizHandler`
- Добавить в destroy() для очистки

**Acceptance Criteria:**
- [ ] CoinBubbleQuiz зарегистрирован
- [ ] Корректно очищается при destroy

---

#### Step 5.5: Add Quiz State protection in GameState ⚠️ НОВЫЙ (AUDITED)
**File:** `src/game/core/GameState.ts`

**Задачи:**
- Добавить поля для защиты от одновременных квизов:
  ```typescript
  isQuizActive: boolean = false;
  quizType: 'coin' | 'key' | 'portal' | null = null;
  ```
- Добавить методы для управления состоянием квиза:
  ```typescript
  startQuiz(type: 'coin' | 'key' | 'portal'): void {
    if (this.isQuizActive) {
      logger.warn('GAME_STATE', `Quiz already active: ${this.quizType}, cannot start ${type}`);
      return false;
    }
    this.isQuizActive = true;
    this.quizType = type;
    return true;
  }

  endQuiz(): void {
    this.isQuizActive = false;
    this.quizType = null;
  }
  ```

**Acceptance Criteria:**
- [ ] isQuizActive поле добавлено
- [ ] quizType поле добавлено
- [ ] startQuiz() метод реализован
- [ ] endQuiz() метод реализован

---

### Phase 6: Phase Transition Logic (2 steps)

#### Step 6.1: Clear coins on phase transition
**File:** `src/game/scenes/MainScene.ts`

**Задачи:**
- При переходе COIN → KEY:
  - Удалить все монетки с анимацией смерти
  - Очистить gameState.coins

**Acceptance Criteria:**
- [ ] Монетки исчезают с анимацией
- [ ] Нет утечек в gameState

---

#### Step 6.2: Update Portal & HUD
**Files:** `PortalCollisionHandler.ts`, `HUDManager.ts`

**Acceptance Criteria:**
- [ ] Порталы работают только в KEY Phase
- [ ] HUD показывает "Монеток: X/3" или "Ключей: X"

---

### Phase 7: Testing & Docs (3 steps) ⚠️ БЫЛО 2, +Step 7.3

#### Step 7.1: Test complete flow
**Задачи:**
- COIN Phase → сбор монетки → CoinBubbleQuiz → правильный/неправильный ответ
- 3 монетки → Oracle → переход на KEY Phase
- KEY Phase → сбор ключа → KeyQuestionModal → Порталы

**Acceptance Criteria:**
- [ ] Весь flow работает
- [ ] Нет утечек памяти
- [ ] Анимации корректны
- [ ] Взрыв центрирован по монетке

---

#### Step 7.2: Update documentation
**Задачи:**
- CONTEXT.md, HISTORY.md, DECISIONS.md

**Acceptance Criteria:**
- [ ] Документация обновлена

---

#### Step 7.3: Create CoinBubbleQuiz tests ⚠️ НОВЫЙ (AUDITED)
**File:** `src/tests/unit/ui/CoinBubbleQuiz.test.ts`

**Задачи:**
- Создать тесты для CoinBubbleQuiz:
  - `should create two bubbles with setScrollFactor(0)`
  - `should randomly select one true and one false statement`
  - `should emit COIN_QUIZ_COMPLETED on correct answer`
  - `should emit COIN_QUIZ_COMPLETED on wrong answer`

**Acceptance Criteria:**
- [ ] CoinBubbleQuiz.test.ts создан
- [ ] Все тесты проходят

---

## Dependencies & Notes

### Dependencies:
- `Coin_192x16.png` в `public/assets/sprites/`
- `UI.CoinBubble_30x30.png` в `src/assets/Game_01/images/`
- Анимация `enemy_death` существует
- `coin-quiz.json` в `public/assets/data/`

### Technical Notes:
1. **⚠️ SpawnMatrix:** AbstractItem автоматически освобождает ячейки
2. **⚠️ AnimationSyncManager:** CoinAnimationSync обязателен
3. **⚠️ ItemCollisionHandler:** Рефакторинг критичен для читаемости
4. **⚠️ LevelConfig:** Расширение интерфейсов критично для SpawnSystem
5. Анимация смерти: `enemy_death` (6 кадров 32x32)
6. Размер монетки: 16x16
7. Скорость: 8 fps
8. **⚠️ Центрирование:** (32 - 16) / 2 = 8 пикселей смещения
9. **⚠️ CoinBubbleQuiz:** Без модального окна, 2 кнопки-баббла
10. **⚠️ setScrollFactor(0):** КРИТИЧНО для Screen Space позиционирования
11. **⚠️ UIManager:** Централизованное управление всеми квизами
12. **⚠️ Quiz State Protection:** isQuizActive для предотвращения конфликтов

### Critical Risks Mitigated:
- ✅ SpawnMatrix утечка → AbstractItem.autoFree()
- ✅ Застывшие монетки → CoinAnimationSync
- ✅ Неправильная логика квиза → Phase check in ItemCollisionHandler
- ✅ LevelConfig undefined coins → Extended ItemSpawnConfig (Step 1.5)
- ✅ ItemCollisionHandler перегружен → Refactored with extracted methods (Step 5.2)
- ✅ Анимация смерти смещена → Centered death animation (Step 2.1)
- ✅ CoinBubbleQuiz позиционирование → setScrollFactor(0) (Step 3.2)
- ✅ UIManager не знает про CoinBubbleQuiz → Extended UIManager (Step 3.4)
- ✅ Конфликт состояния квиза → Quiz State protection (Step 5.5)
- ✅ Destruction Order → UIManager.destroy() cleanup (Step 3.4)

---

## Total Estimated Steps: 28 (было 26 в v2, +2 mitigation steps)

**Timeline Estimate:**
- Phase 1: 6 steps (Foundation + UI configs)
- Phase 2: 4 steps (Item classes)
- Phase 3: 4 steps (Quiz Data & UI) ⚠️ БЫЛО 3
- Phase 4: 3 steps (State & Oracle)
- Phase 5: 5 steps (Animation & Collision) ⚠️ БЫЛО 4
- Phase 6: 2 steps (Transition)
- Phase 7: 3 steps (Test & Docs) ⚠️ БЫЛО 2

**Total:** 28 steps across 7 phases

---

**AUDIT SIGN-OFF:** План проверен на все критические риски. Готов к реализации.
**AUDIT DATE:** 2026-01-30
