# План: Система монеток у персонажа (упрощённая)

**Дата:** 2026-02-02
**Статус:** ПЛАНИРОВАНИЕ (ОБНОВЛЁН ПОСЛЕ АУДИТА)
**Приоритет:** ВЫСОКИЙ

---

## Контекст

Реализовать систему отображения собранных монеток у персонажа, **полностью аналогичную** системе золотых сердечек для ключей.

**УПРОЩЕНИЕ:**
- Мон acreтки размещаются так же, как серд acreчки (нижняя граница совпадает с нижней границей персонажа)
- Мигание ТОЛЬКО как у золотых сердечек (ADD blend + glow)
- НЕТ мигания через прозрачность
- Отображение завязано на `gameState.getCoins()` (количество монеток в инвентаре)

---

## Затронутые файлы/модули

- `src/constants/gameConstants.ts` - добавить ключ текстуры мон acreтки
- `src/constants/textStyles.ts` - проверить/добавить HEART_SCALE (если используется)
- `src/constants/gameConstants.ts` - проверить DEPTHS константы для overhead UI
- `src/game/scenes/LoadingScene.ts` - загрузить текстуру `Coin5x5.png` (как image!)
- `src/game/entities/Player.ts` - добавить систему мон acreток (копия goldHeartSprites)
- `src/game/core/GameState.ts` - уже имеет `getCoins()` - используем его
- `src/game/scenes/collision/ItemCollisionHandler.ts` - вызов обновления мон acreток при сборе/уроне

---

## Реализация (Mentor Plan Style)

### ШАГ 1: Фундамент ассетов и констант

**Обоснование:** Прежде чем Player.ts попытается создать спрайты, текстура должна быть в памяти Phaser. Ошибка на этом этапе — самая частая причина «зависания» сцены или бесконечной загрузки.

#### 1.1 Регистрация ключа в gameConstants.ts

**Файл:** `src/constants/gameConstants.ts`

**Действие:** Добавить в объект `KEYS`:
```typescript
COIN_HEART: 'coin_heart',
```

**Обоснование:** Это позволит избежать опечаток в строках при вызовах `load.image` и `add.sprite`. Централизованное хранение ключа гарантирует, что изменение имени в одном месте обновит всё использование.

#### 1.2 Проверка DEPTHS констант

**Файл:** `src/constants/gameConstants.ts`

**Действие:** Проверить наличие констант:
```typescript
DEPTHS: {
  SCREEN: {
    // ...
    OVERHEAD_BASE: 10,   // Базовый индикатор (сердечки/мон acreтки)
    OVERHEAD_GLOW: 11,   // Свечение индикаторов
    // ...
  }
}
```

**Обоснование:** Замена магических чисел (depth=10, 11) на именованные константы улучшает читаемость и облегчает рефакторинг. Если констант нет → добавить.

#### 1.3 Загрузка изображения в LoadingScene.ts

**Файл:** `src/game/scenes/LoadingScene.ts`

**Действие:** Добавить после загрузки золотых сердечек:
```typescript
// ✅ Загружаем текстуру мон acreток Coin5x5.png как image (статичная картинка)
this.load.image(KEYS.COIN_HEART, `${ASSETS_BASE_PATH}/images/Coin5x5.png`);
```

**Обоснование:** У нас нет анимации кадров для этого индикатора, всё мигание делается через код (Tweens). Загрузка как `image` экономит память и упрощает работу с текстурой, в отличие от `spritesheet`.

---

### ШАГ 2: Система мон acreток в Player.ts

**Обоснование:** Система мон acreток является копией системы золотых сердечек с минимальными изменениями. Копипаст проверенной логики минимизирует риски и упрощает отладку.

#### 2.1 Добавить свойства

**Файл:** `src/game/entities/Player.ts`

**Действие:** Добавить после свойств золотых сердечек (строка ~64):
```typescript
// ✅ Система мон acreток для фазы coin (аналог goldHeartSprites)
private coinSprites: Phaser.GameObjects.Sprite[] = [];
private coinGlowSprites: Phaser.GameObjects.Sprite[] = [];
private coinBlinkTweens: Phaser.Tweens.Tween[] = [];
private previousCoinCount: number = -1;
```

**Обоснование:** Структура идентична золотым сердечкам для консистентности. Размещение рядом с `goldHeartSprites` облегчает сравнение и поддержку.

#### 2.2 Добавить метод updateCoins()

**Файл:** `src/game/entities/Player.ts`

**Действие:** Скопировать метод `updateGoldHearts()` (строки 1337-1400) и создать `updateCoins()` с изменениями:

```typescript
/**
 * Обновить мон acreтки (аналог золотых сердечек для фазы coin)
 */
private updateCoins(
  coinCount: number,
  heartPositions?: { x: number; y: number }[],
  coinTexture?: string,
  coinScale?: number
): void {
  // Удаляем все старые мон acreтки
  this.clearCoins();

  if (coinCount <= 0 || !heartPositions || !coinTexture || !coinScale) {
    return;
  }

  const healthSystem = (this.scene as any).healthSystem;

  // Создаем мон acreтки для каждой собранной мон acreтки
  const maxCoins = Math.min(coinCount, 3);

  for (let i = 0; i < maxCoins; i++) {
    if (i >= heartPositions.length) break;

    const pos = heartPositions[i];
    const roundedX = Math.round(pos.x);
    const roundedY = Math.round(pos.y);

    // 1. БАЗОВЫЙ спрайт (Непрозрачный, NORMAL blend)
    const coinBase = this.scene.add.sprite(roundedX, roundedY, coinTexture);
    coinBase.setScale(coinScale);
    coinBase.setDepth(DEPTHS.SCREEN.OVERHEAD_BASE); // ✅ Константа вместо magic number
    coinBase.setAlpha(1);
    coinBase.setBlendMode(Phaser.BlendModes.NORMAL);

    this.coinSprites.push(coinBase);

    // 2. СПРАЙТ СВЕЧЕНИЯ (Прозрачный, ADD blend)
    const coinGlow = this.scene.add.sprite(roundedX, roundedY, coinTexture);
    coinGlow.setScale(coinScale);
    coinGlow.setDepth(DEPTHS.SCREEN.OVERHEAD_GLOW); // ✅ Константа вместо magic number
    coinGlow.setAlpha(0);
    coinGlow.setBlendMode(Phaser.BlendModes.ADD);

    this.coinGlowSprites.push(coinGlow);

    // ✅ Мигание через alpha свечения: 0.0 → 0.6 → 0.0
    const blinkTween = this.scene.tweens.add({
      targets: coinGlow,
      alpha: 0.6,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.coinBlinkTweens.push(blinkTween);

    // ✅ Скрываем соответствующее красное сердечко
    if (healthSystem && healthSystem.setHeartOverride) {
      healthSystem.setHeartOverride(i, true);
    }
  }
}
```

**Обоснование:** Полный аналог `updateGoldHearts()` с заменой:
- `goldHeartTexture` → `coinTexture`
- `goldHeartSprites` → `coinSprites`
- `goldHeartGlowSprites` → `coinGlowSprites`
- `goldHeartBlinkTweens` → `coinBlinkTweens`
- Magic numbers (10, 11) → `DEPTHS.SCREEN.OVERHEAD_BASE`, `DEPTHS.SCREEN.OVERHEAD_GLOW`

**Примечание по производительности:** `clearCoins()` вызывается в начале метода, что гарантирует удаление старых твинов до создания новых. Это критично для предотвращения утечек памяти при атомарных изменениях (потеря 1 жизни + 1 мон acreтки).

#### 2.3 Добавить метод updateCoinsPosition()

**Файл:** `src/game/entities/Player.ts`

**Действие:** Скопировать метод `updateGoldHeartsPosition()` (строки 1405-1431):

```typescript
/**
 * Синхронизировать позиции мон acreток с игроком
 */
private updateCoinsPosition(heartPositions?: { x: number; y: number }[]): void {
  if (!this.sprite || !this.sprite.active) return;
  if (!heartPositions) return;

  // Обновляем позиции каждой мон acreтки и свечения
  for (let i = 0; i < this.coinSprites.length; i++) {
    if (i < heartPositions.length) {
      const roundedX = Math.round(heartPositions[i].x);
      const roundedY = Math.round(heartPositions[i].y);

      // Базовый спрайт
      const coin = this.coinSprites[i];
      if (coin && coin.active) {
        coin.setPosition(roundedX, roundedY);
      }

      // Спрайт свечения
      if (i < this.coinGlowSprites.length) {
        const coinGlow = this.coinGlowSprites[i];
        if (coinGlow && coinGlow.active) {
          coinGlow.setPosition(roundedX, roundedY);
        }
      }
    }
  }
}
```

**Обоснование:** Использование `heartPositions` из HealthSystem гарантирует, что мон acreтки не «разлетятся» при движении игрока — они привязаны к той же сетке координат, что и жизни. Округление координат до целых пикселей обеспечивает pixel-perfect рендеринг.

#### 2.4 Добавить метод clearCoins()

**Файл:** `src/game/entities/Player.ts`

**Действие:** Скопировать метод `clearGoldHearts()` (строки 1436-1466):

```typescript
/**
 * Очистить все мон acreтки
 */
private clearCoins(): void {
  const healthSystem = (this.scene as any).healthSystem;

  // Останавливаем все tweens
  this.coinBlinkTweens.forEach(tween => {
    if (tween && tween.isActive()) {
      tween.stop();
    }
  });
  this.coinBlinkTweens = [];

  // Удаляем все базовые спрайты
  this.coinSprites.forEach((sprite, index) => {
    if (sprite && sprite.active) {
      sprite.destroy();
    }
    // ✅ Возвращаем видимость красных сердечек
    if (healthSystem && healthSystem.setHeartOverride) {
      healthSystem.setHeartOverride(index, false);
    }
  });
  this.coinSprites = [];

  // Удаляем все спрайты свечения
  this.coinGlowSprites.forEach(sprite => {
    if (sprite && sprite.active) {
      sprite.destroy();
    }
  });
  this.coinGlowSprites = [];
}
```

**Обоснование:** Порядок остановки tweens перед удалением спрайтов критичен для предотвращения утечек памяти. Возврат видимости красных сердечек (`setHeartOverride(index, false)`) восстанавливает корректное отображение HUD.

#### 2.5 Добавить синхронизацию в update()

**Файл:** `src/game/entities/Player.ts`

**Действие:** Добавить после `updateGoldHeartsPosition()` (строка ~905):

```typescript
// ✅ Синхронизируем позиции мон acreток (если есть)
if (this.coinSprites.length > 0) {
  this.updateCoinsPosition(heartPositions);
}
```

**Обоснование:** Проверка `this.coinSprites.length > 0` предотвращает лишние вызовы при отсутствии мон acreток. Позиция сердечек (`heartPositions`) должна быть получена из HealthSystem.

**Важно:** Этот код требует `heartPositions` — нужно убедиться, что он доступен в `update()`. Если нет — передавать как параметр или получать из HealthSystem.

#### 2.6 Добавить публичный метод для вызова извне

**Файл:** `src/game/entities/Player.ts`

**Действие:** Добавить публичный метод (аналог `updateKeyRings()`):

```typescript
/**
 * Обновить мон acreтки (визуализация количества собранных мон acreток)
 * @param coinCount Количество мон acreток у игрока
 * @param heartPositions Позиции сердечек (из HealthSystem)
 * @param coinTexture Текстура мон acreтки
 * @param coinScale Scale мон acreтки
 */
public updateCoins(
  coinCount: number,
  heartPositions?: { x: number; y: number }[],
  coinTexture?: string,
  coinScale?: number
): void {
  if (!this.sprite || !this.sprite.active) {
    return;
  }

  // ✅ Обновляем только если количество изменилось
  if (this.previousCoinCount !== coinCount) {
    this.previousCoinCount = coinCount;
    this.updateCoinsInternal(coinCount, heartPositions, coinTexture, coinScale);
  } else {
    // ✅ Обновляем позиции существующих мон acreток
    this.updateCoinsPosition(heartPositions);
  }
}

// Приватный метод для внутренней логики (переименован из updateCoins выше)
private updateCoinsInternal(...): void { ... }
```

**Обоснование:** Публичный метод с кэшированием (`previousCoinCount`) предотвращает полное пересоздание спрайтов на каждом вызове. Это оптимизация производительности — спрайты пересоздаются только при изменении количества мон acreток.

---

### ШАГ 3: Интеграция с ItemCollisionHandler

**Обоснование:** ItemCollisionHandler отвечает за все коллизии игрока с предметами. Именно он знает, когда игрок подобрал мон acreтку или получил урон.

#### 3.1 Добавить обновление при сборе мон acreтки

**Файл:** `src/game/scenes/collision/ItemCollisionHandler.ts`

**Действие:** В методе обработки сбора мон acreтки добавить:

```typescript
// После gameState.addCoin()
const currentCoins = this.deps.gameState.getCoins();
const heartPositions = this.deps.healthSystem.getHeartPositions();
this.deps.player.updateCoins(currentCoins, heartPositions, KEYS.COIN_HEART, HEART_SCALE);
```

**Обоснование:** Вызов сразу после изменения состояния гарантирует синхронизацию отображения. Использование `KEYS.COIN_HEART` вместо строковой константы предотвращает опечатки.

#### 3.2 Добавить обновление при получении урона в фазе coin

**Файл:** `src/game/scenes/collision/ItemCollisionHandler.ts`

**Действие:** В методе обработки урона добавить условие:

```typescript
const currentPhase = this.deps.gameState.getGamePhase();
const currentCoins = this.deps.gameState.getCoins();

// В фазе coin урон отнимает мон acreтку
if (currentPhase === 'coin' && currentCoins > 0) {
  const heartPositions = this.deps.healthSystem.getHeartPositions();
  this.deps.player.updateCoins(currentCoins, heartPositions, KEYS.COIN_HEART, HEART_SCALE);
}
```

**Обоснование:** Проверка `currentCoins > 0` предотвращает вызов `updateCoins(0, ...)` когда мон acreток нет — это избыточно, так как `clearCoins()` будет вызван автоматически при `coinCount === 0` внутри `updateCoinsInternal()`.

#### 3.3 Добавить очистку при передаче Оракулу

**Файл:** `src/game/scenes/collision/ItemCollisionHandler.ts` или OracleCollisionHandler

**Действие:** После передачи всех мон acreток Оракулу:

```typescript
// Когда все мон acreтки переданы (coinCount = 0)
this.deps.player.clearCoins();
```

**Обоснование:** Явный вызов `clearCoins()` гарантирует удаление всех спрайтов и твинов сразу после передачи, а не при следующем обновлении. Это улучшает отзывчивость UI.

---

### ШАГ 4: Cleanup при уничтожении

**Обоснование:** При смерти игрока или смене уровня все спрайты и tweens должны быть корректно удалены для предотвращения утечек памяти.

#### 4.1 Добавить clearCoins() в destroy()

**Файл:** `src/game/entities/Player.ts`

**Действие:** Добавить в метод `destroy()` (строка ~1683):

```typescript
// ✅ Уничтожаем мон acreтки
this.clearCoins();
```

**Обоснование:** Вызов `clearCoins()` перед `this.sprite.destroy()` гарантирует, что все спрайты мон acreток и их tweens будут удалены до уничтожения сцены игрока.

#### 4.2 Добавить clearCoins() в clearGoldHearts()

**Файл:** `src/game/entities/Player.ts`

**Действие:** Добавить в метод `clearGoldHearts()` (строка ~1443):

```typescript
// ✅ Очищаем и мон acreтки (для безопасности и консистентности)
this.clearCoins();
```

**Обоснование:** Очистка мон acreток одновременно с золотыми сердечками предотвращает висящие спрайты при переключении фаз. Это "защита от дурака" — даже если фаза переключится некорректно, спрайты будут удалены.

---

## Зависимости и риски

### Текстура
- Файл `Coin5x5.png` должен существовать в `src/assets/Game_01/images/`
- **Статичная картинка 5x5 пикселей** (НЕ spritesheet, без кадров)
- Аналогична `Heart.Gold5x5.png` по формату

### DEPTHS константы
Если `DEPTHS.SCREEN.OVERHEAD_BASE` и `DEPTHS.SCREEN.OVERHEAD_GLOW` не существуют:

**Вариант A:** Добавить в `src/constants/gameConstants.ts`:
```typescript
DEPTHS: {
  SCREEN: {
    // ...
    OVERHEAD_BASE: 10,
    OVERHEAD_GLOW: 11,
    // ...
  }
}
```

**Вариант B:** Использовать существующие константы (если есть аналоги)

### Производительность
- **Tweens с `repeat: -1`** — вынужденная мера для визуального стиля
- **Атомарная потеря** (1 жизнь + 1 мон acreтка) → пересоздание всех твинов незаметно для i9-10920X
- **Критично:** `clearCoins()` ДО создания новых твинов (уже реализовано в `updateCoinsInternal()`)

### Риски (минимальные)
1. ✅ **Текстура не найдена** — проверка `if (!coinTexture)` в `updateCoinsInternal()`
2. ✅ **Позиция неправильная** — использование `heartPositions` из HealthSystem
3. ✅ **Утечка памяти** — `clearCoins()` в начале метода, остановка tweens перед удалением спрайтов
4. ✅ **Висящие спрайты** — cleanup в `destroy()` и `clearGoldHearts()`

---

## Тестирование

### Базовые сценарии
1. ✅ Собрать 1 мон acreтку → появляется 1 мон acreтка
2. ✅ Собрать 2 мон acreтки → появляются 2 мон acreтки
3. ✅ Собрать 3 мон acreтки → появляются 3 мон acreтки
4. ✅ Получить урон → исчезает 1 мон acreтка
5. ✅ Передать мон acreтки Оракулу → исчезают все мон acreтки

### Синхронизация
6. ✅ Мон acreтки следуют за игроком
7. ✅ Мон acreтки мигают как золотые сердечки
8. ✅ Мон acreтки скрывают соответствующие красные сердечки

### Граничные случаи
9. ✅ Смерть с мон acreтками → cleanup без утечек
10. ✅ Смена фазы coin → key → корректная очистка
11. ✅ 0 мон acreток → ничего не отображается
12. ✅ Быстрый сбор/потеря нескольких мон acreток → нет лагов

---

## Примечания

**Копирование из золотых сердечек:**
Система мон acreток является **почти полным копией** системы золотых сердечек:
- Те же методы: `updateCoinsInternal()`, `updateCoinsPosition()`, `clearCoins()`
- Та же логика мигания: ADD blend + alpha tween (0 → 0.6 → 0)
- Те же параметры: depth (через константы), scale, blend mode
- Та же интеграция: вызов из ItemCollisionHandler

**Единственные отличия:**
- Название массивов: `coin*` вместо `goldHeart*`
- Текстура: `Coin5x5.png` вместо `Heart.Gold5x5.png`
- Количество зависит от `gameState.getCoins()` вместо `gameState.getKeys()`
- Depth через константы: `DEPTHS.SCREEN.OVERHEAD_*` вместо magic numbers

**Преимущества упрощения:**
- Минимум нового кода (копипаст из золотых сердечек)
- Минимум рисков (проверенная логика)
- Простота тестирования
- Автоматический cleanup при `coinCount === 0`
