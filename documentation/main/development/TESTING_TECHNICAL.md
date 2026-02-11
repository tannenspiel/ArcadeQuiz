# Technical Testing Documentation - ArcadeQuiz

**Version:** 1.0
**Date:** 2026-01-16
**Status:** All Tests Passing (523/523)

---

## Overview

This document provides in-depth technical details about the testing infrastructure, mock implementations, patterns, and troubleshooting for the ArcadeQuiz project.

---

## Table of Contents

1. [Phaser Mock Implementation](#phaser-mock-implementation)
2. [Mock Patterns and Best Practices](#mock-patterns-and-best-practices)
3. [TypeScript Interfaces for Mocks](#typescript-interfaces-for-mocks)
4. [Test Architecture Decisions](#test-architecture-decisions)
5. [Testing Anti-Patterns](#testing-anti-patterns)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Performance Optimization](#performance-optimization)
8. [Advanced Testing Techniques](#advanced-testing-techniques)

---

## Phaser Mock Implementation

### The Problem

Testing Phaser games presents unique challenges:

1. **Class Inheritance**: Many game classes extend Phaser classes
2. **Method Chaining**: Phaser methods return `this` for chaining
3. **Scene Dependencies**: Game objects depend on scene context
4. **Physics Integration**: Arcade physics requires proper setup

**Original Issue:**
```
Test suite failed to run
  Jest encountered an unexpected token
```

This occurred because the original mock used plain objects instead of classes, which broke when code tried to extend Phaser classes.

### The Solution: Class-Based Mocks

**File:** `src/tests/mocks/phaser-mock.ts`

**Key Design Principles:**

1. **Use ES6 Classes** instead of plain objects
2. **Implement Method Chaining** by returning `this`
3. **Provide Full API Coverage** for commonly used features
4. **Maintain Type Safety** for TypeScript

### Mock Class Hierarchy

```typescript
// Base class for all GameObjects
class MockGameObject {
    constructor(scene: any, x: number, y: number) {
        // Mock constructor
    }
    setDepth(depth: number) { return this; }
    setOrigin(x: number, y: number) { return this; }
    setPosition(x: number, y: number) { return this; }
    setSize(width: number, height: number) { return this; }
    setScrollFactor(x: number, y?: number) { return this; }
    setInteractive(config?: any) { return this; }
    setStrokeStyle(color?: number, thickness?: number) { return this; }
    setVisible(visible: boolean) { return this; }
    setResolution(width: number, height: number) { return this; }
    setFontSize(size: number) { return this; }
    on(event: string, callback: Function) { return this; }
    destroy() { return this; }
}

// Container with child management
class MockContainer extends MockGameObject {
    private children: any[] = [];
    add(child: any) {
        this.children.push(child);
        return child;
    }
    getChildren() { return this.children; }
    getByName(name: string) {
        return this.children.find(c => c.name === name);
    }
    clear() { this.children = []; }
}

// Sprite with texture support
class MockSprite extends MockGameObject {
    texture?: any;
    frame?: any;
    setActive(active: boolean) {
        this.active = active;
        return this;
    }
    active: boolean = true;
}

// Text with text manipulation
class MockText extends MockGameObject {
    setText(text: string) { return this; }
    setTextBounds(x?: number, y?: number, width?: number, height?: number) {
        return this;
    }
}

// Image with texture setting
class MockImage extends MockGameObject {
    setTexture(key: string) { return this; }
}
```

### Mock Scene Implementation

```typescript
class MockScene {
    constructor(config: any) {
        // Mock constructor
    }

    add = {
        text: jest.fn(function() {
            return new MockText(new MockScene({}), 0, 0);
        }),
        container: jest.fn(function() {
            return new MockContainer(new MockScene({}), 0, 0);
        }),
        sprite: jest.fn(function() {
            return new MockSprite(new MockScene({}), 0, 0);
        }),
        image: jest.fn(function() {
            return new MockImage(new MockScene({}), 0, 0);
        }),
        rectangle: jest.fn(function() {
            return new MockGameObject(new MockScene({}), 0, 0);
        }),
        zone: jest.fn(function() {
            return new MockGameObject(new MockScene({}), 0, 0);
        }),
    };

    input = {
        keyboard: {
            createCursor: jest.fn(function() {
                return { on: jest.fn() };
            }),
        },
        enabled: true,
    };

    sys = {
        settings: { active: true },
        scale: { grid: { size: 64 } },
    };

    time = {
        delayedCall: jest.fn(function() {
            return { destroy: jest.fn() };
        }),
        addEvent: jest.fn(function() {
            return { destroy: jest.fn() };
        }),
    };

    events = {
        on: jest.fn(function() { return {}; }),
        off: jest.fn(),
        emit: jest.fn(),
        once: jest.fn(),
    };

    load = {
        image: jest.fn(function() { return { start: jest.fn() }; }),
        spritesheet: jest.fn(function() { return { start: jest.fn() }; }),
        atlas: jest.fn(function() { return { start: jest.fn() }; }),
    };

    _cameras = {
        getMain: jest.fn(function() {
            return { width: 1280, height: 720 };
        }),
    };

    get cameras() { return this._cameras; }
}
```

### Mock Physics

```typescript
class MockArcadePhysics {
    add = {
        collider: jest.fn(),
        overlap: jest.fn(),
        sprite: jest.fn(function() {
            return {
                enable: jest.fn(),
                refresh: jest.fn()
            };
        }),
        group: jest.fn(function() {
            return {
                createMultiple: jest.fn(),
                get: jest.fn()
            };
        }),
    };
}
```

### Integration with Test Setup

**File:** `src/tests/setup.ts`

```typescript
jest.mock('phaser', () => {
    const PhaserMock = require('./mocks/phaser-mock').default;
    return {
        default: PhaserMock,
        ...PhaserMock,
    };
});
```

**Why this works:**
1. **Default import support**: Handles `import Phaser from 'phaser'`
2. **Named import support**: Handles `import { GameObjects } from 'phaser'`
3. **Spread operator**: Ensures all properties are available

---

## Mock Patterns and Best Practices

### Pattern 1: Scene Mock Factory

Create a reusable scene mock factory:

```typescript
export function createMockScene(overrides = {}) {
    return {
        add: {
            text: jest.fn(() => new MockText()),
            container: jest.fn(() => new MockContainer()),
            sprite: jest.fn(() => new MockSprite()),
            image: jest.fn(() => new MockImage()),
            rectangle: jest.fn(() => new MockGameObject()),
            zone: jest.fn(() => new MockGameObject()),
        },
        input: {
            keyboard: { createCursor: jest.fn(() => ({ on: jest.fn() })) },
            enabled: true,
        },
        sys: {
            settings: { active: true },
            scale: { grid: { size: 64 } },
        },
        time: {
            delayedCall: jest.fn(() => ({ destroy: jest.fn() })),
        },
        events: {
            on: jest.fn(() => ({})),
            off: jest.fn(),
            emit: jest.fn(),
        },
        ...overrides,
    } as any;
}
```

**Usage:**
```typescript
const mockScene = createMockScene({
    sys: { settings: { active: false } }
});
```

### Pattern 2: EventBus Mock

```typescript
export const mockEventBus = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
};

// Reset before each test
beforeEach(() => {
    Object.values(mockEventBus).forEach(fn => fn.mockClear());
});
```

### Pattern 3: Physics Mock

```typescript
export function createMockPhysics() {
    return {
        add: {
            collider: jest.fn(),
            overlap: jest.fn(),
            sprite: jest.fn(() => ({
                enable: jest.fn(),
                refresh: jest.fn(),
            })),
            group: jest.fn(() => ({
                createMultiple: jest.fn(),
                get: jest.fn(),
            })),
        },
    };
}
```

### Pattern 4: Asset Loader Mock

```typescript
export function createMockAssetLoader() {
    return {
        loadImage: jest.fn(),
        loadSpritesheet: jest.fn(),
        loadAtlas: jest.fn(),
        isLoaded: jest.fn(() => false),
        getTexture: jest.fn(() => null),
    };
}
```

---

## TypeScript Interfaces for Mocks

### Scene Interface

```typescript
interface MockSceneConfig {
    add?: {
        text?: jest.Mock;
        container?: jest.Mock;
        sprite?: jest.Mock;
        image?: jest.Mock;
        rectangle?: jest.Mock;
        zone?: jest.Mock;
    };
    input?: {
        keyboard?: { createCursor: jest.Mock };
        enabled?: boolean;
    };
    sys?: {
        settings?: { active: boolean };
        scale?: { grid: { size: number } };
    };
    time?: {
        delayedCall?: jest.Mock;
        addEvent?: jest.Mock;
    };
    events?: {
        on?: jest.Mock;
        off?: jest.Mock;
        emit?: jest.Mock;
    };
}

export function createTypedMockScene(config: MockSceneConfig = {}): any {
    return {
        add: config.add || {},
        input: config.input || {},
        sys: config.sys || {},
        time: config.time || {},
        events: config.events || {},
    };
}
```

### GameObject Interface

```typescript
interface MockGameObjectConfig {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    active?: boolean;
    visible?: boolean;
    depth?: number;
}

export class TypedMockGameObject {
    constructor(
        public scene: any,
        public x: number = 0,
        public y: number = 0
    ) {}

    setDepth(depth: number) { this.depth = depth; return this; }
    setOrigin(x: number, y: number) { return this; }
    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
    }
    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
        return this;
    }
    setVisible(visible: boolean) {
        this.visible = visible;
        return this;
    }
    setActive(active: boolean) {
        this.active = active;
        return this;
    }
    on(event: string, callback: Function) { return this; }
    destroy() { return this; }

    // Properties
    width: number = 0;
    height: number = 0;
    active: boolean = true;
    visible: boolean = true;
    depth: number = 0;
}
```

---

## Test Architecture Decisions

### Decision 1: Class-Based vs Object-Based Mocks

**Choice:** Class-based mocks

**Rationale:**
- Supports `extends` keyword for inheritance
- Enables proper instanceof checks
- Maintains prototype chain
- Better TypeScript type inference

**Trade-off:** Slightly more verbose, but worth it for correctness

### Decision 2: Global vs Local Mocks

**Choice:** Global mock in `setup.ts` with local overrides

**Rationale:**
- Consistent behavior across all tests
- Easier to maintain
- Can be overridden when needed
- Reduces test boilerplate

**Trade-off:** Less explicit in individual tests

### Decision 3: Method Chaining

**Choice:** All setter methods return `this`

**Rationale:**
- Matches Phaser API
- Enables fluent interface
- Reduces test code verbosity

**Example:**
```typescript
// Instead of:
obj.setDepth(1);
obj.setPosition(0, 0);
obj.setVisible(true);

// Can do:
obj.setDepth(1).setPosition(0, 0).setVisible(true);
```

### Decision 4: Jest Functions vs Plain Functions

**Choice:** Use `jest.fn()` for all dynamic methods

**Rationale:**
- Enables call verification
- Provides spy capabilities
- Allows return value customization
- Supports call counting

**Example:**
```typescript
const mockScene = createMockScene();
mockScene.add.sprite('player');
expect(mockScene.add.sprite).toHaveBeenCalledWith('player');
```

---

## Testing Anti-Patterns

### Anti-Pattern 1: Over-Mocking

**Bad:**
```typescript
// Mocking everything, even things not needed
const mockScene = {
    add: {
        text: jest.fn(),
        container: jest.fn(),
        // ... 50 more methods
    },
    sys: { /* everything */ },
    time: { /* everything */ },
    cameras: { /* everything */ },
    // ... etc
};
```

**Good:**
```typescript
// Only mock what's needed
const mockScene = {
    add: {
        text: jest.fn(),
        container: jest.fn(),
    }
};
```

### Anti-Pattern 2: Testing Implementation Details

**Bad:**
```typescript
it('should call scene.add.container with x=100', () => {
    new Portal(scene, 100, 200);
    expect(scene.add.container).toHaveBeenCalledWith(100);
});
```

**Good:**
```typescript
it('should position portal at correct coordinates', () => {
    const portal = new Portal(scene, 100, 200);
    expect(portal.x).toBe(100);
    expect(portal.y).toBe(200);
});
```

### Anti-Pattern 3: Brittle Test Expectations

**Bad:**
```typescript
it('should display correct text', () => {
    expect(textElement.text).toBe('Health: 3/3');
});
```

**Good:**
```typescript
it('should display health information', () => {
    expect(textElement.text).toContain('Health');
    expect(textElement.text).toContain('3');
});
```

### Anti-Pattern 4: Not Cleaning Up

**Bad:**
```typescript
describe('Player', () => {
    it('should move', () => {
        const player = new Player(scene, 0, 0);
        player.move(10, 10);
        expect(player.x).toBe(10);
    });
    // Player not cleaned up!
});
```

**Good:**
```typescript
describe('Player', () => {
    let player: Player;

    afterEach(() => {
        if (player) {
            player.destroy();
        }
    });

    it('should move', () => {
        player = new Player(scene, 0, 0);
        player.move(10, 10);
        expect(player.x).toBe(10);
    });
});
```

---

## Troubleshooting Guide

### Issue 1: "Test suite failed to run"

**Symptoms:**
```
Test suite failed to run
  Jest encountered an unexpected token
```

**Causes:**
1. Extending Phaser classes with object-based mock
2. Missing proper mock setup
3. TypeScript compilation issues

**Solutions:**
1. Use class-based mocks (see `phaser-mock.ts`)
2. Ensure `setup.ts` is properly configured
3. Check `ts-jest` configuration

### Issue 2: Method Chaining Broken

**Symptoms:**
```typescript
obj.setDepth(1).setPosition(0, 0);
// TypeError: obj.setDepth(...) is undefined
```

**Causes:**
Mock methods don't return `this`

**Solutions:**
```typescript
// Bad
setDepth(depth: number) { }

// Good
setDepth(depth: number) { return this; }
```

### Issue 3: Jest Mock Not Working

**Symptoms:**
```typescript
const mockScene = createMockScene();
mockScene.add.sprite();
expect(mockScene.add.sprite).toHaveBeenCalled();
// FAILS: Expected number of calls: >= 1, received: 0
```

**Causes:**
1. Not using `jest.fn()`
2. Mock not properly set up
3. Wrong import path

**Solutions:**
```typescript
// Ensure jest.fn() is used
add: {
    sprite: jest.fn(() => new MockSprite())
}

// Check import path
jest.mock('../../game/EventBus', () => ({
    EventBus: { on: jest.fn() }
}));
```

### Issue 4: TypeScript Type Errors

**Symptoms:**
```
Property 'add' does not exist on type 'Scene'
```

**Causes:**
1. Missing type cast
2. Incompatible mock structure

**Solutions:**
```typescript
// Add type cast
const mockScene = {
    add: { text: jest.fn() }
} as any;

// Or use proper interface
const mockScene: Partial<Scene> = {
    add: { text: jest.fn() } as any
};
```

### Issue 5: Async Test Timeouts

**Symptoms:**
```
Timeout - Async callback was not invoked within the 5000ms timeout
```

**Causes:**
1. Missing `await` keyword
2. Promise not resolved
3. Infinite loop in code

**Solutions:**
```typescript
// Add done callback
it('should load', (done) => {
    loader.loadImage('key', 'path.png').then(() => {
        expect(loader.isLoaded('key')).toBe(true);
        done();
    });
});

// Or use async/await
it('should load', async () => {
    await loader.loadImage('key', 'path.png');
    expect(loader.isLoaded('key')).toBe(true);
});
```

---

## Performance Optimization

### Test Execution Time

**Current Status:**
- Total tests: 523
- Execution time: ~7 seconds
- Average per test: ~13ms

**Optimization Strategies:**

1. **Parallel Test Execution**
   ```javascript
   // jest.config.js
   module.exports = {
     maxWorkers: 4, // Run in parallel
   };
   ```

2. **Selective Test Running**
   ```bash
   # Run only changed files
   npm test -- --onlyChanged

   # Run specific pattern
   npm test -- --testPathPattern=Player
   ```

3. **Test Seeding**
   ```javascript
   // jest.config.js
   module.exports = {
     seed: 1234, // Consistent random order
   };
   ```

### Memory Management

**Best Practices:**

1. **Clean up after tests**
   ```typescript
   afterEach(() => {
       jest.clearAllMocks();
   });
   ```

2. **Use `beforeEach` sparingly**
   ```typescript
   // Bad: Heavy setup in beforeEach
   beforeEach(() => {
       // Loads entire game config
   });

   // Good: Minimal setup
   beforeEach(() => {
       mockScene = createMockScene();
   });
   ```

3. **Avoid expensive operations**
   ```typescript
   // Bad: Loading real assets
   it('should display sprite', async () => {
       await loader.loadImage('real-asset.png');
   });

   // Good: Mock assets
   it('should display sprite', () => {
       mockScene.add.sprite('test-key');
   });
   ```

---

## Advanced Testing Techniques

### Technique 1: Snapshot Testing

**Use Case:** Verifying complex object structures

```typescript
it('should match portal snapshot', () => {
    const portal = new Portal(scene, 100, 200);
    expect(portal.toJSON()).toMatchSnapshot();
});
```

### Technique 2: Parameterized Tests

**Use Case:** Testing multiple inputs

```typescript
describe('HealthSystem', () => {
    const testCases = [
        { input: 0, expected: 0 },
        { input: 1, expected: 1 },
        { input: 5, expected: 3 }, // Max is 3
    ];

    testCases.forEach(({ input, expected }) => {
        it(`should clamp health ${input} to ${expected}`, () => {
            const system = new HealthSystem();
            system.setHealth(input);
            expect(system.getHealth()).toBe(expected);
        });
    });
});
```

### Technique 3: Custom Matchers

**Use Case:** Domain-specific assertions

```typescript
// customMatchers.ts
expect.extend({
    toBeWithinRange(received: number, floor: number, ceiling: number) {
        const pass = received >= floor && received <= ceiling;
        return {
            pass,
            message: () =>
                `expected ${received} to be within range ${floor}-${ceiling}`,
        };
    },
});

// Usage
it('should position player within bounds', () => {
    const player = new Player(scene, 50, 50);
    expect(player.x).toBeWithinRange(0, 1280);
    expect(player.y).toBeWithinRange(0, 720);
});
```

### Technique 4: Spies and Timers

**Use Case:** Testing time-dependent code

```typescript
it('should update position over time', () => {
    jest.useFakeTimers();

    const player = new Player(scene, 0, 0);
    player.startMoving(10, 0);

    // Fast-forward 1 second
    jest.advanceTimersByTime(1000);

    expect(player.x).toBe(10);

    jest.useRealTimers();
});
```

### Technique 5: Event Emission Testing

**Use Case:** Verifying event-based communication

```typescript
it('should emit damage event', () => {
    const mockHandler = jest.fn();
    EventBus.on('player-damaged', mockHandler);

    const player = new Player(scene, 0, 0);
    player.takeDamage(1);

    expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
            damage: 1,
            health: 2
        })
    );
});
```

---

## Test Coverage Strategies

### Coverage Targets

**Current Goals:**
- Overall: 80%+
- Critical modules: 90%+
- UI components: 70%+

### Coverage Configuration

**File:** `jest.config.js`

```javascript
module.exports = {
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/tests/**',
        '!src/main.tsx',
        '!src/vite-env.d.ts',
    ],
    coverageThresholds: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80,
        },
        './src/game/systems/': {
            branches: 80,
            functions: 90,
            lines: 90,
            statements: 90,
        },
    },
};
```

### Coverage Reports

**Generate HTML Report:**
```bash
npm run test:coverage
```

**View Report:**
Open `coverage/index.html` in browser

**Key Metrics:**
- **Line Coverage**: Percentage of executed lines
- **Branch Coverage**: Percentage of executed branches (if/else)
- **Function Coverage**: Percentage of called functions
- **Statement Coverage**: Percentage of executed statements

---

## Continuous Integration

### GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Run E2E tests
        run: npm run test:e2e
```

### Pre-commit Hook

**File:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run test:unit
```

---

## Related Documents

- [TESTING.md](TESTING.md) - Main testing guide
- [TESTING_SIMPLE.md](TESTING_SIMPLE.md) - Simple guide for beginners

---

**Last Updated:** 2026-01-16
**Test Status:** ✅ 523/523 passing
**Execution Time:** ~7 seconds
