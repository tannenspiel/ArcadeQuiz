# План Рефакторинга: Этап 1 - Типизация и Стабилизация
**Дата:** 2025-12-14
**Основание:** [Отчет об аудите](2025-12-14_Audit_Report.md)

## Контекст
Цель этого этапа — устранить критические технические долги, выявленные при аудите, которые создают риски runtime-ошибок и усложняют разработку. Основной фокус на типобезопасности физики и очистке устаревшего кода.

## План действий

### 1. Типизация CollisionSystem [CRITICAL]
- **Файл:** `src/game/systems/CollisionSystem.ts`
- **Проблема:** Использование `any` в колбэках коллизий отключает проверки TypeScript.
- **Шаги:**
    1.  Импортировать типы Phaser (`Phaser.Types.Physics.Arcade.GameObjectWithBody`, `Phaser.Tilemaps.Tile`).
    2.  Создать Type Guards в `src/utils/typeGuards.ts`:
        - `isPlayer(obj: GameObject): obj is Player`
        - `isEnemy(obj: GameObject): obj is AbstractEnemy`
        - `isPortal(obj: GameObject): obj is AbstractPortal`
    3.  Переписать сигнатуры методов `collide` и `overlap`, заменив `any` на `GameObjectWithBody`.
    4.  Внутри колбэков использовать Type Guards для безопасного кастинга (вместо `as any`).

### 2. Очистка SpawnSystem
- **Файл:** `src/game/systems/SpawnSystem.ts`
- **Проблема:** Смешение старой (круговой) и новой (матричной) логики спавна.
- **Шаги:**
    1.  Найти все использования `addOccupiedZone`. Если они есть — заменить на матричные аналоги.
    2.  Удалить метод `addOccupiedZone` и массив `occupiedZones`.
    3.  Удалить метод `getSafePosition` (старый), оставив только `getSafePositionMatrix`.
    4.  Проверить тесты `SpawnSystem.test.ts` и удалить тесты для deprecated методов.

### 3. Вынос магических чисел (Constants)
- **Файлы:** `CollisionSystem.ts`, `MainScene.ts`
- **Проблема:** Хардкод значений (дистанция 30px, тайминги).
- **Шаги:**
    1.  Добавить в `src/constants/gameConstants.ts`:
        - `INTERACTION.PORTAL_ENTER_DISTANCE = 30`
        - `INTERACTION.PORTAL_OVERLAP_RADIUS = 80` (если используется)
    2.  Заменить числа в коде на константы.

### 4. Верификация
- Запуск Unit-тестов:
    - `npm run test:spawn` (проверка, что очистка не сломала спавн)
    - `npm run test:unit` (общая проверка)
- Ручной тест:
    - Запуск игры, проверка коллизий игрока с врагами и порталами.

## Критерии приемки
- В `CollisionSystem.ts` нет `any` в аргументах колбэков.
- `SpawnSystem.ts` не содержит закомментированных блоков старого кода и методов `addOccupiedZone`.
- Проект собирается (`npm run build`) без ошибок типов.
- Все тесты проходят.
