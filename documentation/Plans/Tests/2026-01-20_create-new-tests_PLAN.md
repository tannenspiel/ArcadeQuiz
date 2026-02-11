# План создания тестов для новых классов после рефакторинга

**Дата создания:** 2026-01-20
**Статус:** TODO
**Приоритет:** HIGH

---

## Контекст

После рефакторинга MainScene.ts было создано **22 новых класса** без тестов. Этот план описывает создание тестов для всех новых классов с контрольными точками для возобновления работы.

**Связанные документы:**
- [`2026-01-20_main-refactor-test-compliance_PLAN.md`](./2026-01-20_main-refactor-test-compliance_PLAN.md) — анализ соответствия тестов
- [`2026-01-20_main-refactor-test-compliance_PROGRESS.md`](./2026-01-20_main-refactor-test-compliance_PROGRESS.md) — текущий статус

---

## Шаги плана

### ЭТАП 1: Критические классы (HIGH priority) — 7 тестов

#### ✅ Контрольная точка 1.1: EventBusManager.test.ts — ЗАВЕРШЕНО
- [x] Создать файл `src/tests/unit/scenes/gameflow/EventBusManager.test.ts`
- [x] Тесты:
  - [x] Инициализация EventBusManager
  - [x] Регистрация обработчиков событий
  - [x] Отправка событий
  - [x] Удаление обработчиков
  - [x] Очистка при destroy()

**Дата завершения:** 2026-01-20
**Результат:** 21 тест PASS

**Файл для изучения:** `src/game/scenes/gameflow/EventBusManager.ts`

---

#### ✅ Контрольная точка 1.2: GameOverHandler.test.ts — ЗАВЕРШЕНО
- [x] Создать файл `src/tests/unit/scenes/gameflow/GameOverHandler.test.ts`
- [x] Тесты:
  - [x] Обработка game over
  - [x] Показ модального окна
  - [x] Рестарт уровня
  - [x] Очистка при destroy()

**Дата завершения:** 2026-01-20
**Результат:** 32 теста PASS

**Файл для изучения:** `src/game/scenes/gameflow/GameOverHandler.ts`

---

#### ✅ Контрольная точка 1.3: EnemyCollisionHandler.test.ts — ЗАВЕРШЕНО
- [x] Создать файл `src/tests/unit/scenes/collision/EnemyCollisionHandler.test.ts`
- [x] Тесты:
  - [x] Обработка коллизии игрок-враг
  - [x] Получение урона
  - [x] Неуязвимость после получения урона
  - [x] Game Over при 0 HP

**Дата завершения:** 2026-01-20
**Результат:** 31 тест PASS

**Файл для изучения:** `src/game/scenes/collision/EnemyCollisionHandler.ts`

---

#### ✅ Контрольная точка 1.4: ItemCollisionHandler.test.ts — ЗАВЕРШЕНО
- [x] Создать файл `src/tests/unit/scenes/collision/ItemCollisionHandler.test.ts`
- [x] Тесты:
  - [x] Подбор сердечка (+HP)
  - [x] Подбор ключа (+key)
  - [x] Лимит максимального HP
  - [x] Лимит максимального количества ключей

**Дата завершения:** 2026-01-20
**Результат:** 32 теста PASS

**Файл для изучения:** `src/game/scenes/collision/ItemCollisionHandler.ts`

---

#### ✅ Контрольная точка 1.5: PortalCollisionHandler.test.ts — ЗАВЕРШЕНО
- [ ] Создать файл `src/tests/unit/scenes/collision/ItemCollisionHandler.test.ts`
- [ ] Тесты:
  - [ ] Подбор сердечка (+HP)
  - [ ] Подбор ключа (+key)
  - [ ] Лимит максимального HP
  - [ ] Лимит максимального количества ключей

**Файл для изучения:** `src/game/scenes/collision/ItemCollisionHandler.ts`

---

#### Контрольная точка 1.5: PortalCollisionHandler.test.ts
- [ ] Создать файл `src/tests/unit/scenes/collision/PortalCollisionHandler.test.ts`
- [ ] Тесты:
  - [ ] Вход в портал
  - [ ] Показ викторины
  - [ ] Переход на следующий уровень после правильного ответа
  - [ ] Обработка отмены викторины

**Файл для изучения:** `src/game/scenes/collision/PortalCollisionHandler.ts`

---

#### Контрольная точка 1.6: KeyQuizHandler.test.ts
- [ ] Создать файл `src/tests/unit/scenes/quiz/KeyQuizHandler.test.ts`
- [ ] Тесты:
  - [ ] Показ викторины при подборе ключа
  - [ ] Обработка правильного ответа
  - [ ] Обработка неправильного ответа
  - [ ] Закрытие модального окна

**Файл для изучения:** `src/game/scenes/quiz/KeyQuizHandler.ts`

---

#### Контрольная точка 1.7: PortalQuizHandler.test.ts
- [ ] Создать файл `src/tests/unit/scenes/quiz/PortalQuizHandler.test.ts`
- [ ] Тесты:
  - [ ] Показ викторины при входе в портал
  - [ ] Обработка правильного ответа
  - [ ] Обработка неправильного ответа
  - [ ] Переход на следующий уровень

**Файл для изучения:** `src/game/scenes/quiz/PortalQuizHandler.ts`

---

### ЭТАП 2: Менеджеры (MEDIUM priority) — 4 теста

#### Контрольная точка 2.1: AnimationSyncManager.test.ts
- [ ] Создать файл `src/tests/unit/scenes/animation/AnimationSyncManager.test.ts`
- [ ] Тесты:
  - [ ] Регистрация анимаций
  - [ ] Синхронизация play/stop
  - [ ] Очистка при destroy()

**Файл для изучения:** `src/game/scenes/animation/AnimationSyncManager.ts`

---

#### Контрольная точка 2.2: EnemyManager.test.ts
- [ ] Создать файл `src/tests/unit/scenes/enemy/EnemyManager.test.ts`
- [ ] Тесты:
  - [ ] Создание врагов
  - [ ] Получение списка врагов
  - [ ] Очистка всех врагов
  - [ ] Обновление состояния

**Файл для изучения:** `src/game/scenes/enemy/EnemyManager.ts`

---

#### Контрольная точка 2.3: HUDManager.test.ts
- [ ] Создать файл `src/tests/unit/scenes/ui/HUDManager.test.ts`
- [ ] Тесты:
  - [ ] Создание HUD элементов
  - [ ] Обновление счёта
  - [ ] Обновление количества ключей
  - [ ] Обновление уровня
  - [ ] Очистка при destroy()

**Файл для изучения:** `src/game/scenes/ui/HUDManager.ts`

---

#### Контрольная точка 2.4: CameraManager.test.ts
- [ ] Создать файл `src/tests/unit/scenes/ui/CameraManager.test.ts`
- [ ] Тесты:
  - [ ] Инициализация камеры
  - [ ] Следование за игроком
  - [ ] Ограничение границ камеры
  - [ ] Эффекты камеры (tremor, zoom)

**Файл для изучения:** `src/game/scenes/ui/CameraManager.ts`

---

### ЭТАП 3: Обработчики (MEDIUM priority) — 2 теста

#### Контрольная точка 3.1: OracleCollisionHandler.test.ts
- [ ] Создать файл `src/tests/unit/scenes/collision/OracleCollisionHandler.test.ts`
- [ ] Тесты:
  - [ ] Коллизия с оракулом
  - [ ] Показ баббла с вопросом
  - [ ] Обработка ответа
  - [ ] Закрытие баббла

**Файл для изучения:** `src/game/scenes/collision/OracleCollisionHandler.ts`

---

#### Контрольная точка 3.2: GlobalQuestionManager.test.ts
- [ ] Создать файл `src/tests/unit/scenes/quiz/GlobalQuestionManager.test.ts`
- [ ] Тесты:
  - [ ] Получение глобального вопроса
  - [ ] Проверка использованных вопросов
  - [ ] Сброс использованных вопросов
  - [ ] Кэширование вопросов

**Файл для изучения:** `src/game/scenes/quiz/GlobalQuestionManager.ts`

---

### ЭТАП 4: Анимация (LOW priority) — 5 тестов

#### Контрольная точка 4.1: KeyAnimationSync.test.ts
- [ ] Создать файл `src/tests/unit/scenes/animation/KeyAnimationSync.test.ts`
- [ ] Тесты:
  - [ ] Синхронизация анимации ключей
  - [ ] Play/stop callbacks

**Файл для изучения:** `src/game/scenes/animation/KeyAnimationSync.ts`

---

#### Контрольная точка 4.2: PortalAnimationSync.test.ts
- [ ] Создать файл `src/tests/unit/scenes/animation/PortalAnimationSync.test.ts`
- [ ] Тесты:
  - [ ] Синхронизация анимации порталов
  - [ ] Play/stop callbacks

**Файл для изучения:** `src/game/scenes/animation/PortalAnimationSync.ts`

---

#### Контрольная точка 4.3: OracleAnimationSync.test.ts
- [ ] Создать файл `src/tests/unit/scenes/animation/OracleAnimationSync.test.ts`
- [ ] Тесты:
  - [ ] Синхронизация анимации оракула
  - [ ] Play/stop callbacks

**Файл для изучения:** `src/game/scenes/animation/OracleAnimationSync.ts`

---

#### Контрольная точка 4.4: PlayerAnimationSync.test.ts
- [ ] Создать файл `src/tests/unit/scenes/animation/PlayerAnimationSync.test.ts`
- [ ] Тесты:
  - [ ] Синхронизация анимации игрока
  - [ ] Play/stop callbacks

**Файл для изучения:** `src/game/scenes/animation/PlayerAnimationSync.ts`

---

#### Контрольная точка 4.5: EnemyAnimationSync.test.ts
- [ ] Создать файл `src/tests/unit/scenes/animation/EnemyAnimationSync.test.ts`
- [ ] Тесты:
  - [ ] Синхронизация анимации врагов
  - [ ] Play/stop callbacks

**Файл для изучения:** `src/game/scenes/animation/EnemyAnimationSync.ts`

---

### ЭТАП 5: Фабрики (LOW priority) — 5 тестов

#### Контрольная точка 5.1: WorldFactory.test.ts
- [ ] Создать файл `src/tests/unit/scenes/world/WorldFactory.test.ts`
- [ ] Тесты:
  - [ ] Создание фона
  - [ ] Создание коллизий
  - [ ] Создание оверлепов

**Файл для изучения:** `src/game/scenes/world/WorldFactory.ts`

---

#### Контрольная точка 5.2: EntityFactory.test.ts
- [ ] Создать файл `src/tests/unit/scenes/world/EntityFactory.test.ts`
- [ ] Тесты:
  - [ ] Создание игрока
  - [ ] Создание врагов
  - [ ] Создание порталов
  - [ ] Создание оракула

**Файл для изучения:** `src/game/scenes/world/EntityFactory.ts`

---

#### Контрольная точка 5.3: CollisionObjectFactory.test.ts
- [ ] Создать файл `src/tests/unit/scenes/world/CollisionObjectFactory.test.ts`
- [ ] Тесты:
  - [ ] Создание объектов коллизии
  - [ ] Настройка физики

**Файл для изучения:** `src/game/scenes/world/CollisionObjectFactory.ts`

---

#### Контрольная точка 5.4: EnemyCloneFactory.test.ts
- [ ] Создать файл `src/tests/unit/scenes/enemy/EnemyCloneFactory.test.ts`
- [ ] Тесты:
  - [ ] Создание клона врага
  - [ ] Настройка времени жизни клона
  - [ ] Удаление клона по истечении времени

**Файл для изучения:** `src/game/scenes/enemy/EnemyCloneFactory.ts`

---

#### Контрольная точка 5.5: EnemySpawner.test.ts
- [ ] Создать файл `src/tests/unit/scenes/enemy/EnemySpawner.test.ts`
- [ ] Тесты:
  - [ ] Первичный спавн врагов
  - [ ] Периодический спавн
  - [ ] Проверка лимита макс. количества врагов
  - [ ] Остановка спавна

**Файл для изучения:** `src/game/scenes/enemy/EnemySpawner.ts`

---

### ЭТАП 6: Оставшиеся классы (LOW priority) — 4 теста

#### Контрольная точка 6.1: LevelTransitionHandler.test.ts
- [ ] Создать файл `src/tests/unit/scenes/gameflow/LevelTransitionHandler.test.ts`
- [ ] Тесты:
  - [ ] Переход на следующий уровень
  - [ ] Показ анимации перехода
  - [ ] Очистка предыдущего уровня

**Файл для изучения:** `src/game/scenes/gameflow/LevelTransitionHandler.ts`

---

#### Контрольная точка 6.2: EffectsManager.test.ts
- [ ] Создать файл `src/tests/unit/scenes/ui/EffectsManager.test.ts`
- [ ] Тесты:
  - [ ] Создание визуальных эффектов
  - [ ] Очистка эффектов

**Файл для изучения:** `src/game/scenes/ui/EffectsManager.ts`

---

#### Контрольная точка 6.3: AnimationSyncManager (интеграционные тесты)
- [ ] Дополнить `src/tests/unit/scenes/animation/AnimationSyncManager.test.ts`
- [ ] Интеграционные тесты с реальными объектами

---

#### Контрольная точка 6.4: Финальная проверка
- [ ] Запустить все тесты: `npm test`
- [ ] Убедиться, что все тесты проходят
- [ ] Обновить прогресс-отчёт

---

## Структура создаваемых файлов

```
src/tests/unit/
├── scenes/
│   ├── animation/
│   │   ├── AnimationSyncManager.test.ts
│   │   ├── KeyAnimationSync.test.ts
│   │   ├── PortalAnimationSync.test.ts
│   │   ├── OracleAnimationSync.test.ts
│   │   ├── PlayerAnimationSync.test.ts
│   │   └── EnemyAnimationSync.test.ts
│   ├── collision/
│   │   ├── EnemyCollisionHandler.test.ts
│   │   ├── ItemCollisionHandler.test.ts
│   │   ├── OracleCollisionHandler.test.ts
│   │   └── PortalCollisionHandler.test.ts
│   ├── quiz/
│   │   ├── KeyQuizHandler.test.ts
│   │   ├── PortalQuizHandler.test.ts
│   │   └── GlobalQuestionManager.test.ts
│   ├── ui/
│   │   ├── HUDManager.test.ts
│   │   ├── CameraManager.test.ts
│   │   └── EffectsManager.test.ts
│   ├── gameflow/
│   │   ├── EventBusManager.test.ts
│   │   ├── GameOverHandler.test.ts
│   │   └── LevelTransitionHandler.test.ts
│   ├── enemy/
│   │   ├── EnemyManager.test.ts
│   │   ├── EnemyCloneFactory.test.ts
│   │   └── EnemySpawner.test.ts
│   └── world/
│       ├── WorldFactory.test.ts
│       ├── EntityFactory.test.ts
│       └── CollisionObjectFactory.test.ts
```

---

## Инструкция по возобновлению работы

**Если работа прервана:**

1. Откройте этот файл плана
2. Найдите последнюю выполненную контрольную точку (отмечена `[x]`)
3. Продолжайте со следующей контрольной точки

**Пример:**
- Последняя выполненная точка: `Контрольная точка 1.2: GameOverHandler.test.ts` [x]
- Следующая точка: `Контрольная точка 1.3: EnemyCollisionHandler.test.ts`

**После завершения каждой контрольной точки:**
1. Отметьте галочками `[x]` все пункты
2. Запустите `npm test` для проверки
3. При необходимости обновите прогресс-отчёт

---

## Шаблон теста

Для каждого теста используйте следующий шаблон:

```typescript
/**
 * Unit тесты для [ClassName]
 */

import { [ClassName] } from '../../../[path-to-class]';

// Моки для зависимостей
jest.mock('[path-to-dependency-1]');
jest.mock('[path-to-dependency-2]');

describe('[ClassName]', () => {
    let mockDependencies: any;
    let instance: [ClassName];

    beforeEach(() => {
        // Настройка моков
        mockDependencies = {
            // ...
        };
        instance = new [ClassName](mockDependencies);
    });

    afterEach(() => {
        // Очистка
        jest.clearAllMocks();
    });

    describe('[Feature 1]', () => {
        it('должен [expected behavior]', () => {
            // Arrange
            const input = // ...;

            // Act
            const result = instance.method(input);

            // Assert
            expect(result).toBe(expected);
        });
    });

    // ... больше тестов
});
```

---

## Связанные документы

- [`2026-01-20_main-refactor-test-compliance_PLAN.md`](./2026-01-20_main-refactor-test-compliance_PLAN.md) — план анализа соответствия
- [`2026-01-20_main-refactor-test-compliance_PROGRESS.md`](./2026-01-20_main-refactor-test-compliance_PROGRESS.md) — отчёт о соответствии
- [`2026-01-20_create-new-tests_PROGRESS.md`](./2026-01-20_create-new-tests_PROGRESS.md) — прогресс создания тестов (будет создан)

---

**Дата создания:** 2026-01-20
**Последнее обновление:** 2026-01-20
**Статус:** TODO — готов к началу работы
