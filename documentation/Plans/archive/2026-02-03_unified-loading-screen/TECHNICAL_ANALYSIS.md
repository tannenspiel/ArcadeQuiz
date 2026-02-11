# Unified Loading Screen — Technical Analysis for LLM

**Purpose:** This document provides detailed technical information about the unified loading screen implementation for LLM analysis and future development.

---

## Architecture Overview

### Problem Statement
The original implementation used React.lazy() for Phaser loading, which created two separate loading screens:
1. React Suspense loading screen (while Phaser chunk loads)
2. Phaser LoadingScene (while game assets load)

This created a disjointed user experience with gaps in progress reporting.

### Solution
Unified loading screen using Phaser-only approach:
- LoadingScene remains active during MainScene initialization
- EventBus for inter-scene communication
- Smooth 0-100% progress bar

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         LoadingScene                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  UI: Progress Bar (0-100%) + Loading Text                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↑                                  │
│                         EventBus.emit()                         │
│                              ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  preload(): 0-50% (Phaser loader progress)                │ │
│  │      - load.on('progress') → EventBus                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                         launch()                                │
│                              ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                       MainScene                            │ │
│  │  create(): 50-100% (via EventBus events)                  │ │
│  │      - 52%: Key spritesheet loaded                        │ │
│  │      - 54%: HealthSystem initialized                      │ │
│  │      - 56%: QuizManager created                           │ │
│  │      - 58%: EnemyManager created                          │ │
│  │      - 58-59%: Audio loading (with callback)              │ │
│  │      - 60%: World creation                                │ │
│  │      - 70%: Collision setup                               │ │
│  │      - 80%: Object spawning                               │ │
│  │      - 90%: Finalization                                  │ │
│  │      - 100%: FINISH_LOADING_EVENT                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## File-by-File Analysis

### 1. `src/game/interfaces/IProgressReporter.ts`

**Purpose:** Interface for progress reporting contract

```typescript
export interface IProgressReporter {
  setProgress(percent: number, text: string): void;
  finishLoading(): void;
}
```

**Key Points:**
- Simple two-method interface
- `setProgress()`: Updates progress bar and text
- `finishLoading()`: Signals completion and triggers cleanup

---

### 2. `src/constants/gameConstants.ts`

**Additions:**

```typescript
// Event names for EventBus communication
export const LOADING_PROGRESS_EVENT = 'loading-progress';
export const FINISH_LOADING_EVENT = 'finish-loading';

// Progress event data structure
export interface LoadingProgressEvent {
  percent: number;
  text: string;
}
```

**Key Points:**
- String constants prevent typos
- TypeScript interface for type safety
- Follows existing EVENT naming pattern

---

### 3. `src/game/scenes/LoadingScene.ts`

**Key Implementation Details:**

#### A. State Management
```typescript
private isFinishing: boolean = false;  // Prevents updates after shutdown
```

#### B. EventBus Subscription
```typescript
private setupEventBusListeners(): void {
  EventBus.on(LOADING_PROGRESS_EVENT, (data: LoadingProgressEvent) => {
    try {
      this.setProgress(data.percent, data.text);
    } catch (error) {
      console.error('[DEBUG] LoadingScene: Error in event handler:', error);
    }
  });

  EventBus.on(FINISH_LOADING_EVENT, () => {
    try {
      this.finishLoading();
    } catch (error) {
      console.error('[DEBUG] LoadingScene: Error in finish handler:', error);
    }
  });
}
```

**Important:** Try-catch blocks prevent crash from rendering errors during scene shutdown.

#### C. Progress Update with Safety
```typescript
setProgress(percent: number, text: string): void {
  // Early return if finishing
  if (this.isFinishing) {
    return;
  }

  this.currentProgress = Math.max(0, Math.min(100, percent));

  // Try-catch for UI updates (WebGL context may be null)
  if (this.progressBar && !this.isFinishing) {
    try {
      this.progressBar.width = BAR_WIDTH * (this.currentProgress / 100);
    } catch (e) {
      // Ignore rendering errors
    }
  }
  // Similar for loadingText and progressText...
}
```

#### D. Cleanup on Finish
```typescript
finishLoading(): void {
  this.isFinishing = true;  // Set flag FIRST

  // Unsubscribe from events BEFORE updating UI
  EventBus.off(LOADING_PROGRESS_EVENT);
  EventBus.off(FINISH_LOADING_EVENT);

  // Final UI update
  this.setProgress(100, 'Готово!');

  // Delay before stopping scene
  this.time.delayedCall(300, () => {
    this.scene.stop('LoadingScene');
  });
}
```

#### E. MainScene Launch
```typescript
this.load.once('complete', async () => {
  // ... assets loaded, animations created ...

  // Launch MainScene in parallel (keeps LoadingScene active)
  this.scene.launch('MainScene');
});
```

**Why `launch()` instead of `start()`:**
- `start()`: Stops current scene before starting new one
- `launch()`: Runs new scene alongside current one
- LoadingScene stays active to receive progress events

---

### 4. `src/game/scenes/MainScene.ts`

**Key Implementation Details:**

#### A. isReady Flag
```typescript
private isReady: boolean = false;

create(): void {
  // ... initialization ...

  this.isReady = true;
  EventBus.emit(FINISH_LOADING_EVENT);
}

update(): void {
  if (!this.isReady) {
    return;  // Don't run game logic until ready
  }
  // ... normal update logic ...
}
```

**Purpose:** Prevents game logic from running during initialization.

#### B. Progress Reporting in initializeSystems()
```typescript
private async initializeSystems(): Promise<void> {
  // Load key spritesheet
  await this.assetLoader.loadSpritesheet('key_sheet', ...);
  EventBus.emit(LOADING_PROGRESS_EVENT, {
    percent: 52,
    text: 'Инициализация систем... (ключи)'
  });

  // Create HealthSystem
  this.healthSystem = new HealthSystem(this, 3);
  EventBus.emit(LOADING_PROGRESS_EVENT, {
    percent: 54,
    text: 'Инициализация систем... (здоровье)'
  });

  // Create QuizManager
  this.quizManager = new QuizManager(...);
  EventBus.emit(LOADING_PROGRESS_EVENT, {
    percent: 56,
    text: 'Инициализация систем... (викторина)'
  });

  // Create EnemyManager
  this.enemyManager = new EnemyManager(...);
  EventBus.emit(LOADING_PROGRESS_EVENT, {
    percent: 58,
    text: 'Инициализация систем... (враги)'
  });

  // Audio loading with progress callback
  await this.audioManager.loadAllSounds((current, total) => {
    const progress = 58 + (current / total);  // 58.0 to 59.0
    EventBus.emit(LOADING_PROGRESS_EVENT, {
      percent: Math.round(progress * 10) / 10,  // 1 decimal place
      text: `Загрузка аудио... (${current}/${total})`
    });
  });

  // Final system init
  EventBus.emit(LOADING_PROGRESS_EVENT, {
    percent: 60,
    text: 'Создание мира...'
  });
}
```

#### C. Progress Reporting in create()
```typescript
// After world creation
EventBus.emit(LOADING_PROGRESS_EVENT, {
  percent: 70,
  text: 'Настройка коллизий...'
});

// After collision setup
EventBus.emit(LOADING_PROGRESS_EVENT, {
  percent: 80,
  text: 'Спавн объектов...'
});

// After spawning
EventBus.emit(LOADING_PROGRESS_EVENT, {
  percent: 90,
  text: 'Финализация...'
});

// Final signal
EventBus.emit(FINISH_LOADING_EVENT);
```

---

### 5. `src/game/systems/AudioManager.ts`

**Key Addition - Progress Callback:**

```typescript
public async loadAllSounds(
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (this.soundsLoaded) {
    return;
  }

  const sounds = [
    { key: SOUND_KEYS.MUSIC_BASE, path: AUDIO_PATHS.MUSIC.BASE },
    { key: SOUND_KEYS.MUSIC_WIN, path: AUDIO_PATHS.MUSIC.WIN },
    // ... 27 total sounds
  ];

  const total = sounds.length;
  for (let i = 0; i < total; i++) {
    await this.loadSound(sounds[i].key, sounds[i].path);

    // Report progress after each file
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  this.soundsLoaded = true;
}
```

**Why this pattern:**
- Optional callback (doesn't break existing code)
- Reports progress incrementally (1/27, 2/27, ...)
- Allows caller to calculate actual progress percent

---

## Progress Flow Timeline

| Progress | Stage | Duration | Implementation |
|----------|-------|----------|----------------|
| **0-50%** | Загрузка ассетов... | ~1-2s | Phaser loader progress event |
| **52%** | Инициализация... (ключи) | ~50ms | After key spritesheet load |
| **54%** | Инициализация... (здоровье) | ~50ms | After HealthSystem creation |
| **56%** | Инициализация... (викторина) | ~50ms | After QuizManager creation |
| **58%** | Инициализация... (враги) | ~50ms | After EnemyManager creation |
| **58-59%** | Загрузка аудио... (X/27) | ~3s | loadAllSounds callback |
| **60%** | Создание мира... | ~100ms | After initializeSystems() |
| **70%** | Настройка коллизий... | ~200ms | After collision setup |
| **80%** | Спавн объектов... | ~300ms | After spawning |
| **90%** | Финализация... | ~100ms | After debug UI |
| **100%** | Готово! | — | FINISH_LOADING_EVENT |

**Total loading time:** ~5-7 seconds (depending on hardware)

---

## Error Handling Patterns

### 1. Rendering Errors during Shutdown

**Problem:** `Cannot read properties of null (reading 'drawImage')`

**Cause:** WebGL context is destroyed before scene.stop() completes.

**Solution:**
```typescript
setProgress(percent: number, text: string): void {
  if (this.isFinishing) {
    return;  // Early return prevents updates
  }

  // Try-catch around UI updates
  try {
    this.progressBar.width = ...;
  } catch (e) {
    // Ignore - context may be destroyed
  }
}
```

### 2. EventBus Memory Leaks

**Problem:** Event listeners remain active after scene is destroyed.

**Solution:**
```typescript
finishLoading(): void {
  // Unsubscribe FIRST
  EventBus.off(LOADING_PROGRESS_EVENT);
  EventBus.off(FINISH_LOADING_EVENT);

  // Then update UI and stop scene
  this.setProgress(100, 'Готово!');
  this.time.delayedCall(300, () => {
    this.scene.stop('LoadingScene');
  });
}
```

### 3. Race Conditions

**Problem:** MainScene emits events before LoadingScene subscribes.

**Solution:** EventBus is singleton and events are queued. LoadingScene subscribes in `preload()` before MainScene is launched, so no race condition occurs.

---

## Performance Considerations

### 1. Empty update() in LoadingScene

```typescript
update(): void {
  // Empty — progress updates via EventBus only
}
```

**Benefit:** LoadingScene consumes minimal CPU while waiting for MainScene to initialize.

### 2. Progress Event Throttling

**Current:** Every audio file triggers an event (27 events).

**Optimization potential:** Batch events (e.g., every 3 files = 9 events).

**Decision:** Not needed currently - 27 events is negligible overhead.

### 3. isReady Flag in MainScene

```typescript
update(): void {
  if (!this.isReady) {
    return;  // Skip all game logic
  }
  // ...
}
```

**Benefit:** Prevents physics, collisions, spawning from running during initialization.

---

## Testing Checklist

- [ ] LoadingScene appears first (white flash before progress bar)
- [ ] Progress bar moves smoothly from 0% to 100%
- [ ] All progress text stages are visible
- [ ] Audio loading shows (X/27) count
- [ ] No console errors during loading
- [ ] LoadingScene disappears after 100%
- [ ] Game is playable after loading completes
- [ ] isReady flag prevents early update() execution
- [ ] EventBus events are properly cleaned up

---

## Common Issues and Solutions

### Issue 1: Progress stuck at 50%

**Cause:** MainScene not emitting progress events during initialization.

**Fix:** Check that `initializeSystems()` is emitting events at 52%, 54%, 56%, 58%.

### Issue 2: Progress stuck at 58%

**Cause:** Audio loading without progress callback.

**Fix:** Ensure `loadAllSounds()` receives callback:
```typescript
await this.audioManager.loadAllSounds((current, total) => {
  // Emit progress events
});
```

### Issue 3: drawImage errors during loading

**Cause:** UI updates after scene begins shutdown.

**Fix:** Ensure `isFinishing` flag is checked before all UI updates.

### Issue 4: LoadingScene never disappears

**Cause:** `FINISH_LOADING_EVENT` not emitted.

**Fix:** Check end of `MainScene.create()` for:
```typescript
EventBus.emit(FINISH_LOADING_EVENT);
```

---

## Future Improvements

### Potential Enhancements

1. **Progressive asset loading:** Load critical assets first, defer non-critical.
2. **Loading tips:** Display gameplay tips during loading.
3. **Loading minigame:** Simple interactive element during long loads.
4. **Background music:** Start playing background music during loading.
5. **Estimated time:** Calculate and display estimated remaining time.

### Performance Optimizations

1. **Batch audio loading:** Group audio files into fewer progress events.
2. **Parallel loading:** Load assets in parallel where possible.
3. **Caching:** Cache loaded assets for subsequent level loads.

---

## Related Documentation

- `PLAN.md` - Original implementation plan
- `PROGRESS.md` - Implementation progress report
- `TEST_RESULTS.md` - Testing results
- `documentation/main/development/BUILD.md` - Build and deployment guide
- `documentation/memory/CONTEXT.md` - Current project context

---

**Last Updated:** 2026-02-03
**Status:** ✅ Implementation Complete
