# Тесты проекта ArcadeQuiz

## Структура тестов

```
src/tests/
├── unit/              # Unit тесты
│   ├── core/        # Тесты Core систем
│   ├── systems/     # Тесты игровых систем
│   ├── entities/    # Тесты сущностей
│   └── react/       # Тесты React компонентов
├── integration/      # Integration тесты
│   └── phaser-react/ # Тесты взаимодействия Phaser-React
└── e2e/              # E2E тесты
    └── cypress/      # Cypress тесты
```

## Запуск тестов

### Все тесты
```bash
npm test
```

### Unit тесты
```bash
npm run test:unit
```

### Integration тесты
```bash
npm run test:integration
```

### E2E тесты
```bash
npm run test:e2e
```

### С покрытием
```bash
npm run test:coverage
```

### В режиме watch
```bash
npm run test:watch
```

## Документация

Подробная документация по тестированию находится в:
- `documentation/main/development/TESTING.md` - полное руководство
- `documentation/main/development/TESTING_SIMPLE.md` - простое руководство для начинающих
































































