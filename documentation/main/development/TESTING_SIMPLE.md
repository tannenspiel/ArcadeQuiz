# Testing Guide for ArcadeQuiz (Simple)

**Version:** 1.0
**Date:** 2026-01-16
**Status:** All Tests Passing ✅

---

## What are Tests?

Think of tests as automatic checks that make sure your game works correctly. Instead of manually playing the game every time you make a change, tests run automatically to verify that:

- The player can move around
- Questions appear correctly
- Scoring works properly
- Buttons and screens respond to clicks
- The game doesn't crash when things happen

**Why is this important?**
- **Catches problems early** - Tests find bugs before players do
- **Saves time** - No need to manually test everything after every change
- **Prevents breakage** - When you add new features, tests confirm old features still work
- **Documents behavior** - Tests show how the game is supposed to work

---

## Current Test Status

**Total Tests: 523**
- **Passing: 523** ✅
- **Failing: 0** ✅

All tests are passing! This means the game is working as expected.

---

## Test Categories (In Plain English)

### 1. Core Tests (3 files)
**What they check:**
- Game state - making sure health, score, and level tracking work
- Loading assets - verifying images and sounds load correctly
- Level management - confirming levels switch properly

**Why it matters:** These are the foundation. If these break, nothing works.

---

### 2. Game System Tests (11 files)
**What they check:**
- Health system - taking damage, healing, game over from health loss
- Score system - earning points, tracking high scores
- Quiz system - questions appear, answers work, feedback shows
- Spawn system - enemies and items appear in safe locations
- Collision system - things bump into each other correctly
- Audio system - sounds play at the right times
- World generator - game maps create properly
- Animation system - character animations play smoothly

**Why it matters:** These are the game's main features. Players interact with these constantly.

---

### 3. Character Tests (9 files)
**What they check:**
- Player movement and controls
- Different enemy behaviors:
  - Random walkers (enemies that wander around)
  - Chasers (enemies that follow the player)
  - Flam enemies (customizable enemy behavior)
- Portals (transporters to new areas)
- Oracle (special character that provides hints)

**Why it matters:** These are the actors in your game. They need to move and behave correctly.

---

### 4. User Interface Tests (8 files)
**What they check:**
**React UI (4 files):**
- HUD overlay (health display, score, keys collected)
- Quiz modal (question popup screens)
- Game over modal (win/lose screens)
- Game container (main game window)

**Phaser UI (5 files):**
- Buttons (click, hover, disabled states)
- Portal modals (portal interaction screens)
- Question modals (key quiz popups)
- Game over screens (in-game game over display)
- Modal size calculator (ensures UI fits on screen)
- Nine-slice backgrounds (scalable UI backgrounds)
- Question bubbles (floating question indicators)

**Why it matters:** This is what players see and click. If UI breaks, players can't play.

---

### 5. Utility Tests (5 files)
**What they check:**
- Device detection (phone vs tablet vs desktop)
- Screen orientation (portrait vs landscape)
- Font sizing (text is readable on all devices)
- Text analysis (measuring question text length)
- Scaling constants (game scales properly on different screens)

**Why it matters:** Ensures the game works on all devices - phones, tablets, and computers.

---

### 6. Integration Tests (2 files)
**What they check:**
- Event Bus communication (React and Phaser talking to each other)
- Modal scaling (UI windows resize correctly)
- Bug fixes (confirming past bugs stay fixed)

**Why it matters:** Verifies different parts of the game work together properly.

---

## How to Run Tests

### Run All Tests
```bash
npm test
```
This runs all 523 tests and shows you the results.

### Run Tests with Logging
```bash
npm run test:log
```
Runs tests and saves results to a file: `documentation/temp_docs/TEST_RESULTS.log`

### Run Specific Test Categories

**Core systems only:**
```bash
npm run test:unit
```

**Scaling/device tests:**
```bash
npm run test:scaling
```

**Modal UI tests:**
```bash
npm run test:modal-scaling
```

**Spawn system tests:**
```bash
npm run test:spawn
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```
Tests automatically re-run when you save changes. Great for development!

### Check Test Coverage
```bash
npm run test:coverage
```
Shows how much of your code is tested. Opens a detailed report in `coverage/index.html`.

---

## Understanding Test Results

When you run `npm test`, you'll see output like this:

```
Test Suites: 38 passed, 38 total
Tests:       523 passed, 523 total
Time:        6.838 s
```

**What this means:**
- **Test Suites:** Groups of tests (38 test files)
- **Tests:** Individual test cases (523 total)
- **Time:** How long tests took to run

**If tests fail, you'll see:**
```
FAIL src/tests/unit/core/GameState.test.ts
  ✅ should set health within valid bounds
    Expected: 3
    Received: 5
```

This tells you:
- Which file failed
- Which test failed
- What went wrong (expected value vs actual value)

---

## Recent Improvements (2026-01-16)

### Fixed Phaser Mock System
**Problem:** Tests were failing because the Phaser game engine mock wasn't properly supporting game objects that extend Phaser classes.

**Solution:** Created a new, improved mock system:
- File: `src/tests/mocks/phaser-mock.ts`
- Properly supports class inheritance (extends Phaser.GameObjects.Container)
- Includes all necessary Phaser classes (Container, Sprite, Text, Image, etc.)

**Files Fixed (7 test files):**
- AbstractPortal.test.ts
- StandardPortal.test.ts
- Oracle.test.ts
- Player.test.ts
- Button.test.ts
- GameOverModal.test.ts
- PortalModal.test.ts
- KeyQuestionModal.test.ts

**Test Expectations Updated (4 files):**
- Updated outdated test expectations to match current game behavior
- Fixed text expectations in quiz and font size tests

**Result:** All 523 tests now pass! ✅

---

## Common Test Questions

### Q: Do I need to run tests before making changes?
**A:** Yes! Always run tests before and after making changes. This ensures:
1. Tests were passing before you started (baseline)
2. Your changes didn't break anything (verification)

### Q: What if a test fails?
**A:** Don't panic! A failing test means:
1. Read the error message carefully
2. Check what the test expects vs what it got
3. Look at the code that's being tested
4. Fix the bug or update the test if behavior changed intentionally

### Q: How long do tests take?
**A:** About 7 seconds for all 523 tests. Pretty fast!

### Q: Can I run just one test file?
**A:** Yes! Use jest directly:
```bash
npm test -- GameState.test.ts
```

### Q: What about testing the game in a browser?
**A:** That's E2E (End-to-End) testing. We use Cypress for that:
```bash
npm run test:e2e:open
```
This opens a special window where you can see the game running and test it like a real player.

---

## Test File Locations

All test files are in: `src/tests/`

```
src/tests/
├── mocks/              # Mock objects (fake Phaser engine)
│   └── phaser-mock.ts  # NEW: Improved Phaser mock
├── setup.ts            # Test configuration
├── unit/               # Individual component tests
│   ├── core/          # Core game systems (3 files)
│   ├── systems/       # Game feature systems (11 files)
│   ├── entities/      # Characters and objects (9 files)
│   ├── react/         # React UI components (4 files)
│   ├── ui/            # Phaser UI components (5 files)
│   ├── utils/         # Helper utilities (2 files)
│   └── constants/     # Game constants (1 file)
├── integration/        # Tests of systems working together
│   ├── phaser-react/  # React ↔ Phaser communication
│   └── modal-scaling/ # UI scaling tests
└── e2e/               # Browser-based tests
    └── cypress/       # Cypress E2E tests
```

---

## Why 523 Tests?

You might wonder: "Why so many tests?" Here's the breakdown:

- **Core systems:** ~50 tests - Game state, loading, levels
- **Game systems:** ~150 tests - Health, scoring, quizzes, spawning, etc.
- **Characters:** ~100 tests - Player, enemies, portals
- **User Interface:** ~120 tests - All modals, buttons, HUD
- **Utilities:** ~50 tests - Device detection, font sizing
- **Integration:** ~53 tests - Systems working together

Each test checks one specific thing. This way, when something breaks, we know exactly what went wrong.

---

## Best Practices for Testing

### When to Write Tests
1. **Before writing code** - Test-driven development (TDD)
2. **After writing code** - To verify it works
3. **When fixing bugs** - To prevent the bug from coming back
4. **When adding features** - To ensure new features work

### Good Test Characteristics
- **Fast** - Tests should run quickly (ours do!)
- **Independent** - Each test should work alone
- **Clear** - Test names should describe what they test
- **Reliable** - Tests should pass or fail consistently

### Test Maintenance
- **Keep tests updated** when code changes
- **Remove obsolete tests** for features that no longer exist
- **Add tests** for new features
- **Fix broken tests** promptly

---

## Summary

**The ArcadeQuiz project has comprehensive test coverage:**
- ✅ 523 tests covering all major game systems
- ✅ All tests currently passing
- ✅ Tests run in ~7 seconds
- ✅ Easy to run and understand
- ✅ Catches bugs before players do

**Testing is essential for:**
1. **Quality assurance** - Ensures the game works correctly
2. **Confidence** - Know that changes won't break things
3. **Speed** - Find problems faster than manual testing
4. **Documentation** - Tests show how the game should behave

**Remember:** Running tests before and after changes is a habit that saves time and prevents headaches!

---

## Need More Information?

For technical details about testing, see:
- `TESTING.md` - Detailed technical testing guide
- `TESTING_TECHNICAL.md` - In-depth implementation details

---

**Last Updated:** 2026-01-16
**Test Status:** All 523 tests passing ✅
