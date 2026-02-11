# Workflow: Работа с планом Coin Mechanic

**План:** `2026-01-29_coin-mechanic`
**Файлы:** `PLAN.md`, `PROGRESS.md`, `WORKFLOW.md`

---

## Назначение файлов

| Файл | Назначение | Обновление |
|------|------------|------------|
| `PLAN.md` | Полный план реализации со всеми шагами | Редко (только критичные изменения) |
| `PROGRESS.md` | Журнал выполнения шагов | Часто (после каждого шага) |
| `WORKFLOW.md` | Этот файл - правила работы | Редко (по необходимости) |

---

## Как работать с планом

### 1. Перед началом работы

1. **Прочитать PLAN.md** - понять полную картину
2. **Проверить PROGRESS.md** - увидеть текущий прогресс
3. **Выбрать следующий шаг** - из списка pending шагов

### 2. Во время выполнения шага

1. **Отметить шаг как IN PROGRESS** в PROGRESS.md:
   ```markdown
   **Status:** IN PROGRESS
   **Started:** 2026-01-29 14:30
   ```

2. **Выполнять работу** по описанию из PLAN.md

3. **Фиксировать промежуточные результаты** в PROGRESS.md:
   ```markdown
   **Work Done:**
   - [x] Создан файл AbstractItem.ts
   - [ ] Реализован конструктор
   - [ ] Реализован playDeathAnimation()

   **Files Modified:**
   - src/game/entities/items/AbstractItem.ts (создан)
   ```

### 3. После завершения шага

1. **Отметить все Acceptance Criteria** в PLAN.md:
   ```markdown
   **Acceptance Criteria:**
   - [x] AbstractItem.ts создан
   - [x] SpawnMatrix.freeRect() вызывается автоматически
   ```

2. **Завершить шаг в PROGRESS.md:**
   ```markdown
   **Status:** COMPLETED ✅
   **Started:** 2026-01-29 14:30
   **Completed:** 2026-01-29 15:45

   **Work Done:**
   - [x] Создан AbstractItem.ts
   - [x] Реализована интеграция со SpawnMatrix
   - [x] Добавлены методы spawn() и destroy()

   **Files Modified:**
   - src/game/entities/items/AbstractItem.ts (создан, 145 строк)

   **Notes:**
   - Связь со SpawnMatrix через occupyPositionMatrix работает
   - freeRect() вызывается автоматически в playDeathAnimation()
   ```

3. **Обновить Overall Progress** в начале PROGRESS.md

4. **Сохранить изменения в git** (опционально, но рекомендуется)

---

## Статусы шагов

| Статус | Описание | Когда использовать |
|--------|----------|-------------------|
| `PENDING` | Шаг не начат | Изначально для всех шагов |
| `IN PROGRESS` | Шаг в работе | Когда начали выполнение |
| `COMPLETED ✅` | Шаблон завершён | Когда все Acceptance Criteria выполнены |
| `BLOCKED` | Шаблон заблокирован | Если есть проблемы, препятствующие выполнению |
| `SKIPPED` | Шаблон пропущен | Если шаг перестал быть нужным |

---

## Форматирование PROGRESS.md

### Шаблон шага (IN PROGRESS):
```markdown
### Step X.Y: [Название шага]
**Status:** IN PROGRESS
**Started:** YYYY-MM-DD HH:MM

**Work Done:**
- [x] Подшаг 1
- [ ] Подшаг 2

**Files Modified:**
- `path/to/file.ts` (краткое описание изменений)

**Notes:**
- Проблемы, решения, мысли
```

### Шаблон шага (COMPLETED):
```markdown
### Step X.Y: [Название шага]
**Status:** COMPLETED ✅
**Started:** YYYY-MM-DD HH:MM
**Completed:** YYYY-MM-DD HH:MM

**Work Done:**
- [x] Все подшаги выполнены

**Files Modified:**
- `path/to/file.ts` (изменения: +123 -45 строк)

**Notes:**
- Что пошло не так, как ожидалось
- Что нужно учесть в следующих шагах
```

---

## Интеграция с другими системами

### Связь с HISTORY.md
- **PROGRESS.md** - детальный журнал конкретного плана
- **HISTORY.md** - история проекта (крупные вехи)
- После завершения всего плана → добавить запись в HISTORY.md

### Связь с DECISIONS.md
- Если в ходе работы принято архитектурное решение → записать в DECISIONS.md
- Ссылка на решение может быть в Notes соответствующего шага

### Связь с git commits
- Рекомендуется делать commit после каждой фазы (Phase 1-6)
- Формат сообщения коммита:
  ```
  feat(phase1): implement abstract item and animation sync

  - Add AbstractItem with SpawnMatrix integration
  - Create CoinAnimationSync for animation handling
  - Extend LevelConfig for coins support

  Progress: Phase 1 complete (5/5 steps)
  ```

---

## Чек-лист завершения плана

Перед завершением всего плана убедиться:

- [ ] Все 19 шагов отмечены как COMPLETED
- [ ] Все Acceptance Criteria в PLAN.md выполнены
- [ ] Overall Progress показывает 100%
- [ ] Запись добавлена в HISTORY.md
- [ ] Архитектурные решения записаны в DECISIONS.md (если есть)
- [ ] Код протестирован (Step 6.1)
- [ ] Документация обновлена (Step 6.2)

---

## Советы по работе

1. **Работайте последовательно** - не пропускайте шаги
2. **Фиксируйте прогресс** - пишите в PROGRESS.md часто
3. **Отмечайте проблемы** в Notes - это поможет в будущем
4. **Не бойтесь откладывать** - если шаг сложный, разбейте на подшаги
5. **Сохраняйте работу** - коммите после каждой фазы

---

**Создан:** 2026-01-29
**Автор:** Claude Code + User (план)
