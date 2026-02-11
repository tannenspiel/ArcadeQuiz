# Прогресс: Система монеток у персонажа (упрощённая)

**Дата последнего обновления:** 2026-02-02
**Общий статус:** ✅ ЗАВЕРШЕНО

**План:** [PLAN.md](./PLAN.md) (ОБНОВЛЁН ПОСЛЕ ТЕХНИЧЕСКОГО АУДИТА)
**Аудит:** [AUDIT_KEY_HEARTS.md](./AUDIT_KEY_HEARTS.md)

---

## Текущий статус

Выполнено **4 из 4 шагов** ✅

**УПРОЩЕНИЕ:** Система монеток является копией системы золотых сердечек с минимальными изменениями.

**АУДИТ ВКЛЮЧЁН:**
- Z-Depth через константы DEPTHS вместо magic numbers
- Производительность tweens (clearCoins до создания новых)
- Синхронизация позиций через heartPositions из HealthSystem

---

## Детальный статус по шагам

### ШАГ 1: Фундамент ассетов и констант
**Статус:** ✅ DONE

**Подшаги:**
- [x] 1.1 Добавить `COIN_HEART: 'coin_heart'` в KEYS (gameConstants.ts)
- [x] 1.2 Проверить/добавить `DEPTHS.SCREEN.OVERHEAD_BASE` и `DEPTHS.SCREEN.OVERHEAD_GLOW`
- [x] 1.3 Загрузить `Coin5x5.png` как image в LoadingScene.ts

**Затронутые файлы:**
- `src/constants/gameConstants.ts` - ключ и DEPTHS константы
- `src/game/scenes/LoadingScene.ts` - загрузка текстуры

---

### ШАГ 2: Система монеток в Player.ts
**Статус:** ✅ DONE

**Подшаги:**
- [x] 2.1 Добавить свойства (coinSprites, coinGlowSprites, etc.)
- [x] 2.2 Добавить метод `updateCoinsInternal()` (приватный, копия updateGoldHearts)
- [x] 2.3 Добавить метод `updateCoinsPosition()`
- [x] 2.4 Добавить метод `clearCoins()`
- [x] 2.5 Добавить вызов `updateCoinsPosition()` в `Player.update()`
- [x] 2.6 Добавить публичный метод `updateCoins()` с кэшированием

**Затронутые файлы:**
- `src/game/entities/Player.ts`

---

### ШАГ 3: Интеграция с ItemCollisionHandler
**Статус:** ✅ DONE

**Подшаги:**
- [x] 3.1 Добавить вызов `updateCoins()` при сборе мон acreтки (CoinQuizHandler.ts)
- [x] 3.2 Добавить вызовы `updateCoins()` при получении урона в фазе coin (EnemyCollisionHandler.ts)
- [x] 3.3 Добавить вызов `updateCoins()` при передаче Оракулу (OracleCollisionHandler.ts)

**Затронутые файлы:**
- `src/game/scenes/quiz/CoinQuizHandler.ts` - правильный ответ
- `src/game/scenes/collision/EnemyCollisionHandler.ts` - урон
- `src/game/scenes/collision/OracleCollisionHandler.ts` - передача

---

### ШАГ 4: Cleanup при уничтожении
**Статус:** ✅ DONE

**Подшаги:**
- [x] 4.1 Добавить `clearCoins()` в `Player.destroy()`
- [x] 4.2 Добавить `clearCoins()` в `Player.clearGoldHearts()`

**Затронутые файлы:**
- `src/game/entities/Player.ts`

---

## Примечания и проблемы

### Открытые вопросы (все решены упрощением и аудитом)
- ~~Какой формат Coin5x5.png?~~ **Ответ:** Статичная картинка 5x5, загружаем как image
- ~~Где вызывать clearCoins() при смене фазы?~~ **Ответ:** Автоматически при coinCount === 0, плюс в clearGoldHearts() для безопасности
- ~~Нужна ли логика мигания через прозрачность?~~ **Ответ:** НЕТ, только как у золотых сердечек
- ~~Использовать magic numbers для depth?~~ **Ответ:** НЕТ, использовать DEPTHS константы

### Технические примечания из аудита
- ✅ Текстура `Coin5x5.png` уже добавлена пользователем
- ✅ Формат аналогичен `Heart.Gold5x5.png` (статичная картинка)
- ✅ Загружается как `image`, не `spritesheet` (экономия памяти)
- ✅ Позиции те же, что у сердечек (через heartPositions)
- ✅ Depth через константы `DEPTHS.SCREEN.OVERHEAD_*` вместо magic numbers
- ✅ `clearCoins()` в начале метода → предотвращает утечки памяти

### Преимущества упрощения + аудита
- Копипаст из золотых сердечек (минимум рисков)
- Mentor Plan style с обоснованиями для каждого шага
- Производительность учтена (tweens cleanup)
- Z-depth через константы (рефакторинг-готово)
- Простейшее тестирование

---

## История изменений

**2026-02-02 (ФИНАЛ - ВЕРИФИЦИРОВАНО В БРОУЗЕРЕ):**
- ✅ **РЕАЛИЗАЦИЯ ПОЛНОСТЬЮ ЗАВЕРШЕНА И ПРОВЕРЕНА В БРОУЗЕРЕ**
- Исправлен баг: `CollisionSystem` использовал `onPlayerKeyCollision` для мон acreток → добавлен `onPlayerCoinCollision`
- Исправлен баг: `getHeartPositions()` вызывался без параметров → добавлены `playerX, playerY`
- Исправлен баг: `Player.update()` не передавал `heartPositions` в методы синхронизации
- Исправлено позиционирование: мон acreтки теперь внизу персонажа (offset: +22px)
- ✅ ВЕРИФИЦИРОВАНО: Нижняя граница мон acreток совпадает с нижней границей персонажа (playerBottom ≈ coinBottom)

**Параметры позиционирования:**
- `offsetY: 22` - рассчитано как `displayHeight/2 - coinSize/2` = `64/2 - 20/2` = `32 - 10` = `22`
- Мон acreтки отображаются внизу персонажа, НЕ перекрывая серд acreчки сверху

**Дополнительные исправленные файлы:**
- `src/game/systems/CollisionSystem.ts` - добавлен `onPlayerCoinCollision` callback
- `src/game/scenes/MainScene.ts` - добавлен обработчик `setOnPlayerCoinCollision`
- `src/game/scenes/quiz/CoinQuizHandler.ts` - исправлен `getHeartPositions(playerX, playerY)`
- `src/game/scenes/collision/EnemyCollisionHandler.ts` - исправлен `getHeartPositions(playerX, playerY)`
- `src/game/scenes/collision/OracleCollisionHandler.ts` - исправлен `getHeartPositions(playerX, playerY)`
- `src/game/entities/Player.ts` - исправлено позиционирование (`offsetY: -2`) и синхронизация

**Упрощения (v1):**
- Убрана логика мигания через прозрачность
- Текстура загружается как image, не spritesheet
- Отображение завязано только на `gameState.getCoins()`

**Аудит (v2):**
- Добавлено использование DEPTHS констант вместо magic numbers
- Добавлены примечания по производительности tweens
- Добавлены обоснования для каждого шага (Mentor Plan style)
- Структура плана изменена на 4 шага вместо 5
