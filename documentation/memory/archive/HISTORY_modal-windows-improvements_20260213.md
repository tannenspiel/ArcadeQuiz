# Project History - Milestones

**Purpose:** Chronology of completed work. This file is for major milestones, not minor edits.

---

## 2026-02-13: Modal Windows Improvements + Font Size Bugfix

**Status:** ✅ COMPLETED

### Summary
Комплексная задача по улучшению модальных окон: анализ, удаление неиспользуемого кода, рефакторинг дублирующей логики, улучшение масштабирования. Фикс бага TypeError в ItemCollisionHandler. Фикс бага с диапазонами aspect ratio.

### Выполнено

**Шаг 1: Удаление React компонентов** — 7 файлов удалено
- `src/react/components/QuizModal.tsx`
- `src/react/components/GameOverModal.tsx`
- `src/react/components/UIOverlay.tsx`
- `src/tests/unit/react/*.test.tsx` (3 файла)
- `src/react/components/LoadingScreen.tsx.deprecated`

**Шаг 2: Создание ModalPositioningHelper** — новый модуль
- Функции: snapToGrid, snapToGridDouble, createSnappedPosition, isGridAligned
- 242 строки кода + 19 тестов
- Устранено дублирование Grid Snapping кода

**Шаги 3-4: Рефакторинг PortalModal и GameOverModal**
- Импорт функций из ModalPositioningHelper
- Удалены локальные дублирующие функции

**Шаг 5: Исправление CoinBubbleQuiz**
- Жёсткие размеры заменены на динамические с snapToGridDouble
- `bubbleBtnWidth = snapToGridDouble(modalSize.width * 0.95)`
- `bubbleBtnHeight = snapToGridDouble(modalSize.height * 0.2)`

**Шаг 6: Флаг отладки для логов**
- `DEBUG_BUTTON_EVENTS` добавлен в gameConfig.ts и debugConfig.ts
- Условное логирование в Button.ts (отложено из-за mock проблем)

**Шаг 7: Обновление документации**
- `UI_TEXT_SCALING.md` обновлена до v1.1
- `MODAL_GUIDE.md` обновлена до v1.1

**Бонус 1: Фикс TypeError в ItemCollisionHandler**
- Строка 27: `this.scene['sys']?.settings?.active`
- Строка 63: `this.scene['sys']?.settings?.active`
- Optional chaining предотвращает ошибку когда scene['sys'] undefined

**Бонус 2: Фикс бага с диапазонами aspect ratio**
- **Проблема:** `TABLET_SQUARE` (minAR=0.75, maxAR=1.0) дублировал `MOBILE_STANDARD` (minAR=0.75, maxAR=1.0)
- **Следствие:** Была дыра 1.0-1.3, для screenAR=1.13 выбирался "Unknown" fallback
- **Решение:** Исправлен диапазон `TABLET_SQUARE` → minAR=1.0, maxAR=1.3
- **Дополнительно:** Множители для широких экранов уменьшены с 1.49/1.54 до 1.3

**Бонус 3: Фикс проверки fontSize в KeyQuestionModal**
- **Проблема:** Защита от переполнения использовала `this.questionText.height` ПОСЛЕ `setScale(invZoom)`, что давало неправильные значения
- **Следствие:** Защита срабатывала на уже умноженном fontSize (62.40px вместо расчётного 48px)
- **Решение:** Проверять `questionFontSize` напрямую вместо `this.questionText.height`
- Изменено для вопроса и фидбэка

### Результаты
- **45 файлов изменено** (+422 / -60 строк)
- **Тесты:** 1821/1821 passing
- **Удалены 7 неиспользуемых файлов** (React legacy код)
- **Создан ModalPositioningHelper** — устранено дублирование
- **Исправлен баг с диапазонами aspect ratio** — дыра 1.0-1.3 закрыта
- **Исправлен баг с проверкой fontSize** — теперь проверяется fontSize вместо height

### Изменённые файлы
- `src/game/ui/PortalModal.ts` — рефакторинг
- `src/game/ui/GameOverModal.ts` — рефакторинг
- `src/game/ui/CoinBubbleQuiz.ts` — динамические размеры
- `src/game/ui/ModalPositioningHelper.ts` — НОВЫЙ
- `src/game/ui/ModalSizeCalculator.ts` — фикс диапазона TABLET_SQUARE
- `src/game/ui/KeyQuestionModal.ts` — фикс проверки fontSize (вместо height)
- `src/constants/textStyles.ts` — множители для широких экранов 1.49/1.54 → 1.3
- `src/tests/unit/utils/FontSizeCalculator.test.ts` — обновлены ожидаемые значения
- `src/config/gameConfig.ts` — добавлен DEBUG_BUTTON_EVENTS
- `src/config/debugConfig.ts` — экспорт DEBUG_BUTTON_EVENTS
- `src/game/scenes/collision/ItemCollisionHandler.ts` — фикс TypeError
- `documentation/main/ui/UI_TEXT_SCALING.md` — обновлена
- `documentation/main/ui/MODAL_GUIDE.md` — обновлена
- `documentation/Plans/2026-02-13_modal-windows-improvements/*` — созданы план, прогресс, README

**⚠️ КРИТИЧЕСКИЕ ОГРАНЕЧЕНИЯ (соблюдены):**
- FontSizeCalculator.ts (расчёт baseFontSize) — НЕ менялся
- calculateModalSize — НЕ менялся

### Изменённые файлы
- `src/game/ui/PortalModal.ts` — рефакторинг
- `src/game/ui/GameOverModal.ts` — рефакторинг
- `src/game/ui/CoinBubbleQuiz.ts` — динамические размеры
- `src/game/ui/ModalPositioningHelper.ts` — НОВЫЙ
- `src/game/ui/ModalSizeCalculator.ts` — фикс диапазона TABLET_SQUARE
- `src/constants/textStyles.ts` — множители для широких экранов 1.49/1.54 → 1.3
- `src/tests/unit/utils/FontSizeCalculator.test.ts` — обновлены ожидаемые значения
- `src/config/gameConfig.ts` — добавлен DEBUG_BUTTON_EVENTS
- `src/config/debugConfig.ts` — экспорт DEBUG_BUTTON_EVENTS
- `src/game/scenes/collision/ItemCollisionHandler.ts` — фикс TypeError
- `documentation/main/ui/UI_TEXT_SCALING.md` — обновлена
- `documentation/main/ui/MODAL_GUIDE.md` — обновлена
- `documentation/Plans/2026-02-13_modal-windows-improvements/*` — созданы план, прогресс, README

**⚠️ КРИТИЧЕСКИЕ ОГРАНЕЧЕНИЯ:**
- FontSizeCalculator.ts — НЕ менялся
- KeyQuestionModal.ts createUI() — НЕ менялся

---

## Archived Entries

Previous milestones have been archived to:
**→ [archive/HISTORY_loading-screen-ui_2026-02-12.md](archive/HISTORY_loading-screen-ui_2026-02-12.md)**

---

**Rotation Policy:** Новая задача = новый файл (жёсткое правило).

**Last rotation:** 2026-02-13
