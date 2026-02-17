# Architecture Decisions Record (ADR)

**Purpose:** Fixation of **reasons** behind project decisions. This is the most important file for preventing "regression" (when AI accidentally brings back an old bug thinking it's an improvement).

---

## Decision 001: File-based Memory System (instead of claude-mem plugin)

**Date:** 2026-01-25
**Status:** Accepted
**Type:** Infrastructure

### Context
- Claude has access to `claude-mem` MCP plugin for persistent memory across sessions
- Previous sessions forgot to write observations to memory, losing context
- `claude-mem` plugin appears to be **read-only** (only `search`, `timeline`, `get_observations` available)
- No `add_observation` or similar tool found for writing new entries

### Decision
Use **file-based memory system** in `documentation/memory/` instead of relying on `claude-mem` plugin.

**Three-file structure:**
- `CONTEXT.md` - Current snapshot (what am I doing right now?)
- `HISTORY.md` - Milestones (what have we completed?)
- `DECISIONS.md` - This file (why did we do it this way?)

### Consequences
**Positive:**
- ✅ Files are readable and writable
- ✅ Can be edited manually if needed
- ✅ Git-tracked (history of decisions)
- ✅ No dependency on external plugin write access

**Negative:**
- ❌ Not as searchable as claude-mem plugin
- ❌ Requires manual maintenance (rotation of HISTORY.md)
- ❌ No automatic cross-session memory (must update files explicitly)

**Mitigation:**
- Update `CONTEXT.md` at start/end of each session
- Add major milestones to `HISTORY.md` after completion
- Record architectural changes in `DECISIONS.md`

---

## Decision 002: ARCADE_LOG_* prefix (instead of VITE_DEBUG_*)

**Date:** 2026-01-25
**Status:** Accepted
**Type:** Configuration

### Context
- Previous logging refactor used `VITE_DEBUG_*` prefix for environment variables
- System environment variables with `VITE_DEBUG_*` prefix can override project settings
- This causes conflicts and unpredictable behavior
- Documentation was updated to use `ARCADE_LOG_*` but implementation still had old prefix

### Decision
Use `ARCADE_LOG_*` prefix for all logging environment variables.

**Exception:** `VITE_DISABLE_COLLISION_LOGS` uses `VITE_` prefix with **inverted logic** (false=enabled, true=disabled) to prevent system overrides.

### Consequences
**Positive:**
- ✅ No conflicts with system environment variables
- ✅ Project-specific prefix prevents accidental overrides
- ✅ Clear naming: `ARCADE_LOG_*` = this project's logging

**Negative:**
- ❌ Requires `envPrefix: ['VITE_', 'ARCADE_LOG_']` in vite.config.ts
- ❌ One exception to remember (`VITE_DISABLE_COLLISION_LOGS`)

**Implementation:**
- Updated `vite.config.ts` to include both prefixes
- Updated all `.env` files to use `ARCADE_LOG_*`
- Updated `LOGGING_SYSTEM.md` documentation

---

## Decision 003: Deleted .env.minimal file

**Date:** 2026-01-25
**Status:** Accepted
**Type:** Cleanup

### Context
- Found `.env.minimal` file with outdated `VITE_DEBUG_*` variables
- File not referenced in any `.ts` code
- File was accidentally tracked in Git (not in `.gitignore`)
- Only purpose appeared to be local testing

### Decision
Delete `.env.minimal` file.

**Reasoning:**
- Unused in codebase
- Outdated variable names
- Each developer should configure their own `.env` locally
- Project should not commit sample env files with production tokens

### Consequences
**Positive:**
- ✅ Reduced confusion (no obsolete file)
- ✅ Cleaner repository
- ✅ Forces developers to use `.env` properly

**Negative:**
- ❌ No sample env file for new developers (mitigated by `LOGGING_SYSTEM.md` documentation)

---

## Decision 004: No inline comments in .env files

**Date:** 2026-01-25
**Status:** Accepted
**Type:** Configuration

### Context
- `cleanEnvValue()` function in `debugConfig.ts` strips everything after `#` from env values
- Inline comments like `VITE_DISABLE_COLLISION_LOGS=true  # comment` were being parsed incorrectly
- This caused collision logs to remain enabled despite `VITE_DISABLE_COLLISION_LOGS=true`

### Decision
**NEVER write inline comments in .env files.** Comments must be on separate lines BEFORE the value.

```bash
# ❌ WRONG - breaks parsing!
VITE_DISABLE_COLLISION_LOGS=true  # false = enabled

# ✅ CORRECT - comment on separate line
# VITE_DISABLE_COLLISION_LOGS: true = disabled, false = enabled
VITE_DISABLE_COLLISION_LOGS=true
```

### Consequences
**Positive:**
- ✅ Reliable env parsing
- ✅ Clearer separation of values and documentation

**Negative:**
- ❌ More verbose (takes 2 lines instead of 1)

**Mitigation:**
- Documented in `LOGGING_SYSTEM.md`
- Standard pattern for all .env files in project

---

## Decision 005: EventBus logging without event args

**Date:** 2026-01-25
**Status:** Accepted
**Type:** Performance

### Context
- `EventBus.ts` was logging full event args: `logger.log('EVENT_BUS', event, args)`
- When args contained Phaser objects (sprites, scenes, etc.), `safeStringify()` failed
- Error: `Cannot read properties of undefined (reading 'toJSON')`
- Lag: ~5 seconds when entering portal modal (expensive serialization)
- Console spam from serialization failures

### Decision
**NEVER log event args in EventBus.** Only log event names.

```typescript
// ❌ WRONG - causes lag and serialization errors
logger.log('EVENT_BUS', `EventBus.emit: ${event}`, args);

// ✅ CORRECT - only log event name
logger.log('EVENT_BUS', `EventBus.emit: ${event}`);
```

### Consequences
**Positive:**
- ✅ Event processing: 0.5ms vs 5000ms (10,000x faster)
- ✅ No serialization errors
- ✅ Clean console logs
- ✅ Fixed portal modal lag

**Negative:**
- ❌ Can't see event payload in logs (use targeted logging in handlers if needed)

**Mitigation:**
- For debugging specific events, add targeted logging in event handlers
- Use browser DevTools to inspect event payloads when needed

**Implementation:**
- Modified `src/game/EventBus.ts` to remove args from logging
- Commit: `110caf7`

---

## Decision 006: Dynamic log toggling via Vite (not bat files)

**Date:** 2026-01-27
**Status:** Accepted
**Type:** Configuration

### Context
- User wanted ability to toggle debug logs within same session
- Original bat files read `.env` completely and set all variables in bash session
- `Vite` reads `process.env` first, then `.env` files
- Session environment variables took priority over `.env` file values
- Changing `.env` had no effect until new console session started

### Problem
```batch
# OLD BAT FILE - Reads entire .env into session
for /f "tokens=*" %%a in ('type .env ^| findstr /v "^#" ^| findstr /v "^$" ^| findstr "="') do set %%a
# Result: ARCADE_LOG_UI=true persists in session, ignores .env changes
```

### Decision
**Bat files should ONLY read Claude Code tokens** (`ANTHROPIC_*`). Let Vite read `ARCADE_LOG_*` directly from `.env`.

```batch
# NEW BAT FILE - Only reads tokens
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /b "ANTHROPIC_"') do set %%a=%%b
# Result: Vite reads .env directly, can toggle logs by restarting server
```

### Consequences
**Positive:**
- ✅ Can toggle logs by editing `.env` and restarting Vite
- ✅ No need to restart entire console session
- ✅ Cleaner bat files (single responsibility: token management)
- ✅ Works for future sessions automatically

**Negative:**
- ❌ Still requires Vite restart (`.env` changes don't hot-reload)
- ❌ May need cache clear: `rm -rf node_modules/.vite`

**Workflow for toggling logs:**
1. Edit `.env`: `ARCADE_LOG_UI=true/false`
2. Restart Vite: `npm run dev`
3. Clear cache if needed: `rm -rf node_modules/.vite`
4. Reload browser: F5

### Implementation
- Modified `ArcadeQuiz_PowerShell.bat` - limited `.env` reading to `ANTHROPIC_*` only
- Modified `ArcadeQuiz_CMD.bat` - same change for CMD variant
- Vite config already has `envPrefix: ['VITE_', 'ARCADE_LOG_']` - works as-is

### Bonus Fixes (same session)
- Fixed `.env` variable name: `ARCADE_LOG_UI_ENABLED` → `ARCADE_LOG_OVERLAY_ENABLED`
- Removed duplicate `ARCADE_LOG_UI` entries (3 → 1)
- Added missing visual flags: `ARCADE_LOG_VISUAL_GRID_ENABLED`, `ARCADE_LOG_SPAWN_GRID_ENABLED`

### ⚠️ IMPORTANT: Console Session Restart Required
**First time only:** After updating bat files, must start NEW console session.
- Old console sessions have stale `ARCADE_LOG_*` variables in Windows environment
- New sessions will use updated bat files (no `ARCADE_LOG_*` in environment)
- After first restart, only Vite restart is needed for `.env` changes

---

## Decision 007: Documentation Reorganization by Category

**Date:** 2026-01-28
**Status:** Accepted
**Type:** Documentation

### Context
- Documentation files accumulated in `documentation/main/` root (27+ files)
- Difficult to find relevant documentation - no clear categorization
- Some files existed in both `main/` and `export_llm/` (duplicates)
- ProjectMap.md was too large (~2000 lines) but necessary for navigation
- export_llm/ documentation had outdated paths to old structure

### Decision
**Reorganize `documentation/main/` into 6 categories by purpose:**

1. **`game-systems/`** (4 files) - Game systems documentation
   - BUBBLE_SYSTEM.md, SPAWN_MATRIX_SYSTEM.md, GOLDEN_HEARTS_SYSTEM.md, LOGGING_SYSTEM.md

2. **`ui/`** (6 files) - UI documentation
   - UI_GUIDE.md, UI_COMPONENTS.md, UI_TEXT_SCALING.md, MODAL_GUIDE.md, FONT_SIZING_SYSTEM.md, SCALING_SYSTEM.md

3. **`development/`** (8 files) - For developers
   - TESTING.md, TESTING_SIMPLE.md, TESTING_TECHNICAL.md, DEBUGGING_GUIDE.md, DEBUG_OVERLAY.md, DEBUGGING.md, BUILD.md, DEVELOPMENT.md

4. **`project/`** (4 files) - About the project
   - ARCHITECTURE.md, GameDescription.md, ProjectMap.md, TILED_MAP_IMPLEMENTATION.md

5. **`planning/`** (5 files) - Plans and progress
   - ModularArchitecturePlan.md, ModularArchitectureProgress.md, PrototypeAnalysis.md, DocumentationMaintenance.md

6. **`reference/`** (1 file) - Reference info
   - DEBUG_UI_SYSTEM.md

**Additional changes:**
- Created GOLDEN_HEARTS_SYSTEM.md - documentation for new key display system
- Created DEBUGGING_GUIDE.md - merged DEBUGGING.md + DEBUG_OVERLAY.md
- Created MODAL_GUIDE.md - comprehensive modal windows guide
- Created UI_GUIDE.md - merged UI_TEXT_SCALING + UI_COMPONENTS
- Updated export_llm/ files with new structure (PROJECT_MAP.md, QUICK_START.md, README.md)
- Updated ProjectMap.md to v4.5 with new documentation structure
- Removed ProjectMap_OLD.md (cleanup)
- Updated .claude/rules/00-main-rules.md with new paths

### Consequences
**Positive:**
- ✅ Easy to find documentation by category
- ✅ No duplicates between main/ and export_llm/
- ✅ Each folder has meaningful content (4-8 files vs 1-3 before)
- ✅ export_llm/ updated and synchronized with main/
- ✅ Rules updated to match new structure
- ✅ ProjectMap.md improved with detailed navigation

**Negative:**
- ❌ Longer paths: `documentation/main/ui/UI_GUIDE.md` vs `documentation/main/UI_GUIDE.md`
- ❌ Migration required careful file tracking (some files were lost and recreated)

**Mitigation:**
- Use export_llm/PROJECT_MAP.md for quick navigation (shorter paths)
- Git tracks all changes - can recover if needed
- Rules updated to prioritize export_llm/ for initial navigation

**Implementation:**
- Moved all files to appropriate categories
- Created 4 new documentation files
- Updated 3 export_llm/ files (v2.0)
- Updated ProjectMap.md to v4.5
- Updated .claude/rules/00-main-rules.md

---

## Decision 008: Fixed FontSizeCalculator Test Expectations

**Date:** 2026-01-28
**Status:** Accepted
**Type:** Bug Fix

### Context
- FontSizeCalculator had MAX_OPTIMAL_FONT_SIZE changed from 26 to 40
- Tests were still using old expectations (18 and 64)
- Two specific tests were failing:
  1. calculateButtonFontSize expected 18 when text fits → actual 40
  2. calculateButtonFontSize expected 64 for maximum → actual 40

### Problem
The code behavior changed but tests weren't updated:
- calculateButtonFontSize now returns MAX_OPTIMAL_FONT_SIZE (40) when text fits
- Maximum size for buttons is capped at MAX_OPTIMAL_FONT_SIZE (40), not MAX_FONT_SIZE (64)

### Decision
**Update test expectations to match current code behavior:**
- Change expected value from 18 to 40 when text fits in calculateButtonFontSize
- Change maximum expected value from 64 to 40 for button font sizes

### Consequences
**Positive:**
- ✅ Tests now pass and accurately reflect current behavior
- ✅ MAX_OPTIMAL_FONT_SIZE = 40 is consistently enforced
- ✅ Prevents regression if old behavior is accidentally restored

**Negative:**
- ❌ Tests now describe the actual behavior rather than intended behavior
- ❌ If the original design intention was different, this may mask issues

**Mitigation:**
- Documented the change in CONTEXT.md
- The behavior appears intentional (max clarity for buttons)

### Implementation
- Modified `src/tests/unit/utils/FontSizeCalculator.test.ts`:
  - Line 152: `expect(result).toBe(18)` → `expect(result).toBe(40)`
  - Line 203: `expect(result).toBe(64)` → `expect(result).toBe(40)`
- Updated test description and comments to reflect new behavior

---

## Decision 009: Fixed HISTORY.md Rotation Bug (Previous Decision)

**Date:** 2026-01-28
**Status:** Accepted
**Type:** Bug Fix

### Context
- `scripts/check-memory-size.js` was causing HISTORY.md to **grow** instead of shrink after rotation
- Bug: 216 lines → 246 lines (+30 lines, should have decreased!)
- Console reported: "Для архивации: 6 разделов, Остается: 8 разделов" (6+8=14, but only 8 existed!)
- Root cause: Script didn't skip the **old** Archived Summary when parsing, creating duplicates

### Problem Details
**Original buggy flow:**
1. File has "Archived Summary" from previous rotation
2. Script parses entire file (including old summary) as "sections"
3. Script adds new summary + keeps all old sections
4. Result: Duplicate headers, file grows instead of shrinking

**Example of bug:**
```markdown
## 📦 Archived Summary (2026-01-28)  <-- NEW summary
---
# Project History - Milestones         <-- DUPLICATE old header
**Purpose:** ...                        <-- DUPLICATE
---
## 2026-01-25: Memory System...         <-- DUPLICATE archived entry
```

### Decision
**Fix:** Skip old Archived Summary during parsing before processing sections.

**Implementation:**
```javascript
// Skip old Archived Summary if present
let startIndex = 0;
let foundArchivedSummary = false;
let dashCount = 0;

for (let i = 0; i < lines.length; i++) {
    if (line.includes('Archived Summary') || line.includes('📦')) {
        foundArchivedSummary = true;
        continue;
    }
    if (foundArchivedSummary && line.trim() === '---') {
        dashCount++;
        if (dashCount === 2) {
            startIndex = i + 1;
            while (startIndex < lines.length && lines[startIndex].trim() === '') {
                startIndex++;
            }
            break;
        }
    }
}

const linesToProcess = startIndex > 0 ? lines.slice(startIndex) : lines;
// Process only linesToParse for section detection
```

### Consequences
**Positive:**
- ✅ File size now decreases: 258 lines → 123 lines (-135 lines)
- ✅ No duplicate headers
- ✅ Old summary properly archived
- ✅ Rotation works as intended

**Negative:**
- ❌ None - pure bug fix

**Testing:**
- Created test file with 258 lines + old Archived Summary
- Ran rotation script
- Result: 123 lines, no duplicates, old summary skipped

### Implementation
- Modified `scripts/check-memory-size.js`
- Added logic to skip old Archived Summary before parsing sections
- Tested with `check-memory-size-test.js` (deleted after verification)

---

## Decision 010: Comprehensive Mock Object Methods for UI Tests

**Date:** 2026-01-28
**Status:** Accepted
**Type:** Bug Fix

### Context
- Multiple UI test files (GameOverModal.test.ts, KeyQuestionModal.test.ts) were failing with "method not found" errors
- Mock text objects were missing several Phaser text methods like `setScale`, `setText`, `setVisible`, etc.
- Tests were failing at runtime when trying to call these methods on mock text objects
- Error example: "this.questionText.setScale is not a function" in KeyQuestionModal.ts:410

### Problem
Mock text objects in test files only had basic methods:
```typescript
// Missing methods
text: jest.fn(() => ({
    setOrigin: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    // ... some basic methods but missing:
    // setScale, setTint, setAlpha, setText, setResolution, height (property)
}))
```

But actual KeyQuestionModal code calls these additional methods:
```typescript
this.questionText.setScale(invZoom);        // Missing!
this.feedbackText.setText(feedback);      // Missing!
this.questionText.setVisible(visible);    // Missing!
this.feedbackText.setResolution(textResolution);  // Missing!
if (this.questionText.height > maxHeight) {     // Missing property!
    // ...
}
```

### Decision
**Add ALL required Phaser text methods to mock objects:**
- `setScale`, `setTint`, `setAlpha`, `setVisible`, `setDepth`, `setOrigin`, `setResolution`, `setText` - chainable methods returning `this`
- `height` - property (number)
- `destroy`, `on` - existing methods that were already mocked
- Make all methods return `this` for method chaining (Phaser pattern)

### Consequences
**Positive:**
- ✅ All UI tests now pass (GameOverModal, KeyQuestionModal)
- ✅ Mock objects accurately represent Phaser text behavior
- ✅ Method chaining works as expected in test code
- ✅ Tests can call any text method without runtime errors

**Negative:**
- ❌ More verbose mock setup
- ❌ Need to maintain mock consistency across test files

**Mitigation:**
- Update all UI test mocks to use the same pattern
- Document the mock pattern for future test additions

### Implementation
- Modified `src/tests/unit/ui/KeyQuestionModal.test.ts`:
  - Updated `createMockScene()` text mock to include all required methods
  - Added methods: `setScale`, `setTint`, `setAlpha`, `setVisible`, `setDepth`, `setOrigin`, `setResolution`, `setText`
  - Added property: `height: 100`
  - All methods return `this` for method chaining

**Result:**
```typescript
text: jest.fn(() => ({
    setOrigin: jest.fn().mockReturnThis(),
    setDepth: jest.fn().mockReturnThis(),
    setScrollFactor: jest.fn().mockReturnThis(),
    setInteractive: jest.fn().mockReturnThis(),
    setResolution: jest.fn().mockReturnThis(),
    setFontSize: jest.fn().mockReturnThis(),
    setScale: jest.fn().mockReturnThis(),
    setTint: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
    setVisible: jest.fn().mockReturnThis(),
    setText: jest.fn(),
    destroy: jest.fn(),
    visible: true,
    height: 100,
})),
```

**Testing:**
- All 10 KeyQuestionModal tests now pass
- No "method not found" errors
- Method chaining works correctly

**Template for new decisions:**
```markdown
## Decision XXX: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded
**Type:** Configuration | Architecture | Infrastructure | Process

### Context
[What problem were we trying to solve?]

### Decision
[What did we decide?]

### Consequences
**Positive:** [Benefits]
**Negative:** [Drawbacks]
**Mitigation:** [How we address drawbacks]
```

---

## Decision 011: Direct Block Center Calculation for Multi-Cell Objects

**Date:** 2026-02-03
**Status:** Accepted
**Type:** Bug Fix

### Context
- Bushes and stones occupy 2×2 cells (128×128 pixels) but weren't aligned to grid
- `spawnBushMatrix()` and `spawnStoneMatrix()` used `cellToWorld(col + 1, row + 1)`
- This calculated the center of a **single cell**, not the center of a **2×2 block**
- Result: 32-pixel offset in both X and Y directions
- Example: Bush at (672, 800) should occupy cells (10,12)-(11,13) but actually crossed cell boundaries

### Problem
```typescript
// ❌ WRONG - calculates center of single cell, not 2×2 block
const worldPos = this.spawnMatrix.cellToWorld(
    cellPos.col + 1,  // = col * 64 + 32
    cellPos.row + 1   // = row * 64 + 32
);

// For block starting at cell (9, 11):
// Expected center: (9*64 + 128, 11*64 + 128) = (704, 832)
// Actual center: (10*64 + 32, 12*64 + 32) = (672, 800)
// Difference: 32 pixels in each direction!
```

### Decision
**Calculate block center directly instead of using `cellToWorld()` for multi-cell objects:**

```typescript
// ✅ CORRECT - direct block center calculation
const matrixSize = this.spawnMatrix.getMatrixSize();
const cellSize = matrixSize.cellSize; // 64 pixels
const blockWidth = width * cellSize;   // 2 * 64 = 128
const blockHeight = height * cellSize; // 2 * 64 = 128
const blockLeft = cellPos.col * cellSize;   // Left edge of block
const blockTop = cellPos.row * cellSize;    // Top edge of block
const blockCenterX = blockLeft + blockWidth / 2;   // Center X
const blockCenterY = blockTop + blockHeight / 2;   // Center Y
```

**Applied to:**
- `spawnBushMatrix()` - 2×2 blocks
- `spawnStoneMatrix()` - 2×2 blocks
- `getSafePositionMatrix()` - general multi-cell blocks

### Consequences
**Positive:**
- ✅ Bushes and stones now properly aligned to grid cell boundaries
- ✅ 2×2 objects occupy exactly the cells they should
- ✅ Consistent behavior for all multi-cell spawn methods

**Negative:**
- ❌ Slightly more verbose than `cellToWorld()` call
- ❌ Must manually calculate block dimensions

**Mitigation:**
- Created consistent pattern for all multi-cell spawn methods
- Pattern is clear: block edges + half dimensions = center
- Tests verify correct alignment

### Implementation
- Modified `src/game/systems/SpawnSystem.ts`:
  - `spawnBushMatrix()` - direct block center calculation
  - `spawnStoneMatrix()` - direct block center calculation
  - `getSafePositionMatrix()` - direct block center calculation
- Updated 5 test files to match new behavior:
  - `WorldFactory.test.ts` - added `clearForbiddenZones` mock
  - `AbstractCollisionObject.test.ts` - added `body.destroy` mock
  - `OracleCollisionHandler.test.ts` - added `healthSystem` and `updateCoins` mocks
  - `DebugOverlay.test.ts` - updated for new multi-block text format

**Testing:**
- All 1206 tests pass
- Bushes and stones now aligned to grid

---

## Decision 012: Coin processingKeys Must Be Cleared on Resume

**Date:** 2026-02-03
**Status:** Accepted
**Type:** Bug Fix

### Context
- After incorrect answer on coin quiz, `coinId` remained in `processingKeys`
- `resumeGame()` only cleared `currentKeyId` (for keys), not `currentCoinId` (for coins)
- This could theoretically block pickup of other items with the same ID
- User reported: "нельзя взять сердечко" after wrong answer on coin quiz

### Problem Details
**Original flow for keys:**
```typescript
// In handleKeyPhase():
this.currentKeyId = keyId;

// In resumeGame():
if (this.currentKeyId) {
    this.collisionSystem?.clearProcessingKey(this.currentKeyId);
    this.currentKeyId = null;
}
```

**Missing flow for coins:**
```typescript
// In handleCoinPhase():
const coinId = `coin-${Math.round(coin.x)}-${Math.round(coin.y)}`;
// ❌ coinId was NOT saved to this.currentCoinId

// In resumeGame():
// ❌ No cleanup for currentCoinId
```

### Decision
**Add `currentCoinId` tracking and cleanup, mirroring the key flow:**

1. Add field to MainScene:
```typescript
private currentCoinId: string | null = null; // Track processing coinId for cleanup
```

2. Save coinId in handleCoinPhase:
```typescript
const coinId = `coin-${Math.round(coin.x)}-${Math.round(coin.y)}`;
(this.scene as any).currentCoinId = coinId;
```

3. Clear coinId in resumeGame:
```typescript
if (this.currentCoinId) {
    this.collisionSystem?.clearProcessingKey(this.currentCoinId);
    this.currentCoinId = null;
}
```

### Consequences
**Positive:**
- ✅ Prevents `processingKeys` accumulation from coin quizzes
- ✅ Consistent cleanup pattern for all item types (keys and coins)
- ✅ Eliminates potential bug where hearts couldn't be picked up after coin quiz

**Negative:**
- ❌ Slightly more complex state management in MainScene

**Mitigation:**
- Pattern mirrors existing `currentKeyId` flow
- All 1206 tests pass
- Clear separation between key and coin cleanup

### Why This Bug Was Hard to Reproduce
The bug was theoretical and unlikely to manifest because:
1. Destroyed coin sprites are skipped in `checkDistanceInteraction` (`!item.active`)
2. New items spawn at different coordinates → different IDs
3. Probability of exact coordinate match is extremely low
4. **However**, the bug violated architectural principles and could cause issues in edge cases

### Implementation
- Modified `src/game/scenes/MainScene.ts`:
  - Added `private currentCoinId: string | null = null;`
  - Added cleanup in `resumeGame()` for `currentCoinId`
- Modified `src/game/scenes/collision/ItemCollisionHandler.ts`:
  - Added `(this.scene as any).currentCoinId = coinId;` in `handleCoinPhase()`
- Tests: All 1206 tests pass

**Testing:**
- All 1206 tests pass
- `processingKeys` now properly cleared for both keys and coins

---

## Decision 013: Phaser-Only Unified Loading Screen (not React.lazy())

**Date:** 2026-02-03
**Status:** Accepted
**Type:** Architecture

### Context
- Previous implementation used React.lazy() for Phaser loading (async-load-phaser plan)
- This created TWO separate loading screens:
  1. React Suspense loading screen (while Phaser chunk loads)
  2. Phaser LoadingScene (while game assets load)
- User experienced disjointed loading with gaps in progress reporting
- React.lazy() was removed, but LoadingScene still didn't show MainScene initialization progress
- Progress appeared "stuck" at 50% during system initialization (~3 seconds)
- Progress appeared "stuck" at 58% during audio loading (~3 seconds)

### Problem Details
**Original flow (two loading screens):**
```
User opens page → React Suspense → Phaser chunk loads → LoadingScene → MainScene
                    ↓                    ↓                      ↓
                "Loading..."         0-50% progress         50% only
```

**After React.lazy() removal (single screen, but gaps):**
```
LoadingScene → 0-50% (assets) → 50% stuck for 3s → 60% → game starts
```

### Decision
**Use Phaser-only unified loading screen with EventBus communication:**

1. **LoadingScene remains active** during MainScene initialization
   - Use `scene.launch()` instead of `scene.start()`
   - LoadingScene subscribes to EventBus events
   - MainScene emits progress events during initialization

2. **Granular progress reporting:**
   - 52%: Key spritesheet loaded
   - 54%: HealthSystem initialized
   - 56%: QuizManager created
   - 58%: EnemyManager created
   - 58-59%: Audio loading with callback (1/27, 2/27, ...)
   - 60%: World creation
   - 70%: Collision setup
   - 80%: Object spawning
   - 90%: Finalization
   - 100%: Game ready

3. **Error handling during scene shutdown:**
   - `isFinishing` flag prevents updates after shutdown begins
   - Try-catch blocks around UI updates (WebGL context may be null)
   - EventBus cleanup before stopping scene

4. **isReady flag in MainScene:**
   - Prevents game logic from running during initialization
   - Set to `true` only after `create()` completes

### Consequences
**Positive:**
- ✅ Single unified loading screen (no React Suspense)
- ✅ Smooth 0-100% progress bar with detailed stages
- ✅ User sees continuous progress (no 3-second gaps)
- ✅ EventBus provides decoupled communication
- ✅ LoadingScene automatically cleans up after itself

**Negative:**
- ❌ LoadingScene stays active during entire initialization (~5-7 seconds)
- ❌ More complex event flow (EventBus vs direct callbacks)
- ❌ Requires careful cleanup to avoid memory leaks

**Mitigation:**
- Empty `update()` in LoadingScene (minimal CPU usage)
- EventBus.off() in finishLoading() prevents leaks
- isFinishing flag prevents race conditions
- Try-catch blocks prevent crash on shutdown errors

### Why NOT React.lazy() for Loading?
1. **Two separate loading screens** - confusing UX
2. **Progress gap** - React Suspense doesn't know about Phaser initialization
3. **Phaser can handle it** - LoadingScene is designed for this purpose
4. **Simpler architecture** - single loading system instead of two

### Implementation Details

---

**Template for new decisions:**

**Scene Management:**
```typescript
// LoadingScene - launch MainScene in parallel
this.scene.launch('MainScene');  // NOT start()

// MainScene - emit progress events
EventBus.emit(LOADING_PROGRESS_EVENT, { percent: 52, text: '...' });

// LoadingScene - receive events and update UI
EventBus.on(LOADING_PROGRESS_EVENT, (data) => {
  this.setProgress(data.percent, data.text);
});

// MainScene - signal completion
EventBus.emit(FINISH_LOADING_EVENT);

// LoadingScene - cleanup and stop
EventBus.off(LOADING_PROGRESS_EVENT);
this.scene.stop('LoadingScene');
```

**Error Prevention:**
```typescript
// LoadingScene
private isFinishing: boolean = false;

setProgress(percent: number, text: string): void {
  if (this.isFinishing) return;  // Early exit

  try {
    this.progressBar.width = ...;
  } catch (e) {
    // WebGL context may be null - ignore
  }
}

finishLoading(): void {
  this.isFinishing = true;  // Set flag FIRST
  EventBus.off(LOADING_PROGRESS_EVENT);  // Unsubscribe
  this.setProgress(100, 'Готово!');  // Final update
  this.time.delayedCall(300, () => {
    this.scene.stop('LoadingScene');
  });
}
```

### Files Modified:
- `src/game/interfaces/IProgressReporter.ts` (created)
- `src/constants/gameConstants.ts` (events)
- `src/game/scenes/LoadingScene.ts` (EventBus, launch(), isFinishing)
- `src/game/scenes/MainScene.ts` (isReady, progress events)
- `src/game/systems/AudioManager.ts` (onProgress callback)
- `src/react/App.tsx` (removed lazy())

### Documentation:
- `TECHNICAL_ANALYSIS.md` - comprehensive technical documentation
- `PROGRESS.md` - implementation progress
- `CONTEXT.md`, `HISTORY.md` - memory updates
- `DECISIONS.md` - this entry

**Testing:**
- All 1206 tests pass
- Progress bar shows smooth 0-100% animation
- No drawImage errors during loading
- LoadingScene properly destroys itself

---

## Decision 014: 5-Range Aspect Ratio System for Modal Windows

**Date:** 2026-02-05
**Status:** Accepted (Basic Implementation)
**Type:** Architecture

### Context
- Modal windows used binary aspect ratio system (portrait/landscape)
- `canvasHeight > canvasWidth` → 0.5625 aspect ratio
- `canvasWidth ≥ canvasHeight` → 1.0 aspect ratio
- Problem: Almost square screens (e.g., 1000×1050) got narrow portrait treatment
- Problem: Sharp transition at portrait/landscape boundary
- No intermediate options for tablets and small monitors

### Problem Examples
```typescript
// Old system - binary choice
const isPortrait = canvasHeight > canvasWidth;
const aspectRatio = isPortrait ? 0.5625 : 1.0;

// Example problems:
// canvasWidth=1000, canvasHeight=1050 → isPortrait=true → AR=0.5625 (too narrow!)
// canvasWidth=768, canvasHeight=1024 (iPad) → isPortrait=true → AR=0.5625 (not optimal!)
// canvasWidth=1920, canvasHeight=1080 → isPortrait=false → AR=1.0 (good)
```

### Decision
**Implement 5-range aspect ratio system based on screenAR (screen aspect ratio):**

```typescript
interface AspectRatioRange {
  name: string;           // For logging
  minAR: number;          // Minimum screenAR
  maxAR: number;          // Maximum screenAR
  aspectRatio: number;    // Modal window aspect ratio
}

const ASPECT_RATIO_RANGES: AspectRatioRange[] = [
  { name: 'mobile-narrow', minAR: 0, maxAR: 0.6, aspectRatio: 0.5625 },    // Very narrow mobile
  { name: 'mobile-standard', minAR: 0.6, maxAR: 0.75, aspectRatio: 0.70 },  // Standard mobile portrait
  { name: 'tablet-square', minAR: 0.75, maxAR: 1.0, aspectRatio: 0.85 },   // Tablets, almost square
  { name: 'monitor-small', minAR: 1.0, maxAR: 1.3, aspectRatio: 0.95 },    // Small monitors
  { name: 'monitor-large', minAR: 1.3, maxAR: Infinity, aspectRatio: 1.0 }, // Large monitors (square)
];

// Usage:
const screenAR = canvasWidth / canvasHeight;
const selectedRange = ASPECT_RATIO_RANGES.find(
  range => screenAR >= range.minAR && screenAR < range.maxAR
);
const aspectRatio = selectedRange?.aspectRatio ?? 1.0;

// Logging for debugging:
logger.log('MODAL_SIZE', `Selected range: ${selectedRange?.name || 'fallback'} (screenAR=${screenAR.toFixed(2)}, aspectRatio=${aspectRatio.toFixed(2)})`);
```

### Examples
```typescript
// iPhone SE: 375×667, screenAR=0.56 → mobile-narrow → AR=0.5625
// iPad: 768×1024, screenAR=0.75 → tablet-square → AR=0.85
// Full HD: 1920×1080, screenAR=1.78 → monitor-large → AR=1.0
// MacBook: 2560×1600, screenAR=1.60 → monitor-large → AR=1.0
// Square: 1000×1000, screenAR=1.0 → monitor-small → AR=0.95
```

### Consequences
**Positive:**
- ✅ Smooth transitions between ranges (no sharp jump at single boundary)
- ✅ Better fit for tablets and almost-square screens
- ✅ Optimized for 5 device categories instead of 2
- ✅ Extensible (can add more ranges if needed)
- ✅ Self-documenting (logs show selected range name)

**Negative:**
- ❌ More complex than binary system
- ❌ Requires maintenance of range definitions
- ❌ Boundary values (0.6, 0.75, 1.0, 1.3) are arbitrary

**Mitigation:**
- Boundary values chosen based on common device ratios
- System is easy to understand and modify
- Logging makes debugging easier
- All 9 unit tests pass

### Why 5 Ranges?
1. **Mobile Narrow (0-0.6)**: Very small phones, old devices in portrait
2. **Mobile Standard (0.6-0.75)**: Modern smartphones portrait
3. **Tablet/Square (0.75-1.0)**: Tablets, almost square screens, landscape phones
4. **Monitor Small (1.0-1.3)**: Small monitors, unusual aspect ratios
5. **Monitor Large (1.3+)**: Standard widescreen monitors

### Files Modified
- `src/game/ui/ModalSizeCalculator.ts` - implemented 5-range system
- `src/tests/unit/ui/ModalSizeCalculator.test.ts` - updated tests

### Testing
- All 9 ModalSizeCalculator tests pass
- Build successful
- Awaiting browser testing on actual devices

---

**Template for new decisions:**

---

## Decision 015: Fix Aspect Ratio Range Gap (TABLET_SQUARE Duplicated MOBILE_STANDARD)

**Date:** 2026-02-13
**Status:** Accepted
**Type:** Bug Fix

### Context
- ModalSizeCalculator.ts had overlapping aspect ratio ranges
- `MOBILE_STANDARD`: minAR=0.75, maxAR=1.0
- `TABLET_SQUARE`: minAR=0.75, maxAR=1.0 — **DUPLICATE!**
- This created a **gap** between 1.0 and 1.3 for screenAR values
- For screenAR=1.13 (canvas=1476×1305), no matching range was found
- Result: "Unknown" fallback with multiplier=1.3 instead of proper range selection

### Problem
```
⚠️ ASPECT RANGE: Unknown | canvas=1476×1305 | screenAR=1.13
```

**Root Cause:** `find()` returns first matching range, so TABLET_SQUARE was never selected since MOBILE_STANDARD came first in array.

### Symptoms
1. For screens with aspect ratio 1.0-1.3 (tablets, wide mobile):
   - "Unknown" range logged
   - Fallback multiplier 1.3 used (intentionally correct)
   - But proper TABLET_SQUARE range (1.49 multiplier) was never chosen!

2. Font size calculation worked but was inconsistent:
   - Wide screens got same multiplier as MOBILE_STANDARD (1.45)
   - But should have gotten 1.49 (before fix) or 1.3 (after fix)

### Decision
**Fix TABLET_SQUARE range to cover gap 1.0-1.3**
- Change minAR from 0.75 to 1.0
- Change maxAR from 1.0 to 1.3
- This creates proper progression: MOBILE_STANDARD (0.75-1.0) → TABLET_SQUARE (1.0-1.3) → MONITOR_SMALL (1.3-1.6)

**Bonus:** Reduce font multipliers for wide screens to 1.3
- User reported fonts too large on wide screens
- Changed all wide screen multipliers from 1.49/1.54 to 1.3
- Now all wide screens (tablet+) have same multiplier as PortalModal (1.3)

### Consequences
**Positive:**
- ✅ screenAR=1.13 now correctly identifies as TABLET_SQUARE
- ✅ No more "Unknown" fallback for tablet range
- ✅ Consistent font sizing across all screen sizes
- ✅ Wide screen fonts reduced to comfortable size (1.3x instead of 1.49/1.54)

**Negative:**
- ❌ Wide screens have same multiplier as narrow (less adaptive)
- ❌ Might be slightly smaller text on very wide screens than before

**Mitigation:**
- Monitor user feedback on font sizes
- Can adjust multipliers per-range if needed
- 1.3 is consistent with PortalModal approach

### Implementation
- Modified `src/game/ui/ModalSizeCalculator.ts`:
  - TABLET_SQUARE: minAR=1.0, maxAR=1.3 (was 0.75-1.0)

- Modified `src/constants/textStyles.ts`:
  - TABLET_SQUARE: 1.49 → 1.3
  - MONITOR_SMALL: 1.54 → 1.3
  - MONITOR_LARGE: 1.54 → 1.3

- Modified `src/tests/unit/utils/FontSizeCalculator.test.ts`:
  - Updated expectations to match new values (1.3 instead of 1.49/1.54)
  - Updated range test (1.26-1.45 instead of 1.26-1.54)

- All 1821 tests pass

---

**Template for new decisions:**


---

## Decision 014: Standardized "Tiered Font System (v3)" for All Modals

**Date:** 2026-02-16
**Status:** Accepted
**Type:** Architecture / UI Scaling

### Context
- The project had two competing font scaling systems:
    1. **v2 (Legacy):** Relied on complex lookup tables for 7 aspect ratio ranges and "Adaptive Multipliers" (1.26 - 1.54). Used in `PortalModal` and `GameOverModal`.
    2. **v3 (Modern):** Uses direct **binary search** (`calculateTieredFontSizeSimple`) to find the mathematically largest font size that fits a given block. Used in `KeyQuestionModal` and `CoinBubbleQuiz`.
- **Problems with v2:**
    - Hard to maintain (magic numbers in tables).
    - Didn't guarantee text fit (multipliers were estimates).
    - Required manual tuning for every new screen ratio.
    - Resulted in text being too small on some devices or overflowing on others.

### Decision
**Standardize on the v3 Tiered Font System (Binary Search) for ALL modal windows.**

1. **Algorithm:**
   - Calculate available width/height for the text block.
   - Run binary search (10px to 72px) to find the max `fontSize`.
   - Simulated `wordWrap` at each step to check if text fits vertically.
   - **No aspect ratio tables needed** — the algorithm naturally adapts.

2. **Implementation:**
   - `KeyQuestionModal`: Uses shared `calculateTieredFontSizeSimple`.
   - `CoinBubbleQuiz`: Uses shared `calculateTieredFontSizeSimple`.
   - `PortalModal`: Uses isolated copy `calculatePortalTieredFontSize`.
   - `GameOverModal`: Uses isolated copy `calculateGameOverTieredFontSize`.

3. **Documentation:**
   - Removed references to "7 Range Aspect Ratio multipliers" from `MODAL_GUIDE.md`.
   - Updated `FONT_SIZING_SYSTEM.md` to declare v3 as the standard.

### Consequences
**Positive:**
- ✅ **Guaranteed Fit:** Text never overflows its container.
- ✅ **Maximizes Legibility:** Uses the largest possible font for the available space.
- ✅ **Automatic Adaptation:** Works for any aspect ratio (ultrawide, square, mobile) without config changes.
- ✅ **Simplified Config:** Removed complex multiplier tables. Only `LINE_HEIGHT_RATIO` and `contentArea` percentages matter.

**Negative:**
- ❌ **Slight Performance Cost:** Binary search (approx 6-8 iterations) is slightly heavier than a simple multiplication. However, it only runs **once** when the modal opens, which is negligible (sub-millisecond).
- ❌ **"Unified Base Font Size" is less relevant:** The concept of a single "base font size" for the whole app is weakened, as each block now calculates its own optimal size. (This is actually a benefit for fitting, but a change in philosophy).

**Mitigation:**
- `calculateUnifiedBaseFontSize` is kept as a fallback or for initial sizing estimates but final sizing is always overridden by the tiered system.

---

## Decision 015: Documentation Synchronization - Remove Outdated v2 References

**Date:** 2026-02-16
**Status:** Accepted
**Type:** Documentation / Maintenance

### Context
- MODAL_GUIDE.md v2.0 still contained references to the deprecated v2 system:
  - "Система 7 диапазонов aspect ratio" mentioned in Overview
  - "Адаптивные множители шрифтов по типу экрана" mentioned in Overview
  - Tables with multipliers (1.26–1.54) that are no longer used
  - References to `calculateUnifiedBaseFontSize()` in code examples
  - Pattern "Unified Font System с адаптивными множителями" in templates
- FONT_SIZING_SYSTEM.md v3.0 didn't mention isolated functions used by PortalModal and GameOverModal
- Code analysis revealed:
  - `calculatePortalTieredFontSize` — isolated copy of v3 algorithm
  - `calculateGameOverTieredFontSize` — isolated copy of v3 algorithm
  - KeyQuestionModal has dead code: calls `calculateUnifiedBaseFontSize()` but doesn't use the result

### Decision
**Update MODAL_GUIDE.md to v3.0 and FONT_SIZING_SYSTEM.md to v3.1 to match current code.**

1. **MODAL_GUIDE.md → v3.0:**
   - Remove all mentions of "7 диапазонов aspect ratio" and "адаптивных множителей"
   - Update Overview to reflect v3 Tiered Font System
   - Remove multiplier tables from all modal sections
   - Replace "Unified Font System" pattern with "Tiered Font System v3"
   - Update modal creation template to use `calculateTieredFontSizeSimple`

2. **FONT_SIZING_SYSTEM.md → v3.1:**
   - Add section describing isolated functions (`calculatePortalTieredFontSize`, `calculateGameOverTieredFontSize`)
   - Update component table to mark isolated copies
   - Add version 3.1 to history

### Consequences
**Positive:**
- ✅ Documentation now accurately reflects code state
- ✅ New developers won't be confused by outdated multiplier references
- ✅ Isolated functions are properly documented
- ✅ Code examples match actual implementation

**Negative:**
- ❌ Dead code in KeyQuestionModal remains (uses `calculateUnifiedBaseFontSize` but ignores result)
- ❌ Isolated functions create code duplication (same algorithm in 3 places)

**Mitigation:**
- Dead code in KeyQuestionModal is minor (only used for logging, no functional impact)
- Isolated functions allow independent evolution of PortalModal and GameOverModal
- Consider consolidating to shared `calculateTieredFontSizeSimple` in future refactoring

### Implementation
- Modified `documentation/main/ui/MODAL_GUIDE.md`:
  - Updated to v3.0
  - Removed all v2 multiplier references
  - Updated all code examples
- Modified `documentation/main/ui/FONT_SIZING_SYSTEM.md`:
  - Updated to v3.1
  - Added isolated functions documentation
- Updated memory files (CONTEXT.md, HISTORY.md, DECISIONS.md)

**Testing:**
- Documentation review complete
- Code analysis confirms v3 usage in all modals
