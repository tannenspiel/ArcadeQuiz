# Coin Mechanic - Implementation Plan (v3 - Technical Audit)

**Plan ID:** 2026-01-29_coin-mechanic
**Status:** ✅ COMPLETED
**Branch:** `feature/coin-mechanic`
**Version:** v3 - **TECHNICAL AUDIT** (добавлены mitigation шаги)

---

## Quick Links

| Файл | Описание | Статус |
|------|----------|--------|
| [PLAN.md](./PLAN.md) | Полный план реализации (28 шагов) | ✅ FINAL AUDITED v3 |
| [PROGRESS.md](./PROGRESS.md) | Журнал выполнения шагов | 28 / 28 steps ✅ |
| [WORKFLOW.md](./WORKFLOW.md) | Правила работы с планом | Read first |

---

## Краткое описание

Двухэтапная механика сбора айтемов:

1. **Coin Phase:** Монетки → Oracle
   - При сборе монетки появляется **коин-квиз с бабблами** (без модального окна!)
   - Две кнопки-баббла с утверждениями (одно верное, одно неверное)
   - Правильный ответ → +очки, +монетка
   - Неправильный ответ → -жизнь, без монетки

2. **Key Phase:** Ключи → Порталы
   - При сборе ключа появляется **модальное окно** (как и раньше)
   - Ключи заносятся в порталы

---

## Progress Overview

```
Phase 1: [█████] 6/6  - Architecture Foundation + UI configs ✅
Phase 2: [█████] 4/4  - Item Classes ✅
Phase 3: [█████] 4/4  - Quiz Data & UI ✅
Phase 4: [█████] 3/3  - Game State & Oracle ✅
Phase 5: [█████] 5/5  - Animation & Collision ✅
Phase 6: [█████] 2/2  - Phase Transition ✅
Phase 7: [█████] 3/3  - Testing & Docs ✅

Total:   [█████] 28/28 (100%) ✅ PLAN COMPLETE!
```

---

## Critical Files

**Создать:**
- `src/game/entities/items/AbstractItem.ts`
- `src/game/entities/items/Coin.ts`
- `src/game/entities/items/Key.ts`
- `src/game/entities/items/Heart.ts`
- `src/game/scenes/animation/CoinAnimationSync.ts`
- `src/game/ui/CoinBubbleQuiz.ts` ⚠️ **НОВОЕ**
- `src/game/scenes/quiz/CoinQuizHandler.ts` ⚠️ **НОВОЕ**
- `public/assets/data/coin-quiz.json` ⚠️ **НОВОЕ**

**Изменить:**
- `src/config/spritesheetConfigs.ts` - добавить UI.CoinBubble_30x30 и Coin
- `src/constants/gameConstants.ts` - добавить GamePhase, ItemType, ACTOR_SIZES.COIN, **NEW EVENTS**
- `src/types/levelTypes.ts` - добавить coins в ItemSpawnConfig
- `src/game/core/LevelManager.ts` - дефолтные значения для coins
- `src/config/levelConfigs/*.json` - секция coins
- `src/game/scenes/collision/ItemCollisionHandler.ts` - рефакторинг: разные квизы для Coin/Key
- `src/game/scenes/MainScene.ts` - coinsGroup, CoinAnimationSync, CoinBubbleQuiz
- `src/game/ui/UIManager.ts` - ⚠️ **НОВОЕ** - добавить handleShowCoinQuiz
- `src/game/core/GameState.ts` - ⚠️ **НОВОЕ** - добавить isQuizActive, quizType

---

## Completion Summary

**Completed:** 2026-01-30
**Total Duration:** 1 day
**All 28 steps completed successfully** ✅

**Key Deliverables:**
- ✅ Coin collection mechanic with quiz bubbles
- ✅ Two-phase game system (Coin Phase → Key Phase)
- ✅ Oracle accepts both coins and keys
- ✅ Phase-based spawning system
- ✅ Complete test coverage

См. [PROGRESS.md](./PROGRESS.md) для детального журнала выполнения

---

## Audit Status

✅ Все 10 критических рисков mitigated:

1. ✅ SpawnMatrix утечка → AbstractItem.autoFree()
2. ✅ Застывшие монетки → CoinAnimationSync
3. ✅ Неправильная логика квиза → Phase check
4. ✅ LevelConfig undefined coins → Extended (Step 1.5)
5. ✅ ItemCollisionHandler перегружен → Refactored (Step 5.2)
6. ✅ Анимация смерти смещена → Centered (Step 2.1)
7. ✅ CoinBubbleQuiz позиционирование → setScrollFactor(0) (Step 3.2) ⚠️ AUDITED
8. ✅ UIManager не знает про CoinBubbleQuiz → Extended UIManager (Step 3.4) ⚠️ AUDITED
9. ✅ Конфликт состояния квиза → Quiz State protection (Step 5.5) ⚠️ AUDITED
10. ✅ Destruction Order → UIManager.destroy() cleanup (Step 3.4) ⚠️ AUDITED

---

## Technical Audit Findings (v3)

**Новые mitigation steps (добавлено в v3):**
- Step 3.4: Extend UIManager for CoinBubbleQuiz
- Step 5.5: Add Quiz State protection in GameState
- Step 7.3: Create CoinBubbleQuiz tests

**Новые константы:**
- EVENTS.SHOW_COIN_QUIZ
- EVENTS.COIN_QUIZ_COMPLETED
- SOUND_KEYS.PICKUP_COIN

---

**Создано:** 2026-01-29
**Обновлено:** 2026-01-30 (v3 - Technical Audit Complete)
