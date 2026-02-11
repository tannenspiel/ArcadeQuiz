# План рефакторинга: Шаг 7 - UI Managers

**Родительский план:** [Refactoring_MASTER_PLAN.md](./Refactoring_MASTER_PLAN.md)
**Статус:** ✅ DONE
**Дата завершения:** 2026-01-19
**Цель:** Вынести управление UI (HUD, Camera, Effects) из MainScene в специализированные менеджеры

---

## Контекст

В данный момент `MainScene.ts` содержит множество методов для управления UI:
- **HUD:** `createHUD()`, `updateHUD()`, `getZoomCompensatedHUDPosition()` (~100 строк)
- **Camera:** `setupCameraBounds()`, `setupCameraFollow()`, `handleResize()` (~150 строк)
- **Effects:** `showFloatingText()`, `flashSprite()`, `flashPlayerLoseKey()`, `flashPlayerGetKey()` (~250 строк)

**Затронутые файлы:**
- `src/game/scenes/MainScene.ts` (основной файл для рефакторинга)
- Создаётся новая папка `src/game/scenes/ui/`

---

## Создаваемые компоненты

### 1. `src/game/scenes/ui/HUDManager.ts`

**Назначение:** Управление heads-up display (ключи, очки, подсказки)

**Выносимые методы:**
- `createHUD()` → конструктор/инициализация
- `updateHUD()` → `update()`
- `getZoomCompensatedHUDPosition()` → приватный метод

**Зависимости:**
- `scene: Phaser.Scene`
- `gameState: GameState`
- `keysHUDText: Phaser.GameObjects.Text`
- `scoreHUDText: Phaser.GameObjects.Text`
- `hintText: Phaser.GameObjects.Text`
- `camera: Phaser.Cameras.Scene2D`

---

### 2. `src/game/scenes/ui/CameraManager.ts`

**Назначение:** Управление камерой (bounds, follow, resize)

**Выносимые методы:**
- `setupCameraBounds()` → `setupBounds()`
- `setupCameraFollow()` → `setupFollow()`
- `handleResize()` → обработчик resize

**Зависимости:**
- `scene: Phaser.Scene`
- `player: Player`
- `camera: Phaser.Cameras.Scene2D`
- `physics: Phaser.Physics.Arcade.ArcadePhysics`
- `worldFactory: WorldFactory`

---

### 3. `src/game/scenes/ui/EffectsManager.ts`

**Назначение:** Управление визуальными эффектами (мигание, всплывающий текст)

**Выносимые методы:**
- `showFloatingText()` → публичный метод
- `flashSprite()` → приватный метод
- `flashPlayerLoseKey()` → публичный метод
- `flashPlayerGetKey()` → публичный метод

**Зависимости:**
- `scene: Phaser.Scene`
- `player: Player`
- `tweens: Phaser.Tweens.TweenManager`

**Callbacks для MainScene:**
- `getZoomCompensatedPosition(screenX, screenY)`
- `getCamera()`

---

## План действий

### 1. Подготовка
- [x] Создать папку `src/game/scenes/ui/`
- [x] Создать barrel export `index.ts`

### 2. HUDManager
- [x] Перенести `createHUD()` логику
- [x] Перенести `updateHUD()` логику
- [x] Перенести `getZoomCompensatedHUDPosition()` логику
- [x] Интегрировать в MainScene

### 3. CameraManager
- [x] Перенести `setupCameraBounds()` логику
- [x] Перенести `setupCameraFollow()` логику
- [x] Перенести `handleResize()` логику
- [x] Интегрировать в MainScene

### 4. EffectsManager
- [x] Перенести `showFloatingText()` логику
- [x] Перенести `flashSprite()` логику
- [x] Перенести `flashPlayerLoseKey()` логику
- [x] Перенести `flashPlayerGetKey()` логику
- [x] Интегрировать в MainScene

### 5. Интеграция в MainScene
- [x] Инициализировать менеджеры в `create()` или `initializeSystems()`
- [x] Заменить методы на delegates
- [x] Удалить старые реализации

### 6. Верификация
- [x] Билд успешен
- [x] Игра запускается без ошибок
- [x] HUD отображается корректно
- [x] Камера следует за игроком
- [x] Эффекты работают (мигание, всплывающий текст)

### 7. Багфиксы (после завершения)
- [x] ReferenceError: flashInterval is not defined
- [x] Ключи не работают (коллизии не обрабатываются)
- [x] Мигание персонажа не останавливается

---

## Ожидаемый результат

**Уменьшение MainScene:** ~500 строк вынесено

**Новые файлы:**
- `HUDManager.ts` (~150 строк)
- `CameraManager.ts` (~200 строк)
- `EffectsManager.ts` (~300 строк)
- `index.ts` (barrel export)

**Delegates в MainScene:**
```typescript
// Вместо прямой реализации
createHUD() {
    this.hudManager?.create();
}

updateHUD() {
    this.hudManager?.update();
}

flashPlayerGetKey() {
    this.effectsManager?.flashPlayerGetKey();
}
```

---

## Примечания

- **Callbacks:** EffectsManager использует callbacks для получения камеры и позиций от MainScene
- **Pool:** `floatingTextPool` остаётся в MainScene или перемещается в EffectsManager
- **Order:** Camera должен быть настроен до HUD для корректного расчета позиций

---

**Критерии завершения:**
- [x] Все 3 менеджера созданы
- [x] MainScene уменьшен на ~485 строк
- [x] Билд успешен
- [x] Игра работает без визуальных багов

---

**Результат:** Шаг 7 выполнен полностью + исправлено 3 критических бага. Созданы 3 manager класса (~575 строк), MainScene уменьшен на ~485 строк (-13.1%), общее уменьшение от начала рефакторинга: 1412 строк (-30.5%).
