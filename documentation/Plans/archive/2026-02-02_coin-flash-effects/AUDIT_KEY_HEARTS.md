# Аудит: Система золотых сердечек над головой персонажа

**Дата:** 2026-02-02
**Назначение:** Детальный анализ реализации системы золотых сердечек для копирования на систему монеток

---

## Обзор архитектуры

Система золотых сердечек отображает количество собранных ключей над головой персонажа.
Золотые сердечки заменяют обычные красные сердечки и мигают для визуального эффекта.

**Основные компоненты:**
1. **Player.ts** - содержит всю логику создания и обновления золотых сердечек
2. **HealthSystem** - управляет обычными сердечками и их видимостью
3. **ItemCollisionHandler** - вызывает обновление при сборе ключа

---

## Детальный разбор реализации

### 1. Свойства класса Player (строки 60-64)

```typescript
// ✅ Новая система золотых сердечек для отображения ключей
private goldHeartSprites: Phaser.GameObjects.Sprite[] = [];
private goldHeartGlowSprites: Phaser.GameObjects.Sprite[] = []; // ✅ Спрайты для эффекта свечения
private goldHeartBlinkTweens: Phaser.Tweens.Tween[] = [];
private previousKeyCount: number = -1; // Для отслеживания изменений
```

**Назначение:**
- `goldHeartSprites` - базовые спрайты сердечек (непрозрачные, NORMAL blend)
- `goldHeartGlowSprites` - спрайты свечения (прозрачные, ADD blend, мигают)
- `goldHeartBlinkTweens` - анимации мигания для каждого свечения
- `previousKeyCount` - кэш для оптимизации (обновляем только при изменении)

### 2. Точка входа: updateKeyRings() (строки 1302-1332)

```typescript
public updateKeyRings(
  keyCount: number,
  heartPositions?: { x: number; y: number }[],
  goldHeartTexture?: string,
  heartScale?: number
): void
```

**Вызывается из:** `ItemCollisionHandler.ts` при сборе ключа

**Логика:**
1. Проверяет валидность спрайта игрока
2. Если количество ключей изменилось → вызывает `updateGoldHearts()` (полное пересоздание)
3. Если количество не изменилось → вызывает `updateGoldHeartsPosition()` (только позиция)

**Параметры:**
- `keyCount` - количество собранных ключей (0-3)
- `heartPositions` - массив координат [{x, y}, ...] над головой игрока
- `goldHeartTexture` - ключ текстуры (обычно 'Heart.Gold5x5')
- `heartScale` - масштаб сердечка

### 3. Создание сердечек: updateGoldHearts() (строки 1337-1400)

**Шаг 3.1: Очистка старых**
```typescript
this.clearGoldHearts();
```

**Шаг 3.2: Валидация**
```typescript
if (keyCount <= 0 || !heartPositions || !goldHeartTexture || !heartScale) {
  return;
}
```

**Шаг 3.3: Создание пар спрайтов для каждого ключа**
```typescript
for (let i = 0; i < maxGoldHearts; i++) {
  // 1. БАЗОВЫЙ спрайт (Непрозрачный, NORMAL blend)
  const goldHeartBase = this.scene.add.sprite(roundedX, roundedY, goldHeartTexture);
  goldHeartBase.setScale(heartScale);
  goldHeartBase.setDepth(10); // ВЫШЕ обычных сердечек (depth=9)
  goldHeartBase.setAlpha(1); // ПОЛНОСТЬЮ непрозрачный
  goldHeartBase.setBlendMode(Phaser.BlendModes.NORMAL);

  // 2. СПРАЙТ СВЕЧЕНИЯ (Прозрачный, ADD blend)
  const goldHeartGlow = this.scene.add.sprite(roundedX, roundedY, goldHeartTexture);
  goldHeartGlow.setScale(heartScale);
  goldHeartGlow.setDepth(11); // ВЫШЕ базового
  goldHeartGlow.setAlpha(0); // Стартуем с 0
  goldHeartGlow.setBlendMode(Phaser.BlendModes.ADD);

  // 3. Твин мигания: alpha 0.0 → 0.6 → 0.0
  const blinkTween = this.scene.tweens.add({
    targets: goldHeartGlow,
    alpha: 0.6,
    duration: 500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
}
```

**ВАЖНО:** Базовый спрайт всегда непрозрачный (alpha=1), мигает только спрайт свечения.

**Шаг 3.4: Скрытие соответствующего красного сердечка**
```typescript
if (healthSystem && healthSystem.setHeartOverride) {
  healthSystem.setHeartOverride(i, true);
}
```

Это скрывает обычное красное сердечко, чтобы избежать артефактов рендеринга.

### 4. Обновление позиций: updateGoldHeartsPosition() (строки 1405-1431)

Вызывается каждый кадр из `Player.update()` (строка 905):

```typescript
// ✅ Синхронизируем позиции золотых сердечек
this.updateGoldHeartsPosition();
```

**Логика:**
- Обновляет позицию каждого спрайта на `heartPositions[i]`
- Координаты округляются до целых пикселей
- Обновляет И базовый спрайт, И спрайт свечения

### 5. Очистка: clearGoldHearts() (строки 1436-1466)

**Действия:**
1. Останавливает все tweens
2. Удаляет все базовые спрайты
3. Возвращает видимость красных сердечек (`healthSystem.setHeartOverride(i, false)`)
4. Удаляет все спрайты свечения

**Вызывается при:**
- Перед созданием новых сердечек
- При уничтожении игрока
- при смене уровня

### 6. Синхронизация с игроком

**Позиции сердечек вычисляются в HealthSystem** и передаются в `Player.updateKeyRings()`.

**Вызов из ItemCollisionHandler.ts:**
```typescript
// После сбора ключа
const heartPositions = this.deps.healthSystem.getHeartPositions();
this.deps.player.updateKeyRings(keyCount, heartPositions, 'Heart.Gold5x5', HEART_SCALE);
```

---

## Характеристики мигания

**Способ:** ADD blend + alpha анимация

**Параметры:**
- `alpha: 0.6` - максимальная прозрачность свечения
- `duration: 500` - полупериод мигания (0.5 сек)
- `yoyo: true` - туда-обратно
- `repeat: -1` - бесконечно
- `ease: 'Sine.easeInOut'` - плавное изменение

**Визуальный эффект:**
- Базовый спрайт: 100% непрозрачный, даёт основу
- Спрайт свечения: добавляется сверху через ADD blend
- Итог: "сверкающее" сердечко с яркостью >100%

---

## Интеграция с остальными системами

### GameState
- `getKeys()` - возвращает количество ключей
- `getGamePhase()` - возвращает 'key' или 'coin'

### HealthSystem
- `getHeartPositions()` - координаты сердечек над головой
- `setHeartOverride(index, hidden)` - скрыть/показать красное сердечко

### ItemCollisionHandler
```
handleKeyCollision() →
  gameState.addKey() →
  healthSystem.getHeartPositions() →
  player.updateKeyRings()
```

---

## Поток данных при сборе ключа

```
1. Игрок касается ключа
   ↓
2. ItemCollisionHandler.handleKeyCollision()
   ↓
3. gameState.addKey()
   ↓
4. healthSystem.removeHeart() // Удаляет одно сердечко
   ↓
5. healthSystem.getHeartPositions() // Получает позиции
   ↓
6. player.updateKeyRings(keyCount, positions, texture, scale)
   ↓
7. Если keyCount изменился → clearGoldHearts() → updateGoldHearts()
   ↓
8. Создаются пары спрайтов (base + glow)
   ↓
9. healthSystem.setHeartOverride(i, true) // Скрывает красные
   ↓
10. Каждый кадр → updateGoldHeartsPosition() // Синхронизация
```

---

## Ключевые моменты для копирования на мон acreтки

### Что скопировать 1:1
1. Структуру массивов (`coinSprites`, `coinGlowSprites`, `coinBlinkTweens`)
2. Метод `updateCoins()` (аналог `updateGoldHearts()`)
3. Метод `updateCoinsPosition()` (аналог `updateGoldHeartsPosition()`)
4. Метод `clearCoins()` (аналог `clearGoldHearts()`)
5. Вызов из `Player.update()` для синхронизации позиций

### Что изменить
1. **Текстура:** `Coin5x5.png` вместо `Heart.Gold5x5.png`
2. **Условие мигания:** Проверять `healthStates[i]` для выбора типа мигания
3. **Логика мигания при отсутствии сердечка:** Изменить alpha базового спрайта (0→1→0)

### Что добавить
1. **Метод в HealthSystem:** `getHeartStates(): boolean[]`
2. **Параметр в updateCoins():** `healthStates: boolean[]`
3. **Условная логика мигания:**
   ```typescript
   if (healthStates[i]) {
     // Есть сердечко → мигание как золотое (ADD blend + glow)
   } else {
     // Нет сердечка → мигание через прозрачность (alpha базового)
   }
   ```

---

## Потенциальные проблемы

### 1. Переключение фаз (key ↔ coin)
**Проблема:** При смене фазы нужно очистить старые спрайты.

**Решение:** Вызывать `clearGoldHearts()` или `clearCoins()` при смене фазы.

### 2. Синхронизация с уроном
**Проблема:** При получении урона количество сердечек меняется.

**Решение:** `updateCoins()` должен вызываться при изменении количества монеток И при изменении состояний сердечек.

### 3.Cleanup при смерти
**Проблема:** Спрайты должны удаляться при смерти игрока.

**Решение:** Добавить `clearCoins()` в метод `destroy()` игрока.

---

## Список файлов для изучения

1. `src/game/entities/Player.ts` - строки 60-66, 905, 1302-1466
2. `src/game/scenes/collision/ItemCollisionHandler.ts` - обработка сбора ключа
3. `src/game/systems/HealthSystem.ts` - getHeartPositions(), setHeartOverride()
4. `src/constants/gameConstants.ts` - HEART_SCALE, глубина рендеринга

---

## Проверочные вопросы для аудита монеток

- [ ] Создаются ли пары спрайтов (base + glow) для каждой мон acreтки?
- [ ] Правильно ли работает мигание при наличии сердечка?
- [ ] Правильно ли работает мигание при ОТСУТСТВИИ сердечка?
- [ ] Синхронизируются ли позиции мон acreток с игроком каждый кадр?
- [ ] Очищаются ли мон acreтки при смене фазы?
- [ ] Очищаются ли мон acreтки при смерти игрока?
- [ ] Скрываются ли соответствующие красные сердечки?
- [ ] Работает ли система при 0, 1, 2, 3 мон acreтках?
