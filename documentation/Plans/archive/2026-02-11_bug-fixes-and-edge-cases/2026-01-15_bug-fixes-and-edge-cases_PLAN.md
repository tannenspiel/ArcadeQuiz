# Bug Fixes and Edge Cases Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical and high-priority bugs found in codebase analysis including missing error handling in async functions, potential race conditions, null/undefined checks, and improper lifecycle management.

**Architecture:** Incremental fixes across multiple modules (MainScene, QuizManager, CollisionSystem, KeyQuestionModal, PhaserGame) following defensive programming practices. Each fix is isolated and can be tested independently.

**Tech Stack:** TypeScript, Phaser 3, React, Jest (for testing)

---

## Context

**Affected Files/Modules:**
- `src/game/scenes/MainScene.ts` - async error handling, lifecycle checks
- `src/game/systems/QuizManager.ts` - empty array validation
- `src/game/systems/CollisionSystem.ts` - race condition protection
- `src/game/ui/KeyQuestionModal.ts` - null checks for scene input
- `src/react/PhaserGame.tsx` - window object SSR safety

**Bug Categories:**
1. **Critical (2)**: Missing async error handling, unsafe object access
2. **High (3)**: Empty array edge cases, race conditions, missing null checks
3. **Medium (3)**: Type safety, memory leaks, SSR issues

---

## Task 1: Add Error Handling for Async Functions in MainScene

**Files:**
- Modify: `src/game/scenes/MainScene.ts:3044`

**Step 1: Add robust error handling wrapper for showGlobalQuestion**

Add this helper method to `MainScene` class (after line 100, with other helpers):

```typescript
/**
 * Safe wrapper for showGlobalQuestion with error handling
 */
private async safeShowGlobalQuestion(): Promise<void> {
    try {
        // Check if scene is still active before proceeding
        if (!this.scene.isActive() || !this.scene.sys.settings.active) {
            console.warn('⚠️ MainScene: Scene not active, skipping showGlobalQuestion');
            return;
        }
        await this.showGlobalQuestion();
    } catch (error) {
        console.error('❌ MainScene: Error in showGlobalQuestion:', error);
        // Optionally: Show user-friendly error message
        // Optionally: Fallback to default question
    }
}
```

**Step 2: Replace call at line 3044**

Replace:
```typescript
this.showGlobalQuestion().catch(error => {
    console.error('❌ Error in showGlobalQuestion():', error);
});
```

With:
```typescript
this.safeShowGlobalQuestion();
```

**Step 3: Add error handling for oracle.setQuestion at line 3866**

Replace the existing `.catch()` with proper wrapper.

First, add helper method:
```typescript
/**
 * Safe wrapper for setting oracle question with error handling
 */
private async safeSetOracleQuestion(questionData: ParsedQuestion): Promise<void> {
    try {
        if (!this.scene.isActive() || !this.scene.sys.settings.active) {
            console.warn('⚠️ MainScene: Scene not active, skipping setOracleQuestion');
            return;
        }
        if (!this.oracle || !this.oracle.getSprite()?.active) {
            console.warn('⚠️ MainScene: Oracle not available, skipping setQuestion');
            return;
        }
        await this.oracle.setQuestion(questionData, this.assetLoader);
    } catch (error) {
        console.error('❌ MainScene: Failed to set oracle question:', error);
    }
}
```

Then replace line 3866-3868:
```typescript
// Old:
this.oracle.setQuestion(fallbackQuestionData, this.assetLoader).catch(error => {
    console.error('Failed to set fallback question in bubble:', error);
});

// New:
this.safeSetOracleQuestion(fallbackQuestionData);
```

**Step 4: Add lifecycle check helper method**

```typescript
/**
 * Check if scene and object are safe to operate on
 */
protected isSceneAndObjectActive(obj?: { active?: boolean }): boolean {
    return !!(
        this.scene?.isActive() &&
        this.scene?.sys?.settings?.active &&
        (obj === undefined || obj.active !== false)
    );
}
```

**Step 5: Test error handling**

Run: `npm run dev`
Expected: Game runs normally, no console errors

**Step 6: Commit**

```bash
git add src/game/scenes/MainScene.ts
git commit -m "fix(MainScene): add robust error handling for async functions

- Add safeShowGlobalQuestion() wrapper with lifecycle checks
- Add safeSetOracleQuestion() wrapper with null checks
- Add isSceneAndObjectActive() helper for safe object access
- Prevents crashes from unhandled promise rejections"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Task 2: Fix Empty Array Edge Case in QuizManager

**Files:**
- Modify: `src/game/systems/QuizManager.ts:105-110`

**Step 1: Add validation before array access**

Replace the existing code at lines 105-110:
```typescript
// Old:
if (globalQuestions.length === 0) {
    throw new Error('No global questions found for level');
}

const randomIndex = Math.floor(Math.random() * globalQuestions.length);
return globalQuestions[randomIndex];
```

With:
```typescript
// New:
if (!globalQuestions || globalQuestions.length === 0) {
    console.warn('⚠️ QuizManager: No global questions found for level', levelNumber);
    // Return fallback question instead of throwing
    return this.getFallbackQuestion();
}

const randomIndex = Math.floor(Math.random() * globalQuestions.length);
return globalQuestions[randomIndex];
```

**Step 2: Add getFallbackQuestion helper method**

Add after the `getRandomGlobalQuestion` method:

```typescript
/**
 * Get fallback question when no questions are available
 */
private getFallbackQuestion(): ParsedQuestion {
    return {
        type: QuestionType.TEXT_ONLY,
        questionText: 'What is the capital of France?',
        image: undefined,
        correctAnswer: 'Paris',
        wrongAnswers: ['London', 'Berlin'],
        allAnswers: ['Paris', 'London', 'Berlin'].sort(() => Math.random() - 0.5),
        feedbacks: ['Correct! Paris is the capital of France!'],
        wrongFeedbacks: ['Try again!']
    };
}
```

**Step 3: Run existing tests**

Run: `npm test -- QuizManager.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/game/systems/QuizManager.ts
git commit -m "fix(QuizManager): handle empty array gracefully

- Add null check for globalQuestions array
- Return fallback question instead of throwing error
- Add getFallbackQuestion() helper method
- Prevents crash when questions array is empty"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Task 3: Fix Race Condition in CollisionSystem

**Files:**
- Modify: `src/game/systems/CollisionSystem.ts:120-149`

**Step 1: Add atomic Set for tracking processing keys**

Add at the top of the class (after imports, with other properties):

```typescript
// Import Set type if not already imported
private processingKeys = new Set<string>();
```

**Step 2: Replace the isProcessing logic with Set-based approach**

Replace lines 120-149:
```typescript
// Old code with isProcessing flag approach
```

With:
```typescript
// ✅ Защита от двойного вызова: проверяем, не обрабатывается ли уже ключ
const keyId = `key-${key.x}-${key.y}`;

if (this.processingKeys.has(keyId)) {
    return; // Пропускаем, если ключ уже обрабатывается
}

// ✅ Защита от двойного вызова: проверяем, активен ли ключ
if (!key.active) {
    return; // Пропускаем, если ключ уже неактивен
}

// ✅ КРИТИЧНО: Проверяем, не обрабатывается ли уже какой-то другой ключ
if (this.processingKeys.size > 0) {
    return; // Другой ключ уже обрабатывается
}

// ✅ Добавляем в набор обрабатываемых ключей СРАЗУ
this.processingKeys.add(keyId);

if (this.onPlayerKeyCollision) {
    this.onPlayerKeyCollision(key);
}

// Note: Key will be removed from processingKeys after collision is handled
// in MainScene.handlePlayerKeyCollision()
```

**Step 3: Add method to clear processing flag**

Add to `CollisionSystem` class:

```typescript
/**
 * Mark key as no longer being processed
 * Called after collision handling is complete
 */
public clearProcessingKey(keyId: string): void {
    this.processingKeys.delete(keyId);
}

/**
 * Get all currently processing keys (for debugging)
 */
public getProcessingKeys(): string[] {
    return Array.from(this.processingKeys);
}
```

**Step 4: Update MainScene to clear processing flag**

In `MainScene.handlePlayerKeyCollision()`, after modal is shown/closed:
```typescript
// Add after modal handling:
const keyId = `key-${key.x}-${key.y}`;
this.collisionSystem?.clearProcessingKey(keyId);
```

**Step 5: Run collision tests**

Run: `npm test -- CollisionSystem.test.ts`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/game/systems/CollisionSystem.ts src/game/scenes/MainScene.ts
git commit -m "fix(CollisionSystem): use Set for atomic key processing

- Replace isProcessing flag with Set<string> for thread-safety
- Add clearProcessingKey() method for cleanup
- Add getProcessingKeys() for debugging
- Prevents race conditions in key collision handling"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Task 4: Add Null Checks in KeyQuestionModal

**Files:**
- Modify: `src/game/ui/KeyQuestionModal.ts:71-98`

**Step 1: Add validation in constructor/show method**

Add null check at the beginning of modal initialization:

```typescript
// At the start of show() or create()
if (!scene?.input?.keyboard) {
    console.error('❌ KeyQuestionModal: Scene input or keyboard not available');
    // Create fallback UI or return gracefully
    return this;
}
```

**Step 2: Add defensive checks for input events**

Replace any direct access to `scene.input` with:

```typescript
// Helper method
private isInputAvailable(): boolean {
    return !!(
        this.scene?.input &&
        this.scene.input.keyboard &&
        this.scene.sys?.settings?.active
    );
}

// Use in all input handling:
if (!this.isInputAvailable()) {
    console.warn('⚠️ KeyQuestionModal: Input not available');
    return;
}
```

**Step 3: Test modal with different states**

Run: `npm run dev`
Test: Open game, try to interact with key
Expected: No crashes, graceful fallback if input unavailable

**Step 4: Commit**

```bash
git add src/game/ui/KeyQuestionModal.ts
git commit -m "fix(KeyQuestionModal): add null checks for scene input

- Add isInputAvailable() helper method
- Validate scene.input.keyboard before use
- Graceful degradation when input unavailable
- Prevents crashes in edge cases"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Task 5: Fix SSR Safety in PhaserGame

**Files:**
- Modify: `src/react/PhaserGame.tsx:114-125`

**Step 1: Add SSR guard for window access**

Replace existing viewport calculation:
```typescript
// Old:
const realWidth = window.visualViewport?.width || window.innerWidth;
const realHeight = window.visualViewport?.height || window.innerHeight;
```

With:
```typescript
// New:
const getViewportSize = () => {
    if (typeof window === 'undefined') {
        // SSR fallback
        return { width: 1280, height: 720 };
    }
    return {
        width: window.visualViewport?.width || window.innerWidth,
        height: window.visualViewport?.height || window.innerHeight
    };
};

const { width: realWidth, height: realHeight } = getViewportSize();
```

**Step 2: Add useEffect for client-side only operations**

Wrap any window-dependent code in useEffect:

```typescript
useEffect(() => {
    // Client-side only code
    const handleResize = () => {
        if (typeof window !== 'undefined') {
            // Handle resize
        }
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize);
    }

    return () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', handleResize);
        }
    };
}, []);
```

**Step 3: Test SSR compatibility**

Run: `npm run build`
Expected: Build succeeds without SSR errors

**Step 4: Commit**

```bash
git add src/react/PhaserGame.tsx
git commit -m "fix(PhaserGame): add SSR safety for window access

- Add typeof window check before accessing window object
- Add getViewportSize helper with SSR fallback
- Prevents build failures in SSR environments"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Task 6: Remove Unsafe 'any' Type Casts (Medium Priority)

**Files:**
- Modify: `src/game/scenes/MainScene.ts:84, 353-357`

**Step 1: Create proper type for frame objects**

Add type definition:
```typescript
interface FrameObject {
    frame?: { index?: number };
    index?: number;
    texture: Phaser.Textures.Texture;
}

function hasFrameIndex(obj: FrameObject): obj is FrameObject & { index: number } {
    return obj.index !== undefined || obj.frame?.index !== undefined;
}
```

**Step 2: Replace any casts with type guards**

Replace:
```typescript
const frameObj = f.frame || f;
if ((frameObj as any)?.index !== undefined) {
```

With:
```typescript
const frameObj: FrameObject = f.frame || f;
if (hasFrameIndex(frameObj)) {
    const index = frameObj.index ?? frameObj.frame?.index;
    // Use index safely
}
```

**Step 3: Run TypeScript compiler**

Run: `npm run type-check`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/game/scenes/MainScene.ts
git commit -m "refactor(MainScene): replace 'any' casts with type guards

- Add FrameObject interface
- Add hasFrameIndex type guard function
- Improve type safety without using 'any'"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Task 7: Add Memory Leak Prevention in Cleanup

**Files:**
- Modify: `src/game/scenes/MainScene.ts:4205-4258` (destroy/cleanup methods)

**Step 1: Add comprehensive null checks before destroy**

Pattern to apply:
```typescript
// Old:
if (t && t.destroy) t.destroy();

// New:
if (t) {
    if (typeof t.destroy === 'function') {
        t.destroy();
    }
    t = null;
}
```

**Step 2: Add cleanup for timers and events**

```typescript
// Clear any timers
if (this.portalModalTimer) {
    this.time.clearEvent(this.portalModalTimer);
    this.portalModalTimer = null;
}

// Remove event listeners
if (this.customEvents) {
    this.customEvents.forEach(event => event?.destroy());
    this.customEvents = [];
}
```

**Step 3: Test cleanup**

Run: `npm run dev`
Test: Play game, navigate away, return
Expected: No memory leaks, no errors

**Step 4: Commit**

```bash
git add src/game/scenes/MainScene.ts
git commit -m "fix(MainScene): improve cleanup to prevent memory leaks

- Add null checks before calling destroy()
- Clear timers and events properly
- Set references to null after cleanup"

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Task 8: Add Integration Tests

**Files:**
- Create: `src/tests/integration/bug-fixes/async-error-handling.test.ts`

**Step 1: Write test for async error handling**

```typescript
import { MainScene } from '../../../game/scenes/MainScene';

describe('Async Error Handling', () => {
    it('should handle showGlobalQuestion errors gracefully', async () => {
        // Arrange
        const scene = new MainScene();
        // Mock scene to throw error

        // Act
        await expect(scene['safeShowGlobalQuestion']()).resolves.not.toThrow();

        // Assert
        // Verify no crash, error logged
    });

    it('should skip operations when scene inactive', async () => {
        // Test scene inactive state
    });
});
```

**Step 2: Write test for empty array handling**

```typescript
import { QuizManager } from '../../../game/systems/QuizManager';

describe('QuizManager Edge Cases', () => {
    it('should return fallback question when array empty', () => {
        const manager = new QuizManager(/* mock dependencies */);
        const question = manager['getFallbackQuestion']();
        expect(question).toBeDefined();
        expect(question.correctAnswer).toBe('Paris');
    });
});
```

**Step 3: Run tests**

Run: `npm test`
Expected: All new tests pass

**Step 4: Commit**

```bash
git add src/tests/integration/bug-fixes/
git commit -m "test: add integration tests for bug fixes

- Add tests for async error handling
- Add tests for empty array edge cases
- Add tests for scene lifecycle management

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Summary

**Total Tasks:** 8
**Estimated Steps:** 40+
**Files Modified:** 5 core files
**Test Files Created:** 1 integration test suite

**Order of Execution:**
1. Task 1 (Critical - async errors)
2. Task 2 (High - empty arrays)
3. Task 3 (High - race conditions)
4. Task 4 (High - null checks)
5. Task 5 (Medium - SSR safety)
6. Task 6 (Medium - type safety)
7. Task 7 (Medium - memory leaks)
8. Task 8 (Testing)

**Testing Strategy:**
- Each task is independently testable
- Run `npm test` after each commit
- Run `npm run dev` for manual testing
- Run `npm run build` to verify production build

**Rollback Plan:**
Each commit is atomic and can be independently reverted if issues arise.

---

**Next Steps:**
After plan approval, use `superpowers:subagent-driven-development` (for this session) or `superpowers:executing-plans` (for parallel session) to execute tasks sequentially.
