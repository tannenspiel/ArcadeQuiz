# План рефакторинга: Шаг 6 - QuizHandlers

**Родительский план:** [Refactoring_MASTER_PLAN.md](./Refactoring_MASTER_PLAN.md)
**Статус:** PLAN_DRAFT
**Цель:** Вынести логику викторин (Quiz) из `MainScene.ts` в специализированные обработчики.

## Контекст
В данный момент `MainScene.ts` содержит множество методов для обработки викторин:
- Ключи (`handleKeyQuizCorrect`, `handleKeyQuizWrong`, `handleKeyQuizClose`)
- Порталы (`handlePortalEnterConfirmed`, `handlePortalEnterCancelled`, `handlePortalEntry`)
- Глобальные вопросы (`showGlobalQuestion`, `showFallbackGlobalQuestion`)

## Создаваемые компоненты

### 1. `src/game/scenes/quiz/KeyQuizHandler.ts`
Отвечает за обработку результатов викторины с ключами.
- **Методы:**
    - `handleCorrectAnswer(data: any)`
    - `handleWrongAnswer()`
    - `handleQuizClose()`

### 2. `src/game/scenes/quiz/PortalQuizHandler.ts`
Отвечает за взаимодействие с порталами (вход, подтверждение).
- **Методы:**
    - `handleEntry(portal: AbstractPortal)`
    - `handleConfirm()`
    - `handleCancel()`

### 3. `src/game/scenes/quiz/GlobalQuestionManager.ts`
Управляет отображением глобального вопроса уровня (Oracle bubble).
- **Методы:**
    - `showGlobalQuestion()`
    - `showFallbackGlobalQuestion()`

## План действий

1.  [ ] **Подготовка:** Создать файлы классов в `src/game/scenes/quiz/`.
2.  [ ] **KeyQuizHandler:**
    - Перенести логику начисления очков (`scoreManager`).
    - Перенести логику визуальных эффектов (`effectsManager`, `flashPlayerGetKey`).
    - Перенести уничтожение ключа.
3.  [ ] **PortalQuizHandler:**
    - Перенести логику открытия модального окна портала.
    - Перенести логику телепортации (смена сцены).
4.  [ ] **GlobalQuestionManager:**
    - Перенести логику выбора и отображения вопроса Оракула.
5.  [ ] **Интеграция в MainScene:**
    - Инициализировать хендлеры в `create()`.
    - Подписать хендлеры на события через `EventBus.on(EVENTS.KEY_QUIZ_COMPLETED, ...)` и т.д.
6.  [ ] **Очистка:** Удалить старые методы из `MainScene.ts`.

## Верификация
- Пройти викторину с ключом -> проверить начисление очков, уничтожение ключа.
- Попробовать войти в портал -> проверить модальное окно.
- Проверить отображение вопроса у Оракула.
