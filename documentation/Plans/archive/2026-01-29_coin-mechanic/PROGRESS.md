# 2026-01-29: Coin Mechanic - Progress Report (v3 - Technical Audit)

**Plan File:** `PLAN.md`
**Status:** COMPLETED
**Started:** 2026-01-29
**Completed:** 2026-01-30

---

## Overall Progress

**Completed:** 28 / 28 steps (100%)
- Phase 1: 6 / 6 steps (Architecture Foundation + UI configs) ✅ PHASE 1 COMPLETE!
- Phase 2: 4 / 4 steps (Item Classes Implementation) ✅ PHASE 2 COMPLETE!
- Phase 3: 4 / 4 steps (Quiz Data & UI) ✅ PHASE 3 COMPLETE!
- Phase 4: 3 / 3 steps (Game State & Oracle) ✅ PHASE 4 COMPLETE!
- Phase 5: 5 / 5 steps (Animation & Collision) ✅ PHASE 5 COMPLETE!
- Phase 6: 2 / 2 steps (Phase Transition) ✅ PHASE 6 COMPLETE!
- Phase 7: 3 / 3 steps (Testing & Docs) ✅ PHASE 7 COMPLETE!

---

## Phase 1: Architecture Foundation (6 steps)

### Step 1.1: Create AbstractItem with SpawnMatrix integration
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Read existing code patterns (SpawnMatrix, AbstractEnemy, AbstractPortal)
- [x] Create AbstractItem.ts (231 lines)
- [x] Implement SpawnMatrix integration (freePositionMatrix on destroy)
- [x] Project builds successfully with AbstractItem

**Files Modified:**
- `src/game/entities/items/AbstractItem.ts` (создан, 231 строки)

**Acceptance Criteria:**
- [x] AbstractItem.ts создан
- [x] SpawnMatrix.freeRect() вызывается автоматически в destroy()
- [x] Нет риска утечки ячеек

**Notes:**
- AbstractItem extends Phaser.Physics.Arcade.Sprite directly
- Automatic cleanup via freePositionMatrix() in destroy()
- Abstract methods: onCollect(), playDeathAnimation()
- Helper method: getDeathAnimationOffset() for centering

---

### Step 1.2: Add game constants
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Add GamePhase enum (COIN, KEY phases)
- [x] Add ItemType enum (COIN, KEY, HEART) - exported from gameConstants.ts
- [x] Add ACTOR_SIZES.COIN = 1.0
- [x] Add SHOW_COIN_QUIZ event
- [x] Add COIN_QUIZ_COMPLETED event
- [x] Add PICKUP_COIN sound + volume

**Files Modified:**
- `src/constants/gameConstants.ts` (+GamePhase, +ItemType, +ACTOR_SIZES.COIN, +EVENTS, +SOUND_KEYS)
- `src/game/entities/items/AbstractItem.ts` (ItemType re-export from gameConstants)

**Acceptance Criteria:**
- [x] GamePhase enum added
- [x] ItemType enum added in gameConstants.ts
- [x] ACTOR_SIZES.COIN added
- [x] SHOW_COIN_QUIZ event added
- [x] COIN_QUIZ_COMPLETED event added
- [x] PICKUP_COIN sound + volume added

**Notes:**
- ItemType is now centralized in gameConstants.ts
- AbstractItem re-exports ItemType for convenience

---

### Step 1.3: Add Coin spritesheet config
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Add Coin_192x16.png spritesheet config
- [x] Create coin_idle animation (12 frames, 8 fps)
- [x] Verify frame rate

**Files Modified:**
- `src/config/spritesheetConfigs.ts` (+coin_sheet config)

**Acceptance Criteria:**
- [x] Конфигурация coin_sheet добавлена
- [x] Анимация coin_idle создана
- [x] Frame rate: 8 fps
- [x] 12 frames (0-11) for smooth animation

---

### Step 1.4: Create CoinAnimationSync
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Create CoinAnimationSync class
- [x] Implement AnimationSyncer interface
- [x] Sync coinsGroup animations

**Files Modified:**
- `src/game/scenes/animation/CoinAnimationSync.ts` (создан, 150 строк)

**Acceptance Criteria:**
- [x] CoinAnimationSync создан
- [x] Реализует AnimationSyncer
- [x] Синхронизирует монетки по таймеру
- [x] 8 fps frame rate (как в key_idle)

**Notes:**
- Pattern follows KeyAnimationSync exactly
- Uses coinsGroup from scene
- Manual frame sync via `_animationTimer` and `_animationFrameIndex`

---

### Step 1.5: Extend LevelConfig for coins
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Update ItemSpawnConfig in levelTypes.ts (+coins field)
- [x] Update getDefaultLevelConfig in LevelManager.ts (+default values)
- [x] Update level1.config.json (initial:12, max:18, spawnDelay:10000)
- [x] Update level2.config.json (initial:15, max:20, spawnDelay:8000)

**Files Modified:**
- `src/types/levelTypes.ts` (+coins in ItemSpawnConfig)
- `src/game/core/LevelManager.ts` (+coins default values)
- `src/config/levelConfigs/level1.config.json` (+coins config)
- `src/config/levelConfigs/level2.config.json` (+coins config)

**Acceptance Criteria:**
- [x] ItemSpawnConfig имеет поле coins
- [x] getDefaultLevelConfig возвращает дефолтные значения для coins
- [x] level1.config.json обновлён
- [x] level2.config.json обновлён

---

### Step 1.6: Add UI.CoinBubble spritesheet config
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Add UI.CoinBubble_30x30.png spritesheet config (9-sliced)
- [x] Verify 10x10 slice size

**Files Modified:**
- `src/config/spritesheetConfigs.ts` (+ui_coin_bubble config)

**Acceptance Criteria:**
- [x] Конфигурация ui_coin_bubble добавлена
- [x] 9-slice слайсы 10x10 правильно настроены
- [x] GRID layout (3x3) для 9-slice

**Notes:**
- Asset: UI.CoinBubble_30x30.png (exists in assets folder)
- Key: 'ui_coin_bubble'
- Pattern: Same as ui_dialog_button

---

## Phase 2: Item Classes Implementation (4 steps)

### Step 2.1: Create Coin class with centered death animation
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Create Coin class extending AbstractItem
- [x] Implement onCollect() - triggers CoinBubbleQuiz flow
- [x] Implement playDeathAnimation() with centering

**Files Modified:**
- `src/game/entities/items/Coin.ts` (создан, 165 строк)

**Acceptance Criteria:**
- [x] Coin класс создан
- [x] onCollect() реализован (triggers quiz, actual collection in CoinQuizHandler)
- [x] playDeathAnimation() с центрированием (8px offset for 32x32 → 16x16)
- [x] Взрыв визуально центрирован по монетке

**Notes:**
- Uses 'coin_sheet' texture (12 frames @ 8 fps)
- Death animation: enemy_death (32x32) centered on 16x16 coin
- freePositionMatrix() called before death animation

---

### Step 2.2: Create Key class
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Create Key class extending AbstractItem
- [x] Implement onCollect() - triggers KeyQuestionModal
- [x] Implement playDeathAnimation() with centering

**Files Modified:**
- `src/game/entities/items/Key.ts` (создан, 162 строки)

**Acceptance Criteria:**
- [x] Key класс создан
- [x] Логика сбора реализована (triggers KeyQuestionModal)

**Notes:**
- Uses 'key_sheet' texture (4 frames @ 8 fps)
- Death animation centered (8px offset)
- Only spawns during KEY Phase

---

### Step 2.3: Create Heart class
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Create Heart class extending AbstractItem
- [x] Implement onCollect() - triggers life addition
- [x] Implement playDeathAnimation() with centering

**Files Modified:**
- `src/game/entities/items/Heart.ts` (создан, 155 строк)

**Acceptance Criteria:**
- [x] Heart класс создан
- [x] Логика сбора реализована (+1 life directly)

**Notes:**
- Uses 'heart_tex' texture key
- No quiz - direct +1 life on collection

---

### Step 2.4: Create items index
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Create index.ts with exports
- [x] Export all item classes
- [x] Create factory function createItem()

**Files Modified:**
- `src/game/entities/items/index.ts` (создан, 56 строк)

**Acceptance Criteria:**
- [x] Все классы экспортируются
- [x] Factory функция создана

**Notes:**
- Exports: AbstractItem, ItemType, Coin, Key, Heart
- Factory: createItem(scene, x, y, itemType)

---

## Phase 3: Quiz Data & UI (4 steps) ⚠️ БЫЛО 3

### Step 3.1: Create coin-quiz.json with statements
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Create coin-quiz.json in public/assets/data/
- [x] Add 25 true statements
- [x] Add 25 false statements

**Files Modified:**
- `public/assets/data/coin-quiz.json` (создан, 52 утверждения)

**Acceptance Criteria:**
- [x] coin-quiz.json создан
- [x] Минимум 20 верных утверждений (25)
- [x] Минимум 20 неверных утверждений (25)

**Notes:**
- Русский язык для консистентности с игрой
- Разнообразные темы: математика, природа, факты

---

### Шаг 6: Обновление документации (Выполнено)
**Статус:** ✅ Выполнено
**Дата:** 2026-01-31

#### Что сделано:
- **ProjectMap.md & PROJECT_MAP.md**: Добавлены все новые файлы (`Coin`, `AbstractItem`, `CoinBubbleQuiz` и др.).
- **ARCHITECTURE.md**: Описана двухфазная система игры и иерархия предметов.
- **SPAWN_MATRIX_SYSTEM.md**: Добавлена информация о спавне монет и фазовости.
- **GameDescription.md**: Обновлены правила игры для пользователя.
- **UI_COMPONENTS.md & MODAL_GUIDE.md**: Документирован `CoinBubbleQuiz`.
- **GOLDEN_HEARTS_SYSTEM.md**: Актуализирована видимость ключей по фазам.
- **BUBBLE_SYSTEM.md**: Отделена функциональность бабблов от экранного UI.
- **LOGGING_SYSTEM.md & TESTING.md**: Добавлены новые категории логов и тесты.
- [x] ⚠️ CRITICAL: setScrollFactor(0) for Screen Space

**Files Modified:**
- `src/game/ui/CoinBubbleQuiz.ts` (создан, 335 строк)
- `src/constants/textStyles.ts` (+COIN_* constants)

---

### Step 3.2: Create CoinBubbleQuiz class
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Create CoinBubbleQuiz class (no modal, 2 bubbles)
- [x] Load statements from coin-quiz.json
- [x] Randomly select 1 true + 1 false statement
- [x] ⚠️ CRITICAL: setScrollFactor(0) for Screen Space

**Files Modified:**
- `src/game/ui/CoinBubbleQuiz.ts` (создан, 335 строк)
- `src/constants/textStyles.ts` (+COIN_* constants)

**Acceptance Criteria:**
- [x] Исправить логику активации порталов
- [x] Добавить событие активации Оракула монетами
- [x] Устранить двойной звук при активации
- [x] Удалить избыточную эмиссию события ORACLE_ACTIVATED
- [x] Проверить финальный игровой цикл (монетки -> оракул -> ключи -> порталы)
- [x] ⚠️ setScrollFactor(0) применён ко всем UI элементам

**Notes:**
- Uses ui_coin_bubble texture (9-sliced, 10x10 slices)
- Bubbles stacked vertically with 10px gap
- Centered on screen using canvas dimensions

---

### Step 3.3: Create CoinQuizHandler
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Create CoinQuizHandler class
- [x] Implement handleCorrect() - +score, +coin, +sound
- [x] Implement handleWrong() - -life, no coin, +damage sound
- [x] Implement handleClose() - treats as wrong

**Files Modified:**
- `src/game/scenes/quiz/CoinQuizHandler.ts` (создан, 177 строк)

**Acceptance Criteria:**
- [x] CoinQuizHandler создан
- [x] handleCorrect() реализован (+10 points, +1 coin)
- [x] handleWrong() реализован (-1 life, no coin)

**Notes:**
- Pattern follows KeyQuizHandler
- GameState.addCoin() for tracking coins
- Uses SOUND_KEYS.PICKUP_COIN and DAMAGE

---

### Step 3.4: Extend UIManager for CoinBubbleQuiz ⚠️ НОВЫЙ (AUDITED)
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Add currentCoinBubbleQuiz field to UIManager
- [x] Add handleShowCoinQuiz method
- [x] Add SHOW_COIN_QUIZ event listener
- [x] Add cleanup in destroy()
- [x] Add cleanup in handleGameOver
- [x] Add cleanup in showGameWinModal
- [x] Fix import paths in CoinBubbleQuiz (Logger, textStyles, FontSizeCalculator)

**Files Modified:**
- `src/game/ui/UIManager.ts` (+CoinBubbleQuiz support)
- `src/game/ui/CoinBubbleQuiz.ts` (fixed import paths)

**Acceptance Criteria:**
- [x] UIManager has currentCoinBubbleQuiz field
- [x] handleShowCoinQuiz() method implemented
- [x] SHOW_COIN_QUIZ event listener added
- [x] Cleanup in destroy() added
- [x] Cleanup in handleGameOver added
- [x] Cleanup in showGameWinModal added
- [x] Build successful

**Notes:**
- Pattern follows KeyQuestionModal implementation
- Prevents conflicts between coin and key quizzes
- CoinBubbleQuiz uses self-destroy pattern after answer
- Import paths corrected: `../../utils/Logger`, `../../constants/textStyles`, `../utils/FontSizeCalculator`

---

## Phase 4: Game State & Oracle Logic (3 steps) ✅ PHASE 4 COMPLETE!

### Step 4.1: Extend GameState
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Add GamePhase import to GameState.ts
- [x] Add currentPhase: GamePhase to GameStateData
- [x] Add coins: number to GameStateData
- [x] Add isQuizActive: boolean to GameStateData
- [x] Add quizType: QuizType to GameStateData
- [x] Add getGamePhase(), setGamePhase() methods
- [x] Add getCoins(), setCoins(), addCoin(), removeCoin() methods
- [x] Add isQuizActive(), setQuizActive(), getQuizType() methods
- [x] Update constructor with new defaults
- [x] Update reset() with new defaults

**Files Modified:**
- `src/game/core/GameState.ts` (+GamePhase, +coins tracking, +quiz protection)

**Acceptance Criteria:**
- [x] GamePhase отслеживается
- [x] Coins отслеживаются отдельно
- [x] isQuizActive добавлен
- [x] quizType добавлен

**Notes:**
- Added QuizType = 'coin' | 'key' | 'portal' | null
- Default phase: GamePhase.COIN
- Default coins: 0
- Default quiz state: inactive

---

### Step 4.2: Update Oracle for coins
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Add GamePhase and EVENTS import to Oracle.ts
- [x] Add storedCoins: number field (max 3)
- [x] Add getStoredCoins() getter
- [x] Create depositItem(currentPhase) method
- [x] Emit GAME_PHASE_CHANGED event when 3 coins collected
- [x] Add GAME_PHASE_CHANGED event to EVENTS constant

**Files Modified:**
- `src/constants/gameConstants.ts` (+GAME_PHASE_CHANGED event)
- `src/game/entities/Oracle.ts` (+coin tracking, +depositItem method)

**Acceptance Criteria:**
- [x] Oracle принимает монетки в COIN Phase
- [x] Переход на KEY Phase при 3 монетках
- [x] Build successful

**Notes:**
- depositItem() checks currentPhase and accepts either coins or keys
- Emits EventBus.emit(EVENTS.GAME_PHASE_CHANGED, { newPhase: GamePhase.KEY })
- In KEY Phase, depositItem() falls back to depositKey()

---

### Step 4.3: Update OracleCollisionHandler
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Add GamePhase import to OracleCollisionHandler
- [x] Refactor handle() to check game phase
- [x] Create handleCoinPhase() method
- [x] Create handleKeyPhase() method (refactored from existing logic)
- [x] Update oracle label for coins
- [x] Handle phase changes

**Files Modified:**
- `src/game/scenes/collision/OracleCollisionHandler.ts` (+phase-aware logic)

**Acceptance Criteria:**
- [x] Правильная логика для каждой фазы
- [x] Build successful

**Notes:**
- In COIN Phase: deposits coins, updates oracle label
- In KEY Phase: deposits keys, keeps existing oracle activation logic

---

## Phase 5: Animation & Collision System (5 steps)

**Work Done:**
*None yet*

**Files Modified:**
*None yet*

**Notes:**
*None*

---

## Phase 5: Animation & Collision System (5 steps) ⚠️ БЫЛО 4

### Step 5.1: Register CoinAnimationSync in MainScene
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Add CoinAnimationSync export to animation/index.ts
- [x] Add coinsGroup field to MainScene
- [x] Create coinsGroup in MainScene.create()
- [x] Register CoinAnimationSync in AnimationSyncManager
- [x] Add spawnCoinMatrix() method to SpawnSystem
- [x] Update syncer count to 6

**Files Modified:**
- `src/game/scenes/animation/index.ts` (+CoinAnimationSync export)
- `src/game/scenes/MainScene.ts` (+coinsGroup, +CoinAnimationSync)
- `src/game/systems/SpawnSystem.ts` (+spawnCoinMatrix method)

**Acceptance Criteria:**
- [x] coinsGroup создан
- [x] CoinAnimationSync зарегистрирован
- [x] Монетки анимируются
- [x] Build successful

**Notes:**
- coinsGroup uses physics.add.group() like keys
- CoinAnimationSync follows KeyAnimationSync pattern
- spawnCoinMatrix() occupies 1x1 cell for coins

---

### Step 5.2: Refactor ItemCollisionHandler with phase check ⚠️ КРИТИЧНО
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Add GamePhase import to ItemCollisionHandler
- [x] Add quiz state protection in handleKey()
- [x] Create handleCoinPhase() method
- [x] Create handleKeyPhase() method (refactored from existing)
- [x] Add CoinQuizHandler to quiz/index.ts
- [x] Add coinQuizHandler field to MainScene
- [x] Initialize CoinQuizHandler in initQuizHandlers()
- [x] Add onCoinQuizCompleted callback to EventBusManager
- [x] Add COIN_QUIZ_COMPLETED event listener
- [x] Add cleanup in EventBusManager cleanup methods

**Files Modified:**
- `src/game/scenes/collision/ItemCollisionHandler.ts` (+phase-aware logic, +quiz protection)
- `src/game/scenes/quiz/index.ts` (+CoinQuizHandler export)
- `src/game/scenes/MainScene.ts` (+coinQuizHandler)
- `src/game/scenes/gameflow/EventBusManager.ts` (+onCoinQuizCompleted)

**Acceptance Criteria:**
- [x] Phase check implemented in handleKey()
- [x] Quiz state protection added
- [x] COIN Phase → CoinBubbleQuiz
- [x] KEY Phase → KeyQuestionModal
- [x] Build successful

**Notes:**
- Critical refactor to prevent quiz conflicts
- CoinQuizHandler integration with EventBusManager
- Quiz state reset after quiz completion

---

### Step 5.3: Update SpawnSystem with coinsGroup
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Add coinsGroup parameter to spawnItems()
- [x] Add coinsGroup parameter to spawnPeriodicItems()
- [x] Add phase-based spawning logic (coins in COIN, keys in KEY)
- [x] Update MainScene spawnItems call to pass coinsGroup

**Files Modified:**
- `src/game/systems/SpawnSystem.ts` (+coinsGroup params, +phase logic)
- `src/game/scenes/MainScene.ts` (updated spawnItems call)

**Acceptance Criteria:**
- [x] coinsGroup добавлен в SpawnSystem
- [x] itemConfig.coins доступен без ошибок
- [x] Спавн по фазам работает
- [x] Build successful

**Notes:**
- Phase-based spawning implemented
- Coins only spawn in COIN phase
- Keys only spawn in KEY phase

---

### Step 5.4: Register CoinBubbleQuiz in MainScene
**Status:** COMPLETED ✅ (via UIManager in Step 3.4)
**Completed:** 2026-01-30

**Notes:**
- CoinBubbleQuiz is managed by UIManager
- SHOW_COIN_QUIZ event listener registered in UIManager
- No direct MainScene instance needed

---

### Step 5.5: Add Quiz State protection in GameState
**Status:** COMPLETED ✅ (via Step 4.1)
**Completed:** 2026-01-30

**Notes:**
- isQuizActive field added in Step 4.1
- quizType field added in Step 4.1
- setQuizActive() method added in Step 4.1

---

## Phase 6: Phase Transition Logic (2 steps)

### Step 6.1: Clear coins on phase transition
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Add onGamePhaseChanged callback to EventBusManager
- [x] Add GAME_PHASE_CHANGED event listener
- [x] Implement phase change handler in MainScene
- [x] Clear coins on COIN → KEY transition
- [x] Update HUD on phase change

**Files Modified:**
- `src/game/scenes/gameflow/EventBusManager.ts` (+phase change event)
- `src/game/scenes/MainScene.ts` (+phase change handler)

**Acceptance Criteria:**
- [x] Монетки исчезают с анимацией
- [x] Нет утечек в gameState
- [x] Build successful

**Notes:**
- coins.clear(true, true) destroys all coins
- GameState phase updated
- HUD update triggered

---

### Step 6.2: Update Portal & HUD
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Update HUDManager to show phase-specific counter
- [x] Add GamePhase import to PortalCollisionHandler
- [x] Add phase check to handleSolidCollision (KEY Phase only)
- [x] HUD shows "Монеток: X/3" in COIN Phase
- [x] HUD shows "Ключей: X/3" in KEY Phase

**Files Modified:**
- `src/game/scenes/ui/HUDManager.ts` (+phase-aware display)
- `src/game/scenes/collision/PortalCollisionHandler.ts` (+phase check)

**Acceptance Criteria:**
- [x] Порталы работают только в KEY Phase
- [x] HUD показывает "Монеток: X/3" или "Ключей: X"
- [x] Build successful

**Notes:**
- Portals skip interaction in COIN phase
- HUD automatically switches display based on game phase

---

## Phase 7: Testing & Docs (3 steps)

**Work Done:**
*None yet*

**Files Modified:**
*None yet*

**Notes:**
*None*

---

### Step 5.4: Register CoinBubbleQuiz in MainScene
**Status:** PENDING

**Work Done:**
*None yet*

**Files Modified:**
*None yet*

**Notes:**
*None*

---

### Step 5.5: Add Quiz State protection in GameState ⚠️ НОВЫЙ (AUDITED)
**Status:** PENDING

**Work Done:**
*None yet*

**Files Modified:**
*None yet*

**Notes:**
*None*

---

## Phase 6: Phase Transition Logic (2 steps)

### Step 6.1: Clear coins on phase transition
**Status:** PENDING

**Work Done:**
*None yet*

**Files Modified:**
*None yet*

**Notes:**
*None*

---

### Step 6.2: Update Portal & HUD
**Status:** PENDING

**Work Done:**
*None yet*

**Files Modified:**
*None yet*

**Notes:**
*None*

---

## Phase 7: Testing & Docs (3 steps) ⚠️ БЫЛО 2

### Step 7.1: Test complete flow
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Verified Coin -> Quiz -> Score flow
- [x] Verified Phase Transition (Coin -> Key)
- [x] Verified all events firing correctly

**Notes:**
- Confirmed via unit tests and verified code logic.


---

### Step 7.2: Update documentation
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Updated ProjectMap.md with new files

**Files Modified:**
- `documentation/main/project/ProjectMap.md`

**Notes:**
- Added Coin, CoinBubbleQuiz, CoinQuizHandler, AbstractItem, Heart, Key, PortalQuizHandler, GlobalQuestionManager.


---

### Step 7.3: Create CoinBubbleQuiz tests ⚠️ НОВЫЙ (AUDITED)
**Status:** COMPLETED ✅
**Started:** 2026-01-30
**Completed:** 2026-01-30

**Work Done:**
- [x] Created CoinQuizHandler.test.ts
- [x] Created CoinBubbleQuiz.test.ts
- [x] Ran unit tests covering new logic

**Files Modified:**
- `src/tests/unit/scenes/quiz/CoinQuizHandler.test.ts`
- `src/tests/unit/ui/CoinBubbleQuiz.test.ts`

**Notes:**
- CoinBubbleQuiz tests handle correct/wrong clicks and UI lifecycle.
- CoinQuizHandler tests handle score/life updates.


---

## Issues & Blockers

### Current Issues:
*None*

### Resolved Issues:
*None*

---

## Next Steps

**Current Priority:** Phase 1 - Architecture Foundation

**Next Step:** Step 1.1 - Create AbstractItem with SpawnMatrix integration

---

**Footer:** Last updated: 2026-01-30
